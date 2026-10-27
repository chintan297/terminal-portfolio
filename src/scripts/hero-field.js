// Hero animation engine. Everything is drawn as square cells on one grid, then lit by a soft bloom layer.
// Timings, sizes and the cue sequence follow measurements of the reference hero:
//   24 s loop: volley (0.4-7.6 s, one launch every 1.15 s) -> raster scan (9-10.7 s)
//   -> cascade (13-18.6 s, one launch every 0.55 s) -> rest.
//   cell 7 px, trail 0.6 s, flight 0.6 s, burst 0.75 s, burst radius <= 16 cells, route speed 95 cells/s.

const LOOP = 24;
const VOLLEY = { t0: 0.8, gap: 2.2, end: 7.6 };
const RASTER = { t0: 9, dur: 1.7, every: 24 }; // the name is scanned top to bottom once per 24 s loop
const CASCADE = { t0: 13, gap: 1.8, end: 18.6 };
const FLIGHT_S = 0.6;
const BURST_S = 0.75;
const TRAIL_S = 0.6;
const CAP_SPEED = 95;
const CAP_MIN = 0.5;
const CAP_MAX = 1.5;
const LANES = 5;
const PITCH = 2;
const R_MAX = 12;
const CHAFF = 14;
const DRAG = 4.2;
const TWINKLE_PER_S = 3;
const CORNER_RUN = 10; // seconds for the four corner shots to reach the next corner (all together)
const CORNER_LOOP = CORNER_RUN; // no rest: the next round starts the moment the shots reach the corners
const SIDE_ORDER = [3, 0, 1, 2]; // left, top, right, bottom launches rotate in this order

// Brightness ramp (energy 0..1 -> one of five lit tones). The title rests at "hover", bursts flash it to "crest".
const TONE_MIX = [0.25, 0.48, 0.72, 0.88, 1]; // dim, mid, lit, hover, crest: share of --accent over --bg
const TITLE_LEVEL = 0.88; // the title rests slightly below full white so the scan and bursts read as a flash
const CREST = 1;
const DARK_LEVEL = 0.2; // tone a letter cell drops to when a spark merges into it
const DARK_S = 0.9; // seconds to fade back to the resting tone

const PIXEL_FONT = '"Departure Mono", monospace';

// Advance width and one-font-pixel size (both as a share of the em), measured from the font so no grid size is assumed.
function fontMetrics() {
  const c = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  c.canvas.width = c.canvas.height = 300;
  c.font = `200px ${PIXEL_FONT}`;
  c.textBaseline = "alphabetic";
  const adv = c.measureText("M").width / 200 || 0.6;
  c.fillText("H", 20, 230);
  const row = c.getImageData(0, 224, 300, 1).data;
  let a = 0;
  while (a < 300 && row[a * 4 + 3] <= 128) a++;
  let b = a;
  while (b < 300 && row[b * 4 + 3] > 128) b++;
  const ur = b > a ? (b - a) / 200 : 0.1;
  return { adv, ur };
}

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

  let w = 0,
    h = 0,
    cell = 7,
    cols = 0,
    rows = 0;
  let ox = 0,
    oy = 0,
    dprC = 1; // grid offset inside the hero (px) and device pixel ratio
  let E = new Float32Array(0); // transient energy per cell (decays)
  let D = new Float32Array(0); // 0..1 darkening of a title cell where a spark just merged, fades back to its normal tone
  let title = new Uint8Array(0); // 1 where the title sits
  let titleCells = [];
  let letterCells = []; // title cells grouped by letter, so one burst can merge into just a few letters
  let box = { x0: 0, y0: 0, x1: 0, y1: 0 }; // title bounds in cells
  let tones = ["#555", "#888", "#aaa", "#ccc", "#fff"];
  const mouse = { c: -99, r: -99 };
  let tx = 0,
    ty = 0,
    sx = 0,
    sy = 0; // pointer offset from the hero centre (-1..1): target and eased value, drives the 3D depth
  const card = hero.parentElement?.querySelector(".home-card");
  const heads = [];
  const bursts = [];
  const chaff = [];
  let paused = false,
    visible = true,
    running = false,
    raf = 0,
    ready = false; // ready: grid and title built, safe to animate
  let t = 0; // simulation clock in seconds (frozen while paused)
  let last = 0;
  let lastLoopT = -1;
  let twinkleAcc = 0;
  let sideIdx = 0;
  const timers = [];
  let sides = []; // block origins along each side of the hero frame, clockwise
  let lastPhase = 0;
  let sidePrev = []; // last stamped index per side in the current round

  // ---------- palette: read tones from the theme so every theme keeps the same ramp ----------
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none";
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
    const dpr = Math.min(devicePixelRatio || 1, 3); // full device resolution (4K / retina)
    w = hero.clientWidth;
    h = hero.clientHeight;
    cell = w >= 1400 ? 7 : w >= 720 ? 6 : 5;
    const th = h * 0.43;
    const narrow = w < 720;
    const rowsTxt = narrow && lines.length === 1 ? lines[0].split(" ") : lines;
    const widest = Math.max(...rowsTxt.map((l) => l.length));
    const { adv, ur } = fontMetrics();
    const fsMax = Math.min(
      (w * (rowsTxt.length === 1 ? (narrow ? 0.84 : 0.66) : 0.9)) /
        (widest * adv),
      (th * 0.84) / (rowsTxt.length * 1.2),
    );
    // Departure Mono has one-pixel strokes: pick the largest size whose font pixel (ur of an em) is a whole number of 5-7px cells,
    // so every stroke lands on the grid without shrinking the title.
    let fs = fsMax;
    for (let u = Math.floor(fsMax * ur); u >= 5; u--) {
      const c = [7, 6, 5].find((k) => u % k === 0);
      if (c) {
        fs = u / ur;
        cell = c;
        break;
      }
    }
    // whole cells only, centred in the hero so left/right and top/bottom margins match exactly
    cols = Math.floor(w / cell);
    rows = Math.floor(h / cell);
    const gw = cols * cell,
      gh = rows * cell;
    ox = Math.floor((w - gw) / 2);
    oy = Math.floor((h - gh) / 2);
    dprC = dpr;
    // corner brackets use the same grid, so the shots run exactly over their strokes
    hero.style.setProperty("--cell", `${cell}px`);
    hero.style.setProperty("--gw", `${gw}px`);
    hero.style.setProperty("--gh", `${gh}px`);
    hero.style.setProperty("--ox", `${ox}px`);
    hero.style.setProperty("--oy", `${oy}px`);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // drawing is done in device pixels so every cell edge lands on a whole pixel
    bloom.width = Math.ceil(w / 5);
    bloom.height = Math.ceil(h / 5);
    E = new Float32Array(cols * rows);
    D = new Float32Array(cols * rows);
    heads.length = bursts.length = chaff.length = 0;
    // frame sides: blocks hugging the hero edge, one cell in. Side i runs clockwise from corner i to corner i+1.
    const nc = Math.max(1, cols - 3),
      nr = Math.max(1, rows - 3);
    sides = [
      Array.from({ length: nc }, (_, c) => [1 + c, 1]),
      Array.from({ length: nr }, (_, r) => [cols - 2, 1 + r]),
      Array.from({ length: nc }, (_, c) => [cols - 2 - c, rows - 2]),
      Array.from({ length: nr }, (_, r) => [1, rows - 2 - r]),
    ];
    sidePrev = [-1, -1, -1, -1];

    // Rasterise the title once in grid space, then keep only whole cells so every edge is a crisp stair-step.
    const off = document.createElement("canvas");
    off.width = gw;
    off.height = gh;
    const o = off.getContext("2d");
    const pitch = Math.max(cell, Math.round((fs * 1.2) / cell) * cell);
    o.font = `${fs}px ${PIXEL_FONT}`;
    o.textAlign = "left";
    o.textBaseline = "alphabetic";
    const drawTitle = (dx, dy) => {
      o.clearRect(0, 0, gw, gh);
      o.fillStyle = "#fff";
      rowsTxt.forEach((l, i) => {
        const x = Math.round((gw - l.length * adv * fs) / 2 / cell) * cell;
        const y =
          Math.round(
            (th / 2 + (i - (rowsTxt.length - 1) / 2) * pitch + fs / 2) / cell,
          ) * cell;
        // a second copy one cell right and down fattens every stroke by one cell: thicker than a bare font pixel, still on the grid
        for (const [ex, ey] of [
          [0, 0],
          [cell, 0],
          [0, cell],
          [cell, cell],
        ])
          o.fillText(l, x + dx + ex, y + dy + ey);
      });
    };
    // first pass finds where the ink starts; second pass shifts it so glyph edges sit exactly on cell boundaries
    drawTitle(0, 0);
    const probeData = o.getImageData(0, 0, gw, gh).data;
    let minX = gw,
      minY = gh,
      maxY = 0;
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++)
        if (probeData[(y * gw + x) * 4 + 3] > 128) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    // title + gap + intro card are centred as one block in the hero (the card sits `gap` px under the title), snapped to the grid
    const gap = narrow ? 40 : 70;
    const groupH = maxY - minY + 1 + gap + (card?.offsetHeight || 0);
    const topInk = Math.max(24, Math.round((h - groupH) / 2));
    drawTitle(
      minX < gw ? -(minX % cell) : 0,
      minY < gh ? Math.round((topInk - oy) / cell) * cell - minY : 0,
    );
    const data = o.getImageData(0, 0, gw, gh).data;
    title = new Uint8Array(cols * rows);
    titleCells = [];
    box = { x0: cols, y0: rows, x1: 0, y1: 0 };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = Math.floor(c * cell + cell / 2);
        const py = Math.floor(r * cell + cell / 2);
        if (data[(py * gw + px) * 4 + 3] > 128) {
          title[r * cols + c] = 1;
          titleCells.push(r * cols + c);
          box.x0 = Math.min(box.x0, c);
          box.x1 = Math.max(box.x1, c);
          box.y0 = Math.min(box.y0, r);
          box.y1 = Math.max(box.y1, r);
        }
      }
    }
    // group the title cells by letter (each glyph is fs/cell cells wide)
    const letterW = Math.max(1, (fs * adv) / cell);
    letterCells = Array.from(
      { length: Math.max(1, Math.ceil((box.x1 - box.x0 + 1) / letterW)) },
      () => [],
    );
    for (const i of titleCells)
      letterCells[
        Math.min(
          letterCells.length - 1,
          Math.max(0, Math.floor(((i % cols) - box.x0) / letterW)),
        )
      ].push(i);
    (hero.parentElement || hero).style.setProperty(
      "--tb",
      `${(box.y1 + 1) * cell + oy}px`,
    ); // where the title ends, so the intro card can sit 70px below it
  }

  // ---------- helpers ----------
  const stamp = (c, r, v) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    const i = r * cols + c;
    if (E[i] < v) E[i] = v;
  };
  const block = (c, r, n, v) => {
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) stamp(c + x, r + y, v);
  };

  // Walk a polyline, one cell at a time, so fast heads never skip cells.
  function samplePath(pts) {
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1],
        [x1, y1] = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let k = 0; k < n; k++)
        out.push([
          Math.round(x0 + ((x1 - x0) * k) / n),
          Math.round(y0 + ((y1 - y0) * k) / n),
        ]);
    }
    out.push(pts[pts.length - 1].map(Math.round));
    return out;
  }
  const bezier = (a, b, c, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([
        (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0],
        (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1],
      ]);
    }
    return pts;
  };

  // Nearest open spot to (c, r) with no letter cell within `m` cells, so firecrackers never go off on the text itself.
  function offText(c, r, m = 4) {
    const clear = (x, y) => {
      if (x < 2 || y < 2 || x >= cols - 2 || y >= rows - 2) return false;
      for (let dy = -m; dy <= m; dy++)
        for (let dx = -m; dx <= m; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (
            xx >= 0 &&
            yy >= 0 &&
            xx < cols &&
            yy < rows &&
            title[yy * cols + xx]
          )
            return false;
        }
      return true;
    };
    for (let rad = 0; rad < 40; rad++) {
      const found = [];
      for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
          if (clear(c + dx, r + dy)) found.push([c + dx, r + dy]);
        }
      if (found.length) return found[Math.floor(Math.random() * found.length)];
    }
    return [c, r];
  }
  // A random spot in the open space around the layout: left of the name, right of it, or in the strip under the intro card.
  function openSpot(minR = 0) {
    const hr = hero.getBoundingClientRect();
    const cr = card?.getBoundingClientRect();
    const cl = cr ? (cr.left - hr.left - ox) / cell : cols * 0.27;
    const cRight = cr ? (cr.right - hr.left - ox) / cell : cols * 0.73;
    const cb = cr ? (cr.bottom - hr.top - oy) / cell : rows * 0.8;
    const top = Math.max(Math.round(rows * 0.08), minR),
      bottom = rows - 6;
    const regions = [
      { c0: 6, c1: cl - 8, r0: top, r1: bottom, wgt: 1 }, // left
      { c0: cRight + 8, c1: cols - 7, r0: top, r1: bottom, wgt: 1 }, // right
      { c0: cl + 4, c1: cRight - 4, r0: cb + 4, r1: bottom, wgt: 0.7 }, // under the card
    ].filter((g) => g.c1 > g.c0 + 2 && g.r1 > g.r0 + 2);
    for (let n = 0; n < 30 && regions.length; n++) {
      let pick = Math.random() * regions.reduce((a, g) => a + g.wgt, 0),
        g = regions[0];
      for (const q of regions) {
        if ((pick -= q.wgt) <= 0) {
          g = q;
          break;
        }
      }
      const c = Math.round(rand(g.c0, g.c1)),
        r = Math.round(rand(g.r0, g.r1));
      if (!hasTitleNear(c, r, 3)) return [c, r];
    }
    return offText(Math.round(cols / 2), Math.round(rows * 0.2));
  }
  function hasTitleNear(c, r, m) {
    for (let dy = -m; dy <= m; dy++)
      for (let dx = -m; dx <= m; dx++) {
        const x = c + dx,
          y = r + dy;
        if (x >= 0 && y >= 0 && x < cols && y < rows && title[y * cols + x])
          return true;
      }
    return false;
  }
  const burstRadius = () =>
    Math.max(6, Math.min(R_MAX, Math.round(0.12 * Math.min(cols, rows))));

  function addBurst(c, r, R, spokes = 8 + Math.floor(Math.random() * 5)) {
    bursts.push({ c, r, R, t0: t, spokes, phase: Math.random() * Math.PI });
    if (bursts.length > 28) bursts.shift();
  }
  function addChaff(c, r, n, merge = false) {
    // the sparks of one burst all merge into the same 2-3 neighbouring letters, the ones closest to the burst
    const lw = Math.max(1, (box.x1 - box.x0 + 1) / letterCells.length);
    const near = Math.min(
      letterCells.length - 1,
      Math.max(0, Math.floor((c - box.x0) / lw)),
    );
    const count = Math.min(
      letterCells.length,
      2 + Math.floor(Math.random() * 2),
    );
    const first = Math.min(
      letterCells.length - count,
      Math.max(0, near - Math.floor(Math.random() * count)),
    );
    const pool = merge ? letterCells.slice(first, first + count).flat() : [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(18, 55); // cells per second
      const joins = pool.length > 0 && Math.random() < 0.5; // half the sparks merge into the letters, the other half just fall away
      chaff.push({
        x: c,
        y: r,
        ox: c,
        oy: r,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 6,
        t0: t,
        life: joins ? rand(0.4, 0.8) : rand(0.7, 1.2),
        tgt: joins ? pool[Math.floor(Math.random() * pool.length)] : -1,
        ret: 0,
      });
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
    const [tc, tr] = openSpot();
    const start = openSpot(box.y1 + 5); // shots leave from the open area below the name, never from the top edge
    const mid = [(start[0] + tc) / 2, (start[1] + tr) / 2];
    const dir = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ][side];
    const len = Math.hypot(tc - start[0], tr - start[1]);
    const push = Math.min(len * 0.22, cols < 130 ? 10 : 30);
    const ctrl = [mid[0] + dir[0] * push, mid[1] + dir[1] * push];
    const path = samplePath(bezier(start, ctrl, [tc, tr], Math.ceil(len)));
    addHead(path, FLIGHT_S, () => {
      addBurst(tc, tr, burstRadius());
      addChaff(tc, tr, cols < 130 ? 10 : CHAFF, true);
    });
  }

  // Aakash baazi: a rocket climbs from the bottom edge at a random x, bursts at a random height and sparks fall back down.
  // `at` = [col, row] to burst exactly there (a click); otherwise a random spot in the open sky
  function launchRocket(at) {
    const sc = Math.round(
      at
        ? Math.min(cols - 5, Math.max(4, at[0] + rand(-30, 30)))
        : rand(4, cols - 5),
    );
    // burst in the sky just off the name; the sparks then drift back into it
    let tc = sc,
      tr = Math.round(rows * 0.3);
    if (at) {
      [tc, tr] = offText(at[0], at[1]);
    }
    for (let n = 0; !at && n < 24; n++) {
      tc = Math.round(rand(6, cols - 7));
      tr = Math.round(rand(rows * 0.08, rows * 0.7));
      const far =
        tc < box.x0 - 4 ||
        tc > box.x1 + 4 ||
        tr < box.y0 - 4 ||
        tr > box.y1 + 4;
      const underCard = tr > box.y1 + 6 && tc > cols * 0.25 && tc < cols * 0.75; // the intro card covers the middle below the name
      if ((far && !underCard) || !titleCells.length) break;
    }
    // a click can be answered from any edge; random rockets always rise from the bottom
    const side = at ? Math.floor(Math.random() * 3) : 0;
    const start =
      side === 0
        ? [sc, rows - 1]
        : side === 1
          ? [1, rand(rows * 0.5, rows - 2)]
          : [cols - 2, rand(rows * 0.5, rows - 2)];
    const len = Math.hypot(tc - start[0], tr - start[1]);
    const ctrl = [
      (start[0] + tc) / 2 + rand(-8, 8),
      (start[1] + tr) / 2 + rand(-8, 8),
    ];
    const path = samplePath(
      bezier(start, ctrl, [tc, tr], Math.max(2, Math.ceil(len))),
    );
    addHead(
      path,
      at ? Math.min(1.3, Math.max(0.7, len / 140)) : rand(0.9, 1.4),
      () => {
        const R = Math.round(
          burstRadius() * (at ? rand(1, 1.2) : rand(0.8, 1.1)),
        );
        addBurst(tc, tr, R, 14 + Math.floor(Math.random() * 9));
        addChaff(tc, tr, cols < 130 ? 12 : 26, true);
      },
    );
  }

  // Cascade: a head runs along one of five lanes above the title, turns with a 45-degree chamfer and drops onto the title.
  function launchCascade() {
    if (!titleCells.length) return;
    const fromLeft = Math.random() < 0.5;
    const lane = Math.floor(Math.random() * LANES);
    const ly = Math.min(rows - 3, box.y1 + 5 + lane * PITCH);
    let [tx, ty] = openSpot();
    ty = Math.min(ty, ly - 2);
    const sx = fromLeft ? 1 : cols - 2;
    const k = Math.min(6, Math.max(2, ly - ty));
    const dx = fromLeft ? -k : k;
    const pts = [
      [sx, ly],
      [tx + dx, ly],
      [tx, ly - k],
      [tx, ty],
    ];
    const path = samplePath(pts);
    const dur = Math.min(CAP_MAX, Math.max(CAP_MIN, path.length / CAP_SPEED));
    addHead(path, dur, () => {
      addBurst(tx, ty, Math.round(burstRadius() * 0.5));
      addChaff(tx, ty, 10, true);
    });
  }

  function runRaster(lt) {
    const p =
      ((((lt - RASTER.t0) % RASTER.every) + RASTER.every) % RASTER.every) /
      RASTER.dur;
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
    for (let s = VOLLEY.t0; s < VOLLEY.end; s += VOLLEY.gap)
      if (crossed(s)) launchVolley();
    for (let s = CASCADE.t0; s < CASCADE.end; s += CASCADE.gap)
      if (crossed(s)) launchCascade();
    lastLoopT = lt;
    hero.dataset.cue =
      lt < VOLLEY.t0
        ? "rest"
        : lt < VOLLEY.end
          ? "volley"
          : lt < RASTER.t0
            ? "hold"
            : lt < RASTER.t0 + RASTER.dur
              ? "raster"
              : lt < CASCADE.t0
                ? "hold"
                : lt < CASCADE.end
                  ? "cascade"
                  : "rest";
  }

  // ---------- per-frame update + draw ----------
  function step(dt) {
    // four shots, one leaving each corner along its own side; they all arrive at the next corner together
    const phase = (t % CORNER_LOOP) / CORNER_RUN;
    if (phase < lastPhase) sidePrev = [-1, -1, -1, -1]; // wrapped: start the next round from the corners
    lastPhase = phase;
    sides.forEach((path, i) => {
      if (phase >= 1) {
        sidePrev[i] = -1;
        return;
      }
      const idx = Math.min(path.length - 1, Math.floor(phase * path.length));
      for (let k = sidePrev[i] + 1; k <= idx; k++) {
        if (!path[k]) break; // paths are rebuilt on resize; never read past the end
        stamp(path[k][0], path[k][1], 0.95);
      }
      sidePrev[i] = idx;
    });

    // energy decays so a head leaves a 0.6 s trail
    const decay = dt / TRAIL_S;
    for (let i = 0; i < E.length; i++)
      if (E[i] > 0) E[i] = Math.max(0, E[i] - decay);
    for (let i = 0; i < D.length; i++)
      if (D[i] > 0) D[i] = Math.max(0, D[i] - dt / DARK_S);

    for (let i = heads.length - 1; i >= 0; i--) {
      const hd = heads[i];
      const p = Math.min(1, (t - hd.t0) / hd.dur);
      const idx = Math.floor(ease(p) * (hd.path.length - 1));
      for (let k = hd.i; k <= idx; k++) {
        const [c, r] = hd.path[k];
        block(c - 1, r - 1, 2, CREST);
      }
      hd.i = idx;
      if (p >= 1) {
        heads.splice(i, 1);
        hd.onEnd?.();
      }
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      const age = (t - b.t0) / BURST_S;
      if (age >= 1) {
        bursts.splice(i, 1);
        continue;
      }
      const fade = 1 - age;
      if (age < 0.3) block(b.c - 1, b.r - 1, 3, CREST * (1 - age * 2));
      const rad = 2 + b.R * ease(age);
      const n = Math.max(12, Math.round(rad * 5));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        stamp(
          Math.round(b.c + Math.cos(a) * rad),
          Math.round(b.r + Math.sin(a) * rad),
          0.95 * fade,
        );
      }
      for (let k = 0; k < b.spokes; k++) {
        const a = b.phase + (k / b.spokes) * Math.PI * 2;
        for (let d = rad * 0.55; d < rad * 1.3; d += 1.5)
          stamp(
            Math.round(b.c + Math.cos(a) * d),
            Math.round(b.r + Math.sin(a) * d),
            0.7 * fade,
          );
      }
    }

    // sparks fly out, then curve back and merge into a stroke of the name, which flashes where they land
    for (let i = chaff.length - 1; i >= 0; i--) {
      const p = chaff[i];
      const age = t - p.t0;
      if (!p.ret) {
        const at = Math.min(age, p.life);
        const k = (1 - Math.exp(-DRAG * at)) / DRAG; // exponential drag, same shape as the reference
        const x = p.ox + p.vx * k,
          y = p.oy + p.vy * k + 14 * at * at;
        if (age <= p.life) {
          stamp(
            Math.round(x),
            Math.round(y),
            0.62 * (1 - ((p.tgt < 0 ? 1 : 0.5) * age) / p.life),
          );
          continue;
        }
        if (p.tgt < 0) {
          chaff.splice(i, 1);
          continue;
        }
        // straight up from where it burst, over above the target letter, then a straight drop into it
        const tcol = p.tgt % cols,
          trow = (p.tgt / cols) | 0;
        const top = Math.max(2, box.y0 - rand(5, 10));
        p.pts = [
          [x, y],
          [x, Math.min(y, top)],
          [tcol + rand(-1, 1), top],
          [tcol, trow],
        ];
        p.segT = [];
        for (let k = 1; k < p.pts.length; k++) {
          const len = Math.hypot(
            p.pts[k][0] - p.pts[k - 1][0],
            p.pts[k][1] - p.pts[k - 1][1],
          );
          p.segT.push(
            k === p.pts.length - 1 ? rand(0.3, 0.45) : Math.max(0.12, len / 95),
          ); // 95 cells/s along the way, then the drop
        }
        p.ret = t;
        p.dur = p.segT.reduce((a, b) => a + b, 0);
      }
      let el = t - p.ret,
        k = 0;
      while (k < p.segT.length - 1 && el > p.segT[k]) {
        el -= p.segT[k];
        k++;
      }
      const q = Math.min(1, el / p.segT[k]);
      const last = k === p.segT.length - 1;
      const e = last ? q * q : q * q * (3 - 2 * q); // the drop speeds up like a falling spark
      const x = p.pts[k][0] + (p.pts[k + 1][0] - p.pts[k][0]) * e;
      const y = p.pts[k][1] + (p.pts[k + 1][1] - p.pts[k][1]) * e;
      stamp(Math.round(x), Math.round(y), 0.7);
      if (t - p.ret >= p.dur) {
        D[p.tgt] = 1;
        chaff.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const buckets = [[], [], [], [], []];
    const put = (i, v) => {
      if (v < 0.12) return;
      buckets[
        v < 0.3 ? 0 : v < 0.55 ? 1 : v < 0.78 ? 2 : v < 0.93 ? 3 : 4
      ].push(i);
    };
    for (let i = 0; i < E.length; i++)
      if (E[i] > 0.12 && !title[i]) put(i, E[i]);
    for (const i of titleCells) {
      let v = Math.max(TITLE_LEVEL - D[i] * (TITLE_LEVEL - DARK_LEVEL), E[i]);
      // pointer lights the title under it
      const c = i % cols,
        r = (i / cols) | 0;
      const d = Math.hypot(c - mouse.c, r - mouse.r);
      if (d < 5) v = Math.max(v, TITLE_LEVEL + 0.12 * (1 - d / 5));
      put(i, v);
    }
    for (let b = 0; b < 5; b++) {
      if (!buckets[b].length) continue;
      ctx.fillStyle = tones[b];
      for (const i of buckets[b]) {
        const x0 = Math.round((ox + (i % cols) * cell) * dprC),
          y0 = Math.round((oy + ((i / cols) | 0) * cell) * dprC);
        ctx.fillRect(
          x0,
          y0,
          Math.round((ox + (i % cols) * cell + cell) * dprC) - x0,
          Math.round((oy + ((i / cols) | 0) * cell + cell) * dprC) - y0,
        );
      }
    }
    // bloom: a tiny copy, stretched by CSS, reads as a soft halo around lit cells
    bctx.clearRect(0, 0, bloom.width, bloom.height);
    bctx.drawImage(canvas, 0, 0, bloom.width, bloom.height);
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame); // re-arm first so one bad frame can never stop the loop
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
    sx += (tx - sx) * 0.1;
    sy += (ty - sy) * 0.1;
    if (card) {
      const ax = -sy * 2.2,
        ay = sx * 3,
        ang = Math.hypot(ax, ay);
      card.style.rotate =
        ang > 0.02 && !reduce && w >= 720 && fxOn
          ? `${ax.toFixed(3)} ${ay.toFixed(3)} 0 ${ang.toFixed(3)}deg`
          : "";
    }
    if (!paused) draw();
  }
  const start = () => {
    if (!ready || running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // ---------- input ----------
  let parallaxQueued = false;
  const onMove = (e) => {
    const r = hero.getBoundingClientRect();
    mouse.c = Math.floor((e.clientX - r.left - ox) / cell);
    mouse.r = Math.floor((e.clientY - r.top - oy) / cell);
    if (w < 720 || reduce || parallaxQueued) return;
    parallaxQueued = true;
    requestAnimationFrame(() => {
      parallaxQueued = false;
      hero.style.setProperty(
        "--px",
        (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3),
      );
      hero.style.setProperty(
        "--py",
        (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3),
      );
    });
  };
  const onLeave = () => {
    mouse.c = mouse.r = -99;
  };
  // A click anywhere in the hero (outside controls) sends a firecracker up from the bottom; it bursts at the click and the pixels fly back into the name.
  const onDown = (e) => {
    if (e.target.closest("button, a") || root.dataset.fx !== "on" || reduce)
      return;
    const r = hero.getBoundingClientRect();
    launchRocket([
      Math.max(
        2,
        Math.min(cols - 3, Math.floor((e.clientX - r.left - ox) / cell)),
      ),
      Math.max(
        2,
        Math.min(rows - 3, Math.floor((e.clientY - r.top - oy) / cell)),
      ),
    ]);
  };
  const stage = hero.parentElement || hero;
  const onTilt = (e) => {
    const r = hero.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const onTiltEnd = () => {
    tx = ty = 0;
  };
  stage.addEventListener("pointermove", onTilt);
  stage.addEventListener("pointerleave", onTiltEnd);
  hero.addEventListener("pointermove", onMove);
  hero.addEventListener("pointerleave", onLeave);
  hero.addEventListener("pointerdown", onDown);

  const pauseBtn = hero.querySelector(".pause");
  const onPause = () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.querySelector(".sr-only").textContent = paused
      ? "Resume hero animation "
      : "Pause hero animation ";
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

  document.fonts.load(`20px ${PIXEL_FONT}`).then(() => {
    build();
    ready = true;
    draw();
    if (!reduce) start();
  });

  return {
    destroy() {
      stop();
      io.disconnect();
      timers.forEach(clearTimeout);
      probe.remove();
      stage.removeEventListener("pointermove", onTilt);
      stage.removeEventListener("pointerleave", onTiltEnd);
      if (card) card.style.rotate = "";
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
