import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs,openTab} from './ui-tabs.mjs';
const url='http://127.0.0.1:4181';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4181','--strictPort'],{stdio:['ignore','pipe','pipe']});
const logs=[];server.stderr.on('data',v=>logs.push(String(v)));
let browser;
try{
 let ready=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(url)).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 assert(ready,'Vite browser stage missing: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2
 }));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 await page.locator('#engine').selectOption('life');
 await openTab(page,'world');
 await page.locator('#lattice').selectOption('voronoi');
 const stage=page.locator('canvas[aria-label^="Interactive cellular"]');
 const box=await stage.boundingBox();assert(box&&box.width>100&&box.height>100);
 await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
 const inspector=page.getByRole('status',{name:'Real mathematical cell inspector'});
 assert(await inspector.isVisible(),'Clicking real Voronoi tile opens math inspector');
 assert((await inspector.innerText()).includes('VORONOI'));
 assert((await inspector.innerText()).includes('REAL NEIGHBORS'));
 assert((await inspector.innerText()).includes('PHYSICAL AREA'));
 // Changing the real jitter regenerates different geometry and discards old
 // ID. This must NOT strand inspector on an unrelated pixel/cell.
 const jitter=page.locator('#voronoi-jitter');
 await jitter.focus();await page.keyboard.press('End');
 await page.waitForFunction(()=>!document.querySelector('.math-cell-inspector'));
 assert(!(await inspector.isVisible()),'New Voronoi physical geometry clears stale selection');
 await page.mouse.click(box.x+box.width*.58,box.y+box.height*.49);
 assert(await inspector.isVisible());
 const prior=(await inspector.innerText());
 assert(prior.includes('VORONOI'));
 await page.getByRole('button',{name:/NEW SEED/}).click();
 await page.waitForFunction(()=>!document.querySelector('.math-cell-inspector'));
 assert(!(await inspector.isVisible()),'Regenerating actual seeded geometry clears selected cell');
 await openTab(page,'world');
 await page.locator('#lattice').selectOption('penrose');
 await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
 assert(await inspector.isVisible());
 const pText=await inspector.innerText();
 assert(pText.includes('PENROSE')&&pText.includes('REAL NEIGHBORS'));
 // The fullscreen/regular layout does not turn inspector into an overlay.
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'Inspector must not create mobile horizontal scroll');
 assert.deepEqual(errors,[],'Inspector must not throw while switching real lattices');
 await page.getByRole('button',{name:'Clear inspected cell'}).click();
 assert(!(await inspector.isVisible()),'Inspector close button really clears');
 console.log('PASS D4A 390px inspector true Voronoi/Penrose topology, new seed and jitter selection clearing');
}finally{
 await browser?.close();server.kill('SIGTERM');
}
