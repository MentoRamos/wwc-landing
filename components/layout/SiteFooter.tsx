import Link from 'next/link';
import { WHATSAPP_NUMBER } from '@/lib/constants';

/**
 * The footer that closes two gaps at once.
 *
 * The obvious one is navigation: somewhere to go from the bottom of a page.
 * The other is that Google will not publish the OAuth app without a privacy
 * policy and terms reachable from the site — reachable meaning linked, not
 * merely deployed at a URL only we know.
 */
const SECTIONS = [
  {
    title: 'Plataforma',
    links: [
      { href: '/connect', label: 'W&W Connect' },
      { href: '/circle', label: 'W&W Circle' },
      { href: '/biblioteca', label: 'Biblioteca' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacidade', label: 'Privacidade' },
      { href: '/termos', label: 'Termos' },
      { href: '/circle/termos', label: 'Condições da assinatura' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t md:mt-24 border-[var(--border)]">
      <div className="container-lp flex flex-col gap-12 py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--text-2)]">
              Wealth &amp; Wellness
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-3)]">
              Saúde baseada em dados para quem decide o dia inteiro e esquece de decidir
              sobre si.
            </p>
          </div>

          {SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <p className="meta">{section.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-3)] transition hover:text-[var(--accent)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="Ajuda">
            <p className="meta">Ajuda</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link
                  href="/sem-acesso"
                  className="text-sm text-[var(--text-3)] transition hover:text-[var(--accent)]"
                >
                  Comprou e não apareceu?
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-3)] transition hover:text-[var(--accent)]"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/wealthwellnes_connect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-3)] transition hover:text-[var(--accent)]"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="meta border-t border-[var(--border)] pt-8">
          &copy; {new Date().getFullYear()}{' '}
          Wealth &amp; Wellness
        </p>
      </div>
    </footer>
  );
}
