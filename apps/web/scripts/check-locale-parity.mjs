import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function flatten(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return flatten(child, next);
  });
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(readFileSync(join(root, "public/locales/en/common.json"), "utf8"));
const vi = JSON.parse(readFileSync(join(root, "public/locales/vi/common.json"), "utf8"));
const enKeys = flatten(en).sort();
const viKeys = flatten(vi).sort();
const missingInVi = enKeys.filter((key) => !viKeys.includes(key));
const extraInVi = viKeys.filter((key) => !enKeys.includes(key));
if (missingInVi.length > 0 || extraInVi.length > 0) {
  if (missingInVi.length > 0) {
    console.error("Missing in vi:\n" + missingInVi.join("\n"));
  }
  if (extraInVi.length > 0) {
    console.error("Extra in vi:\n" + extraInVi.join("\n"));
  }
  process.exit(1);
}
console.log(`OK ${enKeys.length} keys`);
