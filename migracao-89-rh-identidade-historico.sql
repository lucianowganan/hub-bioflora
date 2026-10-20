-- Migração 89: identidade única dos colaboradores + histórico + pagamentos (chefia apenas).
-- Já aplicada. As funções do histórico e dos vínculos só devolvem dados para a chefia.

-- 1) Chave de comparação de nomes: sem acento, minúsculo, sem pontuação, espaços colapsados.
create or replace function public.norm_nome(t text) returns text language sql immutable as $f$
  select trim(regexp_replace(lower(translate(coalesce(t,''),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]+', ' ', 'g'))
$f$;

-- 2) Apelidos: qualquer nome usado nos módulos que aponta para UM colaborador.
create table if not exists public.colaborador_apelidos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  apelido text not null,
  apelido_norm text not null unique,
  origem text not null default 'manual',
  criado_por uuid,
  criado_em timestamptz not null default now()
);
alter table public.colaborador_apelidos enable row level security;
create policy chefia_apelidos on public.colaborador_apelidos for all using (public.is_chefia()) with check (public.is_chefia());

-- O nome completo de cada colaborador é sempre um apelido (cadastro novo ou nome alterado).
create or replace function public.colab_apelido_trg() returns trigger language plpgsql security definer set search_path = public as $f$
begin
  insert into public.colaborador_apelidos (colaborador_id, apelido, apelido_norm, origem)
  values (new.id, new.nome_completo, public.norm_nome(new.nome_completo), 'cadastro')
  on conflict (apelido_norm) do nothing;
  return new;
end $f$;
create trigger colab_apelido_ins_upd after insert or update of nome_completo on public.colaboradores
for each row execute function public.colab_apelido_trg();

insert into public.colaborador_apelidos (colaborador_id, apelido, apelido_norm, origem)
select id, nome_completo, public.norm_nome(nome_completo), 'cadastro' from public.colaboradores
where public.norm_nome(nome_completo) <> ''
on conflict (apelido_norm) do nothing;

-- 3) Lista para a busca ao digitar nos módulos: só id, nome e apelidos (nada do cadastro do RH).
create or replace function public.lista_nomes_colaboradores()
returns table (id uuid, nome text, apelidos text[]) language sql stable security definer set search_path = public as $f$
  select c.id, c.nome_completo,
         coalesce((select array_agg(a.apelido order by a.apelido) from public.colaborador_apelidos a where a.colaborador_id = c.id and a.apelido_norm <> public.norm_nome(c.nome_completo)), '{}')
  from public.colaboradores c
  where c.status <> 'desligado'
    and exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel <> 'sem_papel')
  order by c.nome_completo
$f$;

-- 4) Pagamentos e histórico de salário: SOMENTE chefia (nem o RH lê).
create table if not exists public.colaborador_pagamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo text not null check (tipo in ('salario','reajuste','vale','adiantamento','comissao','bonus','ferias','decimo_terceiro','rescisao','outro')),
  data date not null,
  competencia text,
  valor numeric not null,
  descricao text,
  criado_por uuid,
  criado_em timestamptz not null default now()
);
alter table public.colaborador_pagamentos enable row level security;
create policy so_chefia_pagamentos on public.colaborador_pagamentos for all using (public.is_chefia()) with check (public.is_chefia());
revoke all on public.colaborador_pagamentos from anon;
create index if not exists colab_pagamentos_idx on public.colaborador_pagamentos (colaborador_id, data desc);

create table if not exists public.colaboradores_salarios_historico (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  salario_anterior numeric,
  salario_novo numeric,
  alterado_por uuid,
  alterado_em timestamptz not null default now()
);
alter table public.colaboradores_salarios_historico enable row level security;
create policy so_chefia_hist_salario on public.colaboradores_salarios_historico for all using (public.is_chefia()) with check (public.is_chefia());
revoke all on public.colaboradores_salarios_historico from anon;

-- (A função log_salario_trg() e o trigger log_salario_ins_upd registram cada mudança de salário; ver banco.)

create or replace function public.fmt_brl(v numeric) returns text language sql immutable as $f$
  select 'R$ ' || replace(replace(replace(to_char(v, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.')
$f$;

-- 5) Funções da chefia: rh_logins, rh_vincular_login, rh_nomes_soltos, rh_vincular_nome, rh_historico.
-- Todas começam com "if not public.is_chefia() then return/raise". Definições completas estão no banco
-- (pg_get_functiondef) e foram aplicadas junto com esta migração.
