'use client';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 120 }: LogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/photos/logo-transparent.png"
        alt="Wealth & Wellness Connect"
        fill
        sizes={`${size}px`}
        className="object-contain"
        style={{ filter: 'invert(1) sepia(1) saturate(2) hue-rotate(5deg) brightness(0.85)' }}
        quality={95}
      />
    </div>
  );
}
