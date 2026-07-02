// ============================================================================
// Local Bridge Service — HTTP server on localhost:8585
// Connects Supabase backend with Word Add-in, provides SQLite caching
// ============================================================================

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { initCache, searchLocal, batchGetLocal, upsertLocal, getLastSync } from './cache';
import { formatCitations, generateBibliography } from './citeproc-engine';

const app = express();
const PORT = parseInt(process.env.BRIDGE_PORT || '8585', 10);
const BRIDGE_AUTH_TOKEN = process.env.BRIDGE_AUTH_TOKEN || '';

// CORS: only allow localhost / null (Office WebView). The previous version
// fell through to "allow anything" in production, which would let any web
// page invoke the bridge and read the user's reference library.
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === 'null' ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('https://127.0.0.1')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Origin not permitted by bridge CORS policy'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Minimal access log: method, path, status, duration. No bodies, no query
// strings (citation_key etc. could be considered identifying when combined
// with library_id) and no headers.
app.use((req: Request, res: Response, next: NextFunction) => {
  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    const path = req.path;
    // eslint-disable-next-line no-console
    console.log(`[bridge] ${req.method} ${path} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Auth: every endpoint except /api/status requires a Bearer token matching
// BRIDGE_AUTH_TOKEN. If the env var is unset we refuse to start so dev
// environments cannot accidentally ship without auth.
if (!BRIDGE_AUTH_TOKEN) {
  // eslint-disable-next-line no-console
  console.error(
    '[bridge] BRIDGE_AUTH_TOKEN is not set. Generate a 32+ character ' +
      'random token and set it in bridge-service/.env (and in the Word ' +
      'add-in / Electron client config). Refusing to start without it.',
  );
  process.exit(1);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/status') return next();
  const header = req.header('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== BRIDGE_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid bridge token.' });
  }
  next();
});

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize SQLite cache
initCache();

// ──── HEALTH CHECK ────

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    supabase: !!supabase,
    cache: true,
  });
});

// ──── LIBRARIES ────

app.get('/api/libraries', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  try {
    const { data, error } = await supabase
      .from('libraries')
      .select('id, name')
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──── SEARCH REFERENCES ────

app.get('/api/references/search', async (req, res) => {
  const { q, library_id } = req.query;

  if (!q || !library_id) {
    return res.status(400).json({ error: 'q and library_id are required' });
  }

  // Try local cache first
  const localResults = searchLocal(library_id as string, q as string);

  if (localResults.length > 0) {
    return res.json(localResults.map(r => ({
      ...r,
      csl_json: JSON.parse(r.csl_json as string),
      authors: r.authors ? JSON.parse(r.authors as string) : null,
    })));
  }

  // Fall back to Supabase
  if (!supabase) {
    return res.json([]); // No Supabase, no local results
  }

  try {
    const { data, error } = await supabase
      .from('references')
      .select('id, citation_key, title, authors, year, container_title, csl_json')
      .eq('library_id', library_id)
      .or(`title.ilike.%${q}%,citation_key.ilike.%${q}%,container_title.ilike.%${q}%`)
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    // Cache results locally
    for (const ref of (data || [])) {
      upsertLocal({
        id: ref.id,
        library_id: library_id as string,
        citation_key: ref.citation_key,
        csl_json: JSON.stringify(ref.csl_json),
        title: ref.title,
        authors: JSON.stringify(ref.authors),
        year: ref.year,
        container_title: ref.container_title,
        updated_at: new Date().toISOString(),
      });
    }

    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──── BATCH GET REFERENCES ────

app.post('/api/references/batch', async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  // Try local cache first
  const localResults = batchGetLocal(ids);

  if (localResults.length === ids.length) {
    return res.json(localResults.map(r => ({
      ...r,
      csl_json: JSON.parse(r.csl_json as string),
      authors: r.authors ? JSON.parse(r.authors as string) : null,
    })));
  }

  // Fall back to Supabase for missing items
  if (!supabase) {
    return res.json(localResults.map(r => ({
      ...r,
      csl_json: JSON.parse(r.csl_json as string),
      authors: r.authors ? JSON.parse(r.authors as string) : null,
    })));
  }

  try {
    const { data, error } = await supabase
      .from('references')
      .select('id, citation_key, title, authors, year, container_title, csl_json')
      .in('id', ids);

    if (error) return res.status(500).json({ error: error.message });

    // Cache fetched results
    for (const ref of (data || [])) {
      upsertLocal({
        id: ref.id,
        library_id: '',
        citation_key: ref.citation_key,
        csl_json: JSON.stringify(ref.csl_json),
        title: ref.title,
        authors: JSON.stringify(ref.authors),
        year: ref.year,
        container_title: ref.container_title,
        updated_at: new Date().toISOString(),
      });
    }

    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──── WORKSPACE METADATA (summary + chapter classification + notes) ────
//
// Returns the project-workspace context for a batch of references so the Word
// add-in can show — at the point of citing — the whole-document summary, the
// chapter (report-chapter / sector) classification and the reference note.
// These live in the durable content-analysis tables, keyed by the workbench
// document id `ref-doc-<referenceId>`, and are publicly readable.

app.post('/api/references/workspace-meta', async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  const summaries: Record<string, string> = {};
  const chapters: Record<string, string[]> = {};
  const notes: Record<string, string> = {};

  if (!supabase || ids.length === 0) {
    return res.json({ summaries, chapters, notes });
  }

  const docIds = ids.map((id: string) => `ref-doc-${id}`);
  const docToRef = new Map<string, string>(ids.map((id: string) => [`ref-doc-${id}`, id]));

  try {
    const [summRes, tagRes, refRes] = await Promise.all([
      supabase
        .from('content_analysis_summaries')
        .select('document_id, text')
        .in('document_id', docIds),
      supabase
        .from('content_analysis_overall_tags')
        .select('document_id, code_id')
        .in('document_id', docIds)
        .like('code_id', 'chapter:%'),
      supabase
        .from('references')
        .select('id, notes')
        .in('id', ids),
    ]);

    for (const row of (summRes.data || []) as any[]) {
      const refId = docToRef.get(row.document_id);
      const text = (row.text || '').trim();
      if (!refId || !text) continue;
      // Prefer the longest non-empty summary across projects.
      if (!summaries[refId] || text.length > summaries[refId].length) summaries[refId] = text;
    }

    for (const row of (tagRes.data || []) as any[]) {
      const refId = docToRef.get(row.document_id);
      if (!refId || !row.code_id) continue;
      (chapters[refId] ||= []).push(row.code_id);
    }

    for (const row of (refRes.data || []) as any[]) {
      const n = (row.notes || '').trim();
      if (n) notes[row.id] = n;
    }

    res.json({ summaries, chapters, notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──── FORMAT CITATIONS ────

app.post('/api/cite/format', (req, res) => {
  const { citation_items, style_id, format } = req.body;

  try {
    const result = formatCitations(citation_items, style_id || 'apa', format || 'text');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──── GENERATE BIBLIOGRAPHY ────

app.post('/api/cite/bibliography', (req, res) => {
  const { citation_items, style_id, format } = req.body;

  try {
    const result = generateBibliography(citation_items, style_id || 'apa', format || 'text');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──── SYNC FROM SUPABASE ────

app.post('/api/sync', async (req, res) => {
  const { library_id } = req.body;

  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  if (!library_id) return res.status(400).json({ error: 'library_id is required' });

  try {
    const lastSync = getLastSync(library_id);

    let query = supabase
      .from('references')
      .select('id, library_id, citation_key, title, authors, year, container_title, csl_json, updated_at')
      .eq('library_id', library_id);

    if (lastSync) {
      query = query.gt('updated_at', lastSync);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    for (const ref of (data || [])) {
      upsertLocal({
        id: ref.id,
        library_id: ref.library_id,
        citation_key: ref.citation_key,
        csl_json: JSON.stringify(ref.csl_json),
        title: ref.title,
        authors: JSON.stringify(ref.authors),
        year: ref.year,
        container_title: ref.container_title,
        updated_at: ref.updated_at,
      });
    }

    res.json({ synced: (data || []).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──── START SERVER ────

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Reference Manager Bridge running on http://127.0.0.1:${PORT}`);
  console.log(`Supabase: ${supabase ? 'configured' : 'not configured'}`);
});
