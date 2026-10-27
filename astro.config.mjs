import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import compress from "astro-compress";

export default defineConfig({
  // Used by the sitemap, RSS feed and canonical/OG URLs. Change this if you add a custom domain.
  site: "https://chintan-akbari.vercel.app",
  // Name the folder for built JS/CSS "assets" instead of the framework default.
  build: { assets: "assets" },
  vite: {
    build: {
      // hashed, neutral file names (no framework or component names in the built files)
      rollupOptions: { output: { entryFileNames: "assets/[hash].js", chunkFileNames: "assets/[hash].js", assetFileNames: "assets/[hash][extname]" } },
    },
  },
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
