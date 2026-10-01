alter table public.curtidas enable row level security;
alter table public.curtidas_builds enable row level security;

drop policy if exists "Leitura pública de curtidas de posts" on public.curtidas;
create policy "Leitura pública de curtidas de posts"
    on public.curtidas for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação pública de curtidas de posts" on public.curtidas;
create policy "Criação pública de curtidas de posts"
    on public.curtidas for insert
    to authenticated
    with check (true);

drop policy if exists "Remoção pública de curtidas de posts" on public.curtidas;
create policy "Remoção pública de curtidas de posts"
    on public.curtidas for delete
    to authenticated
    using (true);

drop policy if exists "Leitura pública de curtidas de builds" on public.curtidas_builds;
create policy "Leitura pública de curtidas de builds"
    on public.curtidas_builds for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação pública de curtidas de builds" on public.curtidas_builds;
create policy "Criação pública de curtidas de builds"
    on public.curtidas_builds for insert
    to authenticated
    with check (true);

drop policy if exists "Remoção pública de curtidas de builds" on public.curtidas_builds;
create policy "Remoção pública de curtidas de builds"
    on public.curtidas_builds for delete
    to authenticated
    using (true);

notify pgrst, 'reload schema';
