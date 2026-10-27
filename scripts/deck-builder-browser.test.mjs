import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.DECK_PREVIEW_URL||'http://127.0.0.1:3012/dev/deck-memory';const output=resolve('.next-verify/deck-builder-screenshots');await mkdir(output,{recursive:true});
let saved;page.setDefaultTimeout(12000);
await page.route('**/api/deck-memories/**',async route=>{const body=route.request().postDataJSON();if(route.request().method()==='PATCH'){saved=body;return route.fulfill({status:503,json:{error:'Fixture holds draft locally for inspection.'}});}return route.fulfill({json:{}});});
try{
 await page.goto(url+'?layout=organized',{waitUntil:'networkidle',timeout:120000});
 await page.getByRole('heading',{name:/Your deck/}).waitFor();
 for(const width of [1366,768,390,320])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  if(width<=768)await page.getByRole('tab',{name:/Your deck/}).click();
  await page.getByLabel('Deck view',{exact:true}).selectOption('stacks');
  await page.screenshot({path:resolve(output,`${theme}-${width}-stacks.png`),fullPage:true,animations:'disabled'});
  await page.screenshot({path:resolve(output,`${theme}-${width}-stacks-top.png`),animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow '+width);
  const faces=page.locator('.builder-image-stack img');assert.ok(await faces.count()>10,'Real images in every stack');
  const last=await page.locator('.builder-image-stack .is-last img').first().boundingBox();assert.ok(Math.abs(last.width/last.height-488/680)<0.02,'Full last card ratio');
 }
 for(const width of [390,1366])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  const trigger=page.getByRole('button',{name:/View Gas Guzzler, 2 copies, Creatures, main deck/});await trigger.click();
  await page.screenshot({path:resolve(output,`${theme}-${width}-inspector.png`),fullPage:false,animations:'disabled'});await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'Focus returns to opened card');
  await page.getByRole('button',{name:'Category',exact:true}).click();await page.getByLabel('Category name',{exact:true}).fill('Card advantage');await page.screenshot({path:resolve(output,`${theme}-${width}-new-category.png`),fullPage:false,animations:'disabled'});await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Category',exact:true}).evaluate(el=>el===document.activeElement),true,'Focus returns to Add category');
 }
 const zoom=await browser.newPage({viewport:{width:683,height:450},deviceScaleFactor:2});await zoom.goto(url+'?layout=organized',{waitUntil:'networkidle'});await zoom.getByRole('tab',{name:/Your deck/}).click();
 await zoom.getByRole('button',{name:/View Gas Guzzler, 2 copies, Creatures, main deck/}).click();await zoom.screenshot({path:resolve(output,'zoom-200-inspector.png'),animations:'disabled'});let box=await zoom.getByRole('dialog').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=451,'Zoom inspector fits viewport');await zoom.getByRole('button',{name:'Close',exact:true}).click();
 await zoom.getByRole('button',{name:'Category',exact:true}).click();await zoom.screenshot({path:resolve(output,'zoom-200-new-category.png'),animations:'disabled'});box=await zoom.getByRole('dialog').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=451,'Zoom category form fits viewport');await zoom.getByRole('button',{name:'Close',exact:true}).click();await zoom.close();
 await page.getByRole('button',{name:/View Gas Guzzler, 2 copies, Creatures, main deck/}).click();await page.getByLabel('Move destination',{exact:true}).selectOption('new');await page.getByLabel('Category name',{exact:true}).fill('Tempo');await page.getByRole('button',{name:'Create category',exact:true}).click();await page.getByLabel('Move destination',{exact:true}).waitFor();assert.equal(await page.getByLabel('Move destination',{exact:true}).locator('option:checked').innerText(),'Tempo');await page.getByLabel('Move destination',{exact:true}).selectOption('new');await page.keyboard.press('Escape');await page.getByLabel('Move destination',{exact:true}).waitFor();await page.waitForTimeout(300);await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.getByLabel('Deck view',{exact:true}).selectOption('list');await page.screenshot({path:resolve(output,'light-390-list.png'),fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Category',exact:true}).click();await page.getByLabel('Category name',{exact:true}).fill('Ramp');await page.getByRole('button',{name:'Create category',exact:true}).click();
 await page.getByRole('region',{name:'Ramp',exact:true}).waitFor();
 await page.getByRole('button',{name:'Manage Ramp',exact:true}).click();await page.getByRole('button',{name:'Rename',exact:true}).click();await page.getByLabel('Category name',{exact:true}).fill('Mana');await page.getByRole('button',{name:'Save name',exact:true}).click();
 await page.getByRole('region',{name:'Mana',exact:true}).waitFor();
 const beforeOrder=await page.getByRole('region',{name:'Mana',exact:true}).boundingBox();await page.getByRole('button',{name:'Manage Mana',exact:true}).click();await page.getByRole('button',{name:'Move earlier',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();const afterOrder=await page.getByRole('region',{name:'Mana',exact:true}).boundingBox();assert.ok(beforeOrder.y!==afterOrder.y||beforeOrder.x!==afterOrder.x,'Reorder produces an observable category movement');
 const card=page.getByRole('button',{name:/View Gas Guzzler, 2 copies, Creatures, main deck/});await card.click();
 await page.getByLabel('Copies to move',{exact:true}).fill('1');await page.getByLabel('Move destination',{exact:true}).selectOption('sideboard');await page.getByRole('button',{name:'Move',exact:true}).click();
 await page.getByRole('button',{name:/View Gas Guzzler, 1 copies, Creatures, main deck/}).waitFor();await page.getByRole('button',{name:/View Gas Guzzler, 2 copies, Sideboard, sideboard/}).waitFor();
 await page.getByRole('button',{name:'Manage Sideboard',exact:true}).click();await page.getByRole('button',{name:'Rename',exact:true}).click();await page.getByLabel('Category name',{exact:true}).fill('Reserve');await page.getByRole('button',{name:'Save name',exact:true}).click();
 await page.getByRole('button',{name:/View Gas Guzzler, 2 copies, Reserve, sideboard/}).waitFor();
 await page.getByRole('button',{name:'Manage Removal',exact:true}).click();await page.getByRole('button',{name:'Delete category',exact:true}).click();await page.getByText(/Cards are preserved\./).waitFor();await page.getByRole('button',{name:'Delete category and preserve cards',exact:true}).click();assert.equal(await page.getByRole('region',{name:'Removal',exact:true}).count(),0);
 await page.waitForTimeout(1300);assert.ok(saved.categories.some(c=>c.name==='Reserve'));assert.equal(saved.cards.find(c=>c.name==='Gas Guzzler').count,3);assert.equal(saved.cards.find(c=>c.name==='Gas Guzzler').allocations.find(a=>a.categoryId==='sideboard').count,2);
 await page.goto(url+'?layout=stress',{waitUntil:'networkidle'});for(const width of [1366,390]){await page.setViewportSize({width,height:900});if(width===390)await page.getByRole('tab',{name:/Your deck/}).click();await page.getByLabel('Deck view',{exact:true}).selectOption(width===390?'list':'stacks');await page.screenshot({path:resolve(output,`light-${width}-stress-60-main-20-side.png`),fullPage:true,animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Stress deck no overflow');}await page.getByRole('heading',{name:'Your deck · 60 cards',exact:true}).waitFor();
 await page.route('**/cards.scryfall.io/**',route=>route.abort());await page.goto(url+'?layout=sparse',{waitUntil:'networkidle'});await page.setViewportSize({width:1366,height:900});await page.getByLabel('Deck view',{exact:true}).selectOption('stacks');await page.screenshot({path:resolve(output,'dark-1366-sparse-image-failure.png'),fullPage:true,animations:'disabled'});assert.ok(await page.locator('.builder-missing-art').count()>=2,'Failed HTTP art falls back to readable names');
 assert.deepEqual(errors,[]);console.log('Deck builder browser passed: real image stacks, both themes, 320–1366 layouts, create/rename/delete, split move and saved allocations.');
}finally{await browser.close();}
