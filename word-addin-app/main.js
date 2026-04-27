const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let mainWindow;
let db;

// --- Database Setup ---

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'esabcc-annotations.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_id TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      color TEXT DEFAULT '#FFECB3',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_annotations_ref_id ON annotations(ref_id);

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tags_ref_id ON tags(ref_id);

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS collection_refs (
      collection_id INTEGER NOT NULL,
      ref_id TEXT NOT NULL,
      added_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (collection_id, ref_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );
  `);
}

// --- Load References ---

function loadReferences() {
  const refPath = path.join(__dirname, 'data', 'references.json');
  if (!fs.existsSync(refPath)) {
    return [];
  }
  const raw = fs.readFileSync(refPath, 'utf-8');
  return JSON.parse(raw);
}

// --- Window Creation ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'ESABCC Reference Manager',
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#F5F6F8',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
}

// --- IPC Handlers ---

function registerIpcHandlers() {
  ipcMain.handle('load-references', () => {
    return loadReferences();
  });

  // Annotations
  ipcMain.handle('get-annotations', (_, refId) => {
    const stmt = db.prepare('SELECT * FROM annotations WHERE ref_id = ? ORDER BY created_at DESC');
    return stmt.all(refId);
  });

  ipcMain.handle('save-annotation', (_, { refId, note, color }) => {
    const stmt = db.prepare('INSERT INTO annotations (ref_id, note, color) VALUES (?, ?, ?)');
    const result = stmt.run(refId, note, color || '#FFECB3');
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('update-annotation', (_, { id, note, color }) => {
    const stmt = db.prepare("UPDATE annotations SET note = ?, color = ?, updated_at = datetime('now') WHERE id = ?");
    stmt.run(note, color, id);
    return { success: true };
  });

  ipcMain.handle('delete-annotation', (_, id) => {
    const stmt = db.prepare('DELETE FROM annotations WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  ipcMain.handle('get-all-annotations-count', () => {
    const stmt = db.prepare('SELECT ref_id, COUNT(*) as count FROM annotations GROUP BY ref_id');
    const rows = stmt.all();
    const map = {};
    for (const row of rows) {
      map[row.ref_id] = row.count;
    }
    return map;
  });

  // Tags
  ipcMain.handle('get-tags', (_, refId) => {
    const stmt = db.prepare('SELECT * FROM tags WHERE ref_id = ?');
    return stmt.all(refId);
  });

  ipcMain.handle('add-tag', (_, { refId, tag }) => {
    const stmt = db.prepare('INSERT INTO tags (ref_id, tag) VALUES (?, ?)');
    const result = stmt.run(refId, tag);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('delete-tag', (_, id) => {
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  // Collections
  ipcMain.handle('get-collections', () => {
    const stmt = db.prepare('SELECT c.*, (SELECT COUNT(*) FROM collection_refs cr WHERE cr.collection_id = c.id) as ref_count FROM collections c ORDER BY c.name');
    return stmt.all();
  });

  ipcMain.handle('create-collection', (_, { name, description }) => {
    const stmt = db.prepare('INSERT INTO collections (name, description) VALUES (?, ?)');
    const result = stmt.run(name, description || '');
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('delete-collection', (_, id) => {
    db.prepare('DELETE FROM collection_refs WHERE collection_id = ?').run(id);
    db.prepare('DELETE FROM collections WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('add-to-collection', (_, { collectionId, refId }) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO collection_refs (collection_id, ref_id) VALUES (?, ?)');
    stmt.run(collectionId, refId);
    return { success: true };
  });

  ipcMain.handle('remove-from-collection', (_, { collectionId, refId }) => {
    const stmt = db.prepare('DELETE FROM collection_refs WHERE collection_id = ? AND ref_id = ?');
    stmt.run(collectionId, refId);
    return { success: true };
  });

  ipcMain.handle('get-collection-refs', (_, collectionId) => {
    const stmt = db.prepare('SELECT ref_id FROM collection_refs WHERE collection_id = ?');
    return stmt.all(collectionId).map(r => r.ref_id);
  });

  // Clipboard / Word integration
  ipcMain.handle('copy-to-clipboard', (_, text) => {
    clipboard.writeText(text);
    return { success: true };
  });
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});
