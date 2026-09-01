// acessibilidade.js — Hub Bioflora
// Widget flutuante de acessibilidade. Pra usar em qualquer página do
// Hub, é só incluir uma linha antes de </body>:
//   <script src="acessibilidade.js"></script>
// Não depende de mais nada — injeta o próprio botão, painel e CSS.

(function(){
  const NIVEIS_FONTE = ['100%','115%','130%','150%','170%'];
  const LABELS_FONTE = ['Padrão','Grande','Maior','Muito grande','Máxima'];

  let nivelFonte = parseInt(localStorage.getItem('a11y_fonte') || '0', 10);
  let contraste = localStorage.getItem('a11y_contraste') === '1';
  let temaEscuro = localStorage.getItem('a11y_escuro') === '1';
  let espacado = localStorage.getItem('a11y_espacado') === '1';
  let leituraFacil = localStorage.getItem('a11y_leitura') === '1';

  function salvar(){
    localStorage.setItem('a11y_fonte', nivelFonte);
    localStorage.setItem('a11y_contraste', contraste ? '1' : '0');
    localStorage.setItem('a11y_escuro', temaEscuro ? '1' : '0');
    localStorage.setItem('a11y_espacado', espacado ? '1' : '0');
    localStorage.setItem('a11y_leitura', leituraFacil ? '1' : '0');
  }

  function aplicar(){
    document.documentElement.style.zoom = NIVEIS_FONTE[nivelFonte];
    document.documentElement.classList.toggle('a11y-contraste', contraste);
    document.documentElement.classList.toggle('a11y-escuro', temaEscuro && !contraste);
    document.documentElement.classList.toggle('a11y-espacado', espacado);
    document.documentElement.classList.toggle('a11y-leitura', leituraFacil);
    atualizarPainel();
  }

  function atualizarPainel(){
    const fonteLabel = document.getElementById('a11yFonteLabel');
    if(fonteLabel) fonteLabel.textContent = LABELS_FONTE[nivelFonte];
    const tContraste = document.getElementById('a11yToggleContraste');
    if(tContraste) tContraste.classList.toggle('on', contraste);
    const tEscuro = document.getElementById('a11yToggleEscuro');
    if(tEscuro) tEscuro.classList.toggle('on', temaEscuro);
    const tEspacado = document.getElementById('a11yToggleEspacado');
    if(tEspacado) tEspacado.classList.toggle('on', espacado);
    const tLeitura = document.getElementById('a11yToggleLeitura');
    if(tLeitura) tLeitura.classList.toggle('on', leituraFacil);
  }

  function injetarEstilos(){
    const css = `
      .a11y-fab{position:fixed;bottom:22px;right:22px;width:52px;height:52px;border-radius:50%;
        background:#8B1A3A;color:#fff;border:none;font-size:24px;cursor:pointer;
        box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:9999;display:flex;align-items:center;justify-content:center;}
      .a11y-fab:hover{background:#6E1430;}
      .a11y-panel{position:fixed;bottom:82px;right:22px;background:#fff;border:1px solid #E7DFE0;
        border-radius:14px;padding:18px;width:260px;box-shadow:0 8px 30px rgba(0,0,0,.18);z-index:9999;
        display:none;font-family:'Maven Pro',sans-serif;}
      .a11y-panel.show{display:block;}
      .a11y-panel h4{font-size:13px;margin:0 0 14px;color:#2A2224;font-weight:700;}
      .a11y-block{margin-bottom:16px;}
      .a11y-block:last-child{margin-bottom:0;}
      .a11y-label{font-size:11.5px;color:#6E6266;font-weight:600;margin-bottom:8px;display:block;}
      .a11y-fonte-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .a11y-fonte-row button{font-size:16px;width:30px;height:30px;border-radius:6px;border:1px solid #E7DFE0;background:#FBF9F7;cursor:pointer;color:#2A2224;}
      .a11y-fonte-row span{font-size:12px;color:#2A2224;flex:1;text-align:center;}
      .a11y-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:0;font-size:12.5px;color:#2A2224;}
      .a11y-toggle{position:relative;width:38px;height:20px;border-radius:12px;background:#E7DFE0;cursor:pointer;border:none;flex-shrink:0;}
      .a11y-toggle.on{background:#8B1A3A;}
      .a11y-toggle::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.15s;}
      .a11y-toggle.on::after{left:20px;}
      .a11y-reset{width:100%;margin-top:14px;font-size:11.5px;color:#6E6266;background:none;border:none;cursor:pointer;text-decoration:underline;}

      html.a11y-espacado body, html.a11y-espacado body *{letter-spacing:.03em !important; word-spacing:.06em !important;}
      html.a11y-espacado p, html.a11y-espacado li, html.a11y-espacado td, html.a11y-espacado .desc{line-height:1.85 !important;}

      html.a11y-leitura body{font-family:Arial, Helvetica, sans-serif !important;}

      html.a11y-contraste{
        --burgundy:#FFD600 !important; --burgundy-tint:transparent !important;
        --ink:#FFFFFF !important; --paper:#000000 !important; --line:#777777 !important; --gray:#DDDDDD !important;
        --good:#00E676 !important; --good-tint:transparent !important;
        --bad:#FF5252 !important; --bad-tint:transparent !important;
        --warn:#FFD600 !important; --warn-tint:transparent !important;
        --info:#40C4FF !important; --info-tint:transparent !important;
      }
      html.a11y-contraste body{background:#000 !important;color:#fff !important;}
      html.a11y-contraste *:not(.a11y-fab):not(.a11y-panel):not(.a11y-panel *){
        background:transparent !important;
        color:#fff !important;
        border-color:#777 !important;
        box-shadow:none !important;
      }
      html.a11y-contraste input:not(.a11y-fab), html.a11y-contraste select, html.a11y-contraste textarea{
        background:#000 !important; color:#fff !important; border:1px solid #999 !important;
      }
      html.a11y-contraste a{color:#FFD600 !important; text-decoration:underline;}

      /* Tema escuro por inversão de cor — mesma técnica que extensões
         de "modo escuro forçado" usam. Não depende de nenhuma classe,
         variável ou estrutura da página: funciona igual em qualquer
         tela, presente ou futura, garantido. */
      html.a11y-escuro{
        filter: invert(1) hue-rotate(180deg);
        background:#fff;
      }
      html.a11y-escuro img, html.a11y-escuro video, html.a11y-escuro svg image,
      html.a11y-escuro .a11y-fab, html.a11y-escuro .a11y-panel{
        filter: invert(1) hue-rotate(180deg); /* desfaz a inversão só nessas, senão fotos ficam com cor estranha */
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injetarWidget(){
    const fab = document.createElement('button');
    fab.className = 'a11y-fab';
    fab.title = 'Acessibilidade';
    fab.setAttribute('aria-label', 'Abrir opções de acessibilidade');
    fab.textContent = '♿';

    const painel = document.createElement('div');
    painel.className = 'a11y-panel';
    painel.innerHTML = `
      <h4>Acessibilidade</h4>
      <div class="a11y-block">
        <span class="a11y-label">Tamanho da fonte</span>
        <div class="a11y-fonte-row">
          <button id="a11yFonteMenos" aria-label="Diminuir fonte">A-</button>
          <span id="a11yFonteLabel">Padrão</span>
          <button id="a11yFonteMais" aria-label="Aumentar fonte">A+</button>
        </div>
      </div>
      <div class="a11y-block a11y-row">
        <span class="a11y-label" style="margin:0">🌙 Tema escuro</span>
        <button class="a11y-toggle" id="a11yToggleEscuro" aria-label="Ativar tema escuro"></button>
      </div>
      <div class="a11y-block a11y-row" style="margin-top:12px">
        <span class="a11y-label" style="margin:0">Alto contraste</span>
        <button class="a11y-toggle" id="a11yToggleContraste" aria-label="Ativar alto contraste"></button>
      </div>
      <div class="a11y-block a11y-row" style="margin-top:12px">
        <span class="a11y-label" style="margin:0">Espaçamento de leitura</span>
        <button class="a11y-toggle" id="a11yToggleEspacado" aria-label="Ativar espaçamento de leitura"></button>
      </div>
      <div class="a11y-block a11y-row" style="margin-top:12px">
        <span class="a11y-label" style="margin:0">Fonte de leitura fácil</span>
        <button class="a11y-toggle" id="a11yToggleLeitura" aria-label="Ativar fonte de leitura fácil"></button>
      </div>
      <button class="a11y-reset" id="a11yReset">Restaurar padrão</button>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(painel);

    fab.addEventListener('click', () => painel.classList.toggle('show'));
    document.addEventListener('click', (e) => {
      if(!painel.contains(e.target) && e.target !== fab) painel.classList.remove('show');
    });

    document.getElementById('a11yFonteMais').addEventListener('click', () => {
      nivelFonte = Math.min(nivelFonte+1, NIVEIS_FONTE.length-1);
      aplicar(); salvar();
    });
    document.getElementById('a11yFonteMenos').addEventListener('click', () => {
      nivelFonte = Math.max(nivelFonte-1, 0);
      aplicar(); salvar();
    });
    document.getElementById('a11yToggleEscuro').addEventListener('click', () => {
      temaEscuro = !temaEscuro;
      if(temaEscuro) contraste = false;
      aplicar(); salvar();
    });
    document.getElementById('a11yToggleContraste').addEventListener('click', () => {
      contraste = !contraste;
      if(contraste) temaEscuro = false;
      aplicar(); salvar();
    });
    document.getElementById('a11yToggleEspacado').addEventListener('click', () => {
      espacado = !espacado; aplicar(); salvar();
    });
    document.getElementById('a11yToggleLeitura').addEventListener('click', () => {
      leituraFacil = !leituraFacil; aplicar(); salvar();
    });
    document.getElementById('a11yReset').addEventListener('click', () => {
      nivelFonte = 0; contraste = false; temaEscuro = false; espacado = false; leituraFacil = false;
      aplicar(); salvar();
    });
  }

  function iniciar(){
    injetarEstilos();
    injetarWidget();
    aplicar();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
