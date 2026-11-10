// Cliente Fiel · pedidos de resgate feitos pelos clientes no app (fiel.html). Usado por cliente-fiel.html.
// A equipe aprova (os pontos saem e o brinde fica reservado), recusa (com motivo) ou marca como retirado.
// Depende das globais de cliente-fiel.html: supa, escapar, abaAtivaCF, desenharAbasCF, trocarAbaCF.
let pedidosPendentesCF = 0, cadastrosPendentesCF = 0, filtroPedidosCF = 'pendente';

async function carregarBadgePedidosCF(){
  try{
    const [a, b, c] = await Promise.all([
      supa.from('fidelidade_pedidos').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      supa.from('clientes_fidelidade').select('id', { count: 'exact', head: true }).eq('tipo_cadastro', 'App').is('codigo_formula_certa', null),
      supa.from('fiel_atualizacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente')]);
    const novo = (a.count || 0) + (b.count || 0) + (c.count || 0), subiu = novo > pedidosPendentesCF;
    pedidosPendentesCF = novo; cadastrosPendentesCF = (b.count || 0) + (c.count || 0);
    desenharAbasCF(abaAtivaCF);
    if(subiu && abaAtivaCF === 'pedidos') renderPedidosCF();
  }catch(e){}
}

const STATUS_PED = { pendente: ['Aguardando', '#8F6210', '#FBF1E0'], aprovado: ['Aprovado · aguardando retirada', '#2F7A5F', '#E6F2EC'], entregue: ['Retirado', '#4A4245', '#EFE8EA'], recusado: ['Recusado', '#B4472F', '#FBEBE6'], cancelado: ['Cancelado pelo cliente', '#4A4245', '#EFE8EA'] };
const fmtDHPed = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function renderPedidosCF(){
  const main = document.getElementById('cfMain');
  main.innerHTML = '<div class="empty-state">Carregando pedidos…</div>';
  const { data, error } = await supa.from('fidelidade_pedidos').select('*, clientes_fidelidade(nome,telefone), fidelidade_brindes(nome)').order('criado_em', { ascending: false }).limit(200);
  if(error){ main.innerHTML = '<div class="empty-state">Erro ao carregar: ' + escapar(error.message) + '</div>'; return; }
  const todos = data || [];
  if(filtroPedidosCF === 'cadastros'){ await renderCadastrosAppCF(main, todos); return; }
  const lista = todos.filter(p => filtroPedidosCF === 'pendente' ? p.status === 'pendente' : filtroPedidosCF === 'aprovado' ? p.status === 'aprovado' : ['entregue', 'recusado', 'cancelado'].includes(p.status));
  const cont = s => todos.filter(p => s === 'hist' ? ['entregue', 'recusado', 'cancelado'].includes(p.status) : p.status === s).length;
  const filtro = (id, rot) => `<button class="btn ${filtroPedidosCF === id ? '' : 'secondary'} small" onclick="filtroPedidosCF='${id}';renderPedidosCF()">${rot} (${cont(id)})</button>`;
  main.innerHTML = `
    <h1 style="font-family:var(--headfont);font-size:22px;margin:0 0 4px;">Pedidos de resgate</h1>
    <p style="font-size:13px;color:var(--gray);margin:0 0 14px;">Pedidos feitos pelos clientes no app Cliente Fiel. Ao aprovar, os pontos saem do cliente e o brinde fica reservado para retirada.</p>
    <div id="boxPushEquipe"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">${filtro('pendente', 'Aguardando')}${filtro('aprovado', 'Para retirar')}${filtro('hist', 'Histórico')}<button class="btn secondary small" onclick="filtroPedidosCF='cadastros';renderPedidosCF()">Cadastros do app (${cadastrosPendentesCF})</button></div>
    ${lista.length ? lista.map(p => {
      const c = p.clientes_fidelidade || {}, b = p.fidelidade_brindes || {}, st = STATUS_PED[p.status];
      const fone = String(c.telefone || '').replace(/\D/g, '');
      const acoes = p.status === 'pendente' ? `<button class="btn small" onclick="atenderPedidoCF('${p.id}','aprovar')">Aprovar</button><button class="btn secondary small" onclick="atenderPedidoCF('${p.id}','recusar')">Recusar</button>`
        : p.status === 'aprovado' ? `<button class="btn small" onclick="atenderPedidoCF('${p.id}','retirado')">Marcar como retirado</button>` : '';
      return `<div class="panel" style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;"><div><b style="font-size:16px;">${escapar(c.nome || 'Cliente')}</b><div style="font-size:14px;margin-top:2px;">quer <b>${escapar(b.nome || 'brinde')}</b> · ${p.pontos} pontos</div></div><div style="text-align:right;"><span style="display:inline-block;border-radius:20px;padding:2px 12px;font-size:12px;font-weight:700;background:${st[2]};color:${st[1]};">${st[0]}</span><div style="font-size:12px;color:var(--gray);margin-top:4px;">${fmtDHPed(p.criado_em)}</div></div></div>
        ${p.resposta ? `<div style="font-size:13px;color:var(--gray);margin-top:6px;">Resposta: ${escapar(p.resposta)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${acoes}${fone.length >= 10 ? `<a class="btn secondary small" target="_blank" rel="noopener" href="https://wa.me/55${fone.replace(/^55(?=\d{10,11}$)/, '')}">WhatsApp</a>` : ''}</div></div>`; }).join('') : '<div class="empty-state">Nenhum pedido nesta lista.</div>'}`;
  prepararPushEquipeCF();
}
window.renderPedidosCF = renderPedidosCF;

async function atenderPedidoCF(id, acao){
  let resposta = null;
  if(acao === 'aprovar'){ resposta = prompt('Mensagem para o cliente (opcional). Ex.: "Pode retirar a partir de amanhã."', ''); if(resposta === null) return; }
  else if(acao === 'recusar'){ resposta = prompt('Motivo da recusa (o cliente vai ver):', ''); if(resposta === null) return; }
  else if(!confirm('Marcar como retirado?')) return;
  const { data, error } = await supa.rpc('fiel_atender_pedido', { p_pedido: id, p_acao: acao, p_resposta: resposta });
  if(error || !data || !data.ok){
    const m = { ja_atendido: 'Esse pedido já foi atendido.', sem_estoque: 'Brinde sem estoque. Ajuste o estoque em Brindes.', saldo_insuficiente: 'O cliente não tem mais pontos suficientes.', sem_permissao: 'Sem permissão.' }[data && data.erro];
    alert(m || 'Não foi possível concluir: ' + (error ? error.message : 'erro')); }
  await carregarBadgePedidosCF(); renderPedidosCF();
}
window.atenderPedidoCF = atenderPedidoCF;

// Aviso (push) para a equipe: pedido novo chega como notificação neste aparelho
function b64Bytes(s){ s = s.replace(/-/g, '+').replace(/_/g, '/'); const p = '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from([...atob(s + p)].map(c => c.charCodeAt(0))); }
async function prepararPushEquipeCF(){
  const box = document.getElementById('boxPushEquipe'); if(!box) return;
  if(!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
  const { data: chave } = await supa.rpc('fiel_vapid'); if(!chave) return;
  const reg = await navigator.serviceWorker.ready, atual = await reg.pushManager.getSubscription();
  if(atual && Notification.permission === 'granted'){ box.innerHTML = '<p style="font-size:12.5px;color:var(--good);margin:0 0 12px;">🔔 Este aparelho recebe aviso de pedido novo.</p>'; return; }
  box.innerHTML = '<div class="panel" style="margin-bottom:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;"><span style="flex:1;font-size:13.5px;">🔔 Receba um aviso neste aparelho quando chegar um pedido novo.</span><button class="btn small" id="btnPushEquipe">Ativar avisos</button></div>';
  document.getElementById('btnPushEquipe').onclick = async () => {
    try{
      if(await Notification.requestPermission() !== 'granted'){ alert('Sem permissão para avisos neste navegador.'); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64Bytes(chave) });
      const { data: { session } } = await supa.auth.getSession();
      const { error } = await supa.from('push_equipe').upsert({ usuario_id: session.user.id, endpoint: sub.endpoint, sub: sub.toJSON() }, { onConflict: 'endpoint' });
      if(error) throw error;
      prepararPushEquipeCF();
    }catch(e){ alert('Não foi possível ativar os avisos neste aparelho.'); }
  };
}
setInterval(() => { if(!document.hidden && typeof supa !== 'undefined' && supa) carregarBadgePedidosCF(); }, 30000);

// Cadastros feitos pelos clientes no app: novos (aguardando o código de cliente) e dados informados que diferem dos que temos
const CAMPO_ROT = { nome: 'nome', cpf: 'CPF', telefone: 'telefone', email: 'e-mail', data_nascimento: 'data de nascimento', genero: 'gênero' };
async function renderCadastrosAppCF(main, todosPedidos){
  const [novos, atual] = await Promise.all([
    supa.from('clientes_fidelidade').select('id,nome,cpf,telefone,criado_em').eq('tipo_cadastro', 'App').is('codigo_formula_certa', null).order('criado_em', { ascending: false }),
    supa.from('fiel_atualizacoes').select('*, clientes_fidelidade(nome)').eq('status', 'pendente').order('criado_em', { ascending: false })]);
  const botoes = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;"><button class="btn secondary small" onclick="filtroPedidosCF='pendente';renderPedidosCF()">← Pedidos</button><button class="btn small">Cadastros do app (${cadastrosPendentesCF})</button></div>`;
  const fmt = (c, v) => c === 'data_nascimento' ? new Date(v + 'T12:00:00').toLocaleDateString('pt-BR') : c === 'genero' ? (v === 'F' ? 'Feminino' : 'Masculino') : v;
  main.innerHTML = `<h1 style="font-family:var(--headfont);font-size:22px;margin:0 0 4px;">Cadastros feitos pelo app</h1>
    <p style="font-size:13px;color:var(--gray);margin:0 0 14px;">Clientes que se cadastraram ou completaram os dados no app Cliente Fiel.</p>${botoes}
    <h2 style="font-size:16px;margin:0 0 8px;">Novos cadastros aguardando o código de cliente (${(novos.data || []).length})</h2>
    ${(novos.data || []).length ? novos.data.map(c => `<div class="panel" style="margin-bottom:10px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;"><div><b>${escapar(c.nome)}</b><div style="font-size:13px;color:var(--gray);">${escapar(c.cpf || '')} · ${escapar(c.telefone || '')} · ${new Date(c.criado_em).toLocaleDateString('pt-BR')}</div></div><button class="btn small" onclick="abrirFichaCliente('${c.id}')">Abrir ficha e vincular o código</button></div>`).join('') : '<div class="empty-state">Nenhum cadastro novo aguardando.</div>'}
    <h2 style="font-size:16px;margin:18px 0 8px;">Dados informados diferentes dos que temos (${(atual.data || []).length})</h2>
    ${(atual.data || []).length ? atual.data.map(a => `<div class="panel" style="margin-bottom:10px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;"><div><b>${escapar((a.clientes_fidelidade || {}).nome || 'Cliente')}</b> informou outro <b>${CAMPO_ROT[a.campo]}</b>: ${escapar(fmt(a.campo, a.valor))}</div><div style="display:flex;gap:8px;"><button class="btn small" onclick="atenderAtualizacaoCF('${a.id}','aplicar')">Atualizar cadastro</button><button class="btn secondary small" onclick="atenderAtualizacaoCF('${a.id}','ignorar')">Ignorar</button></div></div>`).join('') : '<div class="empty-state">Nenhuma diferença para conferir.</div>'}`;
}
async function atenderAtualizacaoCF(id, acao){
  const { data, error } = await supa.rpc('fiel_aplicar_atualizacao', { p_id: id, p_acao: acao });
  if(error || !data || !data.ok) alert(data && data.erro === 'cpf_em_uso' ? 'Esse CPF já está em outro cadastro.' : 'Não foi possível concluir.');
  await carregarBadgePedidosCF(); renderPedidosCF();
}
window.atenderAtualizacaoCF = atenderAtualizacaoCF;
