
alter table public.comentarios
    add column if not exists autor_id uuid references auth.users(id) on delete set null;

alter table public.comentarios_builds
    add column if not exists autor_id uuid references auth.users(id) on delete set null;

alter table public.curtidas
    add column if not exists usuario_id uuid references auth.users(id) on delete set null;

alter table public.curtidas_builds
    add column if not exists usuario_id uuid references auth.users(id) on delete set null;

create index if not exists comentarios_autor_id_idx on public.comentarios(autor_id);
create index if not exists comentarios_builds_autor_id_idx on public.comentarios_builds(autor_id);
create index if not exists curtidas_usuario_id_idx on public.curtidas(usuario_id);
create index if not exists curtidas_builds_usuario_id_idx on public.curtidas_builds(usuario_id);

create table if not exists public.notificacoes (
    id uuid primary key default gen_random_uuid(),
    destinatario_id uuid not null references auth.users(id) on delete cascade,
    ator_id uuid references auth.users(id) on delete set null,
    ator_nome text not null default 'Alguém',
    tipo text not null check (tipo in ('seguidor', 'comentario_post', 'comentario_build', 'curtida_post', 'curtida_build')),
    post_id bigint references public.posts(id) on delete cascade,
    build_id bigint references public.builds(id) on delete cascade,
    comentario_id bigint,
    titulo_conteudo text,
    texto text,
    lida boolean not null default false,
    criado_em timestamptz not null default now()
);

create index if not exists notificacoes_destinatario_criado_idx
    on public.notificacoes(destinatario_id, criado_em desc);

alter table public.notificacoes enable row level security;

drop policy if exists "Usuário lê suas notificações" on public.notificacoes;
create policy "Usuário lê suas notificações"
    on public.notificacoes for select
    to authenticated
    using (destinatario_id = auth.uid());

drop policy if exists "Usuário atualiza suas notificações" on public.notificacoes;
create policy "Usuário atualiza suas notificações"
    on public.notificacoes for update
    to authenticated
    using (destinatario_id = auth.uid())
    with check (destinatario_id = auth.uid());

drop policy if exists "Usuário cria notificações como ator" on public.notificacoes;
create policy "Usuário cria notificações como ator"
    on public.notificacoes for insert
    to authenticated
    with check (ator_id = auth.uid() and destinatario_id <> auth.uid());