drop policy if exists "Leitura pública de posts autenticados" on public.posts;
create policy "Leitura pública de posts autenticados"
    on public.posts for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação de posts autenticados" on public.posts;
create policy "Criação de posts autenticados"
    on public.posts for insert
    to authenticated
    with check (autor_id = (select auth.uid()));

drop policy if exists "Edição dos próprios posts" on public.posts;
create policy "Edição dos próprios posts"
    on public.posts for update
    to authenticated
    using (autor_id = (select auth.uid()))
    with check (autor_id = (select auth.uid()));

drop policy if exists "Exclusão dos próprios posts" on public.posts;
create policy "Exclusão dos próprios posts"
    on public.posts for delete
    to authenticated
    using (autor_id = (select auth.uid()));

drop policy if exists "Leitura pública de builds autenticados" on public.builds;
create policy "Leitura pública de builds autenticados"
    on public.builds for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação de builds autenticados" on public.builds;
create policy "Criação de builds autenticados"
    on public.builds for insert
    to authenticated
    with check (autor_id = (select auth.uid()));

drop policy if exists "Edição das próprias builds" on public.builds;
create policy "Edição das próprias builds"
    on public.builds for update
    to authenticated
    using (autor_id = (select auth.uid()))
    with check (autor_id = (select auth.uid()));

drop policy if exists "Exclusão das próprias builds" on public.builds;
create policy "Exclusão das próprias builds"
    on public.builds for delete
    to authenticated
    using (autor_id = (select auth.uid()));

notify pgrst, 'reload schema';