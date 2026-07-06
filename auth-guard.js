// auth-guard.js — usado por todos os módulos do Hub Bioflora
// Pressupõe que a variável `supa` (cliente Supabase) já foi criada antes deste script rodar.

async function requireRole(allowedRoles){
  const { data: { session } } = await supa.auth.getSession();
  if(!session){
    window.location.href = 'login.html';
    throw new Error('sem sessão — redirecionando para login');
  }
  const { data: perfil } = await supa.from('perfis').select('papel').eq('id', session.user.id).maybeSingle();
  const papel = perfil ? perfil.papel : 'sem_papel';
  if(!allowedRoles.includes(papel)){
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
