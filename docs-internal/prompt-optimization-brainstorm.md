# Prompt Optimization Brainstorm — All LLM Workflows

A structured brainstorm of how to improve prompting across every LLM-powered workflow in
the Method Hub. Based on a full inventory of prompt sites as of June 2026.

## Current LLM workflow inventory (what we're optimizing)

| Workflow | Where | Model | Output |
|---|---|---|---|
| Email/newsletter summary | `src/app/api/inbound-email/summarize/route.ts` | auto (Haiku default) | prose |
| Detailed press-review analysis | `src/lib/ai-summary.ts` → `generateDetailedAnalysis` | long-form (Sonnet) | structured prose |
| Master-code classification | `src/app/api/content-analysis/classify/route.ts` | Gemini 2.5 Flash | JSON schema |
| Code-segment suggestions | `src/app/api/content-analysis/suggest-codes/route.ts` | Gemini 2.5 Flash | JSON schema |
| Block re-segmentation | `src/app/api/content-analysis/resegment/route.ts` | Gemini 2.5 Flash | JSON schema |
| Brussels Bulletin topics | `src/app/api/brussels-bulletin/topics/route.ts` | long-form | JSON (hand-parsed) |
| Brussels Bulletin generation | `src/app/api/brussels-bulletin/route.ts` | long-form | JSON (hand-parsed) |
| Meeting key points / summary | `src/lib/project-workspace/meeting-ai.ts` | auto | JSON array / prose |
| Policy Clock weekly overview | `src/app/api/policy-clock/route.ts` | auto | prose |
| Daily factsheet | `src/app/api/daily-summary/factsheet/route.ts` | auto | JSON (hand-parsed) |
| Policy retagging batches | `scripts/retag-policies.mjs` | external Claude agents | JSON result files |

---

## 1. Cross-cutting improvements (apply everywhere)

### 1.1 Centralize prompts into a prompt library
- Today prompts are inline template literals scattered across ~10 files. Move them to
  `src/lib/prompts/` as named, versioned exports (e.g. `bulletinTopicsPrompt.v2`).
- Benefits: diffable prompt history, one place to review tone/style rules, reusable
  shared fragments (the ESABCC persona, UK-English style block, "no preamble" rules are
  currently copy-pasted with drift between files).
- Add a `PROMPT_VERSION` string to each and log it with every call, so output regressions
  can be traced to a prompt change.

### 1.2 Shared system-prompt fragments
Recurring blocks that should be written once and composed:
- **Persona block**: "You are the ESABCC Secretariat / a senior EU climate-policy analyst…"
- **Style block**: UK English, no preamble, no meta-commentary, name concrete dates /
  legislative references / numbers, distinguish adopted vs proposed vs rumoured.
- **Grounding block**: "Use only facts present in the supplied sources. If the source is
  vague, say so. Never invent figures, code IDs, or citations."
- **JSON discipline block**: output-only-JSON rules, sentence-completion rules.

### 1.3 Few-shot examples — the single biggest missing lever
No prompt in the codebase has a single worked example. Few-shot examples typically
improve consistency more than any instruction tweak:
- **Classification/suggest-codes**: include 2–3 mini examples of (document excerpt →
  correct codes with confidence + rationale), including one *negative* example showing a
  tempting-but-wrong code being correctly omitted. This directly targets the known
  over-extraction problem.
- **Bulletin**: include one abbreviated example edition (a few sentences per section) so
  the model learns register and granularity, not just shape.
- **Factsheet executive summary**: one example summary anchors the desired density of
  named policies and figures.
- Keep examples short and synthetic to limit token cost; with Anthropic, put them in the
  cached prefix (see 1.7).

### 1.4 Use native structured output everywhere
- Gemini routes already use `responseSchema` — good. But bulletin, factsheet, topics, and
  meeting key-points hand-roll "return JSON in this exact shape" + fence-stripping +
  regex recovery. This is the most fragile code in the stack (the factsheet route has a
  regex to rescue truncated `executiveSummary` strings).
- Switch to provider-native structured output: Anthropic tool-use with `input_schema`
  (or `output_format: json_schema`), OpenAI `response_format: { type: "json_schema" }`,
  Gemini `responseSchema`. Then delete the fence-stripping/regex layer.
- Validate everything with Zod schemas shared between the prompt and the parser, so the
  schema in the prompt can be *generated from* the Zod type and never drifts.

### 1.5 Right-size max_tokens to stop truncation at the source
- Factsheet truncation recovery exists because 2200 tokens is sometimes too small for the
  requested JSON. Either raise the budget or shrink the ask (fewer topStories fields).
  A truncated-JSON repair regex is a symptom, not a fix.
- Add an explicit "if you are running out of room, prefer dropping `signals` items over
  truncating `executiveSummary`" priority instruction as a belt-and-braces measure.

### 1.6 Two-pass patterns for the high-stakes outputs
- **Draft → critique → revise** for the Brussels Bulletin: a second cheap call that checks
  the draft against the source pack ("list any claim not supported by a source item")
  catches hallucinations before a human sees them.
- **Extract → synthesize** for the factsheet: first call extracts per-article structured
  facts (actors, numbers, instruments), second call writes the summary from those facts
  only. This bounds hallucination and makes the summary auditable.

### 1.7 Prompt caching for repeated context
- The master-code catalog (~hundreds of codes) is resent verbatim on every classify /
  suggest-codes / retag call. With Anthropic, mark the catalog + instructions + few-shots
  as a cached prefix (`cache_control`); Gemini has context caching too. Big cost and
  latency win for the content-analysis endpoints.
- Order prompts as: static instructions → catalog → few-shots → *then* the per-call
  document, so the cacheable prefix is maximal.

### 1.8 Confidence calibration
- Confidence fields (classify, suggest-codes, retag) are uncalibrated 0–1 floats. Replace
  with a defined ordinal scale in the prompt: e.g. `0.9+ = explicit textual statement`,
  `0.7 = strong inference`, `0.5 = plausible but indirect`, and instruct "when in doubt,
  use the lower band". Map UI thresholds to those bands.

### 1.9 Self-check instructions at the end of prompts
Cheap, no extra calls: end JSON prompts with a short checklist the model verifies before
answering — "Before responding, check: (1) every codeId exists in the catalog; (2) every
quote appears verbatim in the document; (3) the JSON parses." Models follow these
remarkably well and it reduces validator rejections.

### 1.10 Retry semantics with error feedback
- `ai-summary.ts` retries on 429/5xx, but *validation* failures (bad JSON, invalid codeId,
  quote not found) are silently dropped. Add one "repair retry": resend with the model's
  invalid output plus the specific validation error ("codeId `root-foo` does not exist;
  valid ids are…"). One repair round recovers most failures.
- Content-analysis Gemini routes have no retry at all — extend the shared retry helper to
  them.

### 1.11 Date/context injection
- Several prompts reason about time ("next 7 days", "period X to Y", "rumoured vs
  adopted") without being told today's date. Always inject `Today is {ISO date}.` —
  models otherwise guess from training data and mislabel recency.

### 1.12 Language & source-quality hints
- News and EUR-Lex sources are multilingual. Add "Sources may be in any EU language;
  always answer in UK English" plus an instruction to flag low-confidence translations.

---

## 2. Per-workflow ideas

### 2.1 Email summarization (`inbound-email/summarize`)
- Add a *newsletter-type detection* preamble step or instruction branch: digests with 15
  unrelated items need "pick the 3 most ESABCC-relevant items" behaviour, not a blended
  5–7-sentence paragraph that averages everything.
- Strip quoted reply chains / footers / unsubscribe boilerplate *before* the LLM call
  (deterministic regex) — currently up to 8k chars of body includes that noise and wastes
  the budget.
- Add a relevance gate: "If this email contains no EU climate/energy policy substance,
  return exactly `NOT_RELEVANT`." Saves the detailed-analysis call downstream.

### 2.2 Detailed press-review analysis (`generateDetailedAnalysis`)
- It demands cross-referencing but receives one email at a time. Optionally pass the
  day's other item titles as context: "Other items in today's digest: …" so
  cross-references are real rather than invented.
- The 3-part structure is described in prose; convert section names/word budgets into a
  literal skeleton the model fills ("## Executive Summary\n[4–6 sentences]…"). Skeletons
  beat descriptions for format adherence.

### 2.3 Content-analysis classify
- 120-block truncation can drop the relevant half of a long regulation. Options:
  map-reduce (classify per chunk, merge with max-confidence), or a cheap first pass that
  selects the 120 *most code-relevant* blocks (embedding similarity vs code descriptions)
  instead of the first 120.
- Catalog rendering: group codes by parent with indentation rather than a flat
  `id :: name (parent)` list — hierarchy context measurably improves code selection.
- Tell the model the expected ballpark: "Most documents match 3–8 codes" anchors output
  size and reduces both over- and under-tagging.

### 2.4 Suggest-codes
- The verbatim-quote + anchoring design is strong. Improve hit rate by instructing
  "copy the quote exactly including punctuation and capitalisation; do not normalise
  quotes or dashes" — most fuzzy-match failures are smart-quote/dash substitutions.
- Ask for `blockId` *first* in each suggestion object (field order influences generation:
  picking the block first conditions the quote on it).
- Add per-code caps in the prompt ("max 4 suggestions per code") to enforce the breadth
  requirement structurally instead of rhetorically.

### 2.5 Re-segmentation
- For EU legal acts, segmentation is largely deterministic (recital `(N)`, `Article N`
  patterns). Do a regex pre-pass and only send the LLM the residual unstructured spans.
  Cheaper, faster, and verbatim-by-construction.
- If keeping the LLM pass: have it return character offsets or first/last 5 words per
  block instead of full verbatim text, then slice the original string locally — removes
  the paraphrase risk entirely and cuts output tokens ~10x.

### 2.6 Brussels Bulletin (topics + generation)
- **Topics step**: ask for `itemIds` per topic (not just `itemCount`) — enables the
  generation step to receive only the items for its topics, and lets the UI show which
  sources feed each topic.
- **Generation step**: generate per-topic sections in parallel calls (one per topic with
  only its items), then a final cheap assembly call for ordering and the "other
  developments" sweep-up. Per-topic calls respect word budgets far better than one
  monolithic 1500-word request, and failures are isolated.
- Word budgets: models can't count words well. Convert "~375 words" to "2–3 paragraphs of
  4–6 sentences" — sentence/paragraph budgets are followed much more reliably.
- Add citation indices: require each paragraph to end with `[item 12, 34]` source
  references (stripped before display, used for verification).

### 2.7 Meeting AI
- Key-points prompt asks for "EXACTLY three items" even when the meeting was trivial —
  forces padding. Allow 1–3 with "fewer if the record doesn't support three".
- Pass the project context (project name, known workstreams) so key points use the
  team's vocabulary.
- Combine key-points + summary into a single structured call (one JSON with both fields)
  — halves cost/latency and keeps the two outputs consistent with each other.

### 2.8 Policy Clock weekly overview
- 220 max tokens with a "max 80 words" ask is fine, but add the *current date and
  weekday* and ask it to anchor phrasing ("On Tuesday the ENVI committee…") — concrete
  weekday phrasing reads much better for a briefing.
- Feed event importance scores (already computed for the non-AI fallback) into the
  prompt: "Events marked HIGH must be mentioned" — aligns AI and fallback behaviour.

### 2.9 Daily factsheet
- Biggest issue is story selection. Add explicit ranking criteria with priority order
  (1. EU legislative decisions > 2. Commission proposals > 3. member-state implementation
  > 4. market/finance signals) instead of "MOST important".
- The EU-relevance exclusion list (US, China, Morocco…) is brittle; replace with the
  positive rule only ("must involve EU institutions, member states, or EU-level policy —
  when in doubt, exclude") plus one few-shot negative example.
- Emit `topStories` before `executiveSummary` in the schema: selecting stories first then
  summarizing them is the natural reasoning order and improves summary/selection
  consistency (generation order follows field order).

### 2.10 Policy retagging agent batches
- The agent rules live in comment headers, not in the batch files. Embed the full
  instruction block + 2 worked examples *inside* each `batch-N.json` so agents are
  self-contained and rule drift is impossible.
- Add a machine-checkable contract: include the JSON schema for `result-N.json` in the
  batch file; have `compile` report per-rule violations (missing root code, >6 codes…)
  back as a re-run file for the agent.

---

## 3. Infrastructure & process

### 3.1 Eval harness (the prerequisite for everything above)
You can't optimize prompts you can't measure. Minimal viable setup:
- Curate 10–30 golden inputs per workflow (real emails, documents, news days) with
  expected outputs or graded rubrics; store under `evals/`.
- A script (`node scripts/run-evals.mjs --workflow=classify`) runs the live prompt
  against the golden set and reports: JSON-parse rate, schema-valid rate, codeId
  validity, quote-anchor hit rate, and an LLM-judge score for prose quality.
- Run it in CI when anything under `src/lib/prompts/` changes. This converts prompt
  edits from vibes to regressions-caught.

### 3.2 Observability
- Log per call: prompt version, provider/model, tokens in/out, latency, validation
  outcome, repair-retry used. Even a JSONL file or Supabase table is enough.
- Track validator rejection reasons over time — they tell you exactly which prompt
  instruction is failing.

### 3.3 Model routing review
- Classification/extraction tasks (classify, suggest-codes, resegment, key points) are
  cheap-model territory; keep Flash/Haiku.
- Bulletin and detailed analysis are the public face — route those to the strongest
  available model (Sonnet/Opus tier) regardless of the auto-selection order, and consider
  making the priority order task-specific instead of global (Azure > Gemini > Anthropic >
  OpenAI today regardless of task).
- Periodically re-benchmark with the eval harness when new model versions land, since
  model IDs are pinned in `ai-summary.ts`.

### 3.4 Graceful degradation tiers
Several routes already have non-AI fallbacks (policy clock, factsheet). Standardize the
pattern: structured-output attempt → repair retry → cheaper-model retry → deterministic
fallback, and surface which tier produced the result in the response metadata so the UI
can label AI vs fallback content.

---

## 4. Suggested priority order

**Quick wins (hours each):**
1. Inject today's date into every prompt (1.11).
2. Self-check checklists at end of JSON prompts (1.9).
3. Sentence/paragraph budgets instead of word counts in bulletin (2.6).
4. Field-order fixes: blockId-first in suggest-codes, topStories-first in factsheet.
5. Allow 1–3 meeting key points instead of exactly 3.
6. Strip email boilerplate pre-LLM (2.1).

**Medium (a day or two each):**
7. Centralized prompt library with shared fragments + versions (1.1–1.2).
8. Native structured output + Zod everywhere; delete regex JSON recovery (1.4).
9. Repair-retry on validation failure (1.10).
10. Few-shot examples for classify, suggest-codes, factsheet (1.3).
11. Prompt caching for the code catalog (1.7).

**Larger (worth planning):**
12. Eval harness + golden sets + CI gate (3.1).
13. Per-topic parallel bulletin generation with item-level citations (2.6).
14. Regex pre-pass for legal-act segmentation; offset-based resegment output (2.5).
15. Extract-then-synthesize factsheet pipeline (1.6).
