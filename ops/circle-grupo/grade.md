# Grade editorial — Avisos do W&W Circle (17 posts por semana)

> **Artigo todo dia às 12h15 (decisão do Kauã, 07/10/2026).** O site publica 1 artigo por dia às 10h, e antes disso o grupo só tinha 2 slots de artigo por semana — de 03 a 07/10 saíram 4 artigos e só 1 chegou ao grupo. Agora o artigo do dia é o eixo da grade: sai todo dia às 12h15, 2h depois de publicado, com o resumo em áudio junto. Os outros tipos foram remanejados pra liberar o 12h15 (promo de quarta foi pras 07h30, cta-protocol de sexta foi pras 18h30, promo de sábado foi pras 09h30).

> **Lives suspensas na grade (decisão do Kauã, 06/10/2026).** Enquanto as lives não começarem de fato, NENHUM post pode divulgar, anunciar, prometer ou citar encontro ao vivo — nem como chamada, nem de passagem dentro de outro tipo. Os dois slots de `live` (terça 20h e quinta 18h30) estão vazios e os crons deles estão desligados. Pra voltar: reativar `circle-grupo:rascunho-04` e `circle-grupo:rascunho-08` e devolver as linhas na tabela.

> **Desafio 21 dias da turma fundadora (decisão do Kauã, 08/10/2026).** De quarta 21/10 a domingo 15/11 alguns slots de venda viram slots do desafio. Quando o POST da mensagem cair numa das linhas abaixo, IGNORE o TIPO que veio na mensagem e escreva o tipo da coluna "vira" (use esse tipo novo no `bin/circle-slot.sh`, no cabeçalho 📝 e no "OK CIRCLE <tipo>"). Regras e conteúdo em `desafio.md` (leia inteiro). Fora dessas datas, a grade normal vale.
>
> | Slot normal | Datas | Vira |
> |---|---|---|
> | Quarta 20h00 `cta-circle` | só 21/10 | `desafio-aquecimento` |
> | Domingo 20h00 `cta-circle` | 25/10 | `desafio-dia0` |
> | Segunda 20h00 `cta-protocol` | 26/10, 02/11, 09/11 | `desafio-semana` |
> | Quarta 20h00 `cta-circle` | 28/10, 04/11, 11/11 | `desafio-checkin` |
> | Domingo 20h00 `cta-circle` | 01/11, 08/11 | `desafio-placar` |
> | Domingo 20h00 `cta-circle` | 15/11 | `desafio-dia21` |
>
> A sexta 18h30 `cta-protocol` **continua** (única venda da semana), mas em tom leve, sem pressão, e falando com quem está no desafio.


O `artigo` sai 1x por dia; os outros tipos saem 2x na semana, nos horários de pico do celular: ida pro trabalho (7h30), almoço (12h15) e noite (18h30–20h). No fim de semana o pico é mais tarde de manhã (9h30–10h) e a noite de domingo.
Nunca 2 vendas no mesmo dia. Sábado não tem venda.

O rascunho chega no DM do Kauã **2h antes**; post de manhã cedo tem o rascunho **às 21h30 da véspera**. Só é postado depois do "OK CIRCLE" dele. Aprovação que chega mais de 3h depois do horário não posta.

| Dia | Horário | Tipo | Variante |
|---|---|---|---|
| Segunda | 07h30 | `novidade` | |
| Segunda | 12h15 | `artigo` | o artigo do dia |
| Segunda | 20h00 | `cta-protocol` | início de semana, hora de decidir |
| Terça | 12h15 | `artigo` | o artigo do dia |
| Terça | 20h00 | — | vago (era `live`, suspenso) |
| Quarta | 07h30 | `promo` | |
| Quarta | 12h15 | `artigo` | o artigo do dia |
| Quarta | 20h00 | `cta-circle` | |
| Quinta | 07h30 | `novidade` | |
| Quinta | 12h15 | `artigo` | o artigo do dia |
| Quinta | 18h30 | — | vago (era `live`, suspenso) |
| Sexta | 07h30 | `newsletter` | `semana`: 3 destaques da semana |
| Sexta | 12h15 | `artigo` | o artigo do dia |
| Sexta | 18h30 | `cta-protocol` | |
| Sábado | 09h30 | `promo` | compras do fim de semana |
| Sábado | 12h15 | `artigo` | o artigo do dia |
| Domingo | 10h00 | `newsletter` | `domingo`: prepara a semana |
| Domingo | 12h15 | `artigo` | o artigo do dia |
| Domingo | 20h00 | `cta-circle` | domingo à noite, planejando a semana |

Dois posts do mesmo tipo na semana NÃO podem repetir assunto, item ou artigo: leia `log.txt` e os `drafts/` dos últimos 7 dias antes de escolher. No `artigo` isso é regra dura: artigo que já aparece no `log.txt` não sai de novo (ver abaixo).

## Regras por tipo

### novidade
A dinâmica é: uma pergunta do dia a dia, a descoberta em linguagem de conversa, o que isso muda pra pessoa. O leitor tem que entender numa lida só, sem reler.
- **Não pode ser o assunto de um artigo que o grupo já recebeu nos últimos 7 dias** (confira o `log.txt`): agora sai artigo todo dia, então a chance de colisão é alta. Se o tema já foi, escolha outro.
- **Escolha:** só entra novidade que muda alguma coisa na rotina de quem tem wearable ou treina. Se o efeito é pequeno, técnico ou só vale pra doente, escolha outra. Sem novidade boa, não tem post (use o "⚠️ Sem rascunho").
- **Estrutura, 4 linhas curtas:** (1) pergunta ou cena do dia a dia; (2) o que descobriram, em uma frase que a pessoa repetiria pra um amigo; (3) o que muda na prática, ou o cuidado, pra quem lê; (4) o link.
- **No máximo 1 número no post** (o que importa pra pessoa). Nada de unidade técnica (mmHg, peso seco, IC 95%), nome de revista em inglês ou tamanho de amostra: isso fica nas fontes do rascunho, não no post.
- Fonte primária aberta e lida hoje (paper, diretriz, comunicado oficial). Associação não vira causa. Diga "em adultos", "em atletas" etc. quando importar.
- **Link:** se tiver artigo nosso sobre o tema em kauaramos.com/circle/artigos, o link é ele. Senão, uma matéria brasileira confiável que explique o estudo. O paper original só se não houver nenhum dos dois.

### artigo
- **Sai todo dia às 12h15: é o artigo publicado naquela manhã, às 10h.** O rascunho é gerado às 10h15, logo depois da publicação.
- Pegue o mais recente do sitemap https://kauaramos.com/circle/artigos/sitemap.xml.
- 🔴 **Antes de escrever, confira no `log.txt` se esse artigo já foi postado** (procure o slug dele nas linhas `posted`/`posted audio`). Se já foi, o artigo de hoje ainda não entrou no sitemap — o job das 10h atrasou ou falhou. Nesse caso NÃO reaproveite o de ontem: grave `drafts/<id>.md` vazio e responda "⚠️ Sem post W&W Circle <dia> 12h15 (artigo): o artigo de hoje ainda não está no site (o mais recente, <slug>, já foi pro grupo em <data>)". Repetir artigo é pior que pular um dia.
- Leia o artigo inteiro antes. Não repita o título como primeira linha: puxe o achado prático.
- **Áudio (desde 05/10):** o grupo recebe, logo depois do texto, o **resumo** do episódio: cerca de 2 minutos de bate-papo que abre com um gancho e termina convidando a ler o artigo. O episódio inteiro, de 10 a 12 minutos, fica no site, no botão "Ouvir o artigo". Quem anexa é o `circle-post.sh`, sozinho, a partir do link do artigo que está no post. Você não anexa nada e não cita caminho de arquivo.
  - Antes de escrever, pergunte se o resumo existe: `bin/circle-audio.sh <url do artigo>`. Saída com um caminho = existe; saída vazia = não existe (é o caso dos artigos de antes de 05/10).
  - **Se existir**, a última linha do post, depois do link, é exatamente: `🎧 Dá play aqui embaixo: 2 minutos sobre esse artigo. O papo completo, de 10 minutos, está no botão "Ouvir o artigo" lá no site.` Troque o número só se a duração real for bem diferente (o `ffprobe` do arquivo diz).
  - **Se não existir**, não prometa áudio: o post fecha no link, como antes.
  - O post precisa fazer sentido sozinho, lido por quem não vai ouvir nada. O resumo é a isca de quem está no carro, não a explicação que falta no texto — e o texto do post não pode repetir o gancho do áudio palavra por palavra.

### promo
- Lojas grandes e conhecidas no Brasil (Amazon BR, Mercado Livre loja oficial, Growth, Integral Médica, Dux, Max Titanium, Centauro, Decathlon e similares).
- Abra a página HOJE e confira preço, desconto e se está disponível. Se não conseguir confirmar, o item não entra.
- Cada item: produto, loja, preço de hoje (e o de antes, se a loja mostrar), link direto.
- Só suplemento com respaldo razoável (creatina, whey, cafeína, eletrólitos, magnésio, vitamina D, ômega 3). Nada de "queimador", pré-treino com estimulante pesado, hormônio ou fórmula milagrosa.
- Acessório: coisa que o público usa (garrafa, elástico, balança de bioimpedância, fita de mobilidade, pulseira/capa de wearable, tapete).
- Fechamento obrigatório, em itálico: "_Sem patrocínio. Preço conferido hoje às HHhMM, pode mudar._"
- Cada item: 1 ou 2 frases de conversa dizendo por que vale (sem prescrever) + preço de hoje (e o de antes) + link na linha de baixo. Veja o exemplo em persona.md.
- Sem link de afiliado por enquanto.

### live — SUSPENSO (06/10/2026)
Não escreva post de `live` e não cite live em post de outro tipo. O Kauã só divulga quando as lives começarem de fato. Se um slot ou um job pedir `live`, responda "⚠️ Sem post W&W Circle <dia> <HHhMM> (live): lives suspensas na grade" e não grave rascunho.

Regra antiga, guardada pra quando voltar: ler `agenda.md`; variante `anuncio` (terça) com o tema da quinta e uma pergunta; variante `hoje` (quinta) curtinho, com o link na última linha.

### cta-protocol
- O que é: acompanhamento 1:1 de 90 ou 180 dias com o Kauã, guiado pelos dados do wearable, calls quinzenais, relatório semanal, plano alimentar por ciclo.
- Sem preço. "O investimento é combinado na conversa." Exige wearable. Vagas limitadas (sem inventar número).
- CTA: https://wa.me/15619865175

### cta-circle
- O que é: plataforma com biblioteca de guias e artigos novos toda semana, lendo pesquisa de verdade e traduzindo pro dia a dia de quem usa wearable.
- **Não** cite encontro ao vivo/live enquanto estiver suspenso (06/10/2026) — mesmo sendo parte do plano, não se promete o que ainda não acontece.
- Sem preço no texto. CTA: https://kauaramos.com/circle

### newsletter
- **A newsletter é a única exceção à regra de não repetir artigo** — ela é o resumo da semana, então cita artigos que o grupo já recebeu no slot das 12h15. O que não pode é repetir a *frase*: o achado tem que ser dito com outras palavras, não copiado do post do dia.
- Variante `semana` (sexta): dos artigos publicados nos últimos 7 dias (sitemap https://kauaramos.com/circle/artigos/sitemap.xml), os **3 mais úteis**: 1 linha cada, com emoji marcador, dizendo o achado (não o título). Depois "+ N outros essa semana". Se não houver nenhum, use os 3 mais recentes. Abra com algo como "o que passou por aqui essa semana, se você perdeu algum".
- Variante `domingo`: prepara a semana. 1 artigo pra ler com calma no domingo (o achado dele em 1 ou 2 frases) + o que vem na semana **em artigo e conteúdo** — nada de live, que está suspensa. Não repita os destaques de sexta.
- Link: https://kauaramos.com/circle/artigos (ou o do artigo escolhido no domingo)
- **Áudio:** a variante `domingo` tem um artigo só, então o resumo dele vai junto, pela mesma regra do tipo `artigo` (confira com `bin/circle-audio.sh` e feche com a linha do 🎧 quando existir). A variante `semana` tem três artigos e link de índice: nenhum áudio vai, e não prometa nenhum.
