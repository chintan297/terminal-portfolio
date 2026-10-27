// Quotes, tutorial series, short notes ("bits") and the footer fortunes. Newest bit first.
export const quotes = [
  {
    text: "Premature optimization is the root of all evil.",
    by: "Donald Knuth",
  },
  {
    text: "Simplicity is prerequisite for reliability.",
    by: "Edsger W. Dijkstra",
  },
  {
    text: "The most dangerous phrase is: we've always done it this way.",
    by: "Grace Hopper",
  },
  { text: "Talk is cheap. Show me the code.", by: "Linus Torvalds" },
  {
    text: "Programs must be written for people to read.",
    by: "Harold Abelson",
  },
  { text: "Make it work, make it right, make it fast.", by: "Kent Beck" },
];

export const series = [
  {
    level: "BEGINNER",
    items: [
      {
        id: "01",
        title: "Getting Started with X",
        mins: 30,
        desc: "A first walkthrough from zero to working.",
        tags: ["BASICS", "SETUP"],
        href: "#",
      },
      {
        id: "02",
        title: "Understanding Y",
        mins: 45,
        desc: "How Y works and how to reason about it.",
        tags: ["BASICS", "THEORY"],
        href: "#",
      },
    ],
  },
  {
    level: "INTERMEDIATE",
    items: [
      {
        id: "03",
        title: "Debugging Z in Production",
        mins: 40,
        desc: "Tools and habits for chasing down real bugs.",
        tags: ["DEBUGGING"],
        href: "#",
      },
    ],
  },
];

export const bits = [
  {
    date: "2026-10-27",
    title: "Astro: persist layers by markup, not script",
    body: "With view transitions, an element created from JavaScript is dropped on navigation unless the next page also contains it. Put it in the layout with transition:persist and fetch it by id.",
    code: '<canvas id="cursor-trail" transition:persist></canvas>',
  },
  {
    date: "2026-10-27",
    title: "Pixel-crisp text on a canvas",
    body: "Rasterise the text once off screen, then keep only whole grid cells. Choose the font size so one font pixel is a whole number of cells.",
    code: "const cells = pixels.filter((_, i) => alpha[i] > 128);",
  },
  {
    date: "2026-10-27",
    title: "Implicit any on content collections",
    body: "No tsconfig.json means the editor cannot see Astro's generated types. Add one that includes .astro/types.d.ts, then sync.",
    code: "npx astro sync",
  },
  {
    date: "2026-10-20",
    title: "TIL: a useful flag",
    body: "A one-paragraph note about something small you learned.",
    code: "ls -lah --time-style=long-iso",
  },
  {
    date: "2026-09-02",
    title: "Quick snippet",
    body: "A snippet you keep reaching for.",
    code: "git log --oneline --graph --decorate",
  },
  {
    date: "2026-07-15",
    title: "A tiny trick",
    body: "Another short, self-contained tip.",
    code: "tail -f app.log | grep -i error",
  },
];

export const fortunes = [
  { text: "Weeks of coding can save you hours of planning.", by: "Unknown" },
  { text: "It works on my machine.", by: "Every developer" },
];
