import type { NextConfig } from 'next';
export default {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:4000'}/:path*`,
      },
    ];
  },
} satisfies NextConfig;
