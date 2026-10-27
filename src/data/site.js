// One import point for all content, so pages can keep doing: import { site, journey } from "../data/site.js".
//   profile.js  who you are: name, contact, socials, navigation, About text
//   resume.js   career: resume, experience, skills, journey
// Projects are Markdown files in src/content/projects (see CONTENT.md).
export * from "./profile.js";
export * from "./resume.js";
