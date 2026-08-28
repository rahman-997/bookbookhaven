import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
];

const noIndexHeaders = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }];
const privateRoutes = ['/account/:path*', '/admin/:path*', '/cart/:path*', '/checkout/:path*', '/orders/:path*', '/wishlist/:path*', '/login/:path*', '/register/:path*'];

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      ...privateRoutes.map((source) => ({ source, headers: noIndexHeaders }))
    ];
  }
};

export default nextConfig;
