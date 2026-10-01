create table if not exists public.amizades (
    id uuid primary key default gen_random_uuid(),
    solicitante_id uuid not null references auth.users(id) on delete cascade,
    destinatario_id uuid not null references auth.users(id) on delete cascade,
    solicitante_nome text not null default 'Viciado em Souls',
    solicitante_avatar_url text,
    destinatario_nome text not null default 'Viciado em Souls',
    destinatario_avatar_url text,
    status text not null default 'pendente' check (status in ('pendente', 'aceita')),
    criado_em timestamptz not null default now(),
    constraint amizades_pessoas_diferentes check (solicitante_id <> destinatario_id)
);

create unique index if not exists amizades_par_unico_idx
    on public.amizades (least(solicitante_id, destinatario_id), greatest(solicitante_id, destinatario_id));

create index if not exists amizades_destinatario_status_idx
    on public.amizades (destinatario_id, status, criado_em desc);

alter table public.amizades enable row level security;

drop policy if exists "Participantes leem suas amizades" on public.amizades;
create policy "Participantes leem suas amizades"
    on public.amizades for select
    to authenticated
    using (auth.uid() in (solicitante_id, destinatario_id));

drop policy if exists "Usuário envia pedido de amizade" on public.amizades;
create policy "Usuário envia pedido de amizade"
    on public.amizades for insert
    to authenticated
    with check (solicitante_id = auth.uid() and destinatario_id <> auth.uid() and status = 'pendente');

drop policy if exists "Destinatário aceita pedido de amizade" on public.amizades;
create policy "Destinatário aceita pedido de amizade"
    on public.amizades for update
    to authenticated
    using (destinatario_id = auth.uid() and status = 'pendente')
    with check (destinatario_id = auth.uid() and status = 'aceita');

create or replace function public.proteger_atualizacao_amizade()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.id <> old.id
        or new.solicitante_id <> old.solicitante_id
        or new.destinatario_id <> old.destinatario_id
        or new.solicitante_nome <> old.solicitante_nome
        or new.solicitante_avatar_url is distinct from old.solicitante_avatar_url
        or new.destinatario_nome <> old.destinatario_nome
        or new.destinatario_avatar_url is distinct from old.destinatario_avatar_url
        or new.criado_em <> old.criado_em
        or old.status <> 'pendente'
        or new.status <> 'aceita'
    then
        raise exception 'Pedido de amizade inválido para atualização.';
    end if;
    return new;
end;
$$;

drop trigger if exists proteger_atualizacao_amizade on public.amizades;
create trigger proteger_atualizacao_amizade
    before update on public.amizades
    for each row execute function public.proteger_atualizacao_amizade();

drop policy if exists "Participante cancela ou remove amizade" on public.amizades;
create policy "Participante cancela ou remove amizade"
    on public.amizades for delete
    to authenticated
    using (
        (status = 'pendente' and auth.uid() in (solicitante_id, destinatario_id))
        or (status = 'aceita' and auth.uid() in (solicitante_id, destinatario_id))
    );

alter table public.notificacoes
    drop constraint if exists notificacoes_tipo_check;

alter table public.notificacoes
    add column if not exists amizade_id uuid references public.amizades(id) on delete set null;

alter table public.notificacoes
    add constraint notificacoes_tipo_check
    check (tipo in ('seguidor', 'comentario_post', 'comentario_build', 'curtida_post', 'curtida_build', 'pedido_amizade'));

drop policy if exists "Usuário cria notificações como ator" on public.notificacoes;
create policy "Usuário cria notificações como ator"
    on public.notificacoes for insert
    to authenticated
    with check (
        ator_id = auth.uid()
        and destinatario_id <> auth.uid()
        and (
            (tipo = 'pedido_amizade' and exists (
                select 1 from public.amizades a
                where a.id = notificacoes.amizade_id
                  and a.solicitante_id = auth.uid()
                  and a.destinatario_id = notificacoes.destinatario_id
                  and a.status = 'pendente'
            ))
            or (tipo <> 'pedido_amizade' and amizade_id is null)
        )
    );

create table if not exists public.mensagens_privadas (
    id uuid primary key default gen_random_uuid(),
    remetente_id uuid not null references auth.users(id) on delete cascade,
    destinatario_id uuid not null references auth.users(id) on delete cascade,
    texto text not null check (char_length(trim(texto)) between 1 and 2000),
    criado_em timestamptz not null default now(),
    constraint mensagens_privadas_pessoas_diferentes check (remetente_id <> destinatario_id)
);

create index if not exists mensagens_privadas_par_criado_idx
    on public.mensagens_privadas (remetente_id, destinatario_id, criado_em desc);

create index if not exists mensagens_privadas_destinatario_criado_idx
    on public.mensagens_privadas (destinatario_id, criado_em desc);

alter table public.mensagens_privadas enable row level security;

drop policy if exists "Amigos aceitos leem mensagens privadas" on public.mensagens_privadas;
create policy "Amigos aceitos leem mensagens privadas"
    on public.mensagens_privadas for select
    to authenticated
    using (
        auth.uid() in (remetente_id, destinatario_id)
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and (
                  (a.solicitante_id = mensagens_privadas.remetente_id and a.destinatario_id = mensagens_privadas.destinatario_id)
                  or (a.solicitante_id = mensagens_privadas.destinatario_id and a.destinatario_id = mensagens_privadas.remetente_id)
              )
        )
    );

drop policy if exists "Amigos aceitos enviam mensagens privadas" on public.mensagens_privadas;
create policy "Amigos aceitos enviam mensagens privadas"
    on public.mensagens_privadas for insert
    to authenticated
    with check (
        remetente_id = auth.uid()
        and destinatario_id <> auth.uid()
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and (
                  (a.solicitante_id = auth.uid() and a.destinatario_id = mensagens_privadas.destinatario_id)
                  or (a.destinatario_id = auth.uid() and a.solicitante_id = mensagens_privadas.destinatario_id)
              )
        )
    );

grant select, insert, delete on public.amizades to authenticated;
grant update (status) on public.amizades to authenticated;
grant select, insert on public.mensagens_privadas to authenticated;
grant select, insert on public.notificacoes to authenticated;
revoke update on public.notificacoes from authenticated;
grant update (lida) on public.notificacoes to authenticated;

do $publicacao$
begin
    alter publication supabase_realtime add table public.notificacoes;
exception
    when duplicate_object then null;
end
$publicacao$;

do $realtime$
begin
    alter publication supabase_realtime add table public.mensagens_privadas;
exception
    when duplicate_object then null;
end
$realtime$;

notify pgrst, 'reload schema';
