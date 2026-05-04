# M · 06 — Voting Tool

!!! tip "Status"
    Stable · shipped in v1.0 · admin route [`/voting`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/src/app/voting) · public ballot route [`/vote/<token>`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/src/app/vote)

Private ballots for Advisory Board members. Externals receive a
single-use link; their submissions stay isolated from the rest of the
Method Hub and feed straight into the analysis surface.

## User story

> The Secretariat needs the AB to shortlist 6 topics for the next
> meeting. They open `/voting/new`, paste a list of options, pick
> *Priority ranking* with caps "1: max 3, 2: max 3, 3: unlimited" and
> hit Save. On the admin page they generate a single universal link,
> share it with the AB by email, and watch the Submissions counter
> climb. When the deadline passes they click Close and open Results —
> the page renders mean / median / SD per option, sorts ascending and
> highlights the natural-break shortlist suggestion.

## Two surfaces

=== "1 · Admin (`/voting`)"
    MethodHub-gated. Lists every vote, lets the Secretariat create new
    ones, generate single-use or universal voting links, edit metadata
    (title / description / instructions), open and close the vote, and
    reset to wipe ballots and reissue the same links.

=== "2 · Public ballot (`/vote/<token>`)"
    No MethodHub login. The token is the credential. The page renders
    only the ballot the token belongs to — title, instructions,
    options, the controls that match the voting system, and a Submit
    button. After submit, a thank-you screen with no link back into
    the Hub.

## Voting systems

| System              | Voter UX                                       | Server validation                                        | Result surface                                                            |
|---------------------|------------------------------------------------|----------------------------------------------------------|---------------------------------------------------------------------------|
| `priority_ranking`  | Per-option score buttons; per-score caps.      | Cap enforcement; `requireAllScored` if set.              | Mean / median / SD per option, sorted ascending, natural-break shortlist. |
| `single_choice`     | Radio buttons.                                 | Exactly one selection.                                   | Tally + share.                                                            |
| `multi_choice`      | Checkboxes with `maxSelections`.               | At least 1, at most `maxSelections`.                     | Tally + share.                                                            |
| `approval`          | Approve / Reject per option.                   | Boolean for each option.                                 | Tally + share.                                                            |
| `star`              | 1–N stars per option.                          | Integer in `[1, maxStars]`.                              | Mean rating per option.                                                   |
| `average_ranking`   | Rank every option 1..N (full permutation).     | Distinct ranks; full coverage if `requireAllRanked`.     | Mean rank per option, sorted ascending.                                   |
| `ranked_voting`     | Rank in preference order; partial allowed.     | Distinct ranks; not necessarily full.                    | Instant-runoff rounds with eliminations and winner declaration.           |

## Data flow

```mermaid
flowchart LR
  classDef data fill:#EDE7F6,stroke:#4527A0
  classDef svc fill:#E3F2FD,stroke:#1565C0
  classDef ext fill:#F1F8E9,stroke:#558B2F
  classDef gate fill:#FFF3E0,stroke:#EF6C00

  Sec[Secretariat user<br/>MethodHub-gated]:::ext
  AB[Advisory Board member<br/>no login]:::ext

  Admin[/voting · /voting/new · /voting/[id]]:::svc
  Ballot[/vote/[token]]:::svc
  Results[/voting/[id]/results]:::svc

  AdminAPI[/api/voting/votes/<br/>tokens · reset · debug]:::svc
  BallotAPI[/api/voting/ballot/[token]]:::svc

  DB[(Postgres<br/>votes · vote_tokens · ballots)]:::data

  Sec --> Admin --> AdminAPI --> DB
  AB --> Ballot --> BallotAPI --> DB
  DB --> Results
  Sec --> Results
```

## Code surface

| Path                                                                                                                                                              | Role                                                                                |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| [`src/app/voting/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/voting/page.tsx)                                          | Admin index — lists every vote with live token / ballot counts.                     |
| [`src/app/voting/new/VoteBuilder.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/voting/new/VoteBuilder.tsx)                    | New-vote form — title, options, system-specific config.                             |
| [`src/app/voting/[voteId]/VoteAdmin.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/voting/[voteId]/VoteAdmin.tsx)              | Per-vote admin — links, status, edit metadata, reset.                               |
| [`src/app/voting/[voteId]/results/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/voting/[voteId]/results/page.tsx)        | Results & analysis surface for the chosen voting system.                            |
| [`src/app/vote/[token]/VoteBallot.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/vote/[token]/VoteBallot.tsx)                  | Public ballot UI — chrome-less, no MethodHub navigation.                            |
| [`src/lib/voting/store.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/lib/voting/store.ts)                                          | Backend dispatcher — picks Supabase or filesystem at every call (env-driven).       |
| [`src/lib/voting/store-supabase.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/lib/voting/store-supabase.ts)                        | Supabase implementation; race-safe `recordBallot` via atomic `UPDATE … WHERE`.      |
| [`src/lib/voting/store-fs.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/lib/voting/store-fs.ts)                                    | Filesystem implementation under `data/votes/` for local dev.                        |
| [`src/lib/voting/validation.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/lib/voting/validation.ts)                                | Server-side ballot validation per voting system.                                    |
| [`src/lib/voting/analysis.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/lib/voting/analysis.ts)                                    | Tally / mean / IRV computation; pure, runs on read.                                 |

## API surface

| Method | Path                                                  | Auth                  | Purpose                                                                  |
|--------|-------------------------------------------------------|-----------------------|--------------------------------------------------------------------------|
| GET    | `/api/voting/votes`                                   | MethodHub             | List every vote.                                                         |
| POST   | `/api/voting/votes`                                   | MethodHub             | Create a new vote.                                                       |
| GET    | `/api/voting/votes/[voteId]`                          | MethodHub             | Full bundle: vote + tokens + ballots.                                    |
| PATCH  | `/api/voting/votes/[voteId]`                          | MethodHub             | Update title / description / instructions / status / closesAt.           |
| DELETE | `/api/voting/votes/[voteId]`                          | MethodHub             | Hard-delete the vote and cascade its tokens + ballots.                   |
| POST   | `/api/voting/votes/[voteId]/tokens`                   | MethodHub             | Mint N tokens (`maxUses: 1` single-use, `null` universal, `>1` capped).  |
| POST   | `/api/voting/votes/[voteId]/reset`                    | MethodHub             | Wipe ballots, zero `use_count`, bump `reset_epoch`.                      |
| GET    | `/api/voting/votes/[voteId]/results`                  | MethodHub             | Pre-computed analysis JSON for downstream tools.                         |
| GET    | `/api/voting/_debug`                                  | MethodHub             | Backend in use, env presence, totals across all votes.                   |
| GET    | `/api/voting/ballot/[token]`                          | **Token only**        | Public-safe view of the vote (no other-vote info, no participant data).  |
| POST   | `/api/voting/ballot/[token]`                          | **Token only**        | Submit a ballot. Atomic single-use claim before insert.                  |

The two `/api/voting/ballot/[token]` routes are the **only** voting
endpoints reachable from the public internet without a MethodHub
session — the token itself is the credential.

## Schema

```
votes
  id text PK · title · description · instructions · voting_system
  config jsonb · options jsonb · is_anonymous boolean · status text
  closes_at · created_by · created_at · updated_at · reset_epoch int

vote_tokens
  token text PK · vote_id FK · label · used_at · created_at
  max_uses int (nullable = unlimited / universal link)
  use_count int (atomically incremented on each successful submission)

ballots
  id text PK · vote_id FK · responses jsonb
  token_id (NULL when vote.is_anonymous = true)
  token_fingerprint text NOT NULL — sha256(voteId || ' ' || token)
  submitted_at timestamptz
```

Migrations: `029_voting_tool.sql`, `030_voting_shared_tokens.sql`,
`031_voting_reset_epoch.sql`. RLS is enabled on all three tables and
ships with **no** permissive policies — every read and write goes
through the server using the service-role key.

## Privacy & access model

- **Anonymous mode** (`is_anonymous = true`, default): ballots store
  only `token_fingerprint`, never `token_id`. Admins cannot link a
  submitted ballot to the participant label assigned at token
  generation time.
- **Single-use vs universal**: `max_uses = 1` mints one link per
  participant; `max_uses = NULL` mints a universal link anyone with
  the URL can submit through (auto-deduplicated per-browser via
  localStorage).
- **Reset epoch**: clicking Reset wipes ballots, zeroes token
  `use_count`, and bumps `reset_epoch`. The bump invalidates the
  per-browser localStorage flag so participants can vote again on the
  same browser.
- **No IP / user-agent / browser fingerprint** is stored at any point.

## Race-safety

`recordBallot` claims a token slot before inserting the ballot via a
single PostgREST `UPDATE … WHERE use_count = previousValue` — two
concurrent submissions on the same token race against the database
and only one wins. The unique fingerprint on `(vote_id,
token_fingerprint)` was dropped in migration `030` because universal
links legitimately produce many ballots with the same fingerprint;
single-use is now enforced entirely by the atomic counter on the
token row.

## Deployment notes

- The store dispatcher in `src/lib/voting/store.ts` re-evaluates the
  backend on **every call** rather than caching at module load. This
  removes a Vercel-specific footgun where a lambda that cold-started
  before its env vars were visible would get pinned to the filesystem
  backend forever, leaving `/voting` rendering 0/0/0 while writes
  went to Postgres elsewhere.
- The seed vote `abmeeting38-topical-vote` lives only in migration
  `029_voting_tool.sql`. There is no on-disk seed JSON, on purpose —
  if the dispatcher ever silently falls back to filesystem mode, the
  listing renders "No votes yet" instead of stale zeros, which is the
  loud failure mode we want.
- `unstable_noStore()` is set on `/voting` and
  `/voting/[voteId]/results` so admins always see fresh counts after
  a ballot is submitted.

## Known limits & roadmap

- **Editing options after ballots come in is intentionally blocked.**
  Adding or removing options would silently invalidate existing
  responses. The right move is a "duplicate vote" flow — not built
  yet; on the roadmap.
- **No participant deadline enforcement client-side.** `closes_at` is
  enforced on `recordBallot`, but the ballot UI does not yet count
  down or grey out after the deadline.
- **Result export** is JSON-only via `/api/voting/votes/[id]/results`.
  CSV / `.docx` export would be a small follow-up.
