-- Migração 86: fluxos, contatos e execuções da automação de Instagram.
-- Idempotente. Escrita só pelo servidor (service role); leitura (e edição de fluxos) pela chefia.

-- Nome da variável de ambiente que guarda o token da conta (o token em si nunca fica no banco nem no chat).
alter table public.ig_contas add column if not exists token_env text;

create table if not exists public.ig_fluxos (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.ig_contas(id) on delete cascade,
  nome text not null,
  ativo boolean not null default false,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ig_fluxos_conta_idx on public.ig_fluxos (conta_id, ativo);

create table if not exists public.ig_contatos (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.ig_contas(id) on delete cascade,
  ig_id text not null,
  username text,
  nome text,
  tags text[] not null default '{}',
  campos jsonb not null default '{}'::jsonb,
  janela_expira timestamptz,
  ultima_msg_em timestamptz,
  opt_out boolean not null default false,
  humano boolean not null default false,
  pausado_ate timestamptz,
  disparos jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (conta_id, ig_id)
);

create table if not exists public.ig_execucoes (
  id uuid primary key,
  conta_id uuid not null references public.ig_contas(id) on delete cascade,
  contato_id uuid not null references public.ig_contatos(id) on delete cascade,
  fluxo_id uuid not null references public.ig_fluxos(id) on delete cascade,
  status text not null default 'rodando',
  no_id text,
  espera jsonb,
  ultimo_texto text,
  ultimo_botao text,
  credito jsonb,
  comment_id text,
  post_id text,
  profundidade int not null default 0,
  visitados text[] not null default '{}',
  iniciado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ig_execucoes_contato_idx on public.ig_execucoes (contato_id, status);
create index if not exists ig_execucoes_abertas_idx on public.ig_execucoes (status) where status in ('rodando','aguardando');

alter table public.ig_fluxos enable row level security;
alter table public.ig_contatos enable row level security;
alter table public.ig_execucoes enable row level security;

-- Chefia: edita fluxos e lê o resto. O servidor usa a service role e ignora as policies.
drop policy if exists chefia_fluxos on public.ig_fluxos;
create policy chefia_fluxos on public.ig_fluxos for all using (is_chefia()) with check (is_chefia());

drop policy if exists chefia_le_contas on public.ig_contas;
create policy chefia_le_contas on public.ig_contas for select using (is_chefia());
drop policy if exists chefia_le_contatos on public.ig_contatos;
create policy chefia_le_contatos on public.ig_contatos for select using (is_chefia());
drop policy if exists chefia_le_execucoes on public.ig_execucoes;
create policy chefia_le_execucoes on public.ig_execucoes for select using (is_chefia());
drop policy if exists chefia_le_eventos on public.ig_eventos;
create policy chefia_le_eventos on public.ig_eventos for select using (is_chefia());
drop policy if exists chefia_le_envios on public.ig_envios;
create policy chefia_le_envios on public.ig_envios for select using (is_chefia());
drop policy if exists chefia_le_disparos on public.ig_disparos;
create policy chefia_le_disparos on public.ig_disparos for select using (is_chefia());

-- Configuração interna do servidor (ex.: segredo do relógio). Sem policies: só a service role lê.
create table if not exists public.ig_config (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.ig_config enable row level security;
insert into public.ig_config (chave, valor)
values ('worker_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (chave) do nothing;

-- Dados de partida (já aplicados): conta de teste da LN e o fluxo "comentário 🔥 → material".
-- Conta: ig_user_id 17841432304278909, token_env IG_TOKEN_LN. Fluxo ativo só para o post 18122364154932417.
