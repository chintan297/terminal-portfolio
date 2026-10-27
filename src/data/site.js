// One import point for all content, so pages can keep doing: import { site, journey } from "../data/site.js".
// The content itself lives in three files:
//   profile.js  who you are: name, contact, socials, navigation, About text
//   resume.js   career: resume, experience, skills, journey
//   extras.js   quotes, tutorials, bits (short notes), footer fortunes
// Projects and blog posts are Markdown files in src/content/ (see CONTENT.md).
export * from "./profile.js";
export * from "./resume.js";
export * from "./extras.js";
