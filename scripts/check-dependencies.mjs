import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Fail before install if a changed lock or policy bypasses our trust boundary. */
export function checkDependencyPolicy({ manifest, lock, npmrc, userAgent }) {
  assert.equal(manifest.packageManager, "npm@11.11.0", "Review npm version changes with this policy");
  assert.equal(userAgent?.split(" ")[0], "npm/11.11.0", "Use the packageManager-pinned npm");
  assert.match(npmrc, /^ignore-scripts=true$/m, "Dependency lifecycle scripts must stay blocked");
  assert.match(
    npmrc,
    /^registry=https:\/\/registry\.npmjs\.org\/$/m,
    "Pin the registry for implicit npm URLs",
  );
  assert.equal(lock.lockfileVersion, 3, "Keep the authoritative npm v3 lockfile");
  assert.equal(lock.name, manifest.name);
  const root = lock.packages?.[""];
  assert.ok(root, "Missing root package");
  for (const kind of ["dependencies", "devDependencies"]) {
    assert.deepEqual(root[kind], manifest[kind], `Manifest/lock ${kind} mismatch`);
  }
  for (const [path, pkg] of Object.entries(lock.packages)) {
    if (!path) continue;
    assert.ok(!pkg.link, `Unreviewed linked dependency: ${path}`);
    // npm 11 can retain implicit registry URLs even after native v1->v3
    // metadata repair. An exact version + SRI + pinned registry still freezes
    // the tarball; explicit URLs must remain on the same approved registry.
    assert.match(pkg.version ?? "", /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/, `Missing exact version: ${path}`);
    if (pkg.resolved !== undefined)
      assert.match(pkg.resolved, /^https:\/\/registry\.npmjs\.org\//, `Unreviewed registry URL: ${path}`);
    assert.match(pkg.integrity ?? "", /^sha512-[A-Za-z0-9+/]+=*$/, `Missing integrity: ${path}`);
  }
}

function main() {
  const json = (path) => JSON.parse(readFileSync(path, "utf8"));
  checkDependencyPolicy({
    manifest: json("package.json"),
    lock: json("package-lock.json"),
    npmrc: readFileSync(".npmrc", "utf8"),
    userAgent: process.env.npm_config_user_agent,
  });
  assert.equal(process.env.npm_config_ignore_scripts, "true", "Do not override ignore-scripts");
  console.log("Dependency policy: pinned npm, registry integrity, lifecycle scripts blocked");
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
