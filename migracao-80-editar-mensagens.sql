-- Migração 80: permite o autor editar a própria mensagem (canal e DM).
-- Idempotente e não destrutiva: só cria políticas se ainda não existirem.

do $$
begin
  if not exists (select 1 from pg_policies where tablename='mensagens_chat' and policyname='autor_edita_mensagem') then
    create policy autor_edita_mensagem on public.mensagens_chat
      for update to authenticated
      using (autor_id = auth.uid())
      with check (autor_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='dm_mensagens' and policyname='remetente_edita_dm') then
    create policy remetente_edita_dm on public.dm_mensagens
      for update to authenticated
      using (remetente_id = auth.uid())
      with check (remetente_id = auth.uid());
  end if;
end $$;
