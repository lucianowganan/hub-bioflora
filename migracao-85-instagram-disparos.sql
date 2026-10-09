-- Migração 85: controle dos disparos automáticos do Instagram (fase 1).
-- Idempotente. RLS ligado e sem policies: só o servidor (Edge Function) acessa.

-- Um disparo por pessoa por post (regra do motor) e proteção contra evento repetido.
create table if not exists public.ig_disparos (
  id bigint generated always as identity primary key,
  ig_user_id text not null,
  post_id text not null,
  contato_ig_id text not null,
  comment_id text not null,
  estado text not null default 'iniciado',
  criado_em timestamptz not null default now(),
  unique (ig_user_id, post_id, contato_ig_id)
);

-- Registro de cada chamada de envio à Meta, para sabermos o que a API aceita de verdade.
create table if not exists public.ig_envios (
  id bigint generated always as identity primary key,
  ig_user_id text,
  contato_ig_id text,
  tipo text not null,
  variante text,
  http_status int,
  ok boolean not null default false,
  resposta jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists ig_envios_criado_idx on public.ig_envios (criado_em desc);

alter table public.ig_disparos enable row level security;
alter table public.ig_envios enable row level security;
