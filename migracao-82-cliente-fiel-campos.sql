-- Migração 82: Cliente Fiel — campos de CRM e aniversário
-- Já aplicada no Supabase (nome: cliente_fiel_campos_crm). Idempotente e não destrutiva.
--  * gênero, tipo de cadastro e segmentação (recência / frequência / volume) vindos do sistema da farmácia
--  * aniversário em dia + mês (permite listar aniversariantes mesmo sem o ano de nascimento)
--  * código Fórmula Certa único (permite reimportar a planilha atualizando em vez de duplicar)

alter table public.clientes_fidelidade add column if not exists genero text;
alter table public.clientes_fidelidade add column if not exists tipo_cadastro text;
alter table public.clientes_fidelidade add column if not exists seg_recencia text;
alter table public.clientes_fidelidade add column if not exists seg_frequencia text;
alter table public.clientes_fidelidade add column if not exists seg_volume text;
alter table public.clientes_fidelidade add column if not exists aniversario_dia smallint;
alter table public.clientes_fidelidade add column if not exists aniversario_mes smallint;

-- índice único COMPLETO (o Postgres aceita vários NULL), necessário para o upsert por código.
-- (Existe também um índice parcial antigo, clientes_fidelidade_codigo_fc_uniq, redundante e inofensivo.)
create unique index if not exists clientes_fidelidade_codigo_fc_unico on public.clientes_fidelidade (codigo_formula_certa);
create index if not exists clientes_fidelidade_aniversario_idx on public.clientes_fidelidade (aniversario_mes, aniversario_dia);

update public.clientes_fidelidade
   set aniversario_dia = extract(day from data_nascimento)::smallint,
       aniversario_mes = extract(month from data_nascimento)::smallint
 where data_nascimento is not null and aniversario_dia is null;
