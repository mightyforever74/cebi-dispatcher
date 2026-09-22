/**
 * Dispatcher i18n key union check (no extra deps).
 * Compares flattened keys of src/i18n/{en,tr,nl}.ts.
 *
 * Run: node --experimental-strip-types scripts/verify-i18n.ts
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function flattenKeys(src: string): string[] {
  const keys: string[] = [];
  const stack: string[] = [];
  const lines = src.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\/\/.*$/, "");
    const open = line.match(/^(\s*)([A-Za-z_][\w]*)\s*:\s*\{/);
    if (open) {
      stack.push(open[2]);
      continue;
    }
    const leaf = line.match(/^(\s*)([A-Za-z_][\w]*)\s*:/);
    if (leaf && /["'`]/.test(line)) {
      keys.push([...stack, leaf[2]].join("."));
    }
    const closes = (line.match(/\}/g) || []).length;
    const opens = (line.match(/\{/g) || []).length;
    let net = closes - opens;
    while (net > 0 && stack.length) {
      stack.pop();
      net -= 1;
    }
  }
  return keys.filter((k) => k !== "as" && !k.startsWith("as."));
}

function load(name: string): { keys: string[]; set: Set<string> } {
  const src = readFileSync(resolve(ROOT, "src", "i18n", name), "utf8");
  const keys = flattenKeys(src);
  return { keys, set: new Set(keys) };
}

const en = load("en.ts");
const tr = load("tr.ts");
const nl = load("nl.ts");

function missing(from: Set<string>, against: Set<string>): string[] {
  return [...from].filter((k) => !against.has(k)).sort();
}

const missingTr = missing(en.set, tr.set);
const extraTr = missing(tr.set, en.set);
const missingNl = missing(en.set, nl.set);
const extraNl = missing(nl.set, en.set);

let failed = false;
if (missingTr.length || extraTr.length) {
  failed = true;
  // eslint-disable-next-line no-console
  console.error("[verify-i18n] tr.ts key mismatch");
  if (missingTr.length) console.error("  missing:", missingTr.join(", "));
  if (extraTr.length) console.error("  extra:", extraTr.join(", "));
}
if (missingNl.length || extraNl.length) {
  failed = true;
  // eslint-disable-next-line no-console
  console.error("[verify-i18n] nl.ts key mismatch");
  if (missingNl.length) console.error("  missing:", missingNl.join(", "));
  if (extraNl.length) console.error("  extra:", extraNl.join(", "));
}

if (failed) {
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log(`[verify-i18n] ok — ${en.keys.length} keys in en/tr/nl`);
