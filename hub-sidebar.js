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
    { href: 'index.html', icon: '🏠', label: 'Início', perm: null },
    { href: 'tarefas.html', icon: '🗂️', label: 'Quadro de Tarefas', perm: 'modulo.tarefas' },
    { href: 'calendario-interno.html', icon: '🗓️', label: 'Calendário Interno', perm: 'modulo.calendario_interno' },
    { href: 'rh.html', icon: '🗂️', label: 'Central de RH', perm: 'modulo.rh' },
    { href: 'visitas-medicas.html', icon: '🩺', label: 'Visitas de Representantes', perm: 'modulo.visitas' },
    { href: 'cliente-fiel.html', icon: '💳', label: 'Cliente Fiel', perm: 'modulo.cliente_fiel' },
    { href: 'rotulos.html', icon: '🏷️', label: 'Controle de Rótulos', perm: 'modulo.rotulos' },
    { href: 'producao.html', icon: '🧪', label: 'Ordem de Produção', perm: 'modulo.producao' },
    { href: 'controle-producao.html', icon: '📋', label: 'Controle de Produção', perm: 'modulo.controle_producao' },
    { href: 'reaproveitamento.html', icon: '♻️', label: 'Reaproveitamento', perm: 'modulo.reaproveitamento' },
    { href: 'erros.html', icon: '✍️', label: 'Registro de Erros', perm: 'modulo.erros' },
    { href: 'inclusoes.html', icon: '🧮', label: 'Inclusões & Performance', perm: 'modulo.inclusoes' },
    { href: 'formulas-complexas.html', icon: '🧩', label: 'Fórmulas Complexas', perm: 'modulo.formulas_complexas' },
    { href: 'meus-erros.html', icon: '📈', label: 'Meus Erros', perm: 'modulo.meus_erros' },
    { href: 'chat.html', icon: '💬', label: 'Chat Interno', perm: 'modulo.chat' },
    { href: 'wanessia.html', icon: '🤖', label: 'Wanessia', perm: 'modulo.wanessia' },
    { href: 'vendas-yampi.html', icon: '📊', label: 'Vendas (Yampi)', perm: 'modulo.vendas' },
    { href: 'admin.html', icon: '🔐', label: 'Administração', perm: 'modulo.admin' },
    { href: 'cargos.html', icon: '🛡️', label: 'Cargos & Permissões', perm: 'modulo.admin' },
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
    if(m.perm) btn.dataset.perm = m.perm;
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

  async function buscarMinhasPermissoes(supa, papel){
    try{
      const { data, error } = await supa
        .from('papel_permissoes')
        .select('permissoes(chave), papeis!inner(chave)')
        .eq('papeis.chave', papel);
      if(error || !data) return null; // null = "não deu pra checar" -- mostra tudo, mais seguro que esconder à toa
      return new Set(data.map(r => r.permissoes?.chave).filter(Boolean));
    }catch(e){ return null; }
  }

  async function aplicarPermissoes(aside){
    try{
      const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { session } } = await supa.auth.getSession();
      if(!session) return;
      const { data: perfil } = await supa.from('perfis').select('papel').eq('id', session.user.id).maybeSingle();
      const papel = perfil?.papel || 'sem_papel';

      const minhasPermissoes = await buscarMinhasPermissoes(supa, papel);
      aside.querySelectorAll('.hs-btn[data-perm]').forEach(btn => {
        const perm = btn.dataset.perm;
        if(perm && minhasPermissoes && !minhasPermissoes.has(perm)) btn.style.display = 'none';
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

      // Aviso de reaproveitamento pendente, 2x ao dia (10h e 15h),
      // só pra conferência — aparece em qualquer página do Hub
      if(papel === 'conferencia'){
        verificarAvisoReaproveitamento(supa);
        setInterval(() => verificarAvisoReaproveitamento(supa), 60000);
      }

      // Pop-up de previsão de fórmulas pra hoje (registrada ontem) --
      // pra chefia, conferência e atendente, uma vez por dia, assim
      // que abrem qualquer página do Hub
      if(['chefia','conferencia','atendente'].includes(papel)){
        verificarAvisoFormulasDiaSeguinte(supa);
      }
    }catch(e){ /* se der erro, deixa tudo visível — melhor mostrar de mais do que travar a navegação */ }
  }

  async function verificarAvisoFormulasDiaSeguinte(supa){
    const hojeStr = new Date().toISOString().slice(0,10);
    const chave = 'formulas_dia_seguinte_popup_' + hojeStr;
    if(localStorage.getItem(chave)) return;

    try{
      const ontem = new Date(); ontem.setDate(ontem.getDate()-1);
      const off = ontem.getTimezoneOffset();
      const ontemStr = new Date(ontem.getTime()-off*60000).toISOString().slice(0,10);
      const { data, error } = await supa.from('formulas_dia_seguinte').select('capsula,dermato').eq('data', ontemStr).maybeSingle();
      if(error || !data || (data.capsula===0 && data.dermato===0)) return;
      localStorage.setItem(chave, '1');
      mostrarPopupFormulasDiaSeguinte(data.capsula, data.dermato);
    }catch(e){ /* silencioso */ }
  }

  function mostrarPopupFormulasDiaSeguinte(capsula, dermato){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:380px;width:100%;font-family:'Maven Pro',sans-serif;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">📋</div>
        <h3 style="font-family:'Space Grotesk',sans-serif;font-size:17px;margin:0 0 14px;color:#8B1A3A;">Previsão de fórmulas pra hoje</h3>
        <div style="display:flex;gap:14px;justify-content:center;margin-bottom:20px;">
          <div style="background:#F7E9EE;border-radius:12px;padding:14px 22px;">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:600;color:#8B1A3A;">${capsula}</div>
            <div style="font-size:11px;color:#6E6266;text-transform:uppercase;">Cápsulas</div>
          </div>
          <div style="background:#F7E9EE;border-radius:12px;padding:14px 22px;">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:600;color:#8B1A3A;">${dermato}</div>
            <div style="font-size:11px;color:#6E6266;text-transform:uppercase;">Dermato</div>
          </div>
        </div>
        <button id="hsFormulasFechar" style="font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;border:none;background:#8B1A3A;color:#fff;cursor:pointer;">Entendi</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('hsFormulasFechar').addEventListener('click', () => overlay.remove());
  }

  async function verificarAvisoReaproveitamento(supa){
    const agora = new Date();
    const hora = agora.getHours();
    const janela = (hora === 10) ? '10h' : (hora === 15) ? '15h' : null;
    if(!janela) return;

    const chave = 'reaproveitamento_aviso_' + agora.toISOString().slice(0,10) + '_' + janela;
    if(localStorage.getItem(chave)) return;

    try{
      const { data, error } = await supa.from('manipulados_nao_retirados').select('id').eq('status','disponivel').limit(1);
      if(error || !data || !data.length) return;
      localStorage.setItem(chave, '1');
      mostrarPopupReaproveitamento();
    }catch(e){ /* silencioso — não trava a página por causa de um aviso */ }
  }

  function mostrarPopupReaproveitamento(){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:380px;width:100%;font-family:'Maven Pro',sans-serif;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">♻️</div>
        <h3 style="font-family:'Space Grotesk',sans-serif;font-size:17px;margin:0 0 8px;color:#8B1A3A;">Tem manipulado pra reaproveitar</h3>
        <p style="font-size:13.5px;color:#6E6266;margin:0 0 20px;">Existe pelo menos um item disponível pra reaproveitamento parado na fila. Dá uma olhada quando puder.</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="hsAvisoFechar" style="font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;border:1px solid #E7DFE0;background:#fff;cursor:pointer;">Depois</button>
          <a href="reaproveitamento.html" style="font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;border:none;background:#8B1A3A;color:#fff;cursor:pointer;text-decoration:none;display:inline-block;">Ver agora</a>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('hsAvisoFechar').addEventListener('click', () => overlay.remove());
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
