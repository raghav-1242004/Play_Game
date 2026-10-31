/* Client side of the 23 extra games + rules screen.
   Uses helpers from app.js ($, esc, other, nameOf, cls, act, toast, socket, state, mark) at call time. */

const EXTRA_CATALOG = [
  // id, emoji, title, description, tag, hue
  ["ludo", "🎲", "Ludo", "Roll, race & capture tokens", "BOARD", 20],
  ["snakeladder", "🪜", "Snake & Ladder", "Dice race · climb ladders, dodge snakes", "BOARD", 140],
  ["dominoes", "🁢", "Dominoes", "Match the ends, empty your hand", "BOARD", 275],
  ["mancala", "🪨", "Mancala", "Sow stones, capture & win", "BOARD", 40],
  ["snake", "🐍", "Snake Battle", "Eat apples, outlive your rival", "ARCADE", 125],
  ["pong", "🏓", "Pong Duel", "Paddle duel — first to 5", "ARCADE", 200],
  ["brickbreaker", "🧱", "Brick Breaker Duel", "Smash more bricks than your rival", "ARCADE", 15],
  ["spaceshooter", "🚀", "Space Shooter", "Blast aliens, top the score", "ARCADE", 240],
  ["tanks", "💥", "Tank Battle", "Angle, power & wind artillery", "ARCADE", 95],
  ["platformrace", "🏃", "Platform Race", "Jump obstacles, run furthest", "ARCADE", 160],
  ["carracing", "🏎️", "Car Racing", "Dodge traffic, go the distance", "RACING", 5],
  ["bikeracing", "🏍️", "Bike Racing", "Faster bikes, 4 lanes", "RACING", 55],
  ["penalty", "⚽", "Football Penalty", "Shoot-out: corner vs dive", "SPORTS", 135],
  ["basketball", "🏀", "Basketball Duel", "Time your shot in the green", "SPORTS", 28],
  ["airhockey", "🏒", "Air Hockey", "Smash the puck in their goal", "SPORTS", 190],
  ["minigolf", "⛳", "Mini Golf", "3 holes, fewest strokes", "SPORTS", 150],
  ["wordscramble", "🔀", "Word Scramble", "Unscramble faster than your rival", "WORDS", 300],
  ["quiz", "❓", "Quiz Battle", "Fastest correct answer scores", "BRAIN", 220],
  ["codebreaker", "🔐", "Code Breaker", "Crack the secret colour code", "BRAIN", 330],
  ["sequence", "🎹", "Sequence Memory", "Repeat the pattern, add one", "BRAIN", 170],
  ["colorduel", "🎨", "Color Pattern Duel", "Memorise & repeat the fastest", "BRAIN", 310],
  ["maze", "🧭", "Maze Race", "First to the ⭐ wins", "BRAIN", 100],
  ["whack", "🔨", "Whack-a-Mole", "Tap the mole first", "QUICK", 45],
  ["drawguess", "✏️", "Draw & Guess", "One draws, one guesses", "FUN", 350]
];
// category chips for the game picker
const CATS = [
  ["all", "✨ All", null],
  ["board", "🎲 Classic & Board", ["tictactoe", "ludo", "snakeladder", "chess", "checkers", "connect4", "dotsboxes", "battleship", "dominoes", "mancala", "reversi", "gomoku"]],
  ["arcade", "🕹️ Arcade & Action", ["snake", "pong", "brickbreaker", "spaceshooter", "tanks", "platformrace"]],
  ["sports", "🏁 Racing & Sports", ["carracing", "bikeracing", "penalty", "basketball", "airhockey", "minigolf"]],
  ["brain", "🧠 Puzzle & Brain", ["memory", "wordscramble", "quiz", "mathrace", "codebreaker", "sequence", "colorduel", "hangman", "higherlower", "maze", "numberduel"]],
  ["fun", "😜 Funny & Unique", ["whack", "rps", "drawguess", "reaction", "pig"]]
];

/* games that change with the room level (Easy / Medium / Hard) + what changes */
const LEVELS = [["easy", "🟢", "Easy"], ["medium", "🟡", "Medium"], ["hard", "🔴", "Hard"]];
const LEVEL_INFO = {
  snakeladder: { easy: "7 ladders · only 4 short snakes · any roll that reaches 100 wins", medium: "7 ladders · 8 snakes · you need the exact number for 100", hard: "5 ladders · 10 long snakes · exact number needed for 100" },
  snake: { easy: "Slow snakes · first to 7 apples", medium: "Normal speed · first to 10 apples", hard: "Fast snakes · first to 12 apples" },
  mathrace: { easy: "Small numbers · first to 3", medium: "Normal sums · first to 3", hard: "Big numbers · first to 5" },
  higherlower: { easy: "Secret number 1–50", medium: "Secret number 1–100", hard: "Secret number 1–500" },
  memory: { easy: "6 pairs (12 cards)", medium: "8 pairs (16 cards)", hard: "10 pairs (20 cards)" },
  pig: { easy: "First to 30 points", medium: "First to 50 points", hard: "First to 100 points" },
  maze: { easy: "Small 9×9 maze", medium: "11×11 maze", hard: "Big 15×15 maze" },
  whack: { easy: "Moles stay longer", medium: "Normal speed", hard: "Fast, short-lived moles" }
};
const LEVEL_NOTE = { easy: "🟢 Easy — relaxed, friendly settings", medium: "🟡 Medium — the classic balanced game", hard: "🔴 Hard — tougher, for real champions" };

const COLORS6 = ["#ff4d4d", "#ffd23f", "#3ddc97", "#4da3ff", "#b36bff", "#ff9f43"];
const COLOR_NAMES = ["Red", "Yellow", "Green", "Blue", "Purple", "Orange"];
const hand = (m) => (m === "X" ? "p1" : "p2");

/* ---------------- rules screen ---------------- */
function drawRules(g) {
  const meta = catalog.find((x) => x[0] === g.id) || [g.id, "🎮", g.id, "", "", 0], R = RULES[g.id] || { en: [], hi: [] };
  const me = g.gate[mark], foe = g.gate[other(mark)], li = (t) => `<li>${esc(t)}</li>`;
  return `<div class="rules-card" style="--h:${meta[5]}">
    <div class="rc-head"><span class="rc-emoji">${meta[1]}</span><div><h3>${esc(meta[2])}</h3><small>${esc(meta[3])}</small></div></div>
    <div class="rc-cols">
      <section><h4>🇬🇧 How to play · English</h4><ol>${R.en.map(li).join("")}</ol></section>
      <section><h4>🇮🇳 Kaise khelein · Hinglish</h4><ol>${R.hi.map(li).join("")}</ol></section>
    </div>
    ${LEVEL_INFO[g.id] ? `<div class="rc-level">🎚️ <b>Level: ${esc(g.level || "medium")}</b> — ${esc(LEVEL_INFO[g.id][g.level || "medium"])}<small>${LEVELS.map(([k, e, n]) => `${e} ${n}: ${esc(LEVEL_INFO[g.id][k])}`).join(" &nbsp;|&nbsp; ")}</small></div>` : ""}
    <div class="rc-pts">🏆 Win = <b>+10 points</b> · 🤝 Draw = <b>+3 each</b> · 😎 Send emojis anytime with the 😀 button!</div>
    <div class="rc-ready"><span class="${me ? "ok" : ""}">${me ? "✔" : "…"} You</span><span class="${foe ? "ok" : ""}">${foe ? "✔" : "…"} ${esc(nameOf(other(mark)))}</span></div>
    <button class="primary rc-btn" data-ready="1" ${me ? "disabled style='opacity:.55'" : ""}>${me ? "Waiting for your friend… · Dost ka wait" : "✔ I'm ready · Main ready hoon"}</button>
  </div>`;
}

/* ---------------- Ludo ---------------- */
const YARD = { X: [[1.4, 1.4], [1.4, 3.4], [3.4, 1.4], [3.4, 3.4]], O: [[10.6, 10.6], [10.6, 12.6], [12.6, 10.6], [12.6, 12.6]] };
function drawLudo(g, my) {
  const P = g.path, u = 100 / 15, safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const cell = (r, c, cl, txt = "") => `<i class="lc ${cl}" style="left:${c * u}%;top:${r * u}%">${txt}</i>`;
  let bg = `<i class="lyard x" style="left:0;top:0;width:${6 * u}%;height:${6 * u}%"></i><i class="lyard o" style="left:${9 * u}%;top:${9 * u}%;width:${6 * u}%;height:${6 * u}%"></i>`;
  P.forEach(([r, c], i) => { bg += cell(r, c, `${i === 0 ? "sx" : i === 26 ? "so" : ""} ${safe.has(i) ? "safe" : ""}`, safe.has(i) ? "★" : ""); });
  for (let k = 1; k <= 6; k++) { bg += cell(7, k, "hx"); bg += cell(7, 14 - k, "ho"); }
  bg += cell(7, 7, "mid", "★");
  const where = (m, i) => { const p = g.tokens[m][i]; if (p < 0) return YARD[m][i]; if (p <= 50) return P[((m === "X" ? 0 : 26) + p) % 52]; return m === "X" ? [7, p - 50] : [7, 14 - (p - 50)]; };
  const seen = {}; let toks = "";
  for (const m of ["X", "O"]) for (let i = 0; i < 4; i++) {
    const [r, c] = where(m, i), key = r + "," + c, n = (seen[key] = (seen[key] || 0) + 1) - 1;
    const mov = my && m === mark && g.phase === "move" && g.movable.includes(i), home = g.tokens[m][i] === 56;
    const last = g.lastTok && g.lastTok.m === m && g.lastTok.i === i;
    toks += `<button class="tok ${cls(m)} ${mov ? "mov" : ""} ${home ? "home" : ""} ${last ? "lastt" : ""}" style="left:${c * u + n * 0.9}%;top:${r * u + n * 0.9}%" ${mov ? `data-tok="${i}"` : "disabled"} aria-label="token"></button>`;
  }
  const faces = ["🎲", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"], canRoll = my && g.phase === "roll";
  const homeCount = (m) => g.tokens[m].filter((p) => p === 56).length;
  return `<div class="ludo">${bg}${toks}</div>
  <div class="ludo-ctl"><div class="die ${g.die === 6 ? "six" : ""}" data-roll="${g.rollId}">${faces[g.die || 0]}</div>
  <button class="primary" data-ludo="roll" ${canRoll ? "" : "disabled style='opacity:.45'"}>🎲 Roll dice</button></div>
  <div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}: <b>${homeCount("X")}/4</b> home</span><span class="chip-o">● ${esc(nameOf("O"))}: <b>${homeCount("O")}/4</b> home</span></div>
  <p class="hint">${my && g.phase === "move" ? "Tap a glowing token to move it." : "Need a 6 to leave home · ★ squares are safe · capture = extra roll"}</p>`;
}

/* ---------------- Snake & Ladder ---------------- */
let slShown = { rid: 0, X: 0, O: 0 }, slSound = "";
const slXY = (n) => { const i = n - 1, r = Math.floor(i / 10), c = i % 10, col = r % 2 === 0 ? c : 9 - c; return [col * 10 + 5, (9 - r) * 10 + 5]; };
const SL_SNAKE_COL = ["#3ddc97", "#ff6b6b", "#b36bff", "#4da3ff", "#ffb347", "#ff8fb1"];
function slArt(g) {
  let s = "";
  for (const [a, z] of g.ladders) {                       // ladders: two rails + rungs
    const [x1, y1] = slXY(a), [x2, y2] = slXY(z), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy * 1.35, py = ux * 1.35;
    s += `<g class="sl-lad"><line x1="${x1 + px}" y1="${y1 + py}" x2="${x2 + px}" y2="${y2 + py}"/><line x1="${x1 - px}" y1="${y1 - py}" x2="${x2 - px}" y2="${y2 - py}"/>`;
    for (let d = 3; d < len - 1; d += 4.2) { const cx = x1 + ux * d, cy = y1 + uy * d; s += `<line class="rung" x1="${cx + px}" y1="${cy + py}" x2="${cx - px}" y2="${cy - py}"/>`; }
    s += "</g>";
  }
  g.snakes.forEach(([a, z], k) => {                       // snakes: S-curve from head (a) down to tail (z)
    const [x1, y1] = slXY(a), [x2, y2] = slXY(z), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w = Math.min(14, len * 0.28) * (k % 2 ? -1 : 1);
    const c1x = x1 + dx * 0.25 + nx * w, c1y = y1 + dy * 0.25 + ny * w, c2x = x1 + dx * 0.7 - nx * w, c2y = y1 + dy * 0.7 - ny * w, col = SL_SNAKE_COL[k % SL_SNAKE_COL.length];
    const d = `M${x1} ${y1} C${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`;
    s += `<g class="sl-snk"><path d="${d}" stroke="#0b0820" stroke-width="3.3"/><path d="${d}" stroke="${col}" stroke-width="2.4"/><path d="${d}" stroke="#ffffff66" stroke-width=".8" stroke-dasharray="1.1 2.1"/>
      <circle cx="${x1}" cy="${y1}" r="2.5" fill="${col}" stroke="#0b0820" stroke-width=".7"/><circle cx="${x1 - 0.9}" cy="${y1 - 0.5}" r=".6" fill="#fff"/><circle cx="${x1 + 0.9}" cy="${y1 - 0.5}" r=".6" fill="#fff"/><circle cx="${x1 - 0.9}" cy="${y1 - 0.5}" r=".25" fill="#000"/><circle cx="${x1 + 0.9}" cy="${y1 - 0.5}" r=".25" fill="#000"/></g>`;
  });
  return `<svg class="sl-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`;
}
function slPlace(g, m, n) {
  const [x, y] = slXY(Math.max(1, n)), same = g.pos.X === g.pos.O && g.pos.X > 0, off = same ? (m === "X" ? -1.7 : 1.7) : 0;
  return [x + off, y + off * 0.6];
}
function drawSnakeLadder(g, my) {
  if (slShown.rid !== g.rid) slShown = { rid: g.rid, X: g.pos.X, O: g.pos.O, via: "" };   // new round: no glide
  const heads = new Set(g.snakes.map((s) => s[0])), feet = new Set(g.ladders.map((l) => l[0]));
  let cells = "";
  for (let r = 9; r >= 0; r--) for (let c = 0; c < 10; c++) {
    const n = r * 10 + (r % 2 === 0 ? c : 9 - c) + 1;
    cells += `<i class="slc ${(r + c) % 2 ? "sl-alt" : ""} ${heads.has(n) ? "sl-head" : ""} ${feet.has(n) ? "sl-foot" : ""} ${n === 100 ? "sl-goal" : ""}">${n === 100 ? "🏆" : n}</i>`;
  }
  const toks = ["X", "O"].map((m) => { const [x, y] = slPlace(g, m, slShown[m]); return `<i class="slt ${cls(m)} ${slShown[m] ? "" : "off"}" data-m="${m}" style="left:${x}%;top:${y}%">${esc(initial(m))}</i>`; }).join("");
  const faces = ["🎲", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"], canRoll = my && !g.busy && g.status === "playing";
  const st = (m) => `<span class="chip-${cls(m)}">● ${esc(nameOf(m))}: <b>${g.pos[m] ? "square " + g.pos[m] : "at start"}</b></span>`;
  return `<div class="slwrap"><div class="slb">${cells}</div>${slArt(g)}${toks}</div>
  <div class="ludo-ctl"><div class="die ${g.die === 6 ? "six" : ""}" data-roll="${g.rollId}">${faces[g.die || 0]}</div>
  <button class="primary" data-sl="roll" ${canRoll ? "" : "disabled style='opacity:.45'"}>🎲 Roll dice</button></div>
  <div class="sub-info">${st("X")}${st("O")}<span>${g.snakes.length} 🐍 · ${g.ladders.length} 🪜 · ${g.exact ? "exact roll needed for 100" : "any roll that reaches 100 wins"}</span></div>
  <p class="hint">Roll a 6 = roll again (three 6s in a row = turn lost) · Ladder 🪜 lifts you up · Snake 🐍 slides you down</p>`;
}
function postSnakeLadder(g) {
  const area = $("gameArea");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const m of ["X", "O"]) {
      const el = area.querySelector(`.slt.${cls(m)}`); if (!el) continue;
      const [x, y] = slPlace(g, m, g.pos[m]);
      el.style.left = x + "%"; el.style.top = y + "%"; el.classList.toggle("off", !g.pos[m]);
    }
    slShown.X = g.pos.X; slShown.O = g.pos.O;
  }));
  const key = g.rollId + ":" + (g.last && g.last.via || "");
  if (g.last && g.last.via && slSound !== key) { slSound = key; g.last.via === "ladder" ? Snd.up() : Snd.down(); }
  else if (g.rollId && slSound !== key) { slSound = key; Snd.dice(); }
}

/* ---------------- Dominoes ---------------- */
const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const dHalf = (n) => `<span class="dh">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[n].includes(k) ? "on" : ""}"></i>`).join("")}</span>`;
const dTile = (a, b, cl = "", attr = "") => `<button class="dt ${cl}" ${attr}>${dHalf(a)}<span class="dsep"></span>${dHalf(b)}</button>`;
let domSel = null;
function drawDominoes(g, my) {
  const fin = g.status === "finished", mine = g.hands[mark] || [];
  const ends = g.chain.length ? [g.chain[0][0], g.chain[g.chain.length - 1][1]] : null;
  const fits = (t) => !ends || t.some((v) => v === ends[0] || v === ends[1]);
  const canAny = mine.some(fits);
  if (!my) domSel = null;
  const chain = g.chain.length ? g.chain.map((t) => dTile(t[0], t[1], "chain", "disabled")).join("") : `<span class="hint">Empty table — ${my ? "play any tile!" : "waiting for the first tile…"}</span>`;
  const hh = mine.map((t, i) => dTile(t[0], t[1], `${fits(t) ? "ok" : "no"} ${domSel === i ? "sel" : ""}`, `data-dom="${i}" ${my && fits(t) ? "" : "disabled"}`)).join("");
  let extra = "";
  if (my && domSel !== null && mine[domSel] && ends) extra = `<div class="bs-tools"><span class="hint" style="margin:0 8px 0 0">Place on:</span><button class="secondary" data-domend="L">◀ Left (${ends[0]})</button><button class="secondary" data-domend="R">Right (${ends[1]}) ▶</button></div>`;
  let acts = "";
  if (my && !canAny) acts = g.bone > 0 ? `<button class="primary" data-domdraw="1">🂠 Draw from boneyard (${g.bone})</button>` : `<button class="secondary" data-dompass="1">Pass turn</button>`;
  const foeHand = fin && g.hands[other(mark)] ? g.hands[other(mark)].map((t) => dTile(t[0], t[1], "chain", "disabled")).join("") : "";
  return `<div class="dchain">${chain}</div>
  <div class="sub-info"><span class="chip-${cls(other(mark))}">${esc(nameOf(other(mark)))} holds <b>${g.counts[other(mark)]}</b> tiles</span><span>Boneyard: <b>${g.bone}</b></span></div>
  ${fin ? `<p class="hint">Rival's tiles:</p><div class="dchain small">${foeHand || "—"}</div>` : ""}
  <h4 class="mini-h">YOUR TILES</h4><div class="dhand">${hh || "<span class='hint'>No tiles</span>"}</div>${extra}<div class="bs-tools">${acts}</div>`;
}

/* ---------------- Mancala ---------------- */
function drawMancala(g, my) {
  const flip = mark === "O", P = g.pits;
  const bottom = flip ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5], top = flip ? [5, 4, 3, 2, 1, 0] : [12, 11, 10, 9, 8, 7];
  const leftStore = flip ? 6 : 13, rightStore = flip ? 13 : 6, own = (i) => (flip ? i >= 7 && i <= 12 : i <= 5);
  const pit = (i, clickable) => `<button class="pit ${own(i) ? "mine" : "theirs"} ${g.lastPit === i ? "lastp" : ""}" ${clickable && P[i] ? `data-pit="${flip ? i - 7 : i}"` : "disabled"}><b>${P[i]}</b><span>${"•".repeat(Math.min(P[i], 8))}</span></button>`;
  const store = (i) => `<div class="store ${i === 6 ? "p1" : "p2"} ${g.lastPit === i ? "lastp" : ""}"><small>${esc(nameOf(i === 6 ? "X" : "O"))}</small><b>${P[i]}</b></div>`;
  return `<div class="mancala">${store(leftStore)}<div class="mrows"><div class="mrow">${top.map((i) => pit(i, false)).join("")}</div><div class="mrow">${bottom.map((i) => pit(i, my)).join("")}</div></div>${store(rightStore)}</div>
  <p class="hint">Your pits are the bottom row · store on the right · last stone in your store = play again</p>`;
}

/* ---------------- Tank Battle ---------------- */
let tkAngle = 45, tkPower = 60, tkAnim = 0, tkTok = 0;
const tkH = (x) => 18 + 26 * Math.exp(-(((x - 50) / 11) ** 2));
function drawTanks(g, my) {
  const hp = (m) => `<div class="hpb ${cls(m)}"><span>${esc(nameOf(m))}</span><div><i style="width:${g.hp[m]}%"></i></div><b>${g.hp[m]}</b></div>`;
  return `<div class="tk-hud">${hp("X")}${hp("O")}</div>
  <canvas id="tkc" class="tkc" width="600" height="300"></canvas>
  <div class="tk-wind">💨 Wind ${g.wind === 0 ? "calm" : (g.wind > 0 ? "→ " : "← ") + Math.abs(g.wind)}</div>
  <div class="tk-ctl">
    <label>Angle <b id="tkAv">${tkAngle}°</b><input type="range" id="tkA" min="5" max="85" value="${tkAngle}" ${my ? "" : "disabled"}></label>
    <label>Power <b id="tkPv">${tkPower}</b><input type="range" id="tkP" min="20" max="100" value="${tkPower}" ${my ? "" : "disabled"}></label>
    <button class="primary" data-tfire="1" ${my ? "" : "disabled style='opacity:.45'"}>🔥 Fire</button>
  </div>`;
}
function postTanks(g) {
  const cv = $("tkc"); if (!cv) return;
  const ctx = cv.getContext("2d"), SX = 6, SY = 4, Y0 = 300;
  const X = (x) => x * SX, Y = (y) => Y0 - y * SY;
  const base = (shellPt, expl) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, "#1b1450"); sky.addColorStop(1, "#4a2a7a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 600, 300);
    ctx.fillStyle = "#2d7a46"; ctx.beginPath(); ctx.moveTo(0, 300);
    for (let x = 0; x <= 100; x++) ctx.lineTo(X(x), Y(tkH(x))); ctx.lineTo(600, 300); ctx.closePath(); ctx.fill();
    for (const m of ["X", "O"]) {
      const tx = m === "X" ? 10 : 90, ty = tkH(tx), dir = m === "X" ? 1 : -1, dead = g.hp[m] <= 0;
      ctx.fillStyle = dead ? "#555" : m === "X" ? "#ffc24b" : "#ff5c8a";
      ctx.fillRect(X(tx) - 16, Y(ty) - 10, 32, 10); ctx.fillRect(X(tx) - 9, Y(ty) - 17, 18, 7);
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(tx), Y(ty) - 14); ctx.lineTo(X(tx) + dir * 22, Y(ty) - 24); ctx.stroke();
      if (dead) { ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.fillText("💥", X(tx), Y(ty) - 12); }
    }
    if (shellPt) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X(shellPt[0]), Y(shellPt[1]), 4, 0, 7); ctx.fill(); }
    if (expl) { ctx.font = `${20 + expl * 22}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("💥", X(expl_x), Y(expl_y)); }
  };
  let expl_x = 0, expl_y = 0;
  const s = g.shot;
  if (s && s.impact) { expl_x = s.impact[0]; expl_y = s.impact[1]; }
  if (s && g.shotId !== tkAnim) {
    tkAnim = g.shotId; const my_tok = ++tkTok; let k = 0;
    const step = () => {
      if (my_tok !== tkTok || !$("tkc")) return;
      base(s.path[Math.min(k, s.path.length - 1)], 0);
      ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 2; ctx.beginPath(); s.path.slice(0, k + 1).forEach(([x, y], j) => (j ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
      k += 1;
      if (k < s.path.length) requestAnimationFrame(step); else { base(null, s.impact ? 0.6 : 0); }
    };
    step();
  } else base(null, s && s.impact ? 0.6 : 0);
}

/* ---------------- Football Penalty ---------------- */
function drawPenalty(g, my) {
  const iKick = g.kicker === mark, mine = g.picks[mark], fin = g.status === "finished";
  const last = g.log[g.log.length - 1], zx = { L: 17, C: 50, R: 83 };
  const dots = (m) => { const l = g.log.filter((x) => x.kicker === m), n = Math.max(g.per, l.length); return Array.from({ length: n }, (_, i) => (l[i] ? (l[i].goal ? "<i class='pg g'>⚽</i>" : "<i class='pg s'>✕</i>") : "<i class='pg'>·</i>")).join(""); };
  const scene = `<div class="goal"><div class="net"></div>
    <span class="keeper" style="left:${last ? zx[last.dive] : 50}%">🧤</span>
    ${last ? `<span class="ball ${last.goal ? "in" : "out"}" style="left:${zx[last.shot]}%">⚽</span><div class="verdict ${last.goal ? "g" : "s"}">${last.goal ? "GOAL!" : "SAVED!"}</div>` : `<span class="ball" style="left:50%;bottom:-18px">⚽</span>`}</div>`;
  const btn = (c, l) => `<button class="pen ${mine === c ? "picked" : ""}" data-pen="${c}" ${mine || fin ? "disabled" : ""}><b>${l}</b></button>`;
  return `${scene}
  <p class="role">${fin ? "" : iKick ? "🎯 You are the <b>KICKER</b> — pick a corner" : "🧤 You are the <b>KEEPER</b> — pick where to dive"}</p>
  <div class="pens">${btn("L", "⬅️ Left")}${btn("C", "⬆️ Centre")}${btn("R", "➡️ Right")}</div>
  <p class="hint">${fin ? "" : mine ? "Locked in ✔ — waiting for your friend…" : "Same choice = SAVE · different = GOAL"}</p>
  <div class="pgrid"><div class="chip-x"><small>${esc(nameOf("X"))}</small><span>${dots("X")}</span><b>${g.goals.X}</b></div><div class="chip-o"><small>${esc(nameOf("O"))}</small><span>${dots("O")}</span><b>${g.goals.O}</b></div></div>`;
}

/* ---------------- Basketball ---------------- */
let bbPos = 0.5, bbTok = 0;
function drawBasketball(g, my) {
  const row = (m) => { const s = g.shots[m], n = Math.max(g.per, s.length); return Array.from({ length: n }, (_, i) => (s[i] === undefined ? "<i class='pg'>·</i>" : s[i] ? "<i class='pg g'>🏀</i>" : "<i class='pg s'>✕</i>")).join(""); };
  const cnt = (m) => g.shots[m].filter(Boolean).length;
  const l = g.last;
  return `<div class="hoop"><div class="board">🏀</div><div class="verdict ${l && l.made ? "g" : "s"}">${l ? (l.made ? "SWISH! 🎉" : "Miss…") : ""}</div></div>
  <div class="meter"><i class="zy"></i><i class="zg"></i><b id="bmk"></b></div>
  <div class="bs-tools"><button class="primary" data-shoot="1" ${my ? "" : "disabled style='opacity:.45'"}>🏀 SHOOT</button></div>
  <p class="hint">${my ? "Tap SHOOT when the marker is in the GREEN zone!" : "Waiting for " + esc(nameOf(g.turn || other(mark))) + " to shoot…"}</p>
  <div class="pgrid"><div class="chip-x"><small>${esc(nameOf("X"))}</small><span>${row("X")}</span><b>${cnt("X")}</b></div><div class="chip-o"><small>${esc(nameOf("O"))}</small><span>${row("O")}</span><b>${cnt("O")}</b></div></div>`;
}
function postBasketball(g, my) {
  const tok = ++bbTok, t0 = performance.now(), P = 1300;
  const tick = (now) => {
    const el = $("bmk"); if (tok !== bbTok || !el) return;
    const u = ((now - t0) % P) / P; bbPos = u < 0.5 ? u * 2 : 2 - u * 2;
    el.style.left = bbPos * 100 + "%";
    if (g.status === "playing") requestAnimationFrame(tick);
  };
  if (g.status === "playing") requestAnimationFrame(tick);
}

/* ---------------- text race: Word Scramble & Quiz ---------------- */
function scoreChips(g) { return `<div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}: <b>${g.scores.X}</b></span><span class="chip-o">● ${esc(nameOf("O"))}: <b>${g.scores.O}</b></span></div>`; }
function drawScramble(g) {
  const fin = g.status === "finished", locked = g.locked[mark] || fin;
  return `<div class="mathq"><small>WORD ${g.qn} · HINT: ${esc(g.hint).toUpperCase()} · ${g.scr.length} LETTERS · FIRST TO ${g.target}</small><b class="scr">${[...g.scr].join(" ")}</b></div>
  <div class="guessbox"><div class="inline"><input id="txtIn" data-keep style="text-transform:uppercase" autocomplete="off" autocapitalize="characters" placeholder="Your answer" ${locked ? "disabled" : ""}><button class="primary" data-txt="1" ${locked ? "disabled style='opacity:.45'" : ""}>Go</button></div></div>
  <p class="hint">${fin ? (g.word ? "Last word: " + esc(g.word) : "") : g.locked[mark] ? "Wrong — wait for the next word." : "Be fast! A wrong answer locks you out of this word."}</p>${scoreChips(g)}`;
}
function drawQuiz(g) {
  const fin = g.status === "finished", locked = g.locked[mark] || fin;
  return `<div class="quizq"><small>QUESTION ${g.qn} · FIRST TO ${g.target}</small><b>${esc(g.q)}</b></div>
  <div class="opts">${g.opts.map((o, i) => `<button class="opt" data-opt="${i}" ${locked ? "disabled" : ""}><i>${"ABCD"[i]}</i>${esc(o)}</button>`).join("")}</div>
  <p class="hint">${g.reveal ? esc(g.reveal) + " · " : ""}${g.locked[mark] && !fin ? "Wrong — wait for the next question." : "First correct tap scores. Wrong tap = locked out."}</p>${scoreChips(g)}`;
}

/* ---------------- Code Breaker ---------------- */
let cbSlots = [-1, -1, -1, -1], cbRid = 0;
const cdot = (c, extra = "") => `<span class="cdot ${extra}" style="--c:${COLORS6[c]}" title="${COLOR_NAMES[c]}"></span>`;
function drawCode(g, my) {
  if (cbRid !== g.rid) { cbRid = g.rid; cbSlots = [-1, -1, -1, -1]; }
  const fin = g.status === "finished", full = cbSlots.every((v) => v >= 0);
  const hist = g.guesses.slice().reverse().map((x) => `<div class="grow"><span class="chip-${cls(x.by)}">${esc(nameOf(x.by))}</span><span class="gcode">${x.code.map((c) => cdot(c)).join("")}</span><span class="pegs">${"<i class='pk'></i>".repeat(x.exact)}${"<i class='pw'></i>".repeat(x.part)}</span></div>`).join("");
  return `${fin && g.secret ? `<p class="hint">Secret code:</p><div class="gcode big">${g.secret.map((c) => cdot(c)).join("")}</div>` : `<p class="hint"><b>${g.max - g.guesses.length}</b> guesses left · ⚫ right spot · ⚪ right colour, wrong spot</p>`}
  <div class="gcode big slots">${cbSlots.map((c, i) => `<button class="slot" data-cbs="${i}" ${my ? "" : "disabled"}>${c >= 0 ? cdot(c) : ""}</button>`).join("")}</div>
  <div class="palette">${COLORS6.map((_, c) => `<button class="pal" data-cbc="${c}" ${my ? "" : "disabled"}>${cdot(c)}</button>`).join("")}</div>
  <div class="bs-tools"><button class="primary" data-cbsub="1" ${my && full ? "" : "disabled style='opacity:.45'"}>Submit guess</button><button class="quiet" data-cbclr="1" ${my ? "" : "disabled"}>Clear</button></div>
  <div class="ghist">${hist || "<span class='hint'>No guesses yet</span>"}</div>`;
}

/* ---------------- Sequence Memory ---------------- */
const PAD4 = ["#ff4d4d", "#3ddc97", "#4da3ff", "#ffd23f"];
let seqPb = -1, seqRid = 0, seqPlaying = false, seqTimers = [];
function drawSequence(g, my) {
  if (seqRid !== g.rid) { seqRid = g.rid; seqPb = g.pb; seqPlaying = false; seqTimers.forEach(clearTimeout); }
  if (g.pb !== seqPb && g.seq.length && g.status === "playing") seqPlaying = true;
  const can = my && !seqPlaying;
  return `<div class="seqinfo"><b>${g.seq.length}</b><small>${g.status === "finished" ? "FINAL LENGTH" : seqPlaying ? "WATCH THE PATTERN…" : my ? (g.step < g.seq.length ? `REPEAT · ${g.step}/${g.seq.length}` : g.seq.length ? "ADD ONE NEW COLOUR" : "START THE PATTERN — TAP ANY COLOUR") : "RIVAL'S TURN"}</small></div>
  <div class="pads4">${PAD4.map((c, i) => `<button class="spad" data-seq="${i}" style="--c:${c}" ${can ? "" : "disabled"}></button>`).join("")}</div>`;
}
function postSequence(g, my) {
  if (g.pb === seqPb || !seqPlaying) return;
  seqPb = g.pb; seqTimers.forEach(clearTimeout); seqTimers = [];
  g.seq.forEach((p, i) => {
    seqTimers.push(setTimeout(() => { const b = document.querySelectorAll(".spad")[p]; if (b) { b.classList.add("lit"); setTimeout(() => b.classList.remove("lit"), 420); } }, 700 + i * 650));
  });
  seqTimers.push(setTimeout(() => { seqPlaying = false; const me = state && state.game.turn === mark && state.game.status === "playing"; document.querySelectorAll(".spad").forEach((b) => (b.disabled = !me)); }, 700 + g.seq.length * 650 + 150));
}

/* ---------------- Color Pattern Duel ---------------- */
let cdAtt = [], cdKey = "";
function drawColorDuel(g) {
  const key = g.rid + ":" + g.qn; if (key !== cdKey) { cdKey = key; cdAtt = []; }
  const fin = g.status === "finished", input = g.phase === "input" && !fin, locked = g.locked[mark];
  const body = g.phase === "show" && !fin
    ? `<p class="hint big">👀 MEMORISE!</p><div class="gcode big">${g.pattern.map((c) => cdot(c, "lg")).join("")}</div>`
    : `<p class="hint big">${fin ? "Round over" : locked ? "Wrong! Wait for the next pattern…" : "GO! Tap the colours in order"}</p>
       <div class="gcode big">${Array.from({ length: g.plen }, (_, i) => (cdAtt[i] !== undefined ? cdot(cdAtt[i], "lg") : `<span class="cdot lg empty"></span>`)).join("")}</div>
       <div class="palette">${COLORS6.map((_, c) => `<button class="pal" data-cdc="${c}" ${input && !locked ? "" : "disabled"}>${cdot(c)}</button>`).join("")}</div>
       <div class="bs-tools"><button class="quiet" data-cdclr="1" ${input && !locked ? "" : "disabled"}>Clear</button></div>`;
  return `<div class="mathq"><small>ROUND ${g.qn} · ${g.plen} COLOURS · FIRST TO ${g.target}</small></div>${body}${scoreChips(g)}`;
}

/* ---------------- Maze Race ---------------- */
function drawMaze(g) {
  const N = g.n, cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const w = g.maze[y * N + x], at = (m) => g.pos[m][0] === x && g.pos[m][1] === y;
    const goal = x === N - 1 && y === N - 1;
    cells.push(`<div class="mz ${w & 1 ? "wn" : ""} ${w & 2 ? "we" : ""} ${w & 4 ? "ws" : ""} ${w & 8 ? "ww" : ""}">${goal ? "⭐" : ""}${at("X") ? "<b class='mt x'></b>" : ""}${at("O") ? "<b class='mt o'></b>" : ""}</div>`);
  }
  const pad = (d, l) => `<button class="dp" data-mz="${d}">${l}</button>`;
  return `<div class="maze" style="--n:${N}">${cells.join("")}</div>
  <div class="dpad"><span></span>${pad("U", "▲")}<span></span>${pad("L", "◀")}${pad("D", "▼")}${pad("R", "▶")}</div>
  <div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}</span><span class="chip-o">● ${esc(nameOf("O"))}</span><span>Arrow keys / WASD also work</span></div>`;
}

/* ---------------- Whack-a-Mole ---------------- */
function drawWhack(g) {
  const hit = g.lastHit;
  return `<div class="mole-info"><b>Mole ${Math.min(g.spawned, g.total)}/${g.total}</b></div>
  <div class="holes">${Array.from({ length: 9 }, (_, i) => `<button class="hole ${g.hole === i ? "up" : ""} ${g.hole === null && hit && hit.hole === i ? "hit " + cls(hit.by) : ""}" data-hole="${i}" ${g.status === "playing" ? "" : "disabled"}><span>${g.hole === i ? "🐹" : g.hole === null && hit && hit.hole === i ? "💥" : ""}</span></button>`).join("")}</div>
  ${scoreChips(g)}<p class="hint">Tap the mole first! Tapping an empty hole = 0.7 s penalty</p>`;
}

/* ================= real-time (persistent canvas) games ================= */
const RTH = { stop: null, timers: [] };
function rtStop() { if (RTH.stop) { RTH.stop.stop(); RTH.stop = null; } RTH.timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); RTH.timers = []; seqTimers.forEach(clearTimeout); tkTok++; bbTok++; }
const throttle = (() => { let last = 0, tm = null; return (fn, ms = 35) => { const now = performance.now(); clearTimeout(tm); if (now - last >= ms) { last = now; fn(); } else tm = setTimeout(() => { last = performance.now(); fn(); }, ms); }; })();
const quietAct = (d) => socket.emit("action", d, () => {});
const scoreBar = (g) => `<div class="sub-info"><span class="chip-x">● ${esc(nameOf("X"))}: <b id="sX">${g.scores ? g.scores.X : 0}</b></span><span class="chip-o">● ${esc(nameOf("O"))}: <b id="sO">${g.scores ? g.scores.O : 0}</b></span></div>`;
const setScores = (g) => { if ($("sX") && g.scores) { $("sX").textContent = g.scores.X; $("sO").textContent = g.scores.O; } };
const dpad = (attr) => `<div class="dpad"><span></span><button class="dp" ${attr}="U">▲</button><span></span><button class="dp" ${attr}="L">◀</button><button class="dp" ${attr}="D">▼</button><button class="dp" ${attr}="R">▶</button></div>`;

const RT2 = {
  /* ---- Snake ---- */
  snake: {
    build: (g) => `<canvas id="rtc" class="rtc" width="400" height="400"></canvas>${dpad("data-dir")}${scoreBar(g)}<p class="hint">Steer with arrow keys / WASD, the D-pad or by swiping on the board. First to ${g.target} apples wins.</p>`,
    init() {
      const c = $("rtc"); let sx = 0, sy = 0;
      c.onpointerdown = (e) => { sx = e.clientX; sy = e.clientY; };
      c.onpointerup = (e) => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return; quietAct({ dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U") }); };
    },
    paint(g) {
      const c = $("rtc"); if (!c) return; const ctx = c.getContext("2d"), s = c.width / g.n;
      ctx.fillStyle = "#120f2b"; ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = "#ffffff08"; for (let y = 0; y < g.n; y++) for (let x = 0; x < g.n; x++) if ((x + y) % 2) ctx.fillRect(x * s, y * s, s, s);
      if (g.food) { ctx.font = `${s * 0.9}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🍎", g.food[0] * s + s / 2, g.food[1] * s + s / 2 + 1); }
      for (const m of ["X", "O"]) g.snakes[m].forEach(([x, y], i) => { ctx.fillStyle = m === "X" ? (i ? "#e0a53a" : "#ffd36e") : (i ? "#d94374" : "#ff7da3"); ctx.fillRect(x * s + 1, y * s + 1, s - 2, s - 2); if (!i) { ctx.fillStyle = "#111"; ctx.fillRect(x * s + 5, y * s + 5, 3, 3); ctx.fillRect(x * s + s - 8, y * s + 5, 3, 3); } });
      setScores(g);
    }
  },
  /* ---- Pong ---- */
  pong: {
    build: (g) => `<canvas id="rtc" class="rtc" width="${g.W}" height="${g.H}"></canvas>${scoreBar(g)}<p class="hint">Drag on the board (or use ↑ ↓ / W S) to move your paddle · first to ${g.target}</p>`,
    init(g) {
      const c = $("rtc"); window.pgLocal = g.H / 2;
      const mv = (e) => { const r = c.getBoundingClientRect(); window.pgLocal = (e.clientY - r.top) * g.H / r.height; throttle(() => quietAct({ y: window.pgLocal })); };
      c.onpointermove = mv; c.onpointerdown = mv;
    },
    paint(g) {
      const c = $("rtc"); if (!c) return; const ctx = c.getContext("2d"), W = g.W, H = g.H, half = g.ph / 2;
      ctx.fillStyle = "#120f2b"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#ffffff30"; ctx.setLineDash([8, 10]); ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
      const yX = mark === "X" && window.pgLocal ? window.pgLocal : g.pad.X, yO = mark === "O" && window.pgLocal ? window.pgLocal : g.pad.O;
      ctx.fillStyle = "#ffc24b"; ctx.fillRect(12, clampN(yX, half, H - half) - half, 8, g.ph);
      ctx.fillStyle = "#ff5c8a"; ctx.fillRect(W - 20, clampN(yO, half, H - half) - half, 8, g.ph);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(g.ball.x, g.ball.y, 7, 0, 7); ctx.fill();
      ctx.font = "700 34px 'Space Grotesk',sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#ffc24b66"; ctx.fillText(g.scores.X, W / 2 - 44, 40); ctx.fillStyle = "#ff5c8a66"; ctx.fillText(g.scores.O, W / 2 + 44, 40);
      setScores(g);
    }
  },
  /* ---- Air Hockey ---- */
  airhockey: {
    build: (g) => `<canvas id="rtc" class="rtc tall" width="${g.W}" height="${g.H}"></canvas>${scoreBar(g)}<p class="hint">Drag your mallet on your half (bottom). First to ${g.target} goals!</p>`,
    init(g) {
      const c = $("rtc");
      const mv = (e) => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) * g.W / r.width, y = (e.clientY - r.top) * g.H / r.height; throttle(() => quietAct({ x, y }), 30); };
      c.onpointermove = (e) => { if (e.buttons || e.pointerType === "mouse") mv(e); }; c.onpointerdown = (e) => { try { c.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } mv(e); };
    },
    paint(g) {
      const c = $("rtc"); if (!c) return; const ctx = c.getContext("2d"), W = g.W, H = g.H;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#0d1f3a"; ctx.fillRect(0, 0, W, H);
      if (mark === "O") { ctx.translate(W, H); ctx.rotate(Math.PI); }
      ctx.strokeStyle = "#4da3ff66"; ctx.lineWidth = 3; ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, H / 2, 40, 0, 7); ctx.stroke();
      ctx.fillStyle = "#ff5c8a55"; ctx.fillRect(W / 2 - g.gw / 2, 0, g.gw, 8); ctx.fillStyle = "#ffc24b55"; ctx.fillRect(W / 2 - g.gw / 2, H - 8, g.gw, 8);
      ctx.fillStyle = "#ffc24b"; ctx.beginPath(); ctx.arc(g.mal.X.x, g.mal.X.y, 22, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff5c8a"; ctx.beginPath(); ctx.arc(g.mal.O.x, g.mal.O.y, 22, 0, 7); ctx.fill();
      ctx.fillStyle = "#0008"; for (const m of ["X", "O"]) { ctx.beginPath(); ctx.arc(g.mal[m].x, g.mal[m].y, 9, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(g.puck.x, g.puck.y, 13, 0, 7); ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0); setScores(g);
    }
  },
  /* ---- Draw & Guess ---- */
  drawguess: {
    build(g) {
      const drawer = g.drawer === mark;
      const cols = ["#111111", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ffffff"];
      return `<div class="dg-top"><span id="dgMask"></span><span class="dg-time" id="dgTime">90</span></div>
      <canvas id="dgc" class="drawc" width="800" height="600"></canvas>
      ${drawer ? `<div class="dg-tools"><div class="dg-cols">${cols.map((c, i) => `<button class="dgc ${i === 0 ? "sel" : ""}" data-dgc="${i}" style="background:${c}"></button>`).join("")}</div>
        <div class="dg-sizes">${[3, 8, 16].map((w, i) => `<button class="dgw ${i === 0 ? "sel" : ""}" data-dgw="${w}"><i style="width:${w + 4}px;height:${w + 4}px"></i></button>`).join("")}</div>
        <button class="quiet" data-dgundo="1">↶ Undo</button><button class="quiet" data-dgclear="1">🗑 Clear</button></div>`
        : `<div class="guessbox"><div class="inline"><input id="dgIn" autocomplete="off" placeholder="Type your guess" style="text-transform:uppercase"><button class="primary" data-dgguess="1">Guess</button></div></div>`}
      <div class="chips" id="dgGuess"></div>
      <p class="hint">${drawer ? "Draw the word! No letters or numbers. Finished strokes appear for your friend." : "Guess what your friend is drawing — 90 seconds!"}</p>`;
    },
    init(g) {
      window.dgColor = "#111111"; window.dgW = 3; window.dgEnds = g.endsAt;
      const c = $("dgc"), ctx = c.getContext("2d"), drawer = g.drawer === mark; let pts = null;
      const pos = (e) => { const r = c.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * 1000 / r.width), Math.round((e.clientY - r.top) * 1000 / r.height)]; };
      if (drawer) {
        c.onpointerdown = (e) => { pts = [pos(e)]; try { c.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } };
        c.onpointermove = (e) => { if (!pts) return; const p = pos(e), q = pts[pts.length - 1]; pts.push(p); ctx.strokeStyle = window.dgColor; ctx.lineWidth = window.dgW * 800 / 360; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(q[0] * 0.8, q[1] * 0.6); ctx.lineTo(p[0] * 0.8, p[1] * 0.6); ctx.stroke(); };
        const up = () => { if (!pts) return; let s = pts; if (s.length > 380) s = s.filter((_, i) => i % Math.ceil(s.length / 380) === 0 || i === s.length - 1); if (s.length === 1) s = [s[0], s[0]]; quietAct({ op: "stroke", c: ["#111111", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ffffff"].indexOf(window.dgColor), w: window.dgW, pts: s }); pts = null; };
        c.onpointerup = up; c.onpointercancel = up;
      }
      RTH.timers.push(setInterval(() => { const el = $("dgTime"); if (!el) return; el.textContent = Math.max(0, Math.ceil((window.dgEnds - Date.now()) / 1000)); }, 500));
    },
    paint(g) {
      const c = $("dgc"); if (!c) return; const ctx = c.getContext("2d"); window.dgEnds = g.endsAt;
      const cols = ["#111111", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ffffff"];
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 800, 600); ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const s of g.strokes) { ctx.strokeStyle = cols[s.c] || "#111"; ctx.lineWidth = s.w * 800 / 360; ctx.beginPath(); s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * 0.8, y * 0.6) : ctx.moveTo(x * 0.8, y * 0.6))); ctx.stroke(); }
      const w = g.word, drawer = g.drawer === mark;
      $("dgMask").innerHTML = (g.status === "finished" && w) || drawer ? `${drawer ? "✏️ Draw: " : "Word: "}<b>${esc(w || "")}</b> <small>(${esc(g.hint)})</small>` : `💭 ${esc(g.hint)} · ${"_ ".repeat(g.len).trim()}`;
      $("dgGuess").innerHTML = g.guesses.slice(-8).map((x) => `<span class="gchip ${x.by === "X" ? "p1" : "p2"}">${esc(nameOf(x.by))}: ${esc(x.text)}</span>`).join("");
    }
  }
};
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- race games (each player plays locally, score sent to the server) ---- */
for (const id of Object.keys(Arcade.KINDS)) {
  const K = Arcade.KINDS[id];
  RT2[id] = {
    build: (g) => `<div class="rhud"><span id="rTime">⏱ ${g.limit}s</span><span id="rMe">You: 0</span><span id="rFoe">…</span></div>
      <div class="rwrap"><canvas id="rcv" class="rtc rc-${id}" width="${K.w}" height="${K.h}"></canvas><div id="rCount" class="rcount">3</div></div>
      <p class="hint" id="rHint">Get ready… the race starts after the countdown.</p>`,
    init(g) {
      const cv = $("rcv"), cnt = $("rCount"); let n = 3, done = false;
      const tick = () => {
        if (!$("rcv")) return;
        if (n > 0) { cnt.textContent = n--; RTH.timers.push(setTimeout(tick, 800)); return; }
        cnt.textContent = "GO!"; RTH.timers.push(setTimeout(() => cnt.classList.add("hidden"), 500));
        RTH.stop = Arcade.run(id, cv, {
          seed: g.seed, limit: g.limit,
          onHud: (s, left) => { if ($("rMe")) { $("rMe").textContent = `You: ${s}`; $("rTime").textContent = `⏱ ${Math.ceil(left)}s`; } },
          onLive: (s) => quietAct({ op: "live", score: s }),
          onEnd: (s) => { if (done) return; done = true; socket.emit("action", { op: "final", score: s }, () => {}); if ($("rHint")) $("rHint").textContent = `You finished with ${s} ${g.unit}. Waiting for your friend…`; }
        });
      };
      RTH.timers.push(setTimeout(tick, 300));
    },
    paint(g) {
      const f = other(mark); if ($("rFoe")) $("rFoe").textContent = `${nameOf(f)}: ${g.live[f]}${g.final[f] !== null ? " ✔" : ""}`;
      if (g.status === "finished" && RTH.stop) { RTH.stop.stop(); RTH.stop = null; if ($("rHint")) $("rHint").textContent = g.message; }
    }
  };
}

/* ================= registries used by app.js ================= */
const DRAW2 = { snakeladder: drawSnakeLadder, ludo: drawLudo, dominoes: drawDominoes, mancala: drawMancala, tanks: drawTanks, penalty: drawPenalty, basketball: drawBasketball, wordscramble: drawScramble, quiz: drawQuiz, codebreaker: drawCode, sequence: drawSequence, colorduel: drawColorDuel, maze: drawMaze, whack: drawWhack };
const POST2 = { snakeladder: postSnakeLadder, tanks: postTanks, basketball: postBasketball, sequence: postSequence };

/* clicks inside the game area; returns true when handled */
function click2(t, d, g) {
  if (d.ready) { socket.emit("ready-rules", {}, (r) => { if (r && !r.ok) toast(r.message); }); return true; }
  if (d.ludo) { act({ op: "roll" }); return true; }
  if (d.sl) { act({ op: "roll" }); return true; }
  if (d.tok !== undefined) { act({ op: "move", token: +d.tok }); return true; }
  if (d.dom !== undefined) {
    const mine = g.hands[mark] || [], i = +d.dom, tile = mine[i], ends = g.chain.length ? [g.chain[0][0], g.chain[g.chain.length - 1][1]] : null;
    if (!ends) { act({ op: "play", tile: i }); return true; }
    const fl = tile.includes(ends[0]), fr = tile.includes(ends[1]);
    if (fl && fr && ends[0] !== ends[1]) { domSel = domSel === i ? null : i; draw(g); } else act({ op: "play", tile: i, end: fl && !fr ? "L" : "R" });
    return true;
  }
  if (d.domend) { const i = domSel; domSel = null; act({ op: "play", tile: i, end: d.domend }); return true; }
  if (d.domdraw) { act({ op: "draw" }); return true; }
  if (d.dompass) { act({ op: "pass" }); return true; }
  if (d.pit !== undefined) { act({ pit: +d.pit }); return true; }
  if (d.tfire) { act({ angle: tkAngle, power: tkPower }); return true; }
  if (d.pen) { act({ pick: d.pen }); return true; }
  if (d.shoot) { act({ power: Math.round(bbPos * 100) }); return true; }
  if (d.txt) { submitText(); return true; }
  if (d.opt !== undefined) { act({ choice: +d.opt }); return true; }
  if (d.cbc !== undefined) { const i = cbSlots.indexOf(-1); if (i >= 0) { cbSlots[i] = +d.cbc; draw(g); } return true; }
  if (d.cbs !== undefined) { cbSlots[+d.cbs] = -1; draw(g); return true; }
  if (d.cbclr) { cbSlots = [-1, -1, -1, -1]; draw(g); return true; }
  if (d.cbsub) { const code = cbSlots.slice(); cbSlots = [-1, -1, -1, -1]; act({ code }); return true; }
  if (d.seq !== undefined) { act({ pad: +d.seq }); return true; }
  if (d.cdc !== undefined) { cdAtt.push(+d.cdc); if (cdAtt.length >= g.plen) { const a = cdAtt.slice(); act({ attempt: a }); } draw(g); return true; }
  if (d.cdclr) { cdAtt = []; draw(g); return true; }
  if (d.mz) { quietAct({ dir: d.mz }); return true; }
  if (d.hole !== undefined) { act({ hole: +d.hole }); return true; }
  if (d.dir) { quietAct({ dir: d.dir }); return true; }
  if (d.dgc !== undefined) { window.dgColor = ["#111111", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ffffff"][+d.dgc]; document.querySelectorAll(".dgc").forEach((b) => b.classList.toggle("sel", b === t)); return true; }
  if (d.dgw !== undefined) { window.dgW = +d.dgw; document.querySelectorAll(".dgw").forEach((b) => b.classList.toggle("sel", b === t)); return true; }
  if (d.dgundo) { act({ op: "undo" }); return true; }
  if (d.dgclear) { act({ op: "clear" }); return true; }
  if (d.dgguess) { submitGuess(); return true; }
  return false;
}
function submitText() { const el = $("txtIn"); if (!el || !el.value.trim()) return toast("Type your answer first"); const v = el.value; el.value = ""; act({ text: v }); }
function submitGuess() { const el = $("dgIn"); if (!el || !el.value.trim()) return toast("Type a guess first"); const v = el.value; el.value = ""; act({ op: "guess", text: v }); }

/* keyboard: arrows / WASD for snake, maze, pong; Enter for text boxes */
function key2(e) {
  if (!state || !state.game) return;
  const g = state.game, k = e.key, tgt = e.target;
  if (tgt && tgt.tagName === "INPUT" && !(tgt.type === "range")) {
    if (k === "Enter" && tgt.id === "txtIn") submitText();
    if (k === "Enter" && tgt.id === "dgIn") submitGuess();
    return;
  }
  if (g.status !== "playing" || g.gate) return;
  const map = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", W: "U", s: "D", S: "D", a: "L", A: "L", d: "R", D: "R" };
  if (!map[k]) return;
  if (g.id === "snake" || g.id === "maze") { e.preventDefault(); quietAct({ dir: map[k] }); }
  if (g.id === "pong" && (map[k] === "U" || map[k] === "D")) {
    e.preventDefault(); const H = g.H; window.pgLocal = clampN((window.pgLocal ?? g.pad[mark]) + (map[k] === "U" ? -16 : 16), g.ph / 2, H - g.ph / 2); throttle(() => quietAct({ y: window.pgLocal }), 25);
  }
}
document.addEventListener("keydown", key2);

/* sliders for tank battle */
document.addEventListener("input", (e) => {
  if (e.target.id === "tkA") { tkAngle = +e.target.value; $("tkAv").textContent = tkAngle + "°"; }
  if (e.target.id === "tkP") { tkPower = +e.target.value; $("tkPv").textContent = tkPower; }
});
