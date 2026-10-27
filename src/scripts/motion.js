import Lenis from "lenis";

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

let lenis = null;
// One smooth-scroll instance for the whole session; skipped entirely under reduced motion.
if (!prefersReducedMotion()) {
  lenis = new Lenis({ lerp: 0.1 });
  const raf = (t) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

export const scrollToTop = () => (lenis ? lenis.scrollTo(0) : scrollTo({ top: 0 }));

// Reveal `.scroll-in` blocks once as they enter the viewport. Re-run on every page swap.
export function initReveal() {
  const targets = document.querySelectorAll(".scroll-in:not(.in)");
  if (!targets.length) return;
  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    targets.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }),
    { threshold: 0.12 },
  );
  targets.forEach((el) => io.observe(el));
}

// Pointer spotlight inside `.spot` cards (CSS variables only, no layout work).
export function initSpotlights() {
  if (!finePointer()) return;
  document.querySelectorAll(".spot").forEach((el) => {
    if (el.dataset.spot) return;
    el.dataset.spot = "1";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}
