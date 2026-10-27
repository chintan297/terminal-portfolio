// Theme, effects ("Quality Mode") and single-key shortcut state, all persisted in localStorage.
const THEMES = ["mono", "ember", "green", "amber"];
const root = document.documentElement;
const store = {
  get: (k, d) => {
    try { return localStorage.getItem(k) ?? d; } catch { return d; }
  },
  set: (k, v) => {
    try { localStorage.setItem(k, v); } catch { /* storage blocked: state just won't persist */ }
  },
};

export const state = { keysOn: store.get("keys", "on") !== "off" };

export function setTheme(name) {
  root.dataset.theme = name;
  store.set("theme", name);
  const label = document.getElementById("theme-name");
  if (label) label.textContent = name.toUpperCase();
  document.dispatchEvent(new CustomEvent("themechange", { detail: name }));
}
export const cycleTheme = () => setTheme(THEMES[(THEMES.indexOf(root.dataset.theme) + 1) % THEMES.length]);

export function toggleFx() {
  const next = root.dataset.fx === "on" ? "off" : "on";
  root.dataset.fx = next;
  store.set("fx", next);
  const btn = document.getElementById("fx-btn");
  if (btn) btn.setAttribute("aria-pressed", String(next === "on"));
}

export function setKeys(on) {
  state.keysOn = on;
  store.set("keys", on ? "on" : "off");
  const btn = document.getElementById("keys-btn");
  btn?.classList.toggle("off", !on);
  btn?.setAttribute("aria-pressed", String(on));
}

export function bindThemeControls() {
  const label = document.getElementById("theme-name");
  if (label) label.textContent = (root.dataset.theme || "mono").toUpperCase();
  document.getElementById("theme-btn")?.addEventListener("click", cycleTheme);
  document.getElementById("fx-btn")?.addEventListener("click", toggleFx);
  document.getElementById("fx-btn")?.setAttribute("aria-pressed", String(root.dataset.fx === "on"));
  document.getElementById("keys-btn")?.addEventListener("click", () => setKeys(!state.keysOn));
  setKeys(state.keysOn);
}
