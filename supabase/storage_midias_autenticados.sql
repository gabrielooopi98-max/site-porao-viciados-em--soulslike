drop policy if exists "Upload de mídias para usuários autenticados" on storage.objects;
create policy "Upload de mídias para usuários autenticados"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'midias');

drop policy if exists "Remoção de mídias incompletas autenticada" on storage.objects;
create policy "Remoção de mídias incompletas autenticada"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'midias' and owner_id = (select auth.uid()::text));