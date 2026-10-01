alter table public.posts
    add column if not exists autor_id uuid references auth.users(id) on delete set null,
    add column if not exists autor_nome text,
    add column if not exists autor_avatar_url text;

alter table public.builds
    add column if not exists autor_id uuid references auth.users(id) on delete set null,
    add column if not exists autor_nome text,
    add column if not exists autor_avatar_url text;

create index if not exists posts_autor_id_idx on public.posts(autor_id);
create index if not exists builds_autor_id_idx on public.builds(autor_id);

notify pgrst, 'reload schema';