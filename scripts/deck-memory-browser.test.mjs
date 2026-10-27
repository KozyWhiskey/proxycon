import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import ts from 'typescript';
import { chromium } from '@playwright/test';

const nativeRequire=createRequire(import.meta.url);
async function compile(path,modules={}) {
 const source=await readFile(path,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',js)(id=>modules[id]||nativeRequire(id),mod,mod.exports);return mod.exports;
}
const core=await compile('lib/deck-memory.ts');
const {deckMemoryPreview}=await compile('scripts/fixtures/deck-memory-preview.ts',{'@/lib/deck-memory':core});
const payload=deckMemoryPreview(`data:image/webp;base64,${(await readFile('scripts/fixtures/deck-memories/draft-duplicates.webp')).toString('base64')}`);
const calls=[];const errors=[];
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/deck-memories/**',async route=>{
 const request=route.request();const body=request.postDataJSON();
 calls.push({url:request.url(),method:request.method(),body});
 if(request.method()==='PATCH') {
  if(body.revision!==payload.memory.revision) return route.fulfill({status:409,json:{error:'This deck changed in another tab. Reload before saving.'}});
  payload.memory={...payload.memory,...body,revision:payload.memory.revision+1};
 }
 if(request.url().endsWith('/analyze')) {
  const template=payload.attempts[0];
  const providers=body.retryOf?['google']:body.choice==='both'?['google','openai']:[body.choice];
  payload.attempts.push(...providers.map((provider,index)=>({...template,id:`80000000-0000-4000-8000-00000000000${index}`,provider,analysis_key:body.key,selection:body.choice,
   status:provider==='google'?'failed':'ready',error_category:provider==='google'?'reader_unavailable':null,created_at:new Date().toISOString(),purpose:body.purpose})));
  return route.fulfill({json:{...payload,outcomes:providers.map(provider=>provider==='google'?{provider,error:'Reader unavailable'}:{provider,status:'ready'})}});
 }
 return route.fulfill({json:payload});
});
page.setDefaultTimeout(12000);
try {
 const url=process.env.DECK_PREVIEW_URL||'http://127.0.0.1:3012/dev/deck-memory';
 const output=resolve('.next-verify/deck-memory-screenshots');await mkdir(output,{recursive:true});
 await page.goto(url,{waitUntil:'networkidle',timeout:120000});
 await page.getByRole('heading',{name:'Review your deck',exact:true}).waitFor();
 assert.equal(await page.getByRole('combobox',{name:'Read with',includeHidden:true}).inputValue(),'both');
 for(const [theme,width,height] of [['light',390,844],['dark',390,844],['light',1366,900],['dark',1366,900]]) {
  await page.setViewportSize({width,height});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await page.screenshot({path:resolve(output,theme+'-'+width+'-workspace.png'),fullPage:true,animations:'disabled'});
  await page.screenshot({path:resolve(output,theme+'-'+width+'-workspace-top.png'),animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No workspace overflow');
 }
 const tile=await page.locator('.review-candidate').nth(1).boundingBox();assert.ok(tile.height<300,'Ordinary full-card tile remains compact');
 const image=await page.locator('.review-candidate-art img').first().boundingBox();assert.ok(Math.abs(image.width/image.height-488/680)<0.02,'Whole card keeps natural proportions');
 assert.ok((await page.locator('.builder-category').first().boundingBox()).width<=225,'Sparse groups never stretch');
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Add 1 Gas Guzzler to your deck',exact:true}).click();
 await page.getByRole('tab',{name:'Your deck · 21',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Add 1 Gas Guzzler to your deck',exact:true}).count(),0,'Accepted suggestion cannot add twice');
 await page.getByRole('button',{name:'Gas Guzzler added. View details.',exact:true}).waitFor();
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await page.getByRole('tab',{name:'Your deck · 20',exact:true}).waitFor();
 await page.getByRole('button',{name:'Review Pactdoll Terror',exact:true}).click();
 await page.getByRole('button',{name:'Use 2 visible copies',exact:true}).click();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('tab',{name:'Your deck · 21',exact:true}).waitFor();
 await page.waitForTimeout(1500);
 assert.equal(calls.filter(c=>c.method==='PATCH').at(-1).body.cards.find(c=>c.name==='Pactdoll Terror').count,2);
 await page.getByRole('button',{name:'Photos & readers',exact:true}).click();
 await page.getByRole('checkbox',{name:/Send selected photos/}).check();
 await page.getByRole('button',{name:'Check this photo again',exact:true}).click();
 await page.getByText('Comparison incomplete. Successful readings are kept.',{exact:true}).waitFor();
 assert.equal(calls.find(c=>c.url.endsWith('/analyze')).body.choice,'both');
 await page.getByRole('button',{name:'Retry Google Gemini',exact:true}).click();await page.waitForTimeout(300);
 assert.ok(calls.filter(c=>c.url.endsWith('/analyze')).at(-1).body.retryOf);
 await page.getByRole('button',{name:'Photos & readers',exact:true}).click();
 await page.getByRole('combobox',{name:'Read with'}).selectOption('openai');
 assert.equal(await page.evaluate(()=>localStorage.getItem('proxycon-deck-reader')),'openai');
 await page.getByRole('button',{name:'Check this photo again',exact:true}).click();
 await page.getByText('Photo checked. Review suggested changes below.',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Your deck · 21',exact:true}).click();
 await page.getByRole('region',{name:'Creatures',exact:true}).waitFor();
 await page.getByText('Add cards & basic lands',{exact:true}).click();
 await page.getByLabel('Swamp basic lands',{exact:true}).fill('10');
 await page.getByRole('tab',{name:'Your deck · 22',exact:true}).waitFor();
 await page.getByLabel('Add a missed card',{exact:true}).fill('My custom cube card');
 await page.getByRole('button',{name:'Use “My custom cube card” as an unverified name',exact:true}).click();
 await page.getByRole('region',{name:'Other',exact:true}).waitFor();
 await page.waitForTimeout(1500);
 await page.getByRole('tab',{name:/Your deck ·/}).focus();await page.keyboard.press('ArrowLeft');
 assert.equal(await page.getByRole('tab',{name:/Review ·/}).getAttribute('aria-selected'),'true');
 await page.locator('input[type=file]').nth(1).setInputFiles('scripts/fixtures/deck-memories/draft-duplicates.webp');
 await page.getByRole('heading',{name:'Check your photo',exact:true}).waitFor();
 const preview=page.getByAltText('Selected deck photo',{exact:true});await preview.evaluate(image=>image.decode());
 const before=await preview.evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight}));
 await page.getByText('Rotate or crop',{exact:true}).click();await page.getByRole('button',{name:'Rotate 90°',exact:true}).click();
 await page.waitForFunction(({width,height})=>{const image=document.querySelector('img[alt="Selected deck photo"]');return image?.naturalWidth===height&&image?.naturalHeight===width;},before);
 await page.getByRole('button',{name:'Choose another photo',exact:true}).click();
 for(const width of [320,768]) {await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at '+width);}
 await page.setViewportSize({width:1366,height:900});await page.evaluate(()=>document.body.style.zoom='2');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at 200% zoom');
 await page.screenshot({path:resolve(output,'workspace-zoom-200.png'),fullPage:true,animations:'disabled'});
 await page.evaluate(()=>document.body.style.zoom='1');await page.setViewportSize({width:390,height:844});
 await page.goto(url+'?failed=google',{waitUntil:'networkidle'});await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.getByRole('checkbox',{name:/Send selected photos/,includeHidden:true}).isChecked(),false);
 const beforeRetry=calls.filter(c=>c.url.endsWith('/analyze')).length;
 await page.getByRole('button',{name:'Retry Google Gemini',exact:true}).click();await page.waitForTimeout(300);
 assert.equal(calls.filter(c=>c.url.endsWith('/analyze')).length,beforeRetry+1);
 assert.ok(calls.filter(c=>c.url.endsWith('/analyze')).at(-1).body.retryOf);
 await page.goto(url+'?layout=full',{waitUntil:'networkidle'});
 for(const [theme,width,height] of [['light',390,844],['dark',390,844],['light',1366,900],['dark',1366,900]]) {
  await page.setViewportSize({width,height});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await page.screenshot({path:resolve(output,theme+'-'+width+'-full-workspace.png'),fullPage:true,animations:'disabled'});
  await page.screenshot({path:resolve(output,theme+'-'+width+'-full-workspace-top.png'),animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Full deck workspace does not overflow');
 }
 assert.equal(await page.locator('.review-candidate').count(),22);
 await page.getByRole('button',{name:'Add listed cards',exact:true}).click();
 const bulkDialog=page.getByRole('dialog');
 const bulkNames=await bulkDialog.locator('li span').allTextContents();
 assert.equal(new Set(bulkNames).size,bulkNames.length,'Bulk review contains distinct identities');
 assert.ok(!bulkNames.includes('Gas Guzzler'),'Already accepted cards are excluded from bulk additions');
 await bulkDialog.getByRole('button',{name:/^Add \d+ entries · \d+ copies$/}).click();
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await page.goto(url+'?layout=complete',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 await page.getByRole('heading',{name:'Your deck · 40 cards',exact:true}).waitFor();
 assert.equal(await page.locator('.review-candidate').count(),0,'Completed reviews reopen collapsed');
 await page.getByRole('button',{name:'Show reviewed cards',exact:true}).click();
 assert.equal(await page.locator('.review-candidate').count(),22,'Reviewed card history remains available');
 await page.getByRole('button',{name:'Hide reviewed cards',exact:true}).click();
 for(const width of [390,1366]) {
  await page.setViewportSize({width,height:900});
  await page.screenshot({path:resolve(output,'dark-'+width+'-complete-deck.png'),fullPage:true,animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Complete deck does not overflow');
 }
 await page.goto(url+'?layout=sparse&failed=google',{waitUntil:'networkidle'});
 for(const [width,theme] of [[1366,'dark'],[390,'light']]) {await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.screenshot({path:resolve(output,theme+'-'+width+'-sparse.png'),fullPage:true,animations:'disabled'});}
 assert.deepEqual(errors,[]);
 console.log('Browser tests passed: compact cards, add once, scoped undo, quantity review, grouped stacks, phone tabs/keyboard, autosave, manual lands, custom names, photo rotation, provider selection, retry after reload, both themes and responsive zoom.');
} finally {await browser.close();}
