alter table public.mensagens_chat
    add column if not exists editada boolean not null default false;

notify pgrst, 'reload schema';