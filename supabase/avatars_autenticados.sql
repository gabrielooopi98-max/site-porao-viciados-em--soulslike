insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Leitura pública de avatares" on storage.objects;
create policy "Leitura pública de avatares"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'avatars');

drop policy if exists "Upload do próprio avatar" on storage.objects;
create policy "Upload do próprio avatar"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );

drop policy if exists "Atualização do próprio avatar" on storage.objects;
create policy "Atualização do próprio avatar"
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'avatars'
        and owner_id = (select auth.uid()::text)
    )
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );

drop policy if exists "Remoção do próprio avatar" on storage.objects;
create policy "Remoção do próprio avatar"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'avatars'
        and owner_id = (select auth.uid()::text)
    );