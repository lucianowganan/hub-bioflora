-- Migração 92: contatos do evento veterinário (formulário público Bioflora Vet). Já aplicada.
-- O público (anon) só consegue INSERIR (com consentimento); ler/editar/excluir é só da chefia (ou quem tiver modulo.vet).
create table if not exists public.vet_contatos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  evento text not null default 'Evento veterinário' check (length(evento) <= 120),
  tipo_contato text not null default 'tutor' check (tipo_contato in ('tutor','veterinario','outro')),
  nome text not null check (length(nome) between 2 and 120),
  whatsapp text not null check (length(whatsapp) between 10 and 14),
  email text check (length(email) <= 160),
  cidade text check (length(cidade) <= 80),
  clinica text check (length(clinica) <= 120),
  crmv text check (length(crmv) <= 30),
  pet_nome text check (length(pet_nome) <= 60),
  pet_especie text check (pet_especie in ('cao','gato','outro')),
  pet_raca text check (length(pet_raca) <= 60),
  pet_idade text check (length(pet_idade) <= 40),
  pet_porte text check (pet_porte in ('pequeno','medio','grande')),
  interesses text[] not null default '{}',
  usa_manipulado text check (usa_manipulado in ('sim','nao','nao_sei')),
  observacao text check (length(observacao) <= 500),
  consentimento boolean not null check (consentimento),
  amostra_entregue boolean not null default false,
  brinde_resgatado boolean not null default false,
  anotacao_interna text
);
create index if not exists vet_contatos_whats_idx on public.vet_contatos (whatsapp);
alter table public.vet_contatos enable row level security;
create policy vet_cadastro_publico on public.vet_contatos for insert to anon, authenticated with check (consentimento = true);
create policy vet_equipe on public.vet_contatos for all to authenticated using (public.is_chefia() or public.tem_permissao(auth.uid(),'modulo.vet')) with check (public.is_chefia() or public.tem_permissao(auth.uid(),'modulo.vet'));
revoke all on public.vet_contatos from anon;
grant insert on public.vet_contatos to anon;
insert into public.permissoes (chave, modulo, nome) values ('modulo.vet','Contatos Veterinários','Acessar o módulo') on conflict (chave) do nothing;
insert into public.papel_permissoes (papel_id, permissao_id) select p.id, pm.id from public.papeis p, public.permissoes pm where p.chave='chefia' and pm.chave='modulo.vet' on conflict do nothing;
