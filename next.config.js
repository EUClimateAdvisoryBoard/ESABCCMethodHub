/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained standalone bundle (server.js + minimal
  // node_modules) so the app ships as a single container image with no
  // Vercel dependency. See Dockerfile + docs/infrastructure/deployment.md.
  output: 'standalone',
  trailingSlash: true,

  // Bundle the Brussels Bulletin Word template into the serverless function
  // so the docx-export route can read it via fs.readFile at runtime.
  experimental: {
    // pdfjs-dist polyfills the browser globals it needs (DOMMatrix, Path2D,
    // ImageData) in Node by `require("@napi-rs/canvas")` at runtime. Keep the
    // native package external so webpack doesn't try to bundle its .node
    // binary.
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
    outputFileTracingIncludes: {
      '/api/brussels-bulletin/export-docx': ['./public/templates/**'],
      // pdfjs reaches for @napi-rs/canvas through a runtime createRequire,
      // which the file tracer can't follow — without these the standalone
      // image ships without the package and PDF ingestion fails with
      // "DOMMatrix is not defined". The `canvas-*` glob picks up whichever
      // platform binary npm installed (musl on the Alpine build image).
      '/api/content-analysis/ingest': [
        './node_modules/@napi-rs/canvas/**',
        './node_modules/@napi-rs/canvas-*/**',
      ],
      '/api/content-analysis/ingest-upload': [
        './node_modules/@napi-rs/canvas/**',
        './node_modules/@napi-rs/canvas-*/**',
      ],
    },
  },

  // Redirect legacy routes to their policy-navigator equivalents
  async redirects() {
    return [
      { source: '/policy', destination: '/policy-navigator/policy', permanent: true },
      { source: '/policy-text', destination: '/policy-navigator/policy-text', permanent: true },
      { source: '/analytics', destination: '/policy-navigator/analytics', permanent: true },
      { source: '/guide', destination: '/policy-navigator/guide', permanent: true },
    ];
  },

  // GDPR/security headers. Applied to every response unless overridden by
  // a more specific rule below.
  async headers() {
    const baseSecurityHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // microphone=(self) lets the Project Workspace Meetings module record
      // audio in-browser for transcription. Everything else stays disabled.
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.crossref.org https://eur-lex.europa.eu",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ];

    return [
      { source: '/:path*', headers: baseSecurityHeaders },
      {
        source: '/word-addin/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.officeapps.live.com https://*.office.com https://*.microsoft.com",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
