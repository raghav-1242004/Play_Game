const socket = io(), $ = (id) => document.getElementById(id);
let room = null, mark = null, state = null, selected = null, horiz = true, toastTimer = null, lastFinish = 0, mathQn = 0;
const playerId = (() => { try { let id=localStorage.getItem("playroomPlayerId"); if(!id){id=crypto.randomUUID();localStorage.setItem("playroomPlayerId",id)} return id; } catch (_) { return "guest-"+Math.random().toString(36).slice(2); } })();

const BASE_CATALOG = [
  // id, emoji, title, description, tag, hue
  ["tictactoe", "❎", "Tic Tac Toe", "Classic 3 in a row", "QUICK", 45],
  ["rps", "✊", "Rock Paper Scissors", "Secret simultaneous duel", "QUICK", 330],
  ["connect4", "🔴", "Connect Four", "Drop discs, link four", "CLASSIC", 8],
  ["dotsboxes", "▦", "Dots & Boxes", "Claim the most squares", "CLASSIC", 165],
  ["hangman", "🔤", "Hangman", "Guess the hidden word", "WORDS", 280],
  ["battleship", "🚢", "Battleship", "Sink the enemy fleet", "STRATEGY", 205],
  ["checkers", "⚫", "Checkers", "Jump & capture to win", "STRATEGY", 25],
  ["chess", "♟️", "Chess", "Full classic chess rules", "STRATEGY", 255],
  ["numberduel", "🔢", "Number Duel", "Highest secret number wins", "QUICK", 130],
  ["higherlower", "🎯", "Number Guess", "Find the secret number", "BRAIN", 345],
  ["memory", "🧠", "Memory Match", "Flip cards, find pairs", "BRAIN", 190],
  ["reversi", "⚪", "Reversi (Othello)", "Flip your rival's discs", "STRATEGY", 150],
  ["gomoku", "⭕", "Five in a Row", "Get 5 in a line first", "CLASSIC", 35],
  ["reaction", "⚡", "Reaction Duel", "Tap when it turns green", "QUICK", 120],
  ["mathrace", "➗", "Math Battle", "Solve faster than your rival", "BRAIN", 215],
  ["pig", "🎲", "Pig Dice", "Roll, risk, bank points", "LUCK", 300]
];
const catalog = BASE_CATALOG.concat(EXTRA_CATALOG);

/* ---------- small helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const other = (m) => (m === "X" ? "O" : "X");
const nameOf = (m) => state?.players.find((p) => p.mark === m)?.name || (m === "X" ? "Player 1" : "Player 2");
const initial = (m) => (nameOf(m).trim()[0] || "?").toUpperCase();
const cls = (m) => (m === "X" ? "x" : "o");
const call = (ev, data) => new Promise((resolve) => socket.emit(ev, data || {}, resolve));
const act = (data) => socket.emit("action", data, (r) => { if (!r?.ok) toast(r?.message || "Move not accepted"); });

function toast(t) {
  $("toast").textContent = t;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2300);
}
function confetti() {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("confetti"), ctx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#ffc24b", "#ff5c8a", "#8b6cff", "#3ddc97", "#ffffff"];
  const ps = Array.from({ length: 150 }, () => ({
    x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5, r: 5 + Math.random() * 7,
    c: cols[(Math.random() * cols.length) | 0], vx: -2 + Math.random() * 4, vy: 2.5 + Math.random() * 4, a: Math.random() * 6, va: -0.25 + Math.random() * 0.5
  }));
  let t = 0;
  (function frame() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore();
    }
    if (++t < 220) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}

/* ---------- entering the room ---------- */
function enter(r, m) {
  room = r; mark = m;
  $("home").classList.add("hidden");
  $("lobby").classList.remove("hidden");
  $("roomCode").textContent = r;
  window.scrollTo(0, 0);
  $("emojiDock").classList.remove("hidden");
}

/* ---------- points / player cards ---------- */
function countUp(el, from, to) {
  let v = from;
  const step = Math.max(1, Math.ceil((to - from) / 12));
  const iv = setInterval(() => { v = Math.min(to, v + step); el.textContent = v; if (v >= to) clearInterval(iv); }, 45);
}
function showPoints(m, val, prevVal) {
  const el = $("pts" + m);
  if (prevVal !== undefined && val > prevVal) {
    countUp(el, prevVal, val);
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    const f = $("float" + m); f.textContent = "+" + (val - prevVal);
    f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
  } else el.textContent = val;
}
const zeroRec = () => ({ points: { X: 0, O: 0 }, wins: { X: 0, O: 0 }, draws: 0, rounds: 0 });
// points shown on the cards belong to the CURRENT game only; in the lobby they show the grand total
function recFor(st, gid) { return gid ? (st.gp && st.gp[gid]) || zeroRec() : { points: st.points, wins: st.wins }; }
function renderPlayers(s, prev) {
  const gid = s.game.id, cur = recFor(s, gid), old = prev && prev.game.id === gid ? recFor(prev, gid) : null;
  const gname = gid ? (catalog.find((x) => x[0] === gid) || [])[2] : null;
  for (const m of ["X", "O"]) {
    const p = s.players.find((x) => x.mark === m);
    $("name" + m).textContent = p ? p.name : "Waiting for friend…";
    $("av" + m).textContent = p ? (p.name.trim()[0] || "?").toUpperCase() : "?";
    $("lbl" + m).textContent = (m === "X" ? "PLAYER 1" : "PLAYER 2") + (s.me === m ? " · YOU" : "");
    $("wins" + m).textContent = cur.wins[m];
    $("ptl" + m).textContent = gname ? "pts · " + gname : "pts · all games";
    showPoints(m, cur.points[m], old ? old.points[m] : undefined);
    $("card" + m).classList.toggle("active", s.game.status === "playing" && s.game.turn === m);
    $("card" + m).classList.toggle("lead", cur.points[m] > 0 && cur.points[m] > cur.points[other(m)]);
  }
  renderBoard(s);
}
function renderBoard(s) {
  const rows = catalog.filter((c) => s.gp && s.gp[c[0]] && s.gp[c[0]].rounds).map((c) => ({ c, r: s.gp[c[0]] }));
  const nm = (m) => esc(nameOf(m));
  $("sbPanel").innerHTML = rows.length
    ? `<table><thead><tr><th>Game</th><th class="p1">${nm("X")}</th><th class="p2">${nm("O")}</th><th>Rounds</th></tr></thead><tbody>${rows.map(({ c, r }) => `<tr class="${s.game.id === c[0] ? "now" : ""}"><td>${c[1]} ${esc(c[2])}</td><td class="p1 ${r.points.X > r.points.O ? "top" : ""}"><b>${r.points.X}</b><small>🏆${r.wins.X}</small></td><td class="p2 ${r.points.O > r.points.X ? "top" : ""}"><b>${r.points.O}</b><small>🏆${r.wins.O}</small></td><td>${r.rounds}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Grand total</td><td class="p1"><b>${s.points.X}</b></td><td class="p2"><b>${s.points.O}</b></td><td></td></tr></tfoot></table>`
    : `<p class="hint">Abhi koi game complete nahi hua. Play a round and points will appear here, game by game.</p>`;
}

/* ---------- winner overlay ---------- */
function showResult(s) {
  const g = s.game, w = g.winner, iWon = w === s.me;
  const isPlayer = w === "X" || w === "O";
  const wname = isPlayer ? nameOf(w) : "";
  $("oTrophy").textContent = isPlayer ? "🏆" : w === "draw" ? "🤝" : "😮";
  $("oKicker").textContent = isPlayer ? (iWon ? "VICTORY!" : "WELL PLAYED") : w === "draw" ? "DRAW" : "NO WINNER";
  $("oName").textContent = isPlayer ? (iWon ? `${wname} wins!` : `${wname} wins!`) : w === "draw" ? "It's a draw" : "No winner";
  $("oMsg").textContent = g.message || "";
  $("oAward").textContent = isPlayer ? `+${g.award[w]} points for ${wname}` : w === "draw" ? `+${g.award.X} points each` : "No points this round";
  const rec = recFor(s, g.id);
  $("oScores").innerHTML = ["X", "O"].map((m) => `<div class="ws ${m === "X" ? "p1" : "p2"} ${w === m ? "won" : ""}"><small>${esc(nameOf(m))}</small><b>${rec.points[m]}</b><em>${g.award && g.award[m] ? "+" + g.award[m] : ""}</em></div>`).join("");
  $("overlay").classList.remove("hidden");
  if (isPlayer) { if (iWon) Snd.win(); else Snd.lose(); Speech.winner(wname); if (iWon) confetti(); } else { Snd.draw(); if (w === "draw") Speech.say("It is a draw!", 650); }
}

/* ---------- main render ---------- */
function render(s) {
  const prev = state;
  state = s; mark = s.me;
  if (!room) return;
  if (prev && s.game.status === "playing" && s.game.turn === mark && prev.game.turn !== mark && !s.game.gate && prev.game.id === s.game.id) Snd.ping();
  $("roomCode").textContent = s.code;
  renderPlayers(s, prev);
  renderLevel(s); Voice.sync();

  const g = s.game;
  $("choose").classList.toggle("hidden", !!g.id);
  $("play").classList.toggle("hidden", !g.id);
  if (!g.id) { $("overlay").classList.add("hidden"); selected = null; rtStop(); $("gameArea").dataset.key = ""; return; }
  if (!prev || prev.game.id !== g.id || g.turn !== mark) selected = null;
  if (g.status === "finished" && g.finishId && g.finishId !== lastFinish) { lastFinish = g.finishId; showResult(s); }
  if (g.status === "playing") $("overlay").classList.add("hidden");

  const meta = catalog.find((x) => x[0] === g.id);
  const lvMeta = LEVELS.find((l) => l[0] === g.level);
  $("gameTitle").textContent = (meta ? `${meta[1]} ${meta[2]}` : "Game") + (LEVEL_INFO[g.id] && lvMeta ? `  ·  ${lvMeta[1]} ${lvMeta[2]}` : "");
  $("endActions").classList.toggle("hidden", g.status !== "finished");
  renderTurnBar(g);
  draw(g);
  if (g.id === "higherlower" && g.turn === mark) setTimeout(() => $("guessNum")?.focus(), 50);
}
function renderTurnBar(g) {
  const bar = $("turnBar");
  const usesTurn = g.turn && !g.gate && !(g.id === "battleship" && g.phase === "place");
  let label = "", cl = "wait";
  if (g.gate) { cl = "wait"; label = "📖 Read the rules"; }
  else if (g.status === "finished") { cl = "done"; label = "Round over"; }
  else if (usesTurn) { if (g.turn === mark) { cl = "mine"; label = "🟢 Your turn"; } else label = `⏳ ${nameOf(g.turn)}'s turn`; }
  else label = "🎮 Game on";
  bar.className = "turnbar " + cl;
  bar.innerHTML = `<b>${esc(label)}</b><span>${esc(g.message || "")}</span>`;
}

/* ---------- drawing games ---------- */
function draw(g) {
  const my = g.status === "playing" && g.turn === mark, area = $("gameArea");
  const map = { tictactoe: drawTTT, rps: drawRPS, connect4: drawC4, dotsboxes: drawDots, hangman: drawHang, battleship: drawBS, checkers: drawCheckers, chess: drawChess, numberduel: drawNum, higherlower: drawHL, memory: drawMemory, reversi: drawReversi, gomoku: drawGomoku, reaction: drawReaction, mathrace: drawMath, pig: drawPig, ...DRAW2 };
  if (g.gate) { rtStop(); area.dataset.key = ""; area.innerHTML = drawRules(g); return; }
  const rt = RT2[g.id];
  if (rt) { // real-time games keep one persistent canvas per round
    const key = g.id + ":" + g.rid;
    if (area.dataset.key !== key) { rtStop(); area.innerHTML = rt.build(g); area.dataset.key = key; if (rt.init) rt.init(g); }
    rt.paint(g);
    return;
  }
  rtStop(); area.dataset.key = "";
  const ae = document.activeElement, keep = ae && ae.dataset && ae.dataset.keep !== undefined && area.contains(ae) ? { id: ae.id, value: ae.value, qn: g.qn } : null;
  const keepMath = g.id === "mathrace" && g.qn === mathQn ? $("mathAns")?.value : "";
  area.innerHTML = map[g.id](g, my);
  if (keep && keep.qn === g.qn) { const el = $(keep.id); if (el && !el.disabled) { el.value = keep.value; el.focus(); } }
  if (g.id === "mathrace") { mathQn = g.qn; const el = $("mathAns"); if (el && !el.disabled) { el.value = keepMath || ""; el.focus(); } }
  if (POST2[g.id]) POST2[g.id](g, my);
}

function drawTTT(g, my) {
  return `<div class="grid3">${g.board.map((v, i) =>
    `<button class="tile ${v ? cls(v) : ""} ${g.last === i ? "new" : ""} ${g.line?.includes(i) ? "win" : ""}" data-i="${i}" ${v || !my ? "disabled" : ""}>${v}</button>`).join("")}</div>`;
}

function drawRPS(g) {
  const fin = g.status === "finished", opts = [["rock", "✊", "Rock"], ["paper", "✋", "Paper"], ["scissors", "✌️", "Scissors"]];
  const me = g.picks[mark];
  let h = `<div class="rps">${opts.map(([v, e, l]) => `<button class="rps-card ${me === v ? "picked" : ""}" data-choice="${v}" ${me || fin ? "disabled" : ""}><span>${e}</span><b>${l}</b></button>`).join("")}</div>`;
  if (fin) {
    const emo = Object.fromEntries(opts.map((o) => [o[0], o[1]]));
    h += `<div class="reveal">${["X", "O"].map((m, k) => `${k ? "<i>VS</i>" : ""}<div class="rv ${m === "X" ? "p1" : "p2"} ${g.winner === m ? "won" : ""}"><small>${esc(nameOf(m))}</small><span>${emo[g.picks[m]]}</span></div>`).join("")}</div>`;
  } else h += `<p class="hint">${me ? "Locked in ✔ — waiting for your friend…" : "Choose your move. It stays hidden until both players pick."}</p>`;
  return h;
}

function drawC4(g, my) {
  return `<div class="connect">${g.board.map((v, i) =>
    `<button class="disc ${v ? cls(v) : ""} ${g.last === i ? "drop" : ""} ${g.line?.includes(i) ? "win" : ""}" data-col="${i % 7}" ${!my ? "disabled" : ""} aria-label="Column ${(i % 7) + 1}"></button>`).join("")}</div>
    <div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}</span><span class="chip-o">● ${esc(nameOf("O"))}</span></div>`;
}

function drawDots(g, my) {
  const line = (t, idx, o) => `<button class="ln ${t} ${o ? "on " + cls(o) : ""} ${g.last && g.last.type === t && g.last.index === idx ? "last" : ""}" data-line="${t}" data-idx="${idx}" ${o || !my ? "disabled" : ""} aria-label="line"></button>`;
  let out = '<div class="dots">';
  for (let r = 0; r < 11; r++) for (let c = 0; c < 11; c++) {
    const re = r % 2 === 0, ce = c % 2 === 0;
    if (re && ce) out += '<i class="dot"></i>';
    else if (re) { const idx = (r / 2) * 5 + (c - 1) / 2; out += line("h", idx, g.h[idx]); }
    else if (ce) { const idx = ((r - 1) / 2) * 6 + c / 2; out += line("v", idx, g.v[idx]); }
    else { const idx = ((r - 1) / 2) * 5 + (c - 1) / 2, o = g.boxes[idx]; out += `<div class="box ${o ? cls(o) : ""}">${o ? esc(initial(o)) : ""}</div>`; }
  }
  return out + `</div><div class="sub-info"><span class="chip-x">■ ${esc(nameOf("X"))}: <b>${g.scores.X}</b></span><span class="chip-o">■ ${esc(nameOf("O"))}: <b>${g.scores.O}</b></span><span>Complete a box → play again</span></div>`;
}

function hangSVG(n) {
  const parts = ['<circle cx="80" cy="38" r="10"/>', '<line x1="80" y1="48" x2="80" y2="85"/>', '<line x1="80" y1="56" x2="64" y2="72"/>', '<line x1="80" y1="56" x2="96" y2="72"/>', '<line x1="80" y1="85" x2="66" y2="110"/>', '<line x1="80" y1="85" x2="94" y2="110"/>'];
  return `<svg class="hang" viewBox="0 0 120 140" fill="none" stroke-width="4" stroke-linecap="round"><g stroke="currentColor"><line x1="10" y1="130" x2="110" y2="130"/><line x1="30" y1="130" x2="30" y2="10"/><line x1="30" y1="10" x2="80" y2="10"/><line x1="80" y1="10" x2="80" y2="28"/></g>${parts.map((p, i) => p.replace("/>", ` class="part ${i < n ? "show" : ""}"/>`)).join("")}</svg>`;
}
function drawHang(g, my) {
  const fin = g.status === "finished";
  const letters = fin && g.word ? [...g.word].map((ch) => ({ ch, miss: !g.guessed.includes(ch) })) : g.masked.map((ch) => ({ ch, miss: false }));
  const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => {
    const used = g.guessed.includes(ch), good = g.correct.includes(ch);
    return `<button class="key ${used ? (good ? "good" : "bad") : ""}" data-letter="${ch}" ${used || !my ? "disabled" : ""}>${ch}</button>`;
  }).join("");
  return `<div style="text-align:center"><span class="cat">CATEGORY · ${esc(g.hint)}</span></div>
    <div class="hang-top">${hangSVG(g.mistakes)}<div class="hang-word">${letters.map((l) => `<span class="lt ${l.miss ? "miss" : ""}">${l.ch}</span>`).join("")}</div></div>
    <p class="hint">Mistakes: <b>${g.mistakes}/${g.maxMistakes}</b> · A correct letter lets you guess again</p><div class="keys">${keys}</div>`;
}

function drawBS(g, my) {
  const foe = other(mark), size = g.size, fleet = g.fleet;
  const mine = g.ships[mark] || [], myCells = new Set(mine.flatMap((s) => s.cells));
  const cells = (fn) => Array.from({ length: size * size }, (_, i) => fn(i)).join("");

  if (g.phase === "place") {
    const ready = g.ready[mark];
    const grid = cells((i) => `<button class="${myCells.has(i) ? "ship" : ""}" data-bs="place" data-i="${i}" ${ready || mine.length >= fleet.length ? "disabled" : ""}></button>`);
    const tray = fleet.map((len, k) => `<span class="${k < mine.length ? "done" : k === mine.length ? "next" : ""}">${"<i></i>".repeat(len)}</span>`).join("");
    const tools = ready ? "" : `<div class="bs-tools">
      <button class="secondary" data-bs="rotate">↻ ${horiz ? "Horizontal" : "Vertical"}</button>
      <button class="secondary" data-bs="random">🎲 Random</button>
      <button class="quiet" data-bs="reset">Reset</button>
      <button class="primary" data-bs="ready" ${mine.length === fleet.length ? "" : "disabled style='opacity:.4'"}>✔ Ready</button></div>`;
    return `<div class="tray">${tray}</div>${tools}<div class="sea">${grid}</div>
      <p class="hint">${ready ? `You're ready ✔ — waiting for ${esc(nameOf(foe))}…` : mine.length < fleet.length ? `Tap a square to place the <b>${fleet[mine.length]}-cell</b> ship (${horiz ? "left → right" : "top → bottom"}). Or press Random.` : "Fleet placed. Press Ready!"}</p>`;
  }

  const myShots = new Map(g.shots[mark].map((s) => [s.i, s.hit]));
  const foeShots = new Map(g.shots[foe].map((s) => [s.i, s.hit]));
  const sunkCells = new Set((g.ships[foe] || []).flatMap((s) => s.cells));
  const enemy = cells((i) => {
    const shot = myShots.has(i), hit = myShots.get(i);
    const c = sunkCells.has(i) ? "sunk" : shot ? (hit ? "hit" : "miss") : "";
    return `<button class="${c} ${g.last === i && g.turn !== mark ? "last" : ""}" data-bs="fire" data-i="${i}" ${shot || !my ? "disabled" : ""}>${hit ? "✕" : ""}</button>`;
  });
  const own = cells((i) => {
    const shot = foeShots.has(i), hit = foeShots.get(i);
    return `<button class="${hit ? "hit" : myCells.has(i) ? "ship" : shot ? "miss" : ""}" disabled>${hit ? "✕" : ""}</button>`;
  });
  const total = fleet.reduce((a, b) => a + b, 0), mh = g.shots[mark].filter((s) => s.hit).length, fh = g.shots[foe].filter((s) => s.hit).length;
  return `<div class="fleets"><div class="fleet"><h4>🎯 ENEMY WATERS ${my ? "— FIRE!" : ""}</h4><div class="sea">${enemy}</div></div>
    <div class="fleet"><h4>🚢 YOUR FLEET</h4><div class="sea">${own}</div></div></div>
    <div class="sub-info"><span class="chip-x">Your hits: <b>${mh}/${total}</b></span><span class="chip-o">Enemy hits: <b>${fh}/${total}</b></span><span>A hit = fire again</span></div>`;
}

function drawCheckers(g, my) {
  const flip = mark === "O", legal = g.legal || {};
  if (my && g.chain !== null && g.chain !== undefined) selected = g.chain;
  const dests = selected !== null && my ? legal[selected] || [] : [];
  let sq = "";
  for (let d = 0; d < 64; d++) {
    const i = flip ? 63 - d : d, v = g.board[i], owner = v === "x" || v === "K" ? "x" : v ? "o" : "", king = v === "K" || v === "Q";
    const dark = (Math.floor(i / 8) + (i % 8)) % 2;
    sq += `<button class="square ${dark ? "dark" : ""} ${selected === i ? "sel" : ""} ${dests.includes(i) ? "dest" : ""} ${g.lastMove && (g.lastMove.from === i || g.lastMove.to === i) ? "lm" : ""}" data-square="${i}">${v ? `<span class="pc ${owner} ${king ? "king" : ""}">${king ? "♛" : ""}</span>` : ""}</button>`;
  }
  return `<div class="board8">${sq}</div><div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))} captured <b>${g.captured.X}</b></span><span class="chip-o">● ${esc(nameOf("O"))} captured <b>${g.captured.O}</b></span></div>
    <p class="hint">Tap a piece, then a highlighted square. Captures are compulsory · reach the far side to become a king ♛</p>`;
}

const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟\uFE0E" };
function drawChess(g, my) {
  const flip = mark === "O", legal = g.legal || {};
  const rows = g.fen.split(" ")[0].split("/"), cells = [];
  rows.forEach((row, r) => { let c = 0; for (const ch of row) { if (/[1-8]/.test(ch)) { for (let n = 0; n < +ch; n++, c++) cells.push({ r, c, p: "" }); } else { cells.push({ r, c, p: ch }); c++; } } });
  if (flip) cells.reverse();
  const dests = selected && my ? legal[selected] || [] : [];
  const html = cells.map(({ r, c, p }) => {
    const sqn = String.fromCharCode(97 + c) + (8 - r), white = p && p === p.toUpperCase();
    return `<button class="square ${(r + c) % 2 ? "dark" : ""} ${selected === sqn ? "sel" : ""} ${dests.includes(sqn) ? "dest" : ""} ${p && dests.includes(sqn) ? "occ" : ""} ${g.lastMove && (g.lastMove.from === sqn || g.lastMove.to === sqn) ? "lm" : ""} ${g.checkSq === sqn ? "chk" : ""}" data-chess="${sqn}">${p ? `<span class="cp ${white ? "w" : "b"}">${GLYPH[p.toLowerCase()]}</span>` : ""}</button>`;
  }).join("");
  return `<div class="board8">${html}</div><div class="sub-info"><span class="chip-x">♔ White: <b>${esc(nameOf("X"))}</b></span><span class="chip-o">♚ Black: <b>${esc(nameOf("O"))}</b></span></div>
    <p class="hint">Tap a piece to see its legal moves · pawns auto-promote to a queen</p>`;
}

function drawNum(g) {
  const fin = g.status === "finished", me = g.picks[mark];
  let h = `<div class="numgrid">${Array.from({ length: 10 }, (_, i) => `<button class="num ${me === i + 1 ? "picked" : ""}" data-num="${i + 1}" ${me !== null || fin ? "disabled" : ""}>${i + 1}</button>`).join("")}</div>`;
  if (fin) h += `<div class="reveal">${["X", "O"].map((m, k) => `${k ? "<i>VS</i>" : ""}<div class="rv ${m === "X" ? "p1" : "p2"} ${g.winner === m ? "won" : ""}"><small>${esc(nameOf(m))}</small><span>${g.picks[m]}</span></div>`).join("")}</div>`;
  else h += `<p class="hint">${me !== null ? "Locked in ✔ — waiting for your friend…" : "Pick a secret number from 1 to 10. The higher number wins!"}</p>`;
  return h;
}

function drawHL(g, my) {
  const fin = g.status === "finished", lo = g.lo, hi = g.hi;
  const left = ((lo - 1) / g.max) * 100, width = ((hi - lo + 1) / g.max) * 100;
  const chips = g.guesses.slice(-10).map((x) => `<span class="gchip ${x.mark === "X" ? "p1" : "p2"}">${esc(nameOf(x.mark))}: ${x.n}<em>${x.result === "higher" ? "↑ higher" : x.result === "lower" ? "↓ lower" : "✔ correct"}</em></span>`).join("");
  return `<div class="range"><b>${lo}</b><div class="bar"><i style="left:${left}%;width:${width}%"></i></div><b>${hi}</b></div>
    ${fin ? `<p class="status" style="text-align:center;font-size:20px;font-weight:700;margin:6px 0 14px">The number was <span style="color:var(--p1)">${g.target}</span> 🎯</p>` : ""}
    <div class="guessbox"><div class="inline"><input id="guessNum" type="number" inputmode="numeric" min="${lo}" max="${hi}" placeholder="${lo}–${hi}" ${my ? "" : "disabled"}><button id="guessBtn" class="primary" ${my ? "" : "disabled style='opacity:.45'"}>Guess</button></div></div>
    <div class="chips">${chips || '<span class="hint">No guesses yet — the secret number is between 1 and ${g.max}.</span>'}</div>`;
}

/* ---------- newer games ---------- */
function drawMemory(g, my) {
  return `<div class="memgrid">${g.faces.map((f, i) => {
    const m = g.matched[i], open = !!f;
    return `<button class="mem ${open ? "open" : ""} ${m ? "got " + cls(m) : ""}" data-mem="${i}" ${!my || g.busy || open ? "disabled" : ""}><span class="back">?</span><span class="face">${f}</span></button>`;
  }).join("")}</div>
  <div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}: <b>${g.scores.X}</b> pairs</span><span class="chip-o">● ${esc(nameOf("O"))}: <b>${g.scores.O}</b> pairs</span><span>Match = go again</span></div>`;
}

function drawReversi(g, my) {
  const legal = new Set(my ? g.legal || [] : []);
  return `<div class="rv8">${g.board.map((v, i) => `<button class="rvc ${legal.has(i) ? "legal" : ""} ${g.last === i ? "last" : ""}" data-rv="${i}" ${legal.has(i) ? "" : "disabled"}>${v ? `<span class="disc2 ${cls(v)}"></span>` : ""}</button>`).join("")}</div>
  <div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}: <b>${g.scores.X}</b></span><span class="chip-o">● ${esc(nameOf("O"))}: <b>${g.scores.O}</b></span></div>
  <p class="hint">Tap a glowing square to flank and flip your rival's discs. Most discs wins.</p>`;
}

function drawGomoku(g, my) {
  return `<div class="gomo" style="--n:${g.size}">${g.board.map((v, i) => `<button class="gp ${g.line?.includes(i) ? "win" : ""} ${g.last === i ? "last" : ""}" data-gm="${i}" ${v || !my ? "disabled" : ""} aria-label="point">${v ? `<span class="stone ${cls(v)}"></span>` : ""}</button>`).join("")}</div>
  <div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}</span><span class="chip-o">● ${esc(nameOf("O"))}</span><span>First to make <b>5 in a row</b> wins</span></div>`;
}

function drawReaction(g) {
  const fin = g.status === "finished", go = g.phase === "go";
  return `<button class="react ${fin ? "over" : go ? "go" : "wait"}" data-react="1" ${fin ? "disabled" : ""}><div><b>${fin ? "Round over" : go ? "TAP NOW!" : "WAIT…"}</b><small>${fin ? esc(g.message || "") : go ? "Be the fastest!" : "Wait for green. Tapping early loses!"}</small></div></button>`;
}

function drawMath(g) {
  const fin = g.status === "finished", locked = g.locked[mark] || fin;
  return `<div class="mathq"><small>QUESTION ${g.qn} · FIRST TO ${g.target}</small><b>${esc(g.q)}</b></div>
  <div class="guessbox"><div class="inline"><input id="mathAns" type="number" inputmode="numeric" placeholder="Your answer" ${locked ? "disabled" : ""}><button id="mathBtn" class="primary" ${locked ? "disabled style='opacity:.45'" : ""}>Go</button></div></div>
  <p class="hint">${fin ? "" : g.locked[mark] ? "Wrong answer — wait for the next question." : "Be fast! A wrong answer locks you out of this question."}</p>
  <div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}: <b>${g.scores.X}</b></span><span class="chip-o">● ${esc(nameOf("O"))}: <b>${g.scores.O}</b></span></div>`;
}

function drawPig(g, my) {
  const faces = ["🎲", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return `<div class="pigtop"><div class="die ${g.die === 1 ? "one" : ""}" data-roll="${g.rollId || 0}">${faces[g.die || 0]}</div><div class="turntotal"><small>TURN TOTAL</small><b>${g.turnTotal}</b></div></div>
  <div class="pigbars">${["X", "O"].map((m) => `<div class="pb ${m === "X" ? "p1" : "p2"}"><span>${esc(nameOf(m))}</span><div class="bar"><i style="width:${Math.min(100, (g.scores[m] / g.target) * 100)}%"></i></div><b>${g.scores[m]}/${g.target}</b></div>`).join("")}</div>
  <div class="bs-tools"><button class="primary" data-pig="roll" ${my ? "" : "disabled style='opacity:.45'"}>🎲 Roll</button><button class="secondary" data-pig="hold" ${my && g.turnTotal ? "" : "disabled style='opacity:.45'"}>✋ Hold${g.turnTotal ? " & bank " + g.turnTotal : ""}</button></div>
  <p class="hint">Keep rolling to build your turn total — but roll a 1 and you lose it all. Hold to bank it. First to ${g.target} wins.</p>`;
}

/* ---------- events ---------- */
let curCat = "all";
function renderGames() {
  const ids = (CATS.find((c) => c[0] === curCat) || [])[2];
  $("cats").innerHTML = CATS.map(([k, label, list]) => `<button class="cat ${k === curCat ? "on" : ""}" data-cat="${k}">${label}${list ? ` <em>${list.length}</em>` : ` <em>${catalog.length}</em>`}</button>`).join("");
  $("games").innerHTML = catalog.filter((c) => !ids || ids.includes(c[0])).map(([id, emoji, title, desc, tag, hue]) =>
    `<button class="game-card" style="--h:${hue}" data-game="${id}"><span class="tag">${tag}</span>${LEVEL_INFO[id] ? '<span class="lvb" title="Easy / Medium / Hard available">🎚️ LEVELS</span>' : ""}<span class="emoji">${emoji}</span><strong>${title}</strong><small>${desc}</small></button>`).join("");
}
$("cats").onclick = (e) => { const b = e.target.closest("[data-cat]"); if (b) { curCat = b.dataset.cat; renderGames(); } };
renderGames();

async function ensureLocationConsent(){
  if(!navigator.geolocation){ $("error").textContent="This browser does not support location permission."; return false; }
  const accepted=window.confirm("PLAYROOM LOCATION NOTICE\n\nTo enter multiplayer rooms, PlayRoom requests your device location. Your coordinates and player details are stored securely for up to two calendar days and visible only to authorized administrators for platform safety. You can decline, but multiplayer access will remain unavailable. Continue?");
  if(!accepted){ $("error").textContent="Location permission is required by this platform policy. You can review the notice and try again when ready."; return false; }
  try {
    const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:60000}));
    const result=await call("location-consent",{playerId,playerName:$("name").value,latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy});
    if(!result.ok) throw new Error(result.message||"Location consent could not be saved.");
    return true;
  } catch(e){ $("error").textContent=e.code===1?"Location permission denied. Enable it in browser site settings to enter multiplayer rooms.":(e.message||"Could not obtain location. Please retry."); return false; }
}
$("create").onclick = async () => { if(!(await ensureLocationConsent())) return; const r = await call("create-room", { name: $("name").value, playerId }); if (r.ok) enter(r.code, r.mark); else $("error").textContent = r.message; };
$("showJoin").onclick = () => $("joinBox").classList.toggle("hidden");
$("join").onclick = async () => { if(!(await ensureLocationConsent())) return; const r = await call("join-room", { code: $("code").value.trim().toUpperCase(), name: $("name").value, playerId }); if (r.ok) enter(r.code, r.mark); else $("error").textContent = r.message; };
$("code").oninput = (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
$("games").onclick = async (e) => { const b = e.target.closest("[data-game]"); if (!b) return; const r = await call("select-game", { game: b.dataset.game }); if (!r.ok) toast(r.message); };
$("gameArea").onkeydown = (e) => {
  if (e.key === "Enter" && e.target.id === "guessNum") $("guessBtn")?.click();
  if (e.key === "Enter" && e.target.id === "mathAns") submitMath();
};
function submitMath() {
  const el = $("mathAns"); if (!el || el.value === "") return toast("Type your answer first");
  const v = Number(el.value); el.value = ""; act({ number: v });
}

$("gameArea").onclick = (e) => {
  const t = e.target.closest("button"); if (!t || !state) return;
  Snd.tick();
  const g = state.game, d = t.dataset;
  if (click2(t, d, g)) return;
  if (d.i !== undefined && !d.bs) act({ index: +d.i });
  if (d.choice) act({ choice: d.choice });
  if (d.col !== undefined) act({ col: +d.col });
  if (d.line) act({ type: d.line, index: +d.idx });
  if (d.letter) act({ letter: d.letter });
  if (d.num) act({ number: +d.num });
  if (t.id === "guessBtn") act({ number: Number($("guessNum").value) });

  if (d.mem !== undefined) act({ index: +d.mem });
  if (d.rv !== undefined) act({ index: +d.rv });
  if (d.gm !== undefined) act({ index: +d.gm });
  if (d.react) act({});
  if (d.pig) act({ op: d.pig });
  if (t.id === "mathBtn") submitMath();

  if (d.bs === "place") act({ op: "place", index: +d.i, horiz });
  if (d.bs === "fire") act({ op: "fire", index: +d.i });
  if (d.bs === "rotate") { horiz = !horiz; draw(g); }
  if (d.bs === "random" || d.bs === "reset" || d.bs === "ready") act({ op: d.bs });

  if (d.square !== undefined) pickSquare(+d.square, g, (from, to) => act({ from, to }));
  if (d.chess) pickSquare(d.chess, g, (from, to) => act({ from, to }));
};
function pickSquare(sq, g, move) {
  const legal = g.legal || {}, mine = g.turn === mark;
  if (mine && selected !== null && (legal[selected] || []).includes(sq)) { const from = selected; selected = null; move(from, sq); return; }
  if (mine && legal[sq]) selected = sq; else selected = null;
  draw(g);
}

$("copy").onclick = async () => { try { await navigator.clipboard.writeText(room); toast("Room code copied!"); } catch { toast("Room code: " + room); } };
$("leave").onclick = () => { socket.emit("leave-room"); location.reload(); };
$("back").onclick = () => { socket.emit("back-lobby"); selected = null; };
$("menu").onclick = () => { socket.emit("back-lobby"); selected = null; };
$("again").onclick = () => { socket.emit("new-round", { game: state.game.id }, (r) => { if (!r.ok) toast(r.message); }); selected = null; };
$("oAgain").onclick = () => { $("overlay").classList.add("hidden"); $("again").click(); };
$("oMenu").onclick = () => { $("overlay").classList.add("hidden"); $("menu").click(); };
$("oClose").onclick = () => $("overlay").classList.add("hidden");

socket.on("state", render);

/* ---------- sound: effects (WebAudio, no files) + voice, both with on/off speaker buttons ---------- */
const Snd = {
  fx: true, voice: true, ctx: null,
  load() { try { const v = JSON.parse(localStorage.getItem("playroomSnd") || "{}"); if (v.fx === false) this.fx = false; if (v.voice === false) this.voice = false; } catch (_) { /* storage blocked */ } },
  save() { try { localStorage.setItem("playroomSnd", JSON.stringify({ fx: this.fx, voice: this.voice })); } catch (_) { /* ignore */ } },
  tone(f, d = 0.12, type = "sine", vol = 0.12, delay = 0) {
    if (!this.fx) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
      const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (_) { /* audio unavailable */ }
  },
  tick() { this.tone(660, 0.05, "triangle", 0.06); },
  ping() { this.tone(880, 0.12, "sine", 0.12); this.tone(1175, 0.16, "sine", 0.1, 0.1); },
  pop() { this.tone(520, 0.08, "square", 0.05); this.tone(780, 0.1, "square", 0.05, 0.06); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.14, i * 0.11)); },
  lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.28, "sawtooth", 0.07, i * 0.17)); },
  draw() { this.tone(440, 0.2, "triangle", 0.1); this.tone(440, 0.2, "triangle", 0.1, 0.25); },
  dice() { [300, 420, 360, 520, 460].forEach((f, i) => this.tone(f, 0.05, "square", 0.04, i * 0.05)); },
  up() { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.12, i * 0.08)); },
  down() { [600, 520, 440, 360, 280, 200].forEach((f, i) => this.tone(f, 0.1, "sawtooth", 0.07, i * 0.07)); },
  paint() {
    $("sndBtn").textContent = this.fx ? "🔊" : "🔇"; $("sndBtn").classList.toggle("off", !this.fx);
    $("voiceBtn").textContent = this.voice ? "🗣️" : "🤐"; $("voiceBtn").classList.toggle("off", !this.voice);
  }
};
Snd.load(); Snd.paint();
$("sndBtn").onclick = () => { Snd.fx = !Snd.fx; Snd.save(); Snd.paint(); if (Snd.fx) Snd.ping(); toast(Snd.fx ? "🔊 Sound ON" : "🔇 Sound OFF"); };
$("voiceBtn").onclick = () => { Snd.voice = !Snd.voice; Snd.save(); Snd.paint(); if (!Snd.voice && "speechSynthesis" in window) speechSynthesis.cancel(); toast(Snd.voice ? "🗣️ Voice ON" : "🤐 Voice OFF"); };

/* ---------- emoji reactions: send any emoji, both players see it float up ---------- */
const EMOJIS = ["😀", "😂", "🤣", "😍", "😎", "🥳", "😜", "🤔", "😱", "😭", "😡", "🤝", "👏", "👍", "👎", "🔥", "💯", "🎉", "🏆", "❤️", "💔", "🤯", "🙌", "😴", "😈", "🙈", "🤡", "🥶", "🍿", "🫡"];
$("emojiGrid").innerHTML = EMOJIS.map((e) => `<button data-emo="${e}">${e}</button>`).join("");
const sendEmoji = (e) => { if (e) socket.emit("emoji", { e }); };
$("emojiToggle").onclick = () => $("emojiTray").classList.toggle("hidden");
$("emojiGrid").onclick = (e) => { const b = e.target.closest("[data-emo]"); if (b) sendEmoji(b.dataset.emo); };
$("emojiSend").onclick = () => { const v = $("emojiIn").value.trim(); if (v) { sendEmoji(v); $("emojiIn").value = ""; } };
$("emojiIn").onkeydown = (e) => { if (e.key === "Enter") $("emojiSend").click(); e.stopPropagation(); };
socket.on("emoji", ({ e, mark: m, name }) => {
  Snd.pop();
  const el = document.createElement("div");
  el.className = "efloat " + (m === "X" ? "p1" : "p2");
  el.style.left = 8 + Math.random() * 78 + "%";
  el.innerHTML = `<span>${esc(e)}</span><small>${esc(name)}</small>`;
  $("emojiFloat").appendChild(el);
  setTimeout(() => el.remove(), 2600);
});

$("sbBtn").onclick = () => $("sbPanel").classList.toggle("hidden");


/* ---------- clear winner voice: "Raghav wins!" ---------- */
const Speech = {
  voice: null, timer: null, unlocked: false,
  init() {
    if (!("speechSynthesis" in window)) return;
    const load = () => { this.voice = this.pick(); };
    load();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", load); else speechSynthesis.onvoiceschanged = load;
  },
  // best English voice available on this device: natural / neural / Google first, Indian English preferred for names like Raghav
  pick() {
    const list = speechSynthesis.getVoices();
    let best = null, top = -1;
    for (const v of list) {
      const n = (v.name || "").toLowerCase(), l = (v.lang || "").replace("_", "-").toLowerCase();
      let s = 0;
      if (l === "en-in") s += 50; else if (l.startsWith("en-")) s += 30; else if (l === "en") s += 20; else continue;
      if (/natural|neural|online/.test(n)) s += 25;
      if (/google/.test(n)) s += 15;
      if (/microsoft/.test(n)) s += 8;
      if (/rishi|veena|neerja|prabhat|samantha|daniel|karen|aria|jenny|guy/.test(n)) s += 8;
      if (/espeak|compact|novelty|whisper|bad news|bells|zarvox|trinoids/.test(n)) s -= 40;
      if (s > top) { top = s; best = v; }
    }
    return best;
  },
  clean(name) { return String(name || "Player").replace(/[^\p{L}\p{N}\s'.-]/gu, " ").replace(/\s+/g, " ").trim() || "Player"; },
  // browsers only allow speech after a tap — warm it up silently on the first touch
  unlock() {
    if (this.unlocked || !("speechSynthesis" in window)) return;
    this.unlocked = true;
    try { const u = new SpeechSynthesisUtterance("."); u.volume = 0; speechSynthesis.speak(u); this.voice = this.pick(); } catch (_) { /* ignore */ }
  },
  say(text, delay = 0) {
    if (!Snd.voice || !("speechSynthesis" in window)) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const ss = speechSynthesis;
      ss.cancel();
      const u = new SpeechSynthesisUtterance(text), v = this.voice || this.pick();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-IN";
      u.rate = 0.88; u.pitch = 1; u.volume = 1;
      setTimeout(() => { try { ss.resume(); ss.speak(u); } catch (_) { /* ignore */ } }, 60);   // cancel()+speak() in the same tick gets dropped in Chrome
    }, delay);
  },
  winner(name) { this.say(`${this.clean(name)} wins!`, 800); }   // waits for the win jingle to finish so the name is heard clearly
};
Speech.init();
document.addEventListener("pointerdown", () => Speech.unlock(), { once: true });

/* ---------- level bar (Easy / Medium / Hard) ---------- */
$("lvBtns").innerHTML = LEVELS.map(([k, e, n]) => `<button data-lv="${k}">${e} ${n}</button>`).join("");
$("lvBtns").onclick = async (e) => {
  const b = e.target.closest("[data-lv]"); if (!b || !state || b.dataset.lv === state.level) return;
  const r = await call("set-level", { level: b.dataset.lv });
  if (!r.ok) toast(r.message);
};
function renderLevel(s) {
  const lv = s.level || "medium";
  for (const b of $("lvBtns").children) b.classList.toggle("on", b.dataset.lv === lv);
  $("levelBar").dataset.level = lv;
  $("lvNote").textContent = `${LEVEL_NOTE[lv]} · applies from the next round · games with 🎚️ change`;
}

/* ---------- voice chat: WebRTC, direct between the two players (server only relays the handshake) ---------- */
const Voice = {
  stream: null, pc: null, joined: false, muted: false, offered: false, peerOn: false, ice: null, pendingIce: [], ac: null, metersOn: false, meters: {}, remoteStream:null, recorder:null, recordingChunks:[], recordingToken:null, recordingStartedAt:0, mixContext:null,
  async join() {
    if (this.joined) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) {
      return toast(window.isSecureContext === false ? "Voice chat needs a secure (https) link" : "This browser does not support voice chat");
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, video: false });
    } catch (e) {
      return toast(e && e.name === "NotAllowedError" ? "Mic blocked — allow microphone in the browser address bar" : "No microphone found");
    }
    try { this.ice = (await (await fetch("/ice", { cache: "no-store" })).json()).iceServers; } catch (_) { this.ice = [{ urls: "stun:stun.l.google.com:19302" }]; }
    const consent=window.confirm("VOICE CHAT RECORDING NOTICE\n\nIf both players agree, this voice chat will be recorded for safety moderation. The recording will be visible to authorized PlayRoom administrators and automatically deleted after two calendar days. A visible REC indicator will appear while recording. Do you consent?");
    const consentResult=await call("voice-record-consent",{consent});
    if(!consent || !consentResult.ok){ this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; toast("Voice recording consent is required from both players to use recorded voice chat."); return; }
    this.joined = true; this.muted = false; this.stream.getAudioTracks().forEach((t) => (t.enabled = true));
    this.meter("me", this.stream, () => mark);
    await call("voice-ready", { ready: true });
    this.sync();
  },
  async leave() {
    if (!this.joined) return;
    this.stopRecording(true); socket.emit("voice-recording-cancel"); this.joined = false; this.offered = false;
    this.closePc();
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null; delete this.meters.me;
    await call("voice-ready", { ready: false });
    this.paint();
  },
  toggleMute() {
    if (!this.stream) return;
    this.muted = !this.muted;
    this.stream.getAudioTracks().forEach((t) => (t.enabled = !this.muted));
    this.paint();
  },
  closePc() {
    if (this.pc) { try { this.pc.ontrack = this.pc.onicecandidate = this.pc.onconnectionstatechange = null; this.pc.close(); } catch (_) { /* ignore */ } }
    this.pc = null; this.pendingIce = []; this.remoteStream=null; delete this.meters.peer;
    const a = $("remoteAudio"); if (a) a.srcObject = null;
    $("avX").classList.remove("speaking"); $("avO").classList.remove("speaking");
  },
  makePc() {
    const pc = new RTCPeerConnection({ iceServers: this.ice || [{ urls: "stun:stun.l.google.com:19302" }] });
    this.pc = pc;
    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream));
    pc.onicecandidate = (e) => { if (e.candidate) socket.emit("voice-signal", { type: "ice", candidate: e.candidate }); };
    pc.ontrack = (e) => {
      this.remoteStream=e.streams[0]; const a = $("remoteAudio"); a.srcObject = e.streams[0];
      a.play().catch(() => toast("Tap anywhere on the screen to hear your friend"));
      this.meter("peer", e.streams[0], () => other(mark));
      if(this.pendingRecordingToken){const t=this.pendingRecordingToken;this.pendingRecordingToken=null;this.startRecording(t);}
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      if (pc.connectionState === "failed") this.recover();
      this.paint();
    };
    return pc;
  },
  async recover() {                       // connection failed: restart the handshake once
    if (!this.joined) return;
    if (mark === "X") { this.offered = false; this.closePc(); setTimeout(() => this.sync(), 600); }
    else { this.closePc(); await call("voice-ready", { ready: false }); await call("voice-ready", { ready: true }); }
  },
  async offer() {
    this.offered = true; this.closePc();
    const pc = this.makePc();
    try {
      await pc.setLocalDescription(await pc.createOffer());
      socket.emit("voice-signal", { type: "offer", sdp: pc.localDescription });
    } catch (_) { this.offered = false; }
  },
  async onSignal(d) {
    if (!this.joined || !d) return;
    try {
      if (d.type === "offer") {
        this.closePc();
        const pc = this.makePc();
        await pc.setRemoteDescription(d.sdp);
        await this.flushIce();
        await pc.setLocalDescription(await pc.createAnswer());
        socket.emit("voice-signal", { type: "answer", sdp: pc.localDescription });
      } else if (d.type === "answer") {
        if (this.pc && !this.pc.currentRemoteDescription) { await this.pc.setRemoteDescription(d.sdp); await this.flushIce(); }
      } else if (d.type === "ice") {
        if (this.pc && this.pc.remoteDescription) { try { await this.pc.addIceCandidate(d.candidate); } catch (_) { /* stale candidate */ } }
        else this.pendingIce.push(d.candidate);
      }
    } catch (_) { /* handshake glitch — recover() handles real failures */ }
  },
  async flushIce() {
    const q = this.pendingIce; this.pendingIce = [];
    for (const c of q) { try { await this.pc.addIceCandidate(c); } catch (_) { /* ignore */ } }
  },
  // runs on every room update: the "X" player makes the offer as soon as both players are on voice
  sync() {
    const s = state; if (!s) return;
    const peer = s.players.find((p) => p.mark !== s.me);
    this.peerOn = !!(peer && peer.voice);
    if (this.joined) {
      if (!this.peerOn) { if (this.pc) this.closePc(); this.offered = false; }
      else if (s.me === "X" && !this.offered) this.offer();
    }
    this.paint();
  },
  // little speaking ring around the avatar of whoever is talking
  meter(key, stream, who) {
    try {
      this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ac.state === "suspended") this.ac.resume();
      const an = this.ac.createAnalyser(); an.fftSize = 512;
      this.ac.createMediaStreamSource(stream).connect(an);
      this.meters[key] = { an, who, buf: new Uint8Array(an.fftSize) };
      if (!this.metersOn) { this.metersOn = true; setInterval(() => this.tickMeters(), 140); }
    } catch (_) { /* analyser unavailable */ }
  },
  tickMeters() {
    for (const m of ["X", "O"]) $("av" + m).classList.remove("speaking");
    for (const k of Object.keys(this.meters)) {
      const { an, who, buf } = this.meters[k]; an.getByteTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      if (Math.sqrt(sum / buf.length) > 0.035 && !(k === "me" && this.muted)) $("av" + who()).classList.add("speaking");
    }
  },
  async startRecording(token){
    if(this.recorder) return;
    if(!this.stream || !this.remoteStream){this.pendingRecordingToken=token;return;}
    try{
      this.mixContext=new (window.AudioContext||window.webkitAudioContext)();
      const dest=this.mixContext.createMediaStreamDestination();
      this.mixContext.createMediaStreamSource(this.stream).connect(dest);
      this.mixContext.createMediaStreamSource(this.remoteStream).connect(dest);
      const mimeType=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':(MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'');
      this.recorder=mimeType?new MediaRecorder(dest.stream,{mimeType}):new MediaRecorder(dest.stream); this.recordingChunks=[]; this.recordingToken=token; this.recordingStartedAt=Date.now();
      this.recorder.ondataavailable=e=>{if(e.data&&e.data.size)this.recordingChunks.push(e.data)};
      this.recorder.onstop=async()=>{
        const blob=new Blob(this.recordingChunks,{type:this.recorder?.mimeType||'audio/webm'}); this.recordingChunks=[];
        if(blob.size && this.recordingToken){ try{const r=await fetch('/api/voice-recordings/upload/'+encodeURIComponent(this.recordingToken),{method:'POST',headers:{'Content-Type':blob.type||'audio/webm'},body:blob}); if(!r.ok) toast('Recording upload failed.'); else toast('Voice recording securely saved.');}catch(_){toast('Recording upload failed.');} }
        this.recordingToken=null; if(this.mixContext){this.mixContext.close().catch(()=>{});this.mixContext=null;}
      };
      this.recorder.start(1000); document.body.classList.add('recording-active');
    }catch(e){console.error('Recording start failed',e);toast('Could not start recording.');socket.emit('voice-recording-cancel');}
  },
  stopRecording(upload=true){
    if(!upload){this.recordingToken=null;this.pendingRecordingToken=null;}
    if(this.recorder && this.recorder.state!=='inactive'){ if(!upload){this.recordingToken=null;} this.recorder.stop(); }
    document.body.classList.remove('recording-active');
  },
  paint() {
    const j = this.joined, st = this.pc ? this.pc.connectionState : "", live = j && this.peerOn && st === "connected";
    let t;
    if (!j) t = this.peerOn ? "🟢 Your friend is on voice — press Join voice to talk!" : "Baat karo apne dost se — press Join voice (allow the microphone). Use headphones to avoid echo.";
    else if (!this.peerOn) t = "🟡 You're on voice. Waiting for your friend to join voice…";
    else if (live) t = this.muted ? "🔇 Connected — you are muted" : "🟢 Connected — you can talk now!";
    else if (st === "failed") t = "🔴 Could not connect directly — retrying… (a TURN server may be needed on strict networks)";
    else t = "🟡 Connecting…";
    $("vbStatus").textContent = t;
    $("vcJoin").textContent = j ? "⏹ Leave voice" : "🎙️ Join voice";
    $("vcJoin").className = j ? "quiet" : "primary";
    $("vcMute").classList.toggle("hidden", !j);
    $("vcMute").textContent = this.muted ? "🔇 Unmute" : "🎤 Mute";
    $("voiceBar").classList.toggle("live", live); $("voiceBar").classList.toggle("on", j);
    $("vbIco").textContent = !j ? "🎙️" : this.muted ? "🔇" : "🎧";
  }
};
$("vcJoin").onclick = () => (Voice.joined ? Voice.leave() : Voice.join());
$("vcMute").onclick = () => Voice.toggleMute();
socket.on("voice-signal", (d) => Voice.onSignal(d));
socket.on("voice-recording-authorized",({token})=>Voice.startRecording(token));
socket.on("voice-recording-stopped",({reason})=>{Voice.stopRecording(true); document.body.classList.remove("recording-active"); if(reason) toast(reason);});
socket.on("voice-recording-active",()=>{document.body.classList.add("recording-active");toast("🔴 REC — voice chat recording is active for all participants.");});
socket.on("disconnect", () => { Voice.closePc(); Voice.offered = false; });
socket.on("connect", () => { if (Voice.joined && room) call("voice-ready", { ready: true }); });
document.addEventListener("click", () => { const a = $("remoteAudio"); if (a && a.srcObject && a.paused) a.play().catch(() => {}); });
