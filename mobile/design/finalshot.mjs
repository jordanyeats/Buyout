import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg = await b.newPage({viewport:{width:1100,height:1100}});
await pg.goto('file:///home/claude/Buyout/mobile/design/final-icon.html');
await pg.waitForTimeout(1200);
await pg.locator('#final').screenshot({path:'design/final_icon_1024.png'});
await b.close();
