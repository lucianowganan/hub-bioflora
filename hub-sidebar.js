// hub-sidebar.js — Hub Bioflora
// Barra lateral com todos os módulos, igual em toda página do Hub.
// Carregado por um pequeno bootstrapper em cada página (não por uma
// tag <script src="..."> fixa) — esse bootstrapper busca sempre a
// versão mais nova, com um carimbo de hora na URL, então esse
// arquivo pode ser atualizado à vontade sem precisar mexer em mais
// nada nas outras páginas nem se preocupar com cache do navegador.
// Detecta a página atual pela URL e destaca o ícone correspondente.
// Totalmente auto-contido (CSS + HTML próprios) — não depende de
// nenhuma variável ou classe já existente na página que o inclui.
// Ícones são SVG (não emoji) -- passar o mouse expande a barra e
// mostra o nome de cada módulo ao lado do ícone.

(function(){
  const SUPABASE_URL = 'https://gbbjpltqmbhlfluqhrmg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYmpwbHRxbWJobGZsdXFocm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDY3ODAsImV4cCI6MjA5ODkyMjc4MH0.Gi3iw6IMyJ_6wrOG3WOcHPTW5Mo1IROTH3x_2qTyzrA';

  // Ícones em SVG (linha, estilo minimalista), 24x24, currentColor.
  const ICONES = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-6h4v6"/>',
    kanban: '<rect x="4" y="4" width="4.5" height="16" rx="1"/><rect x="9.75" y="4" width="4.5" height="10" rx="1"/><rect x="15.5" y="4" width="4.5" height="13" rx="1"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3v3.2M16 3v3.2"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/>',
    pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><circle cx="17" cy="9" r="2.3"/><path d="M15.2 14.5c2.6.2 4.6 2.2 4.8 5"/>',
    estetoscopio: '<path d="M6 4v6a4 4 0 0 0 8 0V4"/><path d="M6 4H4.5M14 4h1.5"/><path d="M10 14v2.5a4.5 4.5 0 0 0 9 0V15"/><circle cx="19.3" cy="12.7" r="1.7"/>',
    cartao: '<rect x="3.5" y="6" width="17" height="12.5" rx="2"/><path d="M3.5 10h17"/><path d="M6.5 14.5h4"/>',
    etiqueta: '<path d="M11.5 4H6a2 2 0 0 0-2 2v5.5L13.5 21 21 13.5 11.5 4Z"/><circle cx="8.3" cy="8.3" r="1.4"/>',
    frasco: '<path d="M10 3.5h4"/><path d="M10.5 3.5v5.3L5.8 17a2.5 2.5 0 0 0 2.2 3.7h8a2.5 2.5 0 0 0 2.2-3.7l-4.7-8.2V3.5"/><path d="M8 15h8"/>',
    prancheta: '<rect x="5" y="4.5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="3" rx="1"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5"/>',
    reciclar: '<path d="M9.5 4.5 6.7 9.2m0 0 3 1.7m-3-1.7-1 3.3"/><path d="M14.5 4.5h3.4a2 2 0 0 1 1.7 1L21.5 9"/><path d="M17.5 19.5h-3.9m0 0 1.9-3m-1.9 3 1.9 3"/><path d="M5.8 15.3l-1.7 3a2 2 0 0 0 0 2l1.9 3.2"/><path d="M18.2 15.3l1.7 3-1.5 2.6"/>',
    lapis: '<path d="M4 20l1-4.2L15.5 5.3a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L8.2 19 4 20Z"/><path d="M13.7 7.1l3.2 3.2"/>',
    grafico: '<path d="M4.5 20V10M11 20V4M17.5 20v-7"/><path d="M3.5 20.5h17.5"/>',
    puzzle: '<path d="M9 4.5h3.3a1.6 1.6 0 0 1 1.6 1.9 1.6 1.6 0 0 0 1.9 1.9h1.7a1.5 1.5 0 0 1 1.5 1.5V13a1.6 1.6 0 0 0-1.9-1.6 1.6 1.6 0 0 0 0 3.2A1.6 1.6 0 0 1 19 16.2v2.3a1.5 1.5 0 0 1-1.5 1.5h-2.3a1.6 1.6 0 0 0 1.6-1.9 1.6 1.6 0 0 0-3.2 0 1.6 1.6 0 0 0 1.6 1.9H5.5A1.5 1.5 0 0 1 4 18.5v-2.3a1.6 1.6 0 0 1 1.9-1.6 1.6 1.6 0 0 0 0-3.2A1.6 1.6 0 0 1 4 9.8V7.5A1.5 1.5 0 0 1 5.5 6h2.3A1.6 1.6 0 0 1 9 4.5Z"/>',
    tendencia: '<path d="M4 16.5 9.5 11l3.5 3.5L20 7"/><path d="M15 7h5v5"/>',
    chat: '<path d="M4 5.5h16v10.5H9.2L5 20V16H4V5.5Z"/><path d="M7.5 9h9M7.5 12.3h6"/>',
    robo: '<rect x="5" y="9" width="14" height="10.5" rx="2.5"/><path d="M12 5.5v3.5"/><circle cx="12" cy="4" r="1.2"/><circle cx="9" cy="14" r="1.3"/><circle cx="15" cy="14" r="1.3"/><path d="M3.3 12v4M20.7 12v4"/>',
    vendas: '<path d="M5 5h1.8l1 11.3A2 2 0 0 0 9.8 18h7.4a2 2 0 0 0 2-1.7L20.3 9H7.1"/><circle cx="10" cy="21" r="1.3"/><circle cx="17.5" cy="21" r="1.3"/>',
    email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4.5 7 12 12.5 19.5 7"/>',
    escudo: '<path d="M12 3.5 5 6v5.5c0 4.7 3 8 7 9 4-1 7-4.3 7-9V6l-7-2.5Z"/>',
    escudoCheck: '<path d="M12 3.5 5 6v5.5c0 4.7 3 8 7 9 4-1 7-4.3 7-9V6l-7-2.5Z"/><path d="M9 12l2 2 4-4"/>',
    chave: '<circle cx="8" cy="15" r="3.3"/><path d="M10.3 12.7 18 5m0 0h-3.2M18 5v3.2M14.7 8.3l2 2"/>',
    sair: '<path d="M9.5 20H5.5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5.5 4h4"/><path d="M15.5 16.5 20 12l-4.5-4.5"/><path d="M20 12H9.5"/>',
    editar: '<path d="M4 20l1-4.2L15.5 5.3a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L8.2 19 4 20Z"/><path d="M13.7 7.1l3.2 3.2"/>',
    check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    arrastar: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
  };

  function svg(nomeIcone){
    return `<svg class="hs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONES[nomeIcone]}</svg>`;
  }

  const MODULOS = [
    { href: 'index.html', icone: 'home', label: 'Início', perm: null },
    { href: 'tarefas.html', icone: 'kanban', label: 'Quadro de Tarefas', perm: 'modulo.tarefas' },
    { href: 'calendario-interno.html', icone: 'calendario', label: 'Calendário Interno', perm: 'modulo.calendario_interno' },
    { href: 'rh.html', icone: 'pessoas', label: 'Central de RH', perm: 'modulo.rh' },
    { href: 'visitas-medicas.html', icone: 'estetoscopio', label: 'Visitas de Representantes', perm: 'modulo.visitas' },
    { href: 'cliente-fiel.html', icone: 'cartao', label: 'Cliente Fiel', perm: 'modulo.cliente_fiel' },
    { href: 'rotulos.html', icone: 'etiqueta', label: 'Controle de Rótulos', perm: 'modulo.rotulos' },
    { href: 'producao.html', icone: 'frasco', label: 'Ordem de Produção', perm: 'modulo.producao' },
    { href: 'controle-producao.html', icone: 'prancheta', label: 'Controle de Produção', perm: 'modulo.controle_producao' },
    { href: 'reaproveitamento.html', icone: 'reciclar', label: 'Reaproveitamento', perm: 'modulo.reaproveitamento' },
    { href: 'erros.html', icone: 'lapis', label: 'Registro de Erros', perm: 'modulo.erros' },
    { href: 'inclusoes.html', icone: 'grafico', label: 'Inclusões & Performance', perm: 'modulo.inclusoes' },
    { href: 'calendario-editorial.html', icone: 'calendario', label: 'Calendário Editorial', perm: 'modulo.calendario_editorial' },
    { href: 'formulas-complexas.html', icone: 'puzzle', label: 'Fórmulas Complexas', perm: 'modulo.formulas_complexas' },
    { href: 'meus-erros.html', icone: 'tendencia', label: 'Meus Erros', perm: 'modulo.meus_erros' },
    { href: 'chat.html', icone: 'chat', label: 'Chat Interno', perm: 'modulo.chat' },
    { href: 'wanessia.html', icone: 'robo', label: 'Wanessia', perm: 'modulo.wanessia' },
    { href: 'vendas-yampi.html', icone: 'vendas', label: 'Vendas (Yampi)', perm: 'modulo.vendas' },
    { href: 'email-marketing.html', icone: 'email', label: 'Email Marketing', perm: 'modulo.email_marketing' },
    { href: 'admin.html', icone: 'escudo', label: 'Administração', perm: 'modulo.admin' },
    { href: 'cargos.html', icone: 'escudoCheck', label: 'Cargos & Permissões', perm: 'modulo.admin' },
  ];

  function injetarEstilos(){
    const css = `
      body{padding-left:76px !important;}
      .hub-sidebar{position:fixed;left:0;top:0;bottom:0;width:76px;background:#5E1027;
        display:flex;flex-direction:column;align-items:stretch;padding:20px 0;z-index:200;overflow:hidden;
        transition:width .16s ease;}
      .hub-sidebar:hover{width:250px;overflow-y:auto;}
      .hub-sidebar.hs-editando{width:250px !important;overflow-y:auto;}
      .hub-sidebar::-webkit-scrollbar{width:0;}
      .hub-sidebar .hs-mark-row{display:flex;align-items:center;gap:12px;padding:0 16px;margin-bottom:20px;flex-shrink:0;}
      .hub-sidebar .hs-mark{width:38px;height:38px;min-width:38px;border-radius:10px;background:rgba(255,255,255,.12);
        display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;
        font-family:'Space Grotesk','Maven Pro',sans-serif;font-size:15px;flex-shrink:0;}
      .hub-sidebar .hs-mark-nome{color:#fff;font-family:'Space Grotesk','Maven Pro',sans-serif;font-weight:600;
        font-size:14.5px;white-space:nowrap;opacity:0;transition:opacity .12s;}
      .hub-sidebar:hover .hs-mark-nome{opacity:1;}
      .hub-sidebar nav{display:flex;flex-direction:column;gap:4px;flex:1;}
      .hs-btn{display:flex;align-items:center;gap:14px;height:42px;min-height:42px;border-radius:10px;
        color:rgba(255,255,255,.65);text-decoration:none;cursor:pointer;border:none;background:transparent;
        transition:background .15s,color .15s;position:relative;flex-shrink:0;font-family:'Maven Pro',sans-serif;
        font-size:13px;font-weight:600;width:calc(100% - 16px);margin:0 8px;padding:0 11px;white-space:nowrap;
        box-sizing:border-box;}
      .hs-btn .hs-icon{width:21px;height:21px;min-width:21px;flex-shrink:0;}
      .hs-btn .hs-label{opacity:0;transition:opacity .1s;}
      .hub-sidebar:hover .hs-btn .hs-label{opacity:1;}
      .hs-btn:hover{background:rgba(255,255,255,.1);color:#fff;}
      .hs-btn.active{background:#fff;color:#8B1A3A;}
      .hs-badge{position:absolute;top:2px;left:26px;background:#E84040;color:#fff;font-size:9.5px;font-weight:700;
        min-width:16px;height:16px;border-radius:8px;display:none;align-items:center;justify-content:center;padding:0 3px;
        font-family:'Maven Pro',sans-serif;line-height:1;}
      .hs-badge.show{display:flex;}
      .hs-arrastavel{cursor:grab;}
      .hs-arrastavel:active{cursor:grabbing;}
      .hs-arrastando{opacity:.35;}
      .hs-drag-over{outline:2px dashed rgba(255,255,255,.6);}
      .hub-sidebar .hs-bottom{display:flex;flex-direction:column;gap:4px;flex-shrink:0;}

      @media (max-width:720px){
        body{padding-left:0 !important;padding-bottom:64px !important;}
        .hub-sidebar{left:0;right:0;top:auto;bottom:0;width:auto !important;height:64px;flex-direction:row;
          padding:0 4px;overflow-x:auto;overflow-y:hidden;align-items:center;}
        .hub-sidebar .hs-mark-row{display:none;}
        .hub-sidebar nav{flex-direction:row;gap:0;flex:none;}
        .hub-sidebar .hs-bottom{flex-direction:row;gap:0;}
        .hs-btn{width:56px;min-width:56px;height:56px;margin:0;padding:0;flex-direction:column;
          justify-content:center;gap:2px;border-radius:10px;}
        .hs-btn .hs-label{display:none;}
        .hs-badge{left:auto;right:8px;top:6px;}
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function paginaAtual(){
    return location.pathname.split('/').pop() || 'index.html';
  }

  let modoEdicaoSidebar = false;
  let ordemPersonalizada = null; // array de hrefs, vindo do banco (ou null se nunca customizou)
  let itemArrastadoHref = null;
  let navRefEl = null;
  let supaRefGlobal = null;
  let userIdRefGlobal = null;
  let minhasPermissoesRefGlobal = null;

  function montarBotao(m){
    const atual = paginaAtual() === m.href;
    const btn = document.createElement('a');
    btn.href = m.href;
    btn.className = 'hs-btn' + (atual ? ' active' : '');
    if(m.perm) btn.dataset.perm = m.perm;
    btn.innerHTML = `${svg(m.icone)}<span class="hs-label">${m.label}</span>${m.href==='chat.html' ? '<span class="hs-badge" id="hsBadgeChat"></span>' : ''}${modoEdicaoSidebar ? svg('arrastar') : ''}`;
    return btn;
  }

  function modulosVisiveisOrdenados(){
    const visiveis = MODULOS.filter(m => !m.perm || !minhasPermissoesRefGlobal || minhasPermissoesRefGlobal.has(m.perm));
    if(!ordemPersonalizada || !ordemPersonalizada.length) return visiveis;
    const porHref = {};
    visiveis.forEach(m => { porHref[m.href] = m; });
    const ordenados = [];
    ordemPersonalizada.forEach(href => { if(porHref[href]){ ordenados.push(porHref[href]); delete porHref[href]; } });
    Object.values(porHref).forEach(m => ordenados.push(m)); // módulo novo, ainda não tá na ordem salva -- vai pro final
    return ordenados;
  }

  function renderNav(){
    if(!navRefEl) return;
    const lista = modulosVisiveisOrdenados();
    navRefEl.innerHTML = '';
    lista.forEach(m => {
      const btn = montarBotao(m);
      if(modoEdicaoSidebar){
        btn.draggable = true;
        btn.classList.add('hs-arrastavel');
        btn.addEventListener('click', (e)=> e.preventDefault()); // não navega enquanto tá reorganizando
        btn.addEventListener('dragstart', ()=>{ itemArrastadoHref = m.href; btn.classList.add('hs-arrastando'); });
        btn.addEventListener('dragend', ()=>{ btn.classList.remove('hs-arrastando'); });
        btn.addEventListener('dragover', (e)=>{ e.preventDefault(); btn.classList.add('hs-drag-over'); });
        btn.addEventListener('dragleave', ()=> btn.classList.remove('hs-drag-over'));
        btn.addEventListener('drop', (e)=>{
          e.preventDefault();
          btn.classList.remove('hs-drag-over');
          if(!itemArrastadoHref || itemArrastadoHref === m.href) return;
          const atual = lista.map(x=>x.href);
          const doIdx = atual.indexOf(itemArrastadoHref);
          const paraIdx = atual.indexOf(m.href);
          atual.splice(doIdx,1);
          atual.splice(paraIdx,0,itemArrastadoHref);
          ordemPersonalizada = atual;
          renderNav();
          salvarOrdemSidebar(atual);
        });
      }
      navRefEl.appendChild(btn);
    });
  }

  async function salvarOrdemSidebar(ordem){
    if(!supaRefGlobal || !userIdRefGlobal) return;
    try{
      await supaRefGlobal.from('preferencias_hub').upsert(
        { user_id: userIdRefGlobal, sidebar_ordem: ordem, atualizado_em: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    }catch(e){ /* silencioso -- reordenar é conveniência, não trava a navegação se falhar */ }
  }

  function toggleModoEdicaoSidebar(){
    modoEdicaoSidebar = !modoEdicaoSidebar;
    const aside = document.querySelector('.hub-sidebar');
    if(aside) aside.classList.toggle('hs-editando', modoEdicaoSidebar);
    const btnEditar = document.getElementById('hsBtnEditarOrdem');
    if(btnEditar) btnEditar.innerHTML = modoEdicaoSidebar
      ? `${svg('check')}<span class="hs-label">Concluir</span>`
      : `${svg('editar')}<span class="hs-label">Reorganizar</span>`;
    renderNav();
  }

  function injetarSidebar(){
    const aside = document.createElement('div');
    aside.className = 'hub-sidebar';

    const markRow = document.createElement('div');
    markRow.className = 'hs-mark-row';
    markRow.innerHTML = `<div class="hs-mark">B</div><span class="hs-mark-nome">Hub Bioflora</span>`;
    aside.appendChild(markRow);

    const nav = document.createElement('nav');
    navRefEl = nav;
    aside.appendChild(nav);

    const bottom = document.createElement('div');
    bottom.className = 'hs-bottom';
    const editarBtn = document.createElement('button');
    editarBtn.className = 'hs-btn';
    editarBtn.id = 'hsBtnEditarOrdem';
    editarBtn.innerHTML = `${svg('editar')}<span class="hs-label">Reorganizar</span>`;
    editarBtn.addEventListener('click', toggleModoEdicaoSidebar);
    const senhaBtn = document.createElement('a');
    senhaBtn.href = 'alterar-senha.html';
    senhaBtn.className = 'hs-btn';
    senhaBtn.innerHTML = `${svg('chave')}<span class="hs-label">Alterar senha</span>`;
    const sairBtn = document.createElement('button');
    sairBtn.className = 'hs-btn';
    sairBtn.innerHTML = `${svg('sair')}<span class="hs-label">Sair</span>`;
    sairBtn.addEventListener('click', async () => {
      const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supa.auth.signOut();
      window.location.href = 'login.html';
    });
    bottom.appendChild(editarBtn);
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
      minhasPermissoesRefGlobal = minhasPermissoes;
      supaRefGlobal = supa;
      userIdRefGlobal = session.user.id;

      try{
        const { data: pref } = await supa.from('preferencias_hub').select('sidebar_ordem').eq('user_id', session.user.id).maybeSingle();
        ordemPersonalizada = pref?.sidebar_ordem || null;
      }catch(e){ ordemPersonalizada = null; }

      renderNav();

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

      // Avisos do Calendário Editorial (criados pela chefia pra uma
      // data específica) -- mesmo público do módulo, uma vez por dia
      if(['chefia','gestao','conferencia','atendente'].includes(papel)){
        verificarAvisosCalendarioEditorial(supa);
      }
    }catch(e){ /* se der erro, deixa tudo visível — melhor mostrar de mais do que travar a navegação */ }
  }

  function localDateStrHS(d){ const off=d.getTimezoneOffset(); return new Date(d.getTime()-off*60000).toISOString().slice(0,10); }

  async function verificarAvisosCalendarioEditorial(supa){
    const hojeStr = localDateStrHS(new Date());
    const chave = 'calendario_avisos_popup_' + hojeStr;
    if(localStorage.getItem(chave)) return;

    try{
      const { data, error } = await supa.from('calendario_avisos').select('mensagem').eq('data', hojeStr);
      if(error || !data || !data.length) return;
      localStorage.setItem(chave, '1');
      mostrarPopupAvisosCalendario(data.map(a=>a.mensagem));
    }catch(e){ /* silencioso */ }
  }

  function mostrarPopupAvisosCalendario(mensagens){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:400px;width:100%;font-family:'Maven Pro',sans-serif;">
        <div style="font-size:36px;margin-bottom:8px;text-align:center;">📣</div>
        <h3 style="font-family:'Space Grotesk',sans-serif;font-size:17px;margin:0 0 14px;color:#8B1A3A;text-align:center;">Aviso de hoje</h3>
        <div style="margin-bottom:20px;">
          ${mensagens.map(m => `<div style="background:#F7E9EE;border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:13.5px;color:#2A2224;">${m}</div>`).join('')}
        </div>
        <div style="text-align:center;">
          <button id="hsAvisoCalFechar" style="font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:600;padding:10px 22px;border-radius:8px;border:none;background:#8B1A3A;color:#fff;cursor:pointer;">Entendi</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('hsAvisoCalFechar').addEventListener('click', () => overlay.remove());
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
