import { prefersReducedMotion, finePointer } from "./motion.js";

// Context-aware cursor (desktop, fine pointer only) plus a pointer-following background glow.
// Everything moves with transform inside one rAF loop; touch devices never run any of it.
let started = false;

export function initCursor() {
  if (started || !finePointer() || prefersReducedMotion()) return;
  const ring = document.getElementById("cursor-ring");
  const dot = document.getElementById("cursor-dot");
  const spot = document.getElementById("bg-spot");
  if (!ring || !dot || !spot) return;
  started = true;
  document.documentElement.classList.add("has-cursor");

  // Hidden until the pointer first moves so nothing sits in the middle of the screen.
  [ring, dot, spot].forEach((el) => (el.style.opacity = "0"));
  let x = innerWidth / 2, y = innerHeight / 2; // target
  let rx = x, ry = y, sx = x, sy = y; // eased positions

  let moved = false;
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    if (!moved) { moved = true; rx = sx = x; ry = sy = y; [ring, dot, spot].forEach((el) => (el.style.opacity = "")); }
  }, { passive: true });
  addEventListener("pointerdown", () => (ring.dataset.state = ring.dataset.state === "view" ? "view" : "down"));
  addEventListener("pointerup", () => { if (ring.dataset.state === "down") ring.dataset.state = ""; });

  // State follows what is under the pointer: cards say VIEW, links/buttons grow, text becomes a caret.
  document.addEventListener("pointerover", (e) => {
    const t = e.target;
    const view = t.closest?.("[data-cursor='view']");
    if (view) { ring.dataset.state = "view"; ring.textContent = "VIEW"; return; }
    ring.textContent = "";
    if (t.closest?.("a, button, [role='button'], summary, label")) ring.dataset.state = "link";
    else if (t.closest?.("input, textarea")) ring.dataset.state = "text";
    else ring.dataset.state = "";
  });
  document.addEventListener("pointerleave", () => { if (moved) ring.style.opacity = "0"; });
  document.addEventListener("pointerenter", () => { if (moved) ring.style.opacity = ""; });

  const loop = () => {
    rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
    sx += (x - sx) * 0.06; sy += (y - sy) * 0.06;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    spot.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
}
