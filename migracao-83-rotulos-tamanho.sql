-- Migração 83: Controle de Rótulos — campo "tamanho" (texto livre, ex.: "5x3 cm", "100ml").
-- Já aplicada no Supabase. Idempotente e não destrutiva. A coluna antiga `quantidade` continua existindo
-- (rótulos antigos seguem mostrando "Qtd").
alter table public.rotulos_kanban add column if not exists tamanho text;
