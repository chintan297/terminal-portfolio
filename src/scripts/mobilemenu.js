import { navigate } from "astro:transitions/client";

// Phone menu: a "select page" panel under the top bar.
//   open   : the page dims, the panel drops in and its rows slide in one after another; ☰ turns into ✕
//   select : the tapped row flashes, the others dim, then the page changes (with the usual page-change effect)
//   close  : the rows and the panel lift away and the dim fades out
// Tap a row or type its number; ESC / CLOSE / the dimmed page / the button closes it.
// One delegated set of listeners for the whole session, so it keeps working after client-side navigation.
const $ = (id) => document.getElementById(id);
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const isOpen = () => !$("menu-panel")?.hidden && !$("menu-panel")?.classList.contains("closing");
let closeTimer = 0;

function hideNow() {
  const panel = $("menu-panel"), scrim = $("menu-scrim");
  clearTimeout(closeTimer);
  if (panel) { panel.hidden = true; panel.classList.remove("closing", "picking"); panel.querySelectorAll(".picked").forEach((a) => a.classList.remove("picked")); }
  if (scrim) { scrim.hidden = true; scrim.classList.remove("closing"); }
  document.documentElement.classList.remove("menu-open");
}

function setOpen(open, { focusButton = true } = {}) {
  const panel = $("menu-panel"), scrim = $("menu-scrim"), btn = $("menu-btn");
  if (!panel || !btn) return;
  btn.setAttribute("aria-expanded", String(open));
  btn.querySelector(".mb-icon").textContent = open ? "✕" : "☰";
  $("menu-num").textContent = "";
  if (open) {
    clearTimeout(closeTimer);
    panel.classList.remove("closing", "picking");
    scrim.classList.remove("closing");
    panel.querySelectorAll("li").forEach((li, i) => li.style.setProperty("--n", String(i)));
    panel.hidden = false;
    scrim.hidden = false;
    document.documentElement.classList.add("menu-open");
    (panel.querySelector('a[aria-current="page"]') ?? panel.querySelector("a")).focus({ preventScroll: true });
    return;
  }
  if (panel.hidden) return;
  if (reduce()) hideNow();
  else {
    panel.classList.add("closing");
    scrim.classList.add("closing");
    closeTimer = window.setTimeout(hideNow, 260); // matches the 220ms exit animation
  }
  if (focusButton) btn.focus({ preventScroll: true });
}

// a row was chosen: it flashes, the rest dim, then we go there while the menu closes
function pick(a) {
  const panel = $("menu-panel");
  if (panel.classList.contains("picking")) return;
  if (a.getAttribute("href") === location.pathname) return setOpen(false); // already here: just close
  const go = () => { setOpen(false, { focusButton: false }); navigate(a.getAttribute("href")); };
  if (reduce()) return go();
  panel.classList.add("picking");
  a.classList.add("picked");
  setTimeout(go, 170);
}

export function bindMobileMenu() {
  if (window.__menuBound) return;
  window.__menuBound = true;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("#menu-panel a");
    if (a && isOpen()) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // let "open in new tab" work
      e.preventDefault();
      pick(a);
    } else if (e.target.closest("#menu-btn")) setOpen(!isOpen());
    else if (e.target.closest("#menu-close") || e.target.closest("#menu-scrim")) setOpen(false);
    // capture phase: this must run before the router's own link handler, which would otherwise change the page at once
    // and skip the row's flash
  }, true);
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    const links = [...document.querySelectorAll("#menu-panel a")];
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (/^[1-9]$/.test(e.key) && links[Number(e.key) - 1]) {
      e.preventDefault();
      $("menu-num").textContent = e.key;
      pick(links[Number(e.key) - 1]);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = links.indexOf(document.activeElement);
      links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length].focus();
    }
  });
  // leaving phone width while open: close it so the desktop bar is not left dimmed
  matchMedia("(min-width: 721px)").addEventListener("change", (m) => { if (m.matches) hideNow(); });
}
