// test/fixtures/basic/eleventy.config.js
import eleventyHtmlRelativeDataCascadePlugin from "../../../src/index.js";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("**/*.{png}", {
    mode: "html-relative",
  });

  eleventyConfig.addPlugin(eleventyHtmlRelativeDataCascadePlugin, {
    extensions: [".html"],
    // debug: true,
  });

  return {
    dir: {
      input: ".",
      output: "_site",
    },
  };
}
