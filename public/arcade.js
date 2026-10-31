/* Local arcade engines. Each player runs the same seeded game on their own device;
   the final score is sent to the server, which decides the winner. */
const Arcade = (() => {
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const emo = (ctx, e, x, y, s) => { ctx.font = `${s}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); };

  /* ---------------- Brick Breaker ---------------- */
  function brick(ctx, W, H, rand, inp) {
    const PW = 64, PY = H - 26, COLS = 8, ROWS = 5, BW = 36, BH = 14, OX = (W - COLS * 40) / 2 + 2, OY = 40;
    const cols = ["#ff5c8a", "#ff9f43", "#ffc24b", "#3ddc97", "#8b6cff"];
    let px = W / 2, lives = 3, score = 0, bricks, ball, hold = 0.8, over = false;
    const wall = () => { bricks = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) bricks.push({ x: OX + c * 40, y: OY + r * 18, r, alive: true }); };
    const reset = () => { ball = { x: px, y: PY - 10, vx: 0, vy: 0, sp: 280 }; hold = 0.8; };
    wall(); reset();
    return {
      score: () => score, over: () => over,
      update(dt) {
        if (inp.pd || inp.moved) px = inp.px; else px += (inp.r - inp.l) * 340 * dt;
        px = clamp(px, PW / 2, W - PW / 2);
        if (hold > 0) { ball.x = px; ball.y = PY - 10; hold -= dt; if (inp.tap) hold = 0; if (hold <= 0) { const a = (rand() * 0.8 - 0.4); ball.vx = Math.sin(a) * ball.sp; ball.vy = -Math.cos(a) * ball.sp; } return; }
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
          if (ball.x < 6) { ball.x = 6; ball.vx = Math.abs(ball.vx); }
          if (ball.x > W - 6) { ball.x = W - 6; ball.vx = -Math.abs(ball.vx); }
          if (ball.y < 6) { ball.y = 6; ball.vy = Math.abs(ball.vy); }
          if (ball.vy > 0 && ball.y + 6 >= PY && ball.y < PY + 10 && Math.abs(ball.x - px) <= PW / 2 + 6) {
            const off = clamp((ball.x - px) / (PW / 2), -1, 1), ang = off * 1.0;
            ball.sp = Math.min(440, ball.sp + 4); ball.vx = Math.sin(ang) * ball.sp; ball.vy = -Math.cos(ang) * ball.sp; ball.y = PY - 6;
          }
          for (const b of bricks) {
            if (!b.alive) continue;
            if (ball.x + 6 > b.x && ball.x - 6 < b.x + BW && ball.y + 6 > b.y && ball.y - 6 < b.y + BH) {
              b.alive = false; score += (ROWS - b.r) * 10;
              const ox = Math.min(ball.x + 6 - b.x, b.x + BW - (ball.x - 6)), oy = Math.min(ball.y + 6 - b.y, b.y + BH - (ball.y - 6));
              if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
              ball.sp = Math.min(440, ball.sp + 2);
              break;
            }
          }
        }
        if (!bricks.some((b) => b.alive)) { score += 100; wall(); reset(); }
        if (ball.y > H + 10) { lives--; if (lives <= 0) over = true; else reset(); }
      },
      draw() {
        ctx.fillStyle = "#120f2b"; ctx.fillRect(0, 0, W, H);
        for (const b of bricks) if (b.alive) { ctx.fillStyle = cols[b.r]; ctx.fillRect(b.x, b.y, BW, BH); }
        ctx.fillStyle = "#ffc24b"; ctx.fillRect(px - PW / 2, PY, PW, 10);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("❤".repeat(lives), 8, 8); ctx.textAlign = "right"; ctx.fillText(String(score), W - 8, 8);
      }
    };
  }

  /* ---------------- Space Shooter ---------------- */
  function space(ctx, W, H, rand, inp) {
    let x = W / 2, lives = 3, score = 0, fire = 0, spawn = 0.6, t = 0, over = false, flash = 0;
    const bullets = [], foes = [], stars = Array.from({ length: 30 }, () => [rand() * W, rand() * H, 0.5 + rand() * 1.5]);
    return {
      score: () => score, over: () => over,
      update(dt) {
        t += dt;
        if (inp.pd || inp.moved) x = inp.px; else x += (inp.r - inp.l) * 300 * dt;
        x = clamp(x, 16, W - 16);
        fire -= dt; if (fire <= 0) { bullets.push({ x, y: H - 50 }); fire = 0.26; }
        spawn -= dt; if (spawn <= 0) { foes.push({ x: 20 + rand() * (W - 40), y: -20, vy: 70 + rand() * 60 + t * 1.6, ph: rand() * 6, z: rand() < 0.4 }); spawn = Math.max(0.3, 0.75 - t * 0.008) + rand() * 0.3; }
        for (const b of bullets) b.y -= 460 * dt;
        for (const f of foes) { f.y += f.vy * dt; if (f.z) f.x += Math.sin(t * 3 + f.ph) * 60 * dt; }
        for (const b of bullets) for (const f of foes) if (!f.dead && !b.dead && Math.abs(b.x - f.x) < 16 && Math.abs(b.y - f.y) < 16) { f.dead = b.dead = true; score += 10; }
        for (const f of foes) if (!f.dead && f.y > H - 70 && Math.abs(f.x - x) < 22) { f.dead = true; lives--; flash = 0.3; if (lives <= 0) over = true; }
        for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead || bullets[i].y < -10) bullets.splice(i, 1);
        for (let i = foes.length - 1; i >= 0; i--) if (foes[i].dead || foes[i].y > H + 20) foes.splice(i, 1);
        flash = Math.max(0, flash - dt);
      },
      draw() {
        ctx.fillStyle = flash > 0 ? "#3a1030" : "#0a0820"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff88"; for (const s of stars) { s[1] = (s[1] + s[2]) % H; ctx.fillRect(s[0], s[1], s[2], s[2]); }
        ctx.fillStyle = "#ffc24b"; for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        for (const f of foes) emo(ctx, "👾", f.x, f.y, 26);
        emo(ctx, "🚀", x, H - 40, 32);
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("❤".repeat(lives), 8, 8); ctx.textAlign = "right"; ctx.fillText(String(score), W - 8, 8);
      }
    };
  }

  /* ---------------- Platform Race (runner) ---------------- */
  function runner(ctx, W, H, rand, inp) {
    const GY = H - 40, PX = 60;
    let y = GY, vy = 0, dist = 0, over = false, next = 300, obs = [], coin = 0, tt = 0;
    return {
      score: () => dist / 10 + coin * 5, over: () => over,
      update(dt) {
        tt += dt;
        const sp = Math.min(480, 230 + dist * 0.012);
        if (inp.tap && y >= GY) vy = -620;
        vy += 1900 * dt; y += vy * dt; if (y > GY) { y = GY; vy = 0; }
        dist += sp * dt;
        while (next < dist + W + 100) {
          const h = 22 + Math.floor(rand() * 3) * 10, w = 20 + Math.floor(rand() * 2) * 12, c = rand() < 0.35;
          obs.push({ at: next, w, h, c }); next += 230 + rand() * 230 + sp * 0.35;
        }
        obs = obs.filter((o) => o.at > dist - 80);
        for (const o of obs) {
          const sx = PX + (o.at - dist);
          if (o.c) { if (!o.got && Math.abs(sx - PX) < 18 && y > GY - 80) { o.got = true; coin++; } continue; }
          if (sx < PX + 12 && sx + o.w > PX - 12 && y > GY - o.h + 6) over = true;
        }
      },
      draw() {
        ctx.fillStyle = "#1a2a66"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2c4a9a"; for (let i = 0; i < 5; i++) { const bx = ((i * 130 - dist * 0.2) % (W + 130) + W + 130) % (W + 130) - 40; ctx.beginPath(); ctx.arc(bx, 50 + (i % 2) * 20, 22, 0, 7); ctx.fill(); }
        ctx.fillStyle = "#2b6b3a"; ctx.fillRect(0, GY + 12, W, H - GY - 12);
        ctx.fillStyle = "#1c4a28"; for (let i = 0; i < 12; i++) { const gx = ((i * 50 - dist) % (W + 50) + W + 50) % (W + 50); ctx.fillRect(gx, GY + 24, 24, 3); }
        for (const o of obs) {
          const sx = PX + (o.at - dist);
          if (o.c) { if (!o.got) emo(ctx, "🪙", sx, GY - 52, 22); continue; }
          ctx.fillStyle = "#ff5c8a"; ctx.fillRect(sx, GY + 12 - o.h, o.w, o.h);
          ctx.fillStyle = "#ffffff55"; ctx.fillRect(sx, GY + 12 - o.h, o.w, 4);
        }
        emo(ctx, "🏃", PX, y - 4, 32);
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(Math.round(dist / 10 + coin * 5) + " m", W - 8, 8);
      }
    };
  }

  /* ---------------- Car / Bike Racing (lane dodge) ---------------- */
  function lanes(n, skin, base, cap, foes) {
    return function (ctx, W, H, rand, inp) {
      const LW = W / n, PY = H - 80;
      let lane = Math.floor(n / 2), dist = 0, over = false, next = 400, obs = [], used = {};
      return {
        score: () => dist / 20, over: () => over,
        update(dt) {
          if (inp.lt) { lane = Math.max(0, lane - 1); inp.lt = 0; }
          if (inp.rt) { lane = Math.min(n - 1, lane + 1); inp.rt = 0; }
          const sp = Math.min(cap, base + dist * 0.01);
          dist += sp * dt;
          while (next < dist + H + 120) {
            const free = Math.floor(rand() * n), k = 1 + (rand() < 0.5 ? 1 : 0) + (n === 4 && rand() < 0.35 ? 1 : 0);
            const picks = []; for (let l = 0; l < n && picks.length < k; l++) { const ll = (l + Math.floor(rand() * n)) % n; if (ll !== free && !picks.includes(ll)) picks.push(ll); }
            for (const l of picks) obs.push({ at: next, l, e: foes[Math.floor(rand() * foes.length)] });
            next += 260 + rand() * 180 - Math.min(110, dist * 0.004);
          }
          obs = obs.filter((o) => o.at > dist - 140);
          for (const o of obs) { const sy = PY - (o.at - dist); if (o.l === lane && Math.abs(sy - PY) < 38) over = true; }
        },
        draw() {
          ctx.fillStyle = "#23233a"; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#ffffff55";
          for (let l = 1; l < n; l++) for (let i = -1; i < H / 60 + 1; i++) ctx.fillRect(l * LW - 2, i * 60 + (dist % 60), 4, 30);
          ctx.fillStyle = "#ffc24b"; ctx.fillRect(0, 0, 5, H); ctx.fillRect(W - 5, 0, 5, H);
          for (const o of obs) { const sy = PY - (o.at - dist); if (sy > -40 && sy < H + 40) { emo(ctx, o.e, o.l * LW + LW / 2, sy, n === 4 ? 30 : 38); } }
          emo(ctx, skin, lane * LW + LW / 2, PY, n === 4 ? 32 : 40);
          ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(Math.round(dist / 20) + " m", W - 10, 8);
        }
      };
    };
  }

  /* ---------------- Mini Golf ---------------- */
  const HOLES = [
    { tee: [60, 150], hole: [340, 150], walls: [] },
    { tee: [60, 150], hole: [340, 150], walls: [[190, 90, 20, 120]] },
    { tee: [60, 70], hole: [340, 230], walls: [[150, 10, 20, 190], [250, 100, 20, 190]] }
  ];
  const BORDER = [[0, 0, 400, 10], [0, 290, 400, 10], [0, 0, 10, 300], [390, 0, 10, 300]];
  function golf(ctx, W, H, rand, inp) {
    let hi = 0, strokes = [0, 0, 0], done = [false, false, false], ball, moving = false, over = false, drag = null, msg = "";
    const R = 6, setHole = () => { const h = HOLES[hi]; ball = { x: h.tee[0], y: h.tee[1], vx: 0, vy: 0 }; moving = false; };
    setHole();
    const total = () => strokes.reduce((a, b) => a + b, 0) + done.reduce((a, d, i) => a + (d ? 0 : (i === hi ? Math.max(8, strokes[i]) - strokes[i] : 8)), 0);
    return {
      score: () => total(), over: () => over,
      update(dt) {
        const h = HOLES[hi];
        if (inp.pd && !moving) drag = { x0: drag ? drag.x0 : inp.px, y0: drag ? drag.y0 : inp.py, x1: inp.px, y1: inp.py };
        if (!inp.pd && drag && !moving) {
          const dx = drag.x0 - drag.x1, dy = drag.y0 - drag.y1, d = Math.min(110, Math.hypot(dx, dy));
          if (d > 6) { ball.vx = (dx / Math.hypot(dx, dy)) * d * 6; ball.vy = (dy / Math.hypot(dx, dy)) * d * 6; moving = true; strokes[hi]++; msg = ""; }
          drag = null;
        }
        if (moving) {
          const walls = BORDER.concat(h.walls);
          for (let s = 0; s < 4; s++) {
            ball.x += ball.vx * dt / 4; ball.y += ball.vy * dt / 4;
            for (const [x, y, w, hh] of walls) {
              const cx = clamp(ball.x, x, x + w), cy = clamp(ball.y, y, y + hh); let dx = ball.x - cx, dy = ball.y - cy; const d = Math.hypot(dx, dy);
              if (d < R) {
                if (d === 0) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
                ball.x += dx * (R - d); ball.y += dy * (R - d);
                const dot = ball.vx * dx + ball.vy * dy;
                if (dot < 0) { ball.vx -= 1.75 * dot * dx; ball.vy -= 1.75 * dot * dy; }
              }
            }
          }
          const f = Math.pow(0.985, dt * 60); ball.vx *= f; ball.vy *= f;
          const sp = Math.hypot(ball.vx, ball.vy);
          if (Math.hypot(ball.x - h.hole[0], ball.y - h.hole[1]) < 9 && sp < 430) {
            done[hi] = true; msg = strokes[hi] === 1 ? "HOLE IN ONE! 🎉" : "In the hole! ⛳";
            if (hi === 2) over = true; else { hi++; setHole(); }
            return;
          }
          if (sp < 8) { ball.vx = ball.vy = 0; moving = false; if (strokes[hi] >= 8) { done[hi] = true; msg = "Max strokes!"; if (hi === 2) over = true; else { hi++; setHole(); } } }
        }
      },
      draw() {
        const h = HOLES[Math.min(hi, 2)];
        ctx.fillStyle = "#1f7a3c"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2a9a4c"; for (let i = 0; i < 8; i++) ctx.fillRect(i * 50, 0, 25, H);
        ctx.fillStyle = "#6b4a2b"; for (const [x, y, w, hh] of BORDER.concat(h.walls)) ctx.fillRect(x, y, w, hh);
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(h.hole[0], h.hole[1], 9, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(h.hole[0] - 1, h.hole[1] - 30, 2, 30); ctx.fillStyle = "#ff5c8a"; ctx.fillRect(h.hole[0] + 1, h.hole[1] - 30, 14, 8);
        if (drag && !moving) {
          const dx = drag.x0 - drag.x1, dy = drag.y0 - drag.y1, d = Math.min(110, Math.hypot(dx, dy)) || 1, L = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = "#ffc24b"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + dx / L * d * 1.4, ball.y + dy / L * d * 1.4); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`Hole ${Math.min(hi + 1, 3)}/3 · Strokes ${strokes[Math.min(hi, 2)]}`, 16, 14);
        ctx.textAlign = "right"; ctx.fillText(msg, W - 16, 14);
      }
    };
  }

  const KINDS = {
    brickbreaker: { w: 320, h: 420, make: brick }, spaceshooter: { w: 320, h: 420, make: space },
    platformrace: { w: 400, h: 200, make: runner },
    carracing: { w: 240, h: 400, make: lanes(3, "🏎️", 190, 430, ["🚗", "🚙", "🚕", "🚌"]) },
    bikeracing: { w: 240, h: 400, make: lanes(4, "🏍️", 240, 540, ["🚲", "🛵", "🚗", "🛺"]) },
    minigolf: { w: 400, h: 300, make: golf }
  };

  function run(kind, canvas, o) {
    const K = KINDS[kind], W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d");
    const inp = { l: 0, r: 0, lt: 0, rt: 0, tap: 0, px: W / 2, py: H / 2, pd: false, moved: false };
    const game = K.make(ctx, W, H, rng(o.seed), inp);
    const kd = (e) => {
      const k = e.key, L = k === "ArrowLeft" || k === "a" || k === "A", Rr = k === "ArrowRight" || k === "d" || k === "D", J = k === " " || k === "ArrowUp" || k === "w" || k === "W";
      if (L || Rr || J || k === "ArrowDown") e.preventDefault();
      if (e.repeat) return;
      if (L) { inp.l = 1; inp.lt = 1; inp.moved = false; } if (Rr) { inp.r = 1; inp.rt = 1; inp.moved = false; } if (J) inp.tap = 1;
    };
    const ku = (e) => { const k = e.key; if (k === "ArrowLeft" || k === "a" || k === "A") inp.l = 0; if (k === "ArrowRight" || k === "d" || k === "D") inp.r = 0; };
    const pp = (e) => { const r = canvas.getBoundingClientRect(); inp.px = (e.clientX - r.left) * W / r.width; inp.py = (e.clientY - r.top) * H / r.height; inp.moved = true; };
    canvas.onpointerdown = (e) => {
      pp(e); inp.pd = true; inp.tap = 1;
      if (kind === "carracing" || kind === "bikeracing") { if (inp.px < W / 2) inp.lt = 1; else inp.rt = 1; }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    };
    canvas.onpointermove = pp;
    canvas.onpointerup = canvas.onpointercancel = () => { inp.pd = false; };
    document.addEventListener("keydown", kd); document.addEventListener("keyup", ku);
    let stopped = false, ended = false, last = performance.now(), t0 = last, liveAt = 0;
    const end = () => { if (ended) return; ended = true; o.onEnd(Math.round(game.score())); };
    function frame(now) {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const left = o.limit - (now - t0) / 1000;
      if (!ended) { game.update(dt); inp.tap = 0; if (game.over() || left <= 0) end(); }
      game.draw(); o.onHud(Math.round(game.score()), Math.max(0, left));
      if (!ended && now - liveAt > 1000) { liveAt = now; o.onLive(Math.round(game.score())); }
      if (!ended) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { stop() { stopped = true; document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku); canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = canvas.onpointercancel = null; } };
  }
  return { run, KINDS };
})();
