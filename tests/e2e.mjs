// Real mic path: Chromium's fake capture device plays a recording into getUserMedia.
import { chromium } from "playwright";
const [base, which] = process.argv.slice(2);
const wav = `${process.cwd()}/audio/${which === "drill" ? "drill_e2e" : "five_e2e"}.wav`;
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ permissions: ["microphone"] });
const page = await ctx.newPage();
page.on("pageerror", e => console.log("PAGE ERROR", e.message));
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") console.log("console:", m.text()); });
const M = st => ({ status: "mastered", passDays: [], best: null, interval: 0, due: "2099-01-01" });
const state = which === "drill" ? { skills: { keys: M() } } : { skills: { keys: M(), fingers: M(), posture: M() } };
await page.addInitScript(([st, drill]) => {
  localStorage.setItem("pr-state", JSON.stringify({ ...st, pieces: [], weak: {}, lastKey: null, lesson: 1 }));
  if (drill) Math.random = () => 0;
}, [state, which === "drill"]);
await page.goto(base + "/index.html");
if (which === "drill") {
  await page.click('nav button[data-tab="drill"]');
  await page.locator(".block", { hasText: "Reading notes: treble clef" }).getByRole("button", { name: "Start 60-second run" }).click();
  await page.getByRole("button", { name: "Answer on the piano instead" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForTimeout(63000);
  console.log("verdict:", (await page.locator("#tab-drill").innerText()).replace(/\s+/g, " ").slice(0, 400));
  console.log("run saved:", await page.evaluate(() => localStorage.getItem("pr-runs")));
} else {
  console.log("today key:", await page.evaluate(() => plan().key));
  await page.getByRole("button", { name: /Pass test/ }).click();
  const btns = page.getByRole("button", { name: "Start listening test" });
  console.log("listening tests on page:", await btns.count());
  const t0 = Date.now();
  await btns.nth(1).click();
  const row = page.locator("#tab-today .step-body");
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const txt = (await row.innerText()).replace(/\s+/g, " ");
    if (i % 3 === 0 || /logged|miss|Try again/.test(txt)) console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", txt.slice(-260));
    if (/Passed and logged|Logged as a miss|Nothing was logged/.test(txt)) break;
  }
  console.log("five state:", await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("pr-state")).skills.five)));
}
await browser.close();
