// trava-scroll.js — Hub Bioflora
// Quando um pop-up (modal) está aberto, trava a rolagem da página de fora
// e deixa rolar só o conteúdo de dentro do pop-up.
// Detecta sozinho qualquer elemento fixo que cobre a tela (nao depende do nome da
// classe de cada modulo), entao vale pra todos os pop-ups do Hub.
// Carregado por bootstrapper com carimbo de hora (hub-sidebar.js e index.html).

(function(){
  if(window.__hubTravaScroll) return;
  window.__hubTravaScroll = true;

  const style = document.createElement('style');
  style.textContent = `
    html.hub-scroll-travado, html.hub-scroll-travado body{overflow:hidden !important;}
    .modal-overlay, .expandido-overlay, .overlay, .lead-overlay{overscroll-behavior:contain;}
  `;
  document.head.appendChild(style);

  const CANDIDATOS = '.modal-overlay, .expandido-overlay, .overlay, .lead-overlay, body > div[style*="position:fixed"], body > div[style*="position: fixed"]';
  let popupsAbertos = [];

  function cobreATela(el){
    if(el.closest('.hub-sidebar, .sidebar')) return false;
    const cs = getComputedStyle(el);
    if(cs.display === 'none' || cs.visibility === 'hidden' || cs.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.8;
  }

  function atualizar(){
    popupsAbertos = Array.from(document.querySelectorAll(CANDIDATOS)).filter(cobreATela);
    document.documentElement.classList.toggle('hub-scroll-travado', popupsAbertos.length > 0);
  }

  let agendado = false;
  function agendar(){
    if(agendado) return;
    agendado = true;
    setTimeout(() => { agendado = false; atualizar(); }, 30);
  }

  // iOS: overflow:hidden no body nem sempre impede a rolagem por baixo. Barra o gesto de
  // toque quando ele não está dentro de uma área do pop-up que realmente rola.
  function temRolagemInterna(alvo){
    let el = alvo;
    while(el && el !== document.body){
      const oy = getComputedStyle(el).overflowY;
      if((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
      if(popupsAbertos.includes(el)) break;
      el = el.parentElement;
    }
    return false;
  }
  document.addEventListener('touchmove', (e) => {
    if(!popupsAbertos.length) return;
    if(!popupsAbertos.some(p => p.contains(e.target))) { e.preventDefault(); return; }
    if(!temRolagemInterna(e.target)) e.preventDefault();
  }, { passive:false });

  new MutationObserver(agendar).observe(document.body, {
    childList:true, subtree:true, attributes:true, attributeFilter:['class','style']
  });
  window.addEventListener('resize', agendar);
  atualizar();
})();
