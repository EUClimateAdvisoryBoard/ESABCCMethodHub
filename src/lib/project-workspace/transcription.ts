/**
 * Audio transcription for the Meetings module.
 * --------------------------------------------
 * Turns a recorded meeting (uploaded from the phone / browser MediaRecorder)
 * into text using a Whisper-class speech-to-text endpoint. Two providers are
 * supported, auto-selected from the environment:
 *
 *   • OpenAI         (OPENAI_API_KEY)        → /v1/audio/transcriptions
 *   • Azure OpenAI   (AZURE_OPENAI_* + a
 *                     transcribe deployment) → /audio/transcriptions
 *
 * Returns `{ ok:false, reason:'no-api-key' }` when nothing is configured so
 * the UI can tell the user to type/paste notes instead — never throws.
 */
import 'server-only';

const OPENAI_TRANSCRIBE_MODEL = 'whisper-1';
const AZURE_DEFAULT_API_VERSION = '2024-12-01-preview';

export interface TranscriptionResult {
  ok: boolean;
  text: string;
  provider?: 'openai' | 'azure-openai';
  reason?: 'no-api-key' | 'api-error' | 'network-error' | 'empty';
  errorBody?: string;
}

export function hasTranscriptionProvider(): boolean {
  if (process.env.OPENAI_API_KEY) return true;
  if (
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT
  ) {
    return true;
  }
  return false;
}

export async function transcribeAudio(file: File): Promise<TranscriptionResult> {
  // Prefer Azure (enterprise quota) when a transcribe deployment is set.
  if (
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT
  ) {
    return transcribeAzure(file);
  }
  if (process.env.OPENAI_API_KEY) return transcribeOpenAI(file);
  return { ok: false, text: '', reason: 'no-api-key' };
}

async function transcribeOpenAI(file: File): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const fd = new FormData();
  fd.append('file', file, file.name || 'recording.webm');
  fd.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || OPENAI_TRANSCRIBE_MODEL);
  fd.append('response_format', 'json');
  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: fd,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[transcribe/openai] ${res.status}:`, errText.substring(0, 500));
      return { ok: false, text: '', provider: 'openai', reason: 'api-error', errorBody: errText.substring(0, 500) };
    }
    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? '').trim();
    return text
      ? { ok: true, text, provider: 'openai' }
      : { ok: false, text: '', provider: 'openai', reason: 'empty' };
  } catch (err) {
    console.error('[transcribe/openai] network error:', err);
    return { ok: false, text: '', provider: 'openai', reason: 'network-error', errorBody: String(err) };
  }
}

async function transcribeAzure(file: File): Promise<TranscriptionResult> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/+$/, '');
  const deployment = process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || AZURE_DEFAULT_API_VERSION;
  const url = `${endpoint}/openai/deployments/${deployment}/audio/transcriptions?api-version=${apiVersion}`;

  const fd = new FormData();
  fd.append('file', file, file.name || 'recording.webm');
  fd.append('response_format', 'json');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': apiKey },
      body: fd,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[transcribe/azure] ${res.status}:`, errText.substring(0, 500));
      return { ok: false, text: '', provider: 'azure-openai', reason: 'api-error', errorBody: errText.substring(0, 500) };
    }
    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? '').trim();
    return text
      ? { ok: true, text, provider: 'azure-openai' }
      : { ok: false, text: '', provider: 'azure-openai', reason: 'empty' };
  } catch (err) {
    console.error('[transcribe/azure] network error:', err);
    return { ok: false, text: '', provider: 'azure-openai', reason: 'network-error', errorBody: String(err) };
  }
}
