-- Migração 99: Cliente Fiel — foto de perfil, banners de promoção e dados mascarados do perfil (já aplicada no banco)
alter table public.clientes_fidelidade add column if not exists foto_app text;
create table if not exists public.fiel_banners (
  id uuid primary key default gen_random_uuid(), titulo text not null, texto text, imagem_url text, link_url text, botao text,
  cor text default 'vinho', ordem int default 0, ativo boolean default true, inicio date, fim date, criado_em timestamptz default now());
alter table public.fiel_banners enable row level security;
create policy atendimento_fiel_banners on public.fiel_banners for all
  using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel in ('chefia','recepcao','conferencia','atendente')))
  with check (exists (select 1 from perfis p where p.id = auth.uid() and p.papel in ('chefia','recepcao','conferencia','atendente')));
-- bucket público 'fiel' (imagens dos banners); só a equipe grava
insert into storage.buckets (id, name, public) values ('fiel','fiel',true) on conflict (id) do nothing;
create policy fiel_arquivos_equipe_ins on storage.objects for insert with check (bucket_id='fiel' and exists (select 1 from perfis p where p.id=auth.uid() and p.papel in ('chefia','recepcao','conferencia','atendente')));
create policy fiel_arquivos_equipe_upd on storage.objects for update using (bucket_id='fiel' and exists (select 1 from perfis p where p.id=auth.uid() and p.papel in ('chefia','recepcao','conferencia','atendente')));
create policy fiel_arquivos_equipe_del on storage.objects for delete using (bucket_id='fiel' and exists (select 1 from perfis p where p.id=auth.uid() and p.papel in ('chefia','recepcao','conferencia','atendente')));
-- Funções fiel_extras(p_token) e fiel_foto_salvar(p_token, p_foto): SECURITY DEFINER, token-based.
--  fiel_extras devolve foto, perfil MASCARADO (cpf ***.***.***-NN, telefone, e-mail) e banners ativos no período.
--  fiel_foto_salvar aceita só data:image/jpeg;base64 até 90 KB (ou null para remover).
-- (definição completa: consultar no banco com pg_get_functiondef)
