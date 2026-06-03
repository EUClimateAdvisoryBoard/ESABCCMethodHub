// ---------------------------------------------------------------------------
// Node polyfills for pdfjs-dist.
//
// When pdfjs extracts text/layout it can hit code that references the browser
// globals DOMMatrix / Path2D / ImageData. In a browser these exist; in Node
// they don't, so extraction throws "ReferenceError: DOMMatrix is not defined".
//
// pdfjs tries to polyfill these itself via `require("@napi-rs/canvas")`, but
// that native package isn't reliably bundled into serverless functions
// (Vercel/Lambda) — the require goes through a createRequire the file tracer
// can't follow, and even when present the native binary may not load.
//
// Strategy:
//   1. Prefer @napi-rs/canvas when it loads — it gives a fully correct canvas
//      implementation (best extraction fidelity, incl. Type3 fonts).
//   2. Otherwise fall back to a dependency-free pure-JS polyfill. DOMMatrix is
//      implemented for real (2D affine — the transforms pdfjs needs); Path2D
//      and ImageData are lightweight stubs (their geometry isn't used when we
//      only call getTextContent). This guarantees extraction never dies with
//      a "… is not defined" ReferenceError on any runtime.
// ---------------------------------------------------------------------------

let applied = false;

export async function ensurePdfNodeGlobals(): Promise<void> {
  if (applied) return;

  const g = globalThis as Record<string, unknown>;

  // Already provided by the runtime (real browser-like env) — nothing to do.
  if (typeof g.DOMMatrix !== 'undefined' && typeof g.Path2D !== 'undefined' && typeof g.ImageData !== 'undefined') {
    applied = true;
    return;
  }

  // 1) Best effort: the real canvas implementation.
  try {
    const canvas = await import('@napi-rs/canvas');
    if (!g.DOMMatrix && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix;
    if (!g.Path2D && canvas.Path2D) g.Path2D = canvas.Path2D;
    if (!g.ImageData && canvas.ImageData) g.ImageData = canvas.ImageData;
  } catch {
    // Not available in this runtime — fall through to the pure-JS polyfill.
  }

  // 2) Pure-JS fallback for anything still missing.
  installPureJsPolyfills(g);

  applied = true;
}

// Exposed for tests: install the pure-JS polyfills regardless of @napi-rs.
export function installPureJsPolyfills(g: Record<string, unknown> = globalThis as Record<string, unknown>): void {
  if (!g.DOMMatrix) g.DOMMatrix = PureDOMMatrix;
  if (!g.Path2D) g.Path2D = PurePath2D;
  if (!g.ImageData) g.ImageData = PureImageData;
}

// ── Pure-JS DOMMatrix (2D affine) ──────────────────────────────────────────
// Matrix layout (canvas/DOMMatrix 2D convention):
//   | a c e |        x' = a·x + c·y + e
//   | b d f |        y' = b·x + d·y + f
//   | 0 0 1 |
class PureDOMMatrix {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  readonly is2D = true;

  constructor(init?: number[] | PureDOMMatrix | string) {
    if (init == null) return;
    if (typeof init === 'string') return; // pdfjs passes arrays/matrices, not strings
    if (Array.isArray(init)) {
      if (init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      } else if (init.length === 16) {
        // 4×4 column-major → take the 2D components.
        this.a = init[0]; this.b = init[1];
        this.c = init[4]; this.d = init[5];
        this.e = init[12]; this.f = init[13];
      }
      return;
    }
    // Copy from another matrix-like.
    this.a = init.a; this.b = init.b; this.c = init.c;
    this.d = init.d; this.e = init.e; this.f = init.f;
  }

  // m11..m42 aliases some pdfjs paths read.
  get m11() { return this.a; } get m12() { return this.b; }
  get m21() { return this.c; } get m22() { return this.d; }
  get m41() { return this.e; } get m42() { return this.f; }

  get isIdentity() {
    return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
  }

  // (this × other): `other` is applied first, then `this`.
  private _mul(o: PureDOMMatrix): PureDOMMatrix {
    const r = new PureDOMMatrix();
    r.a = this.a * o.a + this.c * o.b;
    r.b = this.b * o.a + this.d * o.b;
    r.c = this.a * o.c + this.c * o.d;
    r.d = this.b * o.c + this.d * o.d;
    r.e = this.a * o.e + this.c * o.f + this.e;
    r.f = this.b * o.e + this.d * o.f + this.f;
    return r;
  }

  private _copyFrom(o: PureDOMMatrix) {
    this.a = o.a; this.b = o.b; this.c = o.c; this.d = o.d; this.e = o.e; this.f = o.f;
    return this;
  }

  multiply(o: PureDOMMatrix): PureDOMMatrix { return this._mul(o); }
  multiplySelf(o: PureDOMMatrix): PureDOMMatrix { return this._copyFrom(this._mul(o)); }
  preMultiplySelf(o: PureDOMMatrix): PureDOMMatrix { return this._copyFrom(o._mul(this)); }

  translate(tx = 0, ty = 0): PureDOMMatrix {
    const t = new PureDOMMatrix([1, 0, 0, 1, tx, ty]);
    return this._mul(t);
  }
  translateSelf(tx = 0, ty = 0): PureDOMMatrix { return this._copyFrom(this.translate(tx, ty)); }

  scale(sx = 1, sy?: number): PureDOMMatrix {
    const s = new PureDOMMatrix([sx, 0, 0, sy ?? sx, 0, 0]);
    return this._mul(s);
  }
  scaleSelf(sx = 1, sy?: number): PureDOMMatrix { return this._copyFrom(this.scale(sx, sy)); }

  inverse(): PureDOMMatrix {
    const det = this.a * this.d - this.b * this.c;
    const r = new PureDOMMatrix();
    if (!det || !Number.isFinite(det)) {
      r.a = r.b = r.c = r.d = r.e = r.f = NaN;
      return r;
    }
    r.a = this.d / det;
    r.b = -this.b / det;
    r.c = -this.c / det;
    r.d = this.a / det;
    r.e = (this.c * this.f - this.d * this.e) / det;
    r.f = (this.b * this.e - this.a * this.f) / det;
    return r;
  }
  invertSelf(): PureDOMMatrix { return this._copyFrom(this.inverse()); }

  transformPoint(p: { x?: number; y?: number } = {}): { x: number; y: number } {
    const x = p.x ?? 0, y = p.y ?? 0;
    return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f };
  }

  toString() {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
  }
}

// ── Pure-JS Path2D / ImageData stubs ───────────────────────────────────────
// We only ever call getTextContent, so glyph-path geometry and image data are
// never read back. These stubs exist purely so `new Path2D()` / `new
// ImageData()` don't throw if pdfjs touches them while building a glyph.
class PurePath2D {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  constructor(_path?: unknown) {}
  addPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  bezierCurveTo(): void {}
  quadraticCurveTo(): void {}
  arc(): void {}
  arcTo(): void {}
  ellipse(): void {}
  rect(): void {}
  closePath(): void {}
}

class PureImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  constructor(a: number | Uint8ClampedArray, b: number, c?: number) {
    if (typeof a === 'number') {
      this.width = a; this.height = b;
      this.data = new Uint8ClampedArray(Math.max(0, a * b * 4));
    } else {
      this.data = a; this.width = b; this.height = c ?? (b ? a.length / 4 / b : 0);
    }
  }
}
