import { prefersReducedMotion } from "./motion.js";

// Page change on PHONES (screens narrower than 720px; desktop uses the letter morph in morph.js): a field of pixel
// squares grows over the screen from the top-left, the next page is fetched and swapped underneath, then the squares
// shrink away towards the bottom-right. Quick on purpose; the "$ cd" line is shown only if the next page is slow.
// One persistent canvas and a few listeners for the whole session. Skipped for reduced motion.
const COVER = 240; // ms until the screen is fully covered
const REVEAL = 260; // ms to uncover
const GROW = 100; // ms one square takes to grow or shrink
const CELL = 28;
const SAFETY = 3000; // if anything goes wrong, the overlay is removed after this long
const FONT = '16px "Departure Mono", monospace';
const isPhone = () => innerWidth < 720;

let cvs, ctx, cols, rows, delays, bg, accent, fg, dpr;
let state = "idle"; // idle | covering | covered | revealing
let label = "";
let labelOn = false;
let labelTimer = 0;
let safetyTimer = 0;
let raf = 0;

const clamp = (v) => Math.min(1, Math.max(0, v));

function setup() {
  cvs = document.getElementById("page-wipe");
  if (!cvs) return false;
  ctx = cvs.getContext("2d");
  dpr = Math.min(devicePixelRatio || 1, 2);
  const w = innerWidth, h = innerHeight;
  cvs.width = w * dpr;
  cvs.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cols = Math.ceil(w / CELL);
  rows = Math.ceil(h / CELL);
  // a diagonal sweep with a little noise, so the edge looks like pixels arriving rather than a straight line
  delays = new Float32Array(cols * rows);
  const span = 1 - GROW / COVER;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) delays[r * cols + c] = clamp((c / cols) * 0.6 + (r / rows) * 0.4 + (Math.random() - 0.5) * 0.12) * span;
  const cs = getComputedStyle(document.documentElement);
  bg = getComputedStyle(document.body).backgroundColor;
  accent = cs.getPropertyValue("--accent").trim() || "#fff";
  const p = document.createElement("span");
  p.style.cssText = "position:absolute;visibility:hidden;color:var(--bright)";
  document.body.append(p);
  fg = getComputedStyle(p).color;
  p.remove();
  return true;
}

// t = 0..1 across the phase. covering: squares grow in delay order. revealing: they shrink in the same order.
function paint(t, revealing) {
  const span = revealing ? REVEAL : COVER;
  const ms = t * span;
  ctx.clearRect(0, 0, cvs.width / dpr, cvs.height / dpr);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = clamp((ms - delays[r * cols + c] * span) / GROW);
      const size = revealing ? 1 - p : p;
      if (size <= 0) continue;
      const s = Math.ceil(CELL * size) + (size >= 1 ? 1 : 0);
      ctx.fillStyle = size >= 1 ? bg : accent; // the leading edge is bright, the settled squares are the page colour
      ctx.fillRect(c * CELL + (CELL - s) / 2, r * CELL + (CELL - s) / 2, s, s);
    }
  }
  if (labelOn && label && !revealing) drawLabel();
}

function drawLabel() {
  const text = `$ cd ${label}`;
  ctx.font = FONT;
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  const w = ctx.measureText(text).width;
  const x = (innerWidth - w) / 2, y = innerHeight / 2;
  ctx.fillText(text, x, y);
  if (Math.floor(performance.now() / 380) % 2 === 0) ctx.fillRect(x + w + 3, y - 9, 9, 18);
}

function run(revealing) {
  return new Promise((resolve) => {
    const total = revealing ? REVEAL : COVER;
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    const frame = (now) => {
      const t = clamp((now - t0) / total);
      paint(t, revealing);
      if (t < 1) raf = requestAnimationFrame(frame);
      else resolve();
    };
    raf = requestAnimationFrame(frame);
  });
}

// keep the covered state painted while the next page loads
function holdCovered() {
  const frame = () => {
    if (state !== "covered") return;
    paint(1, false);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

function release() {
  clearTimeout(labelTimer);
  clearTimeout(safetyTimer);
  cancelAnimationFrame(raf);
  labelOn = false;
  if (ctx && cvs) ctx.clearRect(0, 0, cvs.width / dpr, cvs.height / dpr);
  if (cvs) cvs.style.pointerEvents = "none";
  state = "idle";
}

async function cover(to) {
  if (state !== "idle" || !setup()) return;
  const link = [...document.querySelectorAll("#menu-panel a")].find((a) => a.getAttribute("href") === to.pathname);
  label = link ? `~/${link.querySelector("small")?.textContent.replace("~/", "")}` : to.pathname;
  state = "covering";
  cvs.style.pointerEvents = "auto"; // block double taps while the page swaps
  clearTimeout(safetyTimer);
  safetyTimer = setTimeout(release, SAFETY);
  await run(false);
  state = "covered";
  clearTimeout(labelTimer);
  labelTimer = setTimeout(() => { labelOn = true; }, 250);
  holdCovered();
}

async function reveal() {
  if (state !== "covered" && state !== "covering") return;
  while (state === "covering") await new Promise((r) => setTimeout(r, 16));
  cancelAnimationFrame(raf);
  clearTimeout(labelTimer);
  labelOn = false;
  state = "revealing";
  setup(); // the new page may be a different size or theme
  await run(true);
  release();
}

export function bindWipe() {
  if (window.__wipeBound || prefersReducedMotion()) return;
  window.__wipeBound = true;
  document.addEventListener("astro:before-preparation", (e) => {
    const to = e.to;
    if (!isPhone() || !to || to.pathname === location.pathname) return;
    const load = e.loader;
    // fetch the next page while the squares grow; the swap happens only once the screen is covered
    e.loader = async () => { await Promise.all([load(), cover(to)]); };
  });
  document.addEventListener("astro:page-load", () => {
    if (state === "idle") return;
    reveal();
    document.getElementById("main")?.animate(
      [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
      { duration: 460, delay: 120, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
    );
  });
}
