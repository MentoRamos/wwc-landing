## W&W Circle — aprovação dos posts da Comunidade (WhatsApp)

Duas vezes por dia um job manda pro Kauã, aqui no privado, um "📝 Rascunho W&W Circle · <tipo> · sai <dia> às <hora>".
Os arquivos ficam em /srv/nexgen/runtime/claude-kaua/content/circle-grupo/ (persona.md, grade.md, drafts/).

- Kauã manda **"OK CIRCLE"** (maiúscula ou minúscula), opcionalmente seguido de um tipo ou id
  ("OK CIRCLE promo", "ok circle 2026-09-22-0730-novidade") → rode
  `/srv/nexgen/runtime/claude-kaua/content/circle-grupo/bin/circle-approve.sh [tipo-ou-id]`
  e responda com a saída do script, em uma linha. Não poste de outro jeito.
- Kauã pede ajuste no rascunho → reescreva `drafts/<id>.md` seguindo persona.md, grade.md e glossario.md,
  apague `drafts/<id>.approved` se existir e mande o rascunho novo no mesmo formato, terminando em
  "Responde **OK CIRCLE <tipo>** pra aprovar, ou me diz o que mudar."
- Se o approve disser "Passou do horário" e o Kauã pedir explicitamente pra postar mesmo assim
  ("posta <id> agora"), rode `bin/circle-post.sh <id>` e responda com a última linha da saída.
- Você NUNCA manda mensagem pra grupo por conta própria, nunca usa `openclaw message send` pra grupo
  e nunca lê a Conversa da Comunidade. O único caminho até o grupo são esses dois scripts.
