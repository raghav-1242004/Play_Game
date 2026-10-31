const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const configuredDataDir = String(process.env.PLAYROOM_DATA_DIR || '').trim();
// Resolve relative storage paths from the application root, never from the shell's current directory.
const appRoot = path.resolve(__dirname, '..');
const dataDir = configuredDataDir
  ? (path.isAbsolute(configuredDataDir) ? path.resolve(configuredDataDir) : path.resolve(appRoot, configuredDataDir))
  : path.join(appRoot, 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const dbPath = path.join(dataDir, 'playroom.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 10000');
db.pragma('synchronous = FULL');
db.exec(`
CREATE TABLE IF NOT EXISTS players (
 id TEXT PRIMARY KEY, display_name TEXT NOT NULL,
 first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS match_history (
 id TEXT PRIMARY KEY, room_code TEXT NOT NULL,
 player1_id TEXT, player2_id TEXT,
 player1_name TEXT NOT NULL, player2_name TEXT,
 game_id TEXT NOT NULL, game_name TEXT NOT NULL,
 started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, ended_at TEXT,
 duration_seconds INTEGER, winner_id TEXT, winner_name TEXT, loser_id TEXT, loser_name TEXT,
 score_player1 INTEGER, score_player2 INTEGER,
 status TEXT NOT NULL DEFAULT 'started', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS match_history_started_idx ON match_history(started_at DESC);
CREATE INDEX IF NOT EXISTS match_history_players_idx ON match_history(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS match_history_room_idx ON match_history(room_code);
CREATE TABLE IF NOT EXISTS location_records (
 id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT NOT NULL, player_name TEXT NOT NULL,
 room_code TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL,
 accuracy REAL, consented_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS location_records_player_idx ON location_records(player_id);
CREATE TABLE IF NOT EXISTS voice_recordings (
 id TEXT PRIMARY KEY, room_code TEXT NOT NULL, game_name TEXT, participants TEXT NOT NULL,
 started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, ended_at TEXT, duration_seconds INTEGER,
 file_name TEXT NOT NULL, file_size INTEGER NOT NULL DEFAULT 0, mime_type TEXT NOT NULL DEFAULT 'audio/webm',
 status TEXT NOT NULL DEFAULT 'completed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS voice_recordings_started_idx ON voice_recordings(started_at DESC);
CREATE TABLE IF NOT EXISTS admin_audit_logs (
 id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL,
 details TEXT NOT NULL DEFAULT '{}', ip_address TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const router = express.Router();
const sessionMiddleware = session({
 store: new session.MemoryStore(),
 secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('SESSION_SECRET is required in production'); })() : crypto.randomBytes(48).toString('hex')),
 name: 'playroom_admin', resave: false, saveUninitialized: false,
 cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
});
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { ok: false, message: 'Too many login attempts. Try again later.' } });
const requireAdmin = (req, res, next) => req.session?.isAdmin ? next() : res.status(401).json({ ok: false, message: 'Administrator login required.' });
const hashIsConfigured = () => typeof process.env.ADMIN_PASSWORD_HASH === 'string' && /^\$2[aby]\$/.test(process.env.ADMIN_PASSWORD_HASH);
function audit(req, action, details = {}) {
  try { db.prepare('INSERT INTO admin_audit_logs(action,details,ip_address) VALUES(?,?,?)').run(action, JSON.stringify(details), req.ip); } catch (e) { console.error('Audit log failed:', e.message); }
}
function cleanupExpiredMatches() {
  // Keep today and the previous calendar date in Asia/Kolkata.
  db.exec("DELETE FROM match_history WHERE date(started_at, '+5 hours', '+30 minutes') < date('now', '+5 hours', '+30 minutes', '-1 day')");
  db.exec("DELETE FROM location_records WHERE date(created_at, '+5 hours', '+30 minutes') < date('now', '+5 hours', '+30 minutes', '-1 day')");
  try {
    const old=db.prepare("SELECT file_name FROM voice_recordings WHERE date(created_at, '+5 hours', '+30 minutes') < date('now', '+5 hours', '+30 minutes', '-1 day')").all();
    for(const item of old){try{fs.unlinkSync(path.join(dataDir,'recordings',item.file_name));}catch(_){}}
  } catch(_) {}
  db.exec("DELETE FROM voice_recordings WHERE date(created_at, '+5 hours', '+30 minutes') < date('now', '+5 hours', '+30 minutes', '-1 day')");
  db.exec("DELETE FROM players WHERE id NOT IN (SELECT player1_id FROM match_history WHERE player1_id IS NOT NULL UNION SELECT player2_id FROM match_history WHERE player2_id IS NOT NULL)");
}
cleanupExpiredMatches();

router.use(sessionMiddleware);
router.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
router.get('/admin/dashboard', (req, res) => req.session?.isAdmin ? res.sendFile(path.join(__dirname, 'dashboard.html')) : res.redirect('/admin'));
router.get('/admin/security', (req,res)=>req.session?.isAdmin?res.sendFile(path.join(__dirname,'security.html')):res.redirect('/admin'));
router.post('/api/admin/login', loginLimiter, express.json(), async (req, res) => {
  const password = String(req.body?.password || '');
  if (!hashIsConfigured()) return res.status(503).json({ ok: false, message: 'Admin password hash is not configured.' });
  let valid = false;
  try { valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH); } catch (_) {}
  if (!valid) { audit(req, 'login_failed'); return res.status(401).json({ ok: false, message: 'Invalid password.' }); }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ ok: false, message: 'Could not create secure session.' });
    req.session.isAdmin = true;
    req.session.createdAt = Date.now();
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ ok: false, message: 'Could not save administrator session.' });
      audit(req, 'login'); res.json({ ok: true, redirect: '/admin/dashboard' });
    });
  });
});
router.post('/api/admin/logout', requireAdmin, (req, res) => { audit(req, 'logout'); req.session.destroy(() => { res.clearCookie('playroom_admin'); res.json({ ok: true }); }); });
router.get('/api/admin/me', requireAdmin, (_req, res) => res.json({ ok: true, admin: true }));
router.get('/api/admin/storage-status', requireAdmin, (_req, res) => {
  try {
    const counts = {
      matches: db.prepare('SELECT COUNT(*) n FROM match_history').get().n,
      players: db.prepare('SELECT COUNT(*) n FROM players').get().n,
      locations: db.prepare('SELECT COUNT(*) n FROM location_records').get().n,
      recordings: db.prepare('SELECT COUNT(*) n FROM voice_recordings').get().n
    };
    res.set('Cache-Control', 'no-store').json({ ok: true, database: dbPath, dataDirectory: dataDir, writable: fs.accessSync(dataDir, fs.constants.W_OK) === undefined, counts });
  } catch (e) { console.error('Storage status failed:', e); res.status(500).json({ ok: false, message: 'Storage check failed: ' + e.message }); }
});
router.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const stats = db.prepare(`SELECT COUNT(*) total_matches,
    SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed,
    SUM(CASE WHEN status IN ('abandoned','disconnected') THEN 1 ELSE 0 END) incomplete,
    SUM(CASE WHEN status='completed' AND winner_name IS NULL THEN 1 ELSE 0 END) draws,
    COALESCE(SUM(duration_seconds),0) total_seconds,
    (SELECT COUNT(*) FROM (SELECT player1_id id FROM match_history WHERE player1_id IS NOT NULL UNION SELECT player2_id FROM match_history WHERE player2_id IS NOT NULL)) unique_players
    FROM match_history`).get();
  const popular = db.prepare('SELECT game_name,COUNT(*) matches FROM match_history GROUP BY game_name ORDER BY matches DESC LIMIT 8').all();
  const recent = db.prepare('SELECT id,player1_name,player2_name,game_name,started_at,duration_seconds,winner_name,status,room_code FROM match_history ORDER BY started_at DESC LIMIT 8').all();
  res.json({ ok: true, stats, popular, recent });
});
router.get('/api/admin/matches', requireAdmin, (req, res) => {
  const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1)), limit = 30;
  const q = String(req.query.q || '').slice(0,80), game = String(req.query.game || '').slice(0,60), status = String(req.query.status || '').slice(0,24), winner = String(req.query.winner || '').slice(0,40), from = String(req.query.from || '').slice(0,10), to = String(req.query.to || '').slice(0,10);
  const rows = db.prepare(`SELECT * FROM match_history WHERE
   (?='' OR player1_name LIKE ? OR COALESCE(player2_name,'') LIKE ? OR room_code LIKE ? OR id LIKE ?) AND
   (?='' OR game_id=?) AND (?='' OR status=?) AND (?='' OR COALESCE(winner_name,'') LIKE ?) AND
   (?='' OR date(started_at,'+5 hours','+30 minutes')>=date(?)) AND (?='' OR date(started_at,'+5 hours','+30 minutes')<=date(?))
   ORDER BY started_at DESC LIMIT ? OFFSET ?`).all(q,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,game,game,status,status,winner,`%${winner}%`,from,from,to,to,limit,(page-1)*limit);
  res.json({ ok: true, rows, page, limit });
});
router.get('/api/admin/matches/:id', requireAdmin, (req, res) => {
  const match = db.prepare('SELECT * FROM match_history WHERE id=?').get(req.params.id);
  if (!match) return res.status(404).json({ ok: false, message: 'Match not found.' });
  res.json({ ok: true, match });
});
router.get('/api/admin/players', requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT player_id,display_name,COUNT(*) matches,
   SUM(CASE WHEN winner_id=player_id THEN 1 ELSE 0 END) wins,COALESCE(SUM(duration_seconds),0) seconds FROM (
   SELECT player1_id player_id,player1_name display_name,winner_id,duration_seconds FROM match_history
   UNION ALL SELECT player2_id,player2_name,winner_id,duration_seconds FROM match_history WHERE player2_id IS NOT NULL
   ) p WHERE player_id IS NOT NULL GROUP BY player_id,display_name ORDER BY matches DESC LIMIT 500`).all();
  res.json({ ok: true, rows });
});
router.get('/api/admin/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id,player1_name,player2_name,game_name,started_at,ended_at,duration_seconds,winner_name,status,room_code FROM match_history ORDER BY started_at DESC').all();
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const data = [['Match ID','Player 1','Player 2','Game','Started','Ended','Duration seconds','Winner','Status','Room'], ...rows.map(r=>[r.id,r.player1_name,r.player2_name,r.game_name,r.started_at,r.ended_at,r.duration_seconds,r.winner_name,r.status,r.room_code])];
  audit(req, 'export_matches', { count: rows.length });
  res.type('text/csv').attachment('playroom-match-history.csv').send('\uFEFF' + data.map(r=>r.map(esc).join(',')).join('\r\n'));
});

router.get('/api/admin/security/locations', requireAdmin, (req, res) => {
  const q=String(req.query.q||'').slice(0,80);
  const rows=db.prepare(`SELECT id,player_id,player_name,room_code,latitude,longitude,accuracy,consented_at,created_at FROM location_records
    WHERE (?='' OR player_id LIKE ? OR player_name LIKE ? OR COALESCE(room_code,'') LIKE ?) ORDER BY created_at DESC LIMIT 300`).all(q,`%${q}%`,`%${q}%`,`%${q}%`);
  audit(req,'view_locations',{count:rows.length}); res.json({ok:true,rows});
});
router.get('/api/admin/security/recordings', requireAdmin, (req,res)=>{
  const q=String(req.query.q||'').slice(0,80);
  const rows=db.prepare(`SELECT * FROM voice_recordings WHERE (?='' OR room_code LIKE ? OR participants LIKE ? OR id LIKE ?) ORDER BY started_at DESC LIMIT 200`).all(q,`%${q}%`,`%${q}%`,`%${q}%`);
  res.json({ok:true,rows});
});
router.get('/api/admin/security/recordings/:id', requireAdmin, (req,res)=>{
  const row=db.prepare('SELECT * FROM voice_recordings WHERE id=?').get(req.params.id);
  if(!row) return res.status(404).json({ok:false,message:'Recording not found.'});
  const file=path.join(dataDir,'recordings',row.file_name);
  if(!fs.existsSync(file)) return res.status(404).json({ok:false,message:'Recording file is unavailable.'});
  audit(req,'play_recording',{id:row.id}); res.set('Cache-Control','no-store').type(row.mime_type).sendFile(file);
});
router.get('/api/admin/security/recordings/:id/download', requireAdmin, (req,res)=>{
  const row=db.prepare('SELECT * FROM voice_recordings WHERE id=?').get(req.params.id);
  if(!row) return res.status(404).json({ok:false,message:'Recording not found.'});
  const file=path.join(dataDir,'recordings',row.file_name);
  if(!fs.existsSync(file)) return res.status(404).json({ok:false,message:'Recording file is unavailable.'});
  audit(req,'download_recording',{id:row.id}); res.download(file,row.file_name);
});
router.delete('/api/admin/security/recordings/:id', requireAdmin, (req,res)=>{
  const row=db.prepare('SELECT * FROM voice_recordings WHERE id=?').get(req.params.id);
  if(!row) return res.status(404).json({ok:false,message:'Recording not found.'});
  try { fs.unlinkSync(path.join(dataDir,'recordings',row.file_name)); } catch(_) {}
  db.prepare('DELETE FROM voice_recordings WHERE id=?').run(row.id); audit(req,'delete_recording',{id:row.id}); res.json({ok:true});
});

module.exports = { router, db, dataDir, dbPath, sessionMiddleware, requireAdmin, cleanupExpiredMatches };
