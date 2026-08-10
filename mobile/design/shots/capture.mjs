import { chromium } from "playwright";

const CAPS = ["board", "buy", "merger", "settle"];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("PAGE ERR:", m.text().slice(0, 200)); });

for (const cap of CAPS) {
  await page.goto(`http://localhost:8765/?cap=${cap}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "::-webkit-scrollbar{display:none} *{scrollbar-width:none}" });
  // wait for fonts + first paint of the app
  await page.waitForFunction(() => !document.body.innerText.includes("Setting the type"), { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200); // let StampIn/PressIn animations finish
  await page.screenshot({ path: `/home/claude/Buyout/mobile/design/shots/cap-${cap}.png` });
  console.log("captured", cap);
}
await browser.close();
