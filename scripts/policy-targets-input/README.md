# Policy-target candidates

Every `*.json` here is a set of candidate target quotes, unioned by
`scripts/build-policy-targets.mjs` into the register. Shape:

```json
[{ "policy_id": "afir-regulation",
   "targets": [{ "quote": "…verbatim source text…",
                 "article": "Article 9(1)(b)",
                 "label": "target",
                 "source": "why this candidate exists" }] }]
```

- `_regex.json` is the deterministic regex sweep — regenerated, don't hand-edit.
- `_corrections-*.json` are the reviewed correction passes: re-extractions of
  quotes that were truncated, and targets that were missing.
- The rest are per-act extraction outputs.

**Before adding anything here, read
[`docs-internal/policy-targets-what-counts-as-a-target.md`](../../docs-internal/policy-targets-what-counts-as-a-target.md)** —
the reviewer's rules for what is and is not a target.

Two rules the build enforces silently, so get them right:

1. **`quote` must be a verbatim contiguous substring** of
   `public/data/policy-texts/<policy_id>.txt` (whitespace normalised). Copy it
   out of the file; never retype or paraphrase it.
2. **`quote` must be ≤ 900 characters.** A longer one is rejected — and if you
   dropped the row it supersedes, the target vanishes. Trim to the last complete
   list item, then check after `npm run build:policy-targets` that every
   candidate you added is in the rebuilt dataset.
