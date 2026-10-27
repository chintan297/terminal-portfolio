import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site } from "../data/site.js";

export async function GET(context) {
  const posts = (await getCollection("blog")).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: `${site.name} | Blog`,
    description: site.summary,
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.id}/`,
    })),
  });
}
