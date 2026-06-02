# Azure Whisper — meeting transcription setup

The **Meetings** module (Project Workspace) can record audio in the browser
and turn it into notes automatically. The preferred path is **Whisper** —
either via OpenAI or an **Azure OpenAI Whisper deployment** — which gives
the best accuracy. If no Whisper key is configured, the recorder falls back
to the browser's **Web Speech API** (Chrome/Edge/Safari) at zero cost but
lower quality (see [No-key fallback](#no-key-fallback-web-speech-api)
below). The Anthropic / Gemini keys that power the rest of the app's AI
(summaries, the "three key points" button) **do not** do audio — so
transcription has to be wired up separately.

This guide walks an administrator through creating the Azure deployment and
pointing the app at it. Budget ~15 minutes.

!!! info "What you'll end up with"
    Three environment variables the app reads at runtime:
    `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, and
    `AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT`. That's it — the code builds the rest
    of the request URL itself.

## Prerequisites

- An **Azure subscription** with permission to create resources (Contributor
  on a resource group is enough).
- Access to **Azure OpenAI**. For most tenants this is now self-serve; some
  enterprise tenants still gate it behind a one-time access request in the
  Azure portal ("Azure OpenAI" → *Request access*). If the resource type
  doesn't appear when you search, that's the gate — request it and wait for
  approval (usually a day or two).

## Step 1 — Create an Azure OpenAI resource in a Whisper region

Whisper is only offered in **some** Azure regions, so pick the region *first*.

1. In the [Azure portal](https://portal.azure.com), choose **Create a
   resource** → search **Azure OpenAI** → **Create**.
2. Fill in subscription, resource group, a name, and pricing tier (**Standard
   S0**).
3. For **Region**, choose one that lists Whisper. At time of writing these
   include (non-exhaustive, and they change): **West Europe**, **Sweden
   Central**, **Switzerland North**, **North Central US**, **East US 2**.
   For an EEA/GDPR deployment prefer **West Europe** or **Sweden Central**.

    !!! warning "Check the current list"
        Region × model availability moves. Confirm Whisper (or
        `gpt-4o-transcribe`) is available in your chosen region in the
        [Azure OpenAI model-availability table](https://learn.microsoft.com/azure/ai-services/openai/concepts/models)
        before committing — you can't move a deployment between regions later.

4. **Review + create** → **Create**. Wait for deployment to finish.

## Step 2 — Deploy the Whisper model

1. Open the resource, then click **Go to Azure AI Foundry portal** (formerly
   *Azure OpenAI Studio*).
2. In the left nav go to **Deployments** → **+ Deploy model** → **Deploy base
   model**.
3. Pick **`whisper`** from the model list and continue.

    !!! tip "gpt-4o-transcribe works too"
        If your region offers `gpt-4o-transcribe` or `gpt-4o-mini-transcribe`,
        you can deploy one of those instead — they use the *same*
        `/audio/transcriptions` endpoint, so the app needs no code change.
        Just deploy it and use its deployment name in Step 4.

4. Give the deployment a **name** — e.g. `whisper`. **Write this down**: it's
   the value for `AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT`, and it is *not*
   necessarily the same as the model name.
5. Click **Deploy**.

## Step 3 — Grab the endpoint and key

Back in the Azure portal, open your Azure OpenAI resource →
**Keys and Endpoint** (left nav, under *Resource Management*).

- **Endpoint** → looks like `https://<your-resource>.openai.azure.com` →
  this is `AZURE_OPENAI_ENDPOINT`.
- **KEY 1** (or KEY 2) → this is `AZURE_OPENAI_API_KEY`. Treat it as a secret.

## Step 4 — Configure the app

Set these in your deployment's environment (Vercel project settings, the
container's env, or `.env.local` for local dev):

```bash
AZURE_OPENAI_API_KEY=<KEY 1 from step 3>
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=whisper          # the deployment NAME from step 2

# Optional — defaults to 2024-12-01-preview if unset
# AZURE_OPENAI_API_VERSION=2024-12-01-preview
```

The app assembles the request URL as:

```
{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT}/audio/transcriptions?api-version={AZURE_OPENAI_API_VERSION}
```

Restart / redeploy so the new variables are picked up.

!!! note "Azure is preferred when present"
    `src/lib/project-workspace/transcription.ts` uses the Azure deployment
    whenever `AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT` is set (enterprise quota),
    and only falls back to `OPENAI_API_KEY` (public OpenAI Whisper) otherwise.
    Setting both is fine — Azure wins.

## Step 5 — Verify

1. Open a project in **Project Workspace** → **Meetings** → a meeting.
2. Click **● Record meeting**, say a sentence, then **Stop & transcribe**.
3. Within a few seconds a `— Transcript (timestamp) —` block should append to
   the **Notes** field.

If you instead see "transcription isn't configured", the app didn't find a
provider — re-check the three variables and that the app was restarted.

## Costs & limits

- **Pricing** is per minute of audio (Whisper) or per token
  (`gpt-4o-transcribe`); see the Azure OpenAI pricing page. Meeting-length
  recordings are inexpensive but not free.
- **File-size limit:** the synchronous endpoint accepts **≤ 25 MB** per
  request. The app enforces this client- and server-side and rejects larger
  recordings with a clear message. For multi-hour recordings you'd need
  Azure AI Speech *batch* transcription, which this integration does not use.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "transcription isn't configured" | One of the three env vars missing, or app not restarted. |
| `404 DeploymentNotFound` in server logs | `AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT` doesn't match the deployment **name** (not the model name). |
| `401`/`403` | Wrong key, or key from a different resource than the endpoint. |
| `400` about API version | Set `AZURE_OPENAI_API_VERSION` to a version your resource supports. |
| Recording works but never transcribes | Audio > 25 MB, or the browser blocked the microphone (check the site's permission prompt). |

## No-key fallback (Web Speech API)

If no Whisper provider is configured, the recorder transparently falls back
to the browser's built-in **Web Speech API**:

- Runs in parallel with the audio recording — no extra step for the user.
- **No server key, no per-minute cost.** Speech recognition happens
  client-side (or via the browser vendor's free service, depending on the
  browser).
- Transcript blocks captured this way are labelled
  `— Transcript · browser (…) —` in the notes, so it's clear which path
  produced them.

Caveats:

- **Browser support:** works in Chrome, Edge and recent Safari; **Firefox
  does not implement** the API. On unsupported browsers the recorder still
  captures audio, but you'll need to type notes manually.
- **Accuracy is materially lower than Whisper**, especially for accents,
  cross-talk, technical vocabulary and meetings longer than ~10 minutes.
- **Single language at a time** — the app uses the browser's UI language;
  multilingual meetings transcribe poorly.
- The recognizer **needs an active network connection** in most browsers
  (Chrome streams audio to Google's service); only a few browser builds
  run it fully offline.

For real meetings (board, multi-speaker, recorded archive) keep Whisper
configured — the browser path is a safety net, not a replacement.
