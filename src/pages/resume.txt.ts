import { site } from "../data/site.js";
import { resumeData as r } from "../data/site.js";

// Plain-text version of the resume, generated from src/data/resume.js so it never drifts from the page.
export function GET() {
  const rule = (t: string) => `\n${t.toUpperCase()}\n${"-".repeat(t.length)}\n`;
  const lines: string[] = [
    site.name.toUpperCase(),
    `${site.location} | ${site.email} | linkedin.com/in/chintan-akbari`,
    rule("Summary"),
    r.summary,
    rule("Experience"),
    ...r.work.flatMap((w) => [`${w.role}, ${w.org} (${w.when})`, ...w.points.map((p) => `  - ${p}`), ""]),
    rule("Education"),
    ...r.education.map((e) => `${e.degree}, ${e.org}${e.when ? ` (${e.when})` : ""}`),
    rule("Skills"),
    ...Object.entries(r.skills).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
