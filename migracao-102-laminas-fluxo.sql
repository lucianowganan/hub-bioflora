-- Migração 102: fluxo de criação das lâminas (solicitada > em desenvolvimento > para aprovação > aprovada) — já aplicada no banco.
alter table public.laminas drop constraint if exists laminas_status_check;
update public.laminas set status = case status when 'rascunho' then 'em_desenvolvimento' when 'em_revisao' then 'para_aprovacao' else status end;
alter table public.laminas alter column status set default 'em_desenvolvimento';
alter table public.laminas add constraint laminas_status_check check (status in ('solicitada','em_desenvolvimento','para_aprovacao','aprovada'));
alter table public.laminas add column if not exists descricao text, add column if not exists prazo date, add column if not exists responsavel_nome text,
  add column if not exists motivo_status text, add column if not exists editado_apos_em timestamptz, add column if not exists editado_apos_por text, add column if not exists aprovado_nome text;
-- quem pode aprovar (só leitura pelo app; gerenciar por SQL). Hoje: Wanessa.
create table if not exists public.laminas_aprovadores (user_id uuid primary key references auth.users(id) on delete cascade, nome text);
alter table public.laminas_aprovadores enable row level security;
create policy laminas_aprovadores_ler on public.laminas_aprovadores for select to authenticated using (public.is_chefia());
insert into public.laminas_aprovadores (user_id, nome) values ('8ad1f345-a88f-42bb-923d-3d4aeb7f04e5','Wanessa Vieira Werner') on conflict do nothing;
-- histórico: quem criou, mudou status, aprovou, editou (uma linha por pessoa a cada 15 min) e excluiu
create table if not exists public.laminas_historico (id bigserial primary key, lamina_id text not null, lamina_nome text, usuario_id uuid, usuario_nome text, acao text not null, detalhe text, criado_em timestamptz not null default now());
create index if not exists laminas_historico_lamina on public.laminas_historico (lamina_id, criado_em desc);
alter table public.laminas_historico enable row level security;
create policy laminas_historico_ler on public.laminas_historico for select to authenticated using (public.is_chefia());
-- Funções-gatilho (definições completas no banco): laminas_antes() bloqueia aprovação por quem não está em laminas_aprovadores,
-- carimba aprovado_por/em e "editada após aprovação"; laminas_depois() grava o histórico. Triggers laminas_t_antes / laminas_t_depois.
