# Artigos: modo leitura, capas, cards e ouvir — design

Data: 15/09/2026 · Aprovado pelo Kauã em conversa. Continua o
`2026-09-15-circle-artigos-design.md`.

## Decisões (do Kauã, não reabrir)

- **Modo claro só nos artigos** (índice e página), lembrado por visitante. Padrão escuro.
- **Capas de um banco revisado**, gerado por IA no Mac, escolhidas pelo tema. Nada de geração
  diária no servidor.
- **Só capa**: topo do artigo, miniatura no índice e no /circle, fundo do cartão de link.
- **Still life editorial**: objetos e ambientes, sem pessoas, tons quentes e escuros.
- **Cards mais separados e botões mais marcados** no índice e no /circle.
- **Ouvir o artigo com a voz do navegador** (Web Speech API): grátis, sem arquivo, sem chave.
- Disparo para a base (e-mail + WhatsApp oficial) é OUTRO spec: toca cliente externo.

## 1. Modo leitura

- `app/globals.css` ganha `[data-theme="light"]` redefinindo os tokens com a paleta clara
  oficial do W&W (`wealth-wellness-DESIGN.md`): `--bg #F4F2EE`, cards `#FCFBF8`, tinta
  `#1A1712` e derivadas, ouro `#A8894F` (só acento), bordas `rgba(26,23,18,.12)`.
- `app/(site)/circle/artigos/layout.tsx` injeta um script inline que lê
  `localStorage['ww-leitura']` e põe `data-theme` no `<html>` antes da pintura do conteúdo.
  O componente cliente `ReadingThemeToggle` alterna, grava e, ao desmontar (sair dos
  artigos), remove o atributo: o resto da plataforma continua escuro.
- Botão sol/lua com `aria-pressed` e rótulo "Modo claro"/"Modo escuro".

## 2. Capas

- Arquivos em `public/artigos/capas/<id>.webp` (2 tamanhos: 1600 e 800 de largura), gerados a
  partir dos PNG 2688×1520 revisados.
- Catálogo em `lib/articles/covers.ts`: `{ id, topics[], alt }`. Temas fechados:
  `sono, recuperacao, cardiovascular, pressao, metabolismo, alimentacao, proteina, forca,
  cardio, movimento, alcool, composicao-corporal, estresse, hidratacao, longevidade`.
  `longevidade` é o genérico.
- `normalizeTopic(raw)` (em `articles.core`) leva sinônimos ao tema fechado (`vo2` → `cardio`,
  `passos` → `movimento`, `glicose` → `metabolismo`...); desconhecido vira `longevidade`.
- `pickCover(topic, usage, slug)`: entre as capas do tema, a menos usada; empate desfeito por
  hash estável do slug. Sem capa no tema, usa as de `longevidade`.
- Coluna nova `articles.cover_key text` (migration). O endpoint preenche **só na criação**;
  reenvio não troca. Admin troca pelo `/admin/artigos` (grant de coluna `cover_key`).
- Página: capa 16:9 acima do título, mais larga que a coluna (até `max-w-5xl`), `priority`.
  Índice/circle: miniatura 3:2. OG: capa de fundo com degradê escuro e título.

## 3. Cards e botões

- Índice e bloco do /circle: cada artigo vira um card com borda, fundo `--bg-card`, capa à
  direita (desktop) ou em cima (celular), tema como rótulo, data e tempo de leitura, e um
  "Ler artigo →" explícito. Hover: borda dourada e capa com leve zoom (sem blur).
- Grade: o mais recente em destaque (largura total), os demais em 2 colunas no desktop.
- Botões: "Conhecer o Circle", "Ouvir", "Modo claro" e "Voltar" ganham borda visível,
  ícone e alvo de 44px.

## 4. Ouvir

- `ListenButton` (cliente): monta o texto a partir de título, linha fina e corpo (markdown
  sem sintaxe), escolhe voz `pt-BR` do `speechSynthesis`, fala em blocos por parágrafo (evita
  o corte de ~15s do Chrome), com Ouvir/Pausar/Continuar/Parar e o parágrafo atual.
- Sem `speechSynthesis` ou sem voz pt-BR: o botão não aparece.
- Texto para fala sai de `speechText(title, dek, markdown)` puro e testado.

## Testes

- Unit: `normalizeTopic`, `pickCover` (tema, menos usada, empate estável, fallback),
  catálogo (ids únicos, todo arquivo existe, todo tema tem ≥ 2 capas), `speechText`.
- RLS: admin troca `cover_key` e não reescreve texto.
- Aceite: capa na página e no índice; reenvio não troca capa; OG com capa.
- Visual: claro e escuro, desktop e celular.

## Fora

Imagem no meio do texto, geração diária de imagem, modo claro fora dos artigos, áudio gerado.
