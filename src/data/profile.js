// WHO YOU ARE: name, contact, social links, navigation and the About page text.
// Edit this file for anything that appears on the home page, the top bar, the footer or the About page.

export const site = {
  // true shows a "Sample content" notice in the footer.
  sample: false,
  name: "Chintan Akbari",
  heroLines: ["CHINTAN"], // big pixel title on the home page (one string per line)
  host: "chintan", // shown as [chintan] in the top bar
  title: "Chintan Akbari | Frontend Developer",
  location: "Surat, Gujarat, India",
  role: "Frontend Developer at Tagline Infotech LLP, building fast and responsive interfaces.",
  roles: ["Frontend Developer", "React.js Developer", "Next.js Developer", "Three.js Developer"],
  summary: "High-performance, responsive user interfaces with React.js, Next.js and TypeScript.",
  // Avatar on the home page. A random funny cat from cataas.com (every load can be a different cat); if it cannot be
  // loaded the site falls back to the CA monogram in /avatar.svg. Use "/avatar.svg" or your own photo in public/ to stop that.
  photo: "https://cataas.com/cat/funny?width=40&height=40&s=71",
  // What happens when the avatar on the home page is clicked ("Click for a surprise"). Every part is optional.
  // Files go in public/media/ and should be your own or ones you have the right to use.
  //   image : shown first, and used when motion is reduced ("" = the avatar itself)
  //   gif   : an animated picture shown the moment it opens
  //   video : a clip that fades in over the gif when the intro sound ends (played muted and looping)
  //   intro : a short sound that plays once when it opens; its end triggers the video and the music
  //   music : the long sound that loops from the moment the video starts
  //   flicker : ms after opening when the backdrop starts flickering
  //   videoDelay : ms after opening when the video starts if there is no intro sound (or it cannot play)
  //   volume: 0 to 1
  surprise: {
    image: "",
    gif: "/media/cat.gif",
    video: "/media/catvideo.mp4",
    intro: "/media/oiia.mp3",
    music: "/media/cataudio.mp3",
    // false: once opened it cannot be closed (no ESC, no click); a page refresh is the only way out. true: ESC, the ESC badge
    // or a click anywhere closes it. With reduced motion the calm still picture is always closable.
    closable: false,
    flicker: 4000,
    videoDelay: 8000,
    volume: 0.25,
  },
  email: "chintanakbari7706@gmail.com",
  user: "chintan@tagline", // shown in the top bar
  // Add a social link by adding one line. `icon` is a simple-icons name (github, x, medium, ...).
  socials: [
    { label: "LinkedIn", icon: "linkedin", href: "https://www.linkedin.com/in/chintan-akbari/" },
    { label: "WhatsApp", icon: "whatsapp", href: "https://wa.me/917990960490" },
    { label: "Telegram", icon: "telegram", href: "https://t.me/chintan_akbari" },
    { label: "Gmail", icon: "gmail", href: "mailto:chintanakbari7706@gmail.com" },
  ],
};

// `file` is the made-up file name shown in the phone menu (~/index.js).
export const nav = [
  { key: 1, label: "home", file: "index.js", href: "/" },
  { key: 2, label: "about", file: "about.html", href: "/about" },
  { key: 3, label: "projects", file: "projects.json", href: "/projects" },
  { key: 4, label: "resume", file: "resume.md", href: "/resume" },
];

// About page: everything here comes from the resume.
export const about = {
  heading: "Engineering Profile",
  lead: "Frontend developer building high-performance, responsive interfaces.",
  name: "Chintan Akbari",
  title: "Frontend Developer",
  bio: "Frontend Developer specializing in React.js, Next.js and TypeScript. I build responsive, scalable web applications, integrate REST APIs, and deliver 3D experiences with Three.js and React Three Fiber. Proficient in Material-UI, monorepo architecture (Turborepo), and third-party integrations such as Clover, SproutVideo and Avaturn.",
  tags: ["REACT.JS", "NEXT.JS", "TYPESCRIPT", "THREE.JS"],
  skills: [
    "HTML", "JavaScript (ES6+)", "TypeScript", "React.js", "Next.js", "Redux", "Supabase", "Node.js", "REST APIs",
    "CSS", "Material-UI", "Tailwind", "Emotion", "Three.js", "React Three Fiber", "Avaturn",
    "Turborepo", "pnpm", "Git", "GitHub", "Bitbucket",
  ],
};
