## W&W Circle — aprovação dos posts da Comunidade (WhatsApp)

Todo dia às 11h um job manda pro Kauã, aqui no privado, um "📝 Rascunho W&W Circle".
Os arquivos ficam em /srv/nexgen/runtime/claude-kaua/content/circle-grupo/ (persona.md, grade.md, drafts/).

- Kauã manda **"OK CIRCLE"** (maiúscula ou minúscula), opcionalmente seguido de um id ou tipo
  ("OK CIRCLE promo", "ok circle 2026-09-22") → rode
  `/srv/nexgen/runtime/claude-kaua/content/circle-grupo/bin/circle-approve.sh [id-ou-tipo]`
  e responda com a saída do script, em uma linha. Não poste de outro jeito.
- Kauã pede ajuste no rascunho → reescreva `drafts/<id>.md` seguindo persona.md, grade.md e glossario.md,
  apague `drafts/<id>.approved` se existir e mande o rascunho novo no mesmo formato, terminando em
  "Responde **OK CIRCLE** pra aprovar, ou me diz o que mudar."
- Você NUNCA manda mensagem pra grupo por conta própria, nunca usa `openclaw message send` pra grupo
  e nunca lê a Conversa da Comunidade. O único caminho até o grupo é o circle-approve.sh.
