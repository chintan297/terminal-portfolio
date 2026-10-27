import { scrollToTop } from "./motion.js";

const pad = (n) => String(n).padStart(2, "0");

function tick() {
  const d = new Date();
  const clock = document.getElementById("clock");
  if (clock) clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const date = document.getElementById("date");
  if (date) date.textContent = `${pad(d.getDate())}-${d.toLocaleString("en", { month: "short" })}-${String(d.getFullYear()).slice(2)}`;
  const year = document.getElementById("year");
  if (year) year.textContent = String(d.getFullYear());
}

// Scroll percentage and back-to-top visibility, throttled to one update per frame.
let queued = false;
function updateScroll() {
  queued = false;
  const max = document.documentElement.scrollHeight - innerHeight;
  const pct = max > 0 ? Math.round((scrollY / max) * 100) : 100;
  const el = document.getElementById("scrollpct");
  if (el) el.textContent = `${pct}%`;
  document.getElementById("to-top")?.classList.toggle("show", scrollY > 400);
}
addEventListener(
  "scroll",
  () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(updateScroll);
  },
  { passive: true },
);
setInterval(tick, 15000);

export function bindStatus() {
  tick();
  updateScroll();
  document.getElementById("to-top")?.addEventListener("click", scrollToTop);

  const menuBtn = document.getElementById("menu-btn");
  const nav = document.getElementById("nav");
  menuBtn?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  // tapping a link or anywhere outside the menu closes it
  document.addEventListener("pointerdown", (e) => {
    if (nav?.classList.contains("open") && !e.target.closest("#nav, #menu-btn")) {
      nav.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
    }
  });
  // Escape closes the mobile menu and returns focus to its button.
  nav?.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.focus();
    }
  });
}
