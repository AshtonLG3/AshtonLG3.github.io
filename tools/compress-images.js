const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIN_BYTES = 300 * 1024;
const SCALE_FILTER = "scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))'";

function assertInsideRoot(filePath) {
  const resolved = path.resolve(filePath);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error(`Refusing to touch path outside repo: ${resolved}`);
  }
  return resolved;
}

function listJpegs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".jpg"))
    .map((entry) => path.join(dir, entry.name))
    .filter((filePath) => fs.statSync(filePath).size > MIN_BYTES)
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
}

let totalSaved = 0;
const rows = [];

for (const jpgPath of listJpegs(ROOT)) {
  const source = assertInsideRoot(jpgPath);
  const tmp = assertInsideRoot(`${source}.tmp.jpg`);
  const before = fs.statSync(source).size;

  const result = spawnSync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    source,
    "-vf",
    SCALE_FILTER,
    "-q:v",
    "4",
    "-map_metadata",
    "-1",
    tmp,
  ], { encoding: "utf8" });

  if (result.status !== 0 || !fs.existsSync(tmp)) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    rows.push({ file: path.basename(source), beforeKB: Math.round(before / 1024), afterKB: "failed", savedKB: 0 });
    continue;
  }

  const after = fs.statSync(tmp).size;
  if (after < before) {
    fs.renameSync(tmp, source);
    const saved = before - after;
    totalSaved += saved;
    rows.push({ file: path.basename(source), beforeKB: Math.round(before / 1024), afterKB: Math.round(after / 1024), savedKB: Math.round(saved / 1024) });
  } else {
    fs.unlinkSync(tmp);
    rows.push({ file: path.basename(source), beforeKB: Math.round(before / 1024), afterKB: Math.round(before / 1024), savedKB: 0 });
  }
}

console.table(rows);
console.log(`Total saved: ${Math.round(totalSaved / 1024)} KB`);
