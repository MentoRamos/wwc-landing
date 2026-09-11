/**
 * Puts the five guides into the Library: the files into the private bucket,
 * the rows into `content_items`.
 *
 * Idempotent — running it twice changes nothing — so it is safe to re-run
 * after adding a guide, and safe to run against the hosted project once the
 * migrations are there.
 *
 * The same five PDFs stay public on the static site, and that is correct:
 * they are lead magnets, every email already sent links to them, and the
 * paywall was removed on purpose in July. Here they are shelf and
 * convenience, not a secret — the lock on this shelf protects the replays
 * that will sit beside them, not these.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<secret key> \
 *   MATERIALS_DIR=../wealth-wellness-protocol/landing-kauaramos/materiais \
 *   node scripts/seed-library.mjs
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dir = process.env.MATERIALS_DIR
  ? resolve(process.env.MATERIALS_DIR)
  : resolve('../wealth-wellness-protocol/landing-kauaramos/materiais');

if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(2);
}

const BUCKET = 'library';

/**
 * Titles and descriptions are the ones already published on materiais.html —
 * copied, not rewritten, so the shelf and the site say the same thing about
 * the same file.
 *
 * `required_products` follows the plan: Protocol keeps the Library for life,
 * Circle keeps it while the subscription is live, a Connect guest gets it.
 * Face a Face does not.
 */
const OWNERS = ['protocol', 'circle', 'connect'];

const GUIDES = [
  {
    slug: 'o-minimo-inegociavel',
    file: 'o-minimo-inegociavel.pdf',
    title: 'O Mínimo Inegociável',
    description:
      'As cinco âncoras que sustentam qualquer resultado. O que você faz mesmo no dia impossível, e por que isso basta.',
  },
  {
    slug: 'fim-do-crash-15h',
    file: 'fim-do-crash-15h.pdf',
    title: 'Fim do Crash das 15h',
    description:
      'Por que sua energia despenca depois do almoço e o que fazer com glicemia, cafeína e ritmo circadiano pra ela não cair.',
  },
  {
    slug: 'cardapio-sem-culpa',
    file: 'cardapio-sem-culpa.pdf',
    title: 'Cardápio Sem Culpa',
    description:
      'Como decidir em tempo real no restaurante. O top 3 de cada tipo de cozinha e a conta do álcool sem terrorismo.',
  },
  {
    slug: 'o-mundo-e-a-academia',
    file: 'o-mundo-e-a-academia.pdf',
    title: 'O Mundo é a Academia',
    description:
      'Vinte e um treinos para fazer em qualquer lugar, sem equipamento. Viagem, hotel, sala de casa. Sem desculpa de logística.',
  },
  {
    slug: 'doce-sem-sabotagem',
    file: 'doce-sem-sabotagem.pdf',
    title: 'Doce Sem Sabotagem',
    description:
      'Vinte e uma receitas para matar a vontade de doce sem desmontar a semana. O açúcar não é o inimigo, a frequência é.',
  },
];

const admin = createClient(url, key, { auth: { persistSession: false } });

let uploaded = 0;
let failed = 0;

for (const [index, guide] of GUIDES.entries()) {
  const path = `guias/${guide.file}`;
  let bytes;

  try {
    bytes = await readFile(resolve(dir, guide.file));
  } catch {
    console.error(`FALHOU  ${guide.file} — não encontrei em ${dir}`);
    failed += 1;
    continue;
  }

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.error(`FALHOU  ${guide.file} — ${uploadError.message}`);
    failed += 1;
    continue;
  }

  const { error: rowError } = await admin.from('content_items').upsert(
    {
      slug: guide.slug,
      kind: 'pdf',
      collection: 'guias',
      title: guide.title,
      description: guide.description,
      storage_path: path,
      required_products: OWNERS,
      published_at: new Date().toISOString(),
      sort_order: index,
    },
    { onConflict: 'slug' },
  );

  if (rowError) {
    console.error(`FALHOU  ${guide.slug} — ${rowError.message}`);
    failed += 1;
    continue;
  }

  console.log(`ok      ${guide.title}  [${(bytes.length / 1048576).toFixed(2)} MB]`);
  uploaded += 1;
}

console.log(`\n${uploaded}/${GUIDES.length} no lugar.`);
process.exit(failed ? 1 : 0);
