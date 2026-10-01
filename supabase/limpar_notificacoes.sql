drop policy if exists "Usuário exclui suas notificações" on public.notificacoes;
create policy "Usuário exclui suas notificações"
    on public.notificacoes for delete
    to authenticated
    using (destinatario_id = (select auth.uid()));

grant delete on public.notificacoes to authenticated;
