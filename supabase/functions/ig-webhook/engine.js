// engine.js — motor de fluxos do Instagram.
// Sem DOM, sem rede e sem banco: só recebe um "contexto" (fluxos, contato, execuções, hora) e um evento,
// atualiza o contexto e devolve efeitos (mensagens a enviar). Por isso roda igual no servidor (Deno)
// e no simulador do Hub (navegador). O servidor guarda o estado no banco e faz os envios.
//
// Efeitos produzidos em ctx.effects:
//   {k:'public_reply', commentId, text}
//   {k:'send', mode:'private'|'window', execId, nodeId, commentId, bubbles:[...], buttons:[...], ack}
// Logs legíveis em ctx.logs: {t, lvl, msg}.

export const MIN = 60e3, H = 3600e3, DAY = 24 * H, WEEK = 7 * DAY, PAUSE = 30 * MIN;
const OPT_OUT = ['parar', 'sair', 'cancelar', 'cancelar inscricao', 'stop'];
const OPT_IN = ['comecar', 'inscrever'];

export const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const short = (s, n) => { n = n || 60; s = String(s || '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
export const dur = (ms) => { ms = Math.max(0, ms); const h = Math.floor(ms / H), m = Math.floor((ms % H) / MIN); return h >= 48 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h + 'h ' + String(m).padStart(2, '0') + 'min'; };

// ---------- contexto ----------
export function novoContato(extra) {
  return Object.assign({ id: null, igId: null, username: '', name: '', tags: [], fields: {}, windowExpires: null, lastUserAt: null, optedOut: false, human: false, pausedUntil: null, done: {} }, extra || {});
}
export function criarCtx(init) {
  const c = Object.assign({ flows: [], contact: novoContato(), execs: [], now: Date.now(), rand: Math.random, newId: null }, init || {});
  if (!c.newId) { let n = 0; c.newId = () => 'x' + (++n); }
  c.effects = []; c.logs = []; c.stats = c.stats || {}; c.touched = new Set();
  return c;
}

// ---------- utilitários ----------
const flowOf = (ctx, id) => ctx.flows.find((f) => f.id === id);
const nodeOf = (ctx, fid, id) => { const f = flowOf(ctx, fid); return f ? f.nodes.find((n) => n.id === id) : null; };
const edgeOf = (ctx, fid, id, port) => { const f = flowOf(ctx, fid); return f ? f.edges.find((e) => e.from === id && e.port === port) : null; };
const log = (ctx, lvl, msg) => ctx.logs.push({ t: ctx.now, lvl, msg });
const touch = (ctx, ex) => ctx.touched.add(ex);
const stat = (ctx, fid, id) => { const k = fid + ':' + id; return ctx.stats[k] || (ctx.stats[k] = { entered: 0, sent: 0, replies: 0, clicks: {} }); };

function fill(ctx, s, ex) {
  return String(s == null ? '' : s).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, k) => {
    const c = ctx.contact; k = k.trim();
    const nome = c.name || c.username || '';
    if (k === 'primeiro_nome') return nome.split(' ')[0];
    if (k === 'nome') return nome;
    if (k === 'usuario') return c.username ? '@' + String(c.username).replace(/^@/, '') : '';
    if (k === 'ultima_resposta') return ex ? ex.lastText : '';
    if (k.indexOf('campo:') === 0) { const v = c.fields[k.slice(6).trim()]; return v == null ? '' : String(v); }
    return m;
  });
}

function matchTrig(t, text, kind, extra) {
  if (!t.on || t.k !== kind) return false;
  if (t.k === 'comment' && t.post !== 'all' && t.post !== extra.postId) return false;
  if (t.k === 'story' && t.story !== 'all' && t.story !== extra.storyId) return false;
  if (t.k === 'default') return true;
  if (t.k === 'story' && t.mode === 'reaction') return !!extra.reaction;
  if (t.mode === 'any') return true;
  const x = norm(text);
  const ks = String(t.keywords || '').split(',').map(norm).filter(Boolean);
  if (!ks.length) return false;
  return t.mode === 'exact' ? ks.some((k) => x === k) : ks.some((k) => x.includes(k));
}
function findTrigger(ctx, kind, text, extra) {
  for (const f of ctx.flows) {
    if (f.ativo === false || f.active === false) continue;
    for (const n of f.nodes) {
      if (n.type !== 'start') continue;
      for (const t of n.data.triggers || []) if (matchTrig(t, text, kind, extra || {})) return { f, n, t };
    }
  }
  return null;
}

function validate(kind, text) {
  const t = String(text).trim();
  if (kind === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  if (kind === 'phone') { const d = t.replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; }
  if (kind === 'number') return /^-?\d+([.,]\d+)?$/.test(t);
  return t.length > 0;
}

function evalRule(ctx, r, ex) {
  const c = ctx.contact, a = String(r.a || '').trim(), b = String(r.b == null ? '' : r.b).trim();
  if (r.k === 'tag') { const has = c.tags.map(norm).includes(norm(a).replace(/^#/, '')); return r.op === 'not' ? !has : has; }
  if (r.k === 'field') {
    const raw = c.fields[a], has = raw != null && String(raw) !== '';
    if (r.op === 'set') return has;
    if (r.op === 'empty') return !has;
    const x = String(raw == null ? '' : raw);
    if (r.op === 'eq') return norm(x) === norm(b);
    if (r.op === 'ne') return norm(x) !== norm(b);
    if (r.op === 'contains') return !!b && norm(x).includes(norm(b));
    const nx = parseFloat(x), nb = parseFloat(b);
    if (isNaN(nx) || isNaN(nb)) return false;
    return r.op === 'gt' ? nx > nb : nx < nb;
  }
  if (r.k === 'text') { const ks = b.split(',').map(norm).filter(Boolean), hit = ks.some((k) => norm(ex.lastText).includes(k)); return r.op === 'not' ? !hit : hit; }
  if (r.k === 'button') { const eq = norm(ex.lastButton) === norm(b); return r.op === 'ne' ? !eq : eq; }
  return false;
}

function finish(ctx, ex, status, why) {
  ex.status = status; ex.waiting = null; touch(ctx, ex);
  const bad = status === 'bloqueado' || status === 'erro' || status === 'expirado';
  log(ctx, bad ? 'block' : 'info', 'Execução ' + status + (why ? ': ' + why : '') + '.');
}

// Regras de envio: janela de 24h, resposta privada única (7 dias), opt-out e pausa por atendente.
function permit(ctx, ex, mode, opt) {
  const c = ctx.contact;
  if (c.optedOut && !opt.ack) return 'contato pediu para sair (opt-out)';
  if (!opt.agent) {
    if (c.human) return 'bot pausado, conversa com humano';
    if (c.pausedUntil && ctx.now < c.pausedUntil) return 'automação pausada porque um atendente respondeu';
  }
  if (mode === 'private') {
    if (!ex.credit) return 'resposta privada indisponível: o fluxo não veio de um comentário ou ela já foi usada';
    if (ctx.now >= ex.credit.expires) return 'a resposta privada venceu (limite de 7 dias após o comentário)';
    return null;
  }
  if (c.windowExpires && ctx.now < c.windowExpires) return null;
  return c.windowExpires
    ? 'janela de 24h fechada (venceu há ' + dur(ctx.now - c.windowExpires) + ')'
    : 'janela de 24h ainda não aberta, o contato não respondeu. Na 1ª DM de um comentário use "resposta privada"';
}

function sendBubbles(ctx, ex, n, mode, bubbles, buttons, opt) {
  opt = opt || {};
  const why = permit(ctx, ex, mode, opt);
  if (why) { log(ctx, 'block', 'Envio bloqueado: ' + why + '.'); return false; }
  if (mode === 'private') { ex.credit = null; touch(ctx, ex); }
  ctx.effects.push({ k: 'send', mode, execId: ex.id || null, nodeId: n ? n.id : null, flowId: ex.flowId || null, commentId: mode === 'private' ? ex.commentId : null, bubbles, buttons: buttons || [], ack: !!opt.ack });
  const real = bubbles.filter((b) => b.kind !== 'pause');
  log(ctx, 'send', 'Enviado via ' + (mode === 'private' ? 'resposta privada ao comentário' : 'janela de 24h') + ': ' + (real.length > 1 ? real.length + ' bolhas' : (real[0] ? (real[0].kind === 'text' ? '"' + short(real[0].text) + '"' : real[0].kind) : 'mensagem')));
  return true;
}

function goPort(ctx, ex, nid, port, why) {
  const e = edgeOf(ctx, ex.flowId, nid, port);
  if (!e) { finish(ctx, ex, port === 'timeout' ? 'expirado' : 'concluído', why); return; }
  runNode(ctx, ex, e.to);
}

// ---------- execução dos nós ----------
function step(ctx, ex, n) {
  const d = n.data, c = ctx.contact, s = stat(ctx, ex.flowId, n.id);
  switch (n.type) {
    case 'start': return 'out';
    case 'note': return 'out';
    case 'message': {
      const mode = d.mode === 'private' ? 'private' : 'window';
      const blocks = d.blocks || [];
      if (mode === 'private' && blocks.some((b) => b.t !== 'text')) { log(ctx, 'block', 'Envio bloqueado: a resposta privada aceita só texto e botões.'); finish(ctx, ex, 'bloqueado', 'mídia em resposta privada'); return null; }
      const bubbles = [];
      blocks.forEach((b) => {
        if (b.t === 'text') bubbles.push({ kind: 'text', text: fill(ctx, b.text, ex) });
        else if (b.t === 'image') bubbles.push({ kind: 'image', url: b.url });
        else if (b.t === 'pdf') bubbles.push({ kind: 'pdf', url: b.url, name: b.name });
        else if (b.t === 'audio') bubbles.push({ kind: 'audio', url: b.url });
        else if (b.t === 'video') bubbles.push({ kind: 'video', url: b.url });
        else if (b.t === 'card') bubbles.push({ kind: 'card', card: { image: b.image, title: fill(ctx, b.title, ex), subtitle: fill(ctx, b.subtitle, ex), btnLabel: b.btnLabel, btnUrl: b.btnUrl } });
        else if (b.t === 'delay') bubbles.push({ kind: 'pause', sec: Number(b.sec) || 3 });
      });
      const btns = (d.buttons || []).map((b, i) => ({ label: String(b.label || '').trim(), idx: i, type: b.type === 'url' ? 'url' : 'reply', url: b.url || '' })).filter((b) => b.label);
      if (!bubbles.filter((b) => b.kind !== 'pause').length) { log(ctx, 'warn', 'Mensagem vazia: nada foi enviado.'); return 'out'; }
      if (!sendBubbles(ctx, ex, n, mode, bubbles, btns)) { finish(ctx, ex, 'bloqueado', 'a mensagem não pôde ser enviada'); return null; }
      s.sent++;
      if (btns.some((b) => b.type === 'reply')) { ex.status = 'aguardando'; ex.waiting = { type: 'buttons', nodeId: n.id }; touch(ctx, ex); log(ctx, 'info', 'Execução aguardando clique em botão.'); return null; }
      return 'out';
    }
    case 'collect': {
      const h = Math.min(23, Math.max(1, Number(d.hours) || 2));
      if (String(d.prompt || '').trim()) {
        if (!sendBubbles(ctx, ex, n, 'window', [{ kind: 'text', text: fill(ctx, d.prompt, ex) }], null)) { finish(ctx, ex, 'bloqueado', 'a pergunta não pôde ser enviada'); return null; }
        s.sent++;
      }
      ex.status = 'aguardando';
      ex.waiting = { type: 'collect', nodeId: n.id, deadline: ctx.now + h * H, attempts: 0, remindAt: d.remind ? ctx.now + Math.max(1, Number(d.remindMin) || 1) * MIN : null };
      touch(ctx, ex);
      log(ctx, 'info', 'Execução aguardando resposta por até ' + h + 'h.');
      return null;
    }
    case 'delay': {
      const amount = Math.max(1, Number(d.amount) || 1), ms = Math.min(23 * H, amount * (d.unit === 'h' ? H : MIN));
      ex.status = 'aguardando'; ex.waiting = { type: 'delay', nodeId: n.id, deadline: ctx.now + ms }; touch(ctx, ex);
      log(ctx, 'info', 'Execução em atraso de ' + dur(ms) + '.');
      return null;
    }
    case 'condition': {
      const rules = d.rules || [];
      const res = rules.map((r) => evalRule(ctx, r, ex));
      const ok = rules.length ? (d.match === 'any' ? res.some(Boolean) : res.every(Boolean)) : false;
      log(ctx, 'info', 'Condição: ' + (ok ? 'sim' : 'senão') + '.');
      return ok ? 'yes' : 'no';
    }
    case 'random': {
      const bs = (d.branches || []).map((b) => Math.max(0, Number(b.pct) || 0)), sum = bs.reduce((a, b) => a + b, 0);
      if (!sum) { log(ctx, 'warn', 'Randomizador sem pesos: usando o primeiro ramo.'); return 'b0'; }
      let r = ctx.rand() * sum, i = 0;
      for (; i < bs.length; i++) { if (r < bs[i]) break; r -= bs[i]; }
      if (i >= bs.length) i = bs.length - 1;
      log(ctx, 'info', 'Randomizador escolheu "' + ((d.branches[i] || {}).label || ('ramo ' + (i + 1))) + '".');
      return 'b' + i;
    }
    case 'actions': {
      (d.actions || []).forEach((a) => {
        const x = String(a.a || '').trim(), v = fill(ctx, a.b, ex);
        if (a.k === 'add_tag') { const t = x.replace(/^#/, ''); if (t && !c.tags.includes(t)) c.tags.push(t); log(ctx, 'info', 'Tag adicionada: ' + t + '.'); }
        else if (a.k === 'remove_tag') { const t = x.replace(/^#/, ''); c.tags = c.tags.filter((y) => norm(y) !== norm(t)); log(ctx, 'info', 'Tag removida: ' + t + '.'); }
        else if (a.k === 'set_field') { if (x) { c.fields[x] = v; log(ctx, 'info', 'Campo ' + x + ' = "' + v + '".'); } }
        else if (a.k === 'add_number') { if (x) { const cur = parseFloat(c.fields[x]); c.fields[x] = (isNaN(cur) ? 0 : cur) + (parseFloat(v) || 0); log(ctx, 'info', 'Campo ' + x + ' agora vale ' + c.fields[x] + '.'); } }
        else if (a.k === 'clear_field') { if (x) { delete c.fields[x]; log(ctx, 'info', 'Campo ' + x + ' limpo.'); } }
      });
      return 'out';
    }
    case 'goto': {
      const tf = flowOf(ctx, d.target);
      if (!tf) { finish(ctx, ex, 'erro', 'o fluxo de destino não existe'); return null; }
      if ((ex.depth || 0) >= 5) { finish(ctx, ex, 'erro', 'limite de fluxos encadeados'); return null; }
      const sn = tf.nodes.find((x) => x.type === 'start');
      if (!sn) { finish(ctx, ex, 'erro', 'o fluxo de destino não tem gatilho'); return null; }
      log(ctx, 'info', 'Iniciando o fluxo "' + tf.nome + '".');
      finish(ctx, ex, 'concluído', 'encaminhado para outro fluxo');
      startExec(ctx, tf, sn, { text: ex.lastText, credit: ex.credit, commentId: ex.commentId, postId: ex.postId, depth: (ex.depth || 0) + 1 });
      return null;
    }
    case 'human': {
      if (String(d.notice || '').trim()) sendBubbles(ctx, ex, n, 'window', [{ kind: 'text', text: fill(ctx, d.notice, ex) }], null);
      c.human = true;
      log(ctx, 'warn', 'Conversa passada para humano. O bot fica pausado neste contato.');
      finish(ctx, ex, 'concluído (humano)');
      ctx.execs.forEach((o) => { if (o !== ex && (o.status === 'aguardando' || o.status === 'rodando')) finish(ctx, o, 'cancelado', 'conversa assumida por humano'); });
      return null;
    }
    case 'end': finish(ctx, ex, 'concluído'); return null;
  }
  finish(ctx, ex, 'erro', 'tipo de nó desconhecido'); return null;
}

function runNode(ctx, ex, id) {
  let guard = 0;
  while (id) {
    if (++guard > 60) { finish(ctx, ex, 'erro', 'limite de passos, possível laço no fluxo'); return; }
    const n = nodeOf(ctx, ex.flowId, id);
    if (!n) { finish(ctx, ex, 'erro', 'nó não encontrado'); return; }
    ex.nodeId = id; ex.visited.push(id); touch(ctx, ex); stat(ctx, ex.flowId, id).entered++;
    const out = step(ctx, ex, n);
    if (out === null) return;
    const e = edgeOf(ctx, ex.flowId, id, out);
    if (!e) { finish(ctx, ex, 'concluído', 'saída sem conexão'); return; }
    id = e.to;
  }
}

function startExec(ctx, f, startNode, extra) {
  const ex = { id: ctx.newId(), flowId: f.id, status: 'rodando', nodeId: startNode.id, waiting: null, lastText: extra.text || '', lastButton: '', credit: extra.credit || null, commentId: extra.commentId || null, postId: extra.postId || null, depth: extra.depth || 0, visited: [], startedAt: ctx.now };
  ctx.execs.push(ex); touch(ctx, ex);
  log(ctx, 'info', 'Execução iniciada no fluxo "' + (f.nome || f.name) + '".');
  runNode(ctx, ex, startNode.id);
}

// ---------- eventos ----------
const aberta = (o) => o.status === 'aguardando' || o.status === 'rodando';

function inbound(ctx) { const c = ctx.contact; c.windowExpires = ctx.now + DAY; c.lastUserAt = ctx.now; }

// Comentário numa publicação. Não abre a janela de 24h; dá direito a uma resposta privada em até 7 dias.
export function onComment(ctx, ev) {
  const c = ctx.contact;
  log(ctx, 'info', 'Comentário no post ' + ev.postId + ': "' + short(ev.text) + '". O comentário não abre a janela de 24h.');
  if (c.optedOut) { log(ctx, 'block', 'Contato em opt-out: comentário ignorado.'); return; }
  if (c.human) { log(ctx, 'info', 'Conversa com humano: o bot não age sobre o comentário.'); return; }
  const hit = findTrigger(ctx, 'comment', ev.text, { postId: ev.postId });
  if (!hit) { log(ctx, 'info', 'Nenhum gatilho de comentário correspondeu.'); return; }
  if (c.done[ev.postId]) { log(ctx, 'block', 'Este contato já disparou um fluxo neste post. Regra: um disparo por pessoa por post.'); return; }
  c.done[ev.postId] = true;
  const reps = lines(hit.t.reply);
  if (reps.length) {
    const pick = reps[Math.floor(ctx.rand() * reps.length)];
    ctx.effects.push({ k: 'public_reply', commentId: ev.commentId, text: pick });
    log(ctx, 'send', 'Resposta pública ao comentário: "' + pick + '"');
  }
  startExec(ctx, hit.f, hit.n, { text: ev.text, commentId: ev.commentId, postId: ev.postId, credit: { expires: ctx.now + WEEK } });
}

// Mensagem direta (ev.source = 'dm') ou resposta/reação a story (ev.source = 'story').
export function onDM(ctx, ev) {
  const c = ctx.contact, text = ev.text, story = ev.source === 'story';
  inbound(ctx);
  log(ctx, 'info', (story ? (ev.reaction ? 'Reação a story' : 'Resposta a story') : 'DM recebida') + ': "' + short(text) + '". Janela de 24h aberta.');
  const t = norm(text);
  if (OPT_OUT.includes(t)) {
    c.optedOut = true;
    ctx.execs.forEach((o) => { if (aberta(o)) finish(ctx, o, 'cancelado', 'contato pediu para sair'); });
    log(ctx, 'warn', 'Palavra de saída detectada. Contato marcado como opt-out.');
    sendBubbles(ctx, { id: null, credit: null }, null, 'window', [{ kind: 'text', text: 'Tudo certo, você não vai mais receber mensagens automáticas.' }], null, { ack: true });
    return;
  }
  if (c.optedOut) {
    if (OPT_IN.includes(t)) { c.optedOut = false; log(ctx, 'info', 'Contato voltou (opt-in).'); }
    else log(ctx, 'block', 'Contato em opt-out: nenhum fluxo roda. Para voltar, ele envia "começar".');
    return;
  }
  if (c.human) { log(ctx, 'info', 'Conversa com humano: o bot não responde.'); return; }
  if (c.pausedUntil && ctx.now < c.pausedUntil) { log(ctx, 'info', 'Automação pausada porque um atendente respondeu. A mensagem fica para ele.'); return; }

  const w = [].concat(ctx.execs).reverse().find((o) => o.status === 'aguardando' && o.waiting && o.waiting.type === 'collect');
  if (w) {
    const n = nodeOf(ctx, w.flowId, w.waiting.nodeId), d = n.data;
    if (validate(d.kind, text)) {
      let val = String(text).trim();
      if (d.kind === 'number') val = parseFloat(val.replace(',', '.'));
      if (d.field) { c.fields[d.field] = val; log(ctx, 'info', 'Campo ' + d.field + ' = "' + val + '".'); }
      w.lastText = text; w.lastButton = '';
      stat(ctx, w.flowId, n.id).replies++;
      w.status = 'rodando'; w.waiting = null; touch(ctx, w);
      log(ctx, 'info', 'Execução retomada com a resposta do contato.');
      goPort(ctx, w, n.id, 'reply', 'saída "Respondeu" sem conexão');
    } else {
      w.waiting.attempts++; touch(ctx, w);
      if (w.waiting.attempts >= 2) {
        log(ctx, 'warn', 'Resposta inválida duas vezes: seguindo pela saída "Sem resposta".');
        w.status = 'rodando'; w.waiting = null;
        goPort(ctx, w, n.id, 'timeout', 'resposta inválida e a saída "Sem resposta" não está conectada');
      } else {
        log(ctx, 'warn', 'Resposta fora do formato (' + d.kind + '). Perguntando de novo.');
        sendBubbles(ctx, w, n, 'window', [{ kind: 'text', text: 'Não consegui entender. ' + fill(ctx, d.prompt, w) }], null);
      }
    }
    return;
  }
  const kind = story ? 'story' : 'dm';
  let hit = findTrigger(ctx, kind, text, { storyId: ev.storyId, reaction: !!ev.reaction });
  const wb = ctx.execs.some((o) => o.status === 'aguardando' && o.waiting && o.waiting.type === 'buttons');
  if (!hit && !story && !wb) hit = findTrigger(ctx, 'default', text, {});
  if (hit) { startExec(ctx, hit.f, hit.n, { text }); return; }
  log(ctx, 'info', wb ? 'Texto livre ignorado: o fluxo espera um clique em botão.' : 'Nenhum gatilho de ' + (story ? 'story' : 'DM') + ' correspondeu.');
}

// Clique em botão de resposta (postback). ev = {execId, nodeId, idx}.
export function onButton(ctx, ev) {
  const c = ctx.contact;
  const ex = ctx.execs.find((o) => o.id === ev.execId);
  const n = ex ? nodeOf(ctx, ex.flowId, ev.nodeId) : null;
  const label = n && n.data.buttons && n.data.buttons[ev.idx] ? String(n.data.buttons[ev.idx].label || '') : '';
  inbound(ctx);
  if (ex && n) { const s = stat(ctx, ex.flowId, n.id); s.clicks[ev.idx] = (s.clicks[ev.idx] || 0) + 1; }
  log(ctx, 'info', 'Clique no botão "' + label + '". Janela de 24h aberta.');
  if (c.optedOut) { log(ctx, 'block', 'Contato em opt-out: clique ignorado.'); return; }
  if (c.human) { log(ctx, 'info', 'Conversa com humano: o bot não responde.'); return; }
  if (c.pausedUntil && ctx.now < c.pausedUntil) { log(ctx, 'info', 'Automação pausada: o clique fica para o atendente.'); return; }
  if (!ex || ex.status !== 'aguardando' || !ex.waiting || ex.waiting.type !== 'buttons' || ex.waiting.nodeId !== ev.nodeId) {
    log(ctx, 'warn', 'Botão de mensagem antiga: nenhuma execução aguardando esse clique. Ignorado.'); return;
  }
  ex.lastText = label; ex.lastButton = label; ex.status = 'rodando'; ex.waiting = null; touch(ctx, ex);
  goPort(ctx, ex, ev.nodeId, 'btn' + ev.idx, 'botão sem destino conectado');
}

// Atendente humano respondeu pelo app do Instagram (eco da mensagem): pausa a automação por 30 min.
export function onAgentEcho(ctx) {
  ctx.contact.pausedUntil = ctx.now + PAUSE;
  log(ctx, 'send', 'Atendente respondeu. A automação deste contato fica pausada por 30 minutos.');
}
export function releaseHuman(ctx) { ctx.contact.human = false; ctx.contact.pausedUntil = null; log(ctx, 'info', 'Bot reativado neste contato.'); }

// ---------- tempo: lembretes, esperas, atrasos e vencimento da janela ----------
function expiryOf(ctx, ex) {
  const c = ctx.contact;
  if (c.windowExpires) return c.windowExpires;
  return ex.startedAt + WEEK;
}

// Processa, em ordem cronológica, tudo que venceu até "alvo". Durante cada item o relógio do contexto
// fica na hora em que ele venceu, para as regras de janela valerem como valiam naquele momento.
export function processar(ctx, alvo) {
  const real = ctx.now;
  alvo = alvo == null ? real : alvo;
  for (let guard = 0; guard < 300; guard++) {
    let next = Infinity, kind = null, ex = null;
    ctx.execs.forEach((o) => {
      if (o.status !== 'aguardando' || !o.waiting) return;
      const w = o.waiting;
      const cand = (t, k) => { if (t != null && t <= alvo && t < next) { next = t; kind = k; ex = o; } };
      if (w.type === 'collect') { cand(w.remindAt, 'remind'); cand(w.deadline, 'deadline'); }
      else if (w.type === 'delay') cand(w.deadline, 'delay');
      else cand(expiryOf(ctx, o), 'window');
    });
    if (!ex) break;
    ctx.now = next;
    const w = ex.waiting, nid = w.nodeId;
    if (kind === 'remind') {
      w.remindAt = null; touch(ctx, ex);
      const n = nodeOf(ctx, ex.flowId, nid);
      log(ctx, 'info', 'Lembrete automático para o contato.');
      if (n && String(n.data.remindText || '').trim()) sendBubbles(ctx, ex, n, 'window', [{ kind: 'text', text: fill(ctx, n.data.remindText, ex) }], null);
    } else if (kind === 'deadline') {
      ex.waiting = null; ex.status = 'rodando'; touch(ctx, ex);
      log(ctx, 'info', 'Tempo de espera esgotado.');
      goPort(ctx, ex, nid, 'timeout', 'tempo esgotado e a saída "Sem resposta" não está conectada');
    } else if (kind === 'delay') {
      ex.waiting = null; ex.status = 'rodando'; touch(ctx, ex);
      log(ctx, 'info', 'Atraso concluído.');
      goPort(ctx, ex, nid, 'out', 'atraso sem conexão adiante');
    } else {
      finish(ctx, ex, 'expirado', 'a janela venceu com o fluxo aguardando clique em botão. Não retoma sozinho');
    }
  }
  ctx.now = Math.max(real, alvo);
}
export const tick = (ctx) => processar(ctx, ctx.now);
export const avancar = (ctx, ms) => processar(ctx, ctx.now + ms);

export const Engine = { onComment, onDM, onButton, onAgentEcho, releaseHuman, processar, tick, avancar, criarCtx, novoContato, norm, dur };
export default Engine;
