# M·47 Competitiveness Claims Register — verbatim quote extraction (6 August 2026)

*Extraction pass over the Competitiveness Claims Register (M · 47), the
follow-up named as the module's publication blocker in
`beta-modules-m45-m52-factcheck-2026-08.md`. That pass found the register
honest but unquotable: it asserted no verbatim text at all, marked every claim
as a paraphrase, and rendered that paraphrase inside quotation marks. This
pass extracts the speakers' own words where the sources can be reached, states
plainly where they cannot, and adds the machine revalidation that ground rule 2
requires.*

## Outcome

**8 of 14 claims now carry a verbatim quote**, each an exact substring of a
stored source excerpt, revalidated on every run of `npm run check:claims`.
**6 carry no quote and say why on the card.** No paraphrase was promoted to a
quote, and no quote was edited to make a check pass.

| Claim | Speaker | Quote | Source |
|---|---|---|---|
| a1 energy prices | Draghi | ✅ | Draghi report Part A, energy-costs section |
| a2 deindustrialisation | Antwerp signatories | ✅ | Antwerp Declaration preamble |
| a3 ETS driving production out | Eurofer | ❌ | recurring position, no single dated text reachable |
| a4 CSRD data points | BusinessEurope | ❌ | recurring position, no dated document reachable |
| a5 25 % simplification | European Council | ⚠️ partial | Commission restatement quoted; EUCO text unreachable |
| a6 2035 engine ban | ACEA / EPP | ❌ | acea.auto returns a 202 bot challenge |
| a7 omnibus savings | European Commission | ✅ | Commission news item, 26 February 2025 |
| f1 clean-tech market | European Commission | ✅ | COM(2025) 85, section 6.1 |
| f2 gas-price crisis | ACER | ✅ | ACER gas-monitoring news item |
| f3 decoupling | EEA | ✅ | EEA total net GHG indicator |
| f4 renewables cheapest | IRENA/IEA | ❌ | irena.org returns 403 |
| f5 cost of inaction | — | ❌ | **structural**: no single named speaker |
| f6 first-mover advantage | — | ❌ | **structural**: no single named speaker |
| f7 omnibus is deregulation | ECCJ | ✅ | ECCJ press release, February 2025 |

## Findings beyond the extraction itself

### 1. The page was quoting the compiler, not the speakers

Every claim card rendered the register's own paraphrase wrapped in curly
quotation marks. The data file was scrupulous — `attribution: 'paraphrase'` on
every entry, a QUOTE POLICY block saying no verbatim text was asserted — but
the UI undid all of it, because a sentence in quotation marks under a named
speaker reads as that speaker's words. This is the most consequential thing
the pass found, and it needed no source access to fix: the paraphrase is now
rendered unquoted, and quotation marks appear only around text that has been
machine-checked against a source.

### 2. A wrong Council document number, introduced by the previous pass

The 2026-08 fact-check "corrected" the Budapest Declaration locator by
attaching **Council document ST 15518/2024** to it, taken from a search result
rather than from the document. ST 15518/2024 was fetched from the Council
register in this pass and is **a Presidency note to Coreper on the
contribution of research and innovation to competitiveness** — not the
declaration. The Budapest Declaration was adopted at an *informal* European
Council and appears to carry no ST number; it is now cited by title and date
only.

Worth recording as a lesson about this repository's own QA loop: a
verification pass that takes a document number from a search snippet has not
verified anything. The previous pass improved the URL and simultaneously
introduced a false identifier, and only fetching the document caught it.

### 3. The EEA decoupling pairing was 36 %, not 37 %

The previous pass set the f3 basis to "GDP +70 % against net emissions −37 %",
described as "the EEA's own paired statement". The EEA indicator page actually
reads, verbatim: *"Between 1990 and 2023, EU net GHG emissions fell by 36%,
while GDP grew by nearly 70% over the same period."* The 36 % / 37 %
discrepancy across EEA vintages had been flagged in that pass, but the wrong
side of it was then used for the pairing. Now quoted directly, so the pairing
cannot drift again.

The proposition text still says "roughly 37 %" and the SUPPORTED verdict
stands — 36 % and 37 % are both "over a third" and the claim is about the
direction and rough magnitude — but the evidence now shows what the source
says rather than a number assembled next to it.

### 4. Two claims cannot be quoted because they have no speaker

f5 (cost of inaction) and f6 (first-mover advantage) are not extraction
failures. They are arguments the register attributes to no single dated text,
so there is nobody to quote. That is a **claim-selection** problem, not a
sourcing one: the register's own rule requires claims to come from named
institutional sources, and these two do not satisfy it as written. The honest
fix is to split each into separately attributable claims or drop them. That is
a content decision for the Secretariat, so both are left in place with the
reason stated.

### 5. a5 is quoted from the wrong speaker, deliberately and visibly

The 25 % / 35 % simplification target is quoted verbatim from the
**Competitiveness Compass, COM(2025) 30** — the Commission restating it — not
from the Budapest Declaration, because consilium.europa.eu is unreachable from
this environment (403 to plain HTTPS, connection reset to a headless browser).
The claim is attributed to the European Council. The mismatch is stated
in the locator itself rather than glossed, so a reader cannot mistake the
Commission's words for the European Council's.

## The checker

`scripts/check-competitiveness-quotes.mjs`, wired as `npm run check:claims`.
It substring-checks every quote against its excerpt in
`scripts/competitiveness-claims-sources/` after one documented normalisation
(curly quotes and dashes folded, whitespace collapsed) applied identically to
both sides — because PDF extraction and HTML rendering disagree about exactly
those characters, not to give quotes latitude on their words.

Three properties are deliberate:

- **Ellipses cannot stitch.** A quote may elide with ` … `; each segment is
  checked in order with a moving cursor, so an ellipsis cannot join text that
  does not appear in that sequence in the source.
- **Zero records is a failure, not a pass.** If the parser goes stale against
  a reshaped data file it exits non-zero rather than reporting success over
  nothing — the silent-failure rule applied to the checker itself.
- **Quote and gap-reason are mutually exclusive and jointly exhaustive.** A
  null quote without a reason fails; a quote carrying a reason fails. A gap
  cannot be quietly closed by promoting a paraphrase.

Two bugs were caught while writing it, both worth recording because both would
have produced *false confidence*:

1. The first parser matched proposition ids as well as claim ids and paired a
   proposition with the *next claim's* quote — reporting a pass for text that
   belonged to a different claim. Fixed by anchoring on the exact indentation
   of a claim entry.
2. The parser compared the raw TypeScript literal, so a quote containing an
   apostrophe stored as `\'` was compared as backslash-apostrophe and failed
   for a reason unrelated to the source. Fixed by unescaping before comparison.

The second failed loudly and was harmless. The first passed loudly and was
not.

## What this pass did NOT do

- **No verdict was revisited.** Verdicts remain AI-drafted and pending
  Secretariat sign-off. Adding a quote does not validate the verdict attached
  to it.
- **The claim-selection rule and the 7/7 balance were not re-audited**, beyond
  observing that f5 and f6 do not satisfy the rule as written.
- **The six unquoted claims were not chased through secondary sources.** A
  secondary restatement is not the speaker's words. Where the primary source
  is unreachable the gap stands.
- **The `sourceUrl` fields were not link-checked** except for the ones touched
  here.

## Deferred backlog — good ideas deliberately not in this round

- Run `check:claims` in CI alongside `check:policies`, once someone decides
  whether an unreachable-source gap should ever fail a build (currently it
  cannot, by design).
- Re-attempt a3, a4, a6 and f4 from a machine with different network egress;
  all four are ordinary public documents that this environment cannot reach.
- Split f5 and f6 into attributable claims, or retire them.
- Extend the same quote-plus-checker pattern to the other beta modules that
  carry quoted material.
