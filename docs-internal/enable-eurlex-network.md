# Enabling EUR-Lex full-text fetch (step-by-step, no jargon)

**What this is for:** the policy auto-tagging works better when the agents can
read the *full legal text* of each EU law. That text lives on two EU websites.
Right now the cloud session **cannot reach them** — it isn't EUR-Lex blocking
you, it's the session's network setting (a safety list of approved websites).
EUR-Lex just isn't on that list yet.

You need to add these two website addresses:

```
eur-lex.europa.eu
publications.europa.eu
```

---

## ⚠️ Two things people get wrong (read first)

1. **It is NOT in the account "Settings" pop-up** (the one with General /
   Account / Billing / Claude Code). That panel has no network setting. The
   network setting lives in the **environment**, opened from a **cloud icon**.
2. **You must change the level to "Custom".** The default is **Trusted**, which
   only allows package registries + GitHub. The box where you type EUR-Lex
   **only appears after you pick "Custom".** If you didn't see a domain box,
   this is why.

---

## The exact steps (from the official docs)

> Docs: https://code.claude.com/docs/en/claude-code-on-the-web#network-access

### Step 1 — Open the environment for editing
- Look for the **cloud icon** ☁️ — it appears **wherever you start a cloud
  session** (on the claude.ai/code page, near the repo / task box). There is
  **no separate "Environments" page**; you edit the environment from there.
- Click it and choose to **configure / edit the environment** for the
  ESABCCMethodHub repo. A dialog opens.

### Step 2 — Find the "Network access" selector
In that dialog there's a **Network access** selector with four levels:

| Level       | What it does                                                  |
| ----------- | ------------------------------------------------------------- |
| None        | No internet                                                   |
| **Trusted** | Default — package registries + GitHub only (no EUR-Lex)       |
| Full        | Any website                                                   |
| **Custom**  | **Your own list of allowed sites ← pick this**               |

### Step 3 — Select **Custom**
As soon as you pick **Custom**, an **Allowed domains** text box appears.

### Step 4 — Type the two domains (one per line)
```
eur-lex.europa.eu
publications.europa.eu
```
No `https://`, no slashes, no spaces — just the bare addresses.

### Step 5 — ✅ Tick "Also include default list of common package managers"
**Important.** This keeps npm / GitHub / etc. working alongside your two new
sites. If you leave it **unchecked**, only EUR-Lex would be allowed and our
build/install commands would break. So: **keep it checked.**

### Step 6 — Save, then start a **new** session
Network changes only apply to **new** sessions. Save the dialog, then start a
**fresh** session on the repo (the current one keeps the old setting).

(You can also set this on a *routine* the same way — the cloud icon shows up
there too.)

---

## Step 7 — Check it worked
In the new session, just tell me:
> "Test the EUR-Lex connection."

I'll run a one-line check. **200** = open ✅. `Host not in allowlist` = still
blocked (re-check Steps 3–4, or it's admin-locked).

---

## Step 8 — Pull the texts and re-tag (I do these)
Once it's open, ask me to run:
1. `npm run prefetch-policy-bodies` — downloads the full legal texts.
2. `node scripts/retag-policies.mjs prepare` → I run the tagging agents →
   `node scripts/retag-policies.mjs compile` — rewrites the AI tags with the
   fuller text.

Your only manual job is **Steps 1–6**. I handle everything after.

---

### If "Custom" / the network selector is greyed out
Then it's controlled by your **organisation's admin** (common on Team /
Enterprise). Send them this page and ask them to set the environment's network
access to **Custom** and add the two domains. You can't override it from inside
the session.

### FAQ
- **Do I redo this every time?** No — it sticks to the environment until changed.
- **Is it safe?** Yes — you're allowing two official EU government sites and
  keeping the trusted defaults. Nothing else is opened.
- **Why can't Claude add it?** The allowlist is a setting of the cloud
  environment, not code I can edit from inside the session.
