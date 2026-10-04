import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('perfil publica apenas a contagem agregada de amizades aceitas', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    grant usage on schema public to anon, authenticated;
    create table public.amizades (
      id integer generated always as identity primary key,
      solicitante_id uuid not null,
      destinatario_id uuid not null,
      status text not null
    );
  `);

  const migration = await readFile(new URL('../supabase/amizades_mensagens_privadas.sql', import.meta.url), 'utf8');
  const inicio = migration.indexOf('create or replace function public.perfil_contar_amigos');
  const fim = migration.indexOf(
    'grant execute on function public.perfil_contar_amigos(uuid) to anon, authenticated;',
    inicio,
  );
  assert.notEqual(inicio, -1);
  assert.notEqual(fim, -1);
  await db.exec(migration.slice(inicio, fim + 'grant execute on function public.perfil_contar_amigos(uuid) to anon, authenticated;'.length));
  await db.exec(`
    insert into public.amizades (solicitante_id, destinatario_id, status) values
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'aceita'),
      ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'aceita'),
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'pendente');
    set role anon;
  `);

  const { rows } = await db.query(
    'select public.perfil_contar_amigos($1) as total',
    ['00000000-0000-0000-0000-000000000001'],
  );
  assert.equal(rows[0].total, 2);
  await assert.rejects(db.query('select * from public.amizades'), /permission denied/);
});

test('painel lista apenas relações aceitas e permite ao dono remover seguidor', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table public.amizades (
      id uuid primary key,
      solicitante_id uuid not null,
      destinatario_id uuid not null,
      solicitante_nome text not null,
      solicitante_avatar_url text,
      destinatario_nome text not null,
      destinatario_avatar_url text,
      status text not null
    );
    create table public.seguidores (
      id uuid primary key,
      seguidor_id uuid not null,
      seguido_id uuid not null
    );
    create table public.posts (autor_id uuid, autor_nome text, autor_avatar_url text, criado_em timestamptz);
    create table public.builds (autor_id uuid, autor_nome text, autor_avatar_url text, criado_em timestamptz);
    create table public.mensagens_chat (autor_id uuid, autor_nome text, autor_avatar_url text, criado_em timestamptz);
  `);

  const migration = await readFile(new URL('../supabase/amizades_mensagens_privadas.sql', import.meta.url), 'utf8');
  for (const funcao of ['perfil_listar_relacoes', 'perfil_remover_seguidor']) {
    const inicio = migration.indexOf(`create or replace function public.${funcao}`);
    const marcador = `grant execute on function public.${funcao}`;
    const fim = migration.indexOf(marcador, inicio);
    assert.notEqual(inicio, -1);
    assert.notEqual(fim, -1);
    const fimLinha = migration.indexOf('\n', fim);
    await db.exec(migration.slice(inicio, fimLinha));
  }

  const pessoa = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  await db.query(
    `insert into public.amizades values
      ($1, $2, $3, 'Amigo Aceito', null, 'Perfil', null, 'aceita'),
      ($4, $2, $5, 'Pedido Pendente', null, 'Outro', null, 'pendente')`,
    [pessoa(1), pessoa(10), pessoa(20), pessoa(2), pessoa(30)],
  );
  await db.query('insert into public.seguidores values ($1, $2, $3)', [pessoa(3), pessoa(40), pessoa(10)]);
  await db.query(
    'insert into public.posts values ($1, $2, $3, now())',
    [pessoa(40), 'Seguidor Público', 'https://example.test/avatar.png'],
  );
  await db.exec('set role anon');
  const { rows: amizades } = await db.query(
    "select usuario_id, nome from public.perfil_listar_relacoes($1, 'amigos')",
    [pessoa(10)],
  );
  assert.deepEqual(amizades, [{ usuario_id: pessoa(20), nome: 'Perfil' }]);
  const { rows: seguidores } = await db.query(
    "select usuario_id, nome, avatar_url from public.perfil_listar_relacoes($1, 'seguidores')",
    [pessoa(10)],
  );
  assert.deepEqual(seguidores, [{
    usuario_id: pessoa(40),
    nome: 'Seguidor Público',
    avatar_url: 'https://example.test/avatar.png',
  }]);
  await assert.rejects(db.query('select public.perfil_remover_seguidor($1)', [pessoa(40)]), /permission denied/);

  await db.exec(`reset role; set role authenticated;`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [pessoa(10)]);
  await db.query('select public.perfil_remover_seguidor($1)', [pessoa(40)]);
  await db.exec('reset role;');
  const { rows: restantes } = await db.query('select id from public.seguidores');
  assert.deepEqual(restantes, []);
});
