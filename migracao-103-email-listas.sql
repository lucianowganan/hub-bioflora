-- Migração 103: Email Marketing com duas listas (Cadastros e Blog) — já aplicada no banco.
create table if not exists public.email_campanhas (
  id uuid primary key default gen_random_uuid(), assunto text not null, corpo_html text not null,
  lista text not null default 'cadastros' check (lista in ('cadastros','blog')),
  status text not null default 'rascunho' check (status in ('rascunho','enviando','enviado','erro')),
  total_destinatarios int not null default 0, total_sucesso int not null default 0, total_falha int not null default 0,
  erro text, enviado_em timestamptz, criado_por uuid default auth.uid(), criado_em timestamptz not null default now());
create table if not exists public.email_campanha_envios (
  id bigserial primary key, campanha_id uuid not null references public.email_campanhas(id) on delete cascade,
  email text not null, nome text, status text not null, erro text, enviado_em timestamptz, criado_em timestamptz not null default now());
alter table public.email_campanhas enable row level security;
alter table public.email_campanha_envios enable row level security;
create policy email_campanhas_equipe on public.email_campanhas for all to authenticated using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel in ('chefia','gestao'))) with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel in ('chefia','gestao')));
create policy email_envios_equipe on public.email_campanha_envios for all to authenticated using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel in ('chefia','gestao'))) with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel in ('chefia','gestao')));
-- blog_newsletter: leitura/edição só chefia e gestão (antes qualquer usuário logado lia os e-mails). A inscrição do blog continua pela função blog_newsletter_inscrever.
drop policy if exists blog_newsletter_auth_read on public.blog_newsletter;
drop policy if exists blog_newsletter_auth_update on public.blog_newsletter;
create policy blog_newsletter_equipe_ler on public.blog_newsletter for select to authenticated using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel in ('chefia','gestao')));
create policy blog_newsletter_equipe_atualizar on public.blog_newsletter for update to authenticated using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel in ('chefia','gestao'))) with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel in ('chefia','gestao')));
