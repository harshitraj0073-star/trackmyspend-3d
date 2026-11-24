import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const ALLOWED_RANDOM_FILES = new Set(["src/world/Particles.tsx"]);
const FORBIDDEN_DEMO_PHRASES = [
  "New Laptop",
  "Goa Trip",
  "Emergency Fund",
  "Canteen thali",
  "Zomato late-night",
  "Hostel rent share",
  "Spotify Student"
];

const errors = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    const rel = relative(ROOT, full).replace(/\\/g, "/");

    if (/\/seed\.[^/]+$/i.test(rel)) {
      errors.push(`Forbidden seed file found: ${rel}`);
      continue;
    }

    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

    const text = readFileSync(full, "utf8");

    if (!ALLOWED_RANDOM_FILES.has(rel) && /\bMath\.random\s*\(/.test(text)) {
      errors.push(`Math.random() found outside allowed particle files: ${rel}`);
    }

    for (const phrase of FORBIDDEN_DEMO_PHRASES) {
      if (text.includes(phrase)) {
        errors.push(`Forbidden demo phrase "${phrase}" found in ${rel}`);
      }
    }

    if (rel.startsWith("src/stations/") || rel.startsWith("src/components/")) {
      const currencyMatch = text.match(/₹\s?\d[\d,]*/g);
      if (currencyMatch) {
        errors.push(`Hardcoded currency amount (${currencyMatch.join(", ")}) in ${rel}`);
      }
    }
  }
}

walk(SRC_DIR);

if (errors.length > 0) {
  console.error("check:no-mock FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("check:no-mock PASSED: 0 mock/seed/hardcoded-currency violations found.");
