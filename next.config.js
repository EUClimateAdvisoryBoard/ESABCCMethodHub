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
    // Keep pdfjs-dist and the native canvas package external so webpack
    // doesn't bundle them into the serverless function. Bundling pdfjs
    // rewrites its dynamic worker import to a /chunks/pdf.worker.mjs path
    // that is never emitted ("Setting up fake worker failed"); loading it
    // from node_modules at runtime (as in local dev) resolves the worker
    // correctly. @napi-rs/canvas must stay external so its .node binary
    // isn't bundled.
    serverComponentsExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
    outputFileTracingIncludes: {
      '/api/brussels-bulletin/export-docx': ['./public/templates/**'],
      // pdfjs loads its worker via a dynamic import the file tracer can't
      // follow, and reaches for @napi-rs/canvas through a runtime
      // createRequire. Force the pdfjs build dir (incl. pdf.worker.mjs) and
      // the canvas package + its platform binary into both ingest functions.
      '/api/content-analysis/ingest': [
        './node_modules/pdfjs-dist/legacy/build/**',
        './node_modules/@napi-rs/canvas/**',
        './node_modules/@napi-rs/canvas-*/**',
      ],
      '/api/content-analysis/ingest-upload': [
        './node_modules/pdfjs-dist/legacy/build/**',
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
