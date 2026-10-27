import { prefersReducedMotion } from "./motion.js";

const LINES = [
  "[    0.000000] Linux version 6.12.0-portfolio (gcc 14.2.0) #1 SMP PREEMPT_DYNAMIC",
  "[    0.012543] smpboot: Allowing 6 CPUs, 0 hotplug CPUs",
  "[    0.045678] [drm] Initialized drm 1.1.0 20060810",
  "[    0.089456] theme: restoring from localStorage",
  "[    0.134007] overlay: loading grunge texture",
  "[    0.156689] overlay: scanline generator [OK]",
  "[    0.212337] init: Reached target graphical.target",
];

// Boot log, once per session. Shorter than before and skippable with any key or click,
// so it never blocks interaction. Skipped entirely under reduced motion.
export function runBoot() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  let seen = false;
  try { seen = !!sessionStorage.getItem("booted"); sessionStorage.setItem("booted", "1"); } catch { /* ignore */ }
  if (seen || prefersReducedMotion()) return;

  splash.classList.remove("done");
  const log = document.createTextNode("");
  const skip = document.createElement("span");
  skip.className = "skip";
  skip.textContent = "press any key to skip";
  splash.replaceChildren(log, skip);
  let i = 0;
  let timer;
  const finish = () => {
    clearTimeout(timer);
    splash.classList.add("done");
    removeEventListener("keydown", finish);
    splash.removeEventListener("click", finish);
  };
  const step = () => {
    if (i < LINES.length) {
      log.data += LINES[i++] + "\n";
      timer = setTimeout(step, 60);
    } else timer = setTimeout(finish, 200);
  };
  addEventListener("keydown", finish, { once: true });
  splash.addEventListener("click", finish, { once: true });
  step();
}
