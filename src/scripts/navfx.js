import { prefersReducedMotion } from "./motion.js";

const GLYPHS = "!<>-_\\/[]{}=+*^?#abcdefxyz0123456789";
const DURATION = 360; // ms for the label to settle
const rnd = (n) => Math.floor(Math.random() * n);

// Top bar hover: the label scrambles into random glyphs and resolves left to right, once. Nothing else moves.
// One delegated listener, so it keeps working after client-side navigation swaps the bar.
const state = new WeakMap();

// The tab box never changes size: its width is pinned while the effect runs, so neighbours never shift.
function reset(a) {
  a.textContent = a.dataset.label;
  a.style.cssText = a.dataset.baseStyle ?? "";
}
function clear(a) {
  const s = state.get(a);
  if (s) {
    cancelAnimationFrame(s.raf);
    clearTimeout(s.timer);
  }
  state.delete(a);
  if (a.dataset.label) reset(a);
}

function fault(a, ms) {
  const full = a.dataset.label;
  const cut = full.indexOf(":") + 1;
  const head = full.slice(0, cut),
    tail = full.slice(cut);
  const t0 = performance.now();
  const s = state.get(a);
  const label = s.label;
  const frame = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    const settled = Math.floor(p * tail.length);
    let out = head + tail.slice(0, settled);
    for (let i = settled; i < tail.length; i++)
      out += GLYPHS[rnd(GLYPHS.length)];
    label.textContent = out;
    if (p < 1) s.raf = requestAnimationFrame(frame);
    else label.textContent = full;
  };
  s.raf = requestAnimationFrame(frame);
}

function start(a) {
  if (state.has(a)) return;
  a.dataset.label ??= a.textContent;
  a.dataset.baseStyle ??= a.getAttribute("style") ?? "";
  const width = a.getBoundingClientRect().width;
  const label = document.createElement("span");
  label.style.display = "inline-block";
  label.style.whiteSpace = "pre";
  label.textContent = a.dataset.label;
  a.replaceChildren(label);
  a.style.width = `${width}px`;
  a.style.flex = "none";
  a.style.justifyContent = "center";
  state.set(a, { raf: 0, timer: 0, label });
  fault(a, DURATION);
}

export function bindNavFx() {
  if (prefersReducedMotion()) return;
  const link = (e) => e.target.closest?.(".topbar nav a");
  const enter = (e) => {
    const a = link(e);
    if (a && !a.contains(e.relatedTarget)) start(a);
  };
  const leave = (e) => {
    const a = link(e);
    if (a && !a.contains(e.relatedTarget)) clear(a);
  };
  document.addEventListener("mouseover", enter);
  document.addEventListener("mouseout", leave);
  document.addEventListener("focusin", enter);
  document.addEventListener("focusout", leave);
}
