import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg = await b.newPage({viewport:{width:1100,height:4400}});
await pg.goto('file:///home/claude/Buyout/mobile/icon-lab.html');
await pg.waitForTimeout(1500); // fonts
for (const id of ['a','b','c','d']) {
  const el = pg.locator('#'+id);
  await el.screenshot({path:`icon_${id}.png`});
}
await b.close();
