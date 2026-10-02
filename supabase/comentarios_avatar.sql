alter table public.comentarios
    add column if not exists autor_avatar_url text,
    add column if not exists autor_avatar_zoom numeric not null default 1,
    add column if not exists autor_avatar_pos_x numeric not null default 50,
    add column if not exists autor_avatar_pos_y numeric not null default 50;

alter table public.comentarios_builds
    add column if not exists autor_avatar_url text,
    add column if not exists autor_avatar_zoom numeric not null default 1,
    add column if not exists autor_avatar_pos_x numeric not null default 50,
    add column if not exists autor_avatar_pos_y numeric not null default 50;

-- Preenche a foto dos comentários já existentes com a foto atual de cada conta.
update public.comentarios as comentario
set
    autor_avatar_url = usuario.raw_user_meta_data ->> 'avatar_url',
    autor_avatar_zoom = coalesce((usuario.raw_user_meta_data ->> 'avatar_zoom')::numeric, 1),
    autor_avatar_pos_x = coalesce((usuario.raw_user_meta_data ->> 'avatar_pos_x')::numeric, 50),
    autor_avatar_pos_y = coalesce((usuario.raw_user_meta_data ->> 'avatar_pos_y')::numeric, 50)
from auth.users as usuario
where comentario.autor_id = usuario.id
    and comentario.autor_avatar_url is null
    and usuario.raw_user_meta_data ->> 'avatar_url' is not null;

update public.comentarios_builds as comentario
set
    autor_avatar_url = usuario.raw_user_meta_data ->> 'avatar_url',
    autor_avatar_zoom = coalesce((usuario.raw_user_meta_data ->> 'avatar_zoom')::numeric, 1),
    autor_avatar_pos_x = coalesce((usuario.raw_user_meta_data ->> 'avatar_pos_x')::numeric, 50),
    autor_avatar_pos_y = coalesce((usuario.raw_user_meta_data ->> 'avatar_pos_y')::numeric, 50)
from auth.users as usuario
where comentario.autor_id = usuario.id
    and comentario.autor_avatar_url is null
    and usuario.raw_user_meta_data ->> 'avatar_url' is not null;

notify pgrst, 'reload schema';
