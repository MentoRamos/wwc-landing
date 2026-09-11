import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { currentUser } from '@/lib/auth/guard';

export const metadata: Metadata = {
  title: 'Wealth & Wellness',
  description:
    'Saúde baseada em dados para quem decide: o evento, o acompanhamento individual, a assinatura e a biblioteca.',
};

/**
 * The hub the root has been promising since Fase 0.
 *
 * Until now `/` redirected to `/connect`, which was fine while the event was
 * the only finished page — and became a real problem the moment it was not:
 * the Circle, the Library and the sign-in door all existed with no way to
 * reach any of them except by typing the path. A platform you cannot navigate
 * to is a platform nobody uses.
 *
 * Each card says plainly what is open and what is not. Naming a product as
 * "em breve" is better than a link that goes nowhere, and far better than
 * leaving it off and having somebody conclude it does not exist.
 */
const DOORS = [
  {
    href: '/connect',
    eyebrow: 'Evento',
    title: 'W&W Connect',
    blurb:
      'Um dia com 40 executivos sobre saúde baseada em dados. A 2ª edição está em formação.',
    open: true,
  },
  {
    href: '/circle',
    eyebrow: 'Assinatura',
    title: 'W&W Circle',
    blurb:
      'Encontro ao vivo toda quinta, 20h, e a biblioteca liberada enquanto a assinatura estiver em dia.',
    open: true,
  },
  {
    href: null,
    eyebrow: 'Acompanhamento',
    title: 'W&W Protocol',
    blurb:
      'Acompanhamento individual por ciclo, com leitura dos seus próprios dados. Vagas por indicação.',
    open: false,
  },
  {
    href: '/biblioteca',
    eyebrow: 'Conteúdo',
    title: 'Biblioteca',
    blurb:
      'Os guias e as gravações, liberados conforme o seu acesso. Entre para ver o que é seu.',
    open: true,
  },
];

export default async function HubPage() {
  const user = await currentUser();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-sm uppercase tracking-[0.14em] text-[var(--text-2)]">
            Wealth &amp; Wellness
          </span>
        </div>

        <Link
          href={user ? '/inicio' : '/entrar'}
          className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
        >
          {user ? 'Sua área' : 'Entrar'}
        </Link>
      </header>

      <h1 className="mt-16 max-w-xl text-4xl leading-tight">
        Saúde baseada em dados, para quem decide o dia inteiro e esquece de decidir sobre si.
      </h1>

      <ul className="mt-14 flex flex-col gap-px overflow-hidden border border-[var(--border)]">
        {DOORS.map((door) => {
          const body = (
            <>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
                {door.eyebrow}
              </p>
              <p className="mt-2 text-lg text-[var(--text-1)]">
                {door.title}
                {!door.open && (
                  <span className="ml-3 text-xs uppercase tracking-[0.14em] text-[var(--text-4)]">
                    em breve
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{door.blurb}</p>
            </>
          );

          return (
            <li key={door.title} className="bg-[var(--bg-card)]">
              {door.href ? (
                <Link
                  href={door.href}
                  className="block px-6 py-6 transition hover:bg-[var(--bg-card-hover)]"
                >
                  {body}
                </Link>
              ) : (
                <div className="px-6 py-6 opacity-60">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-8 text-xs text-[var(--text-4)]">
        <Link href="/privacidade" className="transition hover:text-[var(--text-2)]">
          Privacidade
        </Link>
        <Link href="/termos" className="transition hover:text-[var(--text-2)]">
          Termos
        </Link>
        <Link href="/sem-acesso" className="transition hover:text-[var(--text-2)]">
          Comprou e não apareceu?
        </Link>
      </footer>
    </div>
  );
}
