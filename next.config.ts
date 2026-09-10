import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pinned: there is another lockfile in the home directory, and Next picks
  // that as the workspace root otherwise.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
  },
};

export default nextConfig;
