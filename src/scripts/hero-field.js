// Hero animation engine. Everything is drawn as square cells on one grid, then lit by a soft bloom layer.
// Timings, sizes and the cue sequence follow measurements of the reference hero:
//   24 s loop: volley (0.4-7.6 s, one launch every 1.15 s) -> raster scan (9-10.7 s)
//   -> cascade (13-18.6 s, one launch every 0.55 s) -> rest.
//   cell 7 px, trail 0.6 s, flight 0.6 s, burst 0.75 s, burst radius <= 16 cells, route speed 95 cells/s.

const LOOP = 24;
const VOLLEY = { t0: 0.4, gap: 1.15, end: 7.6 };
const RASTER = { t0: 9, dur: 1.7 };
const CASCADE = { t0: 13, gap: 0.55, end: 18.6 };
const FLIGHT_S = 0.6;
const BURST_S = 0.75;
const TRAIL_S = 0.6;
const CAP_SPEED = 95;
const CAP_MIN = 0.5;
const CAP_MAX = 1.5;
const LANES = 5;
const PITCH = 2;
const R_MAX = 16;
const CHAFF = 22;
const DRAG = 4.2;
const TWINKLE_PER_S = 6;
const SIDE_ORDER = [3, 0, 1, 2]; // left, top, right, bottom launches rotate in this order

// Brightness ramp (energy 0..1 -> one of five lit tones). The title rests at "hover", bursts flash it to "crest".
const TONE_MIX = [0.25, 0.48, 0.72, 0.88, 1]; // dim, mid, lit, hover, crest: share of --accent over --bg
const TITLE_LEVEL = 0.88;
const CREST = 1;

const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const rand = (a, b) => a + Math.random() * (b - a);

let current = null;

export function initHero() {
  current?.destroy();
  const hero = document.querySelector(".hero");
  const canvas = hero?.querySelector("canvas.field");
  const bloom = hero?.querySelector("canvas.bloom");
  if (!hero || !canvas || !bloom) return;
  current = createField(hero, canvas, bloom);
}

function createField(hero, canvas, bloom) {
  const ctx = canvas.getContext("2d");
  const bctx = bloom.getContext("2d");
  const lines = JSON.parse(hero.dataset.lines || "[]");
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0, h = 0, cell = 7, cols = 0, rows = 0;
  let E = new Float32Array(0); // transient energy per cell (decays)
  let title = new Uint8Array(0); // 1 where the title sits
  let titleCells = [];
  let box = { x0: 0, y0: 0, x1: 0, y1: 0 }; // title bounds in cells
  let tones = ["#555", "#888", "#aaa", "#ccc", "#fff"];
  const mouse = { c: -99, r: -99 };
  const heads = [];
  const bursts = [];
  const chaff = [];
  let paused = false, visible = true, running = false, raf = 0;
  let t = 0; // simulation clock in seconds (frozen while paused)
  let last = 0;
  let lastLoopT = -1;
  let twinkleAcc = 0;
  let sideIdx = 0;
  const timers = [];

  // ---------- palette: read tones from the theme so every theme keeps the same ramp ----------
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  hero.append(probe);
  function readTones() {
    tones = TONE_MIX.map((m) => {
      probe.style.color = `color-mix(in srgb, var(--accent) ${Math.round(m * 100)}%, var(--bg))`;
      return getComputedStyle(probe).color;
    });
  }
  readTones();
  const onTheme = () => readTones();
  document.addEventListener("themechange", onTheme);

  // ---------- grid + title ----------
  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = hero.clientWidth;
    h = hero.clientHeight;
    cell = w >= 1400 ? 7 : w >= 720 ? 6 : 5;
    cols = Math.ceil(w / cell);
    rows = Math.ceil(h / cell);
    for (const c of [canvas]) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bloom.width = Math.ceil(w / 5);
    bloom.height = Math.ceil(h / 5);
    E = new Float32Array(cols * rows);
    heads.length = bursts.length = chaff.length = 0;

    // Rasterise the title once, then keep only whole cells so every edge is a crisp stair-step.
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const o = off.getContext("2d");
    const th = h * 0.43;
    const narrow = w < 720;
    const rowsTxt = narrow && lines.length === 1 ? lines[0].split(" ") : lines;
    const widest = Math.max(...rowsTxt.map((l) => l.length));
    const fs = Math.min((w * (rowsTxt.length === 1 ? 0.66 : 0.9)) / widest, (th * 0.84) / (rowsTxt.length * 1.2));
    o.fillStyle = "#fff";
    o.font = `${fs}px "Press Start 2P", monospace`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    rowsTxt.forEach((l, i) => o.fillText(l, w / 2, th / 2 + (i - (rowsTxt.length - 1) / 2) * fs * 1.2));
    const data = o.getImageData(0, 0, w, h).data;
    title = new Uint8Array(cols * rows);
    titleCells = [];
    box = { x0: cols, y0: rows, x1: 0, y1: 0 };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = Math.min(w - 1, Math.floor(c * cell + cell / 2));
        const py = Math.min(h - 1, Math.floor(r * cell + cell / 2));
        if (data[(py * w + px) * 4 + 3] > 128) {
          title[r * cols + c] = 1;
          titleCells.push(r * cols + c);
          box.x0 = Math.min(box.x0, c); box.x1 = Math.max(box.x1, c);
          box.y0 = Math.min(box.y0, r); box.y1 = Math.max(box.y1, r);
        }
      }
    }
  }

  // ---------- helpers ----------
  const stamp = (c, r, v) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    const i = r * cols + c;
    if (E[i] < v) E[i] = v;
  };
  const block = (c, r, n, v) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) stamp(c + x, r + y, v); };

  // Walk a polyline, one cell at a time, so fast heads never skip cells.
  function samplePath(pts) {
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let k = 0; k < n; k++) out.push([Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n)]);
    }
    out.push(pts[pts.length - 1].map(Math.round));
    return out;
  }
  const bezier = (a, b, c, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]]);
    }
    return pts;
  };

  const burstRadius = () => Math.max(6, Math.min(R_MAX, Math.round(0.12 * Math.min(cols, rows))));

  function addBurst(c, r, R, spokes = 8 + Math.floor(Math.random() * 5)) {
    bursts.push({ c, r, R, t0: t, spokes, phase: Math.random() * Math.PI });
    if (bursts.length > 14) bursts.shift();
  }
  function addChaff(c, r, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(18, 55); // cells per second
      chaff.push({ x: c, y: r, ox: c, oy: r, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, t0: t, life: rand(0.5, 1) });
    }
  }
  function addHead(path, dur, onEnd) {
    heads.push({ path, t0: t, dur, onEnd, i: 0 });
  }

  // ---------- cues ----------
  // Volley: a head leaves one edge on a curve, lands on a stroke of the title and bursts there.
  function launchVolley() {
    if (!titleCells.length) return;
    const side = SIDE_ORDER[sideIdx++ % 4];
    const target = titleCells[Math.floor(Math.random() * titleCells.length)];
    const tc = target % cols, tr = Math.floor(target / cols);
    const start =
      side === 0 ? [rand(2, cols - 3), 1] : side === 1 ? [cols - 2, rand(2, rows * 0.6)] : side === 2 ? [rand(2, cols - 3), rows * 0.6] : [1, rand(2, rows * 0.6)];
    const mid = [(start[0] + tc) / 2, (start[1] + tr) / 2];
    const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]][side];
    const len = Math.hypot(tc - start[0], tr - start[1]);
    const push = Math.min(len * 0.22, cols < 130 ? 10 : 30);
    const ctrl = [mid[0] + dir[0] * push, mid[1] + dir[1] * push];
    const path = samplePath(bezier(start, ctrl, [tc, tr], Math.ceil(len)));
    addHead(path, FLIGHT_S, () => {
      addBurst(tc, tr, burstRadius());
      addChaff(tc, tr, cols < 130 ? 10 : CHAFF);
    });
  }

  // Cascade: a head runs along one of five lanes above the title, turns with a 45-degree chamfer and drops onto the title.
  function launchCascade() {
    if (!titleCells.length) return;
    const fromLeft = Math.random() < 0.5;
    const lane = Math.floor(Math.random() * LANES);
    const ly = Math.max(2, box.y0 - 3 - lane * PITCH);
    const tx = Math.round(rand(box.x0 + 2, box.x1 - 2));
    let ty = box.y0;
    for (let r = box.y0; r <= box.y1; r++) if (title[r * cols + tx]) { ty = r; break; }
    const sx = fromLeft ? 1 : cols - 2;
    const k = Math.min(6, Math.max(2, ty - ly));
    const dx = fromLeft ? -k : k;
    const pts = [[sx, ly], [tx + dx, ly], [tx, ly + k], [tx, ty]];
    const path = samplePath(pts);
    const dur = Math.min(CAP_MAX, Math.max(CAP_MIN, path.length / CAP_SPEED));
    addHead(path, dur, () => {
      addBurst(tx, ty, Math.round(burstRadius() * 0.5));
      addChaff(tx, ty, 8);
    });
  }

  function runRaster(lt) {
    const p = (lt - RASTER.t0) / RASTER.dur;
    if (p < 0 || p > 1 || box.y1 < box.y0) return;
    const r = Math.round(box.y0 + p * (box.y1 - box.y0));
    for (let y = r - 1; y <= r + 1; y++) {
      for (let c = box.x0 - 2; c <= box.x1 + 2; c++) {
        const i = y * cols + c;
        if (y >= 0 && y < rows && title[i]) E[i] = CREST;
      }
    }
    // tick marks at both ends of the scan line
    for (let k = 0; k < 7; k++) {
      stamp(box.x0 - 3 - k, r, 0.9 - k * 0.1);
      stamp(box.x1 + 3 + k, r, 0.9 - k * 0.1);
    }
  }

  function fireSchedule(lt) {
    const crossed = (time) => lastLoopT < time && lt >= time;
    for (let s = VOLLEY.t0; s < VOLLEY.end; s += VOLLEY.gap) if (crossed(s)) launchVolley();
    for (let s = CASCADE.t0; s < CASCADE.end; s += CASCADE.gap) if (crossed(s)) launchCascade();
    lastLoopT = lt;
    hero.dataset.cue =
      lt < VOLLEY.t0 ? "rest" : lt < VOLLEY.end ? "volley" : lt < RASTER.t0 ? "hold" : lt < RASTER.t0 + RASTER.dur ? "raster" : lt < CASCADE.t0 ? "hold" : lt < CASCADE.end ? "cascade" : "rest";
  }

  // ---------- per-frame update + draw ----------
  function step(dt) {
    // energy decays so a head leaves a 0.6 s trail
    const decay = dt / TRAIL_S;
    for (let i = 0; i < E.length; i++) if (E[i] > 0) E[i] = Math.max(0, E[i] - decay);

    for (let i = heads.length - 1; i >= 0; i--) {
      const hd = heads[i];
      const p = Math.min(1, (t - hd.t0) / hd.dur);
      const idx = Math.floor(ease(p) * (hd.path.length - 1));
      for (let k = hd.i; k <= idx; k++) {
        const [c, r] = hd.path[k];
        block(c - 1, r - 1, 2, CREST);
      }
      hd.i = idx;
      if (p >= 1) { heads.splice(i, 1); hd.onEnd?.(); }
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      const age = (t - b.t0) / BURST_S;
      if (age >= 1) { bursts.splice(i, 1); continue; }
      const fade = 1 - age;
      if (age < 0.3) block(b.c - 1, b.r - 1, 3, CREST * (1 - age * 2));
      const rad = 2 + b.R * ease(age);
      const n = Math.max(12, Math.round(rad * 5));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        stamp(Math.round(b.c + Math.cos(a) * rad), Math.round(b.r + Math.sin(a) * rad), 0.95 * fade);
      }
      for (let k = 0; k < b.spokes; k++) {
        const a = b.phase + (k / b.spokes) * Math.PI * 2;
        for (let d = rad * 0.55; d < rad * 1.3; d += 1.5) stamp(Math.round(b.c + Math.cos(a) * d), Math.round(b.r + Math.sin(a) * d), 0.7 * fade);
      }
    }

    for (let i = chaff.length - 1; i >= 0; i--) {
      const p = chaff[i];
      const age = t - p.t0;
      if (age > p.life) { chaff.splice(i, 1); continue; }
      const k = (1 - Math.exp(-DRAG * age)) / DRAG; // exponential drag, same shape as the reference
      stamp(Math.round(p.ox + p.vx * k), Math.round(p.oy + p.vy * k + 14 * age * age), 0.62 * (1 - age / p.life));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const buckets = [[], [], [], [], []];
    const put = (i, v) => {
      if (v < 0.12) return;
      buckets[v < 0.3 ? 0 : v < 0.55 ? 1 : v < 0.78 ? 2 : v < 0.93 ? 3 : 4].push(i);
    };
    for (let i = 0; i < E.length; i++) if (E[i] > 0.12 && !title[i]) put(i, E[i]);
    for (const i of titleCells) {
      let v = Math.max(TITLE_LEVEL, E[i]);
      // pointer lights the title under it
      const c = i % cols, r = (i / cols) | 0;
      const d = Math.hypot(c - mouse.c, r - mouse.r);
      if (d < 5) v = Math.max(v, TITLE_LEVEL + 0.12 * (1 - d / 5));
      put(i, v);
    }
    for (let b = 0; b < 5; b++) {
      if (!buckets[b].length) continue;
      ctx.fillStyle = tones[b];
      for (const i of buckets[b]) ctx.fillRect((i % cols) * cell, ((i / cols) | 0) * cell, cell, cell);
    }
    // bloom: a tiny copy, stretched by CSS, reads as a soft halo around lit cells
    bctx.clearRect(0, 0, bloom.width, bloom.height);
    bctx.drawImage(canvas, 0, 0, bloom.width, bloom.height);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    const fxOn = root.dataset.fx === "on";
    if (!fxOn) E.fill(0);
    if (!paused && fxOn) {
      t += dt;
      fireSchedule(t % LOOP);
      runRaster(t % LOOP);
      twinkleAcc += dt * TWINKLE_PER_S;
      while (twinkleAcc >= 1 && titleCells.length) {
        twinkleAcc -= 1;
        E[titleCells[Math.floor(Math.random() * titleCells.length)]] = CREST;
      }
      step(dt);
    }
    if (!paused) draw();
    raf = requestAnimationFrame(frame);
  }
  const start = () => {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  // ---------- input ----------
  let parallaxQueued = false;
  const onMove = (e) => {
    const r = hero.getBoundingClientRect();
    mouse.c = Math.floor((e.clientX - r.left) / cell);
    mouse.r = Math.floor((e.clientY - r.top) / cell);
    if (w < 720 || reduce || parallaxQueued) return;
    parallaxQueued = true;
    requestAnimationFrame(() => {
      parallaxQueued = false;
      hero.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      hero.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
  };
  const onLeave = () => { mouse.c = mouse.r = -99; };
  // A click anywhere in the hero (outside controls) drops a burst there.
  const onDown = (e) => {
    if (e.target.closest("button, a") || root.dataset.fx !== "on" || reduce) return;
    const r = hero.getBoundingClientRect();
    addBurst(Math.floor((e.clientX - r.left) / cell), Math.floor((e.clientY - r.top) / cell), Math.round(burstRadius() * 0.85));
  };
  hero.addEventListener("pointermove", onMove);
  hero.addEventListener("pointerleave", onLeave);
  hero.addEventListener("pointerdown", onDown);

  const pauseBtn = hero.querySelector(".pause");
  const onPause = () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.querySelector(".sr-only").textContent = paused ? "Resume hero animation " : "Pause hero animation ";
    pauseBtn.querySelector("[aria-hidden]").textContent = paused ? "▶" : "II";
  };
  pauseBtn?.addEventListener("click", onPause);

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    visible ? start() : stop();
  });
  io.observe(hero);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  const onResize = () => build();
  addEventListener("resize", onResize);

  document.fonts.load('20px "Press Start 2P"').then(() => {
    build();
    draw();
    if (!reduce) start();
  });

  return {
    destroy() {
      stop();
      io.disconnect();
      timers.forEach(clearTimeout);
      probe.remove();
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("pointerdown", onDown);
      pauseBtn?.removeEventListener("click", onPause);
      document.removeEventListener("themechange", onTheme);
      document.removeEventListener("visibilitychange", onVis);
      removeEventListener("resize", onResize);
    },
  };
}
