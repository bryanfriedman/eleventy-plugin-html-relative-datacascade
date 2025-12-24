// src/index.js
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

/**
 * Read JSON if it exists, otherwise return undefined.
 */
function readJsonIfExists(fp) {
  if (!fp) return undefined;
  if (!fs.existsSync(fp)) return undefined;
  const txt = fs.readFileSync(fp, "utf8");
  return JSON.parse(txt);
}

/**
 * Directory data lookup:
 * - <dir>/<basename(dir)>.json
 * - <dir>/<basename(dir)>.11tydata.json
 *
 * Walks upward from the page input file's directory to the filesystem root.
 * Nearest directories win last.
 */
function findEleventyCopyFromDirectoryData(pageInputAbs) {
  if (!pageInputAbs) return undefined;

  const hits = [];
  let dir = path.dirname(pageInputAbs);

  while (dir && dir !== path.dirname(dir)) {
    const base = path.basename(dir);
    const candidates = [
      path.join(dir, `${base}.json`),
      path.join(dir, `${base}.11tydata.json`),
    ];

    for (const fp of candidates) {
      let data;
      try {
        data = readJsonIfExists(fp);
      } catch {
        // ignore malformed JSON; user can opt into strict mode via failOnError in future
        data = undefined;
      }

      if (data && Object.prototype.hasOwnProperty.call(data, "eleventyCopy")) {
        hits.push(data.eleventyCopy);
      }
    }

    dir = path.dirname(dir);
  }

  if (!hits.length) return undefined;

  // Flatten strings/arrays into a single array of strings
  const out = [];
  for (const h of hits) {
    if (Array.isArray(h)) out.push(...h);
    else if (typeof h === "string") out.push(h);
  }

  return out.length ? out : undefined;
}

function normalizeGlobs(globs) {
  if (!globs) return undefined;
  if (Array.isArray(globs)) return globs.filter((g) => typeof g === "string");
  if (typeof globs === "string") return [globs];
  return undefined;
}

function getPageInputAbs(ctx) {
  const input = ctx?.page?.inputPath;
  if (!input || typeof input !== "string") return null;
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

/**
 * The key fix: derive the output directory from page.outputPath, not from config defaults.
 */
function getOutDirAbs(ctx) {
  const out = ctx?.page?.outputPath;
  if (!out || typeof out !== "string") return null;

  const outAbs = path.isAbsolute(out) ? out : path.resolve(process.cwd(), out);
  return path.dirname(outAbs);
}

function copyGlobs({ globs, fromDirAbs, toDirAbs, dot = false }) {
  const list = normalizeGlobs(globs);
  if (!list?.length) return;

  for (const g of list) {
    const matches = fg.sync(g, { cwd: fromDirAbs, dot, absolute: true });

    for (const sourceAbs of matches) {
      if (!fs.existsSync(sourceAbs)) continue;

      const rel = path.relative(fromDirAbs, sourceAbs);
      const targetAbs = path.join(toDirAbs, rel);

      fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
      fs.copyFileSync(sourceAbs, targetAbs);
    }
  }
}

export default function EleventyHtmlRelativeDataCascadePlugin(
  eleventyConfig,
  userOptions = {},
) {
  const opts = {
    extensions: [".html"],
    dot: false,
    debug: false,
    ...userOptions,
  };

  const debug = !!opts.debug;
  const dlog = (...args) => {
    if (debug) console.log("[eleventy-html-relative-datacascade]", ...args);
  };

  const exts = Array.isArray(opts.extensions)
    ? opts.extensions
    : String(opts.extensions ?? ".html")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  // Ensure we only run once per output page
  const processed = new Set();

  eleventyConfig.addTransform("eleventyCopyDataCascade", function (content) {
    const outputPath = this?.page?.outputPath;

    // Only run for matching output extensions
    if (!outputPath || typeof outputPath !== "string") return content;
    if (!exts.some((ext) => outputPath.endsWith(ext))) return content;

    if (processed.has(outputPath)) return content;
    processed.add(outputPath);

    const pageInputAbs = getPageInputAbs(this);
    const outDirAbs = getOutDirAbs(this);

    // Source dir is where the page/template lives
    const inDirAbs = pageInputAbs ? path.dirname(pageInputAbs) : null;

    if (!inDirAbs || !outDirAbs) {
      dlog("skip (missing dirs)", { pageInputAbs, outDirAbs });
      return content;
    }

    // Priority:
    // 1) Page/front matter / page data
    // 2) Directory data cascade
    const fromContext =
      this?.eleventyCopy ||
      this?.page?.eleventyCopy ||
      this?.eleventy?.data?.eleventyCopy ||
      this?.page?.data?.eleventyCopy;

    let globs = normalizeGlobs(fromContext);
    if (!globs) globs = findEleventyCopyFromDirectoryData(pageInputAbs);

    dlog("page", {
      pageInputAbs,
      outputPath,
      outDirAbs,
      inDirAbs,
      globs,
    });

    if (globs?.length) {
      copyGlobs({
        globs,
        fromDirAbs: inDirAbs,
        toDirAbs: outDirAbs,
        dot: opts.dot,
      });
    }

    return content;
  });
}