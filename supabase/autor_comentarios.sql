alter table public.comentarios
    add column if not exists visitante_id text;

alter table public.comentarios_builds
    add column if not exists visitante_id text;

create index if not exists comentarios_visitante_id_idx
    on public.comentarios(visitante_id);

create index if not exists comentarios_builds_visitante_id_idx
    on public.comentarios_builds(visitante_id);