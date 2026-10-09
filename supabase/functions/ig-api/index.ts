// ig-api: consultas à API do Instagram feitas pelo Hub (builder de fluxos).
// O token da conta fica só no servidor. Só a chefia logada pode chamar.
//   POST { acao: 'posts' | 'stories', conta_id, depois? }  ->  { itens: [...], proximo }
// (cópia da função publicada; o deploy é feito pelo MCP do Supabase, verify_jwt ligado)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAPH = 'https://graph.instagram.com/v26.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function ehChefia(auth: string): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_chefia`, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  if (!r.ok) return false;
  return (await r.json()) === true;
}

async function contaPorId(id: string): Promise<any | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ig_contas?id=eq.${encodeURIComponent(id)}&select=id,marca,username,token_env`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) return null;
  const j = await r.json();
  return j[0] ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'metodo nao permitido' }, 405);

  if (!(await ehChefia(req.headers.get('Authorization') ?? ''))) return json({ erro: 'sem permissao' }, 403);

  let corpo: any;
  try { corpo = await req.json(); } catch { return json({ erro: 'json invalido' }, 400); }
  const { acao, conta_id, depois } = corpo ?? {};
  if (!conta_id || (acao !== 'posts' && acao !== 'stories')) return json({ erro: 'pedido invalido' }, 400);

  const conta = await contaPorId(String(conta_id));
  if (!conta) return json({ erro: 'conta nao encontrada' }, 404);
  const token = conta.token_env ? Deno.env.get(conta.token_env) ?? '' : '';
  if (!token) return json({ erro: `token da conta nao configurado (${conta.token_env ?? 'sem token_env'})` }, 409);

  const campos = 'id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp';
  const rota = acao === 'posts' ? 'media' : 'stories';
  let url = `${GRAPH}/me/${rota}?fields=${campos}&limit=24`;
  if (depois && acao === 'posts') url += `&after=${encodeURIComponent(String(depois))}`;

  let r: Response;
  try { r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); }
  catch (e) { return json({ erro: `falha ao falar com a Meta: ${String(e)}` }, 502); }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) return json({ erro: dados?.error?.message ?? `a Meta recusou (${r.status})`, meta: dados?.error ?? null }, 502);

  const itens = (dados.data ?? []).map((m: any) => ({
    id: String(m.id),
    tipo: m.media_product_type ?? m.media_type ?? '',
    legenda: m.caption ?? '',
    miniatura: m.thumbnail_url ?? m.media_url ?? '',
    link: m.permalink ?? '',
    data: m.timestamp ?? '',
  }));
  return json({ itens, proximo: dados?.paging?.cursors?.after && dados?.paging?.next ? dados.paging.cursors.after : null });
});
