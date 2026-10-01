alter table public.comentarios
    add column if not exists comentario_pai_id bigint
    references public.comentarios(id) on delete cascade;

alter table public.comentarios_builds
    add column if not exists comentario_pai_id bigint
    references public.comentarios_builds(id) on delete cascade;

create index if not exists comentarios_comentario_pai_id_idx
    on public.comentarios(comentario_pai_id);

create index if not exists comentarios_builds_comentario_pai_id_idx
    on public.comentarios_builds(comentario_pai_id);