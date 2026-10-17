// D3C real mobile-width UI acceptance: geometry slider commits once, fast
// mouse/touch-style strokes paint a CONTINUOUS physical strip, not only the
// first/last pointer event. Use the actual Vite-built browser app.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {withAutoTabs,openTab} from './ui-tabs.mjs';

const url='http://127.0.0.1:4179';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4179','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;
const logs=[];
server.stderr.on('data',v=>logs.push(String(v)));
try{
 let up=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(url)).ok){up=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert(up,'Vite preview unavailable: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},acceptDownloads:true,hasTouch:true,
  isMobile:true,deviceScaleFactor:2
 }));
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 await page.locator('#engine').selectOption('life');
 await openTab(page,'world');
 await page.locator('#lattice').selectOption('voronoi');
 await page.locator('#seed-pattern').selectOption('center');
 const jitter=page.locator('#voronoi-jitter');
 assert(await jitter.isVisible());
 // End-key is both range keyboard navigation and an intentional commit.
 await jitter.focus();
 await page.keyboard.press('End');
 await page.waitForFunction(()=>document.querySelector('#voronoi-jitter')?.value==='0.42');
 assert.equal(await jitter.inputValue(),'0.42');
 const beforeDownload=async()=>{
  await openTab(page,'export');
  const [download]=await Promise.all([
   page.waitForEvent('download'),
   page.getByRole('button',{name:/SAVE RECIPE/i}).click()
  ]);
  const recipe=JSON.parse(await readFile(await download.path(),'utf8'));
  await openTab(page,'world');
  return recipe;
 };
 const before=await beforeDownload();
 assert.equal(before.settings.lattice,'voronoi');
 assert.equal(before.settings.voronoiJitter,.42);
 assert.equal(before.settings.wrap,false);
 const canvas=page.locator('canvas[aria-label^="Interactive cellular"]');
 const box=await canvas.boundingBox();
 assert(box&&box.width>100&&box.height>100,'Live stage visible on phone');
 // Force ONE large pointermove across 75% of the artwork. A broken
 // event-only brush would paint just endpoints; D3C crosses every polygon.
 const y=box.y+box.height*.80,x0=box.x+box.width*.12,x1=box.x+box.width*.88;
 await page.mouse.move(x0,y);
 await page.mouse.down();
 await page.mouse.move(x1,y,{steps:1});
 await page.mouse.up();
 const after=await beforeDownload();
 assert.equal(after.world.generation,before.world.generation,
  'Painting changes material, never advances the world clock');
 const old=Buffer.from(before.world.arrays.cells,'base64');
 const now=Buffer.from(after.world.arrays.cells,'base64');
 assert.equal(old.length,now.length);
 let added=0;
 for(let i=0;i<old.length;i++)if(!old[i]&&now[i])added++;
 assert(added>=12,'One large drag should cross many real polygon cells, not merely 2 endpoints; painted '+added);
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'D3C Voronoi tools must not introduce phone-width horizontal scroll');
 assert.deepEqual(errors,[],'D3C must not cause browser runtime errors');
 console.log('PASS D3C mobile stage '+box.width+'x'+box.height+
  ', committed jitter '+after.settings.voronoiJitter+
  ', one fast drag actually painted '+added+' distinct polygons');
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
