# Página Black November Bioflora 2026 — publicar no Hub

## O que fazer
Publicar esta pasta inteira em `hub-bioflora/black/` (GitHub Pages, domínio hub.farmaciabioflora.blog.br).
URL final: https://hub.farmaciabioflora.blog.br/black/
O QR code do painel impresso da recepção (4×A3) aponta para essa URL exata — não mudar o caminho.

## Conteúdo
- `index.html` — página única, autossuficiente (CSS e JS embutidos). Fontes via Google Fonts (Outfit + Maven Pro).
- `img/` — 21 fotos de produtos em PNG sem fundo + `logo.png` (logo Bioflora, aplicada em branco via CSS).
- Pasta `fonts/` NÃO é necessária (pode ignorar se vier junto).

## Funcionamento
- Lista os 14 combos em 3 seções: Skincare, Beleza e autocuidado, Suplementação e bem-estar.
- Clicar no card abre um modal: galeria (produtos juntos + cada um separado), resumo, preço de/por, selo de desconto e descrição de cada produto.
- Link direto por combo: `/black/#combo-1` … `#combo-14`.
- Os dados ficam no array `const C=[...]` no `<script>` do index.html. Para adicionar fotos extras de um combo, incluir o nome do arquivo (já dentro de `img/`) no campo `"fotos": []` daquele combo.
- Não é página de login do Hub: deve ser pública (sem auth-guard), pois é acessada por clientes via QR code.

## Campanha (regras)
- 12 a 30/11/2026 · loja, WhatsApp e site · #bioblack2026
- 10% OFF em produtos selecionados a pronta entrega (Whey não participa; UCII participa)
- 14 combos com preço fechado, não cumulativos com os 10%
- Pix +5% OFF e cupons ativos
- Preços terminam em ,99

## Pendências
- Textos de benefícios: revisar com a responsável técnica (especialmente Amora, Liboost, Passiflora, UC-II) antes de divulgar.
- Preços sujeitos à conferência final.
