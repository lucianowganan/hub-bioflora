// Envio automático (To Talk / flw.chat) da mensagem de boas-vindas para quem preenche o formulário Bioflora Vet.
// Chamada pelo pg_cron a cada minuto com ?k=<chave> (verify_jwt desligado: a chave fica em vet_config.chave).
// Modos (vet_config.whats_modo): off = não envia nada; teste = só para o número de vet_config.whats_teste_numero; on = para todos.
// Segurança contra duplicidade: a linha é "reivindicada" (pendente -> enviando) em uma única atualização antes de chamar a API.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TOKEN = Deno.env.get('TOTALK_TOKEN') ?? '';
const API = 'https://api.app.totalk.chat/chat';
const REST = `${SUPABASE_URL}/rest/v1`;
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const JANELA_HORAS = 72; // não manda para cadastros mais antigos que isso

async function db(metodo: string, caminho: string, corpo?: unknown, prefer?: string): Promise<any> {
  const r = await fetch(`${REST}/${caminho}`, { method: metodo, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  if (!r.ok) { console.log('vet-whats: erro de banco', metodo, caminho.split('?')[0], r.status, await r.text()); return null; }
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}

function primeiroNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const titulos = new Set(['dr', 'dra', 'dr.', 'dra.', 'sr', 'sra', 'sr.', 'sra.']);
  const p = partes.find((x) => !titulos.has(x.toLowerCase())) ?? partes[0] ?? '';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

async function enviarModelo(canal: string, templateId: string, numero: string, nome: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const r = await fetch(`${API}/v1/send/template`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: `+55${numero}`, from: canal, templateId, parameters: { primeiro_nome: primeiroNome(nome) } }),
    });
    if (r.ok) return { ok: true };
    return { ok: false, erro: `${r.status} ${(await r.text()).slice(0, 300)}` };
  } catch (e) { return { ok: false, erro: String(e).slice(0, 300) }; }
}

Deno.serve(async (req) => {
  const k = new URL(req.url).searchParams.get('k') ?? '';
  const cfgs = await db('GET', 'vet_config?id=eq.1&select=*');
  const cfg = cfgs?.[0];
  if (!cfg || !k || k !== cfg.chave) return new Response('negado', { status: 401 });
  if (cfg.whats_modo === 'off') return Response.json({ modo: 'off', enviados: 0 });
  if (!TOKEN || !cfg.canal_id || !cfg.template_id) return Response.json({ erro: 'Falta TOTALK_TOKEN, canal_id ou template_id.' }, { status: 200 });

  const desde = new Date(Date.now() - JANELA_HORAS * 3600_000).toISOString();
  let filtro = `whats_status=eq.pendente&criado_em=gte.${desde}`;
  if (cfg.whats_modo === 'teste') {
    const so = String(cfg.whats_teste_numero ?? '').replace(/\D/g, '').slice(-8);
    if (so.length < 8) return Response.json({ erro: 'Modo teste sem número de teste.' });
    filtro += `&whatsapp=like.*${so}`;
  }
  // reivindica (atualização única = ninguém recebe duas vezes, mesmo com duas execuções ao mesmo tempo)
  const lote = await db('PATCH', `vet_contatos?${filtro}&order=criado_em.asc&limit=20`, { whats_status: 'enviando' }, 'return=representation');
  let enviados = 0, erros = 0;
  for (const c of lote ?? []) {
    const r = await enviarModelo(cfg.canal_id, cfg.template_id, c.whatsapp, c.nome);
    await db('PATCH', `vet_contatos?id=eq.${c.id}`, r.ok
      ? { whats_status: 'enviado', whats_enviado_em: new Date().toISOString(), whats_erro: null }
      : { whats_status: 'erro', whats_erro: r.erro });
    r.ok ? enviados++ : erros++;
  }
  return Response.json({ modo: cfg.whats_modo, enviados, erros });
});
