-- Migração 87: permissão do módulo Instagram (builder de fluxos). Idempotente.
-- Já aplicada. A chefia recebe o acesso; outros cargos podem ganhar em Cargos & Permissões.
insert into public.permissoes (chave, modulo, nome) values ('modulo.instagram', 'Instagram', 'Acessar o módulo')
on conflict (chave) do nothing;

insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, pm.id from public.papeis p, public.permissoes pm
where p.chave = 'chefia' and pm.chave = 'modulo.instagram'
on conflict do nothing;
