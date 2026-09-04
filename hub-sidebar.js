// hub-sidebar.js — Hub Bioflora
// Barra lateral com todos os módulos, igual em toda página do Hub.
// Uso: <script src="hub-sidebar.js"></script> antes de </body>.
// Detecta a página atual pela URL e destaca o ícone correspondente.
// Totalmente auto-contido (CSS + HTML próprios) — não depende de
// nenhuma variável ou classe já existente na página que o inclui.

(function(){
  const SUPABASE_URL = 'https://gbbjpltqmbhlfluqhrmg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYmpwbHRxbWJobGZsdXFocm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDY3ODAsImV4cCI6MjA5ODkyMjc4MH0.Gi3iw6IMyJ_6wrOG3WOcHPTW5Mo1IROTH3x_2qTyzrA';

  const MODULOS = [
    { href: 'index.html', icon: '🏠', label: 'Início', roles: null },
    { href: 'tarefas.html', icon: '🗂️', label: 'Quadro de Tarefas', roles: null },
    { href: 'calendario-interno.html', icon: '🗓️', label: 'Calendário Interno', roles: null },
    { href: 'rh.html', icon: '🗂️', label: 'Central de RH', roles: null },
    { href: 'visitas-medicas.html', icon: '🩺', label: 'Visitas de Representantes', roles: ['chefia'] },
    { href: 'cliente-fiel.html', icon: '💳', label: 'Cliente Fiel', roles: ['chefia','recepcao','conferencia','atendente'] },
    { href: 'rotulos.html', icon: '🏷️', label: 'Controle de Rótulos', roles: ['chefia','recepcao','conferencia','atendente'] },
    { href: 'producao.html', icon: '🧪', label: 'Ordem de Produção', roles: ['chefia','laboratorio','conferencia','atendente'] },
    { href: 'controle-producao.html', icon: '📋', label: 'Controle de Produção', roles: ['chefia','laboratorio'] },
    { href: 'reaproveitamento.html', icon: '♻️', label: 'Reaproveitamento', roles: ['chefia','conferencia'] },
    { href: 'erros.html', icon: '✍️', label: 'Registro de Erros', roles: ['chefia','conferencia'] },
    { href: 'inclusoes.html', icon: '🧮', label: 'Inclusões & Performance', roles: ['chefia','conferencia'] },
    { href: 'meus-erros.html', icon: '📈', label: 'Meus Erros', roles: null },
    { href: 'chat.html', icon: '💬', label: 'Chat Interno', roles: null },
    { href: 'wanessia.html', icon: '🤖', label: 'Wanessia', roles: null },
    { href: 'vendas-yampi.html', icon: '📊', label: 'Vendas (Yampi)', roles: ['chefia','gestao'] },
    { href: 'admin.html', icon: '🔐', label: 'Administração', roles: ['chefia'] },
  ];

  function injetarEstilos(){
    const css = `
      body{padding-left:76px !important;}
      .hub-sidebar{position:fixed;left:0;top:0;bottom:0;width:76px;background:#5E1027;
        display:flex;flex-direction:column;align-items:center;padding:20px 0;z-index:90;overflow-y:auto;}
      .hub-sidebar::-webkit-scrollbar{width:0;}
      .hub-sidebar .hs-mark{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.12);
        display:flex;align-items:center;justify-content:center;margin-bottom:20px;color:#fff;font-weight:700;
        font-family:'Space Grotesk','Maven Pro',sans-serif;font-size:15px;flex-shrink:0;}
      .hub-sidebar nav{display:flex;flex-direction:column;gap:6px;flex:1;}
      .hs-btn{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;
        color:rgba(255,255,255,.65);text-decoration:none;font-size:19px;cursor:pointer;border:none;
        background:transparent;transition:.15s;position:relative;flex-shrink:0;font-family:inherit;}
      .hs-btn:hover{background:rgba(255,255,255,.1);color:#fff;}
      .hs-btn.active{background:#fff;color:#8B1A3A;}
      .hs-badge{position:absolute;top:2px;right:2px;background:#E84040;color:#fff;font-size:9.5px;font-weight:700;
        min-width:16px;height:16px;border-radius:8px;display:none;align-items:center;justify-content:center;padding:0 3px;
        font-family:'Maven Pro',sans-serif;line-height:1;}
      .hs-badge.show{display:flex;}
      .hs-btn .hs-tooltip{position:fixed;left:64px;background:#161213;color:#fff;font-size:11.5px;
        padding:5px 10px;border-radius:6px;white-space:nowrap;opacity:0;pointer-events:none;transition:.12s;z-index:200;}
      .hs-btn:hover .hs-tooltip{opacity:1;}
      .hub-sidebar .hs-bottom{display:flex;flex-direction:column;gap:6px;flex-shrink:0;}

      @media (max-width:720px){
        body{padding-left:0 !important;padding-bottom:64px !important;}
        .hub-sidebar{left:0;right:0;top:auto;bottom:0;width:auto;height:64px;flex-direction:row;padding:0 8px;
          overflow-x:auto;overflow-y:hidden;}
        .hub-sidebar .hs-mark{display:none;}
        .hub-sidebar nav{flex-direction:row;gap:2px;}
        .hub-sidebar .hs-bottom{flex-direction:row;gap:2px;}
        .hs-btn .hs-tooltip{display:none;}
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function paginaAtual(){
    return location.pathname.split('/').pop() || 'index.html';
  }

  function montarBotao(m){
    const atual = paginaAtual() === m.href;
    const btn = document.createElement('a');
    btn.href = m.href;
    btn.className = 'hs-btn' + (atual ? ' active' : '');
    btn.dataset.roles = m.roles ? m.roles.join(',') : '';
    btn.innerHTML = `${m.icon}<span class="hs-tooltip">${m.label}</span>${m.href==='chat.html' ? '<span class="hs-badge" id="hsBadgeChat"></span>' : ''}`;
    btn.addEventListener('mouseenter', () => {
      const tip = btn.querySelector('.hs-tooltip');
      const rect = btn.getBoundingClientRect();
      tip.style.top = (rect.top + rect.height/2) + 'px';
      tip.style.transform = 'translateY(-50%)';
    });
    return btn;
  }

  function injetarSidebar(){
    const aside = document.createElement('div');
    aside.className = 'hub-sidebar';

    const mark = document.createElement('div');
    mark.className = 'hs-mark';
    mark.textContent = 'B';
    aside.appendChild(mark);

    const nav = document.createElement('nav');
    MODULOS.forEach(m => nav.appendChild(montarBotao(m)));
    aside.appendChild(nav);

    const bottom = document.createElement('div');
    bottom.className = 'hs-bottom';
    const senhaBtn = document.createElement('a');
    senhaBtn.href = 'alterar-senha.html';
    senhaBtn.className = 'hs-btn';
    senhaBtn.innerHTML = '🔑<span class="hs-tooltip">Alterar senha</span>';
    const sairBtn = document.createElement('button');
    sairBtn.className = 'hs-btn';
    sairBtn.innerHTML = '↩️<span class="hs-tooltip">Sair</span>';
    sairBtn.addEventListener('click', async () => {
      const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supa.auth.signOut();
      window.location.href = 'login.html';
    });
    bottom.appendChild(senhaBtn);
    bottom.appendChild(sairBtn);
    aside.appendChild(bottom);

    document.body.prepend(aside);
    return aside;
  }

  async function calcularNaoLidasChat(supa, userId){
    try{
      const { data: canais } = await supa.from('canais_chat').select('id');
      const idsCanais = (canais||[]).map(c=>c.id);
      let totalCanais = 0;
      if(idsCanais.length){
        const { data: leituras } = await supa.from('canais_leitura').select('canal_id,lida_ate').eq('usuario_id', userId);
        const leituraPorCanal = {};
        (leituras||[]).forEach(l => { leituraPorCanal[l.canal_id] = l.lida_ate; });
        const trintaDias = new Date(Date.now() - 30*24*60*60*1000).toISOString();
        const { data: msgs } = await supa.from('mensagens_chat').select('canal_id,criado_em').in('canal_id', idsCanais).neq('autor_id', userId).gte('criado_em', trintaDias);
        (msgs||[]).forEach(m => {
          const lida = leituraPorCanal[m.canal_id];
          if(!lida || m.criado_em > lida) totalCanais++;
        });
      }
      const { count: totalDms } = await supa.from('dm_mensagens').select('id', {count:'exact', head:true}).eq('destinatario_id', userId).eq('lida', false);
      return totalCanais + (totalDms||0);
    }catch(e){ return 0; }
  }

  function atualizarBadgeChat(total){
    const badge = document.getElementById('hsBadgeChat');
    if(!badge) return;
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.classList.toggle('show', total > 0);
  }

  async function aplicarPermissoes(aside){
    try{
      const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { session } } = await supa.auth.getSession();
      if(!session) return;
      const { data: perfil } = await supa.from('perfis').select('papel').eq('id', session.user.id).maybeSingle();
      const papel = perfil?.papel || 'sem_papel';
      aside.querySelectorAll('.hs-btn[data-roles]').forEach(btn => {
        const roles = btn.dataset.roles;
        if(roles && !roles.split(',').includes(papel)) btn.style.display = 'none';
      });

      // Não mostra o badge de "não lidas" pra quem já está DENTRO do chat
      if(paginaAtual() !== 'chat.html'){
        const total = await calcularNaoLidasChat(supa, session.user.id);
        atualizarBadgeChat(total);
        setInterval(async () => {
          const t = await calcularNaoLidasChat(supa, session.user.id);
          atualizarBadgeChat(t);
        }, 30000);
      }
    }catch(e){ /* se der erro, deixa tudo visível — melhor mostrar de mais do que travar a navegação */ }
  }

  function iniciar(){
    // Se a página já carregou o supabase-js, ótimo; senão carrega
    // uma cópia só pra sidebar funcionar (não interfere na página).
    injetarEstilos();
    const aside = injetarSidebar();
    if(window.supabase){
      aplicarPermissoes(aside);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => aplicarPermissoes(aside);
      document.head.appendChild(script);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
