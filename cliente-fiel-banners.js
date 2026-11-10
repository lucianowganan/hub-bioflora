// Cliente Fiel: gestão dos banners de promoção exibidos no app do cliente (fiel.html)
const escBn = s => String(s==null?"":s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
let bannersCF = [];
async function renderBannersCF(){
  const main = document.getElementById('cfMain');
  main.innerHTML = '<div class="empty-state">Carregando...</div>';
  const { data, error } = await supa.from('fiel_banners').select('*').order('ordem').order('criado_em', { ascending:false });
  if(error){ main.innerHTML = '<div class="empty-state">Sem permissão para ver os banners.</div>'; return; }
  bannersCF = data || [];
  const hoje = new Date().toISOString().slice(0,10);
  const estado = b => !b.ativo ? 'Desligado' : (b.inicio && b.inicio > hoje) ? 'Agendado' : (b.fim && b.fim < hoje) ? 'Expirado' : 'No ar';
  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <h1 style="font-family:var(--headfont);font-size:22px;margin:0;">Banners do app</h1>
      <button class="btn dark" onclick="abrirBannerCF()">+ Novo banner</button>
    </div>
    <p style="color:var(--gray);margin:0 0 16px;font-size:14px;">Aparecem no topo do app do cliente, em carrossel. Use para promoções, campanhas e avisos.</p>
    <div class="brinde-grid">${bannersCF.length ? bannersCF.map(b => `
      <div class="brinde-card">
        ${b.imagem_url ? `<img src="${escBn(b.imagem_url)}" alt="">` : `<div class="brinde-emoji-placeholder">${ico('presente')}</div>`}
        <div class="brinde-nome">${escBn(b.titulo)}</div>
        <div style="font-size:12px;color:var(--gray)">${escBn(b.texto||'')}</div>
        <div style="font-size:12px;margin-top:6px;font-weight:700">${estado(b)}${b.fim ? ' · até ' + b.fim.split('-').reverse().join('/') : ''}</div>
        <div style="margin-top:10px;display:flex;gap:6px;">
          <button class="btn secondary" style="flex:1;font-size:11px;padding:7px;" onclick="abrirBannerCF('${b.id}')">Editar</button>
          <button class="btn secondary" style="font-size:11px;padding:7px 10px;" onclick="alternarBannerCF('${b.id}')">${b.ativo ? 'Desligar' : 'Ligar'}</button>
          <button class="btn secondary" style="color:var(--bad);font-size:11px;padding:7px 10px;" onclick="excluirBannerCF('${b.id}')">Excluir</button>
        </div>
      </div>`).join('') : '<div class="empty-state">Nenhum banner ainda. Crie o primeiro.</div>'}</div>`;
}
window.renderBannersCF = renderBannersCF;

function abrirBannerCF(id){
  const b = bannersCF.find(x => x.id === id) || { titulo:'', texto:'', cor:'vinho', ordem:0, ativo:true };
  document.getElementById('bnModalCF')?.remove();
  const m = document.createElement('div'); m.id = 'bnModalCF';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
  const f = 'width:100%;padding:10px;border:1.5px solid var(--line);border-radius:10px;font:inherit;margin-bottom:10px';
  m.innerHTML = `<div style="background:#fff;border-radius:18px;padding:22px;max-width:460px;width:100%;max-height:92vh;overflow:auto">
    <h2 style="margin:0 0 14px;font-family:var(--headfont)">${id ? 'Editar' : 'Novo'} banner</h2>
    <label>Título *</label><input id="bnT" style="${f}" maxlength="60" value="${escBn(b.titulo)}">
    <label>Texto</label><input id="bnX" style="${f}" maxlength="120" value="${escBn(b.texto||'')}">
    <label>Cor (quando não há imagem)</label><select id="bnC" style="${f}">${['vinho','dourado','verde','azul'].map(c => `<option value="${c}" ${b.cor===c?'selected':''}>${c}</option>`).join('')}</select>
    <label>Imagem de fundo (opcional)</label><input type="file" id="bnI" accept="image/*" style="${f}">
    ${b.imagem_url ? `<label style="font-weight:400"><input type="checkbox" id="bnRI"> Remover imagem atual</label>` : ''}
    <label>Link (opcional, https://...)</label><input id="bnL" style="${f}" value="${escBn(b.link_url||'')}">
    <label>Texto do botão (se houver link)</label><input id="bnB" style="${f}" maxlength="24" value="${escBn(b.botao||'')}" placeholder="Ver mais">
    <div style="display:flex;gap:10px"><div style="flex:1"><label>Começa em</label><input type="date" id="bnD1" style="${f}" value="${b.inicio||''}"></div><div style="flex:1"><label>Termina em</label><input type="date" id="bnD2" style="${f}" value="${b.fim||''}"></div></div>
    <label>Ordem (menor aparece primeiro)</label><input type="number" id="bnO" style="${f}" value="${b.ordem||0}">
    <div style="display:flex;gap:10px;margin-top:6px"><button class="btn secondary" style="flex:1" onclick="document.getElementById('bnModalCF').remove()">Cancelar</button><button class="btn dark" style="flex:1" id="bnSalvar" onclick="salvarBannerCF('${id||''}')">Salvar</button></div></div>`;
  document.body.appendChild(m);
}
window.abrirBannerCF = abrirBannerCF;

async function salvarBannerCF(id){
  const v = i => document.getElementById(i).value.trim();
  const titulo = v('bnT'); if(!titulo){ alert('Digite o título.'); return; }
  let link = v('bnL'); if(link && !/^https:\/\//i.test(link)){ alert('O link deve começar com https://'); return; }
  const btn = document.getElementById('bnSalvar'); btn.disabled = true;
  const atual = bannersCF.find(x => x.id === id);
  let imagem = atual ? atual.imagem_url : null;
  if(document.getElementById('bnRI')?.checked) imagem = null;
  const arq = document.getElementById('bnI').files[0];
  if(arq){
    if(arq.size > 4*1024*1024){ alert('Imagem muito grande (máx. 4 MB).'); btn.disabled = false; return; }
    const ext = (arq.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path = `banners/${Date.now()}.${ext}`;
    const up = await supa.storage.from('fiel').upload(path, arq, { contentType: arq.type });
    if(up.error){ alert('Não foi possível enviar a imagem.'); btn.disabled = false; return; }
    imagem = supa.storage.from('fiel').getPublicUrl(path).data.publicUrl;
  }
  const reg = { titulo, texto: v('bnX') || null, cor: v('bnC'), imagem_url: imagem, link_url: link || null, botao: v('bnB') || null, inicio: v('bnD1') || null, fim: v('bnD2') || null, ordem: parseInt(v('bnO')) || 0 };
  const r = id ? await supa.from('fiel_banners').update(reg).eq('id', id).select('id') : await supa.from('fiel_banners').insert(reg).select('id');
  btn.disabled = false;
  if(r.error || !r.data || !r.data.length){ alert('Não foi possível salvar (sem permissão?).'); return; }
  document.getElementById('bnModalCF').remove(); renderBannersCF();
}
window.salvarBannerCF = salvarBannerCF;

async function alternarBannerCF(id){
  const b = bannersCF.find(x => x.id === id); if(!b) return;
  const r = await supa.from('fiel_banners').update({ ativo: !b.ativo }).eq('id', id).select('id');
  if(r.error || !r.data?.length) alert('Sem permissão.'); renderBannersCF();
}
window.alternarBannerCF = alternarBannerCF;

async function excluirBannerCF(id){
  if(!confirm('Excluir este banner?')) return;
  const r = await supa.from('fiel_banners').delete().eq('id', id).select('id');
  if(r.error || !r.data?.length) alert('Sem permissão.'); renderBannersCF();
}
window.excluirBannerCF = excluirBannerCF;
