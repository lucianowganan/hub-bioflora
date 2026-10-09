// Receptor + primeira automação do Instagram (fase 1, só conta e post de teste).
// verify_jwt desligado de propósito: a Meta não envia JWT. A segurança é a assinatura HMAC.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFY_TOKEN = Deno.env.get('IG_VERIFY_TOKEN') ?? '';
const SECRETS = [Deno.env.get('IG_APP_SECRET'), Deno.env.get('META_APP_SECRET')].filter((s): s is string => !!s);
const TOKEN = Deno.env.get('IG_TOKEN_LN') ?? '';
const GRAPH = 'https://graph.instagram.com/v26.0';

// Trava de segurança da fase 1: o bot só age nesta conta e neste post.
const TESTE = {
  igUserId: '17841432304278909',
  postId: '18122364154932417',
  gatilho: '🔥',
  link: 'https://farmaciabioflora.blog.br',
};
const RESPOSTAS_PUBLICAS = ['Te mandei no direct! 🔥', 'Olha lá no seu direct 🔥', 'Já te chamei por lá 🔥'];
const TEXTO_DM = 'Oi! Vi seu 🔥 por aqui. Quer que eu te mande o material?';

const enc = new TextEncoder();
const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function assinaturaValida(req: Request, corpo: string): Promise<boolean> {
  const h = req.headers.get('x-hub-signature-256') ?? '';
  if (!h.startsWith('sha256=') || !SECRETS.length) return false;
  const recebida = h.slice(7);
  for (const s of SECRETS) if (iguais(await hmacHex(s, corpo), recebida)) return true;
  return false;
}

const REST = `${SUPABASE_URL}/rest/v1`;
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

async function gravar(tabela: string, linhas: unknown[]): Promise<boolean> {
  const r = await fetch(`${REST}/${tabela}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(linhas) });
  if (!r.ok) console.log(`ig-webhook: falha ao gravar ${tabela}`, r.status, await r.text());
  return r.ok;
}

// Envio à Meta com registro do resultado em ig_envios.
async function chamar(tipo: string, variante: string, contato: string, caminho: string, corpo: unknown): Promise<boolean> {
  let status = 0, resp: unknown = null, ok = false;
  if (!TOKEN) {
    resp = { erro: 'IG_TOKEN_LN nao configurado' };
  } else {
    try {
      const r = await fetch(`${GRAPH}${caminho}`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      status = r.status; ok = r.ok;
      const t = await r.text();
      try { resp = JSON.parse(t); } catch { resp = { texto: t.slice(0, 500) }; }
    } catch (e) { resp = { erro: String(e) }; }
  }
  await gravar('ig_envios', [{ ig_user_id: TESTE.igUserId, contato_ig_id: contato, tipo, variante, http_status: status, ok, resposta: resp }]);
  return ok;
}

async function jaDisparou(contato: string): Promise<{ id: number; estado: string } | null> {
  const r = await fetch(`${REST}/ig_disparos?ig_user_id=eq.${TESTE.igUserId}&post_id=eq.${TESTE.postId}&contato_ig_id=eq.${encodeURIComponent(contato)}&select=id,estado`, { headers: H });
  const j = r.ok ? await r.json() : [];
  return j[0] ?? null;
}

async function tratarComentario(v: any) {
  const contato = String(v?.from?.id ?? '');
  const commentId = String(v?.id ?? '');
  if (!contato || !commentId) return;
  if (contato === TESTE.igUserId) return;                // comentário da própria conta (inclui as nossas respostas)
  if (v?.parent_id) return;                              // resposta a outro comentário
  if (String(v?.media?.id ?? '') !== TESTE.postId) return;
  if (!String(v?.text ?? '').includes(TESTE.gatilho)) return;

  // Um disparo por pessoa por post. O índice único também protege contra o reenvio do mesmo evento.
  const r = await fetch(`${REST}/ig_disparos?on_conflict=ig_user_id,post_id,contato_ig_id`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify([{ ig_user_id: TESTE.igUserId, post_id: TESTE.postId, contato_ig_id: contato, comment_id: commentId }]),
  });
  const novo = r.ok ? await r.json() : [];
  if (!novo.length) { console.log('ig-webhook: disparo ja existente, ignorado'); return; }

  const texto = RESPOSTAS_PUBLICAS[Math.floor(Math.random() * RESPOSTAS_PUBLICAS.length)];
  await chamar('resposta_publica', 'texto', contato, `/${commentId}/replies`, { message: texto });

  // Resposta privada: tentamos do mais rico ao mais simples e registramos o que a Meta aceita.
  const dest = { comment_id: commentId };
  const variantes: [string, unknown][] = [
    ['botao_template', { recipient: dest, message: { attachment: { type: 'template', payload: { template_type: 'button', text: TEXTO_DM, buttons: [{ type: 'postback', title: 'Quero', payload: 'quero' }] } } } }],
    ['quick_reply', { recipient: dest, message: { text: TEXTO_DM, quick_replies: [{ content_type: 'text', title: 'Quero', payload: 'quero' }] } }],
    ['so_texto', { recipient: dest, message: { text: `${TEXTO_DM} Responda QUERO por aqui.` } }],
  ];
  for (const [nome, corpo] of variantes) {
    if (await chamar('resposta_privada', nome, contato, '/me/messages', corpo)) {
      await fetch(`${REST}/ig_disparos?id=eq.${novo[0].id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ estado: `dm_enviada_${nome}` }) });
      return;
    }
  }
}

async function tratarMensagem(m: any) {
  const contato = String(m?.sender?.id ?? '');
  if (!contato || contato === TESTE.igUserId) return;
  if (m?.message?.is_echo) return;
  if (String(m?.recipient?.id ?? '') !== TESTE.igUserId) return;

  const clicou = norm(m?.postback?.payload) === 'quero'
    || norm(m?.message?.quick_reply?.payload) === 'quero'
    || norm(m?.message?.text).includes('quero');
  if (!clicou) return;

  // Só quem passou pelo fluxo do comentário recebe o link.
  const d = await jaDisparou(contato);
  if (!d || d.estado === 'link_enviado') return;

  const ok = await chamar('link', 'texto_janela', contato, '/me/messages', {
    recipient: { id: contato },
    message: { text: `Aqui está: ${TESTE.link}` },
  });
  if (ok) await fetch(`${REST}/ig_disparos?id=eq.${d.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ estado: 'link_enviado' }) });
}

async function processar(linhas: any[]) {
  for (const l of linhas) {
    if (String(l.ig_user_id) !== TESTE.igUserId) continue;
    try {
      if (l.campo === 'comments') await tratarComentario(l.payload?.value);
      else if (l.campo === 'messaging') await tratarMensagem(l.payload);
    } catch (e) { console.log('ig-webhook: erro ao processar', String(e)); }
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && VERIFY_TOKEN !== '' && url.searchParams.get('hub.verify_token') === VERIFY_TOKEN;
    await gravar('ig_eventos', [{ ig_user_id: null, campo: 'diagnostico', payload: { quando: 'verificacao_get', aceita: ok, token_configurado: VERIFY_TOKEN !== '' }, assinatura_ok: false }]);
    if (ok) return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    return new Response('forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const corpo = await req.text();
  if (!(await assinaturaValida(req, corpo))) {
    await gravar('ig_eventos', [{ ig_user_id: null, campo: 'diagnostico', payload: { quando: 'post_recusado', motivo: 'assinatura_invalida', tem_header: !!req.headers.get('x-hub-signature-256'), segredos_configurados: SECRETS.length, tamanho: corpo.length }, assinatura_ok: false }]);
    return new Response('invalid signature', { status: 401 });
  }

  let json: any;
  try { json = JSON.parse(corpo); } catch { return new Response('bad json', { status: 400 }); }

  const linhas: any[] = [];
  for (const entry of json.entry ?? []) {
    for (const ch of entry.changes ?? []) linhas.push({ ig_user_id: entry.id ?? null, campo: ch.field ?? 'changes', payload: { entry_time: entry.time, ...ch }, assinatura_ok: true });
    for (const m of entry.messaging ?? []) linhas.push({ ig_user_id: entry.id ?? null, campo: 'messaging', payload: { entry_time: entry.time, ...m }, assinatura_ok: true });
  }
  if (!linhas.length) linhas.push({ ig_user_id: null, campo: 'desconhecido', payload: json, assinatura_ok: true });

  if (!(await gravar('ig_eventos', linhas))) return new Response('error', { status: 500 });

  // Processa depois de responder 200, para a Meta não esperar.
  const p = processar(linhas).catch((e) => console.log('ig-webhook: falha geral', String(e)));
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(p); else await p;
  return new Response('ok', { status: 200 });
});
