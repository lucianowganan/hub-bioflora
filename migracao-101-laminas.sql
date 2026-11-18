-- Migração 101: módulo Lâminas (só chefia) — já aplicada no banco.
create table if not exists public.laminas (
  id text primary key, nome text not null, dados jsonb not null,
  status text not null default 'rascunho' check (status in ('rascunho','em_revisao','aprovada')),
  criado_por uuid default auth.uid(), atualizado_por uuid, aprovado_por uuid, aprovado_em timestamptz,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now());
create table if not exists public.laminas_arquivos (
  id uuid primary key default gen_random_uuid(), nome text not null, caminho text not null,
  criado_por uuid default auth.uid(), criado_em timestamptz not null default now());
alter table public.laminas enable row level security;
alter table public.laminas_arquivos enable row level security;
create policy laminas_chefia on public.laminas for all to authenticated using (public.is_chefia()) with check (public.is_chefia());
create policy laminas_arquivos_chefia on public.laminas_arquivos for all to authenticated using (public.is_chefia()) with check (public.is_chefia());
-- bucket público 'laminas' (imagens das lâminas); só a chefia grava
insert into storage.buckets (id, name, public) values ('laminas','laminas',true) on conflict (id) do nothing;
create policy laminas_img_ins on storage.objects for insert to authenticated with check (bucket_id='laminas' and public.is_chefia());
create policy laminas_img_upd on storage.objects for update to authenticated using (bucket_id='laminas' and public.is_chefia());
create policy laminas_img_del on storage.objects for delete to authenticated using (bucket_id='laminas' and public.is_chefia());
insert into public.permissoes (chave, modulo, nome) values ('modulo.laminas','Lâminas','Acessar o módulo') on conflict (chave) do nothing;
insert into public.papel_permissoes (papel_id, permissao_id) select p.id, pm.id from public.papeis p, public.permissoes pm where p.chave='chefia' and pm.chave='modulo.laminas' on conflict do nothing;
