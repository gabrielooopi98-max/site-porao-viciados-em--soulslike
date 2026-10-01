create table if not exists public.reacoes_comentarios (
    id uuid primary key default gen_random_uuid(),
    comentario_id bigint not null references public.comentarios(id) on delete cascade,
    visitante_id text not null,
    tipo text not null check (tipo in ('like', 'dislike')),
    criado_em timestamptz not null default now(),
    unique (comentario_id, visitante_id)
);

alter table public.reacoes_comentarios enable row level security;

drop policy if exists "Permitir leitura pública de reações de comentários" on public.reacoes_comentarios;
create policy "Permitir leitura pública de reações de comentários"
    on public.reacoes_comentarios for select
    to anon, authenticated
    using (true);

drop policy if exists "Permitir criação pública de reações de comentários" on public.reacoes_comentarios;
create policy "Permitir criação pública de reações de comentários"
    on public.reacoes_comentarios for insert
    to authenticated
    with check (true);

drop policy if exists "Permitir atualização pública de reações de comentários" on public.reacoes_comentarios;
create policy "Permitir atualização pública de reações de comentários"
    on public.reacoes_comentarios for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "Permitir remoção pública de reações de comentários" on public.reacoes_comentarios;
create policy "Permitir remoção pública de reações de comentários"
    on public.reacoes_comentarios for delete
    to authenticated
    using (true);