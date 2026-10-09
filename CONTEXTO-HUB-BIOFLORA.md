# Hub Bioflora — Contexto completo do projeto

Documento para dar a uma sessão nova (Claude Code) o mesmo contexto de quem construiu o Hub até aqui.
Leia inteiro antes de mexer em qualquer coisa: tem decisões de arquitetura, convenções, causas reais de bugs
e o estado exato de cada módulo. Atualizado em 07/10/2026.

---

## 1. O que é

Hub interno de gestão da **Farmácia Bioflora** (farmácia de manipulação). Substitui planilhas, papel e WhatsApp no controle
operacional: produção, RH, atendimento, vendas, chat interno, fidelidade de clientes etc.

Quem usa e como falar: o dono do projeto é o **Luciano** (marketing, não é dev de formação). Por isso o código prioriza
**simplicidade e manutenção** sobre arquitetura sofisticada. Equipe de uso: ~8 a 15 pessoas. Português do Brasil sempre.
Respostas curtas e diretas; ele valida testando no celular (**iPhone**) e no computador (e a equipe usa **tela dividida** no PC).

Cargos hoje no banco (contagem aproximada): chefia 3, rh 1, atendente 9, laboratorio 5, conferencia 2, cpd 1, sem_papel 1.
Existem também `gestao` e `recepcao` no código, sem usuários ainda.

## 2. Infraestrutura

- **Hospedagem**: GitHub Pages. Repo `lucianowganan/hub-bioflora`. Publica o que está no `main`.
- **Banco**: Supabase Cloud, project ref `gbbjpltqmbhlfluqhrmg`.
- **Domínio**: `hub.farmaciabioflora.blog.br`.
- **Stack**: HTML/CSS/JS puro, **sem framework e sem build**. Supabase JS, Chart.js e SheetJS (xlsx) via CDN.
  Zero custo de infraestrutura é restrição **intencional** (não é limitação a "resolver").
- Cada página declara no topo do `<script>`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `const supa = ...createClient(...)`.
- **Branch de trabalho**: `claude/brave-ritchie-dno4pf`. Fluxo usado: commit na branch + `git push origin HEAD:main`
  (o Luciano testa no site publicado, então o `main` precisa receber). Não abrir PR a menos que ele peça (existe o PR #1, redundante).
- Pontos de volta úteis (commits): `cf2302d` (antes da URL limpa), `47d575f` (antes da repaginação da Home), `ca7ad4e` (Cliente Fiel repaginado).
  Tag de backup não pôde ser enviada ao GitHub (403); o histórico do GitHub é o backup.

### Ambiente da sessão de nuvem (limitações conhecidas)
- Sem acesso a `cdn.jsdelivr.net` nem ao domínio da FourLab (proxy bloqueia). Para testar gráficos: `npm pack chart.js@4` e `npm pack xlsx@0.18.5`.
- Chromium headless em `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. A janela mínima é 500px de largura; para medir 390px use iframe
  ou meça o excesso de largura com `scrollWidth`. Sem PIL; use `convert` (ImageMagick) para recortar imagens. `pip install openpyxl` funciona.
- Supabase MCP: `execute_sql` serve para consultas e DDL simples. `apply_migration` e `DROP INDEX` podem **estourar timeout de 60s**
  (aconteceu ao tentar derrubar um índice). Se travar, conferir o estado depois antes de repetir.
- Plugins (Caveman, Ponytail, claude-code-setup) estão instalados no computador do Luciano, **não** na sessão de nuvem. Rodam só em sessão local nova.

## 3. Convenções que todo código novo deve seguir

1. **Sem emoji em módulo novo ou alterado.** Sempre ícone SVG de linha fina (`stroke=currentColor`, `viewBox 24x24`, estilo da sidebar). Módulos antigos ainda têm emoji espalhado; vai sendo trocado quando o arquivo for mexido por outro motivo.
2. **Nada de texto "de IA" na interface** (sem explicações de "como funciona", sem justificativas). Só copy funcional e direto.
3. **Scripts compartilhados carregam por bootstrapper com carimbo de hora**, nunca `<script src="x.js?v=3">` fixo:
   ```html
   <script>(function(){var s=document.createElement("script");s.src="hub-sidebar.js?t="+Date.now();document.body.appendChild(s);})();</script>
   ```
   Atualizar `hub-sidebar.js`, `acessibilidade.js` ou `trava-scroll.js` nunca exige subir as outras páginas. Todo script novo compartilhado segue o padrão.
4. **Migrações SQL**: arquivos `migracao-NN-nome.sql` na raiz do repo, numeradas. Última: **82**. **Próxima: 83.**
   Rodar no Supabase **antes** de subir o HTML que depende dela. Preferir **idempotentes** (`if not exists`, `drop policy if exists` + `create policy`).
   - **Evite blocos `do $$ ... end $$`** em migração que o Luciano vai colar: o texto chegou cortado ao SQL Editor e deu erro de `$$` não fechado. Use comandos simples, e se for grande, divida em partes numeradas.
   - O SQL Editor do Supabase mostra avisos ("destructive operations", "table without RLS"). Para tabela nova: **"Run and enable RLS"**.
5. **Migração DESTRUTIVA (delete/truncate/drop de dado) exige pergunta isolada e explícita antes**, não só aviso no meio da explicação. (Já deu errado uma vez, ver Lições.)
6. **Fuso horário**: nunca `new Date().toISOString()` puro para "hoje" (depois das ~21h em Brasília já vira o dia seguinte em UTC). Usar data local com offset manual ou `Intl` com `America/Sao_Paulo` (ex.: `hojeBrasiliaStr()` no Cliente Fiel).
7. **Todo módulo precisa criar E apagar pela própria interface** (sem depender de ajuda para limpar dado de teste).
8. **Cache do navegador** já causou falsos bugs. Se algo "não funciona" depois de correção entregue, primeiro pedir **hard reload**; depois pedir **print do console (F12)** antes de chutar causa.
9. **Nunca `position:fixed` em canto de tela sem checar** o que mais pode estar lá (o widget de acessibilidade é arrastável e universal; a barra inferior mobile também).
10. **Depois de editar HTML com substituição de texto, reconferir a estrutura ao redor** (div duplicada já quebrou o layout do chat).
11. **Dados pessoais** (planilhas de clientes) **nunca vão para o repositório**. Ficam só no Supabase e nos arquivos locais do Luciano.

## 4. Design system atual (repaginação em andamento)

- **Direção escolhida**: "A, Suave" (linha FourLab) **com os grupos de módulos da proposta C**.
  Fundo `#F4EFEC`, cartões brancos de cantos grandes (22–26px) com sombra suave (`0 2px 10px rgba(94,16,39,.06)`), banners em degradê.
- **Cores**: vinho `#8B1A3A`; vinho escuro `#5E1027` / `#4A0E20`; claro `#B8325A`; tint `#F7E9EE`; tinta `#2A2224`; cinza `#6E6266`; linha `#E7DFE0`.
  Semânticas: bom `#2D8A4E`/`#3F7A57`, ruim `#C23B3B`/`#B4472F`, aviso `#A87500`/`#C9922B`, azul info `#3E6B93`.
- **Fontes**: Maven Pro (corpo) e Space Grotesk (títulos).
- **Logo**: o "B" em SVG (4 paths) embutido inline no `hub-sidebar.js` e no `index.html` (`viewBox="195 207 615 585"`, `fill=currentColor`).
  **Favicon**: `favicon.svg` e `favicon.png` (B branco em quadrado vinho), referenciados em todas as páginas exceto `link.html`.
- **Sidebar** (`hub-sidebar.js`): pílula flutuante (margem 14px, largura 64px, abre para 250px no hover), degradê vinho do claro (topo) para o escuro (base),
  item ativo branco. `body{padding-left:92px !important}` no desktop. No celular (≤720px) vira **barra inferior** de `64px + env(safe-area-inset-bottom)`,
  degradê horizontal, sem cantos. A `index.html` tem sidebar própria (cópia) com o mesmo visual.
- **iPhone**: todas as páginas têm `viewport-fit=cover` e usam `env(safe-area-inset-bottom)` para não colar na barra do Siri/início.
- **Responsivo**: ponto de quebra `max-width:720px` (vale também para meia tela no PC). Padrão aplicado: bloco `@media (max-width:720px)` **adicionado
  antes de `</style>` em cada módulo**, sem tocar no desktop: `.wrap` com padding 18/14, botões `min-height:42px`, campos `font-size:16px !important`
  (evita zoom no iOS), tabelas `display:block;overflow-x:auto`, grids em 1–2 colunas, modais com margem menor, abas/chips com rolagem horizontal.
  Exceção: o **chat** usa modo "WhatsApp" só com `(pointer:coarse)` (toque real), porque a equipe também usa em tela dividida.
  **Armadilha de ordem de CSS**: regra mais abaixo no arquivo vence a mais acima (a margem lateral da Home voltou ao celular por isso).
- **Pop-ups**: `trava-scroll.js` detecta qualquer elemento fixo que cobre a tela (`.modal-overlay`, `.expandido-overlay`, `.overlay`, `.lead-overlay`, divs fixas no body)
  e trava a rolagem de fora, deixando rolar só o conteúdo do pop-up (inclui bloqueio de toque no iOS). Carregado por `hub-sidebar.js` e pela `index.html`.
- **URL limpa**: `hub-sidebar.js` e `index.html` trocam `/chat.html` por `/chat` na barra (`history.replaceState`). O GitHub Pages serve os dois.
  `paginaAtual()` normaliza (`.replace(/\.html$/,'')+'.html'`) para a sidebar marcar o item certo.

## 5. Papéis e permissões

Papéis: `chefia` (total + admin), `rh`, `gestao`, `laboratorio`, `recepcao`, `conferencia`, `atendente`, `cpd`, `sem_papel`.

- **RLS no Supabase** é a segurança real. `requireRole([...])` (via `auth-guard.js`) só trava a página (UX).
- **Sistema de Cargos** (`cargos.html`, só chefia): tabelas `papeis` / `permissoes` / `papel_permissoes`; matriz que liga/desliga **visibilidade de módulo**
  por cargo. **Limitação**: só ativa/desativa módulo para cargo que já existe no código; cargo totalmente novo exige editar `requireRole` nas páginas.
- Padrão comum de aprovadores: `chefia + conferencia + laboratorio`.
- **Pendência técnica**: ~15 checagens de papel hardcoded no `rh.html`, ainda não migradas para o sistema de Cargos (migrar só quando pedir ajuste ali).

## 6. Causas reais de bugs que já confundiram (ler antes de debugar)

- Migração nunca rodada em produção (ex.: `canais_leitura`).
- Função Postgres sem `SECURITY DEFINER` travando operação (`handle_novo_usuario()`).
- **RLS liberando só um subconjunto de papéis**: o `UPDATE` bloqueado por RLS **não dá erro**, só afeta 0 linhas. Ex.: editar mensagem no chat
  parecia funcionar só na tela de quem editou (faltava política de UPDATE). **Regra**: em `update/delete/upsert` use `.select()` e trate "0 linhas" como erro de permissão.
- Função JS chamada e nunca definida (`localDateStrProd` em `controle-producao.html`) quebrando a renderização em silêncio.
- **Supabase devolve no máximo 1000 linhas por resposta**. Para listas grandes, paginar com `.range()` e `.order('id')` estável (feito no Cliente Fiel). `.in('coluna', [milhares de ids])` estoura a URL.
- Regra de CSS declarada depois anula a anterior (ver acima).
- Filhos de `display:flex` não encolhem sem `min-width:0` (causou rolagem lateral no chat).

## 7. Lições (erros já cometidos, não repetir)

1. Migração 79 (fórmulas complexas) tinha `delete from formulas_complexas_registro`; o aviso passou despercebido e o histórico foi apagado sem backup.
2. `<div>` duplicada em `chat.html` jogou o campo de escrever para fora do layout.
3. Botão `position:fixed` no canto inferior esquerdo ficou sob o widget de acessibilidade.
4. Migração 81 colada com `do $$` chegou cortada ao SQL Editor.
5. Ao gerar o JSON de módulos da Home, troquei a ordem dos campos (`for i,h in` em vez de `h,i`) e todos os módulos ficaram com o mesmo ícone.
6. O modal do importador do Cliente Fiel quebrava ao reabrir (os botões eram trocados e nunca reconstruídos). Reconstruir o conteúdo toda vez que abrir.
7. `open(arq,'w').write(open(arq).read()...)` em Python **apaga o arquivo** antes de ler. Ler primeiro.
8. Sessão muito longa gasta muitos tokens (ver seção 14).

---

## 8. Estado por módulo

Arquivos na raiz do repo. "Resp." = situação do responsivo para celular.

### Início — `index.html` (REPAGINADO)
- Topo: busca de módulos (filtra ao digitar) + nome, cargo e avatar. Banner em degradê com saudação por horário, data e **indicadores por cargo** (cada um é atalho).
- **Painel por cargo** (`PAINEL_POR_CARGO` no JS; `KPIS` e `WIDGETS` são funções independentes que devolvem `{html, draw?}`):
  - chefia: Ordens em andamento, Fórmulas complexas hoje (%), Erros 7 dias, Pendências (fórmulas + férias) → Atenção, Fórmulas complexas na semana (barras + linha de limite), Ordens em aberto (rosca), Produção 7 dias, Erros mais comuns, Inclusões x Erros, Previstas, Conteúdo hoje, Reaproveitamento, Rótulos, Banco de Horas.
  - conferencia: Ordens, Aprovações pendentes, Erros 7 dias, Rótulos → Atenção, Complexas na semana, Ordens, Erros, Previstas, Conteúdo, Reaproveitamento, Rótulos.
  - laboratorio: Ordens, Produzido hoje, Previstas, Reaproveitáveis → Ordens em aberto, Produção 7 dias, Previstas, Reaproveitamento.
  - atendente: Meus erros, Minhas inclusões hoje, Tempo livre das complexas, Rótulos → Meus Erros, Inclusões x Erros, Previstas, Complexas hoje, Conteúdo, Reaproveitamento, Rótulos.
  - rh: Colaboradores ativos, Férias a aprovar, Ausentes hoje, Saldo negativo → Férias a aprovar, Equipe por setor, Banco de Horas. recepcao, gestao, cpd: painéis simples.
- "Precisa de atenção": ordens atrasadas (usa `prazos_producao`, padrão 7 dias), fórmulas pendentes, manipulados vencendo em ≤5 dias, rótulos a comprar, férias pendentes (chefia/rh).
- Módulos em **grupos**: Operação, Qualidade, Pessoas, Comercial e marketing, Gestão (ordem em `ORDEM_MODULOS_HOME`). Visibilidade por `data-perm` (`temPerm`).
- Mantidos: pop-up de avisos (chefia cria, por cargo, com enquete), mini calendário interno, ordem personalizada da sidebar (`preferencias_hub`).
- `fcDisponivelPorDia()` (prioridade: dia específico > dia da semana > 480). Contagens usam `select('id',{count:'exact',head:true})`.
- Confirmar com dados reais se os números dos indicadores batem (testado só com dados simulados).
- Resp.: feito.

### Chat Interno — `chat.html` (migrações 76, 80)
- Canais em grupos + DMs, anexos (imagem/vídeo/áudio/PDF/planilha; cola com Ctrl+V; arrasta e solta), reações, resposta com citação (clique rola até a original), edição com "(editado)", busca na conversa, mídia e arquivos, @menção com autocomplete, exclusão com recarga e tempo real.
- **Migração 80**: políticas `autor_edita_mensagem` (canal) e `remetente_edita_dm` (DM). Sem elas a edição só aparecia para quem editou.
- A tag "(editado)" agora aparece para **todos** (antes só entrava onde existia o botão excluir, que só o autor vê). Salvar usa `.select()` e avisa se o RLS bloquear.
- **Celular**: modo WhatsApp só com `(max-width:720px) and (pointer:coarse)`. A conversa aberta entra no **histórico do navegador** (`pushState`), então o "voltar" do Safari/Android (gesto da borda) **fecha a conversa e volta à lista**, em vez de sair do chat. Altura desconta a barra inferior + safe area. **Sem rolagem lateral** (corrigido com `min-width:0`, quebra de texto, anexos e citação limitados à largura).
- Não construído: "desenhar na imagem" antes de enviar; marcar parabéns/mensagens enviadas.

### Fórmulas Complexas — `formulas-complexas.html` (migrações 79, 81)
- Modelo de **orçamento de tempo compartilhado** por dia. Tipos de cálculo configuráveis: `fixo_mais_unidade`, `minimo_com_limiar`, `blocos_fixos`, `placas_duplo_patamar`. 11 formas seedadas, cada uma com cor.
- **Limite do dia**: dia específico (`formulas_complexas_tempo_diario`) > dia da semana (`formulas_complexas_limite_semanal`, 0=domingo, tela cobre seg–sáb) > 480 min.
- **Sem botão "Solicitar"**: se o dia estourou, o botão fica "Limite do dia excedido" com aviso. **Tolerância interna de 5 min** (`TOLERANCIA_MIN`, nunca exibida): falta 15 min e a fórmula é de 20 → entra. A aba "Aprovações pendentes" continua para resíduos antigos.
- Texto do bloco no calendário escolhe branco/escuro conforme a cor (`corTextoPara`, luminância).
- **Clicar na coluna do dia abre a lista completa** das fórmulas do dia, com **quem registrou (nome + cargo)**; mostra "N fórm. · tempo livre" no rodapé da coluna.
- **Chefia e conferência apagam** fórmula (lixeira + confirmação "Sim, apagar"). Só pela tela: no banco a política `acesso_registro_complexas` também deixa atendente apagar (possível migração futura para fechar).
- **Configurações** (⚙, chefia/conferência/laboratório): limites por dia da semana, limite de dia específico (+ "Voltar ao padrão"), parâmetros das formas (conferência passou a poder salvar).
- **Migração 81**: tabela `formulas_complexas_limite_semanal`; políticas de conferência no catálogo; **laboratório passa a ler** catálogo e registros (antes via a tela vazia). Laboratório ainda **não registra** fórmula.
- Resp.: feito (calendário semanal rola para o lado; data da semana abaixo dos botões).
- O histórico antigo foi apagado na migração 79 (sem recuperação). Perguntar antes de assumir que está vazio.

### Cliente Fiel — `cliente-fiel.html` (migração 82) — REPAGINADO
- Abas: **Início, Clientes, Aniversários, Análises, Brindes, Níveis** (a barra lateral própria foi removida; vale a sidebar do Hub).
- **Início**: banner em degradê com três quadrados grandes (Clientes, Pontos em circulação, Resgates no mês); indicadores coloridos: Pontos vencendo 30d (**azul**), A regularizar (**vermelho**), A ajustar (**amarelo**), Aniversariantes hoje (vinho); aniversariantes de hoje com botão WhatsApp; barra de qualidade do cadastro; recentes.
- **Clientes em cartões** (24 por vez, "mostrar mais"): cartão **vermelho** se faltar CPF válido ou telefone válido (obrigatórios); **amarelo** se faltar data de nascimento completa; busca (nome, CPF, telefone, códigos), filtros por situação/nível/volume e ordenação (nome, mais/menos pontos, recentes). Regra de status em `statusCadastro()`; para cobrar e-mail também, acrescentar uma linha.
- **Aniversários**: Hoje / Semana (7 dias) / Mês (com seletor de mês). Botão verde **Enviar parabéns** abre `wa.me` com mensagem pronta (texto fixo, sem emoji, em `mensagemParabens`). Só para celular com DDD (11 dígitos, 9º dígito); senão "Sem celular". 29/02 cai em 28/02 em ano não bissexto.
- **Análises**: rosca de clientes e barras de pontos por nível, volume, frequência, recência, tipo de cadastro, gênero ou qualidade; tabela-resumo; ranking (mais/menos pontos, filtrável por grupo).
- **Ficha**: etiquetas de segmento, aviso vermelho/amarelo com "Completar agora", lançar pontos (validade automática de 6 meses), resgate, ajuste de pontos/nível, editar, WhatsApp, parabéns, histórico, excluir. **Novo/editar cliente exige CPF válido e telefone com DDD**; aniversário por data ou só dia/mês.
- **Importador novo**: reconhece sozinho as colunas do relatório do sistema da farmácia; limpa nome (Title Case), CPF (valida dígitos, formata), telefone (10 ou 11 dígitos; descarta inválidos), e-mail, aniversário ("19 de outubro" + Idade → data completa), gênero, tipo de cadastro e segmentação (Recência/Frequência/Volume). Prévia antes de gravar; lotes de 200; **repetível**: casa por código Fórmula Certa (depois CPF) e atualiza **sem apagar correções da equipe** (só tipo de cadastro e segmentação são sobrescritos). "Baixar pendências" gera `Pendencias_Cliente_Fiel.xlsx`.
- **Migração 82** (aplicada): colunas `genero`, `tipo_cadastro`, `seg_recencia`, `seg_frequencia`, `seg_volume`, `aniversario_dia`, `aniversario_mes`; índice único completo `clientes_fidelidade_codigo_fc_unico` (necessário ao upsert); índice de aniversário; preenchimento retroativo. Existe um **índice parcial antigo redundante** (`clientes_fidelidade_codigo_fc_uniq`) que não foi possível apagar (DROP deu timeout). É inofensivo.
- **Decisões assumidas** (Luciano pode mudar): coluna `Cód` do relatório = código Fórmula Certa; telefones **não** ganham 9º dígito nem DDD; pontos iniciais **zerados**; "Última compra" **não** é guardado por ora; amarelo considera só a data de nascimento.
- **Base de origem** (`Clientes_8.xlsx`, não está no repo): relatório do sistema da farmácia com filtro "compras desde 31/08/26, sem cortesia/nula" → **3.781 clientes**, 16 colunas (Cód, Cliente, CPF, Gen, Cadastro, Recência, Dias, Frequência, Qtd, Volume, Valor, Ult. Compra, Telefone, Email, Aniversário, Idade). Qualidade: nome 100% (tudo maiúsculo e sem acento), CPF 83% (todos os de 11 dígitos válidos), telefone 37% (só ~295 celulares completos; ~324 parecem celular sem o 9; 556 fixos; 169 sem DDD), e-mail 4%, aniversário 65% (63% com data completa). Cerca de 75% da base cairia no vermelho.
- **Situação atual**: o Luciano importou a **amostra de 100** com sucesso e vai começar devagar com a equipe e conversar com eles. Próximos passos naturais: importar a base completa, definir pontos iniciais, decidir sobre e-mail, registrar quem já recebeu parabéns.
- Resp.: feito.

### Ordem de Produção — `producao.html`
Abas Cápsula/Dermato isoladas. Liberação parcial herda a área da original. "Entrada no lab" pede quem deu entrada; liberação (CQ) pede quem manipulou + quem liberou. Edição com selo "editado". Prazos em `prazos_producao` (urgente 3d, alta 5, média 7, baixa 10). Resp.: feito (tabela rola para o lado; se ficar ruim, trocar por cartões).

### Controle de Produção — `controle-producao.html` (migração 78)
Área por lançamento (Cápsula/Dermato), dashboard com 3 seletores, listas paginadas de 10. Cápsula não pede "tamanho" (complexidade fixa em `'padrao'`). Pesagem mantém o tamanho. RLS reforçada incluindo laboratório. Resp.: feito.

### Reaproveitamento — `reaproveitamento.html` (migração 75)
Chefia + conferência gerenciam; atendente + laboratório só visualizam. Abas Disponíveis / Por ativo / Por categoria / Catálogo de ativos / Reaproveitados / Insights. Categoria pertence à requisição, auto-preenche por assinatura. "Destaques de hoje" sorteia 3–4 itens. Resp.: feito.

### Inclusões & Performance — `inclusoes.html`
"Lançar inclusões" para todos; "Desempenho" só chefia (permissão fina `inclusoes.ver_desempenho`, primeira prova do sistema de Cargos granular). "Fórmulas pro dia seguinte" mora aqui. Resp.: feito.

### Registro de Erros — `erros.html` e Meus Erros — `meus-erros.html`
**Código separado**: corrigir um não corrige o outro. Filtro Dia/Mês, "você vs equipe", gráficos com ticks inteiros, tendência de 7 dias reais.
`erros.html`: grade com clique esquerdo adiciona, direito remove, Ctrl+Z desfaz. **No celular** aparece um seletor **Adicionar erro / Remover erro** (não existe clique direito), o realce por hover fica desligado em dispositivo sem hover, a grade rola por dentro com a coluna de nomes fixa e o aviso "DESFAZER" sobe acima da barra inferior. Resp.: feito.

### Controle de Rótulos — `rotulos.html`
Kanban A comprar / Pedido / Chegou. No celular as colunas viram carrossel horizontal. Resp.: feito.

### Vendas (Yampi) — `vendas-yampi.html`
Dashboard via Edge Function `yampi-proxy`. Pendente: carrinho abandonado → WhatsApp e paginação completa (hoje só os 100 pedidos mais recentes). Resp.: feito.

### Quadro de Tarefas — `tarefas.html` e Calendário Interno — `calendario-interno.html`
Resp.: feito (colunas do quadro com encaixe horizontal; no toque mover card pelos botões do modal; calendário mostra bolinhas e o detalhe do dia).

### Central de RH — `rh.html` (ainda NÃO responsivo)
Dashboard, Colaboradores (PIS, salário isolado em `colaboradores_salarios` com RLS só-chefia, documentos privados, cor por setor), Ponto/Banco de Horas (upload xlsx, condensa por funcionário+período, confirmação, excluir período), Férias & Ausências (calendário por setor; aprovadas e pendentes tracejadas; aprovação só chefia), Avaliações (5 tipos + customizados), Relatórios (só chefia). Arquivo grande e crítico (1.888 linhas, 14 grids): **fazer sozinho e com cuidado**.

### Outros módulos (ainda NÃO responsivos)
`embalagens.html` (migrações 73–74; Triagem / Compostas / Estoque / Cronômetro), `calendario-editorial.html` (66–67; importa xlsx Posts+Stories, Kanban de posts, avisos do dia), `visitas-medicas.html` (CRM de representantes, só chefia), `banco-de-horas.html`, `admin.html`, `cargos.html`, `email-marketing.html` (68; Brevo via Edge Function `brevo-proxy`), `wanessia.html` (assistente Anvisa, placeholder), `alterar-senha.html`, `calendario.html` e `calendario3.html` (Google Calendar, **removido da navegação**, arquivos existem sem link).

### Páginas públicas / auxiliares
`login.html`, `reset-password.html`, `link.html` (link na bio, leads e visitas), `pedidos.html`, `pesquisa-bioflora*.html`, `pesquisa-recepcao.html`, `pesquisa-whatsapp.html`. Não usam a sidebar.

### Acessibilidade — `acessibilidade.js`
Widget flutuante universal (alto contraste, tema escuro por `filter:invert(1) hue-rotate(180deg)`, arrastável, com botão de fechar). Ideia não construída: mover para uma página de "Configurações gerais".

---

## 9. Mapa de dados (tabelas por assunto)

- **Acesso/cargos**: `perfis` (papel, nome_exibicao, atendente_vinculado, colaborador_vinculado), `papeis`, `permissoes`, `papel_permissoes`, `preferencias_hub`, `avisos_popup` (+ `_visualizacoes`, `_votos`).
- **Produção**: `ordens_producao`, `prazos_producao`, `registro_manipulacao_diario`, `registro_pesagem_diario`, `formulas_dia_seguinte`, `rotulos_kanban`.
- **Fórmulas complexas**: `formulas_complexas_catalogo`, `_registro`, `_tempo_diario`, `_limite_semanal`.
- **Reaproveitamento**: `manipulados_nao_retirados`, `manipulados_ativos`, `ativos_cadastrados`, `embalagens_*`.
- **Erros/Inclusões**: `erros_registrados`, `tipos_erro`, `atendentes_erros`, `inclusoes_diarias`.
- **RH**: `colaboradores`, `colaboradores_salarios`, `colaborador_documentos`, `colaboradores_nomes_publicos`, `funcionarios`, `folhas_ponto`, `ferias_solicitacoes`, `avaliacoes_rh`, `avaliacoes_rh_tipos_customizados`, `feriados`, `setores_config`.
- **Chat**: `canais_chat`, `grupos_chat`, `mensagens_chat`, `dm_mensagens`, `chat_reacoes`, `canais_leitura`.
- **Cliente Fiel**: `clientes_fidelidade`, `fidelidade_transacoes` (tipos ganho/resgate/ajuste/expiracao), `fidelidade_resgates`, `fidelidade_brindes`, `niveis_fidelidade` (bronze 0, prata 150, ouro 400, diamante 700; R$10 por ponto, multiplicador 1).
- **Marketing/Tarefas/Agenda**: `calendario_posts`, `calendario_stories`, `calendario_avisos`, `eventos_internos`, `quadros`, `colunas`, `cards_tarefas`, `visitas_*`, `link_bio_*`, `pesquisa_*`, `google_calendar_tokens`, `chama_acesa_*`, `shimano_fest_*`.

## 10. Roteiro do responsivo (projeto de celular)

Decisão: **sem app nativo/loja**. Caminho: responsivo por módulo + **PWA** (instalação na tela inicial) — **ambos feitos** (ver 10.1).

- **Fase 1** (feita): index, tarefas, calendario-interno.
- **Fase 2** (feita): producao, controle-producao, inclusoes, formulas-complexas, reaproveitamento.
- **Fase 3** (feita): cliente-fiel, vendas-yampi, erros, meus-erros, rotulos.
- **Fase 4** (feita): rh, embalagens, calendario-editorial, visitas-medicas, banco-de-horas.
- **Fase 5** (feita): admin, cargos (matriz rola nos dois sentidos, coluna de nomes fixa), email-marketing, wanessia, alterar-senha.
- Depois: estender (ou não) a detecção por toque do chat para o resto do Hub; levar o novo visual (cartões arredondados, cabeçalhos, botões, tabelas) para todos os módulos por meio de um **arquivo de tema compartilhado** (`hub-tema.css` carregado pelo bootstrapper com carimbo de hora) — ideia aprovada em conceito, ainda não feita.
- Cada fase foi testada com Chromium headless e Supabase simulado; o Luciano valida no iPhone.

### 10.0 Tema compartilhado (feito) — `hub-tema.css`
- Visual "Suave" (fundo `#F4EFEC`, painéis e indicadores arredondados com sombra suave, botões e abas em pílula, foco vinho nos campos, modais arredondados) aplicado a **19 módulos** de uma vez: admin, banco-de-horas, calendario-editorial, calendario-interno, cargos, controle-producao, email-marketing, embalagens, erros, formulas-complexas, inclusoes, meus-erros, producao, reaproveitamento, rh, rotulos, tarefas, vendas-yampi, visitas-medicas.
- Carregado no `<head>` **depois** do `<style>` da página, por `document.write` com carimbo de hora (bloqueia a pintura, sem "piscada" do visual antigo e sempre a versão mais nova): `<script>document.write('<link rel="stylesheet" href="hub-tema.css?t='+Date.now()+'">');</script>`.
- **Não** incluir em `index.html`, `chat.html`, `cliente-fiel.html` (design próprio), nem em login/públicas/legado.
- Regra: o tema só mexe em cor, forma e sombra. Larguras, grids e celular continuam no `@media` de cada página (o tema vem depois e venceria empates de especificidade; por isso o tamanho do título é só `min-width:721px`).
- Para repaginar mais um módulo: conferir se usa as classes padrão (`header.top`, `.btn`, `.panel`, `.kpi`, abas) e colar a linha acima. Ajustes específicos continuam na página.

### 10.1 PWA (feito)
- Arquivos na raiz: `manifest.webmanifest` (standalone, `start_url "./"`, cor do tema `#8B1A3A`, fundo `#F4EFEC`), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180px, opaco) e `sw.js`.
- Tags no `<head>` de 29 páginas (exceto `link.html` e `pesquisa-*`): manifest, `theme-color`, metas `apple-mobile-web-app-*`. O registro do service worker está em `hub-sidebar.js`, `index.html` e `login.html`.
- **`sw.js` é "rede primeiro"**: sempre busca a versão mais nova (respeita o carimbo de hora dos scripts compartilhados); só usa a cópia guardada se estiver sem internet. Ignora Supabase/CDNs/POST. Nunca cachear agressivo (cache velho já causou falsos bugs).
- iPhone: Safari > Compartilhar > **Adicionar à Tela de Início**. Android/Chrome: menu > **Instalar app**. No iPhone o app instalado tem armazenamento separado do Safari: **é preciso entrar de novo (login) uma vez dentro do app**.
- Para publicar uma versão nova do `sw.js` basta subir o arquivo; troque `CACHE` (v2...) só se quiser limpar as cópias offline.

## 11. Pendências e ideias em aberto

- Tema compartilhado (`hub-tema.css`) para repaginar os demais módulos; conferência no iPhone de tudo que foi feito no responsivo.
- Cliente Fiel: importar a base completa; definir pontos iniciais; decidir se e-mail vira "amarelo"; registrar quem já recebeu parabéns; remover o índice parcial redundante; conferir se `Cód` realmente é o código Fórmula Certa.
- Fórmulas Complexas: fechar no banco o DELETE do atendente (migração 83 sugerida); decidir se laboratório pode registrar.
- Wanessia: faltam prompt/base de conhecimento reais e a API key da OpenAI.
- Vendas Yampi: carrinho abandonado → WhatsApp; paginação completa.
- Email Marketing: criar conta Brevo, `BREVO_API_KEY`, deploy da function (e a base com e-mail do Cliente Fiel é só ~4%).
- RH: migrar as ~15 checagens de papel para o sistema de Cargos (aos poucos).
- Chat: desenhar na imagem antes de enviar (escopo maior).
- Acessibilidade: página de "Configurações gerais".
- Conferir com dados reais os indicadores da Home por cargo.

## 12. Como testar sem acesso ao seu banco (receita usada)

1. Copiar a página, remover `<script src=supabase>` e `auth-guard.js`, apontar Chart.js/xlsx para cópias locais (`npm pack`).
2. Injetar um stub: `window.supabase={createClient:()=>({auth:{getSession...},from:t=>proxy encadeável})}` e `window.requireRole=async()=>({papel:'chefia'})`.
3. Rodar `chrome --headless --virtual-time-budget=8000 --window-size=500,N --screenshot=...` e/ou `--dump-dom` com um script que grava resultados em `document.body.setAttribute('data-r',...)`.
4. Para medir rolagem lateral: comparar `scrollWidth` e `clientWidth` da área e listar elementos com `getBoundingClientRect().right > innerWidth`.
5. Sempre `node -e "new Function(src)"` em cada `<script>` para checar sintaxe antes de publicar.

## 13. Preferências do Luciano (resumo)

- Respostas curtas, em português, sem enfeite. Pergunta só o que muda a decisão; segue com padrão sensato nos demais casos e **avisa o que assumiu**.
- Quer ver o resultado no celular e no PC; manda print quando algo estranha.
- Prefere **mudar o Hub inteiro por arquivo compartilhado** (barato) a reescrever módulo por módulo.
- Referências visuais citadas: sidebar e cartões da FourLab (pílula flutuante em degradê, cartões arredondados pastel), dashboards de CRM em cartões.
- Autorizou explicitamente rodar SQL no banco quando dito ("pode rodar esse SQL"); caso contrário, entrega o SQL para ele rodar.

## 14. Economia de tokens

- Sessão longa reenvia todo o histórico a cada resposta; imagens e arquivos grandes pesam. **Abrir sessão nova por tarefa** (ex.: "Fase 4: rh.html") é o maior ganho.
- Plugins do Luciano (instalados localmente, escopo usuário): **Caveman** (respostas curtas, `/caveman lite|full|ultra`), **Ponytail** (código mínimo, `/ponytail ...`), **claude-code-setup** (skill `claude-automation-recommender`). Ativam sozinhos em sessão **local** nova; **não** aparecem em sessão de nuvem. CodeBurn (`codeburn today|month`) mede gasto; RTK não instalou.
- Hábitos que economizam: poucos prints (medir por código/DOM), ler só trechos dos arquivos grandes, pedidos agrupados, testes com stub em vez de reescrever.

## 15. Automação de Instagram (estilo ManyChat) — estado em 09/10/2026

**Objetivo:** app interno, só Instagram, via API oficial da Meta (login do Instagram, sem Página do Facebook). Primeiro Bioflora; depois LN Soluções e FourLab. Chefia é quem acessa o módulo.

**Meta (app "Bioflora Automação", id 2284521165632236, publicado em acesso Padrão):**
- Permissões: `instagram_business_basic`, `_manage_comments`, `_manage_messages`, `_manage_insights` (+ `_content_publish`, sem uso). Webhooks assinados: comments, live_comments, message_edit, message_reactions, messages, messaging_postbacks, messaging_referral, messaging_seen.
- Publicar o app foi necessário para os webhooks reais chegarem (o botão "Teste" da Meta funciona antes, o tráfego real não). Exigiu URLs públicas: `politica-de-privacidade.html`, `termos-de-servico.html`, `exclusao-de-dados.html` (sem login, na raiz do repositório).
- Convite de testador só aparece na **web** (instagram.com/accounts/manage_access), não no app do celular.
- Contas hoje conectadas: `ln.solucoesempresariais` (id 17841432304278909, conta de teste). **Bioflora ainda não** (precisa de alguém com o login aceitar convite de testador e gerar token) e o **ManyChat está ativo** nela: decidir a virada para não duplicar mensagens.
- Confirmado em teste real: comentário chega em segundos; resposta pública (`/{comment}/replies`) e **resposta privada com botão** (`/me/messages` com `recipient.comment_id`, template button/postback) funcionam; clique chega por `messaging_postbacks`; link enviado na janela de 24h. Funciona para pessoa **sem função no app**.
- Eco (`is_echo`) chega pelo campo `messages`, sem nada que diferencie bot de humano: o servidor compara o `mid` com os `message_id` guardados em `ig_envios` (após 3 s); se não for nosso, pausa o contato 30 min. **Só testado em simulação.**
- Limites vistos na documentação (fonte secundária, não confirmados na prática): 750 respostas privadas/h; resposta privada = 1 mensagem por comentário, até 7 dias; tag de agente humano sujeita a revisão (não usar).

**Segredos (nunca no chat nem no repositório):** `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_TOKEN_LN` (token da conta LN; vence em ~60 dias, ainda sem renovação automática) em Edge Functions → Secrets. Cada conta aponta o nome do seu segredo em `ig_contas.token_env`.

**Banco (migrações 84, 85, 86):** `ig_contas`, `ig_tokens` (reservada, sem uso ainda), `ig_eventos` (webhook bruto), `ig_disparos` (trava de 1 disparo por pessoa por post), `ig_envios` (cada chamada à Meta e a resposta), `ig_fluxos` (nodes/edges em JSON), `ig_contatos`, `ig_execucoes`, `ig_config` (segredo do relógio). RLS ligado; chefia lê tudo e edita `ig_fluxos`; escrita dos demais só pelo servidor (service role). **Cuidado:** `delete` direto pelo MCP dá timeout; usar `with d as (delete ... returning 1) select count(*) from d`.

**Código (`supabase/functions/ig-webhook/`):**
- `engine.js`: motor puro (sem rede/banco/DOM), mesmo arquivo para servidor e para o futuro simulador do builder. Nós: gatilho (comentário, DM, story, padrão), mensagem (texto, imagem, PDF, áudio, vídeo, cartão, botões), coletar resposta, condição, randomizador, atraso, ações (tag/campo/soma), iniciar outro fluxo, humano, fim, nota. Regras: janela 24h, resposta privada única, 1 disparo por post, opt-out ("parar/sair...") e opt-in ("começar"), pausa por atendente.
- `index.ts`: Edge Function `ig-webhook` (verify_jwt desligado, segurança = assinatura HMAC). Carrega fluxos/contato/execuções, roda o motor e executa os efeitos. Rota `POST ?acao=tick` (cabeçalho `x-worker-secret`, valor em `ig_config`) processa lembretes/esperas/atrasos; **pg_cron job `ig-tick` roda a cada minuto** via pg_net.
- Deploy: pelo MCP, enviando `index.ts` **e** `engine.js` juntos. Atenção para colar sem alterar (uma versão publicada tem `ctx.contato ?? ctx.contact` em vez de `ctx.contact` num ponto; inofensivo, sincronizar no próximo deploy).
- Testes locais: scripts em scratchpad usando Node (`--experimental-strip-types`) com banco simulado; 31 verificações do motor.

**Fluxo de teste ativo:** "Teste: comentário 🔥 → material" (conta LN, só no post 18122364154932417): resposta pública (3 variações) → DM privada com botão "Quero" → link.

**Próximas etapas combinadas:** (2) builder no módulo "Instagram" do Hub (aba Fluxos com canvas e simulador usando o mesmo `engine.js`; aba Conexões); (3) renovação do token e tela Conexões; (4) Contatos e DMs; (5) trocar LN por Bioflora (aceitar convite, token, decidir o ManyChat). Fora do semanal da chefia, vem depois. Pipeline e dashboard de insights são fases posteriores.

**Decisões abertas:** clique em botão antigo hoje é ignorado (retomar?); nome real do contato (a Meta só manda o @ nas DMs; dá para buscar por chamada extra); LN/FourLab terão conta própria no mesmo motor.
