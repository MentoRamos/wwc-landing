'use client';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 120 }: LogoProps) {
  // SVG logo — scales perfectly at any size, transparent background
  const height = size * 0.7; // aspect ratio ~600:420
  return (
    <img
      src="/logo-wwc.svg"
      alt="Wealth & Wellness Connect"
      width={size}
      height={height}
      className={`object-contain ${className}`}
    />
  );
}
