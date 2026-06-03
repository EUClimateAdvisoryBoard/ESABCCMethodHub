// ---------------------------------------------------------------------------
// Node polyfills for pdfjs-dist.
//
// When pdfjs extracts text/layout it can hit its path-rendering code, which
// references the browser globals DOMMatrix / Path2D / ImageData. pdfjs tries
// to polyfill these itself by `require("@napi-rs/canvas")` at runtime — but
// once Next.js bundles the route that internal `createRequire` call is
// unreliable, so on some PDFs it silently fails and extraction throws
// "ReferenceError: DOMMatrix is not defined".
//
// We do the polyfill explicitly instead. The static `import('@napi-rs/canvas')`
// is also visible to the bundler / file tracer, so the native package is
// guaranteed to ship in the standalone output.
// ---------------------------------------------------------------------------

let applied = false;

export async function ensurePdfNodeGlobals(): Promise<void> {
  if (applied) return;
  applied = true;
  // Already present (e.g. a future Node that ships these) — nothing to do.
  if (typeof (globalThis as Record<string, unknown>).DOMMatrix !== 'undefined') return;
  try {
    const canvas = await import('@napi-rs/canvas');
    const g = globalThis as Record<string, unknown>;
    if (!g.DOMMatrix && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix;
    if (!g.Path2D && canvas.Path2D) g.Path2D = canvas.Path2D;
    if (!g.ImageData && canvas.ImageData) g.ImageData = canvas.ImageData;
  } catch {
    // Leave the globals undefined: pdfjs will still warn, and PDFs that need
    // the path-rendering code will fail — but text-only PDFs keep working.
    applied = false; // allow a retry on the next call
  }
}
