import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// iPhone panels 1-6
let page = await browser.newPage({ viewport: { width: 1400, height: 2900 } });
await page.goto("file:///home/claude/Buyout/mobile/design/shots/panels.html");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
for (let i = 1; i <= 6; i++) {
  const el = await page.$(`#p${i}`);
  await el.screenshot({ path: `/home/claude/Buyout/mobile/design/shots/panel-${i}.png` });
}
console.log("iphone panels done");
await page.close();

// iPad panels 1-4
page = await browser.newPage({ viewport: { width: 2200, height: 2850 } });
await page.goto("file:///home/claude/Buyout/mobile/design/shots/ipad-panels.html");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
for (let i = 1; i <= 4; i++) {
  const el = await page.$(`#p${i}`);
  await el.screenshot({ path: `/home/claude/Buyout/mobile/design/shots/ipad-panel-${i}.png` });
}
console.log("ipad panels done");
await browser.close();
