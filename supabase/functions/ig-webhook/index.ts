// Receptor de webhooks do Instagram (Meta) + execução dos fluxos.
// - Confere a assinatura de cada envio (verify_jwt desligado de propósito: a Meta não manda JWT).
// - Guarda o evento bruto em ig_eventos.
// - Carrega fluxos, contato e execuções do banco, roda o motor (engine.js) e executa os envios.
// - POST ?acao=tick (com o cabeçalho x-worker-secret) processa lembretes, esperas e atrasos vencidos.
import * as E from './engine.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFY_TOKEN = Deno.env.get('IG_VERIFY_TOKEN') ?? '';
const SECRETS = [Deno.env.get('IG_APP_SECRET'), Deno.env.get('META_APP_SECRET')].filter((s): s is string => !!s);
const GRAPH = 'https://graph.instagram.com/v26.0';

const enc = new TextEncoder();

// ---------- assinatura ----------
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

// ---------- banco (PostgREST com service role) ----------
const REST = `${SUPABASE_URL}/rest/v1`;
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

async function db(metodo: string, caminho: string, corpo?: unknown, prefer?: string): Promise<any> {
  const r = await fetch(`${REST}/${caminho}`, { method: metodo, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  if (!r.ok) { console.log(`ig-webhook: ${metodo} ${caminho.split('?')[0]} falhou`, r.status, await r.text()); return null; }
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}
const gravarLinhas = async (tabela: string, linhas: unknown[]) => (await db('POST', tabela, linhas, 'return=minimal')) !== null;

// ---------- conversões banco <-> motor ----------
const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : null);
const iso = (t: number | null) => (t ? new Date(t).toISOString() : null);

const toContact = (r: any) => E.novoContato({
  id: r.id, igId: r.ig_id, username: r.username ?? '', name: r.nome ?? '', tags: r.tags ?? [], fields: r.campos ?? {},
  windowExpires: ms(r.janela_expira), lastUserAt: ms(r.ultima_msg_em), optedOut: !!r.opt_out, human: !!r.humano,
  pausedUntil: ms(r.pausado_ate), done: r.disparos ?? {},
});
const fromContact = (c: any) => ({
  username: c.username || null, nome: c.name || null, tags: c.tags, campos: c.fields, janela_expira: iso(c.windowExpires),
  ultima_msg_em: iso(c.lastUserAt), opt_out: c.optedOut, humano: c.human, pausado_ate: iso(c.pausedUntil), disparos: c.done,
  atualizado_em: new Date().toISOString(),
});
const toExec = (r: any) => ({
  id: r.id, flowId: r.fluxo_id, status: r.status, nodeId: r.no_id, waiting: r.espera, lastText: r.ultimo_texto ?? '', lastButton: r.ultimo_botao ?? '',
  credit: r.credito, commentId: r.comment_id, postId: r.post_id, depth: r.profundidade ?? 0, visited: r.visitados ?? [], startedAt: ms(r.iniciado_em),
});
const fromExec = (e: any, conta: any, contatoId: string) => ({
  id: e.id, conta_id: conta.id, contato_id: contatoId, fluxo_id: e.flowId, status: e.status, no_id: e.nodeId, espera: e.waiting,
  ultimo_texto: e.lastText, ultimo_botao: e.lastButton, credito: e.credit, comment_id: e.commentId, post_id: e.postId,
  profundidade: e.depth, visitados: e.visited, iniciado_em: iso(e.startedAt), atualizado_em: new Date().toISOString(),
});

// ---------- contas e fluxos ----------
const cacheContas = new Map<string, { t: number; c: any }>();
async function getConta(igUserId: string): Promise<any | null> {
  const hit = cacheContas.get(igUserId);
  if (hit && Date.now() - hit.t < 60_000) return hit.c;   // 1 min: mudanças de conta valem logo
  const r = await db('GET', `ig_contas?ig_user_id=eq.${encodeURIComponent(igUserId)}&ativa=eq.true&select=id,marca,ig_user_id,token_env`);
  const c = r?.[0] ?? null;
  cacheContas.set(igUserId, { t: Date.now(), c });
  return c;
}
async function getFluxos(conta: any): Promise<any[]> {
  const r = await db('GET', `ig_fluxos?conta_id=eq.${conta.id}&ativo=eq.true&select=id,nome,ativo,nodes,edges`);
  return r ?? [];
}

// ---------- envio à Meta ----------
async function chamar(conta: any, contatoIg: string, tipo: string, variante: string, caminho: string, corpo: unknown): Promise<boolean> {
  const token = conta.token_env ? Deno.env.get(conta.token_env) ?? '' : '';
  let status = 0, resp: unknown = null, ok = false;
  if (!token) resp = { erro: `segredo ${conta.token_env ?? '(token_env vazio)'} nao configurado` };
  else {
    try {
      const r = await fetch(`${GRAPH}${caminho}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      status = r.status; ok = r.ok;
      const t = await r.text();
      try { resp = JSON.parse(t); } catch { resp = { texto: t.slice(0, 500) }; }
    } catch (e) { resp = { erro: String(e) }; }
  }
  await gravarLinhas('ig_envios', [{ ig_user_id: conta.ig_user_id, contato_ig_id: contatoIg, tipo, variante, http_status: status, ok, resposta: resp }]);
  return ok;
}

function botoesApi(eff: any) {
  return (eff.buttons ?? []).slice(0, 3).map((b: any) => b.type === 'url'
    ? { type: 'web_url', url: b.url, title: String(b.label).slice(0, 20) }
    : { type: 'postback', title: String(b.label).slice(0, 20), payload: `b|${eff.execId}|${eff.nodeId}|${b.idx}` });
}

// Converte as bolhas do motor em mensagens da API. Os botões vão na última bolha.
function montarMensagens(eff: any): any[] {
  let bolhas = (eff.bubbles ?? []).filter((b: any) => b.kind !== 'pause');
  // Resposta privada aceita uma única mensagem: juntamos os textos.
  if (eff.mode === 'private') {
    const t = bolhas.filter((b: any) => b.kind === 'text').map((b: any) => b.text).join('\n\n');
    bolhas = t ? [{ kind: 'text', text: t }] : [];
  }
  const botoes = botoesApi(eff);
  const msgs: any[] = [];
  bolhas.forEach((b: any, i: number) => {
    const ultima = i === bolhas.length - 1;
    const bt = ultima && botoes.length ? botoes : null;
    if (b.kind === 'text') {
      msgs.push(bt ? { attachment: { type: 'template', payload: { template_type: 'button', text: String(b.text).slice(0, 640), buttons: bt } } } : { text: b.text });
    } else if (b.kind === 'card') {
      const extra = b.card.btnLabel && b.card.btnUrl ? [{ type: 'web_url', url: b.card.btnUrl, title: String(b.card.btnLabel).slice(0, 20) }] : [];
      const els: any = { title: String(b.card.title || ' ').slice(0, 80), subtitle: String(b.card.subtitle || '').slice(0, 80), buttons: [...extra, ...(bt ?? [])].slice(0, 3) };
      if (b.card.image) els.image_url = b.card.image;
      if (!els.buttons.length) delete els.buttons;
      msgs.push({ attachment: { type: 'template', payload: { template_type: 'generic', elements: [els] } } });
    } else {
      const tipo = b.kind === 'pdf' ? 'file' : b.kind;
      msgs.push({ attachment: { type: tipo, payload: { url: b.url } } });
      if (bt) msgs.push({ attachment: { type: 'template', payload: { template_type: 'button', text: 'Escolha uma opção:', buttons: bt } } });
    }
  });
  return msgs;
}

async function executarEfeitos(conta: any, contato: any, efeitos: any[]) {
  for (const eff of efeitos) {
    if (eff.k === 'public_reply') {
      await chamar(conta, contato.igId, 'resposta_publica', 'texto', `/${eff.commentId}/replies`, { message: eff.text });
    } else if (eff.k === 'send') {
      const dest = eff.mode === 'private' ? { comment_id: eff.commentId } : { id: contato.igId };
      for (const message of montarMensagens(eff)) {
        const tipo = eff.mode === 'private' ? 'resposta_privada' : 'mensagem';
        const variante = message.attachment ? `${message.attachment.type}${message.attachment.payload?.template_type ? ':' + message.attachment.payload.template_type : ''}` : 'texto';
        if (!(await chamar(conta, contato.igId, tipo, variante, '/me/messages', { recipient: dest, message }))) break;
      }
    }
  }
}

// ---------- ciclo de um evento ----------
async function carregarContexto(conta: any, igId: string, username?: string) {
  const base: any = { conta_id: conta.id, ig_id: igId };
  if (username) base.username = username;
  const up = await db('POST', 'ig_contatos?on_conflict=conta_id,ig_id', [base], 'resolution=merge-duplicates,return=representation');
  const row = up?.[0];
  if (!row) return null;
  const [execs, flows] = await Promise.all([
    db('GET', `ig_execucoes?contato_id=eq.${row.id}&status=in.(rodando,aguardando)&select=*`),
    getFluxos(conta),
  ]);
  const ctx = E.criarCtx({ flows, contact: toContact(row), execs: (execs ?? []).map(toExec), now: Date.now(), newId: () => crypto.randomUUID() });
  return ctx;
}

async function salvarContexto(conta: any, ctx: any) {
  await db('PATCH', `ig_contatos?id=eq.${ctx.contact.id}`, fromContact(ctx.contact), 'return=minimal');
  const alteradas = [...ctx.touched].map((e: any) => fromExec(e, conta, ctx.contact.id));
  if (alteradas.length) await db('POST', 'ig_execucoes?on_conflict=id', alteradas, 'resolution=merge-duplicates,return=minimal');
}

async function tratarComentario(conta: any, v: any) {
  const contatoIg = String(v?.from?.id ?? ''), commentId = String(v?.id ?? ''), postId = String(v?.media?.id ?? '');
  if (!contatoIg || !commentId || !postId) return;
  if (contatoIg === conta.ig_user_id) return;   // comentário da própria conta, inclusive as nossas respostas
  if (v?.parent_id) return;                     // resposta a outro comentário
  const ctx = await carregarContexto(conta, contatoIg, v?.from?.username);
  if (!ctx) return;
  E.onComment(ctx, { postId, commentId, text: String(v?.text ?? '') });
  if (!ctx.effects.length && !ctx.touched.size) return;   // nenhum gatilho correspondeu

  // Trava contra o mesmo evento chegando duas vezes ao mesmo tempo: um disparo por pessoa por post.
  const lock = await db('POST', 'ig_disparos?on_conflict=ig_user_id,post_id,contato_ig_id',
    [{ ig_user_id: conta.ig_user_id, post_id: postId, contato_ig_id: contatoIg, comment_id: commentId }],
    'return=representation,resolution=ignore-duplicates');
  const jaExistia = !lock?.length;
  if (jaExistia && ctx.touched.size) {
    // A tabela de disparos já tinha esta pessoa neste post, mas o motor achou que podia disparar:
    // só acontece em corrida ou se o contato foi apagado. Por segurança, não envia de novo.
    console.log('ig-webhook: disparo ja registrado, ignorando');
    return;
  }
  await salvarContexto(conta, ctx);
  await executarEfeitos(conta, ctx.contact, ctx.effects);
}

// Eco: a Meta avisa de toda mensagem enviada PELA conta, inclusive as do próprio bot. O eco não traz nada que
// diferencie, então comparamos o id da mensagem com os que o bot enviou (guardados em ig_envios).
// O que não for do bot é um atendente respondendo pelo app: pausamos a automação deste contato.
async function tratarEco(conta: any, m: any) {
  const alvo = String(m?.recipient?.id ?? ''), mid = String(m?.message?.mid ?? '');
  if (!alvo || !mid || alvo === conta.ig_user_id) return;
  await new Promise((r) => setTimeout(r, 3000));   // dá tempo de o envio do bot ser registrado
  const r = await db('GET', `ig_envios?resposta->>message_id=eq.${encodeURIComponent(mid)}&select=id&limit=1`);
  if (r === null || r.length) return;               // erro de leitura (não pausa por engano) ou foi o próprio bot
  const ctx = await carregarContexto(conta, alvo);
  if (!ctx) return;
  E.onAgentEcho(ctx);
  await salvarContexto(conta, ctx);
}

async function tratarMensagem(conta: any, m: any) {
  const contatoIg = String(m?.sender?.id ?? '');
  if (contatoIg === conta.ig_user_id) { if (m?.message?.is_echo) await tratarEco(conta, m); return; }
  if (!contatoIg) return;
  if (m?.message?.is_echo) return;
  if (String(m?.recipient?.id ?? '') !== conta.ig_user_id) return;

  const ctx = await carregarContexto(conta, contatoIg);
  if (!ctx) return;
  const payload = String(m?.postback?.payload ?? m?.message?.quick_reply?.payload ?? '');
  if (payload.startsWith('b|')) {
    const [, execId, nodeId, idx] = payload.split('|');
    E.onButton(ctx, { execId, nodeId, idx: Number(idx) });
  } else if (m?.message?.text != null) {
    const story = m?.message?.reply_to?.story;
    E.onDM(ctx, { text: String(m.message.text), source: story ? 'story' : 'dm', storyId: story?.id ? String(story.id) : undefined });
  } else return;
  await salvarContexto(conta, ctx);
  await executarEfeitos(conta, ctx.contact, ctx.effects);
}

async function processar(linhas: any[]) {
  for (const l of linhas) {
    if (!l.ig_user_id) continue;
    try {
      const conta = await getConta(String(l.ig_user_id));
      if (!conta) continue;
      if (l.campo === 'comments') await tratarComentario(conta, l.payload?.value);
      else if (l.campo === 'messaging') await tratarMensagem(conta, l.payload);
    } catch (e) { console.log('ig-webhook: erro ao processar', String(e)); }
  }
}

// ---------- relógio: lembretes, esperas e atrasos ----------
async function tick(): Promise<number> {
  const abertas = await db('GET', 'ig_execucoes?status=eq.aguardando&select=contato_id,conta_id');
  const vistos = new Set<string>();
  let n = 0;
  for (const a of abertas ?? []) {
    if (vistos.has(a.contato_id)) continue;
    vistos.add(a.contato_id);
    try {
      const rc = await db('GET', `ig_contatos?id=eq.${a.contato_id}&select=*`);
      const cr = await db('GET', `ig_contas?id=eq.${a.conta_id}&select=id,marca,ig_user_id,token_env`);
      if (!rc?.[0] || !cr?.[0]) continue;
      const conta = cr[0];
      const [execs, flows] = await Promise.all([db('GET', `ig_execucoes?contato_id=eq.${a.contato_id}&status=in.(rodando,aguardando)&select=*`), getFluxos(conta)]);
      const ctx = E.criarCtx({ flows, contact: toContact(rc[0]), execs: (execs ?? []).map(toExec), now: Date.now(), newId: () => crypto.randomUUID() });
      E.tick(ctx);
      if (!ctx.touched.size && !ctx.effects.length) continue;
      await salvarContexto(conta, ctx);
      await executarEfeitos(conta, ctx.contact, ctx.effects);
      n++;
    } catch (e) { console.log('ig-webhook: erro no tick', String(e)); }
  }
  return n;
}

async function segredoDoRelogio(): Promise<string> {
  const r = await db('GET', 'ig_config?chave=eq.worker_secret&select=valor');
  return r?.[0]?.valor ?? '';
}

// ---------- servidor ----------
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && VERIFY_TOKEN !== '' && url.searchParams.get('hub.verify_token') === VERIFY_TOKEN;
    await gravarLinhas('ig_eventos', [{ ig_user_id: null, campo: 'diagnostico', payload: { quando: 'verificacao_get', aceita: ok, token_configurado: VERIFY_TOKEN !== '' }, assinatura_ok: false }]);
    if (ok) return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    return new Response('forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  // Relógio (chamado pelo agendador do banco).
  if (url.searchParams.get('acao') === 'tick') {
    const esperado = await segredoDoRelogio();
    const recebido = req.headers.get('x-worker-secret') ?? '';
    if (!esperado || !iguais(esperado, recebido)) return new Response('forbidden', { status: 403 });
    return new Response(JSON.stringify({ processados: await tick() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const corpo = await req.text();
  if (!(await assinaturaValida(req, corpo))) {
    await gravarLinhas('ig_eventos', [{ ig_user_id: null, campo: 'diagnostico', payload: { quando: 'post_recusado', motivo: 'assinatura_invalida', tem_header: !!req.headers.get('x-hub-signature-256'), segredos_configurados: SECRETS.length, tamanho: corpo.length }, assinatura_ok: false }]);
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

  if (!(await gravarLinhas('ig_eventos', linhas))) return new Response('error', { status: 500 }); // a Meta tenta de novo

  // Processa depois de responder 200, para a Meta não esperar.
  const p = processar(linhas).catch((e) => console.log('ig-webhook: falha geral', String(e)));
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(p); else await p;
  return new Response('ok', { status: 200 });
});
