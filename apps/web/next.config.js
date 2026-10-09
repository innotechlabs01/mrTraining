/** @type {import('next').NextConfig} */
const legacyApiUrl = process.env.NEXT_PUBLIC_API_URL || '';

const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  async rewrites() {
    const goOrigin = process.env.GO_API_ORIGIN || process.env.NEXT_PUBLIC_GO_API_URL || '';
    if (!goOrigin) {
      return { beforeFiles: [], afterFiles: [], fallback: [] };
    }
    return [
      { source: '/api/v1/:path*', destination: `${goOrigin}/api/v1/:path*` },
      { source: '/uploads/:path*', destination: `${goOrigin}/uploads/:path*` },
      { source: '/health', destination: `${goOrigin}/health` },
    ];
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_GO_API_URL || ''} ${process.env.NEXT_PUBLIC_API_URL || ''} https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://api.clerk.com https://*.public.blob.vercel-storage.com wss: ws:`,
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src 'self' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ]
      .filter(Boolean)
      .join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
