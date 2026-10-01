create table if not exists public.midias_posts (
    id uuid primary key default gen_random_uuid(),
    post_id bigint not null references public.posts(id) on delete cascade,
    midia_url text not null,
    tipo_midia text not null,
    ordem integer not null default 0 check (ordem >= 0),
    criado_em timestamptz not null default now(),
    unique (post_id, ordem)
);

create table if not exists public.midias_builds (
    id uuid primary key default gen_random_uuid(),
    build_id bigint not null references public.builds(id) on delete cascade,
    midia_url text not null,
    tipo_midia text not null,
    ordem integer not null default 0 check (ordem >= 0),
    criado_em timestamptz not null default now(),
    unique (build_id, ordem)
);

alter table public.midias_posts enable row level security;
alter table public.midias_builds enable row level security;

drop policy if exists "Leitura pública de mídias de posts" on public.midias_posts;
create policy "Leitura pública de mídias de posts"
    on public.midias_posts for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação pública de mídias de posts" on public.midias_posts;
create policy "Criação pública de mídias de posts"
    on public.midias_posts for insert
    to anon, authenticated
    with check (true);

drop policy if exists "Exclusão de mídias dos próprios posts" on public.midias_posts;
create policy "Exclusão de mídias dos próprios posts"
    on public.midias_posts for delete
    to authenticated
    using (exists (
        select 1 from public.posts
        where public.posts.id = midias_posts.post_id
          and public.posts.autor_id = (select auth.uid())
    ));

drop policy if exists "Leitura pública de mídias de builds" on public.midias_builds;
create policy "Leitura pública de mídias de builds"
    on public.midias_builds for select
    to anon, authenticated
    using (true);

drop policy if exists "Criação pública de mídias de builds" on public.midias_builds;
create policy "Criação pública de mídias de builds"
    on public.midias_builds for insert
    to anon, authenticated
    with check (true);

drop policy if exists "Exclusão de mídias das próprias builds" on public.midias_builds;
create policy "Exclusão de mídias das próprias builds"
    on public.midias_builds for delete
    to authenticated
    using (exists (
        select 1 from public.builds
        where public.builds.id = midias_builds.build_id
          and public.builds.autor_id = (select auth.uid())
    ));