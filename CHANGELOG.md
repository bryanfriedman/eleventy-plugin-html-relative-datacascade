# Changelog

## 0.1.0 – 2025-12-24

- Initial release.
- Adds `EleventyHtmlRelativeDataCascadePlugin` to extend `mode: "html-relative"` copying with `eleventyCopy` support from:
  - page data (`page.data.eleventyCopy`)
  - page properties (`page.eleventyCopy`)
  - global data (`eleventy.data.eleventyCopy`)
  - directory data files (`<dir>/<basename>.json` and `<basename>.11tydata.json`)
- Includes a fallback to Eleventy’s documented `addTransform` API if `htmlTransformer.addUrlTransform` is unavailable.
