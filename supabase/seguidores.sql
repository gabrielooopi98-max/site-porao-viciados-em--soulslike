create table if not exists public.seguidores (
    id uuid primary key default gen_random_uuid(),
    seguidor_id uuid not null references auth.users(id) on delete cascade,
    seguido_id uuid not null references auth.users(id) on delete cascade,
    criado_em timestamptz not null default now(),
    constraint seguidores_nao_seguir_a_si_mesmo check (seguidor_id <> seguido_id),
    constraint seguidores_unico unique (seguidor_id, seguido_id)
);

create index if not exists seguidores_seguidor_id_idx on public.seguidores(seguidor_id);
create index if not exists seguidores_seguido_id_idx on public.seguidores(seguido_id);

alter table public.seguidores enable row level security;

drop policy if exists "Leitura pública de seguidores" on public.seguidores;
create policy "Leitura pública de seguidores"
    on public.seguidores for select
    to anon, authenticated
    using (true);

drop policy if exists "Seguir outras pessoas" on public.seguidores;
create policy "Seguir outras pessoas"
    on public.seguidores for insert
    to authenticated
    with check (seguidor_id = (select auth.uid()) and seguidor_id <> seguido_id);

drop policy if exists "Deixar de seguir" on public.seguidores;
create policy "Deixar de seguir"
    on public.seguidores for delete
    to authenticated
    using (seguidor_id = (select auth.uid()));

notify pgrst, 'reload schema';