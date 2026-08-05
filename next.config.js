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

  // The `highs` package (HiGHS LP solver compiled to WebAssembly, used by the in-browser
  // industry-optimization LP at src/app/project-workspace/industry-project/optimization) ships one Emscripten glue
  // file for both Node and the browser. It gated its Node-only `require("node:fs")` /
  // `require("node:crypto")` calls behind a runtime environment check, but webpack still parses
  // them statically while bundling the client chunk and fails with "UnhandledSchemeError" for the
  // `node:` scheme. Since those branches never execute in the browser (the WASM binary is fetched
  // via `locateFile` instead — see src/lib/industry-lp/solver.ts), it's safe to stub them out of
  // the client bundle only.
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, crypto: false, path: false };
      // Webpack treats a bare `node:fs`-style specifier as an unhandled URI scheme rather than a
      // module request, so `resolve.fallback`/`resolve.alias` never get a chance to run. Strip the
      // `node:` prefix first so it becomes an ordinary `fs`/`crypto` request, which the fallback
      // above then stubs out to an empty module for the client bundle.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        }),
      );
    }
    return config;
  },

  // Redirect legacy routes to their policy-navigator equivalents
  async redirects() {
    return [
      { source: '/policy', destination: '/policy-navigator/policy', permanent: true },
      { source: '/policy-text', destination: '/policy-navigator/policy-text', permanent: true },
      { source: '/analytics', destination: '/policy-navigator/analytics', permanent: true },
      { source: '/guide', destination: '/policy-navigator/guide', permanent: true },
      // Summer Prep (ex M · 35) is retired: its pages moved into the Project
      // Workspace projects they belong to. Old bookmarks keep working.
      { source: '/beta/summer-prep', destination: '/project-workspace', permanent: true },
      { source: '/beta/summer-prep/indicator-check', destination: '/project-workspace/policy-gap-2-0/indicator-check', permanent: true },
      { source: '/beta/summer-prep/synergies-tradeoffs', destination: '/project-workspace/policy-gap-2-0/synergies-tradeoffs', permanent: true },
      { source: '/beta/summer-prep/policy-gaps-sectors', destination: '/project-workspace/policy-gap-2-0/policy-gaps-sectors', permanent: true },
      { source: '/beta/summer-prep/optimization', destination: '/project-workspace/industry-project/optimization', permanent: true },
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
