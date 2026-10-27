// WHO YOU ARE: name, contact, social links, navigation and the About page text.
// Edit this file for anything that appears on the home page, the top bar, the footer or the About page.

export const site = {
  // true shows a "Sample content" notice in the footer. Set it to false once blog, tutorials and social links are real.
  sample: true,
  name: "Chintan Akbari",
  heroLines: ["CHINTAN"], // big pixel title on the home page (one string per line)
  host: "chintan", // shown as [chintan] in the top bar
  title: "Chintan Akbari | Frontend Developer",
  location: "Surat, Gujarat, India",
  role: "Frontend Developer at Tagline Infotech LLP, building fast and responsive interfaces.",
  roles: ["Frontend Developer", "React.js Developer", "Next.js Developer", "Three.js Developer"],
  summary: "High-performance, responsive user interfaces with React.js, Next.js and TypeScript.",
  photo: "/avatar.svg",
  email: "chintanakbari7706@gmail.com",
  user: "chintan@tagline", // shown in the top bar
  // Add a social link by adding one line. `icon` is a simple-icons name (github, x, medium, ...).
  socials: [
    { label: "LinkedIn", icon: "linkedin", href: "https://www.linkedin.com/in/chintan-akbari/" },
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
  lead: "Frontend developer building high-performance, responsive interfaces.",
  name: "Chintan Akbari",
  title: "Frontend Developer",
  bio: "I build responsive, scalable web applications with React.js, Next.js and TypeScript, with a focus on clean architecture and maintainable code. I have worked on admin dashboards, marketing sites, AI-driven platforms and internal tools, and on interactive 3D web experiences with Three.js and React Three Fiber. I like working close to designers, product managers and backend teams, owning a feature from requirements to release, and mentoring newer developers.",
  tags: ["REACT.JS", "NEXT.JS", "TYPESCRIPT", "THREE.JS"],
  skills: [
    "React.js", "Next.js", "TypeScript", "JavaScript (ES6+)", "Redux", "Three.js",
    "React Three Fiber", "REST APIs", "Material-UI", "Tailwind", "Turborepo", "Git",
  ],
  building: [
    { name: "this-portfolio", note: "Astro, Canvas" },
    { name: "Vasana", note: "health platform" },
  ],
  interests: ["Frontend performance", "3D on the web", "AI products", "Mentoring"],
};
