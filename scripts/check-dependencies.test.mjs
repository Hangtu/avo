import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDependencyPolicy } from "./check-dependencies.mjs";

const fixture = () => ({
  manifest: { name: "synthetic", packageManager: "npm@11.11.0", dependencies: { test: "1.0.0" } },
  lock: {
    name: "synthetic",
    lockfileVersion: 3,
    packages: {
      "": { dependencies: { test: "1.0.0" } },
      "node_modules/test": {
        version: "1.0.0",
        resolved: "https://registry.npmjs.org/test/-/test-1.0.0.tgz",
        integrity: "sha512-c3ludGhldGlj",
      },
    },
  },
  npmrc: "ignore-scripts=true\nregistry=https://registry.npmjs.org/\n",
  userAgent: "npm/11.11.0 node/v22.0.0",
});
test("accepts pinned script-disabled installs with integrity", () => checkDependencyPolicy(fixture()));
test("refuses manager drift, missing integrity, insecure registry and script enabling", () => {
  for (const mutate of [
    (f) => {
      f.userAgent = "npm/10.0.0";
    },
    (f) => {
      f.manifest.packageManager = "pnpm@10.0.0";
    },
    (f) => {
      f.npmrc = "ignore-scripts=false";
    },
    (f) => {
      delete f.lock.packages["node_modules/test"].integrity;
    },
    (f) => {
      f.lock.packages["node_modules/test"].resolved = "http://registry.npmjs.org/test";
    },
    (f) => {
      f.lock.packages["node_modules/test"].link = true;
    },
    (f) => {
      delete f.lock.packages["node_modules/test"].version;
    },
    (f) => {
      f.npmrc = "ignore-scripts=true";
    },
    (f) => {
      f.manifest.dependencies.test = "2.0.0";
    },
  ]) {
    const f = fixture();
    mutate(f);
    assert.throws(() => checkDependencyPolicy(f));
  }
});
