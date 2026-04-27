'use client';

// ---------------------------------------------------------------------------
// useClipboardIdentifier — smart-paste detection for DOI / arXiv / ISBN.
//
// Given a focused input, peek at the clipboard (with one-shot user
// permission via navigator.clipboard.readText) and return any recognised
// scholarly identifier so the caller can render a one-tap "Paste this?"
// chip — saving the user the explicit copy → paste step.
//
// Returns null when:
//   - the clipboard API is unavailable (HTTP, older Safari)
//   - the user denies permission
//   - the clipboard does not contain a recognisable identifier
//   - the value is already present in the input (don't pester the user)
//
// Identifier shapes recognised:
//   DOI   — 10.<registrant>/<suffix>           (with or without doi.org/ prefix)
//   arXiv — arXiv:1234.5678 | arXiv:hep-th/9901001
//   ISBN  — 13-digit (978/979 prefix) or 10-digit
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';

export type ClipboardIdentifier =
  | { kind: 'doi'; raw: string; canonical: string }
  | { kind: 'arxiv'; raw: string; canonical: string }
  | { kind: 'isbn'; raw: string; canonical: string };

const DOI_RE   = /\b(?:doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[^\s"'<>]+)/i;
const ARXIV_RE = /\b(?:arxiv:\s*)?((?:\d{4}\.\d{4,5})|(?:[a-z-]+\/\d{7}))(v\d+)?\b/i;
const ISBN_RE  = /\b(?:ISBN[:\s]*)?((?:97[89][- ]?\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?[\dXx])|(?:\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?[\dXx]))\b/;

export function detectIdentifier(text: string): ClipboardIdentifier | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return null;

  const doi = trimmed.match(DOI_RE);
  if (doi) {
    const canonical = doi[1].replace(/[).,;]+$/, '');
    return { kind: 'doi', raw: trimmed, canonical };
  }
  const arxiv = trimmed.match(ARXIV_RE);
  if (arxiv) {
    return { kind: 'arxiv', raw: trimmed, canonical: arxiv[1] };
  }
  const isbn = trimmed.match(ISBN_RE);
  if (isbn) {
    const digits = isbn[1].replace(/[- ]/g, '');
    if (digits.length === 10 || digits.length === 13) {
      return { kind: 'isbn', raw: trimmed, canonical: digits };
    }
  }
  return null;
}

type UseClipboardOptions = {
  enabled?: boolean;        // default true
  currentValue?: string;    // suppress chip if clipboard already matches the field value
};

export function useClipboardIdentifier({
  enabled = true,
  currentValue = '',
}: UseClipboardOptions = {}) {
  const [identifier, setIdentifier] = useState<ClipboardIdentifier | null>(null);
  const [denied, setDenied] = useState(false);

  const check = useCallback(async () => {
    if (!enabled || denied) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      const id = detectIdentifier(text);
      if (id && id.canonical && id.canonical !== currentValue.trim()) {
        setIdentifier(id);
      } else {
        setIdentifier(null);
      }
    } catch {
      // User denied permission, browser doesn't support, or page not focused.
      // Either way: don't ask again this session.
      setDenied(true);
      setIdentifier(null);
    }
  }, [enabled, denied, currentValue]);

  // Best-effort: also peek when the tab regains focus (user just came back
  // from a PDF reader or a publisher page where they copied the DOI).
  useEffect(() => {
    if (!enabled) return;
    function onFocus() { void check(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, check]);

  function dismiss() { setIdentifier(null); }

  return { identifier, check, dismiss };
}
