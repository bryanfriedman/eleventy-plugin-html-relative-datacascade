// test/basic.test.js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Eleventy from "@11ty/eleventy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("copies assets from directory data eleventyCopy into output using html-relative mode", async () => {
  const fixtureRoot = path.join(__dirname, "fixtures", "basic");

  // Deterministic output under fixture
  const outDir = path.join(fixtureRoot, "_site");
  fs.rmSync(outDir, { recursive: true, force: true });

  const prevCwd = process.cwd();
  process.chdir(fixtureRoot);

  const elev = new Eleventy(fixtureRoot, outDir, {
    configPath: path.join(fixtureRoot, "eleventy.config.js"),
  });

  await elev.init();
  await elev.write();

  process.chdir(prevCwd);

  // blog/blog.json sets eleventyCopy ["*.png"] and the template lives in blog/.
  // So blog/test.png should be mirrored to <outDir>/blog/test.png.
  const expected = path.join(outDir, "blog", "test.png");
  assert.ok(fs.existsSync(expected), `Expected file to be copied: ${expected}`);
});
