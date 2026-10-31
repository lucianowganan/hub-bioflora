// auth-guard.js — usado por todos os módulos do Hub Bioflora
// Pressupõe que a variável `supa` (cliente Supabase) já foi criada antes deste script rodar.

const PERMISSAO_DA_PAGINA = {
  'calendario-editorial':'modulo.calendario_editorial','calendario-interno':'modulo.calendario_interno','chat':'modulo.chat',
  'cliente-fiel':'modulo.cliente_fiel','conferencia-formulas':'modulo.conferencia','controle-producao':'modulo.controle_producao',
  'email-marketing':'modulo.email_marketing','embalagens':'modulo.embalagens','erros':'modulo.erros','formulas-complexas':'modulo.formulas_complexas',
  'inclusoes':'modulo.inclusoes','instagram':'modulo.instagram','meus-erros':'modulo.meus_erros','producao':'modulo.producao',
  'reaproveitamento':'modulo.reaproveitamento','rh':'modulo.rh','rotulos':'modulo.rotulos','tarefas':'modulo.tarefas',
  'vendas-yampi':'modulo.vendas','visitas-medicas':'modulo.visitas','wanessia':'modulo.wanessia','cargos':'modulo.admin','vet-contatos':'modulo.vet'
};

async function requireRole(allowedRoles){
  const { data: { session } } = await supa.auth.getSession();
  if(!session){
    window.location.href = 'login.html';
    throw new Error('sem sessão — redirecionando para login');
  }
  const { data: perfil } = await supa.from('perfis').select('papel').eq('id', session.user.id).maybeSingle();
  const papel = perfil ? perfil.papel : 'sem_papel';
  // Acesso ao módulo = permissão "modulo.*" do cargo (Cargos & Permissões); a lista fixa de papéis só vale
  // para páginas sem permissão cadastrada ou se a consulta falhar. A chefia sempre entra.
  let liberado = allowedRoles.includes(papel);
  const chavePerm = PERMISSAO_DA_PAGINA[(location.pathname.split('/').pop() || '').replace(/\.html$/, '')];
  if(chavePerm){
    if(papel === 'chefia') liberado = true;
    else try{
      const { data: perms, error } = await supa.from('papel_permissoes').select('permissoes(chave), papeis!inner(chave)').eq('papeis.chave', papel);
      if(!error && perms) liberado = perms.some(r => r.permissoes && r.permissoes.chave === chavePerm);
    }catch(e){}
  }
  if(!liberado){
    document.body.innerHTML = `
      <div style="max-width:420px;margin:80px auto;text-align:center;font-family:'Maven Pro',sans-serif;color:#2A2224;">
        <div style="font-size:40px;margin-bottom:14px;">🔒</div>
        <p style="font-size:14px;line-height:1.6;">Você não tem permissão para acessar este módulo.<br>
        Seu papel atual: <strong>${papel}</strong>.<br>
        Peça para a chefia liberar o acesso na tela de administração.</p>
        <a href="index.html" style="display:inline-block;margin-top:16px;background:#8B1A3A;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">← Voltar ao Hub</a>
      </div>`;
    throw new Error('acesso negado para o papel: ' + papel);
  }
  return { session, papel };
}

async function logout(){
  await supa.auth.signOut();
  window.location.href = 'login.html';
}
