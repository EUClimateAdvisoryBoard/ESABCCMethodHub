// ============================================================================
// SQLite Cache for offline reference access
// ============================================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export interface CachedReference {
  id: string;
  library_id: string;
  citation_key: string | null;
  csl_json: string;
  title: string;
  authors: string | null;
  year: number | null;
  container_title: string | null;
  updated_at: string;
}

export function initCache(): void {
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  db = new Database(path.join(cacheDir, 'references.db'));

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS references_cache (
      id TEXT PRIMARY KEY,
      library_id TEXT NOT NULL,
      citation_key TEXT,
      csl_json TEXT NOT NULL,
      title TEXT NOT NULL,
      authors TEXT,
      year INTEGER,
      container_title TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_library ON references_cache(library_id);
    CREATE INDEX IF NOT EXISTS idx_cache_citation_key ON references_cache(citation_key);
    CREATE INDEX IF NOT EXISTS idx_cache_title ON references_cache(title);
    CREATE INDEX IF NOT EXISTS idx_cache_updated ON references_cache(updated_at);
  `);
}

export function searchLocal(libraryId: string, query: string): CachedReference[] {
  const stmt = db.prepare(`
    SELECT * FROM references_cache
    WHERE library_id = ?
    AND (title LIKE ? OR citation_key LIKE ? OR container_title LIKE ?)
    LIMIT 20
  `);
  const pattern = `%${query}%`;
  return stmt.all(libraryId, pattern, pattern, pattern) as CachedReference[];
}

export function batchGetLocal(ids: string[]): CachedReference[] {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM references_cache WHERE id IN (${placeholders})`);
  return stmt.all(...ids) as CachedReference[];
}

export function upsertLocal(ref: CachedReference): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO references_cache
    (id, library_id, citation_key, csl_json, title, authors, year, container_title, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    ref.id,
    ref.library_id,
    ref.citation_key,
    ref.csl_json,
    ref.title,
    ref.authors,
    ref.year,
    ref.container_title,
    ref.updated_at
  );
}

export function getLastSync(libraryId: string): string | null {
  const stmt = db.prepare(
    'SELECT MAX(updated_at) as last_sync FROM references_cache WHERE library_id = ?'
  );
  const result = stmt.get(libraryId) as { last_sync: string | null } | undefined;
  return result?.last_sync || null;
}

export function clearCache(libraryId?: string): void {
  if (libraryId) {
    db.prepare('DELETE FROM references_cache WHERE library_id = ?').run(libraryId);
  } else {
    db.prepare('DELETE FROM references_cache').run();
  }
}

export function getCacheStats(): { totalRefs: number; libraries: number } {
  const total = (db.prepare('SELECT COUNT(*) as count FROM references_cache').get() as any)?.count || 0;
  const libs = (db.prepare('SELECT COUNT(DISTINCT library_id) as count FROM references_cache').get() as any)?.count || 0;
  return { totalRefs: total, libraries: libs };
}
