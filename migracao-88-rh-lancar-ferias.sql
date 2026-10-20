-- Migração 88: "lançar férias" (chefia + liderança) no módulo de RH.
-- Já aplicada. Idempotente exceto os `create policy` (rodar uma vez).

-- 1) Permissão nova, controlada em Cargos & Permissões. Chefia e Liderança recebem.
insert into public.permissoes (chave, modulo, nome)
values ('rh.ferias.lancar', 'RH', 'Férias: lançar férias já definidas (entram aprovadas)')
on conflict (chave) do nothing;

insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, pm.id from public.papeis p, public.permissoes pm
where p.chave in ('chefia', 'lideranca') and pm.chave = 'rh.ferias.lancar'
on conflict do nothing;

-- A Liderança precisa enxergar o módulo de RH no menu.
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, pm.id from public.papeis p, public.permissoes pm
where p.chave = 'lideranca' and pm.chave = 'modulo.rh'
on conflict do nothing;

-- 2) Correção de segurança: quem cria a PRÓPRIA solicitação só pode criá-la como pendente.
--    Antes a regra não conferia o status e qualquer pessoa logada podia se gravar como "aprovada".
alter policy usuario_cria_propria_solicitacao on public.ferias_solicitacoes
with check (
  solicitante_id = auth.uid()
  and status = 'pendente' and aprovado_por is null and aprovado_em is null
  and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel <> 'sem_papel')
);

-- 3) Quem tem a permissão pode lançar férias já aprovadas (a linha fica no nome de quem lançou,
--    como já era no "preencher em nome de outro"; o nome do colaborador vai em solicitante_nome).
create policy lanca_ferias_com_permissao on public.ferias_solicitacoes
for insert with check (
  solicitante_id = auth.uid() and tipo = 'ferias' and status = 'aprovada' and aprovado_por = auth.uid()
  and public.tem_permissao(auth.uid(), 'rh.ferias.lancar')
);

-- 4) Quem lançou pode desfazer o próprio lançamento (corrigir um erro de digitação).
create policy exclui_proprio_lancamento on public.ferias_solicitacoes
for delete using (
  solicitante_id = auth.uid() and aprovado_por = auth.uid() and status = 'aprovada'
  and public.tem_permissao(auth.uid(), 'rh.ferias.lancar')
);
