import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDependencyPolicy } from "./check-dependencies.mjs";

const fixture = () => ({
  manifest: {
    name: "synthetic",
    packageManager: "npm@11.20.0",
    engines: { node: "26.x" },
    dependencies: { test: "1.0.0" },
  },
  nodeVersion: "26.13.0",
  nodeVersionFile: "26.13.0\n",
  lock: {
    name: "synthetic",
    lockfileVersion: 3,
    packages: {
      "": { engines: { node: "26.x" }, dependencies: { test: "1.0.0" } },
      "node_modules/test": {
        version: "1.0.0",
        resolved: "https://registry.npmjs.org/test/-/test-1.0.0.tgz",
        integrity: "sha512-c3ludGhldGlj",
      },
    },
  },
  npmrc: "ignore-scripts=true\nregistry=https://registry.npmjs.org/\n",
  userAgent: "npm/11.20.0 node/v26.13.0",
});
test("accepts approved Node 26 and npm with script-disabled integrity-checked installs", () =>
  checkDependencyPolicy(fixture()));
test("accepts Node 26 patch updates within engines while keeping the reproducible pin", () => {
  const f = fixture();
  f.nodeVersion = "26.14.0";
  checkDependencyPolicy(f);
});
test("refuses runtime, Node pin and engine drift", () => {
  for (const mutate of [
    (f) => {
      f.nodeVersion = "22.0.0";
    },
    (f) => {
      f.nodeVersion = "27.0.0";
    },
    (f) => {
      f.nodeVersionFile = "22\n";
    },
    (f) => {
      f.nodeVersionFile = "26.12.0\n";
    },
    (f) => {
      f.manifest.engines.node = ">=22";
    },
    (f) => {
      f.lock.packages[""].engines.node = ">=22";
    },
  ]) {
    const f = fixture();
    mutate(f);
    assert.throws(() => checkDependencyPolicy(f), /Node 26|Node pin|Manifest\/lock engines/);
  }
});
test("refuses manager drift, missing integrity, insecure registry and script enabling", () => {
  for (const mutate of [
    (f) => {
      f.userAgent = "npm/11.11.0";
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
