import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
const url='http://127.0.0.1:3012/dev/deck-memory',out=resolve('.next-verify/deck-showcase-screenshots');await mkdir(out,{recursive:true});
let saved;
await page.route('**/api/deck-memories/**',async route=>{if(route.request().method()==='PATCH'){saved=route.request().postDataJSON();return route.fulfill({status:503,json:{error:'Fixture keeps edits local.'}});}return route.fulfill({json:{}});});
try {
 await page.goto(url+'?layout=organized',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/View Gas Guzzler, 2 copies, Creatures, main deck/}).click();
 await page.getByRole('button',{name:'Use as showcase',exact:true}).click();
 await page.getByRole('button',{name:'Use automatic showcase',exact:true}).waitFor();
 await page.waitForTimeout(1300);
 assert.equal(saved.cards.find(card=>card.showcase)?.name,'Gas Guzzler','Autosave retains chosen showcase');
 assert.equal(saved.cards.filter(card=>card.showcase).length,1);
 await page.screenshot({path:resolve(out,'desktop-showcase-selection.png'),animations:'disabled'});
 await page.getByRole('button',{name:'Use automatic showcase',exact:true}).click();
 await page.getByRole('button',{name:'Use as showcase',exact:true}).waitFor();
 await page.waitForTimeout(1300);assert.equal(saved.cards.filter(card=>card.showcase).length,0);
 await page.keyboard.press('Escape');await page.goto(url+'?layout=library',{waitUntil:'networkidle'});
 for(const width of [1366,390])for(const theme of ['dark','light']) {
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await page.screenshot({path:resolve(out,`${theme}-${width}-library.png`),fullPage:true,animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No gallery overflow');
  assert.equal(await page.locator('.limited-gallery-card').count(),3);
 }
 const broken=await browser.newPage();await broken.route('**/cards.scryfall.io/**',route=>route.abort());await broken.goto(url+'?layout=library',{waitUntil:'networkidle'});
 await broken.waitForFunction(()=>document.querySelectorAll('.limited-gallery-card .no-art').length===3);
 assert.equal(await broken.getByText('No showcase artwork',{exact:true}).count(),3,'Failed artwork has usable fallback');await broken.close();
 assert.deepEqual(errors,[]);
 console.log('Showcase browser passed: owner selection/reset and autosave payload; library artwork/cards/fallback in both themes on phone/desktop.');
} finally {await browser.close();}
