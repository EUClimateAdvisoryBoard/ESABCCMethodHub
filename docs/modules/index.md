# Modules — technical deep-dives

Per-module page with the same structure on every one:

1. **User story** — what the Secretariat does with it.
2. **Data flow** — diagram of how a single action moves through the stack.
3. **Code surface** — the files that matter, with paths.
4. **API routes** — what the page calls, server side.
5. **Ingestion** — the scripts that feed the module.
6. **Schema** — the tables involved.
7. **Known limits & roadmap**.

## Cross-module surfaces (apply to all five)

Every production module now sits inside a shared **User Space** — see
[Vision → User Space](../vision/user-space.md). Common affordances:

- **⌘K Command Palette** — global search across References, Scenarios, News, Policies, Codes.
- **Onboarding tour** — 3–4 step intro on first visit; replay with `?help=1`.
- **Context Drawer** (`⌘.`) — shows artefacts related to the current page from the other four modules.
- **AI Assistant** — floating chat grounded on the current artefact (needs an LLM key).
- **Add to Collection / Workspace** — chips on every list card, plus a drag-drop drop-zone in collections.
- **Change history** — `history` popover on connections (and any artefact wired into `/api/artefact-history`).
- **@-mention notifications** — typing `@displayname` in any comment fans out an inbox notification.
- **Inline annotations** — wrap any text view with `<InlineAnnotator host_kind=… host_id=… />` to enable selection-based highlights.
- **Why am I seeing this?** — `<ExplainabilityBadge>` reveals score + weighted reasons + rule id for any AI suggestion.
- **Keyboard shortcuts** — `?` opens the cheat sheet; `g r/d/n/p/c` jumps modules.
- **Dark mode + density** — controlled in `/profile/preferences`.

<ul class="mh-modules" markdown>

<li markdown><a class="mh-module" href="../modules/references/" markdown>
<div class="mh-module__header"><span>M · 01</span><span>Stable</span></div>
<div class="mh-module__num">01</div>
<h3 class="mh-module__title">Reference Manager</h3>
<p class="mh-module__desc">Literature library · DOI lookup · PDF annotation · Word add-in bridge.</p>
<span class="mh-module__cta">Open →</span>
</a></li>

<li markdown><a class="mh-module" href="../modules/scenarios/" markdown>
<div class="mh-module__header"><span>M · 02</span><span>Stable</span></div>
<div class="mh-module__num">02</div>
<h3 class="mh-module__title">Data &amp; Scenario Explorer</h3>
<p class="mh-module__desc">Eurostat · IIASA AR6 · EEA projections · cross-filter + chart.</p>
<span class="mh-module__cta">Open →</span>
</a></li>

<li markdown><a class="mh-module" href="../modules/news-feed/" markdown>
<div class="mh-module__header"><span>M · 03</span><span>Stable</span></div>
<div class="mh-module__num">03</div>
<h3 class="mh-module__title">Secretariat News</h3>
<p class="mh-module__desc">Hourly RSS sweep · 24 h EU briefing · AI-summarised briefing.</p>
<span class="mh-module__cta">Open →</span>
</a></li>

<li markdown><a class="mh-module" href="../modules/policy-navigator/" markdown>
<div class="mh-module__header"><span>M · 04</span><span>Stable</span></div>
<div class="mh-module__num">04</div>
<h3 class="mh-module__title">EU Policy Navigator</h3>
<p class="mh-module__desc">Network map of EU climate laws · article-level text · annotation.</p>
<span class="mh-module__cta">Open →</span>
</a></li>

<li markdown><a class="mh-module" href="../modules/content-analysis/" markdown>
<div class="mh-module__header"><span>M · 05</span><span>Stable</span></div>
<div class="mh-module__num">05</div>
<h3 class="mh-module__title">Content Analysis</h3>
<p class="mh-module__desc">MAXQDA-style qualitative coding · hierarchical taxonomy · PDF viewer.</p>
<span class="mh-module__cta">Open →</span>
</a></li>

</ul>
