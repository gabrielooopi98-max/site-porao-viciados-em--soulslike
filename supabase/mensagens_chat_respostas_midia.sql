alter table public.mensagens_chat
    add column if not exists resposta_midia_tipo text,
    add column if not exists resposta_midia_nome text,
    add column if not exists resposta_midia_url text;

notify pgrst, 'reload schema';
