import createMDX from "@next/mdx";
import katex_macros from "./katex.macros";

const nextConfig = {
  // Configure pageExtensions to include MDX files
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const defaultConfig = createMDX({
  // Add markdown plugins here if needed (e.g., remark-gfm)
  options: {
    remarkPlugins: ["remark-gfm", "remark-math"],
    rehypePlugins: [
      [
        "rehype-katex",
        {
          macros: katex_macros,
        },
      ],
      "rehype-highlight",
      "rehype-slug",
    ],
  },
});

export default defaultConfig(nextConfig);
