create table if not exists public.mensagens_chat (
    id uuid primary key default gen_random_uuid(),
    autor_id uuid not null references auth.users(id) on delete cascade,
    autor_nome text not null,
    autor_avatar_url text,
    texto text not null,
    midia_url text,
    midia_tipo text,
    midia_nome text,
    resposta_mensagem_id uuid references public.mensagens_chat(id) on delete set null,
    resposta_autor_nome text,
    resposta_texto text,
    resposta_midia_tipo text,
    resposta_midia_nome text,
    criado_em timestamptz not null default now()
);

alter table public.mensagens_chat
    add column if not exists resposta_mensagem_id uuid references public.mensagens_chat(id) on delete set null,
    add column if not exists resposta_autor_nome text,
    add column if not exists resposta_texto text,
    add column if not exists resposta_midia_tipo text,
    add column if not exists resposta_midia_nome text,
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

create index if not exists mensagens_chat_criado_em_idx
    on public.mensagens_chat(criado_em);

create index if not exists mensagens_chat_autor_criado_em_idx
    on public.mensagens_chat(autor_id, criado_em desc);

create or replace function public.bloquear_spam_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if (
        select count(*)
        from public.mensagens_chat
        where autor_id = new.autor_id
          and criado_em > now() - interval '10 seconds'
    ) >= 5 then
        raise exception 'Muitas mensagens em pouco tempo. Aguarde alguns segundos.'
            using errcode = 'check_violation';
    end if;

    if exists (
        select 1
        from public.mensagens_chat
        where autor_id = new.autor_id
          and texto = new.texto
          and criado_em > now() - interval '30 seconds'
    ) then
        raise exception 'Mensagem repetida. Evite enviar o mesmo texto em sequência.'
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

drop trigger if exists limitar_spam_mensagens_chat on public.mensagens_chat;
create trigger limitar_spam_mensagens_chat
    before insert on public.mensagens_chat
    for each row execute function public.bloquear_spam_chat();

alter table public.mensagens_chat enable row level security;

drop policy if exists "Leitura do chat para autenticados" on public.mensagens_chat;
create policy "Leitura do chat para autenticados"
    on public.mensagens_chat for select
    to authenticated
    using (true);

drop policy if exists "Envio no chat pelo próprio usuário" on public.mensagens_chat;
create policy "Envio no chat pelo próprio usuário"
    on public.mensagens_chat for insert
    to authenticated
    with check (autor_id = (select auth.uid()));

drop policy if exists "Edição das próprias mensagens" on public.mensagens_chat;
create policy "Edição das próprias mensagens"
    on public.mensagens_chat for update
    to authenticated
    using (autor_id = (select auth.uid()))
    with check (autor_id = (select auth.uid()));

drop policy if exists "Exclusão das próprias mensagens" on public.mensagens_chat;
create policy "Exclusão das próprias mensagens"
    on public.mensagens_chat for delete
    to authenticated
    using (autor_id = (select auth.uid()));

-- Ative a extensão Realtime para a tabela sem falhar se ela já estiver publicada.
do $$
begin
    alter publication supabase_realtime add table public.mensagens_chat;
exception
    when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

-- Limpeza automática diária de mensagens com mais de 30 dias.
-- Ative a extensão pg_cron no Dashboard caso o projeto ainda não a tenha habilitada.
create extension if not exists pg_cron;

do $limpeza_chat$
declare
    job_id bigint;
begin
    select jobid into job_id
    from cron.job
    where jobname = 'limpar-mensagens-chat-30-dias';

    if job_id is not null then
        perform cron.unschedule(job_id);
    end if;

    perform cron.schedule(
        'limpar-mensagens-chat-30-dias',
        '0 3 * * *',
        $$delete from public.mensagens_chat where criado_em < now() - interval '30 days';$$
    );
end;
$limpeza_chat$;
