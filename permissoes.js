// permissoes.js — Hub Bioflora
// Helper compartilhado do sistema de Cargos & Permissões (migração 54).
// Uso: <script src="permissoes.js"></script> depois de criar o client
// `supa` na página. Expõe duas funções globais:
//   await buscarMinhasPermissoes(supa, papel) -> Set de chaves ou null
//   await temPermissao(supa, papel, 'chave.da.permissao') -> boolean

async function buscarMinhasPermissoes(supa, papel){
  try{
    const { data, error } = await supa
      .from('papel_permissoes')
      .select('permissoes(chave), papeis!inner(chave)')
      .eq('papeis.chave', papel);
    if(error || !data) return null; // null = "não deu pra checar" -- quem chamar decide o que fazer (mais seguro tratar como liberado do que travar a pessoa à toa)
    return new Set(data.map(r => r.permissoes?.chave).filter(Boolean));
  }catch(e){ return null; }
}

async function temPermissao(supa, papel, chave){
  const permissoes = await buscarMinhasPermissoes(supa, papel);
  if(!permissoes) return true; // fallback seguro
  return permissoes.has(chave);
}
