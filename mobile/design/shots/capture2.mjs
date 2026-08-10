import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function shoot(ctx, caps, suffix) {
  const page = await ctx.newPage();
  for (const cap of caps) {
    await page.goto(`http://localhost:8765/?cap=${cap}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "::-webkit-scrollbar{display:none} *{scrollbar-width:none}" });
    await page.waitForFunction(() => !document.body.innerText.includes("Setting the type"), { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2400);
    await page.screenshot({ path: `/home/claude/Buyout/mobile/design/shots/cap-${cap}${suffix}.png` });
    console.log("captured", cap + suffix);
  }
  await page.close();
}

const phone = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await shoot(phone, ["final", "tutorial"], "");
const pad = await browser.newContext({ viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 2 });
await shoot(pad, ["board", "merger", "buy", "settle"], "-pad");
await browser.close();
