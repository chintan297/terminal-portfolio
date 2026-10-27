import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import compress from "astro-compress";

export default defineConfig({
  // Used by the sitemap, RSS feed and canonical/OG URLs. Change to your domain.
  site: "https://example.com",
  integrations: [
    // expressive-code must come before mdx so code fences are styled.
    expressiveCode({ themes: ["github-dark-default"], styleOverrides: { borderRadius: "0" } }),
    mdx(),
    icon(),
    sitemap(),
    // compress last: it post-processes the built HTML/CSS/JS/images.
    compress(),
  ],
});
