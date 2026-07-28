/**
 * Resolver half of ts-resolve-hook.mjs — runs on the module loader thread.
 *
 * Only relative specifiers with no extension are touched, and only when the
 * `.ts` file actually exists; everything else falls through to Node's own
 * resolution untouched, so a genuinely missing module still fails loudly
 * instead of being papered over.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const HAS_EXT = /\.[cm]?[jt]sx?$|\.json$/;

export function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !HAS_EXT.test(specifier) && context.parentURL) {
    const base = dirname(fileURLToPath(context.parentURL));
    for (const cand of [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`]) {
      const abs = resolvePath(base, cand);
      if (existsSync(abs)) {
        return next(pathToFileURL(abs).href, context);
      }
    }
  }
  return next(specifier, context);
}
