'use client';

// ---------------------------------------------------------------------------
// useUrlState — URL-as-state primitive (foundation for items 1.1 / 3.1 /
// 4.1 / 5.1 in docs/vision/brainstorm-modules-uxui-feasibility-rank.md).
//
// Encodes view state (selection, filters, mode, …) into the URL so that:
//
//   • Refresh and back/forward restore the exact view.
//   • A pasted link opens the same view in another tab / browser.
//   • Cross-module deep-links (e.g. news → policy article) land precisely.
//
// The hook is intentionally minimal — no Zod, no router-level effects.
// Callers provide a `codec` per field describing how to (de)serialise to
// a string, and a `defaults` object. Serialised values that match the
// default are *omitted* from the URL to keep links short.
//
// History strategy
//   • `push: true`   → router.push        (creates back-button history)
//   • `push: false`  → router.replace     (default — no history pollution)
//
// Updates are debounced (default 120 ms) so rapid typing into a search
// field doesn't spam the history stack.
// ---------------------------------------------------------------------------

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type UrlCodec<T> = {
  parse: (raw: string | null) => T;
  stringify: (value: T) => string | null;     // return null to omit the param
};

// ---- Common codecs ---------------------------------------------------------

export const codecs = {
  string(defaultValue = ''): UrlCodec<string> {
    return {
      parse: (raw) => (raw ?? defaultValue),
      stringify: (v) => (v === defaultValue ? null : v),
    };
  },
  number(defaultValue = 0): UrlCodec<number> {
    return {
      parse: (raw) => {
        if (raw == null) return defaultValue;
        const n = Number(raw);
        return Number.isFinite(n) ? n : defaultValue;
      },
      stringify: (v) => (v === defaultValue ? null : String(v)),
    };
  },
  boolean(defaultValue = false): UrlCodec<boolean> {
    return {
      parse: (raw) => (raw == null ? defaultValue : raw === '1' || raw === 'true'),
      stringify: (v) => (v === defaultValue ? null : v ? '1' : '0'),
    };
  },
  enum<T extends string>(values: readonly T[], defaultValue: T): UrlCodec<T> {
    return {
      parse: (raw) => (raw && (values as readonly string[]).includes(raw) ? (raw as T) : defaultValue),
      stringify: (v) => (v === defaultValue ? null : v),
    };
  },
  // Comma-separated list of strings; preserves order, drops empties.
  csv(defaultValue: string[] = []): UrlCodec<string[]> {
    const isDefault = (v: string[]) =>
      v.length === defaultValue.length && v.every((x, i) => x === defaultValue[i]);
    return {
      parse: (raw) => (raw ? raw.split(',').filter(Boolean) : [...defaultValue]),
      stringify: (v) => (isDefault(v) ? null : v.length ? v.join(',') : null),
    };
  },
};

// ---- Hook ------------------------------------------------------------------

type Schema = Record<string, UrlCodec<unknown>>;
type Values<S extends Schema> = { [K in keyof S]: S[K] extends UrlCodec<infer T> ? T : never };

export type UseUrlStateOptions = {
  /** Push a new history entry on update (default: false → router.replace). */
  push?: boolean;
  /** Debounce in ms before writing to the URL (default: 120). */
  debounceMs?: number;
};

export function useUrlState<S extends Schema>(
  schema: S,
  options: UseUrlStateOptions = {},
): [Values<S>, (patch: Partial<Values<S>>) => void, () => void] {
  const { push = false, debounceMs = 120 } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read once on mount + every time the URL changes.
  const fromUrl = useMemo<Values<S>>(() => {
    const out = {} as Values<S>;
    for (const key of Object.keys(schema) as (keyof S)[]) {
      const codec = schema[key];
      (out as Record<string, unknown>)[key as string] = codec.parse(
        searchParams?.get(key as string) ?? null,
      );
    }
    return out;
  }, [schema, searchParams]);

  // Mirror in local state so consumers can read without a re-render race.
  const [state, setState] = useState<Values<S>>(fromUrl);

  // When the URL changes externally (e.g. nav back), pull it in.
  const lastUrlRef = useRef<string>('');
  useEffect(() => {
    const sig = JSON.stringify(fromUrl);
    if (sig !== lastUrlRef.current) {
      lastUrlRef.current = sig;
      setState(fromUrl);
    }
  }, [fromUrl]);

  // Debounced URL writer.
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeUrl = useCallback(
    (next: Values<S>) => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        for (const key of Object.keys(schema) as (keyof S)[]) {
          const codec = schema[key];
          const encoded = codec.stringify((next as Record<string, unknown>)[key as string]);
          if (encoded == null) params.delete(key as string);
          else params.set(key as string, encoded);
        }
        const qs = params.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;
        // scroll: false keeps the page anchored when only state changes.
        if (push) router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
        lastUrlRef.current = JSON.stringify(next);
      }, debounceMs);
    },
    [debounceMs, pathname, push, router, schema, searchParams],
  );

  const update = useCallback(
    (patch: Partial<Values<S>>) => {
      setState((prev) => {
        const next = { ...prev, ...patch } as Values<S>;
        writeUrl(next);
        return next;
      });
    },
    [writeUrl],
  );

  const reset = useCallback(() => {
    const blank = {} as Values<S>;
    for (const key of Object.keys(schema) as (keyof S)[]) {
      const codec = schema[key];
      (blank as Record<string, unknown>)[key as string] = codec.parse(null);
    }
    setState(blank);
    writeUrl(blank);
  }, [schema, writeUrl]);

  // Flush any pending write on unmount so unloads don't drop state.
  useEffect(() => () => {
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
  }, []);

  return [state, update, reset];
}
