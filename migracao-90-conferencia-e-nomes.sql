-- Migração 90: módulo Conferência de Fórmulas + nome (não e-mail) em perfis. Já aplicada.
create table if not exists public.conferencia_formulas (
  id uuid primary key default gen_random_uuid(),
  requisicao text not null unique check (requisicao ~ '^[0-9]{6}-[0-9]$'),
  laboratorio text not null check (laboratorio in ('capsulas','dermato')),
  usuario_id uuid references auth.users(id) on delete set null default auth.uid(),
  usuario_nome text not null default 'não identificado',
  conferida_em timestamptz not null default now(),
  dia date not null default ((now() at time zone 'America/Sao_Paulo')::date)
);
create index if not exists conf_formulas_dia_idx on public.conferencia_formulas (dia, laboratorio);
alter table public.conferencia_formulas enable row level security;
create policy conf_formulas_acesso on public.conferencia_formulas for all
  using (public.is_chefia() or public.tem_permissao(auth.uid(), 'modulo.conferencia'))
  with check (public.is_chefia() or public.tem_permissao(auth.uid(), 'modulo.conferencia'));
revoke all on public.conferencia_formulas from anon;
create table if not exists public.conferencia_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  lab text not null default 'capsulas' check (lab in ('capsulas','dermato')),
  vol int not null default 60 check (vol between 0 and 100),
  atualizado_em timestamptz not null default now()
);
alter table public.conferencia_prefs enable row level security;
create policy conf_prefs_proprio on public.conferencia_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.conferencia_prefs from anon;
insert into public.permissoes (chave, modulo, nome) values ('modulo.conferencia', 'Conferência de Fórmulas', 'Acessar o módulo') on conflict (chave) do nothing;
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, pm.id from public.papeis p, public.permissoes pm where p.chave in ('chefia','conferencia') and pm.chave = 'modulo.conferencia' on conflict do nothing;

-- Nome de exibição: login vinculado a colaborador usa o nome do cadastro; sem vínculo, nunca fica e-mail (usa a parte antes do @).
create or replace function public.perfil_nome_trg() returns trigger language plpgsql security definer set search_path = public as $f$
declare v text;
begin
  if new.colaborador_vinculado is not null then
    select nome_completo into v from public.colaboradores where id = new.colaborador_vinculado;
    if v is not null and v <> '' then new.nome_exibicao := v; end if;
  end if;
  if new.nome_exibicao is null or new.nome_exibicao = '' or position('@' in new.nome_exibicao) > 0 then
    new.nome_exibicao := initcap(replace(replace(split_part(coalesce(nullif(new.nome_exibicao,''), 'Usuário'), '@', 1), '.', ' '), '_', ' '));
  end if;
  return new;
end $f$;
create trigger perfil_nome_ins_upd before insert or update of nome_exibicao, colaborador_vinculado on public.perfis
for each row execute function public.perfil_nome_trg();
create or replace function public.colab_nome_para_perfil_trg() returns trigger language plpgsql security definer set search_path = public as $f$
begin
  update public.perfis set nome_exibicao = new.nome_completo where colaborador_vinculado = new.id and nome_exibicao is distinct from new.nome_completo;
  return new;
end $f$;
create trigger colab_nome_perfil_upd after update of nome_completo on public.colaboradores
for each row execute function public.colab_nome_para_perfil_trg();
update public.perfis set nome_exibicao = nome_exibicao;
