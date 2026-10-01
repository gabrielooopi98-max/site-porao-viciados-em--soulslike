alter table public.comentarios enable row level security;
alter table public.comentarios_builds enable row level security;

drop policy if exists "Leitura pública de comentários" on public.comentarios;
create policy "Leitura pública de comentários"
    on public.comentarios for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação de comentários autenticados" on public.comentarios;
create policy "Criação de comentários autenticados"
    on public.comentarios for insert
    to authenticated
    with check (autor_id = (select auth.uid()));

drop policy if exists "Edição dos próprios comentários" on public.comentarios;
create policy "Edição dos próprios comentários"
    on public.comentarios for update
    to authenticated
    using (autor_id = (select auth.uid()))
    with check (autor_id = (select auth.uid()));

drop policy if exists "Exclusão dos próprios comentários" on public.comentarios;
create policy "Exclusão dos próprios comentários"
    on public.comentarios for delete
    to authenticated
    using (autor_id = (select auth.uid()));

drop policy if exists "Leitura pública de comentários de builds" on public.comentarios_builds;
create policy "Leitura pública de comentários de builds"
    on public.comentarios_builds for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação de comentários autenticados em builds" on public.comentarios_builds;
create policy "Criação de comentários autenticados em builds"
    on public.comentarios_builds for insert
    to authenticated
    with check (autor_id = (select auth.uid()));

drop policy if exists "Edição dos próprios comentários de builds" on public.comentarios_builds;
create policy "Edição dos próprios comentários de builds"
    on public.comentarios_builds for update
    to authenticated
    using (autor_id = (select auth.uid()))
    with check (autor_id = (select auth.uid()));

drop policy if exists "Exclusão dos próprios comentários de builds" on public.comentarios_builds;
create policy "Exclusão dos próprios comentários de builds"
    on public.comentarios_builds for delete
    to authenticated
    using (autor_id = (select auth.uid()));

notify pgrst, 'reload schema';
