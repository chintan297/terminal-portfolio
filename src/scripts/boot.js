import { prefersReducedMotion } from "./motion.js";

// [text, class]: "ok" lines get a green-ish accent status tag, "hi" lines are brighter, "wait" lines pause before the next one.
const LINES = [
  ["[    0.000000] Linux version 6.12.0-portfolio (gcc 14.2.0) #1 SMP PREEMPT_DYNAMIC", "hi"],
  ["[    0.000001] Command line: BOOT_IMAGE=/boot/vmlinuz root=/dev/sda1 quiet"],
  ["[    0.004120] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable"],
  ["[    0.012543] smpboot: Allowing 6 CPUs, 0 hotplug CPUs"],
  ["[    0.015234] Memory: 16777216k/16777216k available"],
  ["[    0.019870] clocksource: tsc: mask: 0xffffffffffffffff"],
  ["[    0.024891] ACPI: Core revision 20230628"],
  ["[    0.031245] PCI: Using configuration type 1 for base access"],
  ["[    0.038002] NET: Registered PF_INET protocol family"],
  ["[    0.045678] [drm] Initialized drm 1.1.0 20060810", "hi"],
  ["[    0.061344] fb0: switching to drmfb from simple", "wait"],
  ["[  OK  ] Mounted /boot", "ok"],
  ["[  OK  ] Started Journal Service", "ok"],
  ["[  OK  ] Reached target Local File Systems", "ok"],
  ["[  OK  ] Started Network Manager", "ok"],
  ["[  OK  ] Loaded font: Departure Mono", "ok"],
  ["[  OK  ] Started Portfolio Daemon", "ok", "wait"],
  ["[  OK  ] Reached target Graphical Interface", "ok"],
];
const PROMPT = "chintan@portfolio:~$ ";
const COMMAND = "startx --portfolio";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Boot log on every page load (not on client-side navigation): kernel lines stream in at an uneven pace,
// then a prompt types the start command and the screen fades into the site. Any key or click skips it.
// Skipped entirely under reduced motion.
export function runBoot() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  if (prefersReducedMotion()) return;

  splash.classList.remove("done", "leaving");
  const box = document.createElement("pre");
  box.className = "log";
  const body = document.createElement("div"); // one flex child, so rows and the caret flow inline inside it
  box.append(body);
  const skip = document.createElement("span");
  skip.className = "skip";
  skip.textContent = "press any key to skip";
  const cursor = document.createElement("span");
  cursor.className = "caret";
  splash.replaceChildren(box, skip);

  let stopped = false;
  const finish = () => {
    if (stopped) return;
    stopped = true;
    removeEventListener("keydown", finish);
    splash.removeEventListener("click", finish);
    splash.classList.add("leaving");
    setTimeout(() => splash.classList.add("done"), 350);
  };
  addEventListener("keydown", finish);
  splash.addEventListener("click", finish);

  const scroll = () => {}; // the log box is bottom-anchored, so new lines push older ones up and out
  (async () => {
    for (const [text, ...flags] of LINES) {
      const pause = flags.includes("wait");
      const kind = flags.find((f) => f !== "wait") ?? "";
      if (stopped) return;
      const row = document.createElement("span");
      row.className = `row ${kind}`;
      if (kind === "ok") {
        const tag = document.createElement("span");
        tag.className = "ok-tag";
        tag.textContent = "  OK  ";
        row.append("[", tag, `]${text.slice(8)}`);
      } else row.textContent = text;
      row.append("\n");
      cursor.remove();
      body.append(row, cursor);
      scroll();
      await wait(pause ? 260 : 25 + Math.random() * 70);
    }
    if (stopped) return;
    const line = document.createElement("span");
    line.className = "row hi";
    line.append(PROMPT);
    const typed = document.createTextNode("");
    line.append(typed);
    cursor.remove();
    body.append(line, cursor);
    scroll();
    await wait(350);
    for (const ch of COMMAND) {
      if (stopped) return;
      typed.data += ch;
      await wait(45 + Math.random() * 50);
    }
    await wait(450);
    finish();
  })();
}
