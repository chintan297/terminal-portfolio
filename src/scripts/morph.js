import { prefersReducedMotion } from "./motion.js";

// Page change that does not feel like a page change: the old page stays on screen and melts into the new one, and every
// visible LETTER travels, one by one, from where it was to where it is on the next page (rising a little and lighting up on the way).
//
//  - Before the swap, every visible word of the old page is measured and a copy of the old page is kept.
//  - After the swap the copy (text made invisible) fades out while the new page (text invisible too) fades in, so the
//    panels and borders cross-dissolve and the screen is never empty.
//  - A layer of "ghost" words moves from the old positions to the new ones. Words that exist on both pages (same text)
//    simply travel; every other word is paired with the nearest old word, leaves it and turns into the new word on the way.
//  - When the ghosts have landed, the real text takes over at exactly the same spot.
// Desktop only (phones use the pixel sweep in wipe.js). Every page change gets it (links, search, shortcuts, back/forward);
// only reduced motion skips it and just swaps.
const coarse = matchMedia("(pointer: coarse)").matches;
const MAX_CHARS = coarse ? 420 : 700; // letters measured and animated
const MOVE = 760; // ms for a letter to travel
const SPREAD = 340; // ms over which the letters set off, top of the screen first
const CROSS = 520; // ms for the old page to dissolve into the new one
const SAFETY = 3200; // if anything goes wrong, the page is shown after this long

let snapshot = null; // { words (letters), clone }
let waiting = false;
let layer = null;
let raf = 0;

const root = document.documentElement;
const clamp = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// every visible letter of a page: where it is and what it looks like
function readWords(main) {
  const out = [];
  const vh = innerHeight;
  const range = document.createRange();
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  const styles = new Map();
  while (walker.nextNode() && out.length < MAX_CHARS) {
    const node = walker.currentNode;
    if (!/\S/.test(node.nodeValue)) continue;
    const el = node.parentElement;
    if (!el || el.closest("script, style, noscript, canvas, svg, video, .sr-only, [hidden]")) continue;
    let st = styles.get(el);
    if (st === undefined) {
      const cs = getComputedStyle(el);
      st = cs.display === "none" || cs.visibility === "hidden" ? null : { color: cs.color, font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, tt: cs.textTransform };
      styles.set(el, st);
    }
    if (!st) continue;
    const text = node.nodeValue;
    for (let i = 0; i < text.length && out.length < MAX_CHARS; i++) {
      if (/\s/.test(text[i])) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (!r || r.width < 1 || r.bottom < 0 || r.top > vh) continue;
      const ch = st.tt === "uppercase" ? text[i].toUpperCase() : st.tt === "lowercase" ? text[i].toLowerCase() : text[i];
      out.push({ ch, key: text[i].toLowerCase(), x: r.left, y: r.top, color: st.color, font: st.font });
    }
  }
  return out;
}

function nearest(list, x, y) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < list.length; i++) {
    const d = (list[i].x - x) ** 2 + (list[i].y - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function finish() {
  cancelAnimationFrame(raf);
  layer?.remove();
  layer = null;
  root.classList.remove("morph-wait", "morphing");
  waiting = false;
  snapshot = null;
}

// The letters are drawn on ONE canvas in a single animation loop (a thousand separate animated elements stutter).
function play(old, next, clone) {
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "morph-layer";
    layer.setAttribute("aria-hidden", "true");
    if (clone) layer.append(clone);
    document.body.append(layer);
  }
  const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
  const cv = document.createElement("canvas");
  cv.width = Math.round(innerWidth * dpr);
  cv.height = Math.round(innerHeight * dpr);
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  layer.append(cv);
  const ctx = cv.getContext("2d");
  if (clone) clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CROSS, easing: "ease-in-out", fill: "forwards" });
  const hi = getComputedStyle(root).getPropertyValue("--bright").trim() || "#fff";

  // font metrics: where the baseline sits below the top of a letter's box
  const ascents = new Map();
  const ascent = (font) => {
    let a = ascents.get(font);
    if (a === undefined) {
      ctx.font = font;
      a = ctx.measureText("M").fontBoundingBoxAscent ?? parseFloat(font.split(" ")[1]) * 0.8;
      ascents.set(font, a);
    }
    return a;
  };

  // reading order decides when a letter sets off
  const order = next.map((n, i) => [n.y * 4 + n.x / innerWidth, i]).sort((a, b) => a[0] - b[0]);
  const rank = new Array(next.length);
  order.forEach(([, i], r) => (rank[i] = r / Math.max(1, next.length - 1)));

  // 1. same letter on both pages: it travels. 2. every other new letter leaves the nearest unused old letter and turns into the new one.
  const byKey = new Map();
  for (const o of old) (byKey.get(o.key) ?? byKey.set(o.key, []).get(o.key)).push(o);
  const parts = []; // { from, to, kind, delay, lift }
  const rest = [];
  next.forEach((n, i) => {
    const pool = byKey.get(n.key);
    const j = pool?.length ? nearest(pool, n.x, n.y) : -1;
    if (j >= 0) parts.push({ from: pool.splice(j, 1)[0], to: n, kind: "same", i });
    else rest.push([n, i]);
  });
  const unused = [...byKey.values()].flat();
  for (const [n, i] of rest) {
    const j = nearest(unused, n.x, n.y);
    if (j >= 0) parts.push({ from: unused.splice(j, 1)[0], to: n, kind: "swap", i });
    else {
      const k = nearest(old, n.x, n.y);
      parts.push({ from: k >= 0 ? old[k] : { x: n.x, y: n.y + 16, ch: n.ch, color: n.color, font: n.font }, to: n, kind: "in", i });
    }
  }
  for (const q of parts) {
    q.delay = rank[q.i] * SPREAD + Math.random() * 40;
    q.lift = -Math.min(26, 6 + Math.hypot(q.from.x - q.to.x, q.from.y - q.to.y) * 0.06);
  }
  parts.sort((a, b) => (a.to.font < b.to.font ? -1 : a.to.font > b.to.font ? 1 : 0)); // fewer font changes while drawing

  const t0 = performance.now();
  const total = SPREAD + MOVE + 60;
  return new Promise((resolve) => {
    const frame = (now) => {
      const el = now - t0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.textBaseline = "alphabetic";
      let font = "";
      const put = (ch, f, color, x, y, scale, alpha) => {
        if (f !== font) { ctx.font = f; font = f; }
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, x * dpr, (y + ascent(f)) * dpr);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillText(ch, 0, 0);
      };
      for (const q of parts) {
        const p = easeOut(clamp((el - q.delay) / MOVE));
        const arc = Math.sin(Math.PI * p);
        const x = q.from.x + (q.to.x - q.from.x) * p;
        const y = q.from.y + (q.to.y - q.from.y) * p + q.lift * arc;
        const sc = 1 + 0.28 * arc;
        if (q.kind === "same") {
          put(q.to.ch, q.to.font, q.to.color, x, y, sc, 1);
          if (arc > 0.08) put(q.to.ch, q.to.font, hi, x, y, sc, arc * arc * 0.75); // lights up while it flies
        } else {
          put(q.to.ch, q.to.font, q.to.color, x, y, sc, q.kind === "in" ? clamp(p * 1.4) : p);
          if (q.kind === "swap") put(q.from.ch, q.from.font, q.from.color, q.from.x + (q.to.x - q.from.x) * p, q.from.y + (q.to.y - q.from.y) * p + q.lift * arc, sc, 1 - p);
          if (arc > 0.08) put(q.to.ch, q.to.font, hi, x, y, sc, arc * arc * 0.6 * p);
        }
      }
      // old letters nobody took fade out where they were
      for (const o of unused) put(o.ch, o.font, o.color, o.x, o.y, 1, Math.max(0, 1 - el / 300));
      ctx.globalAlpha = 1;
      if (el < total) raf = requestAnimationFrame(frame);
      else resolve();
    };
    raf = requestAnimationFrame(frame);
  });
}

async function run() {
  const main = document.getElementById("main");
  const old = snapshot;
  try {
    const next = main ? readWords(main) : [];
    root.classList.remove("morph-wait");
    if (!old?.words.length || !next.length) return;
    root.classList.add("morphing"); // the real text of the new page turns transparent; panels and borders stay
    main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CROSS, easing: "ease-in-out" });
    await play(old.words, next, old.clone);
    // hand over: the real text appears and the drawn letters fade out over it, so a sub-pixel difference cannot show as a jump
    root.classList.remove("morphing");
    if (layer) await layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-out", fill: "forwards" }).finished.catch(() => {});
  } finally {
    finish();
  }
}

// a copy of the old page, laid out exactly where it is now, with its text hidden and its animations switched off
function copyOf(main) {
  const clone = main.cloneNode(true);
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
  clone.querySelectorAll("script, noscript, canvas").forEach((e) => e.remove());
  const r = main.getBoundingClientRect();
  clone.classList.add("morph-clone");
  clone.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;pointer-events:none`;
  return clone;
}

export function bindMorph() {
  if (window.__morphBound || prefersReducedMotion()) return;
  window.__morphBound = true;

  document.addEventListener("astro:before-preparation", () => {
    // a new page change while the last effect is still running: end the old one cleanly first
    if (layer || waiting) finish();
    snapshot = null;
    if (innerWidth < 720) return; // phones use the pixel sweep (wipe.js)
    const main = document.getElementById("main");
    if (main) snapshot = { words: readWords(main), clone: copyOf(main) };
  });

  // the new page is in place but not painted yet: hide it so it cannot flash before the words start moving
  document.addEventListener("astro:after-swap", () => {
    if (!snapshot?.words.length) return;
    waiting = true;
    // entrance animations of the new page are switched off for this visit: the page must already stand where it will
    // stay, otherwise the letters would land on positions that move a few pixels afterwards (a jolt at the very end).
    // The class goes away by itself with the next page swap.
    root.classList.add("morph-wait", "morph-static");
    // keep the old page on screen right away (the copy is added to the layer in play(); until then show it directly)
    layer = document.createElement("div");
    layer.className = "morph-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.append(snapshot.clone);
    document.body.append(layer);
    setTimeout(() => { if (waiting || layer) finish(); }, SAFETY);
  });

  document.addEventListener("astro:page-load", () => {
    if (waiting) requestAnimationFrame(run);
  });
}
