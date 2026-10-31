require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 25000, pingTimeout: 20000 });
const PORT = process.env.PORT || 3000;

const rooms = new Map();
const crypto = require("crypto");
const admin = require("./admin");
const historyDb = admin.db;
const securityDataDir = admin.dataDir;
const recordingsDir = path.join(securityDataDir, 'recordings');
fs.mkdirSync(recordingsDir, { recursive: true, mode: 0o700 });
const recordingUploads = new Map();
const MAX_RECORDING_BYTES = 100 * 1024 * 1024;
async function savePlayer(player) {
  if (!player?.playerId) return;
  try {
    historyDb.prepare(`INSERT INTO players(id,display_name) VALUES(?,?)
      ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,last_seen=CURRENT_TIMESTAMP`)
      .run(player.playerId, player.name);
  } catch (e) { console.error("Player history save failed:", e.message); }
}
const GAME_LABELS = {
  tictactoe:"Tic Tac Toe", rps:"Rock Paper Scissors", connect4:"Connect Four", dotsboxes:"Dots & Boxes",
  hangman:"Hangman", battleship:"Battleship", checkers:"Checkers", chess:"Chess", numberduel:"Number Duel",
  higherlower:"Number Guess", memory:"Memory Match", reversi:"Reversi (Othello)", gomoku:"Five in a Row",
  reaction:"Reaction Duel", mathrace:"Math Battle", pig:"Pig Dice", snake:"Snake Battle", pong:"Pong Duel",
  airhockey:"Air Hockey", brickbreaker:"Brick Breaker Duel", spaceshooter:"Space Shooter", platformrace:"Platform Race",
  carracing:"Car Racing", bikeracing:"Bike Racing", minigolf:"Mini Golf", ludo:"Ludo", snakeladder:"Snake & Ladder",
  dominoes:"Dominoes", mancala:"Mancala", tanks:"Tank Battle", penalty:"Football Penalty", basketball:"Basketball Duel",
  wordscramble:"Word Scramble", quiz:"Quiz Battle", codebreaker:"Code Breaker", sequence:"Sequence Memory",
  colorduel:"Color Pattern Duel", maze:"Maze Race", whack:"Whack-a-Mole", drawguess:"Draw & Guess"
};
const gameLabel = id => GAME_LABELS[id] || String(id).replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase());
function persistMatchStart(room, game) {
  if (!game || !room.players[0] || !room.players[1] || game.historyId) return;
  game.historyId = crypto.randomUUID();
  const [p1,p2] = room.players;
  game.historyReady = (async () => {
    try {
      await savePlayer(p1); await savePlayer(p2);
      historyDb.prepare(`INSERT INTO match_history
        (id,room_code,player1_id,player2_id,player1_name,player2_name,game_id,game_name,started_at,status)
        VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,'started')`)
        .run(game.historyId,room.code,p1.playerId,p2.playerId,p1.name,p2.name,game.id,gameLabel(game.id));
    } catch (e) { console.error("Match start persistence failed:", e.message); game.historySaveError = true; }
  })();
}
async function persistMatchFinish(room, game) {
  if (!game?.historyId) return;
  await game.historyReady;
  const p1=room.players.find(p=>p.mark==="X"), p2=room.players.find(p=>p.mark==="O");
  const winner=game.winner==="X"?p1:game.winner==="O"?p2:null;
  const loser=winner?(winner.mark==="X"?p2:p1):null;
  const scores=game.scores || game.goals || game.final || {};
  try {
    historyDb.prepare(`UPDATE match_history SET ended_at=CURRENT_TIMESTAMP,
      duration_seconds=MAX(0,CAST((julianday(CURRENT_TIMESTAMP)-julianday(started_at))*86400 AS INTEGER)),
      winner_id=?,winner_name=?,loser_id=?,loser_name=?,score_player1=?,score_player2=?,status='completed'
      WHERE id=?`).run(winner?.playerId||null,winner?.name||null,loser?.playerId||null,loser?.name||null,
      Number(scores.X || 0),Number(scores.O || 0),game.historyId);
  } catch(e) { console.error("Match finish persistence failed:",e.message); }
}
async function persistRoomAbandoned(room, player) {
  if (!room?.game?.historyId) return;
  await room.game.historyReady;
  try {
    historyDb.prepare(`UPDATE match_history SET ended_at=CURRENT_TIMESTAMP,
      duration_seconds=MAX(0,CAST((julianday(CURRENT_TIMESTAMP)-julianday(started_at))*86400 AS INTEGER)),
      status='disconnected' WHERE id=? AND status='started'`).run(room.game.historyId);
  } catch(e) { console.error("Disconnect persistence failed:",e.message); }
}
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BASE_GAMES = ["tictactoe", "rps", "connect4", "dotsboxes", "hangman", "battleship", "checkers", "chess", "numberduel", "higherlower", "memory", "reversi", "gomoku", "reaction", "mathrace", "pig"];

// ---- Points system ----
const WIN_POINTS = 10;   // winner ke naam par +10
const DRAW_POINTS = 3;   // draw par dono ko +3

app.use(admin.router);
// One-time upload token: issued only after both room participants consent.
app.post('/api/voice-recordings/upload/:token', express.raw({ type: ['audio/webm','audio/ogg','application/octet-stream'], limit: '100mb' }), (req,res)=>{
  const session=recordingUploads.get(req.params.token);
  if(!session || session.expiresAt<Date.now()) { recordingUploads.delete(req.params.token); return res.status(403).json({ok:false,message:'Upload token expired.'}); }
  if(!Buffer.isBuffer(req.body) || !req.body.length || req.body.length>MAX_RECORDING_BYTES) return res.status(400).json({ok:false,message:'Invalid recording payload.'});
  const fileName=`${session.id}.webm`, filePath=path.join(recordingsDir,fileName);
  try {
    fs.writeFileSync(filePath,req.body,{flag:'wx',mode:0o600});
    historyDb.prepare(`INSERT INTO voice_recordings(id,room_code,game_name,participants,started_at,ended_at,duration_seconds,file_name,file_size,mime_type,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(session.id,session.roomCode,session.gameName,JSON.stringify(session.participants),session.startedAt,new Date().toISOString(),Math.max(0,Math.round((Date.now()-session.startedMs)/1000)),fileName,req.body.length,'audio/webm','completed');
    recordingUploads.delete(req.params.token); res.json({ok:true});
  } catch(e) { try{fs.unlinkSync(filePath)}catch(_){} console.error('Recording save failed:',e.message); res.status(500).json({ok:false,message:'Could not store recording.'}); }
});
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, service: "playroom-multigame" }));

// ---- Voice chat: ICE servers (STUN always; TURN only if configured through env vars) ----
// TURN_URLS="turn:host:3478,turns:host:5349"  TURN_USERNAME=...  TURN_CREDENTIAL=...
app.get("/ice", (_req, res) => {
  const iceServers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }];
  if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL)
    iceServers.push({ urls: process.env.TURN_URLS.split(",").map((s) => s.trim()).filter(Boolean), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  res.set("Cache-Control", "no-store").json({ iceServers });
});

// ---------- helpers ----------
const other = (m) => (m === "X" ? "O" : "X");
function makeCode() {
  let s;
  do { s = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(""); } while (rooms.has(s));
  return s;
}
function cleanName(v) {
  return String(v || "Player").trim().replace(/[<>]/g, "").slice(0, 18) || "Player";
}
const nm = (room, m) => room.players.find((p) => p.mark === m)?.name || (m === "X" ? "Player 1" : "Player 2");

const WORDS = [
  ["PLANET", "Space"], ["GALAXY", "Space"], ["ROCKET", "Space"], ["ASTRONAUT", "Space"],
  ["TIGER", "Animal"], ["DOLPHIN", "Animal"], ["ELEPHANT", "Animal"], ["PEACOCK", "Animal"],
  ["PIZZA", "Food"], ["BANANA", "Food"], ["CHOCOLATE", "Food"], ["SAMOSA", "Food"],
  ["CRICKET", "Sport"], ["FOOTBALL", "Sport"], ["BADMINTON", "Sport"], ["KABADDI", "Sport"],
  ["MOUNTAIN", "Nature"], ["RAINBOW", "Nature"], ["WATERFALL", "Nature"],
  ["GUITAR", "Music"], ["PIANO", "Music"], ["COMPUTER", "Tech"], ["KEYBOARD", "Tech"], ["TELEPHONE", "Tech"],
  ["BIRTHDAY", "Party"], ["BALLOON", "Party"], ["FIREWORKS", "Party"]
];

// ---------- extra helpers for the newer games ----------
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const MEM_EMOJI = ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🐵", "🦄", "🐙", "🦉"];

// ---- Levels (Easy / Medium / Hard): chosen in the room, applied when a round starts ----
const LEVELS = ["easy", "medium", "hard"];
const pickLv = (level, easy, medium, hard) => (level === "easy" ? easy : level === "hard" ? hard : medium);
function mathQ(level = "medium") {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), t = Math.floor(Math.random() * 3);
  if (level === "easy") {
    if (t === 0) { const a = r(2, 20), b = r(2, 20); return { text: `${a} + ${b}`, answer: a + b }; }
    if (t === 1) { const a = r(15, 40), b = r(2, 14); return { text: `${a} − ${b}`, answer: a - b }; }
    const a = r(2, 6), b = r(2, 6); return { text: `${a} × ${b}`, answer: a * b };
  }
  if (level === "hard") {
    if (t === 0) { const a = r(120, 899), b = r(35, 99); return { text: `${a} + ${b}`, answer: a + b }; }
    if (t === 1) { const a = r(300, 999), b = r(45, 280); return { text: `${a} − ${b}`, answer: a - b }; }
    const a = r(11, 19), b = r(6, 15); return { text: `${a} × ${b}`, answer: a * b };
  }
  if (t === 0) { const a = r(12, 99), b = r(12, 99); return { text: `${a} + ${b}`, answer: a + b }; }
  if (t === 1) { const a = r(40, 99), b = r(10, 39); return { text: `${a} − ${b}`, answer: a - b }; }
  const a = r(3, 12), b = r(3, 12); return { text: `${a} × ${b}`, answer: a * b };
}
const RV_DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
function rvFlips(b, i, m) {
  if (b[i]) return [];
  const r = Math.floor(i / 8), c = i % 8, out = [];
  for (const [dr, dc] of RV_DIRS) {
    const line = []; let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] && b[rr * 8 + cc] !== m) { line.push(rr * 8 + cc); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === m) out.push(...line);
  }
  return out;
}
const rvLegal = (b, m) => { const l = []; for (let i = 0; i < 64; i++) if (rvFlips(b, i, m).length) l.push(i); return l; };
const GM = 11;
function gmLine(b, i, m) {
  const r = Math.floor(i / GM), c = i % GM;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [i];
    for (const s of [-1, 1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < GM && cc >= 0 && cc < GM && b[rr * GM + cc] === m) { cells.push(rr * GM + cc); rr += dr * s; cc += dc * s; }
    }
    if (cells.length >= 5) return cells;
  }
  return null;
}
function scheduleGo(room, g) {
  setTimeout(() => {
    if (rooms.get(room.code) !== room || room.game !== g || g.status !== "playing") return;
    g.phase = "go"; g.goAt = Date.now(); g.message = "GO! Tap now!";
    emit(room);
  }, 2000 + Math.random() * 3500);
}

// ---------- finishing a round + awarding points ----------
function finish(room, winner, message) {
  const g = room.game;
  g.status = "finished";
  g.winner = winner;
  g.message = message;
  g.turn = null;
  g.finishId = ++room.finishCounter;
  g.award = { X: 0, O: 0 };
  // points are kept SEPARATELY for every game (room.gp[gameId]) and as a grand total (room.points)
  const rec = (room.gp[g.id] ||= { points: { X: 0, O: 0 }, wins: { X: 0, O: 0 }, draws: 0, rounds: 0 });
  rec.rounds++;
  if (winner === "X" || winner === "O") { rec.points[winner] += WIN_POINTS; rec.wins[winner]++; }
  else if (winner === "draw") { rec.points.X += DRAW_POINTS; rec.points.O += DRAW_POINTS; rec.draws++; }
  if (winner === "X" || winner === "O") {
    room.points[winner] += WIN_POINTS;
    room.wins[winner] += 1;
    g.award[winner] = WIN_POINTS;
  } else if (winner === "draw") {
    room.points.X += DRAW_POINTS;
    room.points.O += DRAW_POINTS;
    g.award = { X: DRAW_POINTS, O: DRAW_POINTS };
  }
  persistMatchFinish(room, g);
}

// ---------- extra games (23 more) live in extra.js ----------
const extra = require("./extra")({ rooms, finish, emit, nm, other, shuffle });
const GAMES = [...BASE_GAMES, ...extra.IDS];

// ---------- game setup ----------
const BS_SIZE = 8;
const BS_FLEET = [4, 3, 2];

function blankGame(id, starter, level = "medium") {
  const base = { id, level, status: "playing", turn: starter, winner: null, message: "", last: null, award: null, finishId: 0 };
  switch (id) {
    case "tictactoe": return { ...base, board: Array(9).fill(""), line: null };
    case "rps": return { ...base, turn: null, picks: { X: null, O: null } };
    case "connect4": return { ...base, board: Array(42).fill(""), line: null };
    case "dotsboxes": return { ...base, h: Array(30).fill(""), v: Array(30).fill(""), boxes: Array(25).fill(""), scores: { X: 0, O: 0 } };
    case "hangman": {
      const [secret, hint] = WORDS[Math.floor(Math.random() * WORDS.length)];
      return { ...base, secret, hint, guessed: [], mistakes: 0, maxMistakes: 6 };
    }
    case "battleship": return { ...base, starter, phase: "place", fleet: BS_FLEET, size: BS_SIZE, ships: { X: [], O: [] }, ready: { X: false, O: false }, shots: { X: [], O: [] } };
    case "checkers": {
      const b = Array(64).fill("");
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) b[r * 8 + c] = "o";
      for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) b[r * 8 + c] = "x";
      return { ...base, turn: "X", board: b, chain: null, lastMove: null, captured: { X: 0, O: 0 } };
    }
    case "chess": return { ...base, turn: "X", fen: new Chess().fen(), pgn: "", lastMove: null };
    case "numberduel": return { ...base, turn: null, picks: { X: null, O: null } };
    case "higherlower": { const max = pickLv(level, 50, 100, 500); return { ...base, max, target: Math.floor(Math.random() * max) + 1, guesses: [] }; }
    case "memory": { const pairs = pickLv(level, 6, 8, 10), em = MEM_EMOJI.slice(0, pairs); return { ...base, pairs, cards: shuffle([...em, ...em]), matched: Array(pairs * 2).fill(""), flipped: [], busy: false, scores: { X: 0, O: 0 } }; }
    case "reversi": { const b = Array(64).fill(""); b[27] = "O"; b[28] = "X"; b[35] = "X"; b[36] = "O"; return { ...base, board: b, scores: { X: 2, O: 2 } }; }
    case "gomoku": return { ...base, board: Array(GM * GM).fill(""), line: null, size: GM };
    case "reaction": return { ...base, turn: null, phase: "wait", goAt: null };
    case "mathrace": { const q = mathQ(level); return { ...base, turn: null, scores: { X: 0, O: 0 }, qn: 1, target: pickLv(level, 3, 3, 5), q: q.text, answer: q.answer, locked: { X: false, O: false } }; }
    case "pig": return { ...base, scores: { X: 0, O: 0 }, turnTotal: 0, die: null, target: pickLv(level, 30, 50, 100) };
    default: return extra.blank(id, base);
  }
}

function intro(room, g) {
  const first = nm(room, g.turn || "X");
  switch (g.id) {
    case "rps": return "Pick rock, paper or scissors.";
    case "numberduel": return "Secretly pick 1–10. The higher number wins!";
    case "battleship": return "Place your fleet, then press Ready.";
    case "hangman": return `Category: ${g.hint}. ${first} guesses first.`;
    case "higherlower": return `Find the secret number (1–${g.max}). ${first} starts.`;
    case "checkers": return `${first} moves first. Captures are compulsory.`;
    case "chess": return `${first} plays White and moves first.`;
    case "memory": return `${first} flips first. Find matching pairs!`;
    case "reversi": return `${first} plays first. Flank your rival's discs!`;
    case "gomoku": return `${first} starts. Get five in a row!`;
    case "reaction": return "Wait for GREEN… tapping early loses!";
    case "mathrace": return `Solve fast! First to ${g.target} correct answers wins.`;
    case "pig": return `${first} rolls first. First to ${g.target} points wins.`;
    default: return extra.IDS.includes(g.id) ? extra.intro(room, g) : `${first} goes first.`;
  }
}

// Both players must press "Ready" on the rules screen; then begin() really starts the round.
function begin(room, g) {
  g.gate = null;
  g.message = intro(room, g);
  if (g.id === "reaction") scheduleGo(room, g);
  else if (extra.IDS.includes(g.id)) extra.begin(room, g);
}
function startGame(room, id, skipRules) {
  room.round += 1;
  const starter = room.round % 2 === 1 ? "X" : "O"; // starter alternates every round
  const g = blankGame(id, starter, room.level);
  g.rid = room.round;
  room.game = g;
  persistMatchStart(room, g);
  if (skipRules) begin(room, g);
  else { g.gate = { X: false, O: false }; g.message = "Read the rules, then press Ready."; }
}

// ---------- tic tac toe / connect four ----------
function tttLine(b) {
  for (const l of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])
    if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l;
  return null;
}
function c4Line(b, row, col, m) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [row * 7 + col];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && b[r * 7 + c] === m) { cells.push(r * 7 + c); r += dr * sign; c += dc * sign; }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

// ---------- dots & boxes (5x5 boxes = 25, no draws) ----------
const dbBox = (g, r, c) => g.h[r * 5 + c] && g.h[(r + 1) * 5 + c] && g.v[r * 6 + c] && g.v[r * 6 + c + 1];

// ---------- battleship helpers ----------
function bsCells(start, len, horiz) {
  const r = Math.floor(start / BS_SIZE), c = start % BS_SIZE, cells = [];
  for (let k = 0; k < len; k++) {
    const rr = horiz ? r : r + k, cc = horiz ? c + k : c;
    if (rr >= BS_SIZE || cc >= BS_SIZE) return null;
    cells.push(rr * BS_SIZE + cc);
  }
  return cells;
}
function bsRandomFleet() {
  const ships = [], used = new Set();
  for (const len of BS_FLEET) {
    for (let t = 0; t < 500; t++) {
      const cells = bsCells(Math.floor(Math.random() * BS_SIZE * BS_SIZE), len, Math.random() < 0.5);
      if (cells && cells.every((c) => !used.has(c))) { cells.forEach((c) => used.add(c)); ships.push({ len, cells }); break; }
    }
  }
  return ships;
}

// ---------- checkers (with captures, multi-jump, kings) ----------
const ckOwner = (p) => (p === "x" || p === "K" ? "X" : p === "o" || p === "Q" ? "O" : null);
function ckPieceMoves(b, i, onlyJumps) {
  const p = b[i], m = ckOwner(p);
  if (!m) return [];
  const king = p === "K" || p === "Q";
  const dirs = king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : m === "X" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  const r = Math.floor(i / 8), c = i % 8, out = [];
  for (const [dr, dc] of dirs) {
    const r1 = r + dr, c1 = c + dc;
    if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
    const t = b[r1 * 8 + c1];
    if (!t) { if (!onlyJumps) out.push({ from: i, to: r1 * 8 + c1, cap: null }); }
    else if (ckOwner(t) !== m) {
      const r2 = r + 2 * dr, c2 = c + 2 * dc;
      if (r2 >= 0 && r2 <= 7 && c2 >= 0 && c2 <= 7 && !b[r2 * 8 + c2]) out.push({ from: i, to: r2 * 8 + c2, cap: r1 * 8 + c1 });
    }
  }
  return out;
}
function ckMoves(b, m, chain) {
  if (chain !== null && chain !== undefined) return ckPieceMoves(b, chain, true);
  const all = [];
  for (let i = 0; i < 64; i++) if (ckOwner(b[i]) === m) all.push(...ckPieceMoves(b, i, false));
  const jumps = all.filter((x) => x.cap !== null);
  return jumps.length ? jumps : all;
}
function ckLegal(g) {
  const map = {};
  for (const mv of ckMoves(g.board, g.turn, g.chain)) (map[mv.from] ??= []).push(mv.to);
  return map;
}

// ---------- chess ----------
function chessLoad(g) {
  const c = new Chess();
  try { if (g.pgn) c.loadPgn(g.pgn); } catch { /* fall through */ }
  if (c.fen() !== g.fen) c.load(g.fen);
  return c;
}

// ---------- per-game move handlers: return an error string, or nothing on success ----------
const PLAY = {
  tictactoe(room, m, d) {
    const g = room.game, i = Number(d.index);
    if (g.turn !== m) return "Wait for your turn.";
    if (!Number.isInteger(i) || i < 0 || i > 8 || g.board[i]) return "That square is taken.";
    g.board[i] = m; g.last = i;
    const line = tttLine(g.board);
    if (line) { g.line = line; finish(room, m, `${nm(room, m)} wins!`); }
    else if (g.board.every(Boolean)) finish(room, "draw", "It's a draw!");
    else { g.turn = other(m); g.message = `${nm(room, g.turn)}'s turn.`; }
  },

  rps(room, m, d) {
    const g = room.game;
    if (!["rock", "paper", "scissors"].includes(d.choice)) return "Pick a valid move.";
    if (g.picks[m]) return "You already locked in.";
    g.picks[m] = d.choice;
    if (g.picks.X && g.picks.O) {
      const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
      if (g.picks.X === g.picks.O) finish(room, "draw", "Same move — it's a draw!");
      else { const w = beats[g.picks.X] === g.picks.O ? "X" : "O"; finish(room, w, `${nm(room, w)} wins the round!`); }
    } else g.message = `${nm(room, m)} is locked in. Waiting for ${nm(room, other(m))}…`;
  },

  connect4(room, m, d) {
    const g = room.game, col = Number(d.col);
    if (g.turn !== m) return "Wait for your turn.";
    if (!Number.isInteger(col) || col < 0 || col > 6) return "Invalid column.";
    let row = -1;
    for (let r = 5; r >= 0; r--) if (!g.board[r * 7 + col]) { row = r; break; }
    if (row < 0) return "That column is full.";
    const idx = row * 7 + col;
    g.board[idx] = m; g.last = idx;
    const line = c4Line(g.board, row, col, m);
    if (line) { g.line = line; finish(room, m, `${nm(room, m)} connected four!`); }
    else if (g.board.every(Boolean)) finish(room, "draw", "Board full — draw!");
    else { g.turn = other(m); g.message = `${nm(room, g.turn)}'s turn.`; }
  },

  dotsboxes(room, m, d) {
    const g = room.game, t = d.type, idx = Number(d.index), cand = [];
    if (g.turn !== m) return "Wait for your turn.";
    if (t === "h" && Number.isInteger(idx) && idx >= 0 && idx < 30 && !g.h[idx]) {
      g.h[idx] = m;
      const r = Math.floor(idx / 5), c = idx % 5;
      if (r > 0) cand.push([r - 1, c]);
      if (r < 5) cand.push([r, c]);
    } else if (t === "v" && Number.isInteger(idx) && idx >= 0 && idx < 30 && !g.v[idx]) {
      g.v[idx] = m;
      const r = Math.floor(idx / 6), c = idx % 6;
      if (c > 0) cand.push([r, c - 1]);
      if (c < 5) cand.push([r, c]);
    } else return "That line is already drawn.";
    g.last = { type: t, index: idx };
    let got = 0;
    for (const [r, c] of cand) {
      const bi = r * 5 + c;
      if (!g.boxes[bi] && dbBox(g, r, c)) { g.boxes[bi] = m; g.scores[m]++; got++; }
    }
    if (g.boxes.every(Boolean)) {
      const w = g.scores.X > g.scores.O ? "X" : "O";
      finish(room, w, `${nm(room, w)} wins ${g.scores[w]}–${g.scores[other(w)]}!`);
    } else if (got) g.message = `${nm(room, m)} completed ${got} box${got > 1 ? "es" : ""} — go again!`;
    else { g.turn = other(m); g.message = `${nm(room, g.turn)}'s turn.`; }
  },

  hangman(room, m, d) {
    const g = room.game, L = String(d.letter || "").toUpperCase();
    if (g.turn !== m) return "Wait for your turn.";
    if (!/^[A-Z]$/.test(L) || g.guessed.includes(L)) return "Pick a new letter.";
    g.guessed.push(L); g.last = L;
    if (g.secret.includes(L)) {
      if ([...g.secret].every((ch) => g.guessed.includes(ch))) return finish(room, m, `${nm(room, m)} solved it! The word was ${g.secret}.`);
      g.message = `${nm(room, m)} found "${L}" — guess again!`;
    } else {
      g.mistakes++;
      if (g.mistakes >= g.maxMistakes) return finish(room, "none", `Out of tries! The word was ${g.secret}.`);
      g.turn = other(m);
      g.message = `No "${L}". ${nm(room, g.turn)}'s turn.`;
    }
  },

  battleship(room, m, d) {
    const g = room.game, op = d.op, foe = other(m);
    if (g.phase === "place") {
      if (g.ready[m]) return "You're ready — waiting for your opponent.";
      if (op === "place") {
        const i = Number(d.index), len = BS_FLEET[g.ships[m].length];
        if (!len) return "All ships placed — press Ready.";
        if (!Number.isInteger(i) || i < 0 || i >= BS_SIZE * BS_SIZE) return "Invalid square.";
        const cells = bsCells(i, len, !!d.horiz);
        const used = new Set(g.ships[m].flatMap((s) => s.cells));
        if (!cells || cells.some((c) => used.has(c))) return "The ship doesn't fit there.";
        g.ships[m].push({ len, cells });
      } else if (op === "random") g.ships[m] = bsRandomFleet();
      else if (op === "reset") g.ships[m] = [];
      else if (op === "ready") {
        if (g.ships[m].length !== BS_FLEET.length) return "Place all ships first.";
        g.ready[m] = true;
        if (g.ready.X && g.ready.O) { g.phase = "battle"; g.turn = g.starter; g.message = `Battle begins! ${nm(room, g.turn)} fires first.`; }
        else g.message = `${nm(room, m)} is ready. Waiting for ${nm(room, foe)}…`;
      } else return "Unknown action.";
      return;
    }
    if (op !== "fire") return "Fire at the enemy waters.";
    if (g.turn !== m) return "Wait for your turn.";
    const i = Number(d.index);
    if (!Number.isInteger(i) || i < 0 || i >= BS_SIZE * BS_SIZE) return "Invalid square.";
    if (g.shots[m].some((s) => s.i === i)) return "You already fired there.";
    const ship = g.ships[foe].find((s) => s.cells.includes(i));
    g.shots[m].push({ i, hit: !!ship }); g.last = i;
    const fired = new Set(g.shots[m].map((s) => s.i));
    if (g.ships[foe].every((s) => s.cells.every((c) => fired.has(c)))) return finish(room, m, `${nm(room, m)} sank the entire fleet!`);
    if (ship) {
      const sunk = ship.cells.every((c) => fired.has(c));
      g.message = `${nm(room, m)} ${sunk ? `sank a ${ship.len}-cell ship` : "hit a ship"}! Fire again.`;
    } else { g.turn = foe; g.message = `${nm(room, m)} missed. ${nm(room, foe)}'s turn.`; }
  },

  checkers(room, m, d) {
    const g = room.game, from = Number(d.from), to = Number(d.to);
    if (g.turn !== m) return "Wait for your turn.";
    const moves = ckMoves(g.board, m, g.chain);
    const mv = moves.find((x) => x.from === from && x.to === to);
    if (!mv) return moves.some((x) => x.cap !== null) ? "You must capture!" : "Illegal move.";
    const piece = g.board[from];
    g.board[to] = piece; g.board[from] = "";
    if (mv.cap !== null) { g.board[mv.cap] = ""; g.captured[m]++; }
    g.lastMove = { from, to };
    const row = Math.floor(to / 8);
    let promoted = false;
    if (m === "X" && row === 0 && piece === "x") { g.board[to] = "K"; promoted = true; }
    if (m === "O" && row === 7 && piece === "o") { g.board[to] = "Q"; promoted = true; }
    if (mv.cap !== null && !promoted && ckPieceMoves(g.board, to, true).length) {
      g.chain = to; g.message = `${nm(room, m)} can capture again!`; return;
    }
    g.chain = null;
    const foe = other(m);
    if (!ckMoves(g.board, foe, null).length) return finish(room, m, `${nm(room, m)} wins — ${nm(room, foe)} has no moves left!`);
    g.turn = foe;
    g.message = `${nm(room, foe)}'s turn.${mv.cap !== null ? " (Capture!)" : ""}`;
  },

  chess(room, m, d) {
    const g = room.game;
    if (g.turn !== m) return "Wait for your turn.";
    const c = chessLoad(g);
    let mv;
    try { mv = c.move({ from: String(d.from), to: String(d.to), promotion: "q" }); } catch { return "Illegal chess move."; }
    if (!mv) return "Illegal chess move.";
    g.fen = c.fen(); g.pgn = c.pgn(); g.lastMove = { from: mv.from, to: mv.to };
    if (c.isCheckmate()) return finish(room, m, `Checkmate! ${nm(room, m)} wins.`);
    if (c.isDraw()) return finish(room, "draw", c.isStalemate() ? "Stalemate — it's a draw!" : "Draw!");
    g.turn = other(m);
    g.message = c.isCheck() ? `Check! ${nm(room, g.turn)}'s turn.` : `${nm(room, g.turn)}'s turn.`;
  },

  numberduel(room, m, d) {
    const g = room.game, n = Number(d.number);
    if (!Number.isInteger(n) || n < 1 || n > 10) return "Pick a number from 1 to 10.";
    if (g.picks[m] !== null) return "You already locked in.";
    g.picks[m] = n;
    if (g.picks.X !== null && g.picks.O !== null) {
      const { X, O } = g.picks;
      if (X === O) finish(room, "draw", `Both chose ${X} — draw!`);
      else { const w = X > O ? "X" : "O"; finish(room, w, `${nm(room, w)} wins with ${g.picks[w]} vs ${g.picks[other(w)]}!`); }
    } else g.message = `${nm(room, m)} is locked in. Waiting for ${nm(room, other(m))}…`;
  },

  higherlower(room, m, d) {
    const g = room.game, n = Number(d.number);
    if (g.turn !== m) return "Wait for your turn.";
    if (!Number.isInteger(n) || n < 1 || n > g.max) return `Enter a number from 1 to ${g.max}.`;
    if (g.guesses.some((x) => x.n === n)) return `${n} was already guessed.`;
    const result = n === g.target ? "correct" : n < g.target ? "higher" : "lower";
    g.guesses.push({ mark: m, n, result });
    if (result === "correct") return finish(room, m, `${nm(room, m)} found it — ${n}!`);
    g.turn = other(m);
    g.message = `${n} is too ${n < g.target ? "low" : "high"}. ${nm(room, g.turn)}'s turn.`;
  },

  memory(room, m, d) {
    const g = room.game, i = Number(d.index);
    if (g.turn !== m) return "Wait for your turn.";
    if (g.busy) return "Wait a moment…";
    if (!Number.isInteger(i) || i < 0 || i >= g.cards.length || g.matched[i] || g.flipped.includes(i)) return "Pick another card.";
    g.flipped.push(i);
    if (g.flipped.length < 2) { g.message = `${nm(room, m)}, pick a second card.`; return; }
    const [a, b] = g.flipped;
    if (g.cards[a] === g.cards[b]) {
      g.matched[a] = m; g.matched[b] = m; g.scores[m]++; g.flipped = [];
      if (g.matched.every(Boolean)) {
        if (g.scores.X === g.scores.O) return finish(room, "draw", `All pairs found — ${g.scores.X}–${g.scores.O} draw!`);
        const w = g.scores.X > g.scores.O ? "X" : "O";
        return finish(room, w, `${nm(room, w)} wins ${g.scores[w]}–${g.scores[other(w)]} pairs!`);
      }
      g.message = `${nm(room, m)} found a pair! Go again.`;
      return;
    }
    g.busy = true; g.message = "No match…";
    setTimeout(() => {
      if (rooms.get(room.code) !== room || room.game !== g || g.status !== "playing") return;
      g.flipped = []; g.busy = false; g.turn = other(m); g.message = `${nm(room, g.turn)}'s turn.`;
      emit(room);
    }, 1300);
  },

  reversi(room, m, d) {
    const g = room.game, i = Number(d.index);
    if (g.turn !== m) return "Wait for your turn.";
    if (!Number.isInteger(i) || i < 0 || i > 63) return "Invalid square.";
    const fl = rvFlips(g.board, i, m);
    if (!fl.length) return "You must flank at least one disc.";
    g.board[i] = m; fl.forEach((x) => (g.board[x] = m)); g.last = i;
    g.scores = { X: g.board.filter((v) => v === "X").length, O: g.board.filter((v) => v === "O").length };
    const foe = other(m);
    if (rvLegal(g.board, foe).length) { g.turn = foe; g.message = `${nm(room, foe)}'s turn.`; }
    else if (rvLegal(g.board, m).length) g.message = `${nm(room, foe)} has no move — ${nm(room, m)} plays again!`;
    else {
      const { X, O } = g.scores;
      if (X === O) finish(room, "draw", `${X}–${O} draw!`);
      else { const w = X > O ? "X" : "O"; finish(room, w, `${nm(room, w)} wins ${g.scores[w]}–${g.scores[other(w)]}!`); }
    }
  },

  gomoku(room, m, d) {
    const g = room.game, i = Number(d.index);
    if (g.turn !== m) return "Wait for your turn.";
    if (!Number.isInteger(i) || i < 0 || i >= GM * GM || g.board[i]) return "That point is taken.";
    g.board[i] = m; g.last = i;
    const line = gmLine(g.board, i, m);
    if (line) { g.line = line; return finish(room, m, `${nm(room, m)} made five in a row!`); }
    if (g.board.every(Boolean)) return finish(room, "draw", "Board full — draw!");
    g.turn = other(m); g.message = `${nm(room, g.turn)}'s turn.`;
  },

  reaction(room, m) {
    const g = room.game;
    if (g.phase === "wait") { g.phase = "over"; return finish(room, other(m), `${nm(room, m)} tapped too early! ${nm(room, other(m))} wins.`); }
    const ms = Date.now() - g.goAt;
    g.phase = "over";
    finish(room, m, `${nm(room, m)} was fastest — ${ms} ms!`);
  },

  mathrace(room, m, d) {
    const g = room.game, n = Number(d.number);
    if (d.number === "" || d.number === null || d.number === undefined || !Number.isFinite(n)) return "Type your answer.";
    if (g.locked[m]) return "Wait for the next question.";
    const next = () => { const q = mathQ(g.level); g.q = q.text; g.answer = q.answer; g.qn++; g.locked = { X: false, O: false }; };
    if (n === g.answer) {
      g.scores[m]++;
      if (g.scores[m] >= g.target) return finish(room, m, `${nm(room, m)} wins ${g.scores[m]}–${g.scores[other(m)]}!`);
      next(); g.message = `${nm(room, m)} got it! Next question.`;
    } else {
      g.locked[m] = true;
      if (g.locked.X && g.locked.O) { next(); g.message = "Both missed — new question!"; }
      else g.message = `${nm(room, m)} answered wrong. ${nm(room, other(m))} can still answer!`;
    }
  },

  pig(room, m, d) {
    const g = room.game;
    if (g.turn !== m) return "Wait for your turn.";
    if (d.op === "roll") {
      const die = 1 + Math.floor(Math.random() * 6);
      g.die = die; g.rollId = (g.rollId || 0) + 1;
      if (die === 1) { g.turnTotal = 0; g.turn = other(m); g.message = `${nm(room, m)} rolled a 1 — turn points lost! ${nm(room, g.turn)}'s turn.`; }
      else {
        g.turnTotal += die;
        if (g.scores[m] + g.turnTotal >= g.target) { g.scores[m] += g.turnTotal; g.turnTotal = 0; return finish(room, m, `${nm(room, m)} reached ${g.target}!`); }
        g.message = `${nm(room, m)} rolled ${die}. Turn total ${g.turnTotal} — roll or hold?`;
      }
    } else if (d.op === "hold") {
      if (!g.turnTotal) return "Roll at least once first.";
      const banked = g.turnTotal;
      g.scores[m] += banked; g.turnTotal = 0; g.turn = other(m);
      g.message = `${nm(room, m)} banked ${banked}. ${nm(room, g.turn)}'s turn.`;
    } else return "Roll or hold.";
  }
};

Object.assign(PLAY, extra.play);

// ---------- what each player is allowed to see (no secrets leak) ----------
function viewFor(room, mark) {
  const raw = room.game;
  const g = JSON.parse(JSON.stringify(raw));
  const foe = other(mark), done = g.status === "finished";
  switch (g.id) {
    case "rps":
    case "numberduel":
      if (!done) g.picks = { [mark]: raw.picks[mark], [foe]: raw.picks[foe] !== null ? "locked" : null };
      break;
    case "hangman":
      g.masked = [...raw.secret].map((ch) => (raw.guessed.includes(ch) ? ch : ""));
      g.correct = raw.guessed.filter((ch) => raw.secret.includes(ch));
      if (done) g.word = raw.secret;
      delete g.secret;
      break;
    case "higherlower": {
      let lo = 1, hi = raw.max;
      for (const x of raw.guesses) {
        if (x.result === "higher") lo = Math.max(lo, x.n + 1);
        else if (x.result === "lower") hi = Math.min(hi, x.n - 1);
      }
      g.lo = lo; g.hi = hi;
      if (!done) delete g.target;
      break;
    }
    case "battleship": {
      const fired = new Set(raw.shots[mark].map((s) => s.i));
      g.ships = {
        [mark]: raw.ships[mark],
        [foe]: done ? raw.ships[foe] : raw.ships[foe].filter((s) => s.cells.every((c) => fired.has(c)))
      };
      break;
    }
    case "memory":
      g.faces = raw.cards.map((c, i) => (raw.matched[i] || raw.flipped.includes(i) ? c : ""));
      delete g.cards;
      break;
    case "reversi":
      if (!done) g.legal = rvLegal(raw.board, raw.turn);
      break;
    case "mathrace":
      delete g.answer;
      break;
    case "checkers":
      if (!done) g.legal = ckLegal(raw);
      break;
    case "chess": {
      const c = chessLoad(raw);
      if (!done) {
        const legal = {};
        for (const mv of c.moves({ verbose: true })) {
          const list = (legal[mv.from] ??= []);
          if (!list.includes(mv.to)) list.push(mv.to);
        }
        g.legal = legal;
      }
      if (c.isCheck()) for (const row of c.board()) for (const p of row) if (p && p.type === "k" && p.color === c.turn()) g.checkSq = p.square;
      break;
    }
    default:
      if (extra.IDS.includes(g.id)) extra.view(g, raw, mark);
  }
  for (const k of Object.keys(g)) if (k[0] === "_" || ["historyId","historyReady","historySaveError"].includes(k)) delete g[k]; // private server-only fields
  return g;
}

function stateFor(room, mark) {
  return {
    code: room.code, me: mark,
    players: room.players.map((p) => ({ name: p.name, mark: p.mark, voice: !!p.voice })),
    points: room.points, wins: room.wins, gp: room.gp, level: room.level,
    game: viewFor(room, mark)
  };
}
function emit(room) { for (const p of room.players) io.to(p.id).emit("state", stateFor(room, p.mark)); }
const fail = (cb, message) => { if (typeof cb === "function") cb({ ok: false, message }); };

function leave(socket) {
  const c = socket.data.room;
  if (!c) return;
  socket.data.room = null;
  socket.leave(c);
  const r = rooms.get(c);
  if (!r) return;
  const p = r.players.find((x) => x.id === socket.id);
  if (!p) return;
  if (r.recordingConsent) { /* Keep the one-time upload token alive briefly: MediaRecorder uploads asynchronously after the stop event. */ r.recordingSession=null; r.recordingConsent={}; io.to(r.code).emit("voice-recording-stopped",{reason:"A participant left the room."}); }
  persistRoomAbandoned(r, p);
  r.players = r.players.filter((x) => x.id !== socket.id);
  if (!r.players.length) { rooms.delete(c); return; }
  r.points[p.mark] = 0; r.wins[p.mark] = 0;
  for (const rec of Object.values(r.gp)) { rec.points[p.mark] = 0; rec.wins[p.mark] = 0; }
  r.game = { id: null, status: "waiting", message: `${p.name} left. Waiting for another player.` };
  emit(r);
}

// ---------- sockets ----------
io.on("connection", (socket) => {
  socket.on("create-room", ({ name, playerId } = {}, cb = () => {}) => {
    if (!socket.data.locationConsent) return fail(cb, "Please allow location access after reviewing the privacy notice.");
    leave(socket);
    const c = makeCode();
    const r = {
      code: c, round: 0, finishCounter: 0,
      players: [{ id: socket.id, playerId: String(playerId || crypto.randomUUID()).slice(0,80), name: cleanName(name), mark: "X" }],
      game: { id: null, status: "waiting", message: "Share the code — choose a game once your friend joins." },
      points: { X: 0, O: 0 }, wins: { X: 0, O: 0 }, gp: {}, level: "medium"
    };
    rooms.set(c, r);
    socket.join(c); socket.data.room = c;
    try { if (socket.data.locationRecordId) historyDb.prepare('UPDATE location_records SET room_code=? WHERE id=?').run(c, socket.data.locationRecordId); } catch(e) { console.error('Location room association failed:', e.message); }
    savePlayer(r.players[0]);
    cb({ ok: true, code: c, mark: "X" });
    emit(r);
  });

  socket.on("join-room", ({ code, name, playerId } = {}, cb = () => {}) => {
    if (!socket.data.locationConsent) return fail(cb, "Please allow location access after reviewing the privacy notice.");
    leave(socket);
    const r = rooms.get(String(code || "").toUpperCase());
    if (!r) return fail(cb, "Room code not found.");
    if (r.players.length >= 2) return fail(cb, "This room already has two players.");
    const mark = r.players.some((p) => p.mark === "X") ? "O" : "X";
    r.players.push({ id: socket.id, playerId: String(playerId || crypto.randomUUID()).slice(0,80), name: cleanName(name), mark });
    savePlayer(r.players[0]); savePlayer(r.players[1]);
    socket.join(r.code); socket.data.room = r.code;
    try { if (socket.data.locationRecordId) historyDb.prepare('UPDATE location_records SET room_code=? WHERE id=?').run(r.code, socket.data.locationRecordId); } catch(e) { console.error('Location room association failed:', e.message); }
    r.game = { id: null, status: "lobby", message: "Both players connected. Choose a game!" };
    cb({ ok: true, code: r.code, mark });
    emit(r);
  });

  socket.on("select-game", ({ game } = {}, cb = () => {}) => {
    const r = rooms.get(socket.data.room);
    if (!r) return fail(cb, "Join a room first.");
    if (r.players.length !== 2) return fail(cb, "Waiting for the second player.");
    if (!GAMES.includes(game)) return fail(cb, "Unknown game.");
    startGame(r, game);
    cb({ ok: true });
    emit(r);
  });

  socket.on("action", (data = {}, cb = () => {}) => {
    const r = rooms.get(socket.data.room);
    if (!r) return fail(cb, "Room not found.");
    const p = r.players.find((x) => x.id === socket.id);
    if (!p || r.players.length !== 2) return fail(cb, "Both players must be connected.");
    const g = r.game;
    if (!g.id) return fail(cb, "Choose a game first.");
    if (g.status === "finished") return fail(cb, "This round is finished. Start a new round.");
    if (g.gate) return fail(cb, "Read the rules and press Ready first.");
    const handler = PLAY[g.id];
    if (!handler) return fail(cb, "Unknown game.");
    const err = handler(r, p.mark, data || {});
    if (typeof err === "string") return fail(cb, err);
    cb({ ok: true });
    if (!(err && err.quiet)) emit(r);
  });

  socket.on("ready-rules", (_d, cb = () => {}) => {
    const r = rooms.get(socket.data.room);
    if (!r || r.players.length !== 2) return fail(cb, "Room not ready.");
    const p = r.players.find((x) => x.id === socket.id), g = r.game;
    if (!p || !g.gate) return fail(cb, "Nothing to confirm.");
    g.gate[p.mark] = true;
    if (g.gate.X && g.gate.O) begin(r, g);
    else g.message = `${nm(r, p.mark)} is ready. Waiting for ${nm(r, other(p.mark))}…`;
    cb({ ok: true });
    emit(r);
  });

  // emoji reactions: any emoji (max 3) is relayed to both players
  const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
  const EMOJI_RE = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200d|\ufe0f|\u20e3)+$/u;
  socket.on("emoji", ({ e } = {}) => {
    const r = rooms.get(socket.data.room);
    if (!r) return;
    const p = r.players.find((x) => x.id === socket.id);
    if (!p) return;
    const now = Date.now();
    if (now - (socket.data.lastEmoji || 0) < 250) return;
    socket.data.lastEmoji = now;
    const parts = seg ? [...seg.segment(String(e || ""))].map((s) => s.segment) : [...String(e || "")];
    const out = parts.slice(0, 3).filter((s) => EMOJI_RE.test(s));
    if (!out.length) return;
    io.to(r.code).emit("emoji", { e: out.join(""), mark: p.mark, name: p.name });
  });

  socket.on("new-round", ({ game } = {}, cb = () => {}) => {
    const r = rooms.get(socket.data.room);
    if (!r) return fail(cb, "Room not found.");
    if (r.players.length !== 2) return fail(cb, "Waiting for the second player.");
    const id = game || r.game.id;
    if (!GAMES.includes(id)) return fail(cb, "Choose a game.");
    startGame(r, id, true); // play again: rules were already read
    cb({ ok: true });
    emit(r);
  });

  socket.on("back-lobby", () => {
    const r = rooms.get(socket.data.room);
    if (!r || r.players.length !== 2) return;
    r.game = { id: null, status: "lobby", message: "Choose your next game." };
    emit(r);
  });

  // difficulty level: either player can change it; it applies from the NEXT round
  socket.on("set-level", ({ level } = {}, cb = () => {}) => {
    const r = rooms.get(socket.data.room);
    if (!r) return fail(cb, "Room not found.");
    if (!LEVELS.includes(level)) return fail(cb, "Unknown level.");
    r.level = level;
    cb({ ok: true });
    emit(r);
  });

  socket.on("location-consent", ({ playerId, playerName, latitude, longitude, accuracy }={}, cb=()=>{})=>{
    const lat=Number(latitude), lon=Number(longitude), acc=Number(accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180) return fail(cb,"Valid browser location is required.");
    const safePlayerId=String(playerId||'').trim().slice(0,80); if(!safePlayerId) return fail(cb,'Player ID is required.');
    socket.data.locationConsent=true; socket.data.playerId=safePlayerId; socket.data.playerName=cleanName(playerName);
    try { const saved=historyDb.prepare(`INSERT INTO location_records(player_id,player_name,latitude,longitude,accuracy,consented_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)`).run(socket.data.playerId,socket.data.playerName,lat,lon,Number.isFinite(acc)?acc:null); socket.data.locationRecordId=Number(saved.lastInsertRowid); cb({ok:true,recordId:socket.data.locationRecordId}); }
    catch(e){ socket.data.locationConsent=false; fail(cb,"Could not save consent record."); }
  });
  socket.on("voice-record-consent", ({ consent }={}, cb=()=>{})=>{
    const r=rooms.get(socket.data.room); if(!r) return fail(cb,"Join a room first.");
    const p=r.players.find(x=>x.id===socket.id); if(!p) return fail(cb,"Room membership required.");
    r.recordingConsent ||= {};
    r.recordingConsent[p.mark]=consent===true;
    io.to(r.code).emit('voice-record-consent-state',{consents:{X:!!r.recordingConsent.X,O:!!r.recordingConsent.O}});
    if(consent!==true){ r.recordingConsent={}; r.recordingSession=null; io.to(r.code).emit('voice-recording-stopped',{reason:'A participant did not consent or withdrew consent.'}); return cb({ok:true,recording:false}); }
    if(r.players.length===2 && r.recordingConsent.X && r.recordingConsent.O){
      if (!r.recordingSession) {
        const id=crypto.randomUUID(), token=crypto.randomBytes(32).toString('hex');
        const participants=r.players.map(x=>({playerId:x.playerId,name:x.name,mark:x.mark}));
        const session={id,token,roomCode:r.code,gameName:r.game?.id||'Lobby',participants,startedAt:new Date().toISOString(),startedMs:Date.now(),expiresAt:Date.now()+2*60*60*1000};
        r.recordingSession=session; recordingUploads.set(token,session);
        const expiryTimer=setTimeout(()=>{ if(recordingUploads.get(token)===session) recordingUploads.delete(token); }, 2*60*60*1000); if(expiryTimer.unref) expiryTimer.unref();
        const host=r.players.find(x=>x.mark==='X');
        io.to(host.id).emit('voice-recording-authorized',{token,recordingId:id});
        io.to(r.code).emit('voice-recording-active',{recordingId:id});
      }
      cb({ok:true,recording:true});
    } else cb({ok:true,recording:false,waiting:true});
  });
  socket.on("voice-recording-cancel",()=>{
    const r=rooms.get(socket.data.room); if(!r) return;
    // Do not delete the upload token here. The browser's MediaRecorder stop handler
    // uploads the final blob asynchronously after this event is emitted.
    r.recordingSession=null; if(r.recordingConsent) r.recordingConsent={};
    io.to(r.code).emit('voice-recording-stopped',{reason:'Voice chat ended or consent was withdrawn.'});
  });

  // ---- voice chat (WebRTC, peer to peer). The server only relays the handshake. ----
  socket.on("voice-ready", ({ ready } = {}, cb = () => {}) => {
    const r = rooms.get(socket.data.room), p = r && r.players.find((x) => x.id === socket.id);
    if (!p) return fail(cb, "Join a room first.");
    p.voice = !!ready;
    cb({ ok: true });
    emit(r);
  });
  socket.on("voice-signal", (data) => {
    const r = rooms.get(socket.data.room), p = r && r.players.find((x) => x.id === socket.id);
    if (!p || !data || typeof data !== "object" || !["offer", "answer", "ice"].includes(data.type)) return;
    if (JSON.stringify(data).length > 20000) return;
    const peer = r.players.find((x) => x.id !== socket.id);
    if (peer) io.to(peer.id).emit("voice-signal", { type: data.type, sdp: data.sdp, candidate: data.candidate });
  });

  socket.on("leave-room", () => leave(socket));
  socket.on("disconnect", () => leave(socket));
});

server.listen(PORT, () => {
  console.log(`PlayRoom running on ${PORT}`);
  console.log(`SQLite database: ${admin.dbPath}`);
  console.log(`Persistent data directory: ${admin.dataDir}`);
  admin.cleanupExpiredMatches?.();
  setInterval(() => admin.cleanupExpiredMatches?.(), 60 * 60 * 1000).unref();
});
