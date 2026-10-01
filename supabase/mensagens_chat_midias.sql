alter table public.mensagens_chat
    add column if not exists midia_url text,
    add column if not exists midia_tipo text,
    add column if not exists midia_nome text;

alter table public.mensagens_chat
    drop constraint if exists mensagens_chat_texto_check;

alter table public.mensagens_chat
    add constraint mensagens_chat_texto_check check (
        char_length(trim(texto)) between 0 and 500
        and (char_length(trim(texto)) > 0 or midia_url is not null)
    );

notify pgrst, 'reload schema';
