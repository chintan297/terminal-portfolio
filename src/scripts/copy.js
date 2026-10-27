// Buttons with [data-copy] copy that text and give visible + screen-reader feedback.
let live;
function announce(msg) {
  live ??= document.getElementById("live");
  if (live) live.textContent = msg;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts or blocked clipboard permissions.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function bindCopy() {
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    const label = btn.querySelector("[data-label]") ?? btn;
    const original = label.textContent;
    btn.addEventListener("click", async () => {
      const ok = await copyText(btn.dataset.copy);
      btn.dataset.state = ok ? "done" : "error";
      label.textContent = ok ? "COPIED" : "COPY FAILED";
      announce(ok ? `Copied ${btn.dataset.copy}` : "Copy failed, please copy manually");
      setTimeout(() => {
        delete btn.dataset.state;
        label.textContent = original;
      }, 1600);
    });
  });
}
