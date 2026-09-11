/**
 * Eyebrow, title, and at most one opening paragraph.
 *
 * Every platform page opened with the same three hand-written lines and three
 * slightly different sets of classes. This is that shape, named once.
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  level = 1,
  className = '',
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: React.ReactNode;
  level?: 1 | 2;
  className?: string;
  children?: React.ReactNode;
}) {
  const Title = level === 1 ? 'h1' : 'h2';

  return (
    <header className={className}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Title className={`${level === 1 ? 'page-title' : 'section-title'} ${eyebrow ? 'mt-4' : ''}`}>
        {title}
      </Title>
      {lede && <p className="lede mt-5">{lede}</p>}
      {children}
    </header>
  );
}
