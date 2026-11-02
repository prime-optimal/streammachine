// Builds one HyperFrames composition into a single self-contained HTML file for an OBS browser source.
// Source of plugins/stream-machine-hyperframes/dist/build-overlay.mjs; bundle it with `mise run build:hyperframes`.
// Adapted from prime-optimal/stream-makeover overlays/scripts/build-overlay.mjs.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";

const usage = [
  "usage: build-overlay.mjs <component-dir> [--out <dir>] [--as <file-name>] [--set <variable>=<value>]...",
  "  --out  output folder (default ./dist)",
  "  --as   output file name without .html (default: the component folder name)",
  "  --set  bake a new default into a declared variable; repeat for several. URL parameters still override it.",
].join("\n");
const args = process.argv.slice(2);
const positional = [];
const flags = { out: "dist", as: undefined };
const sets = new Map();
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--out" || arg === "--as" || arg === "--set") {
    const value = args[(i += 1)];
    if (value === undefined) fail(`${arg} needs a value`);
    if (arg === "--set") {
      const eq = value.indexOf("=");
      if (eq < 1) fail(`--set needs <variable>=<value>, got: ${value}`);
      sets.set(value.slice(0, eq), value.slice(eq + 1));
    } else flags[arg.slice(2)] = value;
  } else if (arg.startsWith("--")) fail(`unknown flag ${arg}`);
  else positional.push(arg);
}
function fail(message) {
  console.error(`${message}\n${usage}`);
  process.exit(2);
}
if (positional.length !== 1) fail("expected exactly one <component-dir>");

const outDir = path.resolve(flags.out);
const source = path.resolve(positional[0]);
const name = path.basename(source);
const outName = flags.as ?? name;
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) fail(`${name}: the component folder name must be lowercase letters, digits and dashes`);
if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(outName)) fail(`${outName}: --as must be a plain file name`);

const plugin = path.resolve(import.meta.dirname, "..");
const html = await readFile(path.join(source, "index.html"), "utf8");
const driver = await readFile(path.join(plugin, "live/driver.js"), "utf8");

const unsupported = [
  [/data-composition-src\s*=/, "nested compositions (data-composition-src)"],
  [/class\s*=\s*["'][^"']*\bclip\b/, 'timed clips (class="clip")'],
];
for (const [pattern, feature] of unsupported) {
  if (pattern.test(html)) throw new Error(`${name}: the live driver does not support ${feature} yet`);
}

const allowedRemote = /^https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@\d+\.\d+\.\d+\/dist\/[\w.-]+\.js$/;
const references = [
  ...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi),
].map((match) => (match[1] ?? match[2]).trim());
const remote = references.filter((ref) => /^(?:https?:)?\/\//i.test(ref));
const blocked = remote.filter((ref) => !allowedRemote.test(ref));
if (blocked.length) throw new Error(`${name}: remote references outside the GSAP CDN: ${blocked.join(", ")}`);

const fontFile = /\.(?:woff2?|ttf|otf)$/i;
const local = [
  ...new Set(
    references.filter((ref) => !remote.includes(ref) && !ref.startsWith("data:") && !ref.startsWith("#")),
  ),
];
const other = local.filter((ref) => !fontFile.test(ref));
if (other.length) throw new Error(`${name}: only local font files can be bundled, found: ${other.join(", ")}`);

// Subset to Basic Latin, Latin-1, general punctuation, EUR and TM, plus every non-ASCII character in the source.
const codepoints = new Set();
const addRange = (from, to) => {
  for (let cp = from; cp <= to; cp += 1) codepoints.add(cp);
};
addRange(0x20, 0x7e);
addRange(0xa0, 0xff);
addRange(0x2010, 0x2027);
addRange(0x2030, 0x203a);
codepoints.add(0x20ac);
codepoints.add(0x2122);
const decoded = html.replace(/&#x([0-9a-f]+);|&#(\d+);/gi, (_, hex, dec) =>
  String.fromCodePoint(hex ? parseInt(hex, 16) : Number(dec)),
);
for (const char of decoded) {
  const cp = char.codePointAt(0);
  if (cp > 0x7e) codepoints.add(cp);
}
const charset = String.fromCodePoint(...codepoints);

let output = html;
const report = [];
for (const ref of local) {
  const original = await readFile(path.join(source, ref));
  const subset = await subsetFont(original, charset, { targetFormat: "woff2" });
  const uri = `data:font/woff2;base64,${subset.toString("base64")}`;
  output = output.replaceAll(
    new RegExp(`(["'(])${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(["')])`, "g"),
    `$1${uri}$2`,
  );
  report.push(`  ${ref}: ${(original.length / 1024).toFixed(0)} KiB -> ${(subset.length / 1024).toFixed(0)} KiB`);
}
output = output.replace(/format\(["']woff2?|format\(["'](?:truetype|opentype)/gi, (match) =>
  match.replace(/(["'])\w+$/, "$1woff2"),
);

// Bake --set values into the declared variable defaults.
if (sets.size) {
  const declaration = /(data-composition-variables\s*=\s*)'([^']*)'/;
  const found = declaration.exec(output);
  if (!found) throw new Error(`${name}/index.html: --set needs data-composition-variables in single quotes on <html>`);
  const specs = JSON.parse(found[2].replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  for (const [id, raw] of sets) {
    const spec = specs.find((item) => item.id === id);
    if (!spec) throw new Error(`${name}: no declared variable "${id}" (declared: ${specs.map((item) => item.id).join(", ")})`);
    if (spec.type === "number") {
      if (!Number.isFinite(Number(raw))) throw new Error(`${id}: "${raw}" is not a number`);
      spec.default = Number(raw);
    } else if (spec.type === "boolean") {
      if (raw !== "true" && raw !== "false") throw new Error(`${id}: use true or false`);
      spec.default = raw === "true";
    } else if (spec.type === "enum") {
      const allowed = (spec.options ?? []).map((option) => (option !== null && typeof option === "object" ? option.value : option));
      if (!allowed.includes(raw)) throw new Error(`${id}: choose one of ${allowed.join(", ")}`);
      spec.default = raw;
    } else spec.default = spec.maxLength ? raw.slice(0, spec.maxLength) : raw;
  }
  const encoded = JSON.stringify(specs).replace(/&/g, "&amp;").replace(/'/g, "&#39;");
  output = output.replace(declaration, (_, head) => `${head}'${encoded}'`);
}

if (driver.includes("</script")) throw new Error("live/driver.js must not contain a closing script tag");
const anchor = /<meta\s+charset=[^>]*>/i.test(output) ? /<meta\s+charset=[^>]*>/i : /<head[^>]*>/i;
if (!anchor.test(output)) throw new Error(`${name}/index.html has no <head>`);
output = output.replace(anchor, (tag) => `${tag}\n    <script>\n${driver}</script>`);

await mkdir(outDir, { recursive: true });
const target = path.join(outDir, `${outName}.html`);
await writeFile(target, output);
console.log(`built ${target} (${(Buffer.byteLength(output) / 1024).toFixed(0)} KiB)`);
for (const line of report) console.log(line);
