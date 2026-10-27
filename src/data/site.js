// Single place to edit your content. Everything here is SAMPLE text: replace it with real details.
// While `sample` is true the footer shows a "sample content" notice.
export const site = {
  sample: true,
  name: "Chintan Akbari",
  heroLines: ["CHINTAN"],
  host: "chintan",
  title: "Chintan Akbari | Software Engineer",
  location: "Gujarat, India",
  role: "Software Engineer at Company, building something interesting.",
  roles: ["Software Engineer", "Backend Developer", "Open-source Contributor"],
  summary:
    "Backend, tooling and embedded work; open-source projects on the side.",
  photo: "/avatar.svg",
  email: "you@example.com",
  user: "you@company",
  socials: [
    { label: "GitHub", icon: "github", href: "https://github.com/" },
    { label: "LinkedIn", icon: "linkedin", href: "https://linkedin.com/" },
    { label: "X", icon: "x", href: "https://x.com/" },
    { label: "Telegram", icon: "telegram", href: "https://t.me/" },
    { label: "Reddit", icon: "reddit", href: "https://reddit.com/" },
    { label: "Medium", icon: "medium", href: "https://medium.com/" },
    { label: "Spotify", icon: "spotify", href: "https://spotify.com/" },
    { label: "Discord", icon: "discord", href: "https://discord.com/" },
  ],
};

export const nav = [
  { key: 1, label: "home", href: "/" },
  { key: 2, label: "about", href: "/about" },
  { key: 3, label: "projects", href: "/projects" },
  { key: 4, label: "quotes", href: "/quotes" },
  { key: 5, label: "bits", href: "/bits" },
  { key: 6, label: "resume", href: "/resume" },
  { key: 7, label: "tutorials", href: "/tutorials" },
  { key: 8, label: "blog", href: "/blog" },
];

export const about = {
  heading: "Engineering Profile",
  lead: "Software engineer: backend, tooling and the glue around them.",
  name: "Chintan Akbari",
  title: "Software Engineer",
  bio: "A longer paragraph about what you do, what you own at work and what you enjoy building outside of it.",
  tags: ["BACKEND", "TOOLING", "OPEN SOURCE"],
  // SAMPLE gauge values to show the layout. The numbers are placeholders: set your own, or delete `level`
  // and the bar to list skills as plain tags.
  skills: [
    { name: "JavaScript", level: 90 },
    { name: "Node.js", level: 80 },
    { name: "Linux", level: 70 },
    { name: "SQL", level: 65 },
    { name: "Rust", level: 40 },
  ],
  building: [
    { name: "project-one", level: 80 },
    { name: "project-two", level: 55 },
    { name: "this-portfolio", level: 95 },
  ],
  interests: [
    "Open source",
    "Low-level engineering",
    "Space",
    "Music",
    "Cricket",
  ],
};

// Work and education in one list, newest first.
export const experience = [
  { when: "2024 - Present", what: "Software Engineer", where: "Company" },
  { when: "2021 - 2024", what: "Junior Engineer", where: "Another Company" },
  {
    when: "2017 - 2021",
    what: "B.Tech in Computer Science",
    where: "University",
  },
];

// Grouped, no proficiency percentages: groups describe what you work with, not how well.
export const skillGroups = [
  { title: "Languages", items: ["JavaScript", "Python", "Rust", "SQL"] },
  { title: "Backend", items: ["Node.js", "REST APIs", "PostgreSQL", "Redis"] },
  { title: "Tooling", items: ["Linux", "Docker", "Git", "CI/CD"] },
  {
    title: "Practices",
    items: ["Code review", "Testing", "Documentation", "Mentoring"],
  },
];

export const services = [
  {
    icon: "lucide:server",
    title: "Backend systems",
    desc: "APIs, data models and services built to be maintained.",
  },
  {
    icon: "lucide:terminal",
    title: "Developer tooling",
    desc: "CLIs, automation and build pipelines that save time.",
  },
  {
    icon: "lucide:gauge",
    title: "Performance work",
    desc: "Profiling and removing the bottlenecks that matter.",
  },
];

// Scroll story. Each step: when / title / org / body.
export const journey = [
  {
    when: "2021",
    title: "Started building",
    org: "Self-taught",
    body: "First projects and open-source contributions. Learned by building small tools, reading other people's code and sending patches upstream.",
    points: ["Built a dozen small CLIs and scripts", "First merged open-source pull requests", "Learned Git, Linux and the command line properly"],
    stack: ["JavaScript", "Python", "Linux", "Git"],
  },
  {
    when: "2022",
    title: "First engineering role",
    org: "Another Company",
    body: "Worked on the core API and wrote the CI pipeline. First time owning a feature from design to production.",
    points: ["Shipped features on the product's core API", "Wrote the CI pipeline and release checks", "Learned code review, on-call and testing habits"],
    stack: ["Node.js", "REST", "CI/CD", "SQL"],
  },
  {
    when: "2024",
    title: "Software Engineer",
    org: "Company",
    body: "Led the service that mattered and shipped the migration. Took on design reviews, mentoring and the hard production problems.",
    points: ["Led the service that mattered", "Shipped the migration without downtime", "Mentored new engineers and ran design reviews"],
    stack: ["TypeScript", "Postgres", "Docker", "AWS"],
  },
  {
    when: "Now",
    title: "Building in the open",
    org: "Side projects",
    body: "Writing, tooling and small open-source utilities. Sharing what I learn as tutorials, bits and small projects anyone can use.",
    points: ["Open-source tools and utilities", "Tutorials and short write-ups", "Embedded and backend experiments"],
    stack: ["Astro", "Rust", "Embedded", "Open source"],
  },
];

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

export const resumeData = {
  contact: ["you@example.com", "LinkedIn", "City, Country"],
  focus: ["BACKEND", "TOOLING", "LINUX", "OPEN SOURCE"],
  languages: [
    { code: "en_IN.UTF-8", name: "English", level: "Fluent" },
    { code: "hi_IN.UTF-8", name: "Hindi", level: "Native" },
  ],
  summary:
    "Two sentences summarising your background and what you are looking for.",
  work: [
    {
      role: "Software Engineer",
      org: "Company, Remote",
      when: "Jan 2024 - Present",
      points: [
        "Led the thing that mattered.",
        "Built the system that scaled.",
        "Shipped the migration without downtime.",
      ],
    },
    {
      role: "Junior Engineer",
      org: "Another Company, City",
      when: "Jan 2021 - Dec 2023",
      points: ["Worked on the product's core API.", "Wrote the CI pipeline."],
    },
  ],
  education: [
    {
      degree: "B.Tech in Computer Science",
      org: "University, City",
      when: "2017 - 2021",
    },
  ],
  skills: {
    Proficient: ["JavaScript", "Node.js", "SQL", "Linux"],
    "Familiar with": ["Rust", "Go", "Docker"],
  },
  interests: ["Open source", "Low-level engineering", "Space"],
};

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
