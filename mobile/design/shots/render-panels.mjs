import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1400, height: 2900 } });
await page.goto("file:///home/claude/Buyout/mobile/design/shots/panels.html");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
for (let i = 1; i <= 4; i++) {
  const el = await page.$(`#p${i}`);
  await el.screenshot({ path: `/home/claude/Buyout/mobile/design/shots/panel-${i}.png` });
  console.log("panel", i);
}
await browser.close();
