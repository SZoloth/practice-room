// Feed recorded piano performances through the app's own detector and grader.
import { chromium } from "playwright";
const base = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", e => console.log("PAGE ERROR", e.message));
await page.goto(base + "/index.html");

const feed = (name) => page.evaluate(async (name) => {
  const buf = new Float32Array(await (await fetch("audio/" + name + ".f32")).arrayBuffer());
  Object.assign(EAR, { sr: 48000, pos: 0, floor: 1e-3, hist: [], lastOnset: -1e9, lastNote: null, pending: [] });
  EAR.ring.fill(0);
  const got = []; const un = earListen(n => got.push(n));
  for (let i = 0; i + 512 <= buf.length; i += 512) earBlock(buf.subarray(i, i + 512));
  un(); return got;
}, name);

// A: pitch sweep
const meta = await page.evaluate(async () => (await fetch("audio/meta.json")).json());
const sweep = await feed("sweep");
let right = 0, octUp = 0; const misses = [];
for (let i = 0; i < meta.sweep.length; i++) {
  const t0 = 0.5 + i, n = sweep.filter(x => !x.soft && Math.abs(x.t - t0) < 0.15);
  const m = meta.sweep[i];
  if (n.length === 1 && n[0].midi === m) right++;
  else if (n.length === 1 && n[0].midi === m + 12 && m < 48) octUp++;
  else misses.push(`${m}: got ${JSON.stringify(n.map(x => x.midi))}`);
}
console.log(`SWEEP C2-C7 (${meta.sweep.length} keys): exact ${right}, octave-up on low keys ${octUp}, wrong/missed ${misses.length}`, misses.join(" | "));
console.log(`  onsets detected: ${sweep.length} (expected ${meta.sweep.length})`);

const grade = async (name, id, key, take = 0) => page.evaluate(async ([name, id, key, take, notes]) => {
  const t = earTakes(id, key)[take]; const g = gradeTake(notes, t);
  return { ok: g.ok, heard: g.heard, tempo: g.tempo, unevenMs: g.unevenMs, splits: g.splits, count: g.count, problems: g.problems,
    pitches: notes.map(n => n.midi) };
}, [name, id, key, take, await feed(name)]);

const cases = [
  ["pulse60", "pulse", "C", 0, true],
  ["pulse100", "pulse", "C", 2, true],
  ["pulse_rush", "pulse", "C", 0, false],
  ["pulse_sloppy", "pulse", "C", 1, false],
  ["five_rh", "five", "G", 0, true],
  ["five_lh", "five", "G", 1, true],
  ["five_pedal", "five", "G", 0, true],
  ["five_wrong", "five", "G", 0, false],
  ["five_quiet", "five", "G", 0, false],
  ["scale_together", "scalesCGF", "G", 0, true],
  ["scale_split", "scalesCGF", "G", 0, false],
  ["five_rh_noisy", "five", "G", 0, true],
  ["pulse60_soft_noisy", "pulse", "C", 0, true],
];
let bad = 0;
for (const [name, id, key, take, expect] of cases) {
  const r = await grade(name, id, key, take);
  const pass = r.ok === expect; if (!pass) bad++;
  console.log(`${pass ? "OK  " : "FAIL"} ${name}: expected ${expect ? "pass" : "fail"}, got ${r.ok ? "pass" : "fail"} | ${r.count} notes, ${r.tempo}/min, ±${r.unevenMs}ms, splits ${r.splits} | ${r.problems.join(" ")}`);
  if (!pass) console.log("      pitches", r.pitches.join(","));
}
console.log(bad ? `${bad} case(s) wrong` : "all grading cases right");
await browser.close();
