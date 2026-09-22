/**
 * Comment-aware TR-letter gate.
 * Reads src ts/tsx files except src/i18n.
 * Strips line comments and block comments (string-aware),
 * then fails if [ğüşıöçĞÜŞİÖÇ] remain in code or strings.
 *
 * Run: npm run i18n:gate
 */
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const TR = /[ğüşıöçĞÜŞİÖÇ]/;
const EXT = new Set([".ts", ".tsx"]);

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      const rel = relative(SRC, p).split(sep).join("/");
      if (rel === "i18n" || rel.startsWith("i18n/")) continue;
      walk(p, out);
    } else if (EXT.has(extname(p))) {
      out.push(p);
    }
  }
  return out;
}

function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let inLine = false;
  let inBlock = false;
  let quote = null;
  let escape = false;

  while (i < n) {
    const c = src[i];
    const nxt = i + 1 < n ? src[i + 1] : "";

    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      } else {
        out += " ";
      }
      i += 1;
      continue;
    }

    if (inBlock) {
      if (c === "*" && nxt === "/") {
        inBlock = false;
        out += "  ";
        i += 2;
        continue;
      }
      out += c === "\n" ? "\n" : " ";
      i += 1;
      continue;
    }

    if (quote) {
      out += c;
      if (escape) {
        escape = false;
        i += 1;
        continue;
      }
      if (c === "\\") {
        escape = true;
        i += 1;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }

    if (c === "/" && nxt === "/") {
      inLine = true;
      out += "  ";
      i += 2;
      continue;
    }
    if (c === "/" && nxt === "*") {
      inBlock = true;
      out += "  ";
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      out += c;
      i += 1;
      continue;
    }

    out += c;
    i += 1;
  }
  return out;
}

const hits = [];
for (const file of walk(SRC)) {
  const stripped = stripComments(readFileSync(file, "utf8"));
  const rel = relative(ROOT, file).split(sep).join("/");
  stripped.split(/\r?\n/).forEach((line, idx) => {
    if (TR.test(line)) hits.push(`${rel}:${idx + 1}`);
  });
}

if (hits.length) {
  for (const h of hits) console.error(h);
  process.exit(1);
}
