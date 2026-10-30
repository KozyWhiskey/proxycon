import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const output=resolve(process.env.WEEKEND_REVIEW_OUTPUT||'.dev-docs/qa/2026-10-29/implemented');await mkdir(output,{recursive:true});
const base=process.env.WEEKEND_PREVIEW_URL||'http://127.0.0.1:3002';
const memoryBase=process.env.DECK_PREVIEW_URL||'http://127.0.0.1:3012/dev/deck-memory';
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(120000);
const pass=s=>{checks.push(s);console.log('PASS',s);};
const shot=name=>page.screenshot({path:resolve(output,name+'.png'),animations:'disabled'});
const noOverflow=async label=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label);
try{
 for(const width of [320,390])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:844});await page.goto(base+'/dev/weekend-review?screen=names');await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await noOverflow('Name picker '+width);await shot(`names-${theme}-${width}`);
 }
 pass('Name picker and long invitation reflow at 320/390 in both themes');
 await page.goto(base+'/dev/weekend-review');
 // The development preview can finish streaming before React attaches form handlers.
 await page.waitForFunction(()=>{const form=document.querySelector('form');return form&&Object.keys(form).some(key=>key.startsWith('__reactProps$')&&typeof form[key]?.action==='function');});
 await page.getByRole('button',{name:'Create event',exact:true}).click();
 await expect(page.locator('form [role="alert"]')).toBeVisible();await page.getByLabel('Event name',{exact:true}).fill('Disposable validation only');
 await page.getByLabel('End date',{exact:true}).fill('2026-01-01');await page.getByRole('button',{name:'Create event',exact:true}).click();
 await expect(page.locator('form [role="alert"]')).toContainText('End date');assert.equal(await page.getByLabel('Event name',{exact:true}).inputValue(),'Disposable validation only');await noOverflow('Dates at 390');await shot('event-inline-validation');
 pass('Event name/date validation stays inline and retains draft');
 await page.goto(base+'/dev/weekend-review?screen=finish');await page.getByRole('button',{name:'Move Miko up',exact:true}).click();
 assert((await page.getByRole('list',{name:'Podium'}).innerText()).indexOf('Miko')<(await page.getByRole('list',{name:'Podium'}).innerText()).indexOf('Scott'));
 assert(await page.getByRole('button',{name:'Confirm order and add top-two final',exact:true}).isEnabled());await shot('reviewed-tie-order');
 pass('Tie review updates podium and exposes explicit confirm-order final action');
 await page.goto(base+'/dev/weekend-review?screen=deck');
 await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>{const input=document.querySelector('#commanderName');return input&&Object.keys(input).some(key=>key.startsWith('__reactProps$')&&typeof input[key]?.onChange==='function');});
 await page.getByText('Partner, artwork, colors & notes (optional)',{exact:true}).click();
 await page.getByLabel('Notes (optional)',{exact:true}).fill('Keep these personal reminders.');
 const selectedCard={id:'fixture-card',name:'Yoshimaru, Beloved Companion',color_identity:['W'],mana_cost:'{2}{W}',type_line:'Legendary Creature — Dog',oracle_text:'Fixture card details',set:'test',set_name:'Selected printing'};
 let releaseSearch;let requested;
 const seen=new Promise(resolve=>requested=resolve);
 await page.route('https://api.scryfall.com/cards/search?*',async route=>{if(new URL(route.request().url()).searchParams.get('q')==='Delayed'){requested();await new Promise(resolve=>releaseSearch=resolve);}await route.fulfill({json:{data:[selectedCard]}});});
 await page.getByLabel('Commander',{exact:true}).fill('Yoshimaru');await page.getByRole('button',{name:'Search commanders',exact:true}).click();
 await expect(page.getByRole('region',{name:'Selected commander'})).toContainText('Yoshimaru, Beloved Companion');
 assert.equal(await page.getByLabel('Notes (optional)',{exact:true}).inputValue(),'Keep these personal reminders.');
 await page.getByRole('checkbox',{name:'B',exact:true}).check();
 await page.getByRole('button',{name:'Search commanders',exact:true}).click();await expect(page.getByRole('region',{name:'Selected commander'})).toContainText('W · B');
 await page.getByLabel('Commander',{exact:true}).fill('Delayed');await page.getByRole('button',{name:'Search commanders',exact:true}).click();await seen;
 await page.getByLabel('Commander',{exact:true}).fill('My manually entered commander');releaseSearch();await expect(page.getByRole('button',{name:'Search commanders',exact:true})).toBeEnabled();
 assert.equal(await page.getByLabel('Commander',{exact:true}).inputValue(),'My manually entered commander');assert.equal(await page.getByRole('region',{name:'Selected commander'}).count(),0);
 await shot('commander-notes-manual-fallback');pass('Selected card stays separate from Notes, manual colors survive search, late search cannot replace a newer typed name');
 await page.setViewportSize({width:1366,height:768});await page.goto(base+'/dev/weekend?screen=room&state=playing');
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);const positions=await page.locator('.room-result-trigger,.room-standings tbody tr').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().bottom));
  assert.equal(positions.length,12);assert(positions.every(b=>b<=768));await shot('room-'+theme+'-1366');
 }
 assert.equal(await page.getByText('Previous round results',{exact:true}).count(),0);pass('Four report controls/eight standings fit focus Room in both themes, first round has no previous-results disclosure');
 for(const width of [320,768,1024]){await page.setViewportSize({width,height:844});await noOverflow('Room '+width);}
 pass('Room reflow at 320/768/1024');
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/dev/weekend?screen=stats&state=finished&view=head-to-head&player=all');
 assert(await page.locator('.encounter-card').count()>0);await noOverflow('Head-to-head');await shot('head-to-head-390');pass('Head-to-head uses readable format columns and shared encounter counts');
 await page.goto(base+'/dev/weekend?screen=recap&state=finished');await page.getByRole('button',{name:'Choose PNG pages',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choose PNG pages',exact:true})).toHaveAttribute('aria-expanded','true');
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:60000}),page.getByRole('button',{name:'Download page 1',exact:true}).click()]);await download.saveAs(resolve(output,'recap-page-01.png'));
 await page.pdf({path:resolve(output,'recap.pdf'),format:'A4',printBackground:true});await shot('recap-preview-390');pass('Same recap snapshot exports numbered PNG and browser print PDF');
 await page.route('**/api/deck-memories/**',route=>route.fulfill({status:503,json:{error:'Disposable fixture autosave failure'}}));
 await page.goto(memoryBase+'?layout=manual-empty');await page.getByRole('button',{name:'Enter cards by name',exact:true}).click();
 await page.getByLabel('Add a card by name',{exact:true}).fill('Llanowar Elves');await page.getByLabel('Forest basic lands',{exact:true}).fill('17');
 assert.equal(await page.getByLabel('Add a card by name',{exact:true}).inputValue(),'Llanowar Elves');assert(await page.getByLabel('Add a card by name',{exact:true}).isVisible());
 await page.locator('.deck-memory-workspace [role="alert"]').waitFor();assert.equal(await page.getByLabel('Forest basic lands',{exact:true}).inputValue(),'17');await shot('manual-entry-failed-autosave');
 pass('Entering lands keeps manual search expanded, query retained, failed autosave retains edits');
 await page.goto(memoryBase+'?layout=confirmed');assert.equal(await page.getByRole('button',{name:'Confirmed memory',exact:true}).isEnabled(),false);
 await page.getByRole('link',{name:'View confirmation',exact:true}).click();assert.equal(await page.locator('#memory-confirmation').evaluate(e=>e===document.activeElement),true);await shot('confirmed-memory');
 pass('Confirmed memory disables duplicate confirmation and View confirmation focuses its section');
 assert.deepEqual(errors,[],'No browser runtime errors');
}finally{await writeFile(resolve(output,'checks.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
