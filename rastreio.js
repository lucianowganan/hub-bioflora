// rastreio.js — Hub Bioflora
// Coletor de uso (carregado por hub-sidebar.js em todos os módulos). Alimenta a área "Rastreabilidade" (só chefia).
// O que registra: quando a pessoa abre um módulo, quanto tempo ele fica aberto e quanto tempo houve atividade de verdade
// (mouse, teclado, rolagem ou toque nos últimos 60 s, com a aba visível), cliques em botões/links/abas (só o rótulo curto
// do botão, nunca o que é digitado) e envios de formulário. NÃO registra textos digitados, mensagens, valores ou senhas.
(function(){
  if(window.__rastreioAtivo) return;
  window.__rastreioAtivo = true;
  const SUPABASE_URL = 'https://gbbjpltqmbhlfluqhrmg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYmpwbHRxbWJobGZsdXFocm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDY3ODAsImV4cCI6MjA5ODkyMjc4MH0.Gi3iw6IMyJ_6wrOG3WOcHPTW5Mo1IROTH3x_2qTyzrA';
  const pagina = ((location.pathname.split('/').pop() || 'index').replace(/\.html$/, '')) || 'index';
  if(['login','reset-password','vet-cadastro','politica-de-privacidade','termos-de-servico','exclusao-de-dados','link'].includes(pagina)) return;
  if(!window.supabase || !window.supabase.createClient) return;

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c === 'x' ? r : (r&0x3|0x8)).toString(16); }));
  let sessaoId = null, novaSessao = false;
  try{ sessaoId = sessionStorage.getItem('rastreio_sid'); if(!sessaoId){ sessaoId = uuid(); sessionStorage.setItem('rastreio_sid', sessaoId); novaSessao = true; } }catch(e){ sessaoId = uuid(); novaSessao = true; }
  const visitaId = uuid();
  const aberta = new Date().toISOString();

  const cli = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } });
  let token = null;
  async function pegarToken(){ try{ const { data } = await cli.auth.getSession(); token = data && data.session ? data.session.access_token : null; }catch(e){} return token; }

  let segAberta = 0, segAtivo = 0, cliques = 0, ultimaAtividade = Date.now(), sujo = true, eventos = [], totalEventos = 0;
  const marcar = () => { ultimaAtividade = Date.now(); };
  ['mousemove','keydown','scroll','touchstart','click','wheel'].forEach(ev => window.addEventListener(ev, marcar, { passive: true, capture: true }));

  setInterval(() => {
    if(document.hidden) return;
    segAberta++; sujo = true;
    if(Date.now() - ultimaAtividade < 60000) segAtivo++;
  }, 1000);

  function rotulo(el){
    const t = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
    const texto = (el.innerText || el.value || '').replace(/\s+/g, ' ').trim();
    const eh = el.tagName.toLowerCase();
    let r = t || (texto && texto.length <= 40 ? texto : '');
    if(!r){ r = el.id ? '#' + el.id : (el.dataset && (el.dataset.tab || el.dataset.t) ? 'aba:' + (el.dataset.tab || el.dataset.t) : eh); }
    return r.slice(0, 100);
  }
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('button,a,[onclick],[role=button],.tab,.rh-nav-item,.chip-btn,.period-btn,summary,label.chip');
    if(!el) return;
    cliques++; sujo = true;
    if(totalEventos++ < 300) eventos.push({ visita_id: visitaId, pagina, tipo: 'clique', alvo: rotulo(el), criado_em: new Date().toISOString() });
  }, true);
  document.addEventListener('submit', e => {
    if(totalEventos++ < 300) eventos.push({ visita_id: visitaId, pagina, tipo: 'envio', alvo: ((e.target && (e.target.id || e.target.getAttribute('name'))) || 'form').slice(0, 100), criado_em: new Date().toISOString() });
  }, true);
  if(novaSessao) eventos.push({ visita_id: visitaId, pagina, tipo: 'entrada', alvo: 'início de sessão', criado_em: new Date().toISOString() });

  async function enviar(sair){
    if(!token) await pegarToken();
    if(!token) return;
    const h = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    try{
      if(sujo || sair){
        sujo = false;
        const corpo = [{ visita_id: visitaId, sessao_id: sessaoId, pagina, aberta_em: aberta, ultima_em: new Date().toISOString(), seg_aberta: Math.min(segAberta, 86400), seg_ativo: Math.min(segAtivo, 86400), cliques, nova_sessao: novaSessao }];
        await fetch(SUPABASE_URL + '/rest/v1/uso_visitas?on_conflict=visita_id', { method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(corpo), keepalive: !!sair });
      }
      if(eventos.length){
        const lote = eventos.splice(0, 100);
        await fetch(SUPABASE_URL + '/rest/v1/uso_eventos', { method: 'POST', headers: h, body: JSON.stringify(lote), keepalive: !!sair });
      }
    }catch(e){ /* sem internet: tenta na próxima */ }
  }
  setTimeout(() => enviar(false), 3000);        // registra a abertura logo no começo
  setInterval(() => enviar(false), 30000);
  document.addEventListener('visibilitychange', () => { if(document.hidden) enviar(true); });
  window.addEventListener('pagehide', () => enviar(true));
})();
