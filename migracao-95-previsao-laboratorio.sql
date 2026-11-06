-- Migração 95: o laboratório passa a LER a previsão de fórmulas do dia (Controle de Produção). Já aplicada. Só leitura.
create policy laboratorio_le_previsao on public.formulas_dia_seguinte for select to authenticated using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'laboratorio'));
