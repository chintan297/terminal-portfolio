// Hacker cursor trail: as the pointer moves it leaves hex / binary characters that drift down and fade, like a terminal
// dumping memory behind it. One fixed canvas, drawn only while there is something to draw. Desktop fine pointers only.
const CHARS = "01{}<>/\\_$#=+0123456789ABCDEF";
const LIFE = 0.9; // seconds a character stays visible
const STEP = 16; // px of pointer travel between two spawned characters
const MAX = 90;

export function initTrail() {
  const canvas = document.getElementById("cursor-trail"); // lives in Cursor.astro with transition:persist, so it survives page swaps
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  let color = "#fff",
    dpr = 1;
  const readColor = () => {
    color = getComputedStyle(canvas).color;
  };
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '13px "Departure Mono", monospace';
    ctx.textBaseline = "middle";
  };
  readColor();
  resize();
  addEventListener("resize", resize);
  document.addEventListener("themechange", readColor);

  const bits = [];
  let lx = -999,
    ly = -999,
    running = false,
    last = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = color;
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.age += dt;
      if (b.age >= LIFE) {
        bits.splice(i, 1);
        continue;
      }
      b.y += b.vy * dt;
      if (Math.random() < 0.08)
        b.ch = CHARS[(Math.random() * CHARS.length) | 0]; // glyphs keep flipping while they fade
      ctx.globalAlpha = (1 - b.age / LIFE) * 0.85;
      ctx.fillText(b.ch, b.x, b.y);
    }
    ctx.globalAlpha = 1;
    if (bits.length) requestAnimationFrame(frame);
    else {
      running = false;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  };
  addEventListener(
    "pointermove",
    (e) => {
      if (root.dataset.fx !== "on") return;
      if (Math.hypot(e.clientX - lx, e.clientY - ly) < STEP) return;
      lx = e.clientX;
      ly = e.clientY;
      bits.push({
        x: lx + 10 + Math.random() * 8,
        y: ly + 10 + Math.random() * 8,
        vy: 14 + Math.random() * 26,
        age: 0,
        ch: CHARS[(Math.random() * CHARS.length) | 0],
      });
      if (bits.length > MAX) bits.shift();
      if (!running) {
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
      }
    },
    { passive: true },
  );
}
