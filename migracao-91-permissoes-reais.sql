-- Migração 91: as permissões de Cargos & Permissões passam a valer de verdade. Já aplicada.
-- Ponto: ver (rh.ponto.ver_dashboard) e enviar/alterar (rh.ponto.enviar_planilha) em vez de "papel = rh".
drop policy if exists chefia_rh_folhas on public.folhas_ponto;
drop policy if exists chefia_rh_funcionarios on public.funcionarios;
create policy folhas_ver on public.folhas_ponto for select using (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.ver_dashboard') or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
create policy folhas_ins on public.folhas_ponto for insert with check (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
create policy folhas_upd on public.folhas_ponto for update using (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha')) with check (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
create policy folhas_del on public.folhas_ponto for delete using (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
create policy func_ver on public.funcionarios for select using (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.ver_dashboard') or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
create policy func_ins on public.funcionarios for insert with check (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
create policy func_upd on public.funcionarios for update using (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha')) with check (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
create policy func_del on public.funcionarios for delete using (public.is_chefia() or public.tem_permissao(auth.uid(),'rh.ponto.enviar_planilha'));
-- Férias: quem tem rh.ferias.aprovar vê todas as solicitações e aprova/recusa/desfaz.
create policy ferias_aprovador_ver on public.ferias_solicitacoes for select using (public.tem_permissao(auth.uid(),'rh.ferias.aprovar'));
create policy ferias_aprovador_upd on public.ferias_solicitacoes for update using (public.tem_permissao(auth.uid(),'rh.ferias.aprovar'));
create policy ferias_aprovador_del on public.ferias_solicitacoes for delete using (public.tem_permissao(auth.uid(),'rh.ferias.aprovar'));
-- Salário: quem tem rh.colaboradores.ver_salario só lê; alterar continua só da chefia.
create policy salario_ver_com_permissao on public.colaboradores_salarios for select using (public.tem_permissao(auth.uid(),'rh.colaboradores.ver_salario'));
-- Para o acesso por página (auth-guard.js) não tirar ninguém que já usava: permissões que faltavam.
insert into public.permissoes (chave, modulo, nome) values ('modulo.email_marketing','Email Marketing','Acessar o módulo') on conflict (chave) do nothing;
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, pm.id from public.papeis p, public.permissoes pm where (p.chave,pm.chave) in (('chefia','modulo.email_marketing'),('gestao','modulo.email_marketing'),('gestao','modulo.formulas_complexas'),('laboratorio','modulo.wanessia'),('gestao','modulo.vendas')) on conflict do nothing;
