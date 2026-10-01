alter table public.mensagens_privadas
    alter column texto drop not null;

alter table public.mensagens_privadas replica identity full;

alter table public.mensagens_privadas
    drop constraint if exists mensagens_privadas_texto_check;

alter table public.mensagens_privadas
    add column if not exists audio_path text,
    add column if not exists midia_path text,
    add column if not exists midia_tipo text,
    add column if not exists midia_nome text,
    add column if not exists figurinha_id uuid,
    add column if not exists lida_em timestamptz,
    add column if not exists resposta_mensagem_id uuid,
    add column if not exists resposta_remetente_id uuid,
    add column if not exists resposta_texto text,
    add column if not exists resposta_tipo text,
    add column if not exists resposta_nome text,
    add column if not exists editada boolean not null default false;

alter table public.mensagens_privadas
    drop constraint if exists mensagens_privadas_figurinha_id_fkey;

alter table public.mensagens_privadas
    add constraint mensagens_privadas_figurinha_id_fkey
    foreign key (figurinha_id) references public.figurinhas_chat(id) on delete restrict;

alter table public.mensagens_privadas
    drop constraint if exists mensagens_privadas_conteudo_check;

alter table public.mensagens_privadas
    add constraint mensagens_privadas_conteudo_check
    check (
        (audio_path is null and midia_path is null and figurinha_id is null and texto is not null and char_length(trim(texto)) between 1 and 2000)
        or (
            audio_path is not null
            and midia_path is null
            and midia_tipo is null
            and midia_nome is null
            and figurinha_id is null
            and texto is null
            and split_part(audio_path, '/', 1) = (
                least(remetente_id, destinatario_id)::text
                || '_' ||
                greatest(remetente_id, destinatario_id)::text
            )
            and split_part(audio_path, '/', 2) = remetente_id::text
            and split_part(audio_path, '/', 3) <> ''
            and array_length(string_to_array(audio_path, '/'), 1) = 3
        )
        or (
            midia_path is not null
            and audio_path is null
            and figurinha_id is null
            and (texto is null or char_length(trim(texto)) between 1 and 2000)
            and midia_tipo is not null
            and midia_tipo in ('image/gif', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime')
            and midia_nome is not null
            and split_part(midia_path, '/', 1) = (
                least(remetente_id, destinatario_id)::text
                || '_' ||
                greatest(remetente_id, destinatario_id)::text
            )
            and split_part(midia_path, '/', 2) = remetente_id::text
            and split_part(midia_path, '/', 3) <> ''
            and array_length(string_to_array(midia_path, '/'), 1) = 3
        )
        or (
            figurinha_id is not null
            and audio_path is null
            and midia_path is null
            and midia_tipo is null
            and midia_nome is null
            and texto is null
        )
    );

create or replace function public.proteger_atualizacao_mensagem_privada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.id is distinct from old.id
        or new.remetente_id <> old.remetente_id
        or new.destinatario_id <> old.destinatario_id
        or new.audio_path is distinct from old.audio_path
        or new.midia_path is distinct from old.midia_path
        or new.midia_tipo is distinct from old.midia_tipo
        or new.midia_nome is distinct from old.midia_nome
        or new.figurinha_id is distinct from old.figurinha_id
        or new.resposta_mensagem_id is distinct from old.resposta_mensagem_id
        or new.resposta_remetente_id is distinct from old.resposta_remetente_id
        or new.resposta_texto is distinct from old.resposta_texto
        or new.resposta_tipo is distinct from old.resposta_tipo
        or new.resposta_nome is distinct from old.resposta_nome
        or new.criado_em is distinct from old.criado_em
    then
        raise exception 'Atualização de mensagem privada inválida.';
    end if;

    if new.texto is distinct from old.texto
        or new.editada is distinct from old.editada
    then
        if auth.uid() <> old.remetente_id
            or old.audio_path is not null
            or old.midia_path is not null
            or old.figurinha_id is not null
            or new.texto is null
            or char_length(trim(new.texto)) not between 1 and 2000
            or new.editada is not true
            or new.lida_em is distinct from old.lida_em
        then
            raise exception 'Somente o autor pode editar o texto de uma mensagem de texto.';
        end if;
        return new;
    end if;

    if auth.uid() <> old.destinatario_id
        or old.lida_em is not null
        or new.lida_em is null
        or new.editada is distinct from old.editada
    then
        raise exception 'Atualização de mensagem privada inválida.';
    end if;
    return new;
end;
$$;

drop trigger if exists proteger_atualizacao_mensagem_privada on public.mensagens_privadas;
create trigger proteger_atualizacao_mensagem_privada
    before update on public.mensagens_privadas
    for each row execute function public.proteger_atualizacao_mensagem_privada();

drop policy if exists "Destinatário marca mensagem privada como lida" on public.mensagens_privadas;
create policy "Destinatário marca mensagem privada como lida"
    on public.mensagens_privadas for update
    to authenticated
    using (
        destinatario_id = auth.uid()
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and (
                  (a.solicitante_id = mensagens_privadas.remetente_id and a.destinatario_id = mensagens_privadas.destinatario_id)
                  or (a.solicitante_id = mensagens_privadas.destinatario_id and a.destinatario_id = mensagens_privadas.remetente_id)
              )
        )
    )
    with check (destinatario_id = auth.uid());

grant update (lida_em) on public.mensagens_privadas to authenticated;

drop policy if exists "Autor edita próprias mensagens privadas" on public.mensagens_privadas;
create policy "Autor edita próprias mensagens privadas"
    on public.mensagens_privadas for update
    to authenticated
    using (
        remetente_id = auth.uid()
        and audio_path is null
        and midia_path is null
        and figurinha_id is null
    )
    with check (remetente_id = auth.uid());

grant update (texto, editada) on public.mensagens_privadas to authenticated;

drop policy if exists "Autor exclui próprias mensagens privadas" on public.mensagens_privadas;
create policy "Autor exclui próprias mensagens privadas"
    on public.mensagens_privadas for delete
    to authenticated
    using (remetente_id = auth.uid());

grant delete on public.mensagens_privadas to authenticated;

drop policy if exists "Mensagens privadas referenciam figurinhas compartilhadas" on public.figurinhas_chat;
drop policy if exists "Usuários autenticados leem figurinhas compartilhadas" on public.figurinhas_chat;
create policy "Usuários autenticados leem figurinhas compartilhadas"
    on public.figurinhas_chat for select
    to authenticated
    using (true);

drop policy if exists "Amigos aceitos enviam mensagens privadas" on public.mensagens_privadas;
create policy "Amigos aceitos enviam mensagens privadas"
    on public.mensagens_privadas for insert
    to authenticated
    with check (
        remetente_id = auth.uid()
        and destinatario_id <> auth.uid()
        and (
            figurinha_id is null
            or exists (
                select 1 from public.figurinhas_chat f
                where f.id = figurinha_id
                  and f.autor_id = auth.uid()
            )
        )
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and (
                  (a.solicitante_id = auth.uid() and a.destinatario_id = mensagens_privadas.destinatario_id)
                  or (a.destinatario_id = auth.uid() and a.solicitante_id = mensagens_privadas.destinatario_id)
              )
        )
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'mensagens-privadas-audio',
    'mensagens-privadas-audio',
    false,
    10485760,
    array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'mensagens-privadas-midia',
    'mensagens-privadas-midia',
    false,
    52428800,
    array['image/gif', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Amigos enviam mídias privadas" on storage.objects;
create policy "Amigos enviam mídias privadas"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'mensagens-privadas-midia'
        and split_part(name, '/', 2) = auth.uid()::text
        and split_part(name, '/', 3) <> ''
        and array_length(string_to_array(name, '/'), 1) = 3
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and auth.uid() in (a.solicitante_id, a.destinatario_id)
              and split_part(name, '/', 1) =
                  least(a.solicitante_id, a.destinatario_id)::text
                  || '_' ||
                  greatest(a.solicitante_id, a.destinatario_id)::text
        )
    );

drop policy if exists "Amigos leem mídias privadas" on storage.objects;
create policy "Amigos leem mídias privadas"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'mensagens-privadas-midia'
        and split_part(name, '/', 3) <> ''
        and array_length(string_to_array(name, '/'), 1) = 3
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and auth.uid() in (a.solicitante_id, a.destinatario_id)
              and split_part(name, '/', 1) =
                  least(a.solicitante_id, a.destinatario_id)::text
                  || '_' ||
                  greatest(a.solicitante_id, a.destinatario_id)::text
        )
    );

drop policy if exists "Amigos enviam áudios privados" on storage.objects;
create policy "Amigos enviam áudios privados"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'mensagens-privadas-audio'
        and split_part(name, '/', 2) = auth.uid()::text
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and auth.uid() in (a.solicitante_id, a.destinatario_id)
              and split_part(name, '/', 1) =
                  least(a.solicitante_id, a.destinatario_id)::text
                  || '_' ||
                  greatest(a.solicitante_id, a.destinatario_id)::text
        )
        and split_part(name, '/', 3) <> ''
        and array_length(string_to_array(name, '/'), 1) = 3
    );

drop policy if exists "Amigos leem áudios privados" on storage.objects;
create policy "Amigos leem áudios privados"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'mensagens-privadas-audio'
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and auth.uid() in (a.solicitante_id, a.destinatario_id)
              and split_part(name, '/', 1) =
                  least(a.solicitante_id, a.destinatario_id)::text
                  || '_' ||
                  greatest(a.solicitante_id, a.destinatario_id)::text
        )
        and split_part(name, '/', 3) <> ''
        and array_length(string_to_array(name, '/'), 1) = 3
    );

drop policy if exists "Participantes autorizam presença privada" on realtime.messages;
create policy "Participantes autorizam presença privada"
    on realtime.messages for select
    to authenticated
    using (
        (
            realtime.topic() like 'private-friend-presence:%'
            and (
                auth.uid()::text = split_part(realtime.topic(), ':', 2)
                or exists (
                    select 1 from public.amizades a
                    where a.status = 'aceita'
                      and auth.uid() in (a.solicitante_id, a.destinatario_id)
                      and split_part(realtime.topic(), ':', 2) in (a.solicitante_id::text, a.destinatario_id::text)
                )
            )
        )
        or (
            realtime.topic() like 'private-message-activity:%'
            and auth.uid()::text in (
                split_part(realtime.topic(), ':', 2),
                split_part(realtime.topic(), ':', 3)
            )
            and exists (
                select 1 from public.amizades a
                where a.status = 'aceita'
                  and (
                      (a.solicitante_id::text = split_part(realtime.topic(), ':', 2)
                       and a.destinatario_id::text = split_part(realtime.topic(), ':', 3))
                      or (a.destinatario_id::text = split_part(realtime.topic(), ':', 2)
                          and a.solicitante_id::text = split_part(realtime.topic(), ':', 3))
                  )
            )
        )
    );

drop policy if exists "Participantes enviam atividade privada" on realtime.messages;
create policy "Participantes enviam atividade privada"
    on realtime.messages for insert
    to authenticated
    with check (
        realtime.topic() like 'private-message-activity:%'
        and auth.uid()::text in (
            split_part(realtime.topic(), ':', 2),
            split_part(realtime.topic(), ':', 3)
        )
        and exists (
            select 1 from public.amizades a
            where a.status = 'aceita'
              and (
                  (a.solicitante_id::text = split_part(realtime.topic(), ':', 2)
                   and a.destinatario_id::text = split_part(realtime.topic(), ':', 3))
                  or (a.destinatario_id::text = split_part(realtime.topic(), ':', 2)
                      and a.solicitante_id::text = split_part(realtime.topic(), ':', 3))
              )
        )
    );

drop policy if exists "Usuário publica própria presença privada" on realtime.messages;
create policy "Usuário publica própria presença privada"
    on realtime.messages for insert
    to authenticated
    with check (
        realtime.topic() like 'private-friend-presence:%'
        and auth.uid()::text = split_part(realtime.topic(), ':', 2)
    );

notify pgrst, 'reload schema';
