# Enabling EUR-Lex full-text fetch (step-by-step, no jargon)

**What this is for:** the policy auto-tagging works better when the agents can
read the *full legal text* of each EU law. That text lives on two EU websites.
Right now the cloud session that runs Claude Code **cannot reach them** — it
isn't EUR-Lex blocking you, it's the session's own network setting (a safety
"allowlist" that only lets through a few approved websites).

To fix it you add **two website addresses** to that allowlist:

```
eur-lex.europa.eu
publications.europa.eu
```

That's the whole job. Below is exactly how.

---

## How I know this is the problem

When the session tried to open EUR-Lex, the network proxy answered with the
words **`Host not in allowlist`**. Same answer for Wikipedia and example.com.
So the websites are fine — the session is just locked down to an approved list,
and EUR-Lex isn't on it yet.

---

## The fix (Claude Code on the web)

You change this on the **environment** — the cloud computer settings tied to this
repository. Network access is chosen when an environment is created, so you'll
either **edit** the existing environment or **create a new one** with the right
setting.

> Official reference (screenshots + exact menus may be newer than this guide):
> https://code.claude.com/docs/en/claude-code-on-the-web

### Step 1 — Open the environments settings
1. Go to the Claude Code web app (claude.ai/code).
2. Open the **Settings / Environments** area (it's where you manage the cloud
   setup for your repositories — sometimes shown as a gear icon, or under your
   workspace/repo settings).
3. Find the environment used for the **ESABCCMethodHub** repository.

### Step 2 — Find the "Network" / "Network access" setting
Inside that environment's settings there's a section about **network access** or
**network policy**. It usually offers a few choices, such as:
- No internet access
- A limited / trusted set of sites (an **allowlist**) ← this is what you have
- Broader/open access

### Step 3 — Add the two EU sites to the allowlist
1. Choose the option that lets you **edit the allowed domains** (custom
   allowlist).
2. Add these two entries, one per line:
   ```
   eur-lex.europa.eu
   publications.europa.eu
   ```
3. **Save**.

> If the network setting is **greyed out / locked**, your organisation's admin
> controls it. Send them this page and ask them to add those two domains to the
> environment's allowlist.

### Step 4 — Start a fresh session
Network settings apply to **new** sessions. Close this session and start a new
one on the same repo so it picks up the change.

---

## Step 5 — Check it worked

In the new session, just ask me:

> "Test the EUR-Lex connection."

I'll run a one-line check. ✅ A "200" means it's open. ❌ `Host not in allowlist`
means the domain still isn't on the list (re-check Step 3, or it's admin-locked).

---

## Step 6 — Pull the text and re-tag (ask me to do these)

Once the connection is open, ask me to run:

1. **Download the full legal texts:**
   ```
   npm run prefetch-policy-bodies
   ```
   (saves them into `public/content-analysis/policy-bodies.json`)

2. **Re-run the tagging with the fuller text:**
   ```
   node scripts/retag-policies.mjs prepare
   ```
   …then I point the tagging agents at each batch, and finally:
   ```
   node scripts/retag-policies.mjs compile
   ```
   which rewrites `src/lib/content-analysis/policy-master-tags.ts` with the
   improved AI tags. You review/confirm them in the UI as usual.

That's it — you never have to touch the code yourself. Your only manual job is
**Steps 1–4** (adding the two domains); I handle the rest.

---

### Quick FAQ

**Do I need to do this every time?** No — once the domains are on the
environment's allowlist they stay until someone changes the environment.

**Is it safe?** Yes. You're only allowing two official EU government websites
(the EU's legal database and its publications office). Nothing else is opened.

**Why can't you (Claude) just add it yourself?** The allowlist is a setting of
the cloud environment, not something inside the code I can edit from within the
session. It has to be set in the web app's environment settings (Steps 1–4).
