/**
 * Production OTA — ek command se jitne versions likho, sab pe same message chala jata hai.
 *
 * Kaise use karna hai
 * 1. Neeche VERSIONS mein version likho. Ek ho ya paanch, sab chalenge.
 *    Example:
 *      "26.10.7",
 *      "26.10.5",
 * 2. MESSAGE mein wohi text likho jo OTA pe sab versions ko dikhana hai.
 * 3. Project folder mein terminal kholo aur ye chalao:
 *      node scripts/ota-production.js
 *
 * Sirf VERSIONS aur MESSAGE badalna hai. Branch production hai.
 * app.json ka version script khud badalti hai, aur khatam hote hi wapas 26.10.7 kar deti hai.
 * Beech mein koi version fail ho to aage ke versions nahi chalenge.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const VERSIONS = [
  "26.10.7",
  "26.10.5",
  "26.9.15",
];

const MESSAGE = "API inspector for test users";

const root = path.join(__dirname, "..");
const appJsonPath = path.join(root, "app.json");
const original = fs.readFileSync(appJsonPath, "utf8");

function setVersion(version) {
  let replaced = false;
  const next = original.replace(/"version"\s*:\s*"[^"]+"/, (match) => {
    if (replaced) return match;
    replaced = true;
    return `"version": "${version}"`;
  });
  if (!replaced) {
    throw new Error("app.json mein version nahi mila");
  }
  fs.writeFileSync(appJsonPath, next);
}

function restore() {
  fs.writeFileSync(appJsonPath, original);
}

const versions = VERSIONS.map((version) => String(version).trim()).filter(Boolean);
const message = String(MESSAGE).trim();

if (versions.length === 0) {
  console.error("VERSIONS khali hai. Kam se kam ek version likho.");
  process.exit(1);
}
if (!message) {
  console.error("MESSAGE khali hai.");
  process.exit(1);
}

const done = [];
let failedVersion = null;

try {
  for (const version of versions) {
    console.log(`\n--- OTA ${version} ---`);
    setVersion(version);
    const result = spawnSync(
      "npx",
      ["eas", "update", "--branch", "production", "--message", message, "--non-interactive"],
      { stdio: "inherit", cwd: root },
    );
    if (result.status !== 0) {
      failedVersion = version;
      break;
    }
    done.push(version);
    console.log(`OTA done: ${version}`);
  }
} finally {
  restore();
  console.log("\napp.json version wapas ho gaya.");
}

console.log("\nMessage:", message);
console.log("Published:", done.join(", ") || "none");
if (failedVersion) {
  console.error("Fail:", failedVersion);
  process.exit(1);
}
console.log("Sab versions pe OTA ho gaya.");
