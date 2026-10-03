begin;

create table if not exists public.ranking_administradores (
    usuario_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.ranking_desafios (
    id uuid primary key default gen_random_uuid(),
    titulo text not null check (length(trim(titulo)) between 3 and 160),
    descricao text not null check (length(trim(descricao)) between 10 and 6000),
    jogo text not null check (length(trim(jogo)) between 2 and 100),
    tipo text not null check (tipo in ('conquista', 'build')),
    pontos integer not null check (pontos between 1 and 100000),
    pontos_voto integer not null default 2 check (pontos_voto between 1 and 1000),
    inicio timestamptz not null,
    fim timestamptz not null,
    fim_semifinal timestamptz,
    fim_final timestamptz,
    etapa integer not null default 0 check (etapa between 0 and 3),
    vencedor_id uuid,
    criado_por uuid not null references auth.users(id),
    criado_em timestamptz not null default now(),
    check (fim > inicio),
    check ((tipo = 'conquista' and fim_semifinal is null and fim_final is null)
        or (tipo = 'build' and fim_semifinal > fim and fim_final > fim_semifinal
            and fim_semifinal is not null and fim_final is not null))
);

create table if not exists public.ranking_participacoes (
    id uuid primary key default gen_random_uuid(),
    desafio_id uuid not null references public.ranking_desafios(id),
    autor_id uuid not null references auth.users(id),
    autor_nome text not null,
    autor_avatar text,
    titulo text not null check (length(trim(titulo)) between 3 and 160),
    descricao text not null check (length(trim(descricao)) between 10 and 6000),
    atributos jsonb not null default '{}'::jsonb check (
        jsonb_typeof(atributos) = 'object' and octet_length(atributos::text) <= 16000
        and coalesce(jsonb_typeof(atributos->'nivel'), 'null') in ('null', 'number', 'string')
        and coalesce(jsonb_typeof(atributos->'foco'), 'null') in ('null', 'string')
        and coalesce(jsonb_typeof(atributos->'equipamentos'), 'null') in ('null', 'string')),
    midias jsonb not null default '[]'::jsonb check (jsonb_typeof(midias) = 'array'),
    status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
    motivo text,
    avaliado_por uuid references auth.users(id),
    avaliado_em timestamptz,
    etapa_max integer not null default 0 check (etapa_max between 0 and 2),
    criado_em timestamptz not null default now(),
    unique (desafio_id, autor_id)
);

create table if not exists public.ranking_votos (
    participacao_id uuid not null references public.ranking_participacoes(id),
    usuario_id uuid not null references auth.users(id),
    etapa integer not null check (etapa between 0 and 2),
    criado_em timestamptz not null default now(),
    primary key (participacao_id, usuario_id, etapa)
);

create table if not exists public.ranking_comentarios (
    id uuid primary key default gen_random_uuid(),
    participacao_id uuid not null references public.ranking_participacoes(id),
    autor_id uuid not null references auth.users(id),
    autor_nome text not null,
    texto text not null check (length(trim(texto)) between 1 and 2000),
    criado_em timestamptz not null default now()
);

create table if not exists public.ranking_pontos (
    participacao_id uuid primary key,
    usuario_id uuid not null references auth.users(id),
    pontos integer not null check (pontos > 0),
    criado_em timestamptz not null default now(),
    desafio_id uuid
);

create table if not exists public.ranking_avisos_lidos (
    desafio_id uuid not null references public.ranking_desafios(id),
    usuario_id uuid not null references auth.users(id),
    primary key (desafio_id, usuario_id)
);

-- Pontos sobrevivem a remocao dos desafios encerrados: sem FK para a participacao.
alter table public.ranking_pontos drop constraint if exists ranking_pontos_participacao_id_fkey;
alter table public.ranking_pontos add column if not exists desafio_id uuid;
update public.ranking_pontos rp set desafio_id = p.desafio_id
    from public.ranking_participacoes p where p.id = rp.participacao_id and rp.desafio_id is null;

-- Arquivos de desafios removidos; o ADM apaga do Storage pela API (SQL nao remove arquivos).
create table if not exists public.ranking_midias_remover (
    caminho text primary key,
    criado_em timestamptz not null default now()
);

-- Finais que o vencedor de uma competicao de builds pode escolher como titulo.
create table if not exists public.ranking_finais (
    id text primary key,
    jogo text not null,
    final text not null,
    titulo text not null,
    ordem integer not null
);

insert into public.ranking_finais (id, jogo, final, titulo, ordem) values
    ('ds1_chama', 'Dark Souls Remastered', 'Era do Fogo', 'Herdeiro da Chama', 10),
    ('ds1_trevas', 'Dark Souls Remastered', 'Era das Trevas', 'Lorde Sombrio', 11),
    ('ds2_trono', 'Dark Souls II', 'Trono do Desejo', 'Monarca de Drangleic', 20),
    ('ds2_recusa', 'Dark Souls II', 'Trono Recusado', 'Aquele que Recusou o Trono', 21),
    ('ds3_ligar', 'Dark Souls III', 'Ligar a Primeira Chama', 'Lorde das Cinzas', 30),
    ('ds3_fim', 'Dark Souls III', 'Fim do Fogo', 'Aquele que Apagou a Chama', 31),
    ('ds3_traicao', 'Dark Souls III', 'Fim do Fogo (traição)', 'Traidor da Guardiã do Fogo', 32),
    ('ds3_usurpacao', 'Dark Souls III', 'Usurpação do Fogo', 'Lorde dos Vazios', 33),
    ('er_fratura', 'Elden Ring', 'Era da Fratura', 'Lorde Prístino', 40),
    ('er_ordem', 'Elden Ring', 'Era da Ordem Perfeita', 'Lorde da Ordem Perfeita', 41),
    ('er_estrelas', 'Elden Ring', 'Era das Estrelas', 'Consorte da Lua', 42),
    ('er_desespero', 'Elden Ring', 'Bênção do Desespero', 'Lorde da Maldição', 43),
    ('er_crepusculo', 'Elden Ring', 'Era do Crepúsculo', 'Lorde dos Nascidos no Crepúsculo', 44),
    ('er_chama', 'Elden Ring', 'Senhor da Chama Frenética', 'Lorde da Chama Frenética', 45),
    ('bb_amanhecer', 'Bloodborne', 'Amanhecer em Yharnam', 'Caçador Desperto', 50),
    ('bb_desejos', 'Bloodborne', 'Honrando Desejos', 'Caçador do Sonho', 51),
    ('bb_infancia', 'Bloodborne', 'O Início da Infância', 'Grande Infante', 52),
    ('sk_shura', 'Sekiro: Shadows Die Twice', 'Shura', 'Shura', 60),
    ('sk_imortalidade', 'Sekiro: Shadows Die Twice', 'Imortalidade Cortada', 'Lobo Leal', 61),
    ('sk_purificacao', 'Sekiro: Shadows Die Twice', 'Purificação', 'Lobo Purificado', 62),
    ('sk_retorno', 'Sekiro: Shadows Die Twice', 'Retorno', 'Guardião do Herdeiro Divino', 63),
    ('lp_cordas', 'Lies of P', 'Livre das Cordas', 'Marionete de Geppetto', 70),
    ('lp_ascensao', 'Lies of P', 'Ascensão de P', 'P Ascendido', 71),
    ('lp_menino', 'Lies of P', 'Menino de Verdade', 'Menino de Verdade', 72)
on conflict (id) do update set jogo = excluded.jogo, final = excluded.final,
    titulo = excluded.titulo, ordem = excluded.ordem;

-- Historico da vitoria fica no ponto: o desafio e removido, o final escolhido permanece.
alter table public.ranking_pontos add column if not exists origem text check (origem in ('conquista', 'build'));
alter table public.ranking_pontos add column if not exists desafio_titulo text;
alter table public.ranking_pontos add column if not exists final_id text references public.ranking_finais(id);
alter table public.ranking_pontos add column if not exists final_em timestamptz;
update public.ranking_pontos rp set origem = d.tipo, desafio_titulo = d.titulo
    from public.ranking_desafios d where d.id = rp.desafio_id and rp.origem is null;

create index if not exists ranking_participacoes_desafio_idx on public.ranking_participacoes(desafio_id);
create index if not exists ranking_votos_etapa_idx on public.ranking_votos(etapa, participacao_id);
create index if not exists ranking_comentarios_participacao_idx on public.ranking_comentarios(participacao_id, criado_em);
create index if not exists ranking_pontos_usuario_idx on public.ranking_pontos(usuario_id);

alter table public.ranking_administradores enable row level security;
alter table public.ranking_desafios enable row level security;
alter table public.ranking_participacoes enable row level security;
alter table public.ranking_votos enable row level security;
alter table public.ranking_comentarios enable row level security;
alter table public.ranking_pontos enable row level security;
alter table public.ranking_avisos_lidos enable row level security;
alter table public.ranking_midias_remover enable row level security;
alter table public.ranking_finais enable row level security;

-- Toda alteracao passa por RPC: o cliente nao pode conceder pontos ou etapas.
revoke all on public.ranking_administradores, public.ranking_desafios,
    public.ranking_participacoes, public.ranking_votos, public.ranking_comentarios,
    public.ranking_pontos, public.ranking_avisos_lidos, public.ranking_midias_remover,
    public.ranking_finais from anon, authenticated;
grant select on public.ranking_desafios to anon, authenticated;
drop policy if exists ranking_desafios_leitura on public.ranking_desafios;
create policy ranking_desafios_leitura on public.ranking_desafios for select using (true);

create or replace function public.ranking_eh_admin()
returns boolean language sql stable security definer set search_path = public
as $$
    select exists(select 1 from public.ranking_administradores where usuario_id = auth.uid());
$$;

-- Recusadas e builds pendentes ficam visiveis so para o autor e o ADM.
-- Provas de conquista pendentes seguem publicas para a comunidade avaliar.
create or replace function public.ranking_participacao_visivel(p_status text, p_tipo text, p_autor uuid, p_admin boolean)
returns boolean language sql stable set search_path = public
as $$
    select p_status = 'aprovada' or (p_tipo = 'conquista' and p_status = 'pendente')
        or coalesce(p_autor = auth.uid(), false) or coalesce(p_admin, false);
$$;

-- Apaga o desafio e todo o historico; os pontos ficam, salvo cancelamento pelo ADM.
create or replace function public.ranking_apagar_desafio(p_desafio uuid, p_remover_pontos boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
    insert into public.ranking_midias_remover(caminho)
        select m->>'caminho' from public.ranking_participacoes p, jsonb_array_elements(p.midias) m
        where p.desafio_id = p_desafio and coalesce(m->>'caminho', '') <> ''
        on conflict do nothing;
    if p_remover_pontos then delete from public.ranking_pontos where desafio_id = p_desafio; end if;
    delete from public.ranking_votos where participacao_id in
        (select id from public.ranking_participacoes where desafio_id = p_desafio);
    delete from public.ranking_comentarios where participacao_id in
        (select id from public.ranking_participacoes where desafio_id = p_desafio);
    delete from public.ranking_participacoes where desafio_id = p_desafio;
    delete from public.ranking_avisos_lidos where desafio_id = p_desafio;
    delete from public.ranking_desafios where id = p_desafio;
end;
$$;

create or replace function public.ranking_avancar()
returns void language plpgsql security definer set search_path = public
as $$
declare
    d public.ranking_desafios%rowtype;
    escolhido uuid;
begin
    -- Trava somente desafios com prazo vencido: leituras do painel nao disputam lock com votos.
    for d in select * from public.ranking_desafios
        where tipo = 'build' and ((etapa = 0 and fim <= now())
            or (etapa = 1 and fim_semifinal <= now()) or (etapa = 2 and fim_final <= now()))
        order by id for update
    loop
        if d.etapa = 0 then
            update public.ranking_participacoes set etapa_max = 1
            where id in (
                select p.id from public.ranking_participacoes p
                left join public.ranking_votos v on v.participacao_id = p.id and v.etapa = 0
                where p.desafio_id = d.id and p.status = 'aprovada'
                group by p.id order by count(v.usuario_id) desc, p.criado_em, p.id limit 4
            );
            update public.ranking_desafios set etapa = 1 where id = d.id;
            d.etapa := 1;
        end if;
        if d.etapa = 1 and d.fim_semifinal <= now() then
            update public.ranking_participacoes set etapa_max = 2
            where id in (
                select p.id from public.ranking_participacoes p
                left join public.ranking_votos v on v.participacao_id = p.id and v.etapa = 1
                where p.desafio_id = d.id and p.status = 'aprovada' and p.etapa_max = 1
                group by p.id order by count(v.usuario_id) desc, p.criado_em, p.id limit 2
            );
            update public.ranking_desafios set etapa = 2 where id = d.id;
            d.etapa := 2;
        end if;
        if d.etapa = 2 and d.fim_final <= now() then
            select p.id into escolhido from public.ranking_participacoes p
            left join public.ranking_votos v on v.participacao_id = p.id and v.etapa = 2
            where p.desafio_id = d.id and p.status = 'aprovada' and p.etapa_max = 2
            group by p.id having count(v.usuario_id) > 0
            order by count(v.usuario_id) desc, p.criado_em, p.id limit 1;
            update public.ranking_desafios set etapa = 3, vencedor_id = escolhido where id = d.id;
            if escolhido is not null then
                insert into public.ranking_pontos (participacao_id, desafio_id, usuario_id, pontos, origem, desafio_titulo)
                select id, d.id, autor_id, d.pontos, 'build', d.titulo from public.ranking_participacoes where id = escolhido
                on conflict (participacao_id) do nothing;
            end if;
        end if;
    end loop;
    -- Encerrados ficam 3 dias (vencedor em destaque e analise final do ADM) e depois saem do historico.
    for d in select * from public.ranking_desafios
        where (tipo = 'build' and etapa = 3 and fim_final <= now() - interval '3 days')
            or (tipo = 'conquista' and fim <= now() - interval '3 days')
        order by id for update skip locked
    loop
        perform public.ranking_apagar_desafio(d.id, false);
    end loop;
end;
$$;

create or replace function public.ranking_salvar_desafio(p_dados jsonb, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
    resultado uuid;
    existente public.ranking_desafios%rowtype;
begin
    if not public.ranking_eh_admin() then raise exception 'Somente o ADM pode configurar desafios.'; end if;
    if p_id is not null then
        select * into existente from public.ranking_desafios where id = p_id for update;
        if not found then raise exception 'Desafio nao encontrado.'; end if;
        if existente.inicio <= now() then raise exception 'Um desafio iniciado nao pode ser alterado.'; end if;
    end if;
    if (p_dados->>'inicio')::timestamptz < now() then raise exception 'Escolha uma data de inicio futura.'; end if;
    if p_id is null then
        insert into public.ranking_desafios
            (titulo, descricao, jogo, tipo, pontos, pontos_voto, inicio, fim, fim_semifinal, fim_final, criado_por)
        values (trim(p_dados->>'titulo'), trim(p_dados->>'descricao'), trim(p_dados->>'jogo'),
            p_dados->>'tipo', (p_dados->>'pontos')::integer, coalesce((p_dados->>'pontos_voto')::integer, 2),
            (p_dados->>'inicio')::timestamptz, (p_dados->>'fim')::timestamptz,
            (p_dados->>'fim_semifinal')::timestamptz, (p_dados->>'fim_final')::timestamptz, auth.uid())
        returning id into resultado;
    else
        update public.ranking_desafios set
            titulo = trim(p_dados->>'titulo'), descricao = trim(p_dados->>'descricao'), jogo = trim(p_dados->>'jogo'),
            tipo = p_dados->>'tipo', pontos = (p_dados->>'pontos')::integer,
            pontos_voto = coalesce((p_dados->>'pontos_voto')::integer, 2),
            inicio = (p_dados->>'inicio')::timestamptz, fim = (p_dados->>'fim')::timestamptz,
            fim_semifinal = (p_dados->>'fim_semifinal')::timestamptz, fim_final = (p_dados->>'fim_final')::timestamptz
        where id = p_id returning id into resultado;
    end if;
    return resultado;
end;
$$;

create or replace function public.ranking_publicar(p_desafio uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
    d public.ranking_desafios%rowtype;
    u jsonb;
    resultado uuid;
    m jsonb;
begin
    if auth.uid() is null then raise exception 'Entre na sua conta para participar.'; end if;
    select * into d from public.ranking_desafios where id = p_desafio for update;
    if not found then raise exception 'Desafio nao encontrado.'; end if;
    if now() < d.inicio or now() >= d.fim then raise exception 'As inscricoes deste desafio estao fechadas.'; end if;
    if exists(select 1 from public.ranking_participacoes where desafio_id = d.id and autor_id = auth.uid()) then
        raise exception 'Voce ja enviou uma participacao neste desafio.';
    end if;
    if jsonb_typeof(p_dados->'midias') is distinct from 'array' then raise exception 'Midias invalidas.'; end if;
    if jsonb_array_length(p_dados->'midias') > 8 then raise exception 'Envie no maximo oito midias.'; end if;
    if d.tipo = 'conquista' and jsonb_array_length(p_dados->'midias') = 0 then
        raise exception 'Anexe pelo menos uma imagem ou um video como prova do desafio.';
    end if;
    -- Somente arquivos do proprio jogador, enviados ao Storage do site na pasta do ranking.
    for m in select value from jsonb_array_elements(p_dados->'midias') loop
        if coalesce(m->>'tipo_midia', '') !~ '^(image|video)/'
            or coalesce(m->>'midia_url', '') !~ '^https://'
            or coalesce(m->>'caminho', '') !~ ('^ranking/' || auth.uid()::text || '/[^/]+$')
            or right(m->>'midia_url', length('/storage/v1/object/public/midias/' || (m->>'caminho')))
                <> '/storage/v1/object/public/midias/' || (m->>'caminho')
            or not exists(select 1 from storage.objects o where o.bucket_id = 'midias'
                and o.name = m->>'caminho' and o.owner_id = auth.uid()::text)
            or exists(select 1 from public.ranking_participacoes rp, jsonb_array_elements(rp.midias) x
                where rp.autor_id = auth.uid() and x->>'caminho' = m->>'caminho') then
            raise exception 'Formato de midia invalido.';
        end if;
    end loop;
    if d.tipo = 'build' and (
        not exists(select 1 from jsonb_array_elements(p_dados->'midias') x where x->>'tipo_midia' like 'image/%')
        or not exists(select 1 from jsonb_array_elements(p_dados->'midias') x where x->>'tipo_midia' like 'video/%')
    ) then
        raise exception 'Anexe pelo menos uma imagem e um video da build.';
    end if;
    select raw_user_meta_data into u from auth.users where id = auth.uid();
    insert into public.ranking_participacoes
        (desafio_id, autor_id, autor_nome, autor_avatar, titulo, descricao, midias, atributos)
    values (d.id, auth.uid(), coalesce(nullif(u->>'display_name', ''), nullif(u->>'nome', ''), nullif(u->>'full_name', ''), 'Jogador'),
        u->>'avatar_url',
        case when d.tipo = 'conquista' then d.titulo else trim(p_dados->>'titulo') end,
        case when d.tipo = 'conquista' then 'Prova do desafio enviada em midia.' else trim(p_dados->>'descricao') end,
        p_dados->'midias', coalesce(p_dados->'atributos', '{}'::jsonb)) returning id into resultado;
    return resultado;
end;
$$;

create or replace function public.ranking_avaliar(p_participacao uuid, p_aprovar boolean, p_motivo text default '')
returns void language plpgsql security definer set search_path = public
as $$
declare
    p public.ranking_participacoes%rowtype;
    d public.ranking_desafios%rowtype;
    did uuid;
begin
    if not public.ranking_eh_admin() then raise exception 'Somente o ADM pode aprovar participacoes.'; end if;
    select desafio_id into did from public.ranking_participacoes where id = p_participacao;
    select * into d from public.ranking_desafios where id = did for update;
    select * into p from public.ranking_participacoes where id = p_participacao for update;
    if not found then raise exception 'Participacao nao encontrada.'; end if;
    if p.autor_id = auth.uid() then raise exception 'Outro ADM deve avaliar sua participacao.'; end if;
    if p_aprovar is null then raise exception 'Informe a decisao.'; end if;
    if d.tipo = 'build' and now() >= d.fim then raise exception 'Avalie builds antes do fim da classificatoria.'; end if;
    if not p_aprovar and length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'Informe o motivo da recusa.'; end if;
    if length(coalesce(p_motivo, '')) > 2000 then raise exception 'Motivo muito longo.'; end if;
    update public.ranking_participacoes set
        status = case when p_aprovar then 'aprovada' else 'recusada' end,
        motivo = trim(p_motivo), avaliado_por = auth.uid(), avaliado_em = now()
    where id = p.id;
    if d.tipo = 'conquista' then
        if p_aprovar then
            insert into public.ranking_pontos (participacao_id, desafio_id, usuario_id, pontos, origem, desafio_titulo)
            values (p.id, d.id, p.autor_id, d.pontos, 'conquista', d.titulo) on conflict (participacao_id) do nothing;
        else
            delete from public.ranking_pontos where participacao_id = p.id;
        end if;
    end if;
end;
$$;

create or replace function public.ranking_votar(p_participacao uuid, p_etapa integer)
returns void language plpgsql security definer set search_path = public
as $$
declare
    d public.ranking_desafios%rowtype;
    p public.ranking_participacoes%rowtype;
    did uuid;
begin
    if auth.uid() is null then raise exception 'Entre na sua conta para votar.'; end if;
    perform public.ranking_avancar();
    select desafio_id into did from public.ranking_participacoes where id = p_participacao;
    select * into d from public.ranking_desafios where id = did for update;
    select * into p from public.ranking_participacoes where id = p_participacao;
    if not found then raise exception 'Participacao nao encontrada.'; end if;
    if p_etapa is distinct from d.etapa then raise exception 'A etapa mudou. Atualize a pagina antes de votar.'; end if;
    -- Desafios do ADM sao decididos pela aprovacao; a comunidade participa comentando.
    if d.tipo = 'conquista' then raise exception 'Desafios do ADM nao recebem votos. Comente a prova.'; end if;
    if p.autor_id = auth.uid() then raise exception 'Voce nao pode votar na propria participacao.'; end if;
    if now() < d.inicio then raise exception 'Este desafio ainda nao comecou.'; end if;
    if d.etapa = 3 or now() >= d.fim_final then raise exception 'A votacao foi encerrada.'; end if;
    if p.status <> 'aprovada' or p.etapa_max < d.etapa then raise exception 'Esta build nao participa da etapa atual.'; end if;
    delete from public.ranking_votos where participacao_id = p.id and usuario_id = auth.uid() and etapa = d.etapa;
    if not found then
        insert into public.ranking_votos (participacao_id, usuario_id, etapa) values (p.id, auth.uid(), d.etapa);
    end if;
end;
$$;

create or replace function public.ranking_comentar(p_participacao uuid, p_texto text)
returns void language plpgsql security definer set search_path = public
as $$
declare
    nome text;
begin
    if auth.uid() is null then raise exception 'Entre na sua conta para comentar.'; end if;
    if not exists(select 1 from public.ranking_participacoes p join public.ranking_desafios d on d.id = p.desafio_id
        where p.id = p_participacao
            and public.ranking_participacao_visivel(p.status, d.tipo, p.autor_id, public.ranking_eh_admin())) then
        raise exception 'Participacao nao encontrada.';
    end if;
    select coalesce(nullif(raw_user_meta_data->>'display_name', ''), nullif(raw_user_meta_data->>'nome', ''), nullif(raw_user_meta_data->>'full_name', ''), 'Jogador')
        into nome from auth.users where id = auth.uid();
    insert into public.ranking_comentarios(participacao_id, autor_id, autor_nome, texto)
        values(p_participacao, auth.uid(), nome, trim(p_texto));
end;
$$;

create or replace function public.ranking_painel(p_desafio uuid default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
    resultado jsonb;
    eh_admin boolean := public.ranking_eh_admin();
begin
    perform public.ranking_avancar();
    select jsonb_build_object(
        'admin', eh_admin,
        'agora', now(),
        'meus_pontos', coalesce((select sum(pontos) from public.ranking_pontos where usuario_id = auth.uid()), 0),
        'desafios', coalesce((select jsonb_agg(to_jsonb(d) || jsonb_build_object('final_vencedor', (
                select jsonb_build_object('id', f.id, 'titulo', f.titulo, 'final', f.final, 'jogo', f.jogo)
                from public.ranking_pontos rp join public.ranking_finais f on f.id = rp.final_id
                where rp.participacao_id = d.vencedor_id),
                'concluidas', (select count(*) from public.ranking_participacoes p
                    where p.desafio_id = d.id and p.status = 'aprovada')) order by d.criado_em desc)
            from public.ranking_desafios d), '[]'::jsonb),
        'finais', coalesce((select jsonb_agg(to_jsonb(f) order by f.ordem) from public.ranking_finais f), '[]'::jsonb),
        'minhas_vitorias', coalesce((select jsonb_agg(jsonb_build_object(
                'participacao_id', rp.participacao_id, 'desafio_titulo', rp.desafio_titulo,
                'pontos', rp.pontos, 'criado_em', rp.criado_em, 'final_id', rp.final_id) order by rp.criado_em desc)
            from public.ranking_pontos rp where rp.usuario_id = auth.uid() and rp.origem = 'build'), '[]'::jsonb),
        'participacoes', coalesce((
            select jsonb_agg(to_jsonb(t) order by t.criado_em desc) from (
                select p.*, d.etapa, d.tipo, d.titulo as desafio_titulo, d.pontos_voto,
                    (select count(*) from public.ranking_votos v where v.participacao_id = p.id
                        and v.etapa = least(d.etapa, 2)) as votos,
                    exists(select 1 from public.ranking_votos v where v.participacao_id = p.id
                        and v.etapa = least(d.etapa, 2) and v.usuario_id = auth.uid()) as votou,
                    (select jsonb_build_array(
                        count(*) filter(where v.etapa = 0),
                        count(*) filter(where v.etapa = 1),
                        count(*) filter(where v.etapa = 2))
                        from public.ranking_votos v where v.participacao_id = p.id) as historico_votos
                from public.ranking_participacoes p join public.ranking_desafios d on d.id = p.desafio_id
                where (p_desafio is not null and p.desafio_id = p_desafio
                        and public.ranking_participacao_visivel(p.status, d.tipo, p.autor_id, eh_admin))
                    or (p_desafio is null and d.tipo = 'build' and d.etapa >= 1
                        and p.status = 'aprovada' and p.etapa_max >= least(d.etapa, 2))
            ) t), '[]'::jsonb),
        'comentarios', coalesce((select jsonb_agg(to_jsonb(c) order by c.criado_em)
            from public.ranking_comentarios c join public.ranking_participacoes p on p.id = c.participacao_id
            join public.ranking_desafios d on d.id = p.desafio_id
            where p.desafio_id = p_desafio
                and public.ranking_participacao_visivel(p.status, d.tipo, p.autor_id, eh_admin)), '[]'::jsonb),
        'midias_para_remover', case when eh_admin then coalesce((select jsonb_agg(caminho) from (
            select caminho from public.ranking_midias_remover order by criado_em limit 100) t), '[]'::jsonb)
            else '[]'::jsonb end,
        'jogadores', coalesce((select jsonb_agg(to_jsonb(t) order by t.pontos desc, t.usuario_id) from (
            select rp.usuario_id, sum(rp.pontos) as pontos, count(distinct rp.final_id) as finais,
                count(*) filter (where rp.origem = 'conquista') as conquistas,
                count(*) filter (where rp.origem = 'build') as vitorias,
                (select f.titulo from public.ranking_pontos x join public.ranking_finais f on f.id = x.final_id
                    where x.usuario_id = rp.usuario_id order by x.final_em desc limit 1) as titulo,
                coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), nullif(u.raw_user_meta_data->>'nome', ''), nullif(u.raw_user_meta_data->>'full_name', ''), 'Jogador') as nome,
                u.raw_user_meta_data->>'avatar_url' as avatar
            from public.ranking_pontos rp join auth.users u on u.id = rp.usuario_id
            group by rp.usuario_id, u.raw_user_meta_data
            order by sum(rp.pontos) desc, rp.usuario_id limit 50
        ) t), '[]'::jsonb)
    ) into resultado;
    return resultado;
end;
$$;

create or replace function public.ranking_avisos(p_marcar boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
    if auth.uid() is null then raise exception 'Entre na sua conta para consultar avisos.'; end if;
    perform public.ranking_avancar();
    if p_marcar then
        insert into public.ranking_avisos_lidos(desafio_id, usuario_id)
            select id, auth.uid() from public.ranking_desafios
            on conflict do nothing;
    end if;
    return jsonb_build_object(
        'agora', now(),
        'desafios', coalesce((select jsonb_agg(
            to_jsonb(d) || jsonb_build_object('lido', exists(
                select 1 from public.ranking_avisos_lidos l
                where l.desafio_id = d.id and l.usuario_id = auth.uid()))
            order by d.criado_em desc) from public.ranking_desafios d), '[]'::jsonb),
        'nao_lidos', (select count(*) from public.ranking_desafios d where not exists(
            select 1 from public.ranking_avisos_lidos l where l.desafio_id = d.id and l.usuario_id = auth.uid()))
    );
end;
$$;

create or replace function public.ranking_ler_desafio(p_desafio uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
    if auth.uid() is null then raise exception 'Entre na sua conta para atualizar avisos.'; end if;
    if not exists(select 1 from public.ranking_desafios where id = p_desafio) then
        raise exception 'Desafio nao encontrado.';
    end if;
    insert into public.ranking_avisos_lidos(desafio_id, usuario_id)
        values (p_desafio, auth.uid()) on conflict do nothing;
end;
$$;
create or replace function public.ranking_excluir_desafio(p_desafio uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
    if not public.ranking_eh_admin() then raise exception 'Somente o ADM pode excluir desafios.'; end if;
    perform 1 from public.ranking_desafios where id = p_desafio for update;
    if not found then raise exception 'Desafio nao encontrado.'; end if;
    perform public.ranking_apagar_desafio(p_desafio, true);
end;
$$;

create or replace function public.ranking_pode_remover_midia(p_nome text)
returns boolean language sql stable security definer set search_path = public
as $$
    select public.ranking_eh_admin()
        and exists(select 1 from public.ranking_midias_remover where caminho = p_nome);
$$;

create or replace function public.ranking_confirmar_midias_removidas(p_caminhos text[])
returns void language plpgsql security definer set search_path = public
as $$
begin
    if not public.ranking_eh_admin() then raise exception 'Somente o ADM pode limpar midias.'; end if;
    delete from public.ranking_midias_remover where caminho = any(p_caminhos);
end;
$$;

-- O ADM so enxerga e apaga no Storage os arquivos da fila de remocao.
drop policy if exists "ADM localiza midias de desafios removidos" on storage.objects;
create policy "ADM localiza midias de desafios removidos"
    on storage.objects for select to authenticated
    using (bucket_id = 'midias' and public.ranking_pode_remover_midia(name));
drop policy if exists "ADM remove midias de desafios removidos" on storage.objects;
create policy "ADM remove midias de desafios removidos"
    on storage.objects for delete to authenticated
    using (bucket_id = 'midias' and public.ranking_pode_remover_midia(name));

create or replace function public.ranking_escolher_final(p_participacao uuid, p_final text)
returns void language plpgsql security definer set search_path = public
as $$
declare
    vitoria public.ranking_pontos%rowtype;
begin
    if auth.uid() is null then raise exception 'Entre na sua conta para escolher o final.'; end if;
    select * into vitoria from public.ranking_pontos
        where participacao_id = p_participacao and usuario_id = auth.uid() and origem = 'build' for update;
    if not found then raise exception 'Somente o vencedor da competicao pode escolher o final.'; end if;
    if vitoria.final_id is not null then raise exception 'O final desta vitoria ja foi escolhido.'; end if;
    if not exists(select 1 from public.ranking_finais where id = p_final) then raise exception 'Final invalido.'; end if;
    update public.ranking_pontos set final_id = p_final, final_em = now() where participacao_id = p_participacao;
end;
$$;

revoke all on function public.ranking_ler_desafio(uuid) from public, anon, authenticated;
grant execute on function public.ranking_ler_desafio(uuid) to authenticated;

revoke all on function public.ranking_eh_admin(), public.ranking_avancar(),
    public.ranking_painel(uuid), public.ranking_salvar_desafio(jsonb, uuid),
    public.ranking_publicar(uuid, jsonb), public.ranking_avaliar(uuid, boolean, text),
    public.ranking_votar(uuid, integer), public.ranking_comentar(uuid, text), public.ranking_avisos(boolean),
    public.ranking_participacao_visivel(text, text, uuid, boolean), public.ranking_apagar_desafio(uuid, boolean),
    public.ranking_excluir_desafio(uuid), public.ranking_pode_remover_midia(text),
    public.ranking_confirmar_midias_removidas(text[]), public.ranking_escolher_final(uuid, text) from public, anon, authenticated;
grant execute on function public.ranking_painel(uuid) to anon, authenticated;
grant execute on function public.ranking_eh_admin(), public.ranking_salvar_desafio(jsonb, uuid),
    public.ranking_publicar(uuid, jsonb), public.ranking_avaliar(uuid, boolean, text),
    public.ranking_votar(uuid, integer), public.ranking_comentar(uuid, text), public.ranking_avisos(boolean),
    public.ranking_excluir_desafio(uuid), public.ranking_pode_remover_midia(text),
    public.ranking_confirmar_midias_removidas(text[]), public.ranking_escolher_final(uuid, text) to authenticated;

-- Tempo real: as tabelas do ranking sao fechadas, entao o site escuta apenas este
-- sinal publico (sem dados) e recarrega o painel pelas RPCs quando ele muda.
create table if not exists public.ranking_atualizacoes (
    id smallint primary key default 1 check (id = 1),
    atualizado_em timestamptz not null default now()
);
insert into public.ranking_atualizacoes (id) values (1) on conflict do nothing;
alter table public.ranking_atualizacoes enable row level security;
revoke all on public.ranking_atualizacoes from anon, authenticated;
grant select on public.ranking_atualizacoes to anon, authenticated;
drop policy if exists ranking_atualizacoes_leitura on public.ranking_atualizacoes;
create policy ranking_atualizacoes_leitura on public.ranking_atualizacoes for select using (true);

create or replace function public.ranking_sinalizar()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
    update public.ranking_atualizacoes set atualizado_em = clock_timestamp() where id = 1;
    return null;
end;
$$;
revoke all on function public.ranking_sinalizar() from public, anon, authenticated;

-- Por comando (nao por linha): um voto ou uma troca de etapa gera um unico aviso.
do $$
declare
    tabela text;
begin
    foreach tabela in array array['ranking_desafios', 'ranking_participacoes', 'ranking_votos',
        'ranking_comentarios', 'ranking_pontos'] loop
        execute format('drop trigger if exists ranking_sinalizar on public.%I', tabela);
        execute format('create trigger ranking_sinalizar after insert or update or delete on public.%I
            for each statement execute function public.ranking_sinalizar()', tabela);
    end loop;
end $$;

-- Publica o sinal no Realtime sem falhar se ja estiver publicado (ou fora do Supabase).
do $$
begin
    alter publication supabase_realtime add table public.ranking_atualizacoes;
exception
    when duplicate_object or undefined_object then null;
end $$;

notify pgrst, 'reload schema';
commit;
