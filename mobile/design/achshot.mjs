import { chromium } from "playwright";
const IDS = ["victor","tycoon","landslide","shark-slayer","serial-founder","card-shark","purist","full-table"];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
await page.goto("file:///home/claude/Buyout/mobile/design/achievements.html");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
for (const id of IDS) {
  const el = await page.$(`#${id}`);
  await el.screenshot({ path: `/home/claude/Buyout/mobile/design/ach-${id}.png` });
}
console.log("done");
await browser.close();
