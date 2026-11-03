-- Migração 94: comparação "seus erros vs. restante da equipe" (Meus Erros). Já aplicada.
-- Devolve, por dia (fuso de São Paulo, dias sem erro incluídos), o total de erros do restante da equipe
-- (atendentes do grupo "principal", sem a pessoa em "excluir") e quantas pessoas formam essa equipe.
create or replace function public.erros_equipe_comparacao(dias_atras integer default 30, excluir text default null)
returns table(dia date, total bigint, pessoas integer)
language sql stable security definer set search_path = public as $f$
  with equipe as (
    select nome from public.atendentes_erros
    where grupo = 'principal' and (excluir is null or public.norm_nome(nome) <> public.norm_nome(excluir))
  ), dias as (
    select d::date as dia from generate_series(((now() at time zone 'America/Sao_Paulo')::date - (greatest(dias_atras,1) - 1)), (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') d
  ), cont as (
    select (e.registrado_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as n
    from public.erros_registrados e
    where e.registrado_em >= now() - ((greatest(dias_atras,1) + 1) || ' days')::interval
      and public.norm_nome(e.atendente) in (select public.norm_nome(nome) from equipe)
    group by 1
  )
  select d.dia, coalesce(c.n, 0)::bigint, (select count(*) from equipe)::integer
  from dias d left join cont c on c.dia = d.dia
  where auth.uid() is not null
  order by d.dia
$f$;
