import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg = await b.newPage({viewport:{width:1100,height:6400}});
await pg.goto('file:///home/claude/Buyout/mobile/design/tile-colors.html');
await pg.waitForTimeout(1200);
for (const id of ['blink','zap','flux','spark','neon','pogo']) {
  await pg.locator('#'+id).screenshot({path:`design/tile_${id}.png`});
}
await b.close();
