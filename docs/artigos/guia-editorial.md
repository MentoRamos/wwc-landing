# Guia editorial — Artigos do W&W Circle

Vale para o cron diário (`KauaContentReady`, OpenClaw) e para qualquer conversão manual.
O artigo é publicado sozinho, sem revisão humana, com o nome do Kauã Ramos. Escreva como se
cada frase fosse ser lida por um médico cético e por um executivo sem tempo, ao mesmo tempo.

## Quem escreve

Kauã Ramos, criador do Wealth & Wellness Protocol. Acompanha executivos com dados (wearable,
exames, rotina). **Não é médico nem nutricionista** e nunca fala como se fosse. Primeira pessoa
só para opinião e experiência ("Na minha visão", "O que eu vejo nos dados de quem acompanho").

## Voz

- Português do Brasil, claro, frases curtas. Explica o termo técnico na mesma frase em que ele aparece.
- Número sempre com o que ele significa e de onde veio: "num estudo com 4.098 pessoas medidas em casa".
- Nomeia o estudo no texto (revista, ano, tamanho). Nunca "estudos mostram" sem dizer qual.
- Separa com clareza o que é **fato medido**, o que é **hipótese** e o que **ninguém sabe ainda**.
- Sem sermão, sem culpa, sem moralizar. Orientação de hábito, não bronca.

## Estrutura

- **Título**: uma afirmação concreta, de preferência contraintuitiva. Até 90 caracteres. Sem ponto
  de interrogação de isca, sem "Você sabia".
- **Linha fina (`dek`)**: 1 ou 2 frases, até 300 caracteres, que dizem a conclusão.
- **Corpo**: 700 a 1.200 palavras, em markdown.
  1. Abertura (2 a 4 parágrafos): a crença comum e por que ela está incompleta ou errada.
  2. O que os dados dizem: 2 ou 3 seções com `##`, cada uma com números checados.
  3. Onde há desacordo ou limite: o que o desenho do estudo não permite concluir.
  4. `## Na prática`: lista de 3 a 6 itens que a pessoa consegue fazer nesta semana.
  5. Fechamento em 1 ou 2 parágrafos curtos. Sem resumo repetindo tudo.
- Quando o tema pede, inclua **quando procurar um profissional**, com critérios concretos
  (sintoma, valor, situação), não um genérico "consulte seu médico".

## Markdown permitido

Parágrafos, `##` e `###`, listas (`-` e `1.`), `**negrito**`, `*itálico*`, `[link](https://...)`,
citação (`>`) e linha (`---`). **Nada de `#` (h1)**, nada de HTML, nada de imagem, nada de tabela.

## Proibido (o endpoint recusa ou o artigo fica indefensável)

- **Travessão (—)** em qualquer lugar. Use vírgula, dois-pontos, ponto ou parênteses.
- Hashtag, emoji, "comenta X que eu te mando", link de direct: isso era do Instagram.
- Promessa de cura, emagrecimento, anos de vida ou prevenção de doença.
- Diagnóstico, dose de medicamento ou de suplemento, orientação de parar ou mudar remédio.
- Qualquer dado, caso ou história de aluno. Nenhum nome. NIVA não é citado.
- Número que só uma leitura sua devolveu, sem segunda fonte: fica fora e não vira afirmação.
- O aviso médico e o convite pro Circle: **a página já coloca os dois**. Não repita no texto.

## Fontes

Lista de 1 a 30 itens, na ordem em que aparecem no texto:

```json
{ "label": "Zhao J, Stockwell T, et al. Association Between Daily Alcohol Intake and Risk of All-Cause Mortality. JAMA Network Open, 2023.", "url": "https://doi.org/10.1001/jamanetworkopen.2023.6185" }
```

URL **só `https`**, de preferência o DOI ou o PMC. Nada de blog, notícia ou rede social como
fonte principal: se a notícia é o gancho, a fonte é o estudo por trás dela.

## O que se entrega (`artigo.json`)

```json
{
  "slug": "taca-de-vinho-nunca-foi-remedio",
  "title": "A taça de vinho nunca foi remédio",
  "dek": "A proteção do consumo moderado sumiu quando corrigiram quem entrava no grupo de comparação.",
  "body_md": "Você já ouviu que...\n\n## O erro na conta\n\n...",
  "sources": [{ "label": "...", "url": "https://..." }],
  "topic": "alcool",
  "source_kit": "2026-09-14-alcool-dose-moderada",
  "published_at": "2026-09-14T10:00:00-03:00"
}
```

- `slug`: minúsculas, sem acento, palavras separadas por hífen, até 90 caracteres. Derivado do título.
- `topic`: uma palavra ou duas com hífen (`sono`, `forca`, `cardiovascular`, `alcool`...).
- `published_at`: opcional. Sem ele, vale o momento da publicação.
