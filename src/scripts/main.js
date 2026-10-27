import { bindThemeControls } from "./theme.js";
import { bindStatus } from "./status.js";
import { bindCmdline } from "./cmdline.js";
import { bindCopy } from "./copy.js";
import { initReveal, initSpotlights } from "./motion.js";
import { initCursor } from "./cursor.js";
import { runBoot } from "./boot.js";

// Runs on first load and after every client-side navigation.
function onPage() {
  bindThemeControls();
  bindStatus();
  bindCmdline();
  bindCopy();
  initReveal();
  initSpotlights();
  initCursor();
}

document.addEventListener("astro:page-load", onPage);
runBoot();
