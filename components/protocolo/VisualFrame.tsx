import Image from 'next/image';
import type { VisualProtocolo } from '@/lib/protocolo';

/**
 * The designed frame for the offer page's future visuals (`VISUAIS` in
 * `lib/protocolo.ts`). Only rendered behind its slot's flag
 * (`VISUAIS_REPORTS` / `VISUAIS_PLATAFORMA`), so a slot that is off never
 * requests its file.
 *
 * - `browser`: a quiet browser chrome (three dots and the site's address)
 *   around the platform screenshot, so it reads as the real student area
 *   rather than a loose image.
 * - `document`: a sheet with a soft shadow around a Weekly Report crop, the
 *   way a PDF page sits on a desk.
 *
 * The aspect ratio comes from the slot itself, so the space is reserved
 * before the image loads (no layout shift).
 */
export function VisualFrame({
  visual,
  variant,
  tone = 'light',
  sizes = '(max-width: 768px) 100vw, 50vw',
}: {
  visual: VisualProtocolo;
  variant: 'browser' | 'document';
  tone?: 'light' | 'dark';
  sizes?: string;
}) {
  const captionColor = tone === 'dark' ? 'text-[rgba(244,242,238,0.55)]' : 'text-[rgba(13,13,13,0.5)]';

  if (variant === 'browser') {
    return (
      <figure>
        <div className="overflow-hidden rounded-[12px] border border-[rgba(13,13,13,0.14)] bg-[#FCFBF8] shadow-[0_24px_60px_rgba(13,13,13,0.14)]">
          <div className="flex items-center gap-3 border-b border-[rgba(13,13,13,0.08)] bg-[#EFECE6] px-4 py-2.5">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(13,13,13,0.16)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(13,13,13,0.16)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(13,13,13,0.16)]" />
            </span>
            <span className="mx-auto rounded-full bg-[#FCFBF8] px-4 py-1 text-[0.75rem] text-[rgba(13,13,13,0.55)]">
              kauaramos.com
            </span>
          </div>
          <div className="relative w-full" style={{ aspectRatio: visual.aspect }}>
            <Image src={visual.src} alt={visual.alt} fill sizes={sizes} quality={85} className="object-cover object-top" />
          </div>
        </div>
        <figcaption className={`mt-3 text-[0.8125rem] ${captionColor}`}>{visual.caption}</figcaption>
      </figure>
    );
  }

  return (
    <figure>
      <div className="rounded-[6px] bg-[#FCFBF8] p-3 shadow-[0_2px_0_rgba(13,13,13,0.04),0_24px_60px_rgba(13,13,13,0.18)] md:p-4">
        <div className="relative w-full overflow-hidden rounded-[3px]" style={{ aspectRatio: visual.aspect }}>
          <Image src={visual.src} alt={visual.alt} fill sizes={sizes} quality={85} className="object-cover object-top" />
        </div>
      </div>
      <figcaption className={`mt-3 text-[0.8125rem] ${captionColor}`}>{visual.caption}</figcaption>
    </figure>
  );
}
