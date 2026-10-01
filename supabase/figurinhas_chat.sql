insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'figurinhas-chat',
    'figurinhas-chat',
    true,
    5242880,
    array['image/gif', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Leitura pública de figurinhas do chat" on storage.objects;
create policy "Leitura pública de figurinhas do chat"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'figurinhas-chat');

drop policy if exists "Upload de figurinhas próprias do chat" on storage.objects;
create policy "Upload de figurinhas próprias do chat"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'figurinhas-chat'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );

drop policy if exists "Remoção de figurinhas próprias do chat" on storage.objects;
create policy "Remoção de figurinhas próprias do chat"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'figurinhas-chat'
        and owner_id = (select auth.uid()::text)
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );

create table if not exists public.figurinhas_chat (
    id uuid primary key default gen_random_uuid(),
    autor_id uuid not null references auth.users(id) on delete cascade,
    midia_url text not null,
    midia_path text not null unique,
    midia_tipo text not null check (midia_tipo in ('image/gif', 'image/jpeg', 'image/png', 'image/webp')),
    midia_nome text not null check (char_length(midia_nome) between 1 and 120),
    criado_em timestamptz not null default now()
);

create index if not exists figurinhas_chat_autor_criado_em_idx
    on public.figurinhas_chat (autor_id, criado_em desc);

alter table public.figurinhas_chat enable row level security;

drop policy if exists "Leitura das próprias figurinhas do chat" on public.figurinhas_chat;
create policy "Leitura das próprias figurinhas do chat"
    on public.figurinhas_chat for select
    to authenticated
    using (autor_id = (select auth.uid()));

drop policy if exists "Criação das próprias figurinhas do chat" on public.figurinhas_chat;
create policy "Criação das próprias figurinhas do chat"
    on public.figurinhas_chat for insert
    to authenticated
    with check (
        autor_id = (select auth.uid())
        and split_part(midia_path, '/', 1) = (select auth.uid()::text)
    );

drop policy if exists "Exclusão das próprias figurinhas do chat" on public.figurinhas_chat;
create policy "Exclusão das próprias figurinhas do chat"
    on public.figurinhas_chat for delete
    to authenticated
    using (autor_id = (select auth.uid()));

grant select, insert, delete on public.figurinhas_chat to authenticated;

notify pgrst, 'reload schema';
