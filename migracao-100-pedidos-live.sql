-- Migração 100: Pedidos da Live (já aplicada no banco). Anotação rápida de @ do Instagram + pedido durante lives.
create table if not exists public.pedidos_live (
  id uuid primary key default gen_random_uuid(), criado_em timestamptz not null default now(),
  live text not null default 'Live Black November', instagram text not null,
  itens jsonb not null default '[]'::jsonb, observacao text,
  status text not null default 'novo' check (status in ('novo','contatado','pago','entregue','cancelado')),
  criado_por uuid default auth.uid(), atualizado_em timestamptz default now());
alter table public.pedidos_live enable row level security;
create policy pedidos_live_equipe on public.pedidos_live for all to authenticated
  using (public.is_chefia() or public.tem_permissao(auth.uid(),'modulo.pedidos_live'))
  with check (public.is_chefia() or public.tem_permissao(auth.uid(),'modulo.pedidos_live'));
insert into public.permissoes (chave, modulo, nome) values ('modulo.pedidos_live','Pedidos da Live','Acessar o módulo') on conflict (chave) do nothing;
insert into public.papel_permissoes (papel_id, permissao_id) select p.id, pm.id from public.papeis p, public.permissoes pm where p.chave in ('chefia','recepcao','atendente') and pm.chave='modulo.pedidos_live' on conflict do nothing;
