create table if not exists public.favoritos_publicacoes (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references auth.users(id) on delete cascade,
    post_id bigint references public.posts(id) on delete cascade,
    build_id bigint references public.builds(id) on delete cascade,
    criado_em timestamptz not null default now(),
    constraint favorito_uma_publicacao check (num_nonnulls(post_id, build_id) = 1),
    unique (usuario_id, post_id),
    unique (usuario_id, build_id)
);

create index if not exists favoritos_usuario_criado_idx
    on public.favoritos_publicacoes (usuario_id, criado_em desc);

alter table public.favoritos_publicacoes enable row level security;

drop policy if exists "Usuario le seus favoritos" on public.favoritos_publicacoes;
create policy "Usuario le seus favoritos"
    on public.favoritos_publicacoes for select to authenticated
    using (usuario_id = auth.uid());

drop policy if exists "Usuario salva seus favoritos" on public.favoritos_publicacoes;
create policy "Usuario salva seus favoritos"
    on public.favoritos_publicacoes for insert to authenticated
    with check (usuario_id = auth.uid());

drop policy if exists "Usuario remove seus favoritos" on public.favoritos_publicacoes;
create policy "Usuario remove seus favoritos"
    on public.favoritos_publicacoes for delete to authenticated
    using (usuario_id = auth.uid());

grant select, insert, delete on public.favoritos_publicacoes to authenticated;
notify pgrst, 'reload schema';
