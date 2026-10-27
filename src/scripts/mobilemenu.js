// Phone menu: a "select page" panel under the top bar. Tap a row, or type its number; ESC / CLOSE / the dimmed page closes it.
// One delegated set of listeners for the whole session, so it keeps working after client-side navigation.
const $ = (id) => document.getElementById(id);
const isOpen = () => !$("menu-panel")?.hidden;

function setOpen(open) {
  const panel = $("menu-panel"), scrim = $("menu-scrim"), btn = $("menu-btn");
  if (!panel || !btn) return;
  panel.hidden = !open;
  scrim.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  btn.querySelector(".mb-icon").textContent = open ? "✕" : "☰";
  document.documentElement.classList.toggle("menu-open", open);
  $("menu-num").textContent = "";
  if (open) (panel.querySelector('a[aria-current="page"]') ?? panel.querySelector("a")).focus({ preventScroll: true });
  else btn.focus({ preventScroll: true });
}

export function bindMobileMenu() {
  if (window.__menuBound) return;
  window.__menuBound = true;
  document.addEventListener("click", (e) => {
    if (e.target.closest("#menu-btn")) setOpen(!isOpen());
    else if (e.target.closest("#menu-close") || e.target.closest("#menu-scrim")) setOpen(false);
    else if (isOpen() && e.target.closest("#menu-panel a")) document.documentElement.classList.remove("menu-open");
  });
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    const links = [...document.querySelectorAll("#menu-panel a")];
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (/^[1-9]$/.test(e.key) && links[Number(e.key) - 1]) {
      e.preventDefault();
      $("menu-num").textContent = e.key;
      links[Number(e.key) - 1].click();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = links.indexOf(document.activeElement);
      links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length].focus();
    }
  });
  // leaving phone width while open: close it so the desktop bar is not left dimmed
  matchMedia("(min-width: 721px)").addEventListener("change", (m) => { if (m.matches && isOpen()) setOpen(false); });
}
