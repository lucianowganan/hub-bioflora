-- Migração 81: Fórmulas Complexas
--  (a) limite de minutos por DIA DA SEMANA (0=domingo ... 6=sábado)
--  (b) conferência passa a poder alterar os parâmetros (catálogo de formas)
--  (c) laboratório passa a poder LER catálogo e registros (já podia aprovar, mas via tela vazia)
-- Idempotente e não destrutiva: só cria o que ainda não existe, não apaga nada.

create table if not exists public.formulas_complexas_limite_semanal (
  dia_semana smallint primary key check (dia_semana between 0 and 6),
  minutos_disponiveis integer not null check (minutos_disponiveis >= 0),
  atualizado_por uuid,
  atualizado_em timestamptz default now()
);

alter table public.formulas_complexas_limite_semanal enable row level security;

grant select, insert, update, delete on public.formulas_complexas_limite_semanal to authenticated;

do $$
begin
  -- (a) limite por dia da semana: lê quem usa o módulo, escreve quem gerencia
  if not exists (select 1 from pg_policies where tablename='formulas_complexas_limite_semanal' and policyname='leitura_limite_semanal') then
    create policy leitura_limite_semanal on public.formulas_complexas_limite_semanal
      for select to authenticated
      using (exists (select 1 from perfis p where p.id = auth.uid()
                     and p.papel = any (array['chefia','gestao','conferencia','atendente','laboratorio'])));
  end if;
  if not exists (select 1 from pg_policies where tablename='formulas_complexas_limite_semanal' and policyname='escrita_limite_semanal') then
    create policy escrita_limite_semanal on public.formulas_complexas_limite_semanal
      for all to authenticated
      using (exists (select 1 from perfis p where p.id = auth.uid()
                     and p.papel = any (array['chefia','conferencia','laboratorio'])))
      with check (exists (select 1 from perfis p where p.id = auth.uid()
                     and p.papel = any (array['chefia','conferencia','laboratorio'])));
  end if;

  -- (b) conferência altera parâmetros (catálogo de formas farmacêuticas)
  if not exists (select 1 from pg_policies where tablename='formulas_complexas_catalogo' and policyname='conferencia_insere_catalogo_complexas') then
    create policy conferencia_insere_catalogo_complexas on public.formulas_complexas_catalogo
      for insert to authenticated
      with check (exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'conferencia'));
  end if;
  if not exists (select 1 from pg_policies where tablename='formulas_complexas_catalogo' and policyname='conferencia_atualiza_catalogo_complexas') then
    create policy conferencia_atualiza_catalogo_complexas on public.formulas_complexas_catalogo
      for update to authenticated
      using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'conferencia'));
  end if;
  if not exists (select 1 from pg_policies where tablename='formulas_complexas_catalogo' and policyname='conferencia_exclui_catalogo_complexas') then
    create policy conferencia_exclui_catalogo_complexas on public.formulas_complexas_catalogo
      for delete to authenticated
      using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'conferencia'));
  end if;

  -- (c) laboratório lê catálogo e registros
  if not exists (select 1 from pg_policies where tablename='formulas_complexas_catalogo' and policyname='laboratorio_le_catalogo_complexas') then
    create policy laboratorio_le_catalogo_complexas on public.formulas_complexas_catalogo
      for select to authenticated
      using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'laboratorio'));
  end if;
  if not exists (select 1 from pg_policies where tablename='formulas_complexas_registro' and policyname='laboratorio_le_registro_complexas') then
    create policy laboratorio_le_registro_complexas on public.formulas_complexas_registro
      for select to authenticated
      using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'laboratorio'));
  end if;
end $$;
