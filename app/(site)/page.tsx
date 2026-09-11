import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardGrid } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
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
    href: '/circle',
    eyebrow: 'Assinatura',
    title: 'W&W Circle',
    blurb:
      'Encontro ao vivo toda quinta, 20h, e a biblioteca liberada enquanto a assinatura estiver em dia.',
    open: true,
  },
  {
    href: '/connect',
    eyebrow: 'Evento',
    title: 'W&W Connect',
    blurb:
      'Um dia com 40 executivos sobre saúde baseada em dados. A 2ª edição está em formação.',
    open: true,
  },
  {
    href: '/biblioteca',
    eyebrow: 'Conteúdo',
    title: 'Biblioteca',
    blurb:
      'Os guias e as gravações, liberados conforme o seu acesso. Entre para ver o que é seu.',
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
];

export default async function HubPage() {
  const user = await currentUser();

  return (
    <div className="container-lp w-full py-16 md:py-24">
      <SectionHeading
        className="max-w-3xl"
        eyebrow={'Wealth & Wellness'}
        title="Saúde baseada em dados, para quem decide o dia inteiro e esquece de decidir sobre si."
        lede="Quatro portas para a mesma coisa: entender o que o seu corpo já está medindo e saber o que fazer com isso na semana que vem."
      />

      {/* The one gold gesture on this page. */}
      <div className="mt-10">
        <Button href={user ? '/inicio' : '/circle'} variant="primary" size="lg">
          {user ? 'Ir para a sua área' : 'Conhecer o Circle'}
        </Button>
      </div>

      <CardGrid className="mt-16 max-w-4xl" columns={2}>
        {DOORS.map((door) => (
          <li key={door.title}>
            <Card href={door.href} locked={!door.open}>
              <p className="eyebrow">{door.eyebrow}</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="section-title">{door.title}</p>
                {!door.open && <Badge tone="muted">Em breve</Badge>}
              </div>
              <p className="prose-body mt-3">{door.blurb}</p>
            </Card>
          </li>
        ))}
      </CardGrid>
    </div>
  );
}
