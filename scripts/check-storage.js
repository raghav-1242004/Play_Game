require('dotenv').config();
const crypto = require('crypto');
const admin = require('../admin');
const db = admin.db;
const id = `storage-check-${crypto.randomUUID()}`;
try {
  db.prepare('INSERT INTO players(id, display_name) VALUES(?, ?)').run(id, 'Storage health check');
  const row = db.prepare('SELECT id, display_name FROM players WHERE id=?').get(id);
  if (!row || row.id !== id) throw new Error('SQLite write/read verification failed.');
  db.prepare('DELETE FROM players WHERE id=?').run(id);
  console.log('Storage OK');
  console.log(`Database: ${admin.dbPath}`);
  console.log(`Data directory: ${admin.dataDir}`);
  console.log('SQLite insert, read and delete test passed.');
} catch (error) {
  console.error('Storage check failed:', error.message);
  process.exitCode = 1;
} finally {
  try { db.close(); } catch (_) {}
}
