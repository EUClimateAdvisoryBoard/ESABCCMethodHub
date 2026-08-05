# MethodHub — Monetization & Spin-Out Options

*Working paper, August 2026. A strategic assessment of what in the MethodHub estate
(8 production modules, 35 beta modules M·09–M·43, the analytics layer, and the data
assets) could be turned into a product or revenue stream, and under which constraints.*

---

## 1. Starting point: what the constraint actually is

MethodHub itself is deliberately non-commercial. FAQ Q29 states there is no SaaS
subscription, no per-user licence, no managed-platform fee, and the codebase is open
source. It runs for a public advisory body, and the ESABCC cannot sell anything —
neither can the EEA once it hosts the service.

So "monetize MethodHub" really means one of two things:

1. **Fund the public mission** — grants, institutional budgets, or service contracts
   that pay for stewardship and expansion, without a commercial customer.
2. **Spin out a product** — a separate entity takes a fork (or a rebuild) of specific
   modules/data pipelines and sells it to a market that is *not* the Secretariat.

Both are viable. They monetize different assets and have very different risk
profiles. Everything below is sorted into those two tracks.

Three hard constraints apply to any spin-out:

- **IP and separation.** The repo is public and open source, currently under a
  personal GitHub account with a planned move to an ESABCC/EEA org. Work done as
  Secretariat staff likely belongs to the employer. Before any commercial use, get
  written clarity on who owns what, and keep the commercial codebase and brand
  cleanly separated. A spin-out must not use the ESABCC name or imply endorsement —
  the Board's independence is worth more than any product.
- **Data licences.** Eurostat, EUR-Lex, EEA, climate-laws.org (CC-BY 4.0), Horizon
  Europe Dashboard (CC-BY 4.0) and EFFIS all permit commercial reuse with
  attribution. **Not** cleanly reusable: Newton Media exports (paid,
  non-redistributable), SEAMAPS/OAG (unprocured), the EIB green-bond set
  (unlicensed), and possibly the IIASA AR6 scenario snapshot — IIASA database terms
  vary and must be checked before any commercial redistribution of scenario data.
- **No billing infrastructure exists.** No Stripe, no plans/entitlements, no
  metering. The seat-and-role scaffolding (Supabase auth, workspaces,
  editor/viewer roles, external-contributor tokens) is a head start, but an
  entitlement layer is net-new work.

---

## 2. The asset inventory, ranked by monetization value

What in the estate is genuinely rare — hard for a competitor to replicate quickly?

**Tier 1 — unique structured datasets (the crown jewels)**

| Asset | Why it's valuable |
|---|---|
| **Policy Targets Register (M·36)** | Verbatim quantified EU climate targets with exact legal wording and source provision, first/second-order classified, human-confirmed, versioned masterfile. Nobody sells this as structured data today. |
| **EU Policy Hierarchy (M·42) + Policy Navigator (M·04) + Green Deal Tracker (M·39)** | The whole climate acquis as a navigable, connected, status-tracked graph — 97 mapped acts, 93 tracked initiatives, CELEX-joined, with a "moving now" layer for the 2025-26 omnibus agenda. |
| **National implementation tracker (M·20) + NECPR mapping (M·40)** | EU-law → national-implementation ratings per Member State, plus the hand-built mapping of 209 national objectives into 26 target families. Painful, manual, verified work — exactly the kind competitors won't redo. |
| **Impact-assessment findings library (M·38)** | 80 findings from a 958-page SWD with verbatim numbers, page references, and source screenshots. A template for "evidence extraction as a product". |

**Tier 2 — differentiated software**

| Asset | Why it's valuable |
|---|---|
| **Content Analysis (M·05)** | A web-native, multi-user, AI-pre-coding qualitative analysis workbench. Incumbents (MAXQDA, NVivo, Atlas.ti) are expensive desktop software with weak collaboration and bolted-on AI. |
| **The blueprint itself** | A proven pattern: one Next.js app + Postgres + agentic coding = a full research workspace run by "two engineers". Documented fork path, Docker deployment, GDPR layer already built. |
| **Interactive policy models (M·26, M·29, M·34, M·37, M·41, M·43)** | ETS endgame, merit-order electricity pricing, electrification least-cost model, wildfire/land-sink, committed damages — teaching-grade interactive economics of EU climate policy. |
| **Voting Tool (M·06)** | Seven voting systems, anonymous, token/QR ballots, zero-PII. Small but complete. |

**Tier 3 — commodity** (real value internally, weak commercially): reference
manager, RSS news aggregation, fact-sheet builder, project management boards.
Crowded markets; don't build a business on these.

---

## 3. Track 1 — fund the public mission (no commercial customer)

### 1A. Blueprint services for the climate-council ecosystem  ★ best public-track option

M·18 already maps **~67 national climate advisory bodies** in Europe. Most have
secretariats of 2–15 people and no tooling beyond Office. MethodHub is, almost
verbatim, the product they need: reference management, indicator tracking,
policy-coherence workbenches, anonymous board voting, recommendation-uptake
tracking.

- **Model:** the code stays open (public-money-public-code); revenue comes from
  *services* — deployment, reskinning, hosting, training, support contracts. This is
  the GitLab/Discourse/CiviCRM pattern and is fully compatible with the repo's own
  stated "blueprint kit" ambition.
- **Who pays:** the councils themselves (small budgets, but a €10–30k
  deploy-and-support contract is within reach), or — more realistically at first —
  **philanthropy**: the European Climate Foundation and similar funders already
  finance the climate-council network (ICCN, the EEB's council work) and would
  plausibly fund "shared open-source infrastructure for Europe's climate councils"
  as a single grant covering 5–10 deployments.
- **First step:** a 2-page offer + a demo instance with dummy data, circulated
  through the existing M·18 contact map. Grant proposal to ECF/ICCN in parallel.
- **Effort:** low-moderate — the fork path is documented; the missing piece is a
  tenant-setup script and a hardening pass.
- **Risk:** low. No IP conflict (it advances the repo's own roadmap), no
  independence problem, and it makes the EEA handoff story *stronger*.

### 1B. Horizon Europe / Digital Europe project funding

The scenario-submission call (already drafted as a one-pager, with IIASA/PBL/IAMC
distribution channels) plus the coherence-assessment machinery (M·23, M·25) is the
skeleton of a research-infrastructure work package. Joining a Horizon consortium as
the "tooling partner" can fund 1–2 developer FTEs for 3–4 years. Slow (12–18 month
lead time) but durable, and it pays for exactly the work already planned.

---

## 4. Track 2 — commercial spin-outs (separate entity, separate brand)

Ranked by expected value.

### 2A. EU Climate Policy Intelligence platform  ★ highest commercial ceiling

**What:** a subscription product built on the Tier-1 data assets — the target
register, the policy graph with live status, the national implementation tracker,
the Green Deal tracker, the policy clock, plus a daily/weekly intelligence briefing
generated from the news pipeline.

**Who buys:** EU public-affairs teams, trade associations, law firms,
sustainability/ESG compliance teams, consultancies, and investors covering EU
climate regulation. This buyer already pays **€7,000–12,000+ per seat per year**
for Politico Pro or FiscalNote — products that are journalism-plus-alerts, not
structured, legally-anchored data. A tool that answers "what exactly is binding, by
when, in which provision, and where does each Member State stand" is differentiated
on substance, not marketing.

**Model:** team SaaS at €3,000–8,000/yr (undercut incumbents), plus an API/data
licence tier for ESG data vendors (MSCI, Sustainalytics, ISS) who need regulatory-
ambition data for CSRD/transition-plan products — that demand is structural and
growing.

**Honest costs:** this is a company, not a side project. The data's value is its
*freshness*, so it needs a permanent editorial/curation commitment. It also needs
a clean-room separation from the ESABCC codebase and brand, and the IP question
settled first. Realistic path: validate with 10 paying design partners on a minimal
"register + tracker + weekly brief" product before building anything else.

### 2B. AI-native qualitative analysis SaaS (Content Analysis spin-out)

**What:** M·05 as a standalone product — collaborative, web-native, AI-assisted
qualitative coding with track-changes-style suggestion review.

**Who buys:** university research groups, policy shops, think tanks, UX-research
teams, evaluation consultancies. Incumbents charge €500–2,000/seat for desktop
software with poor collaboration; reviews of their AI features are lukewarm. This
is the strongest *single-module* spin-out because the market is global and not
climate-limited.

**Model:** classic per-seat SaaS (€20–50/seat/mo academic, higher commercial).
**Risk:** competitive market with funded startups (e.g. AI-coding entrants);
winning requires full-time focus. Rate this "best product, hardest race".

### 2C. Interactive policy models as education products

**What:** the ETS endgame model, merit-order explorer, electrification LCM, and
wildfire model repackaged as (a) a self-serve "How EU climate policy actually
works" course, (b) executive training for energy/industry/finance firms, (c)
licensed embeddable explainers for media outlets.

**Model:** course sales (€300–900/seat), corporate workshops (€5–15k/day),
embed licences. Modest ceiling but **fast, cheap, and low-conflict** — the models
are already built and carry explicit "stylised teaching tool" labels, which is
exactly what education requires. Also the natural marketing funnel for 2A.

### 2D. Anonymous deliberation/voting SaaS

M·06 for boards, committees, juries, DAOs, academic panels. Simple, finished,
GDPR-clean, seven voting systems. Small niche (comparators: OpaVote, ElectionBuddy
— viable but small businesses). Worth doing only as a low-maintenance side product:
€29–99/mo self-serve, no sales motion.

### Not worth pursuing commercially

Reference manager (Zotero is free and beloved), news aggregation alone (commodity),
fact-sheet builder (feature, not product), a paid standalone newsletter (fine as a
*funnel* for 2A with a free tier, not as a business).

---

## 5. Recommendation

**Do 1A now.** Blueprint services for the climate-council network is the option
with real demand evidence (67 mapped bodies, an existing funder ecosystem), zero
conflict with the ESABCC role, low build cost, and it executes the repo's own
roadmap. First deliverable: demo instance + 2-page offer + one grant conversation.

**Prepare 2A deliberately.** The Tier-1 datasets are the only assets here with a
genuine moat, and the CSRD/transition-plan wave is creating buyers for exactly this
data. But it requires the IP separation, a new brand, and a real commitment — so
the near-term move is not to build, but to (a) settle IP ownership in writing,
(b) check IIASA/other licence terms, and (c) run 10 customer-discovery
conversations with public-affairs and ESG-data buyers to test willingness to pay.

**Use 2C as the cheap test.** Packaging two existing models into a paid workshop
or course is a weeks-not-months experiment that generates revenue signal, audience,
and credibility for 2A without touching the institutional codebase.

Everything else (2B, 2D) is optional and should only be picked up if someone wants
to run it full-time.
