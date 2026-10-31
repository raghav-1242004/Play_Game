// extra.js — 23 extra games for PlayRoom (server side, authoritative)
module.exports = function (ctx) {
  const { rooms, finish, emit, nm, other, shuffle } = ctx;
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const live = (room, g) => rooms.get(room.code) === room && room.game === g && g.status === "playing" && !g.gate;
  const loop = (room, g, ms, fn) => {
    const iv = setInterval(() => { if (!live(room, g)) return clearInterval(iv); fn(); emit(room); }, ms);
  };
  const later = (room, g, ms, fn) => setTimeout(() => { if (live(room, g)) { fn(); emit(room); } }, ms);
  const quiet = { quiet: true };

  const IDS = ["ludo", "snakeladder", "dominoes", "mancala", "snake", "pong", "brickbreaker", "spaceshooter", "tanks", "platformrace",
    "carracing", "bikeracing", "penalty", "basketball", "airhockey", "minigolf", "wordscramble", "quiz", "codebreaker",
    "sequence", "colorduel", "maze", "whack", "drawguess"];

  const lv = (level, easy, medium, hard) => (level === "easy" ? easy : level === "hard" ? hard : medium);

  /* ================= Snake & Ladder boards (one per level) ================= */
  // [from, to]: ladders go UP, snakes go DOWN. No chains, nothing on 1 or 100.
  const SL_BOARDS = {
    easy: {
      ladders: [[2, 23], [6, 45], [20, 59], [28, 84], [36, 57], [51, 67], [71, 91]],
      snakes: [[47, 26], [62, 41], [87, 69], [98, 79]]
    },
    medium: {
      ladders: [[4, 25], [13, 46], [33, 49], [42, 63], [50, 69], [62, 81], [74, 92]],
      snakes: [[27, 5], [40, 3], [43, 18], [54, 31], [66, 45], [76, 58], [89, 53], [99, 41]]
    },
    hard: {
      ladders: [[3, 22], [8, 30], [28, 76], [58, 77], [71, 90]],
      snakes: [[16, 6], [32, 10], [48, 26], [62, 18], [64, 60], [73, 53], [87, 24], [93, 68], [95, 75], [99, 7]]
    }
  };

  /* ================= data ================= */
  const LUDO_PATH = (() => {
    const p = [];
    for (let c = 1; c <= 5; c++) p.push([6, c]);
    for (let r = 5; r >= 0; r--) p.push([r, 6]);
    p.push([0, 7]);
    for (let r = 0; r <= 5; r++) p.push([r, 8]);
    for (let c = 9; c <= 14; c++) p.push([6, c]);
    p.push([7, 14]);
    for (let c = 14; c >= 9; c--) p.push([8, c]);
    for (let r = 9; r <= 14; r++) p.push([r, 8]);
    p.push([14, 7]);
    for (let r = 14; r >= 9; r--) p.push([r, 6]);
    for (let c = 5; c >= 0; c--) p.push([8, c]);
    p.push([7, 0]); p.push([6, 0]);
    return p;
  })();
  const LUDO_SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const ludoAbs = (m, pos) => ((m === "X" ? 0 : 26) + pos) % 52;

  const SCRAMBLE = [["PLANET", "Space"], ["ROCKET", "Space"], ["GALAXY", "Space"], ["TIGER", "Animal"], ["MONKEY", "Animal"], ["PARROT", "Animal"],
    ["BANANA", "Fruit"], ["ORANGE", "Fruit"], ["MANGO", "Fruit"], ["CRICKET", "Sport"], ["TENNIS", "Sport"], ["HOCKEY", "Sport"],
    ["GUITAR", "Music"], ["DRUMS", "Music"], ["SCHOOL", "Place"], ["GARDEN", "Place"], ["BRIDGE", "Place"], ["CANDLE", "Object"],
    ["WINDOW", "Object"], ["POCKET", "Object"], ["JUNGLE", "Nature"], ["RIVER", "Nature"], ["CLOUD", "Nature"], ["SAMOSA", "Food"],
    ["PANEER", "Food"], ["LAPTOP", "Tech"], ["MOBILE", "Tech"], ["FRIEND", "People"], ["DOCTOR", "People"], ["PILOT", "People"]];

  const QUIZ = [
    ["Capital of Australia?", "Canberra", "Sydney", "Melbourne", "Perth"],
    ["Which planet is called the Red Planet?", "Mars", "Venus", "Jupiter", "Mercury"],
    ["How many continents are there?", "7", "5", "6", "8"],
    ["National animal of India?", "Tiger", "Lion", "Elephant", "Leopard"],
    ["Largest ocean on Earth?", "Pacific", "Atlantic", "Indian", "Arctic"],
    ["Fastest land animal?", "Cheetah", "Horse", "Lion", "Leopard"],
    ["Chemical symbol of gold?", "Au", "Ag", "Gd", "Go"],
    ["Taj Mahal is in which city?", "Agra", "Delhi", "Jaipur", "Lucknow"],
    ["Who painted the Mona Lisa?", "Leonardo da Vinci", "Picasso", "Van Gogh", "Michelangelo"],
    ["Largest planet in our solar system?", "Jupiter", "Saturn", "Earth", "Neptune"],
    ["Capital of Japan?", "Tokyo", "Kyoto", "Osaka", "Seoul"],
    ["National flower of India?", "Lotus", "Rose", "Marigold", "Jasmine"],
    ["Smallest prime number?", "2", "1", "3", "0"],
    ["How many sides does a hexagon have?", "6", "5", "7", "8"],
    ["Hardest natural substance?", "Diamond", "Gold", "Iron", "Quartz"],
    ["Which organ pumps blood?", "Heart", "Liver", "Lungs", "Kidney"],
    ["Square root of 144?", "12", "14", "11", "16"],
    ["How many legs does a spider have?", "8", "6", "10", "4"],
    ["First Prime Minister of India?", "Jawaharlal Nehru", "Gandhi", "Sardar Patel", "Rajendra Prasad"],
    ["Gateway of India is in which city?", "Mumbai", "Kolkata", "Chennai", "Goa"],
    ["Currency of Japan?", "Yen", "Won", "Yuan", "Dollar"],
    ["How many pieces does each chess player start with?", "16", "12", "20", "8"],
    ["Which gas do plants take in?", "Carbon dioxide", "Oxygen", "Nitrogen", "Helium"],
    ["Who wrote the Ramayana?", "Valmiki", "Vyasa", "Tulsidas", "Kalidasa"],
    ["Which is the largest mammal?", "Blue whale", "Elephant", "Giraffe", "Hippo"],
    ["Boiling point of water at sea level?", "100°C", "90°C", "120°C", "80°C"]
  ];
  const DRAW_WORDS = [["HOUSE", "Place"], ["TREE", "Nature"], ["CAT", "Animal"], ["SUN", "Nature"], ["CAR", "Vehicle"], ["FISH", "Animal"], ["FLOWER", "Nature"],
    ["APPLE", "Fruit"], ["BOAT", "Vehicle"], ["STAR", "Sky"], ["BICYCLE", "Vehicle"], ["UMBRELLA", "Object"], ["ROCKET", "Space"], ["KITE", "Toy"],
    ["CLOCK", "Object"], ["MOUNTAIN", "Nature"], ["BUTTERFLY", "Animal"], ["ICE CREAM", "Food"], ["GUITAR", "Music"], ["ELEPHANT", "Animal"]];

  const RACE = {
    brickbreaker: { limit: 60, high: true, unit: "points" }, spaceshooter: { limit: 45, high: true, unit: "points" },
    platformrace: { limit: 35, high: true, unit: "m" }, carracing: { limit: 40, high: true, unit: "m" },
    bikeracing: { limit: 40, high: true, unit: "m" }, minigolf: { limit: 150, high: false, unit: "strokes" }
  };

  /* ================= builders ================= */
  function emptyFood(g) {
    const used = new Set([...g.snakes.X, ...g.snakes.O].map(([x, y]) => x + "," + y));
    let x, y; do { x = R(0, g.n - 1); y = R(0, g.n - 1); } while (used.has(x + "," + y));
    return [x, y];
  }
  function makeMaze(N) {
    const cells = Array(N * N).fill(15), seen = Array(N * N).fill(false), st = [0]; seen[0] = true;
    const D = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
    while (st.length) {
      const i = st[st.length - 1], x = i % N, y = Math.floor(i / N);
      const nb = shuffle(D.slice()).filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny * N + nx]; });
      if (!nb.length) { st.pop(); continue; }
      const [dx, dy, a, b] = nb[0], j = (y + dy) * N + x + dx;
      cells[i] &= ~a; cells[j] &= ~b; seen[j] = true; st.push(j);
    }
    return cells;
  }
  const newPattern = (n, k) => Array.from({ length: n }, () => R(0, k - 1));
  const pickQuiz = (g) => {
    const left = QUIZ.map((_, i) => i).filter((i) => !g._used.includes(i));
    const i = left.length ? left[R(0, left.length - 1)] : R(0, QUIZ.length - 1);
    g._used.push(i);
    const [q, right, ...wrong] = QUIZ[i], opts = shuffle([right, ...wrong]);
    g.q = q; g.opts = opts; g._ans = opts.indexOf(right);
  };
  const pickWord = (g) => {
    const left = SCRAMBLE.filter(([w]) => !g._used.includes(w));
    const [w, h] = left.length ? left[R(0, left.length - 1)] : SCRAMBLE[R(0, SCRAMBLE.length - 1)];
    g._used.push(w); g._word = w; g.hint = h;
    let s; do { s = shuffle([...w]).join(""); } while (s === w);
    g.scr = s;
  };

  function blank(id, base) {
    const st = base.turn;
    if (RACE[id]) return { ...base, turn: null, race: true, seed: R(1, 999999999), limit: RACE[id].limit, high: RACE[id].high, unit: RACE[id].unit, final: { X: null, O: null }, live: { X: 0, O: 0 } };
    switch (id) {
      case "snakeladder": {
        const b = SL_BOARDS[base.level] || SL_BOARDS.medium, jump = {};
        for (const [a, z] of b.ladders) jump[a] = { to: z, type: "ladder" };
        for (const [a, z] of b.snakes) jump[a] = { to: z, type: "snake" };
        return { ...base, pos: { X: 0, O: 0 }, die: null, rollId: 0, sixes: 0, busy: false, exact: base.level !== "easy", ladders: b.ladders, snakes: b.snakes, _jump: jump, last: null };
      }
      case "ludo": return { ...base, tokens: { X: [-1, -1, -1, -1], O: [-1, -1, -1, -1] }, phase: "roll", die: null, rollId: 0, sixes: 0, movable: [], path: LUDO_PATH };
      case "dominoes": {
        const all = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]);
        shuffle(all);
        return { ...base, chain: [], hands: { X: all.slice(0, 7), O: all.slice(7, 14) }, boneyard: all.slice(14), passes: 0 };
      }
      case "mancala": return { ...base, turn: st, pits: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], lastPit: null };
      case "snake": {
        const g = { ...base, tick: lv(base.level, 190, 140, 95), turn: null, n: 20, snakes: { X: [[5, 10], [4, 10], [3, 10]], O: [[14, 10], [15, 10], [16, 10]] }, dir: { X: "R", O: "L" }, _next: { X: "R", O: "L" }, scores: { X: 0, O: 0 }, target: lv(base.level, 7, 10, 12) };
        g.food = emptyFood(g); return g;
      }
      case "pong": return { ...base, turn: null, W: 400, H: 300, ph: 64, ball: { x: 200, y: 150, vx: 0, vy: 0 }, pad: { X: 150, O: 150 }, scores: { X: 0, O: 0 }, target: 5, _wait: 30, _toward: st };
      case "airhockey": return { ...base, turn: null, W: 300, H: 480, gw: 120, puck: { x: 150, y: 240, vx: 0, vy: 0 }, mal: { X: { x: 150, y: 420 }, O: { x: 150, y: 60 } }, _tgt: { X: { x: 150, y: 420 }, O: { x: 150, y: 60 } }, scores: { X: 0, O: 0 }, target: 5, _wait: 30 };
      case "tanks": return { ...base, hp: { X: 100, O: 100 }, wind: R(-5, 5), shot: null, shotId: 0 };
      case "penalty": return { ...base, turn: null, picks: { X: null, O: null }, kicker: st, goals: { X: 0, O: 0 }, log: [], per: 5 };
      case "basketball": return { ...base, shots: { X: [], O: [] }, per: 5, last: null };
      case "wordscramble": { const g = { ...base, turn: null, scores: { X: 0, O: 0 }, qn: 1, target: 3, locked: { X: false, O: false }, _used: [] }; pickWord(g); return g; }
      case "quiz": { const g = { ...base, turn: null, scores: { X: 0, O: 0 }, qn: 1, target: 3, locked: { X: false, O: false }, _used: [], reveal: "" }; pickQuiz(g); return g; }
      case "codebreaker": return { ...base, colors: 6, len: 4, guesses: [], max: 12, _secret: newPattern(4, 6) };
      case "sequence": return { ...base, seq: [], step: 0, pb: 0 };
      case "colorduel": return { ...base, turn: null, scores: { X: 0, O: 0 }, target: 3, qn: 1, pads: 6, phase: "show", pattern: newPattern(4, 6), locked: { X: false, O: false } };
      case "maze": { const n = lv(base.level, 9, 11, 15); return { ...base, turn: null, n, maze: makeMaze(n), pos: { X: [0, 0], O: [0, 0] } }; }
      case "whack": return { ...base, turn: null, scores: { X: 0, O: 0 }, total: 20, spawned: 0, hole: null, holeId: 0, lastHit: null, _lock: { X: 0, O: 0 }, _tk: 0, _base: lv(base.level, 1500, 1150, 900), _min: lv(base.level, 950, 650, 450) };
      case "drawguess": {
        const [w, h] = DRAW_WORDS[R(0, DRAW_WORDS.length - 1)];
        return { ...base, turn: null, drawer: st, _word: w, hint: h, len: w.length, strokes: [], guesses: [], timeLimit: 90, endsAt: null };
      }
    }
  }

  function intro(room, g) {
    const first = nm(room, g.turn || "X");
    switch (g.id) {
      case "ludo": return `${first} rolls first. Roll a 6 to leave home!`;
      case "snakeladder": return `${first} rolls first. Reach 100 — ladders 🪜 lift you, snakes 🐍 drag you down!`;
      case "dominoes": return `${first} plays first. Match the ends!`;
      case "mancala": return `${first} sows first. Land in your store for a bonus turn.`;
      case "snake": return `Eat ${g.target} apples first — or outlive your rival!`;
      case "pong": return `First to ${g.target} goals wins.`;
      case "airhockey": return `First to ${g.target} goals wins. Move your mallet!`;
      case "tanks": return `${first} fires first. Mind the wind!`;
      case "penalty": return `${nm(room, g.kicker)} kicks first. Kicker picks a corner, keeper picks a dive.`;
      case "basketball": return `${first} shoots first. Tap in the green zone!`;
      case "wordscramble": return `Unscramble the word! First to ${g.target} wins.`;
      case "quiz": return `First to ${g.target} correct answers wins!`;
      case "codebreaker": return `${first} guesses first. Crack the secret 4-colour code!`;
      case "sequence": return `${first} starts the pattern. Repeat it, then add one!`;
      case "colorduel": return `Memorise the colours, then repeat them fastest! First to ${g.target}.`;
      case "maze": return "Race to the ⭐ in the bottom-right corner!";
      case "whack": return `Whack the mole before your rival! ${g.total} moles.`;
      case "drawguess": return "Drawer: draw the word. Guesser: type your guess!";
      default: return "Game on! Beat your rival's score.";
    }
  }

  /* ================= start hooks (called when both players are ready) ================= */
  function begin(room, g) {
    if (RACE[g.id]) {
      g.startedAt = Date.now();
      later(room, g, (g.limit + 25) * 1000, () => {
        for (const m of ["X", "O"]) if (g.final[m] === null) g.final[m] = g.high ? 0 : 99;
        decideRace(room, g);
      });
      return;
    }
    switch (g.id) {
      case "snake": g._tickN = 0; loop(room, g, g.tick || 140, () => snakeTick(room, g)); break;
      case "pong": serve(g, g._toward); loop(room, g, 30, () => pongTick(room, g)); break;
      case "airhockey": loop(room, g, 25, () => hockeyTick(room, g)); break;
      case "colorduel": showPattern(room, g); break;
      case "whack": later(room, g, 1200, () => spawnMole(room, g)); break;
      case "drawguess":
        g.endsAt = Date.now() + g.timeLimit * 1000;
        later(room, g, g.timeLimit * 1000, () => finish(room, "none", `Time up! The word was ${g._word}.`));
        break;
    }
  }

  /* ================= real-time loops ================= */
  const DV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }, OPP = { U: "D", D: "U", L: "R", R: "L" };
  function snakeTick(room, g) {
    const nh = {}, ate = {}, body = {};
    for (const m of ["X", "O"]) { if (g._next[m] && g._next[m] !== OPP[g.dir[m]]) g.dir[m] = g._next[m]; }
    for (const m of ["X", "O"]) {
      const h = g.snakes[m][0], d = DV[g.dir[m]];
      nh[m] = [h[0] + d[0], h[1] + d[1]];
      ate[m] = g.food && nh[m][0] === g.food[0] && nh[m][1] === g.food[1];
      body[m] = [nh[m], ...(ate[m] ? g.snakes[m] : g.snakes[m].slice(0, -1))];
    }
    const dead = {};
    for (const m of ["X", "O"]) {
      const [x, y] = nh[m], f = other(m);
      dead[m] = x < 0 || y < 0 || x >= g.n || y >= g.n
        || body[m].slice(1).some(([a, b]) => a === x && b === y)
        || body[f].some(([a, b]) => a === x && b === y);
    }
    g.snakes = body;
    if (dead.X && dead.O) return finish(room, "draw", "Both snakes crashed — draw!");
    if (dead.X || dead.O) { const w = dead.X ? "O" : "X"; return finish(room, w, `${nm(room, w)} wins — ${nm(room, other(w))} crashed!`); }
    for (const m of ["X", "O"]) if (ate[m]) {
      g.scores[m]++;
      if (g.scores[m] >= g.target) return finish(room, m, `${nm(room, m)} ate ${g.target} apples!`);
      g.food = emptyFood(g);
      break;
    }
  }

  function serve(g, toward) {
    g.ball = { x: g.W / 2, y: g.H / 2, vx: (toward === "X" ? -1 : 1) * 5, vy: (Math.random() * 2 - 1) * 3 };
  }
  function pongTick(room, g) {
    if (g._wait > 0) { g._wait--; if (g._wait === 0 && g._after) { serve(g, g._toward); g._after = false; } return; }
    const b = g.ball, H = g.H, W = g.W, half = g.ph / 2;
    b.x += b.vx; b.y += b.vy;
    if (b.y < 7) { b.y = 7; b.vy = Math.abs(b.vy); }
    if (b.y > H - 7) { b.y = H - 7; b.vy = -Math.abs(b.vy); }
    const hit = (m, dir) => {
      const sp = Math.min(12, Math.hypot(b.vx, b.vy) * 1.06), ang = clamp((b.y - g.pad[m]) / half, -1, 1) * 0.9;
      b.vx = dir * sp * Math.cos(ang); b.vy = sp * Math.sin(ang);
    };
    if (b.vx < 0 && b.x - 7 <= 20 && b.x > 4 && Math.abs(b.y - g.pad.X) <= half + 7) { b.x = 27; hit("X", 1); }
    if (b.vx > 0 && b.x + 7 >= W - 20 && b.x < W - 4 && Math.abs(b.y - g.pad.O) <= half + 7) { b.x = W - 27; hit("O", -1); }
    let scorer = null;
    if (b.x < -8) scorer = "O"; else if (b.x > W + 8) scorer = "X";
    if (scorer) {
      g.scores[scorer]++;
      if (g.scores[scorer] >= g.target) return finish(room, scorer, `${nm(room, scorer)} wins ${g.scores[scorer]}–${g.scores[other(scorer)]}!`);
      g.message = `${nm(room, scorer)} scores!`;
      g.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }; g._wait = 30; g._toward = other(scorer);
      g._after = true;
    }
  }

  const MR = 22, PR = 13;
  function hockeyTick(room, g) {
    const W = g.W, H = g.H, p = g.puck;
    for (const m of ["X", "O"]) {
      const t = g._tgt[m], c = g.mal[m];
      let dx = t.x - c.x, dy = t.y - c.y; const d = Math.hypot(dx, dy), mx = 20;
      if (d > mx) { dx = dx / d * mx; dy = dy / d * mx; }
      c.vx = dx; c.vy = dy; c.x += dx; c.y += dy;
    }
    if (g._wait > 0) { g._wait--; return; }
    p.x += p.vx; p.y += p.vy; p.vx *= 0.993; p.vy *= 0.993;
    for (const m of ["X", "O"]) {
      const c = g.mal[m], dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 0.01;
      if (d < PR + MR) {
        const nx = dx / d, ny = dy / d;
        p.x = c.x + nx * (PR + MR); p.y = c.y + ny * (PR + MR);
        const dot = (p.vx - c.vx) * nx + (p.vy - c.vy) * ny;
        if (dot < 0) { p.vx -= 1.9 * dot * nx; p.vy -= 1.9 * dot * ny; }
        const sp = Math.hypot(p.vx, p.vy);
        if (sp < 3) { p.vx = nx * 3; p.vy = ny * 3; } else if (sp > 20) { p.vx = p.vx / sp * 20; p.vy = p.vy / sp * 20; }
      }
    }
    if (p.x < PR) { p.x = PR; p.vx = Math.abs(p.vx); }
    if (p.x > W - PR) { p.x = W - PR; p.vx = -Math.abs(p.vx); }
    const inGoal = Math.abs(p.x - W / 2) < g.gw / 2 - 6;
    let scorer = null;
    if (p.y < PR) { if (inGoal) { if (p.y < -PR) scorer = "X"; } else { p.y = PR; p.vy = Math.abs(p.vy); } }
    if (p.y > H - PR) { if (inGoal) { if (p.y > H + PR) scorer = "O"; } else { p.y = H - PR; p.vy = -Math.abs(p.vy); } }
    if (scorer) {
      g.scores[scorer]++;
      if (g.scores[scorer] >= g.target) return finish(room, scorer, `${nm(room, scorer)} wins ${g.scores[scorer]}–${g.scores[other(scorer)]}!`);
      g.message = `${nm(room, scorer)} scores!`;
      g.puck = { x: W / 2, y: scorer === "X" ? H * 0.3 : H * 0.7, vx: 0, vy: 0 }; g._wait = 35;
    }
  }

  /* ================= whack-a-mole / colour duel timers ================= */
  function schedMole(room, g, delay) {
    const id = ++g._tk;
    later(room, g, delay, () => { if (g._tk !== id) return; if (g.spawned >= g.total) return endWhack(room, g); spawnMole(room, g); });
  }
  function spawnMole(room, g) {
    let h; do { h = R(0, 8); } while (h === g.hole || h === g._prev);
    g._prev = h; g.hole = h; g.spawned++; const id = ++g.holeId;
    later(room, g, Math.max(g._min || 650, (g._base || 1150) - g.spawned * 22), () => { if (g.holeId === id && g.hole !== null) { g.hole = null; schedMole(room, g, R(350, 800)); } });
  }
  function endWhack(room, g) {
    const { X, O } = g.scores;
    if (X === O) finish(room, "draw", `${X}–${O} — a tie!`);
    else { const w = X > O ? "X" : "O"; finish(room, w, `${nm(room, w)} whacked ${g.scores[w]} vs ${g.scores[other(w)]}!`); }
  }
  function showPattern(room, g) {
    const qn = g.qn, len = Math.min(7, 4 + Math.floor((qn - 1) / 2));
    g.pattern = newPattern(len, g.pads); g.phase = "show"; g.locked = { X: false, O: false };
    later(room, g, 1600 + len * 450, () => { if (g.qn === qn && g.phase === "show") { g.phase = "input"; g.message = "GO! Repeat the pattern!"; } });
  }

  /* ================= race helpers ================= */
  function decideRace(room, g) {
    const a = g.final.X, b = g.final.O, u = g.unit;
    if (a === b) return finish(room, "draw", `Both scored ${a} ${u} — draw!`);
    const w = (g.high ? a > b : a < b) ? "X" : "O";
    finish(room, w, `${nm(room, w)} wins! ${nm(room, "X")} ${a} ${u} vs ${nm(room, "O")} ${b} ${u}.`);
  }

  /* ================= shoot-out helper ================= */
  function shootWinner(a, b, na, nb, per) {
    if (na >= per && nb >= per) return na === nb && a !== b ? (a > b ? "X" : "O") : null;
    const remX = Math.max(0, per - na), remO = Math.max(0, per - nb);
    if (a > b + remO) return "X";
    if (b > a + remX) return "O";
    return null;
  }

  /* ================= ludo helpers ================= */
  function ludoMoves(g, m, die) {
    const out = [];
    g.tokens[m].forEach((pos, i) => {
      if (pos === 56) return;
      if (pos === -1) { if (die === 6) out.push({ i, to: 0 }); }
      else if (pos + die <= 56) out.push({ i, to: pos + die });
    });
    return out;
  }
  const ludoPass = (room, g, m) => { g.turn = other(m); g.phase = "roll"; g.sixes = 0; g.movable = []; };

  /* ================= domino helpers ================= */
  const domEnds = (g) => g.chain.length ? [g.chain[0][0], g.chain[g.chain.length - 1][1]] : null;
  const domCanPlay = (g, [a, b]) => { const e = domEnds(g); return !e || a === e[0] || b === e[0] || a === e[1] || b === e[1]; };
  const domPips = (h) => h.reduce((s, [a, b]) => s + a + b, 0);

  /* ================= tanks ================= */
  const tankH = (x) => 18 + 26 * Math.exp(-(((x - 50) / 11) ** 2));
  const TANK_X = { X: 10, O: 90 };

  /* ================= move handlers ================= */
  const PLAY = {
    snakeladder(room, m, d) {
      const g = room.game;
      if (g.turn !== m) return "Wait for your turn.";
      if (g.busy) return "Wait a moment…";
      const die = R(1, 6), foe = other(m), who = nm(room, m);
      g.die = die; g.rollId++;
      g.sixes = die === 6 ? g.sixes + 1 : 0;
      g.last = { m, die, from: g.pos[m], to: g.pos[m], via: null };
      const pass = (msg) => { g.sixes = 0; g.turn = foe; g.message = `${msg} ${nm(room, foe)}'s turn.`; };
      if (g.sixes >= 3) return pass(`${who} rolled three 6s in a row — turn lost!`);
      let to = g.pos[m] + die;
      if (to > 100) {
        if (!g.exact) to = 100; // easy: any roll that reaches 100 wins
        else { g.last.to = g.pos[m]; return pass(`${who} rolled ${die} — needs the exact number to reach 100.`); }
      }
      g.pos[m] = to; g.last.to = to;
      const settle = () => {
        if (g.pos[m] === 100) return finish(room, m, `${who} reached 100!`);
        if (die === 6) { g.message = `${who} rolled 6 — roll again!`; return; }
        pass(`${who} is on ${g.pos[m]}.`);
      };
      if (to === 100) return settle();
      const j = g._jump[to];
      if (!j) { g.message = `${who} rolled ${die} → ${to}.`; return settle(); }
      g.busy = true;
      g.message = j.type === "ladder" ? `${who} rolled ${die} → ${to}. A ladder! 🪜 Climbing to ${j.to}…` : `${who} rolled ${die} → ${to}. A snake! 🐍 Sliding to ${j.to}…`;
      later(room, g, 1000, () => {
        g.pos[m] = j.to; g.busy = false; g.last = { m, die, from: to, to: j.to, via: j.type };
        g.message = j.type === "ladder" ? `${who} climbed up to ${j.to}! 🪜` : `${who} slid down to ${j.to}! 🐍`;
        settle();
      });
    },
    ludo(room, m, d) {
      const g = room.game;
      if (g.turn !== m) return "Wait for your turn.";
      if (d.op === "roll") {
        if (g.phase !== "roll") return "Move a token first.";
        const die = R(1, 6); g.die = die; g.rollId++;
        g.sixes = die === 6 ? g.sixes + 1 : 0;
        if (g.sixes >= 3) { g.message = `${nm(room, m)} rolled three 6s in a row — turn lost!`; return ludoPass(room, g, m); }
        const mv = ludoMoves(g, m, die);
        if (!mv.length) { g.message = `${nm(room, m)} rolled ${die} — no move. ${nm(room, other(m))}'s turn.`; return ludoPass(room, g, m); }
        g.phase = "move"; g.movable = mv.map((x) => x.i);
        g.message = `${nm(room, m)} rolled ${die}. Choose a token to move.`;
        return;
      }
      if (d.op === "move") {
        if (g.phase !== "move") return "Roll the dice first.";
        const i = Number(d.token), mv = ludoMoves(g, m, g.die).find((x) => x.i === i);
        if (!mv) return "That token can't move.";
        g.tokens[m][i] = mv.to; g.lastTok = { m, i };
        let captured = false;
        if (mv.to <= 50) {
          const abs = ludoAbs(m, mv.to), foe = other(m);
          if (!LUDO_SAFE.has(abs)) g.tokens[foe].forEach((p, j) => { if (p >= 0 && p <= 50 && ludoAbs(foe, p) === abs) { g.tokens[foe][j] = -1; captured = true; } });
        }
        if (g.tokens[m].every((p) => p === 56)) return finish(room, m, `${nm(room, m)} brought all 4 tokens home!`);
        const bonus = g.die === 6 || captured || mv.to === 56;
        g.phase = "roll"; g.movable = [];
        if (bonus) { g.message = `${nm(room, m)} ${captured ? "captured a token" : mv.to === 56 ? "reached home" : "rolled a 6"} — roll again!`; }
        else { g.turn = other(m); g.sixes = 0; g.message = `${nm(room, g.turn)}'s turn.`; }
        return;
      }
      return "Roll the dice.";
    },

    dominoes(room, m, d) {
      const g = room.game;
      if (g.turn !== m) return "Wait for your turn.";
      const hand = g.hands[m];
      if (d.op === "play") {
        const i = Number(d.tile), t = hand[i];
        if (!t) return "Pick a tile.";
        if (!domCanPlay(g, t)) return "That tile doesn't match either end.";
        const [a, b] = t;
        if (!g.chain.length) g.chain.push([a, b]);
        else {
          const [l, r] = domEnds(g);
          let end = d.end === "L" ? "L" : "R";
          const fitsR = a === r || b === r, fitsL = a === l || b === l;
          if (end === "R" && !fitsR) end = "L"; else if (end === "L" && !fitsL) end = "R";
          if (end === "R") g.chain.push(a === r ? [a, b] : [b, a]);
          else g.chain.unshift(b === l ? [a, b] : [b, a]);
        }
        hand.splice(i, 1); g.passes = 0; g.lastTile = t;
        if (!hand.length) return finish(room, m, `${nm(room, m)} played all tiles — Domino!`);
        g.turn = other(m); g.message = `${nm(room, g.turn)}'s turn.`;
        return;
      }
      if (d.op === "draw") {
        if (hand.some((t) => domCanPlay(g, t))) return "You have a tile you can play.";
        if (!g.boneyard.length) return "The boneyard is empty — pass.";
        hand.push(g.boneyard.pop()); g.message = `${nm(room, m)} drew a tile.`; return;
      }
      if (d.op === "pass") {
        if (hand.some((t) => domCanPlay(g, t))) return "You have a tile you can play.";
        if (g.boneyard.length) return "Draw from the boneyard first.";
        g.passes++;
        if (g.passes >= 2) {
          const a = domPips(g.hands.X), b = domPips(g.hands.O);
          if (a === b) return finish(room, "draw", `Blocked! Both have ${a} pips — draw.`);
          const w = a < b ? "X" : "O";
          return finish(room, w, `Blocked! ${nm(room, w)} has fewer pips (${Math.min(a, b)} vs ${Math.max(a, b)}).`);
        }
        g.turn = other(m); g.message = `${nm(room, m)} passed. ${nm(room, g.turn)}'s turn.`; return;
      }
      return "Play, draw or pass.";
    },

    mancala(room, m, d) {
      const g = room.game, p = Number(d.pit);
      if (g.turn !== m) return "Wait for your turn.";
      if (!Number.isInteger(p) || p < 0 || p > 5) return "Pick one of your pits.";
      const idx = m === "X" ? p : 7 + p, pits = g.pits;
      if (!pits[idx]) return "That pit is empty.";
      let n = pits[idx], i = idx; pits[idx] = 0;
      const skip = m === "X" ? 13 : 6, store = m === "X" ? 6 : 13;
      while (n > 0) { i = (i + 1) % 14; if (i === skip) continue; pits[i]++; n--; }
      g.lastPit = i;
      const mine = m === "X" ? i >= 0 && i <= 5 : i >= 7 && i <= 12;
      let msg = "";
      if (mine && pits[i] === 1 && pits[12 - i] > 0) { pits[store] += pits[12 - i] + 1; pits[12 - i] = 0; pits[i] = 0; msg = " Capture!"; }
      const sideEmpty = (s) => (s === "X" ? pits.slice(0, 6) : pits.slice(7, 13)).every((v) => !v);
      if (sideEmpty("X") || sideEmpty("O")) {
        for (let k = 0; k < 6; k++) { pits[6] += pits[k]; pits[k] = 0; pits[13] += pits[7 + k]; pits[7 + k] = 0; }
        const a = pits[6], b = pits[13];
        if (a === b) return finish(room, "draw", `${a}–${b} — draw!`);
        const w = a > b ? "X" : "O";
        return finish(room, w, `${nm(room, w)} wins ${Math.max(a, b)}–${Math.min(a, b)}!`);
      }
      if (i === store) { g.message = `${nm(room, m)} landed in the store — play again!`; return; }
      g.turn = other(m); g.message = `${nm(room, g.turn)}'s turn.${msg}`;
    },

    snake(room, m, d) { const g = room.game; if (DV[d.dir]) g._next[m] = d.dir; return quiet; },

    pong(room, m, d) { const g = room.game, y = Number(d.y); if (Number.isFinite(y)) g.pad[m] = clamp(y, g.ph / 2, g.H - g.ph / 2); return quiet; },

    airhockey(room, m, d) {
      const g = room.game; let x = Number(d.x), y = Number(d.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return quiet;
      if (m === "O") { x = g.W - x; y = g.H - y; }
      x = clamp(x, MR, g.W - MR);
      y = m === "X" ? clamp(y, g.H / 2 + MR, g.H - MR) : clamp(y, MR, g.H / 2 - MR);
      g._tgt[m] = { x, y }; return quiet;
    },

    tanks(room, m, d) {
      const g = room.game, foe = other(m), ang = Number(d.angle), pw = Number(d.power);
      if (g.turn !== m) return "Wait for your turn.";
      if (!(ang >= 5 && ang <= 85) || !(pw >= 20 && pw <= 100)) return "Angle 5–85, power 20–100.";
      const dir = m === "X" ? 1 : -1, v = pw * 0.0235, a = ang * Math.PI / 180;
      let x = TANK_X[m], y = tankH(x) + 3, vx = dir * v * Math.cos(a), vy = v * Math.sin(a);
      const path = [[+x.toFixed(2), +y.toFixed(2)]]; let impact = null;
      const fc = [TANK_X[foe], tankH(TANK_X[foe]) + 2];
      for (let s = 0; s < 500; s++) {
        x += vx; y += vy; vy -= 0.05; vx += g.wind * 0.002;
        if (s % 2 === 0) path.push([+x.toFixed(2), +y.toFixed(2)]);
        if (Math.hypot(x - fc[0], y - fc[1]) < 4.5) { impact = [x, y]; break; }
        if (x < -5 || x > 105) break;
        if (s > 3 && y <= tankH(x)) { impact = [x, tankH(x)]; break; }
      }
      if (impact) path.push([+impact[0].toFixed(2), +impact[1].toFixed(2)]);
      const dmg = { X: 0, O: 0 };
      if (impact) for (const t of ["X", "O"]) {
        const dist = Math.hypot(impact[0] - TANK_X[t], impact[1] - (tankH(TANK_X[t]) + 2));
        dmg[t] = dist < 4.5 ? 45 : dist < 9 ? 25 : 0;
      }
      g.hp.X = Math.max(0, g.hp.X - dmg.X); g.hp.O = Math.max(0, g.hp.O - dmg.O);
      g.shot = { by: m, path, impact, dmg }; g.shotId++;
      if (g.hp.X <= 0 && g.hp.O <= 0) return finish(room, "draw", "Both tanks destroyed — draw!");
      if (g.hp[foe] <= 0) return finish(room, m, `${nm(room, m)} destroyed ${nm(room, foe)}'s tank!`);
      if (g.hp[m] <= 0) return finish(room, foe, `${nm(room, m)} blew up their own tank!`);
      g.turn = foe; g.wind = R(-5, 5);
      g.message = dmg[foe] ? `Hit! ${nm(room, foe)} took ${dmg[foe]} damage. ${nm(room, foe)}'s turn.` : `${nm(room, m)} missed. ${nm(room, foe)}'s turn.`;
    },

    penalty(room, m, d) {
      const g = room.game, c = d.pick;
      if (!["L", "C", "R"].includes(c)) return "Pick left, centre or right.";
      if (g.picks[m]) return "You already picked.";
      g.picks[m] = c;
      if (!g.picks.X || !g.picks.O) { g.message = `${nm(room, m)} is ready. Waiting for ${nm(room, other(m))}…`; return; }
      const k = g.kicker, kp = other(k), shot = g.picks[k], dive = g.picks[kp], goal = shot !== dive;
      g.log.push({ kicker: k, shot, dive, goal }); if (goal) g.goals[k]++;
      g.picks = { X: null, O: null }; g.kicker = kp;
      const nX = g.log.filter((l) => l.kicker === "X").length, nO = g.log.length - nX;
      const w = shootWinner(g.goals.X, g.goals.O, nX, nO, g.per);
      const txt = goal ? `⚽ GOAL by ${nm(room, k)}!` : `🧤 SAVED by ${nm(room, kp)}!`;
      if (w) return finish(room, w, `${txt} ${nm(room, w)} wins ${g.goals[w]}–${g.goals[other(w)]}!`);
      g.message = `${txt} ${nm(room, kp)} kicks next.`;
    },

    basketball(room, m, d) {
      const g = room.game, p = Number(d.power);
      if (g.turn !== m) return "Wait for your turn.";
      if (!Number.isFinite(p)) return "Tap to shoot.";
      const off = Math.abs(clamp(p, 0, 100) - 50), made = off <= 8 || (off <= 18 && Math.random() < 0.4);
      g.shots[m].push(made); g.last = { by: m, power: clamp(p, 0, 100), made, id: g.shots.X.length + g.shots.O.length };
      const a = g.shots.X.filter(Boolean).length, b = g.shots.O.filter(Boolean).length;
      const w = shootWinner(a, b, g.shots.X.length, g.shots.O.length, g.per);
      const txt = made ? `🏀 ${nm(room, m)} scores!` : `${nm(room, m)} missed.`;
      if (w) return finish(room, w, `${txt} ${nm(room, w)} wins ${Math.max(a, b)}–${Math.min(a, b)}!`);
      g.turn = other(m); g.message = `${txt} ${nm(room, g.turn)}'s turn.`;
    },

    wordscramble(room, m, d) {
      const g = room.game, t = String(d.text || "").trim().toUpperCase().slice(0, 20);
      if (!t) return "Type your answer.";
      if (g.locked[m]) return "Wait for the next word.";
      const next = () => { pickWord(g); g.qn++; g.locked = { X: false, O: false }; };
      if (t === g._word) {
        g.scores[m]++;
        if (g.scores[m] >= g.target) return finish(room, m, `${nm(room, m)} wins ${g.scores[m]}–${g.scores[other(m)]}! Last word: ${g._word}.`);
        const w = g._word; next(); g.message = `${nm(room, m)} got "${w}"! Next word.`;
      } else {
        g.locked[m] = true;
        if (g.locked.X && g.locked.O) { const w = g._word; next(); g.message = `Both missed — it was "${w}". New word!`; }
        else g.message = `${nm(room, m)} guessed wrong. ${nm(room, other(m))} can still answer!`;
      }
    },

    quiz(room, m, d) {
      const g = room.game, c = Number(d.choice);
      if (!Number.isInteger(c) || c < 0 || c > 3) return "Pick an option.";
      if (g.locked[m]) return "Wait for the next question.";
      const next = () => { pickQuiz(g); g.qn++; g.locked = { X: false, O: false }; };
      const right = g.opts[g._ans];
      if (c === g._ans) {
        g.scores[m]++;
        if (g.scores[m] >= g.target) return finish(room, m, `${nm(room, m)} wins ${g.scores[m]}–${g.scores[other(m)]}!`);
        next(); g.reveal = `Answer was: ${right}`; g.message = `${nm(room, m)} got it right!`;
      } else {
        g.locked[m] = true;
        if (g.locked.X && g.locked.O) { next(); g.reveal = `Answer was: ${right}`; g.message = "Both missed — next question!"; }
        else g.message = `${nm(room, m)} was wrong. ${nm(room, other(m))} can still answer!`;
      }
    },

    codebreaker(room, m, d) {
      const g = room.game, code = d.code;
      if (g.turn !== m) return "Wait for your turn.";
      if (!Array.isArray(code) || code.length !== g.len || code.some((c) => !Number.isInteger(c) || c < 0 || c >= g.colors)) return "Pick 4 colours.";
      const s = g._secret; let exact = 0; const sl = [], cl = [];
      code.forEach((c, i) => { if (c === s[i]) exact++; else { sl.push(s[i]); cl.push(c); } });
      let part = 0; for (const c of cl) { const k = sl.indexOf(c); if (k >= 0) { part++; sl.splice(k, 1); } }
      g.guesses.push({ by: m, code, exact, part });
      if (exact === g.len) return finish(room, m, `${nm(room, m)} cracked the code!`);
      if (g.guesses.length >= g.max) return finish(room, "none", "Nobody cracked the code in time!");
      g.turn = other(m); g.message = `${exact} exact, ${part} misplaced. ${nm(room, g.turn)}'s turn.`;
    },

    sequence(room, m, d) {
      const g = room.game, pad = Number(d.pad);
      if (g.turn !== m) return "Wait for your turn.";
      if (!Number.isInteger(pad) || pad < 0 || pad > 3) return "Tap a colour.";
      if (g.step < g.seq.length) {
        if (pad !== g.seq[g.step]) return finish(room, other(m), `${nm(room, m)} got the pattern wrong at step ${g.step + 1}! (Length ${g.seq.length})`);
        g.step++; g.message = g.step < g.seq.length ? `Good! ${g.seq.length - g.step} to go, then add a new colour.` : "Perfect! Now add ONE new colour.";
        return;
      }
      g.seq.push(pad); g.step = 0; g.pb++; g.turn = other(m);
      g.message = `${nm(room, m)} added a colour. ${nm(room, g.turn)}: repeat all ${g.seq.length}, then add one!`;
    },

    colorduel(room, m, d) {
      const g = room.game, at = d.attempt;
      if (g.phase !== "input") return "Wait for GO!";
      if (g.locked[m]) return "Wrong! Wait for the next pattern.";
      if (!Array.isArray(at) || at.length > 9) return "Invalid.";
      if (at.length === g.pattern.length && at.every((c, i) => c === g.pattern[i])) {
        g.scores[m]++;
        if (g.scores[m] >= g.target) return finish(room, m, `${nm(room, m)} wins ${g.scores[m]}–${g.scores[other(m)]}!`);
        g.qn++; g.message = `${nm(room, m)} was fastest! Next pattern…`; showPattern(room, g);
      } else {
        g.locked[m] = true;
        if (g.locked.X && g.locked.O) { g.qn++; g.message = "Both wrong — new pattern!"; showPattern(room, g); }
        else g.message = `${nm(room, m)} got it wrong. ${nm(room, other(m))} can still answer!`;
      }
    },

    maze(room, m, d) {
      const g = room.game, dr = DV[d.dir];
      if (!dr) return quiet;
      const bit = { U: 1, R: 2, D: 4, L: 8 }[d.dir], [x, y] = g.pos[m];
      if (g.maze[y * g.n + x] & bit) return quiet;
      const nx = x + dr[0], ny = y + dr[1];
      if (nx < 0 || ny < 0 || nx >= g.n || ny >= g.n) return quiet;
      g.pos[m] = [nx, ny];
      if (nx === g.n - 1 && ny === g.n - 1) return finish(room, m, `${nm(room, m)} reached the star first!`);
    },

    whack(room, m, d) {
      const g = room.game, h = Number(d.hole);
      if (Date.now() < g._lock[m]) return "Missed! Wait a moment…";
      if (g.hole === null || h !== g.hole) { g._lock[m] = Date.now() + 700; return "Missed! 700 ms penalty."; }
      g.scores[m]++; g.lastHit = { by: m, hole: h }; g.hole = null; g.holeId++;
      if (g.scores[m] > g.total / 2) return finish(room, m, `${nm(room, m)} whacked ${g.scores[m]} moles!`);
      g.message = `${nm(room, m)} whacked it!`;
      schedMole(room, g, R(400, 800));
    },

    drawguess(room, m, d) {
      const g = room.game;
      if (d.op === "guess") {
        if (m === g.drawer) return "You're the drawer!";
        const t = String(d.text || "").trim().toUpperCase().replace(/[^A-Z ]/g, "").slice(0, 24);
        if (!t) return "Type a guess.";
        if (t === g._word) return finish(room, m, `${nm(room, m)} guessed it — ${g._word}!`);
        g.guesses.push({ by: m, text: t }); if (g.guesses.length > 24) g.guesses.shift();
        g.message = `Wrong guess: ${t}`; return;
      }
      if (m !== g.drawer) return "Only the drawer can draw.";
      if (d.op === "stroke") {
        const pts = (Array.isArray(d.pts) ? d.pts : []).slice(0, 400).map((p) => [clamp(Math.round(+p[0]) || 0, 0, 1000), clamp(Math.round(+p[1]) || 0, 0, 1000)]);
        if (!pts.length || g.strokes.length > 600) return "Too many strokes.";
        g.strokes.push({ c: clamp(Math.round(+d.c) || 0, 0, 8), w: clamp(Math.round(+d.w) || 4, 2, 24), pts }); return;
      }
      if (d.op === "undo") { g.strokes.pop(); return; }
      if (d.op === "clear") { g.strokes = []; return; }
      return "Unknown action.";
    }
  };

  // race games share one handler
  for (const id of Object.keys(RACE)) {
    PLAY[id] = function (room, m, d) {
      const g = room.game, s = Math.round(Number(d.score));
      if (!Number.isFinite(s)) return quiet;
      if (d.op === "live") { g.live[m] = clamp(s, 0, 100000); return; }
      if (d.op === "final") {
        if (g.final[m] !== null) return "Already submitted.";
        g.final[m] = clamp(s, 0, 100000); g.live[m] = g.final[m];
        if (g.final.X !== null && g.final.O !== null) return decideRace(room, g);
        g.message = `${nm(room, m)} finished with ${g.final[m]} ${g.unit}. Waiting for ${nm(room, other(m))}…`; return;
      }
      return "Unknown action.";
    };
  }

  /* ================= per-player views (hide secrets) ================= */
  function view(g, raw, mark) {
    const done = g.status === "finished", foe = other(mark);
    switch (g.id) {
      case "dominoes":
        g.hands = done ? raw.hands : { [mark]: raw.hands[mark] };
        g.counts = { X: raw.hands.X.length, O: raw.hands.O.length }; g.bone = raw.boneyard.length; delete g.boneyard;
        break;
      case "penalty":
        if (!done) g.picks = { [mark]: raw.picks[mark], [foe]: raw.picks[foe] ? "locked" : null };
        break;
      case "wordscramble": if (done) g.word = raw._word; break;
      case "codebreaker": if (done) g.secret = raw._secret; break;
      case "colorduel": g.plen = raw.pattern.length; if (g.phase !== "show" && !done) delete g.pattern; break;
      case "drawguess":
        if (mark === raw.drawer || done) g.word = raw._word;
        break;
    }
    return g;
  }

  return { IDS, blank, intro, begin, play: PLAY, view };
};
