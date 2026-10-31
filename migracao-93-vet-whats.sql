-- Migração 93: envio automático (To Talk) para quem preenche o formulário Bioflora Vet. Já aplicada.
alter table public.vet_contatos add column if not exists whats_status text not null default 'pendente' check (whats_status in ('pendente','enviando','enviado','erro','ignorado')), add column if not exists whats_enviado_em timestamptz, add column if not exists whats_erro text;
create table if not exists public.vet_config (
  id int primary key default 1 check (id = 1),
  whats_modo text not null default 'off' check (whats_modo in ('off','teste','on')),
  whats_teste_numero text, canal_id text, template_id text, template_nome text,
  chave text not null default encode(gen_random_bytes(24),'hex'),
  atualizado_em timestamptz not null default now()
);
insert into public.vet_config (id) values (1) on conflict do nothing;
alter table public.vet_config enable row level security;
create policy vet_config_chefia on public.vet_config for all to authenticated using (public.is_chefia()) with check (public.is_chefia());
revoke all on public.vet_config from anon;
-- pg_cron chama a função vet-whats a cada minuto (a função respeita whats_modo: off/teste/on)
select cron.schedule('vet-whats-envio', '* * * * *', $$select net.http_get(url := 'https://gbbjpltqmbhlfluqhrmg.supabase.co/functions/v1/vet-whats?k=' || (select chave from public.vet_config where id = 1))$$);
