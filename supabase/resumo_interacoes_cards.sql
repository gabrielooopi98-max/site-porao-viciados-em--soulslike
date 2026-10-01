create index if not exists comentarios_post_id_idx
    on public.comentarios(post_id);

create index if not exists curtidas_post_id_idx
    on public.curtidas(post_id);

create index if not exists curtidas_post_visitante_id_idx
    on public.curtidas(post_id, visitante_id);

create index if not exists comentarios_builds_build_id_idx
    on public.comentarios_builds(build_id);

create index if not exists curtidas_builds_build_id_idx
    on public.curtidas_builds(build_id);

create index if not exists curtidas_builds_build_visitante_id_idx
    on public.curtidas_builds(build_id, visitante_id);

create or replace function public.resumo_interacoes_post(
    p_post_id bigint,
    p_visitante_id text
)
returns table (
    total_comentarios bigint,
    total_curtidas bigint,
    curtido boolean
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        (select count(*) from public.comentarios where post_id = p_post_id),
        (select count(*) from public.curtidas where post_id = p_post_id),
        exists (
            select 1
            from public.curtidas
            where post_id = p_post_id and visitante_id = p_visitante_id
        );
$$;

create or replace function public.resumo_interacoes_build(
    p_build_id bigint,
    p_visitante_id text
)
returns table (
    total_comentarios bigint,
    total_curtidas bigint,
    curtido boolean
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        (select count(*) from public.comentarios_builds where build_id = p_build_id),
        (select count(*) from public.curtidas_builds where build_id = p_build_id),
        exists (
            select 1
            from public.curtidas_builds
            where build_id = p_build_id and visitante_id = p_visitante_id
        );
$$;

revoke all on function public.resumo_interacoes_post(bigint, text) from public;
revoke all on function public.resumo_interacoes_build(bigint, text) from public;
grant execute on function public.resumo_interacoes_post(bigint, text) to anon, authenticated;
grant execute on function public.resumo_interacoes_build(bigint, text) to anon, authenticated;

notify pgrst, 'reload schema';