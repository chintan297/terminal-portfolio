import { navigate } from "astro:transitions/client";
import { state, cycleTheme, toggleFx, setKeys } from "./theme.js";
import { scrollToTop } from "./motion.js";

// Bottom command line. "/" searches the site index, ":" runs commands.
// Exposed to assistive tech as a combobox that controls a listbox.
let mode = "/";
let rows = [];
let sel = 0;
let opener = null;

const $ = (id) => document.getElementById(id);
// Search results and Alt+number shortcuts go through the router too, so they get the same page-change effect (and no full reload)
const go = (href) => navigate(href);

function data() {
  const el = $("cmd");
  return { index: JSON.parse(el.dataset.index || "[]"), nav: JSON.parse(el.dataset.nav || "[]"), email: el.dataset.email };
}

function commands() {
  const { nav, email } = data();
  return [
    ...nav.map((n) => ({ kind: "goto", title: n.label, detail: `Open ${n.label}`, run: () => go(n.href) })),
    { kind: "cmd", title: "theme", detail: "Cycle color theme", run: cycleTheme },
    { kind: "cmd", title: "fx", detail: "Toggle visual effects (Quality Mode)", run: toggleFx },
    { kind: "cmd", title: "keys", detail: "Toggle single-key shortcuts", run: () => setKeys(!state.keysOn) },
    { kind: "cmd", title: "top", detail: "Scroll to top", run: scrollToTop },
    { kind: "cmd", title: "email", detail: `Copy ${email}`, run: () => navigator.clipboard?.writeText(email) },
  ];
}

function render() {
  const pin = $("pin");
  const q = pin.value.trim().toLowerCase();
  rows =
    mode === "/"
      ? data().index.filter((i) => `${i.title} ${i.detail}`.toLowerCase().includes(q)).map((i) => ({ ...i, run: () => go(i.href) }))
      : commands().filter((c) => c.title.includes(q));
  rows = rows.slice(0, 8);
  sel = Math.min(sel, Math.max(rows.length - 1, 0));
  const list = $("plist");
  list.replaceChildren(
    ...rows.map((r, n) => {
      const li = document.createElement("li");
      li.id = `opt-${n}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(n === sel));
      li.dataset.n = n;
      li.innerHTML = `<span class="k"></span><b></b><span class="d"></span>`;
      li.children[0].textContent = r.kind;
      li.children[1].textContent = r.title;
      li.children[2].textContent = r.detail;
      return li;
    }),
  );
  pin.setAttribute("aria-activedescendant", rows.length ? `opt-${sel}` : "");
  $("cmd-status").textContent = rows.length ? `${rows.length} results` : "No results";
}

export function openCmd(m) {
  opener = document.activeElement;
  mode = m;
  sel = 0;
  const pin = $("pin");
  pin.value = "";
  $("pfx").textContent = m;
  $("cmd").classList.add("open");
  pin.setAttribute("aria-expanded", "true");
  pin.focus();
  render();
}

function closeCmd() {
  $("cmd").classList.remove("open");
  $("pin").setAttribute("aria-expanded", "false");
  // Hand focus back to whatever opened the line so keyboard users don't lose their place.
  if (opener && document.contains(opener)) opener.focus();
  opener = null;
}

const isOpen = () => $("cmd")?.classList.contains("open");

export function bindCmdline() {
  // The status bar is re-rendered on every navigation, so its trigger is bound every time.
  $("search-btn")?.addEventListener("click", () => openCmd("/"));
  const pin = $("pin");
  if (!pin || pin.dataset.bound) return;
  pin.dataset.bound = "1";
  $("cmd-close")?.addEventListener("click", closeCmd); // touch users have no Escape key
  document.addEventListener("pointerdown", (e) => { if (isOpen() && !e.target.closest("#cmd, #search-btn")) closeCmd(); });
  pin.addEventListener("input", () => { sel = 0; render(); });
  $("plist").addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) { const r = rows[Number(li.dataset.n)]; closeCmd(); r?.run(); }
  });
}

// Global keyboard handling (registered once).
addEventListener("keydown", (e) => {
  if (!$("cmd") || document.documentElement.classList.contains("photo-open")) return; // the full-screen surprise owns the keyboard
  if (isOpen()) {
    if (e.key === "Escape") closeCmd();
    else if (e.key === "ArrowDown") { sel = Math.min(sel + 1, rows.length - 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
    else if (e.key === "Enter") { const r = rows[sel]; closeCmd(); r?.run(); }
    else if (e.key === "Tab") e.preventDefault(); // keep focus in the input while open
    return;
  }
  if (e.altKey) {
    const hit = data().nav.find((n) => e.code === `Digit${n.key}`);
    if (hit) { e.preventDefault(); document.querySelector(".statusbar .mode")?.classList.add("flick"); go(hit.href); }
    return;
  }
  const t = e.target;
  if (!state.keysOn || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
  if (e.key === "/") { e.preventDefault(); openCmd("/"); }
  else if (e.key === ":") { e.preventDefault(); openCmd(":"); }
  else if (e.key === "t") cycleTheme();
  else if (e.key === "f") toggleFx();
});
