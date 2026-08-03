/**
 * Resolve hook: let Node's type stripping follow the app's extensionless
 * relative imports (`./formula`, `@/lib/...`), which TypeScript writes and
 * Node's ESM resolver does not accept.
 *
 * Registered by the scripts that read the app's own modules directly rather
 * than through a bundler, so those scripts use the same source the Hub runs.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXTS = ['.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;

  // `@/x` is the app's alias for `<root>/src/x` (see tsconfig paths).
  if (spec.startsWith('@/')) {
    spec = pathToFileURL(join(ROOT, 'src', spec.slice(2))).href;
  }

  const relative = spec.startsWith('./') || spec.startsWith('../');
  if (relative || spec.startsWith('file:')) {
    const base = relative && context.parentURL ? context.parentURL : undefined;
    const url = new URL(spec, base);
    if (url.protocol === 'file:') {
      const path = fileURLToPath(url);
      if (!existsSync(path)) {
        for (const ext of EXTS) {
          if (existsSync(path + ext)) return nextResolve(pathToFileURL(path + ext).href, context);
        }
      }
      return nextResolve(url.href, context);
    }
  }

  return nextResolve(specifier, context);
}
