# Editing your portfolio

Everything you normally change lives in a few files. Nothing else needs touching.

| What | Where |
| --- | --- |
| Name, email, social links, nav, About text | `src/data/profile.js` |
| Resume, experience, skills, About timeline | `src/data/resume.js` |
| Quotes, tutorials, short notes ("bits") | `src/data/extras.js` |
| Projects (case studies) | `src/content/projects/*.mdx` |
| Blog posts | `src/content/blog/*.mdx` |
| Big pixel title on the home page | `heroLines` in `src/data/profile.js` |

Pages import everything through `src/data/site.js`, so you never need to change imports.

## Common tasks

- **Add a social link:** add a line to `socials` in `profile.js`.
- **Add a job:** add an object to `work` (newest first) in `resume.js`, and a line to `experience`.
- **Add a skill:** add a string to a group in `skills` (resume page) or `skillGroups`.
- **Add a project:** copy a file in `src/content/projects/`, change the front matter, write the case study below it. Set `sample: false`.
- **Add a blog post:** copy a file in `src/content/blog/` and edit its title, date and text.
- **Add a short note:** add an object at the top of `bits` in `extras.js`.
- **Remove the "Sample content" footer notice:** set `sample: false` in `profile.js` once tutorials, blog and socials are real.

## Checks

```
npm run dev      # live preview at http://localhost:4321
npm run build    # production build; fails on content mistakes
```
