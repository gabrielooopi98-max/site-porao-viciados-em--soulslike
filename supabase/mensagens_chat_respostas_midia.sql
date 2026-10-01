alter table public.mensagens_chat
    add column if not exists resposta_midia_tipo text,
    add column if not exists resposta_midia_nome text;

notify pgrst, 'reload schema';
