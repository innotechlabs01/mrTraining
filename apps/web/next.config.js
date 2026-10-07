/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// Origins the app talks to at runtime (resolved at build time from env).
const goApiUrl = process.env.NEXT_PUBLIC_GO_API_URL || '';
const legacyApiUrl = process.env.NEXT_PUBLIC_API_URL || '';

// Practical CSP: strict about *where* code can load from, while still allowing
// Next.js inline hydration scripts, Clerk, and CKEditor. Tighten `script-src`
// further by adopting nonces once the app stops relying on inline scripts.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.dev",
  `connect-src 'self' ${goApiUrl} ${legacyApiUrl} https://*.clerk.com https://*.clerk.dev https://api.clerk.com https://*.public.blob.vercel-storage.com wss: ws:`,
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-src 'self' https://*.clerk.com https://*.clerk.dev",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
]
  .filter(Boolean)
  .join('; ');

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
  // Do not advertise the framework in the X-Powered-By header.
  poweredByHeader: false,
  /**
   * Same-origin proxy for the Go API (Sprint 2 — latency).
   *
   * Set GO_API_ORIGIN (server-side) and leave NEXT_PUBLIC_GO_API_URL empty so
   * the browser calls /api/v1/* on THIS origin and Next proxies to the Go
   * backend. Saves the extra DNS+TLS handshake and CORS preflight per request
   * (~50-150ms) and lets the CSP connect-src stay 'self'.
   *
   * Next's own route handlers (/api/coaching, /api/exercises, webhooks…)
   * are resolved from the filesystem BEFORE these rewrites, so nothing collides.
   */
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
    return [
      {
        // Apply hardening headers to every route (pages, API routes, assets).
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

module.exports = nextConfig;
