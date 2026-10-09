-- Migração 84: base da automação de Instagram (fase 1: receber e guardar os eventos da Meta).
-- Idempotente. Sem policies de propósito: só o servidor (Edge Function, service role) lê e grava.
-- As telas do Hub ganham policies quando forem criadas.

create table if not exists public.ig_contas (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  ig_user_id text unique,
  username text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Token separado da conta: nada que o navegador consiga ler.
create table if not exists public.ig_tokens (
  conta_id uuid primary key references public.ig_contas(id) on delete cascade,
  access_token text not null,
  expira_em timestamptz,
  atualizado_em timestamptz not null default now()
);

-- Registro bruto de tudo que a Meta envia, para conhecermos os formatos reais antes de automatizar.
create table if not exists public.ig_eventos (
  id bigint generated always as identity primary key,
  ig_user_id text,
  campo text,
  payload jsonb not null,
  assinatura_ok boolean not null default false,
  processado boolean not null default false,
  recebido_em timestamptz not null default now()
);

create index if not exists ig_eventos_recebido_idx on public.ig_eventos (recebido_em desc);

alter table public.ig_contas enable row level security;
alter table public.ig_tokens enable row level security;
alter table public.ig_eventos enable row level security;
