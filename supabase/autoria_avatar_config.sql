alter table public.posts
    add column if not exists autor_avatar_zoom numeric not null default 1,
    add column if not exists autor_avatar_pos_x numeric not null default 50,
    add column if not exists autor_avatar_pos_y numeric not null default 50;

alter table public.builds
    add column if not exists autor_avatar_zoom numeric not null default 1,
    add column if not exists autor_avatar_pos_x numeric not null default 50,
    add column if not exists autor_avatar_pos_y numeric not null default 50;

notify pgrst, 'reload schema';