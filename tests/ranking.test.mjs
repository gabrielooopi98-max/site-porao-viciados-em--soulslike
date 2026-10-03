import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const usuario = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

test('ranking: migration, permissoes, aprovacao, votos e etapas em PostgreSQL', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create schema storage;
    create table storage.objects(bucket_id text, name text, owner_id text, primary key (bucket_id, name));
  `);
  const migration = await readFile(new URL('../supabase/ranking_desafios.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  // A migration pode ser reaplicada sem apagar votos e dados.
  await db.exec(migration);
  for (let n = 1; n <= 30; n++) {
    await db.query('insert into auth.users values ($1, $2)', [usuario(n), { display_name: `Jogador ${n}` }]);
  }
  await db.query('insert into public.ranking_administradores values ($1)', [usuario(1)]);
  async function como(n) {
    await db.exec(`reset role; set role ${n ? 'authenticated' : 'anon'};`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? usuario(n) : '']);
  }
  async function superusuario() { await db.exec('reset role;'); }
  let etapaVoto = 0;
  async function rpc(nome, args = []) {
    if (nome === 'ranking_votar' && args.length === 1) args = [...args, etapaVoto];
    const placeholders = args.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(`select public.${nome}(${placeholders}) as resultado`, args);
    return rows[0].resultado;
  }
  const futuro = (horas) => new Date(Date.now() + horas * 3600000).toISOString();
  const dadosDesafio = {
    titulo: 'Build de mago', descricao: 'Mostre sua build e explique os equipamentos.',
    jogo: 'Dark Souls III', tipo: 'build', pontos: 100, pontos_voto: 2,
    inicio: futuro(1), fim: futuro(2), fim_semifinal: futuro(3), fim_final: futuro(4),
  };
  let desafio;
  await t.test('somente lista protegida concede ADM; datas e escrita direta protegidas', async () => {
    await como(2);
    await assert.rejects(rpc('ranking_salvar_desafio', [dadosDesafio]), /Somente o ADM/);
    await assert.rejects(db.query('insert into public.ranking_administradores values ($1)', [usuario(2)]), /permission denied/);
    await assert.rejects(db.query('insert into public.ranking_pontos values (gen_random_uuid(), $1, 9999)', [usuario(2)]), /permission denied/);
    await como(1);
    await assert.rejects(rpc('ranking_salvar_desafio', [{ ...dadosDesafio, fim_final: futuro(2) }]), /check constraint/);
    desafio = await rpc('ranking_salvar_desafio', [dadosDesafio]);
    assert.equal(await rpc('ranking_eh_admin'), true);
    await rpc('ranking_salvar_desafio', [{ ...dadosDesafio, titulo: 'Build de mago revisada' }, desafio]);
    await como(2);
    await assert.rejects(rpc('ranking_publicar', [desafio, { titulo: 'Minha build', descricao: 'Prova dos atributos', midias: [] }]), /fechadas/);
    await superusuario();
    await db.query("update public.ranking_desafios set inicio = now() - interval '1 hour' where id = $1", [desafio]);
    await como(1);
    await assert.rejects(rpc('ranking_salvar_desafio', [dadosDesafio, desafio]), /iniciado/);
  });
  const ids = [];
  await t.test('uma prova por jogador, aprovacao do ADM e proibicao de voto proprio', async () => {
    for (let n = 2; n <= 8; n++) {
      await como(n);
      ids.push(await rpc('ranking_publicar', [desafio, {
        titulo: `Build ${n}`, descricao: 'Descricao da prova e equipamentos.', midias: [],
        atributos: { nivel: 125, foco: 'Inteligencia' },
      }]));
    }
    await como(2);
    await assert.rejects(rpc('ranking_publicar', [desafio, { titulo: 'Outra build', descricao: 'Descricao completa.', midias: [] }]), /ja enviou/);
    await assert.rejects(rpc('ranking_votar', [ids[0]]), /propria/);
    await assert.rejects(rpc('ranking_avaliar', [ids[1], true, '']), /Somente o ADM/);
    await como(10);
    await assert.rejects(rpc('ranking_votar', [ids[0]]), /nao participa/);
    let pendentes = await rpc('ranking_painel', [desafio]);
    assert.equal(pendentes.participacoes.length, 0);
    await como(2);
    pendentes = await rpc('ranking_painel', [desafio]);
    assert.deepEqual(pendentes.participacoes.map((p) => p.id), [ids[0]]);
    await como(1);
    assert.equal((await rpc('ranking_painel', [desafio])).participacoes.length, 7);
    await assert.rejects(rpc('ranking_avaliar', [ids[0], false, '']), /motivo/);
    for (const id of ids) await rpc('ranking_avaliar', [id, true, 'Prova conferida.']);
    await como(10);
    await rpc('ranking_votar', [ids[0]]);
    let painel = await rpc('ranking_painel', [desafio]);
    assert.equal(painel.participacoes.find((p) => p.id === ids[0]).votos, 1);
    await rpc('ranking_votar', [ids[0]]);
    painel = await rpc('ranking_painel', [desafio]);
    assert.equal(painel.participacoes.find((p) => p.id === ids[0]).votos, 0);
    assert.equal(painel.jogadores.length, 0);
  });
  await t.test('top 6, votos independentes na semifinal, top 3 e vencedor unico', async () => {
    for (let i = 0; i < ids.length; i++) {
      for (let v = 10; v < 17 - i; v++) {
        await como(v);
        await rpc('ranking_votar', [ids[i]]);
      }
    }
    await superusuario();
    await db.query("update public.ranking_desafios set fim = now() - interval '3 minutes' where id = $1", [desafio]);
    await como(10);
    let painel = await rpc('ranking_painel', [desafio]);
    assert.equal(painel.desafios[0].etapa, 1);
    await assert.rejects(rpc('ranking_votar', [ids[0], 0]), /etapa mudou/);
    etapaVoto = 1;
    assert.equal(painel.participacoes.filter((p) => p.etapa_max === 1).length, 6);
    assert.equal(painel.participacoes.find((p) => p.id === ids[6]).etapa_max, 0);
    assert.equal(painel.participacoes.find((p) => p.id === ids[0]).votos, 0);
    assert.equal(painel.participacoes.find((p) => p.id === ids[0]).votou, false);
    await assert.rejects(rpc('ranking_votar', [ids[6]]), /nao participa/);
    await assert.rejects(rpc('ranking_publicar', [desafio, { titulo: 'Tardia', descricao: 'Prova fora do prazo.', midias: [] }]), /fechadas/);
    for (let i = 0; i < 6; i++) {
      for (let v = 10; v < 16 - i; v++) {
        await como(v);
        await rpc('ranking_votar', [ids[i]]);
      }
    }
    await superusuario();
    await db.query("update public.ranking_desafios set fim_semifinal = now() - interval '2 minutes' where id = $1", [desafio]);
    await como(10);
    painel = await rpc('ranking_painel', [desafio]);
    assert.equal(painel.desafios[0].etapa, 2);
    etapaVoto = 2;
    assert.equal(painel.participacoes.filter((p) => p.etapa_max === 2).length, 3);
    const primeiro = painel.participacoes.find((p) => p.id === ids[0]);
    assert.deepEqual(primeiro.historico_votos, [7, 6, 0]);
    assert.equal(primeiro.votou, false);
    await rpc('ranking_votar', [ids[1]]);
    await superusuario();
    await db.query("update public.ranking_desafios set fim_final = now() - interval '1 minute' where id = $1", [desafio]);
    await como(10);
    painel = await rpc('ranking_painel', [desafio]);
    assert.equal(painel.desafios[0].vencedor_id, ids[1]);
    etapaVoto = 3;
    assert.equal(painel.jogadores[0].usuario_id, usuario(3));
    assert.equal(painel.jogadores[0].pontos, 100);
    await rpc('ranking_painel', [desafio]);
    await rpc('ranking_painel', [desafio]);
    assert.equal((await rpc('ranking_painel', [desafio])).jogadores[0].pontos, 100);
    await assert.rejects(rpc('ranking_votar', [ids[1]]), /encerrada/);
    await como(1);
    await assert.rejects(rpc('ranking_avaliar', [ids[1], false, 'Revisao tardia']), /antes do fim/);
  });
  await t.test('somente o vencedor escolhe um final, uma unica vez', async () => {
    await como(3);
    let painel = await rpc('ranking_painel', [desafio]);
    assert.equal(painel.finais.length, 24);
    assert.deepEqual(painel.minhas_vitorias.map((v) => [v.participacao_id, v.final_id]), [[ids[1], null]]);
    assert.equal(painel.desafios.find((d) => d.id === desafio).final_vencedor, null);
    await assert.rejects(rpc('ranking_escolher_final', [ids[1], 'final_inexistente']), /Final invalido/);
    await como(2);
    await assert.rejects(rpc('ranking_escolher_final', [ids[1], 'ds3_ligar']), /Somente o vencedor/);
    await como(1);
    await assert.rejects(rpc('ranking_escolher_final', [ids[1], 'ds3_ligar']), /Somente o vencedor/);
    await como(3);
    await rpc('ranking_escolher_final', [ids[1], 'ds3_ligar']);
    await assert.rejects(rpc('ranking_escolher_final', [ids[1], 'er_chama']), /ja foi escolhido/);
    painel = await rpc('ranking_painel', [desafio]);
    assert.equal(painel.desafios.find((d) => d.id === desafio).final_vencedor.titulo, 'Lorde das Cinzas');
    assert.equal(painel.minhas_vitorias[0].final_id, 'ds3_ligar');
    const campeao = painel.jogadores.find((j) => j.usuario_id === usuario(3));
    assert.equal(campeao.titulo, 'Lorde das Cinzas');
    assert.equal(campeao.finais, 1);
    await como(null);
    assert.deepEqual((await rpc('ranking_painel')).minhas_vitorias, []);
    await assert.rejects(rpc('ranking_escolher_final', [ids[1], 'ds3_ligar']), /permission denied/);
  });
  await t.test('conquistas: votos nao concedem pontos, aprovacao idempotente e revogacao', async () => {
    etapaVoto = 0;
    await como(1);
    const comum = await rpc('ranking_salvar_desafio', [{
      ...dadosDesafio, tipo: 'conquista', fim_semifinal: null, fim_final: null, pontos: 40,
    }]);
    await superusuario();
    await db.query("update public.ranking_desafios set inicio = now() - interval '1 hour' where id = $1", [comum]);
    await como(2);
    const prova = await rpc('ranking_publicar', [comum, { titulo: 'Malenia sem dano', descricao: 'Prova completa sem cortes.', midias: [] }]);
    await como(10);
    await rpc('ranking_votar', [prova]);
    await rpc('ranking_comentar', [prova, 'Conferi a prova.']);
    let painel = await rpc('ranking_painel', [comum]);
    assert.equal(painel.jogadores.some((p) => p.usuario_id === usuario(2)), false);
    assert.equal(painel.comentarios.length, 1);
    await como(1);
    await rpc('ranking_avaliar', [prova, true, '']);
    await rpc('ranking_avaliar', [prova, true, '']);
    painel = await rpc('ranking_painel', [comum]);
    assert.equal(painel.jogadores.find((p) => p.usuario_id === usuario(2)).pontos, 40);
    await rpc('ranking_avaliar', [prova, false, 'Prova invalidada.']);
    painel = await rpc('ranking_painel', [comum]);
    assert.equal(painel.jogadores.some((p) => p.usuario_id === usuario(2)), false);
    assert.equal(painel.participacoes.length, 1);
    await como(10);
    painel = await rpc('ranking_painel', [comum]);
    assert.equal(painel.participacoes.length, 0);
    assert.equal(painel.comentarios.length, 0);
    await assert.rejects(rpc('ranking_comentar', [prova, 'Ainda vejo?']), /nao encontrada/);
    await como(2);
    assert.equal((await rpc('ranking_painel', [comum])).participacoes[0].status, 'recusada');
  });
  await t.test('avisos lidos por conta e leitura publica sem autoridade de escrita', async () => {
    await como(2);
    const antes = await rpc('ranking_avisos', [false]);
    assert.equal(antes.nao_lidos, 2);
    assert.equal(antes.desafios.every((d) => d.lido === false), true);
    await rpc('ranking_ler_desafio', [desafio]);
    await rpc('ranking_ler_desafio', [desafio]);
    const umLido = await rpc('ranking_avisos', [false]);
    assert.equal(umLido.nao_lidos, 1);
    assert.equal(umLido.desafios.find((d) => d.id === desafio).lido, true);
    assert.equal(umLido.desafios.filter((d) => !d.lido).length, 1);
    assert.equal((await rpc('ranking_avisos', [true])).nao_lidos, 0);
    await como(3);
    assert.equal((await rpc('ranking_avisos', [false])).nao_lidos, 2);
    assert.equal((await rpc('ranking_painel')).meus_pontos, 100);
    await como(null);
    assert.equal((await rpc('ranking_painel')).admin, false);
    await assert.rejects(rpc('ranking_votar', [ids[0]]), /permission denied/);
    await assert.rejects(rpc('ranking_avancar'), /permission denied/);
    await assert.rejects(rpc('ranking_eh_admin'), /permission denied/);
  });
  await t.test('poucos inscritos, empate deterministico, dados invalidos e final sem votos', async () => {
    await como(1);
    const pequeno = await rpc('ranking_salvar_desafio', [dadosDesafio]);
    await superusuario();
    await db.query("update public.ranking_desafios set inicio = now() - interval '1 hour' where id = $1", [pequeno]);
    const entradas = [];
    for (const n of [2, 3]) {
      await como(n);
      await assert.rejects(rpc('ranking_publicar', [pequeno, {
        titulo: 'Build invalida', descricao: 'Descricao valida e longa.', midias: [], atributos: { foco: {} },
      }]), /check constraint/);
      entradas.push(await rpc('ranking_publicar', [pequeno, {
        titulo: 'Build de teste', descricao: 'Descricao valida e longa.', midias: [],
      }]));
    }
    await como(1);
    for (const id of entradas) await rpc('ranking_avaliar', [id, true, '']);
    const propria = await rpc('ranking_publicar', [pequeno, { titulo: 'Build do ADM', descricao: 'Descricao valida e longa.', midias: [] }]);
    await assert.rejects(rpc('ranking_avaliar', [propria, true, '']), /Outro ADM/);
    await superusuario();
    await db.query("update public.ranking_participacoes set criado_em = now() - interval '1 hour' where desafio_id = $1", [pequeno]);
    await db.query("update public.ranking_desafios set fim = now() - interval '3 minutes' where id = $1", [pequeno]);
    await como(10);
    let painel = await rpc('ranking_painel', [pequeno]);
    assert.equal(painel.participacoes.filter((p) => p.etapa_max === 1).length, 2);
    await superusuario();
    await db.query("update public.ranking_desafios set fim_semifinal = now() - interval '2 minutes' where id = $1", [pequeno]);
    await como(10);
    painel = await rpc('ranking_painel', [pequeno]);
    assert.equal(painel.participacoes.filter((p) => p.etapa_max === 2).length, 2);
    for (const id of entradas) await rpc('ranking_votar', [id, 2]);
    await superusuario();
    await db.query("update public.ranking_desafios set fim_final = now() - interval '1 minute' where id = $1", [pequeno]);
    await como(10);
    painel = await rpc('ranking_painel', [pequeno]);
    assert.equal(painel.desafios.find((d) => d.id === pequeno).vencedor_id, [...entradas].sort()[0]);

    await como(1);
    const vazio = await rpc('ranking_salvar_desafio', [dadosDesafio]);
    await superusuario();
    await db.query(`update public.ranking_desafios set inicio = now() - interval '4 hours',
      fim = now() - interval '3 hours', fim_semifinal = now() - interval '2 hours',
      fim_final = now() - interval '1 hour' where id = $1`, [vazio]);
    await db.query(`insert into public.ranking_participacoes
      (desafio_id, autor_id, autor_nome, titulo, descricao, status, criado_em)
      values ($1, $2, 'Jogador sem votos', 'Build sem votos', 'Prova completa de teste.', 'aprovada',
        now() - interval '210 minutes')`, [vazio, usuario(4)]);
    await como(null);
    painel = await rpc('ranking_painel', [vazio]);
    const encerrado = painel.desafios.find((d) => d.id === vazio);
    assert.equal(encerrado.etapa, 3);
    assert.equal(encerrado.vencedor_id, null);
    assert.equal(painel.participacoes[0].etapa_max, 2);
    assert.equal(painel.jogadores.some((p) => p.usuario_id === usuario(4)), false);
  });
  await t.test('midias somente do Storage do proprio jogador', async () => {
    await como(1);
    const conquista = await rpc('ranking_salvar_desafio', [{
      ...dadosDesafio, tipo: 'conquista', fim_semifinal: null, fim_final: null, pontos: 30,
    }]);
    await superusuario();
    await db.query("update public.ranking_desafios set inicio = now() - interval '1 hour' where id = $1", [conquista]);
    const meu = `ranking/${usuario(5)}/prova.png`;
    const alheio = `ranking/${usuario(6)}/prova.png`;
    await db.query("insert into storage.objects values ('midias', $1, $2), ('midias', $3, $4), ('midias', 'post.png', $2)",
      [meu, usuario(5), alheio, usuario(6)]);
    const midia = (caminho) => ({ caminho, tipo_midia: 'image/png',
      midia_url: `https://projeto.supabase.co/storage/v1/object/public/midias/${caminho}` });
    const enviar = (midias) => rpc('ranking_publicar', [conquista, { titulo: 'Prova com midia', descricao: 'Prova completa de teste.', midias }]);
    await como(5);
    await assert.rejects(enviar([{ ...midia(meu), midia_url: 'https://site-externo.com/prova.png' }]), /midia invalido/);
    await assert.rejects(enviar([midia(alheio)]), /midia invalido/);
    await assert.rejects(enviar([midia('post.png')]), /midia invalido/);
    await assert.rejects(enviar([midia(`ranking/${usuario(5)}/inexistente.png`)]), /midia invalido/);
    const prova = await enviar([midia(meu)]);
    await como(1);
    await rpc('ranking_avaliar', [prova, true, '']);
    assert.equal((await rpc('ranking_painel')).jogadores.find((j) => j.usuario_id === usuario(5)).pontos, 30);

    await como(2);
    await assert.rejects(rpc('ranking_excluir_desafio', [conquista]), /Somente o ADM/);
    await como(1);
    await rpc('ranking_excluir_desafio', [conquista]);
    const painel = await rpc('ranking_painel');
    assert.equal(painel.desafios.some((d) => d.id === conquista), false);
    assert.equal(painel.jogadores.some((j) => j.usuario_id === usuario(5)), false);
    assert.deepEqual(painel.midias_para_remover, [meu]);
    await como(2);
    assert.deepEqual((await rpc('ranking_painel')).midias_para_remover, []);
    await assert.rejects(rpc('ranking_confirmar_midias_removidas', [[meu]]), /Somente o ADM/);
    assert.equal(await rpc('ranking_pode_remover_midia', [meu]), false);
    await como(1);
    assert.equal(await rpc('ranking_pode_remover_midia', [meu]), true);
    await rpc('ranking_confirmar_midias_removidas', [[meu]]);
    assert.deepEqual((await rpc('ranking_painel')).midias_para_remover, []);
  });
  await t.test('encerrados saem do historico apos 3 dias e os pontos permanecem', async () => {
    await como(null);
    let geral = await rpc('ranking_painel');
    assert.equal(geral.participacoes.some((p) => p.desafio_id === desafio), true);
    const pontosAntes = geral.jogadores.find((j) => j.usuario_id === usuario(3)).pontos;
    await superusuario();
    await db.query(`update public.ranking_desafios set inicio = now() - interval '12 days',
      fim = now() - interval '11 days', fim_semifinal = now() - interval '10 days',
      fim_final = now() - interval '4 days' where id = $1`, [desafio]);
    await db.query(`update public.ranking_desafios set inicio = now() - interval '6 days',
      fim = now() - interval '4 days' where tipo = 'conquista'`);
    await como(null);
    geral = await rpc('ranking_painel');
    assert.equal(geral.desafios.some((d) => d.id === desafio), false);
    assert.equal(geral.desafios.some((d) => d.tipo === 'conquista'), false);
    assert.equal(geral.participacoes.some((p) => p.desafio_id === desafio), false);
    assert.equal(geral.jogadores.find((j) => j.usuario_id === usuario(3)).pontos, pontosAntes);
    assert.equal(geral.jogadores.find((j) => j.usuario_id === usuario(3)).titulo, 'Lorde das Cinzas');
    await superusuario();
    const { rows } = await db.query(`select
      (select count(*) from public.ranking_participacoes where desafio_id = $1)::int as participacoes,
      (select count(*) from public.ranking_avisos_lidos where desafio_id = $1)::int as avisos`, [desafio]);
    assert.deepEqual(rows[0], { participacoes: 0, avisos: 0 });
    // Finais encerradas ha menos de 3 dias continuam visiveis.
    assert.equal(geral.desafios.filter((d) => d.etapa === 3).length, 2);
    await como(10);
    await assert.rejects(rpc('ranking_comentar', ['00000000-0000-0000-0000-000000000999', 'Oi']), /nao encontrada/);
  });
});
