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
        src="/photos/logo-wwc-transparent.png"
        alt="Wealth & Wellness Connect"
        fill
        sizes={`${size}px`}
        className="object-contain"
        quality={95}
      />
    </div>
  );
}
