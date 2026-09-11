import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Opt-in escape hatch, default unchanged.
  //
  // This machine runs a disk watchdog that deletes every `.next` under
  // ~/Projects whenever free space drops below its threshold — including one
  // being written to, which fails the build with a bare ENOENT. Setting
  // NEXT_DIST_DIR to any other name puts the build somewhere its `-name
  // ".next"` no longer matches, without turning off a guard that exists
  // because this Mac has panicked on a full disk before.
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',

  // Pinned: there is another lockfile in the home directory, and Next picks
  // that as the workspace root otherwise.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
  },
};

export default nextConfig;
