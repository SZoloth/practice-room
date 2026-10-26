// Drive the lesson exercises end to end with real piano recordings fed into the app's own detector.
// The mic is stubbed out; performances are mixed in the page from tests/samples (see fetch_samples.py)
// and pushed through earBlock at real-time pace, so the exercises' own clocks and count-ins run as they would live.
// Usage: serve a folder holding index.html, lessons.js and samples/, then: node lessons.mjs http://localhost:PORT [filter]
import { chromium } from "playwright";
const [base, only] = process.argv.slice(2);
const browser = await chromium.launch();
let failures = 0;

async function fresh(state = {}) {
  const page = await (await browser.newContext({ viewport: { width: 420, height: 900 } })).newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); failures++; });
  await page.addInitScript(st => {
    if (!location.protocol.startsWith("http")) return;
    localStorage.setItem("pr-state", JSON.stringify({ skills: {}, pieces: [], weak: {}, lastKey: null, lesson: 10, ...st }));
    localStorage.setItem("pr-tab", "drill");
  }, state);
  await page.goto(base + "/index.html");
  await page.evaluate(() => {
    window.earOn = async () => true; // no real mic: the test feeds audio straight into the detector
    const NM = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"], SR = 48000, cache = {};
    async function smp(m, layer) {
      const k = m + (layer || "");
      if (!cache[k]) { const ab = await (await fetch(`samples/${layer ? layer + "/" : ""}${NM[m % 12]}${Math.floor(m / 12) - 1}.wav`)).arrayBuffer();
        cache[k] = (await new OfflineAudioContext(1, 1, SR).decodeAudioData(ab)).getChannelData(0); }
      return cache[k];
    }
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    window.T = {
      // events: {t, midi, gain, dur, layer} piano; {t, voice: hz, dur} a hummed note; {t, clap: true}
      async render(evs, total) {
        const y = new Float32Array(Math.ceil(total * SR));
        for (const e of evs) {
          const i0 = Math.round(e.t * SR);
          if (e.clap) { for (let k = 0; k < .05 * SR && i0 + k < y.length; k++) y[i0 + k] += (rnd() * 2 - 1) * .5 * Math.exp(-k / (.008 * SR)); continue; }
          if (e.voice) { const n = Math.round(e.dur * SR); let ph = 0;
            for (let k = 0; k < n && i0 + k < y.length; k++) { const f = e.voice * 2 ** (.15 * Math.sin(2 * Math.PI * 5 * k / SR) / 12); ph += 2 * Math.PI * f / SR;
              let v = 0; for (let h = 1; h <= 6; h++) v += Math.sin(h * ph) / (h * h); y[i0 + k] += .12 * v * Math.min(1, k / (.08 * SR)) * Math.min(1, (n - k) / (.05 * SR)); } continue; }
          const x = await smp(e.midi, e.layer), n = Math.min(x.length, Math.round(((e.dur ?? .6) + .15) * SR)), rel = Math.round((e.dur ?? .6) * SR);
          for (let k = 0; k < n && i0 + k < y.length; k++) y[i0 + k] += .3 * (e.gain ?? 1) * x[k] * (k > rel ? Math.exp(-(k - rel) / (.04 * SR)) : 1);
        }
        for (let k = 0; k < y.length; k++) y[k] += (rnd() * 2 - 1) * 2e-3;
        return y;
      },
      async feed(y, rt = 1) { // rt > 1 feeds faster than real time
        for (let i = 0; i + 512 <= y.length; i += 512) { earBlock(y.subarray(i, i + 512)); if ((i / 512) % 8 === 7) await new Promise(r => setTimeout(r, 512 * 8 / SR * 1000 / rt)); }
      },
      async play(evs, total, rt) { await this.feed(await this.render(evs, total), rt); },
    };
  });
  return page;
}
async function open(page, id) {
  await page.evaluate(id => { const x = EXERCISES.find(e => e.id === id);
    if (x.make) { const mk = x.make; x.make = (...a) => (window.__line = mk(...a)); }
    if (x.takes) { const tk = x.takes; x.takes = (...a) => (window.__takes = tk(...a)); } }, id);
  await page.click('nav button[data-tab="drill"]');
  await page.locator(`#tab-drill .exrow[data-ex="${id}"]`).first().getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
}
const summary = async page => (await page.locator(".exdone").innerText({ timeout: 120000 })).replace(/\s+/g, " ");
async function check(name, want, fn) {
  if (only && !name.includes(only)) return;
  const t0 = Date.now();
  let got;
  try { got = await fn(); } catch (e) { got = "ERROR " + e.message.split("\n").slice(0, 6).join(" ~ "); }
  const pass = typeof got === "string" && got.startsWith("Passed");
  const ok = want === "pass" ? pass : want === "fail" ? (!pass && !got.startsWith("ERROR")) : got.includes(want);
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name} (expected ${want}, ${((Date.now() - t0) / 1000).toFixed(0)}s): ${got.slice(0, 240)}`);
}
const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// ---- lesson 1: find the letter ----
async function findRun(id, { first = .7, wrongFirst = false, apart = 0, mode = "rh" } = {}) {
  const page = await fresh(); await open(page, id);
  for (let k = 0; k < 12; k++) {
    if (await page.locator(".exdone").count()) break;
    const L = (await page.locator(".exletter").innerText()).trim(); if (!L) break;
    const octs = mode === "finger" ? [4, 4, 4, 4] : [4, 5, 3, 4], ev = [];
    let t = first;
    if (wrongFirst) { ev.push({ t: .4, midi: 12 * 5 + (PCS[L] + 2) % 12 }); t += .3; }
    for (const o of octs) { const m = 12 * (o + 1) + PCS[L]; ev.push({ t, midi: m }); if (mode === "both") ev.push({ t: t + apart, midi: m - 12 }); t += .55; }
    await page.evaluate(([ev, t]) => T.play(ev, t + 1, 3), [ev, t]);
    await page.waitForTimeout(800);
  }
  const s = await summary(page); await page.context().close(); return s;
}
await check("L1 find RH, quick and right", "pass", () => findRun("l1-find-rh"));
await check("L1 find RH, slow to find (2.8 s)", "fail", () => findRun("l1-find-rh", { first: 2.8 }));
await check("L1 find RH, a wrong key before each letter", "fail", () => findRun("l1-find-rh", { wrongFirst: true }));
await check("L1 finger + letter, same key four times", "pass", () => findRun("l1-finger", { mode: "finger" }));
await check("L1 both hands together", "pass", () => findRun("l1-both", { mode: "both", apart: .015 }));
await check("L1 both hands, landing 100 ms apart", "apart", () => findRun("l1-both", { mode: "both", apart: .1 }));

// ---- count-in takes: runs, scales, dynamics ----
async function takesRun(id, perform) {
  const page = await fresh(); await open(page, id);
  const takes = await page.evaluate(() => window.__takes.map(t => ({ seq: t.seq, bpm: t.bpm })));
  for (let k = 0; k < takes.length; k++) {
    const { seq, bpm } = takes[k], B = 60 / bpm;
    if (k) await page.getByRole("button", { name: "Count me in" }).click(); else await page.getByRole("button", { name: "Count me in" }).click();
    const ev = perform(seq, B, k).map(e => ({ ...e, t: e.t + .3 + 4 * B }));
    const end = Math.max(...ev.map(e => e.t)) + 4.5;
    await page.evaluate(([ev, end]) => T.play(ev, end, 1), [ev, end]);
    await page.waitForTimeout(1500);
  }
  const s = await summary(page); const detail = (await page.locator(".exdone").evaluate(n => n.parentElement.innerText)).replace(/\s+/g, " ");
  await page.context().close(); return s + " | " + detail.slice(-400);
}
const even = (seq, B, gains) => seq.map((m, i) => ({ t: i * B + (Math.sin(i * 7) * .012), midi: m, gain: gains ? gains[i] : .9, dur: B * .9 }));
await check("L1 level 5 runs, even", "pass", () => takesRun("l1-runs", (s, B) => even(s, B)));
await check("L1 level 5 runs, one note much softer", "fail", () => takesRun("l1-runs", (s, B) => even(s, B, s.map((_, i) => i === 4 ? .25 : .9))));
await check("L4 C major RH, even", "pass", () => takesRun("l4-c-rh", (s, B) => even(s, B)));
await check("L4 C major RH, thumb-under 170 ms late", "thumb-under (E to F) came", () => takesRun("l4-c-rh", (s, B) => even(s, B).map((e, i) => i >= 3 ? { ...e, t: e.t + .17 } : e)));
await check("L4 C major LH, even", "pass", () => takesRun("l4-c-lh", (s, B) => even(s, B)));
await check("L4 C major hands together", "pass", () => takesRun("l4-c-both", (s, B) => even(s, B).flatMap(e => [e, { ...e, midi: e.midi - 12, t: e.t + .012 }])));
await check("L6 G major RH, even", "pass", () => takesRun("l6-g-rh", (s, B) => even(s, B)));
await check("L6 G major RH, F natural instead of F♯", "Wrong notes", () => takesRun("l6-g-rh", (s, B) => even(s, B).map(e => e.midi === 78 ? { ...e, midi: 77 } : e)));
await check("L5 hairpin, louder then softer", "pass", () => takesRun("l5-hairpin", (s, B) => even(s, B, [.25, .35, .5, .7, 1, .7, .5, .35, .25])));
await check("L5 hairpin, all the same", "fail", () => takesRun("l5-hairpin", (s, B) => even(s, B)));
await check("L5 ladder p mp mf f (soft/loud recordings)", "pass", () => takesRun("l5-ladder", (s, B) => even(s, B).map((e, i) => ({ ...e, ...[{ layer: "v4", gain: .5 }, { layer: "v4" }, {}, { layer: "v14" }][Math.floor(i / 3)] }))));
await check("L5 ladder, mf no louder than mp", "fail", () => takesRun("l5-ladder", (s, B) => even(s, B).map((e, i) => ({ ...e, ...[{ layer: "v4", gain: .5 }, { layer: "v4" }, { layer: "v4" }, { layer: "v14" }][Math.floor(i / 3)] }))));

// ---- read and play at your own pace ----
async function followRun(id, { wrongAt = -1, wrongBy = 2, sing = false, voiceCents = 0, hold = false, lines = 1 } = {}) {
  const page = await fresh(); await open(page, id);
  for (let L = 0; L < lines; L++) {
    await page.waitForFunction(n => window.__line && document.querySelector(".linewrap"), L);
    const midis = await page.evaluate(() => lineMidis(window.__line).filter(m => m != null));
    for (let i = 0; i < midis.length; i++) {
      if (i === wrongAt) { // the wrong key first, on its own, so the app's explanation can be read
        await page.evaluate(([m]) => T.play([{ t: .3, midi: m, dur: .4 }], 1.2, 1), [midis[i] + wrongBy]);
        console.log("     after a wrong key:", (await page.locator("#tab-drill p[role=status]").first().innerText()).slice(0, 160));
      }
      const ev = [{ t: .4, midi: midis[i], dur: hold ? 3 : .35 }];
      let total = hold ? 14 : .9;
      if (sing && !hold) { const f = 440 * 2 ** ((midis[i] - 12 - 69 + voiceCents / 100) / 12); ev.push({ t: total + .3, voice: f, dur: 1.4 }); total += voiceCents ? 11 : 2.2; }
      await page.evaluate(([ev, total]) => T.play(ev, total, 1), [ev, total]);
    }
    await page.waitForTimeout(900);
  }
  const s = await summary(page); await page.context().close(); return s;
}
await check("L2 read treble, all right", "pass", () => followRun("l2-read", { lines: 2 }));
await check("L4 read bass, all right", "pass", () => followRun("l4-bass", { lines: 2 }));
await check("L2 read treble, two wrong keys first", "fail", () => followRun("l2-read", { lines: 2, wrongAt: 3 }).then(async s => s));
await check("L2 sing back, in tune an octave down", "pass", () => followRun("l2-sing", { sing: true }));
await check("L2 sing back, 120 cents flat", "fail", () => followRun("l2-sing", { sing: true, voiceCents: -120 }));
await check("L2 sing back, silent while the key rings on", "fail", () => followRun("l2-sing", { sing: true, hold: true }));
await check("L7 accidentals, all right", "pass", () => followRun("l7-acc", { lines: 3 }));
await check("L7 accidentals, plain key where the ♯ still holds", "fail", () => followRun("l7-acc", { lines: 3, wrongAt: 2, wrongBy: -1 }));
await check("L9 key signature, all right", "pass", () => followRun("l9-keysig", { lines: 3 }));

// ---- play or clap in time after a count-in ----
async function timedRun(id, perform) {
  const page = await fresh(); await open(page, id);
  const { bpm, lines = 3, clap } = await page.evaluate(id => { const x = EXERCISES.find(e => e.id === id); return { bpm: x.bpm, lines: x.lines, clap: !!x.clap }; }, id);
  const B = 60 / bpm;
  for (let L = 0; L < lines; L++) {
    if (L) await page.getByRole("button", { name: "Next line" }).click(); else await page.getByRole("button", { name: "Count me in" }).click();
    const { beats, n, notes } = await page.evaluate(() => { const l = window.__line, b = onsetBeats(l), m = lineMidis(l);
      return { beats: l.ev.reduce((a, e) => a + e.dur, 0), n: l.time[0], notes: b.map((x, i) => x == null ? null : { b: x, midi: m[i] }).filter(Boolean) }; });
    const ev = perform(notes, B, L).map(e => ({ ...e, t: e.t + .4 + n * B }));
    await page.evaluate(([ev, end]) => T.play(ev, end, 1), [ev, .4 + (n + beats) * B + Math.max(1.2, 1.5 * B) + .8]);
    await page.waitForTimeout(600);
  }
  const s = await summary(page); const detail = (await page.locator(".exdone").evaluate(n => n.parentElement.innerText)).replace(/\s+/g, " ");
  await page.context().close(); return s + " | " + detail.slice(-300);
}
const onTime = (notes, B, f = 1, clap) => notes.map((x, i) => clap ? { t: x.b * B * f + Math.sin(i * 5) * .025, clap: true } : { t: x.b * B * f + Math.sin(i * 5) * .02, midi: x.midi, dur: .5 * B });
await check("L3 clap, on time", "pass", () => timedRun("l3-clap", (ns, B) => onTime(ns, B, 1, true)));
await check("L3 clap, 6% slower than the count-in", "pass", () => timedRun("l3-clap", (ns, B) => onTime(ns, B, 1.06, true)));
await check("L3 clap, cutting the 2nd-to-last note short by 250 ms", "fail", () => timedRun("l3-clap", (ns, B) => onTime(ns, B, 1, true).map((e, i, a) => i === a.length - 2 ? { ...e, t: e.t - .25 } : e)));
await check("L3 clap, one clap missing", "fail", () => timedRun("l3-clap", (ns, B) => onTime(ns, B, 1, true).filter((e, i) => i !== 2)));
await check("L7 clap quavers, on time", "pass", () => timedRun("l7-clap", (ns, B) => onTime(ns, B, 1, true)));
await check("L9 clap dotted minims, on time", "pass", () => timedRun("l9-clap", (ns, B) => onTime(ns, B, 1, true)));
await check("L3 tune, on time", "pass", () => timedRun("l3-tune", (ns, B) => onTime(ns, B)));
await check("L3 tune, one wrong note", "fail", () => timedRun("l3-tune", (ns, B) => onTime(ns, B).map((e, i) => i === 3 ? { ...e, midi: e.midi + 1 } : e)));
await check("L2 read on the beat", "pass", () => timedRun("l2-beat", (ns, B) => onTime(ns, B)));
await check("L7 Twinkle, on time", "pass", () => timedRun("l7-twinkle", (ns, B) => onTime(ns, B)));

// ---- quiz ----
await check("L8 terms quiz, all right", "pass", async () => {
  const page = await fresh(); await open(page, "l8-terms");
  const bank = await page.evaluate(() => Object.fromEntries(TERMS.map(t => [t[0], t[1]])));
  for (let i = 0; i < 10; i++) { const q = await page.locator("#tab-drill .quizq").innerText(); await page.getByRole("button", { name: bank[q], exact: true }).click(); await page.waitForTimeout(650); }
  const s = await summary(page); await page.context().close(); return s;
});

await browser.close();
console.log(failures ? `${failures} problem(s)` : "all good");
process.exit(failures ? 1 : 0);
