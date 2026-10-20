// RH · identidade única dos colaboradores (SÓ CHEFIA): histórico, pagamentos e vínculo de nomes.
// Depende das globais de rh.html: supa, todosColaboradores, meuPapelRH. A segurança real está no banco
// (funções rh_* e tabelas de pagamento só respondem à chefia); aqui só escondemos o que não cabe ao usuário.
(function(){
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtData = d => d ? String(d).slice(0,10).split('-').reverse().join('/') : '—';
  const hojeISO = () => new Date().toISOString().slice(0,10);

  const CATS = {
    cadastro:['Cadastro','#6b7280'], avaliacao:['Avaliação','#2563eb'], ocorrencia:['Ocorrência','#d97706'],
    advertencia:['Advertência','#dc2626'], rnc:['RNC','#b91c1c'], meta:['Meta','#0d9488'], custom:['Outros registros','#7c3aed'],
    ausencia:['Ausência','#ea580c'], ferias:['Férias','#16a34a'], ponto:['Ponto','#0891b2'], erros:['Erros','#e11d48'],
    inclusoes:['Inclusões','#4f46e5'], producao:['Produção','#a16207'], documento:['Documentos','#64748b'],
    aviso:['Avisos','#c026d3'], pagamento:['Pagamentos','#15803d'], salario:['Salário','#15803d']
  };
  const TIPOS_PAG = {salario:'Salário', reajuste:'Reajuste', vale:'Vale', adiantamento:'Adiantamento', comissao:'Comissão',
    bonus:'Bônus', ferias:'Pagamento de férias', decimo_terceiro:'13º salário', rescisao:'Rescisão', outro:'Outro'};
  const ehChefia = () => typeof meuPapelRH !== 'undefined' && meuPapelRH === 'chefia';

  const css = document.createElement('style');
  css.textContent = `
    .hx-modal{max-width:760px !important}
    .hx-tabs{display:flex;gap:6px;margin:0 0 12px;border-bottom:1px solid var(--line);}
    .hx-tabs button{border:0;background:none;padding:8px 12px;font:600 13px 'Maven Pro',sans-serif;color:var(--gray);cursor:pointer;border-bottom:2px solid transparent;}
    .hx-tabs button.on{color:var(--burgundy);border-color:var(--burgundy);}
    .hx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
    .hx-chip{border:1px solid var(--line);background:#fff;border-radius:20px;padding:4px 10px;font:600 11.5px 'Maven Pro',sans-serif;cursor:pointer;color:var(--gray);}
    .hx-chip.on{background:var(--burgundy);color:#fff;border-color:var(--burgundy);}
    .hx-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);}
    .hx-data{width:78px;flex-shrink:0;font-size:12px;color:var(--gray);padding-top:2px;}
    .hx-dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex-shrink:0;}
    .hx-tit{font-weight:600;font-size:13.5px;}
    .hx-det{font-size:12.5px;color:var(--gray);margin-top:2px;white-space:pre-wrap;}
    .hx-ori{font-size:11px;color:var(--gray);opacity:.8;margin-top:2px;}
    .hx-aviso{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;}
    .hx-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:12px 0;}
    .hx-form label{font-size:11.5px;color:var(--gray);display:block;margin-bottom:3px;}
    .hx-form input,.hx-form select{width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;font:13px 'Maven Pro',sans-serif;}
    .hx-tbl{width:100%;border-collapse:collapse;font-size:13px;}
    .hx-tbl th{text-align:left;font-size:11.5px;color:var(--gray);padding:6px 8px;border-bottom:1px solid var(--line);}
    .hx-tbl td{padding:8px;border-bottom:1px solid var(--line);vertical-align:middle;}
    .hx-btn{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 12px;font:600 12px 'Maven Pro',sans-serif;cursor:pointer;}
    .hx-btn.pri{background:var(--burgundy);color:#fff;border-color:var(--burgundy);}
    .hx-btn.del{color:var(--bad);}
    .hx-in{padding:7px;border:1px solid var(--line);border-radius:8px;font:13px 'Maven Pro',sans-serif;width:100%;min-width:160px;}
    @media(max-width:720px){.hx-item{flex-wrap:wrap}.hx-data{width:auto}.hx-tbl{display:block;overflow-x:auto}}
  `;
  document.head.appendChild(css);

  // ---------- Histórico por colaborador (modal) ----------
  let hx = null; // {id, nome, eventos, filtro, aba}

  window.abrirHistoricoColab = async function(id){
    if(!ehChefia()) return;
    const c = (todosColaboradores||[]).find(x => x.id === id);
    hx = {id, nome: c ? c.nome_completo : '', eventos: [], filtro: null, aba: 'linha'};
    let ov = document.getElementById('modalHistorico');
    if(!ov){
      ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'modalHistorico';
      ov.addEventListener('click', e => { if(e.target === ov) fecharHistoricoColab(); });
      document.body.appendChild(ov);
    }
    ov.innerHTML = '<div class="modal hx-modal"><p style="color:var(--gray)">Carregando histórico…</p></div>';
    ov.classList.add('show');
    const { data, error } = await supa.rpc('rh_historico', {p_colaborador: id});
    if(error){ ov.querySelector('.modal').innerHTML = `<p>Não foi possível carregar: ${escH(error.message)}</p><div class="modal-actions"><button class="hx-btn" onclick="fecharHistoricoColab()">Fechar</button></div>`; return; }
    hx.eventos = data || [];
    renderHistorico();
  };
  window.fecharHistoricoColab = function(){ const o = document.getElementById('modalHistorico'); if(o) o.classList.remove('show'); hx = null; };

  function renderHistorico(){
    const m = document.querySelector('#modalHistorico .modal'); if(!m || !hx) return;
    const cats = [...new Set(hx.eventos.map(e => e.categoria))];
    const lista = hx.filtro ? hx.eventos.filter(e => e.categoria === hx.filtro) : hx.eventos;
    const corpo = hx.aba === 'linha' ? `
      <div class="hx-chips">
        <button class="hx-chip ${hx.filtro?'':'on'}" onclick="hxFiltro(null)">Tudo (${hx.eventos.length})</button>
        ${cats.map(k => `<button class="hx-chip ${hx.filtro===k?'on':''}" onclick="hxFiltro('${k}')">${escH((CATS[k]||[k])[0])}</button>`).join('')}
      </div>
      ${lista.length ? lista.map(e => `
        <div class="hx-item"><div class="hx-data">${fmtData(e.quando)}</div>
          <div class="hx-dot" style="background:${(CATS[e.categoria]||['','#999'])[1]}"></div>
          <div><div class="hx-tit">${escH(e.titulo)}</div>${e.detalhe ? `<div class="hx-det">${escH(e.detalhe)}</div>` : ''}<div class="hx-ori">${escH(e.origem)}</div></div></div>`).join('')
        : '<p style="color:var(--gray)">Nada registrado para este colaborador ainda. Se esperava ver registros, confira em “Vincular nomes” se os nomes usados nos módulos estão ligados a este cadastro.</p>'}`
      : '<div id="hxPag">Carregando…</div>';
    m.innerHTML = `
      <h3>Histórico · ${escH(hx.nome)}</h3>
      <div class="hx-tabs">
        <button class="${hx.aba==='linha'?'on':''}" onclick="hxAba('linha')">Linha do tempo</button>
        <button class="${hx.aba==='pag'?'on':''}" onclick="hxAba('pag')">💰 Pagamentos (só chefia)</button>
      </div>${corpo}
      <div class="modal-actions"><button class="hx-btn" onclick="fecharHistoricoColab()">Fechar</button></div>`;
    if(hx.aba === 'pag') carregarPagamentos();
  }
  window.hxFiltro = k => { hx.filtro = k; renderHistorico(); };
  window.hxAba = a => { hx.aba = a; renderHistorico(); };

  async function carregarPagamentos(){
    const box = document.getElementById('hxPag'); if(!box || !hx) return;
    const { data, error } = await supa.from('colaborador_pagamentos').select('*').eq('colaborador_id', hx.id).order('data', {ascending:false});
    if(error){ box.innerHTML = 'Erro: ' + escH(error.message); return; }
    const total = (data||[]).reduce((s,p) => s + Number(p.valor||0), 0);
    box.innerHTML = `
      <div class="hx-aviso">🔒 Informação confidencial: só a chefia vê e edita estes dados. Nem o RH tem acesso.</div>
      <div class="hx-form">
        <div><label>Tipo</label><select id="pgTipo">${Object.entries(TIPOS_PAG).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div><label>Data</label><input id="pgData" type="date" value="${hojeISO()}"></div>
        <div><label>Competência</label><input id="pgComp" type="month"></div>
        <div><label>Valor (R$)</label><input id="pgValor" type="number" step="0.01" placeholder="0,00"></div>
        <div style="grid-column:1/-1"><label>Observação</label><input id="pgDesc" placeholder="Opcional"></div>
        <div><button class="hx-btn pri" onclick="hxAddPag()">Registrar</button></div>
      </div>
      ${(data||[]).length ? `<table class="hx-tbl"><thead><tr><th>Data</th><th>Tipo</th><th>Compet.</th><th>Valor</th><th>Obs.</th><th></th></tr></thead><tbody>
        ${data.map(p => `<tr><td>${fmtData(p.data)}</td><td>${escH(TIPOS_PAG[p.tipo]||p.tipo)}</td><td>${escH(p.competencia||'—')}</td>
          <td>${Number(p.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>${escH(p.descricao||'')}</td>
          <td><button class="hx-btn del" onclick="hxDelPag('${p.id}')">Excluir</button></td></tr>`).join('')}
        </tbody></table><p style="font-size:12px;color:var(--gray)">Soma dos lançamentos listados: ${total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>`
        : '<p style="color:var(--gray)">Nenhum pagamento registrado.</p>'}`;
  }

  window.hxAddPag = async function(){
    const valor = parseFloat(document.getElementById('pgValor').value);
    const data = document.getElementById('pgData').value;
    if(!data || isNaN(valor)){ alert('Informe a data e o valor.'); return; }
    const row = {colaborador_id: hx.id, tipo: document.getElementById('pgTipo').value, data, valor,
      competencia: document.getElementById('pgComp').value || null, descricao: document.getElementById('pgDesc').value.trim() || null};
    const { data: ses } = await supa.auth.getSession(); row.criado_por = ses?.session?.user?.id || null;
    const { data: ok, error } = await supa.from('colaborador_pagamentos').insert(row).select('id');
    if(error || !ok || !ok.length){ alert('Não foi possível registrar: ' + (error ? error.message : 'sem permissão')); return; }
    const r = await supa.rpc('rh_historico', {p_colaborador: hx.id}); hx.eventos = r.data || hx.eventos;
    carregarPagamentos();
  };
  window.hxDelPag = async function(id){
    if(!confirm('Excluir este lançamento de pagamento?')) return;
    const { data, error } = await supa.from('colaborador_pagamentos').delete().eq('id', id).select('id');
    if(error || !data || !data.length){ alert('Não foi possível excluir: ' + (error ? error.message : 'sem permissão')); return; }
    const r = await supa.rpc('rh_historico', {p_colaborador: hx.id}); hx.eventos = r.data || hx.eventos;
    carregarPagamentos();
  };

  // ---------- Aba “Vincular nomes” ----------
  let vn = {aba:'soltos', logins:[], nomes:[], feitos:[]};

  window.renderAbaVinculos = async function(){
    const main = document.getElementById('rhMain');
    if(!ehChefia()){ main.innerHTML = '<p>Somente a chefia acessa esta área.</p>'; return; }
    main.innerHTML = '<h2 style="font-family:var(--headfont)">Vincular nomes</h2><p style="color:var(--gray);max-width:640px">Cada pessoa tem um cadastro único. Aqui você liga os nomes digitados nos módulos (erros, ordens, avaliações…) e os logins do Hub ao cadastro do colaborador, para que tudo apareça no histórico dele.</p><p>Carregando…</p>';
    const [a, b, c] = await Promise.all([
      supa.rpc('rh_nomes_soltos'), supa.rpc('rh_logins'),
      supa.from('colaborador_apelidos').select('id,apelido,origem,colaborador_id').neq('origem','cadastro').order('apelido')
    ]);
    if(a.error || b.error){ main.insertAdjacentHTML('beforeend', `<p>Erro: ${escH((a.error||b.error).message)}</p>`); return; }
    vn.nomes = a.data || []; vn.logins = b.data || []; vn.feitos = c.data || [];
    desenharVinculos();
  };

  function nomeColab(id){ const c = (todosColaboradores||[]).find(x => x.id === id); return c ? c.nome_completo : '?'; }
  function idPorNome(txt){
    const t = (txt||'').trim().toLowerCase();
    const c = (todosColaboradores||[]).find(x => (x.nome_completo||'').toLowerCase() === t);
    return c ? c.id : null;
  }

  function desenharVinculos(){
    const main = document.getElementById('rhMain');
    const soltos = vn.nomes.filter(n => !n.apelido_id);
    const dl = `<datalist id="dlColabVinc">${(todosColaboradores||[]).filter(c => c.status !== 'desligado').map(c => `<option value="${escH(c.nome_completo)}">`).join('')}</datalist>`;
    let corpo = '';
    if(vn.aba === 'soltos'){
      const comSug = soltos.filter(n => n.sugestao_id);
      corpo = `${comSug.length ? `<p><button class="hx-btn pri" onclick="vnConfirmarTodas()">Confirmar as ${comSug.length} sugestões</button> <span style="font-size:12px;color:var(--gray)">A sugestão liga pelo primeiro nome quando só há um colaborador com ele. Confira antes.</span></p>` : ''}
        ${soltos.length ? `<table class="hx-tbl"><thead><tr><th>Nome nos módulos</th><th>Onde aparece</th><th>Colaborador (digite para buscar)</th><th></th></tr></thead><tbody>
        ${soltos.map((n,i) => `<tr><td><b>${escH(n.nome)}</b></td><td style="font-size:12px;color:var(--gray)">${escH(n.fontes)} · ${n.registros} reg.</td>
          <td><input class="hx-in" list="dlColabVinc" id="vnIn${i}" value="${escH(n.sugestao_nome||'')}" placeholder="Nome do colaborador"></td>
          <td><button class="hx-btn pri" onclick="vnVincular(${i})">Vincular</button></td></tr>`).join('')}</tbody></table>`
        : '<p>Tudo vinculado. 🎉</p>'}`;
    } else if(vn.aba === 'logins'){
      corpo = `<table class="hx-tbl"><thead><tr><th>Login</th><th>Papel</th><th>Colaborador (digite para buscar)</th><th></th></tr></thead><tbody>
        ${vn.logins.map((l,i) => `<tr><td><b>${escH(l.nome)}</b></td><td>${escH(l.papel)}</td>
          <td><input class="hx-in" list="dlColabVinc" id="vlIn${i}" value="${escH(l.colaborador_nome || l.sugestao_nome || '')}" placeholder="${l.colaborador_id ? '' : 'Sem vínculo'}"></td>
          <td><button class="hx-btn pri" onclick="vnLogin(${i})">${l.colaborador_id ? 'Atualizar' : 'Vincular'}</button>
          ${l.colaborador_id ? `<button class="hx-btn del" onclick="vnLoginDesfazer(${i})">Remover</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
    } else {
      corpo = vn.feitos.length ? `<table class="hx-tbl"><thead><tr><th>Nome nos módulos</th><th>Colaborador</th><th></th></tr></thead><tbody>
        ${vn.feitos.map(f => `<tr><td>${escH(f.apelido)}</td><td>${escH(nomeColab(f.colaborador_id))}</td>
          <td><button class="hx-btn del" onclick="vnDesfazer('${f.id}')">Desfazer</button></td></tr>`).join('')}</tbody></table>`
        : '<p style="color:var(--gray)">Nenhum vínculo manual feito ainda.</p>';
    }
    main.innerHTML = `<h2 style="font-family:var(--headfont)">Vincular nomes</h2>
      <p style="color:var(--gray);max-width:640px">Cada pessoa tem um cadastro único. Aqui você liga os nomes digitados nos módulos e os logins do Hub ao cadastro do colaborador, para tudo aparecer no histórico dele.</p>
      <div class="hx-tabs">
        <button class="${vn.aba==='soltos'?'on':''}" onclick="vnAba('soltos')">Nomes soltos (${soltos.length})</button>
        <button class="${vn.aba==='logins'?'on':''}" onclick="vnAba('logins')">Logins do Hub</button>
        <button class="${vn.aba==='feitos'?'on':''}" onclick="vnAba('feitos')">Vínculos feitos (${vn.feitos.length})</button>
      </div>${dl}${corpo}`;
  }
  window.vnAba = a => { vn.aba = a; desenharVinculos(); };

  async function vincular(nome, colabId){
    const { error } = await supa.rpc('rh_vincular_nome', {p_nome: nome, p_colaborador: colabId});
    if(error){ alert(error.message); return false; }
    return true;
  }
  window.vnVincular = async function(i){
    const soltos = vn.nomes.filter(n => !n.apelido_id); const n = soltos[i];
    const id = idPorNome(document.getElementById('vnIn'+i).value);
    if(!id){ alert('Escolha um colaborador da lista.'); return; }
    if(await vincular(n.nome, id)) renderAbaVinculos();
  };
  window.vnConfirmarTodas = async function(){
    const lista = vn.nomes.filter(n => !n.apelido_id && n.sugestao_id);
    if(!confirm(`Vincular ${lista.length} nomes às sugestões?`)) return;
    let falhas = 0;
    for(const n of lista){ if(!(await vincular(n.nome, n.sugestao_id))) { falhas++; break; } }
    renderAbaVinculos();
  };
  window.vnDesfazer = async function(id){
    if(!confirm('Desfazer este vínculo? Os registros antigos deixam de aparecer no histórico.')) return;
    const { data, error } = await supa.from('colaborador_apelidos').delete().eq('id', id).select('id');
    if(error || !data || !data.length){ alert('Não foi possível desfazer.'); return; }
    renderAbaVinculos();
  };
  window.vnLogin = async function(i){
    const l = vn.logins[i]; const id = idPorNome(document.getElementById('vlIn'+i).value);
    if(!id){ alert('Escolha um colaborador da lista.'); return; }
    const { error } = await supa.rpc('rh_vincular_login', {p_perfil: l.perfil_id, p_colaborador: id});
    if(error){ alert(error.message); return; }
    vn.aba = 'logins'; await renderAbaVinculos(); vn.aba = 'logins'; desenharVinculos();
  };
  window.vnLoginDesfazer = async function(i){
    const { error } = await supa.rpc('rh_vincular_login', {p_perfil: vn.logins[i].perfil_id, p_colaborador: null});
    if(error){ alert(error.message); return; }
    await renderAbaVinculos(); vn.aba = 'logins'; desenharVinculos();
  };
})();
