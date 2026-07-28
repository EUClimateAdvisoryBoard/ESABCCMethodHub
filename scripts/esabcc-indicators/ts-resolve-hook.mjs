/**
 * Let Node's type stripping import the app's TypeScript directly.
 *
 * The app's modules import each other extensionless (`./formula`) the way
 * bundlers accept and Node's ESM resolver does not. This hook appends `.ts`
 * (or `/index.ts`) when a relative specifier has no extension, so a script can
 * run `src/lib/**` as-is.
 *
 * The point of doing it this way rather than bundling: a bundle is a snapshot,
 * and a snapshot of this repo's data modules went stale once and silently fed
 * hours of document builds from pre-correction values. Resolving live has no
 * cache to go stale.
 *
 * Usage:
 *   node --experimental-strip-types \
 *        --import ./scripts/esabcc-indicators/ts-resolve-hook.mjs script.mjs
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-resolve-hook-impl.mjs', import.meta.url);

export { };
