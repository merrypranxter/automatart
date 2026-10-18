// A genuine production-browser trial at iPhone 390px width: opt-in device
// profiling must leave all real CA cells/generation unchanged and go stale
// rather than show inaccurate timing if the artist changes output settings.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs,openTab} from './ui-tabs.mjs';
const address='http://127.0.0.1:4195';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4195','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const diagnostics=[];server.stderr.on('data',d=>diagnostics.push(String(d)));
try{
 let ready=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(address)).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 assert(ready,'Preview did not start: '+diagnostics.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2
 }));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(address,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 await page.locator('#engine').selectOption('cyclic');
 await openTab(page,'export');
 const before=await page.locator('.readouts').innerText();
 await page.locator('#export-format').selectOption('gif');
 await page.locator('#export-resolution').selectOption('360');
 await page.locator('#export-fps').selectOption('10');
 const run=page.locator('#capture-preflight-start');
 assert(await run.isVisible());
 await run.click();
 await page.locator('.capture-preflight-results').waitFor({timeout:35000});
 let report=await page.locator('.capture-preflight-results').innerText();
 assert.match(report,/FRAME-INDEXED EXPORT PATH/);
 assert.match(report,/360 × 360/);
 assert.match(report,/5 measured frames/);
 assert.match(report,/Median \d+ ms/);
 assert.equal(await page.locator('.readouts').innerText(),before,
  'Probe must never advance the live world's generation or cells');
 await page.locator('#export-fps').selectOption('15');
 assert.equal(await page.locator('.capture-preflight-results').count(),0,
  'Changed export controls invalidate measurements instead of lying');
 await page.locator('#export-frame-aspect').selectOption('portrait');
 await run.click();
 await page.locator('.capture-preflight-results').waitFor({timeout:35000});
 report=await page.locator('.capture-preflight-results').innerText();
 assert.match(report,/360 × 640/,'9:16 real-output canvas is measured');
 assert.match(report,/15 FPS/);
 assert.match(report,/5 measured frames/);
 assert.equal(await page.locator('.readouts').innerText(),before);
 // Test video path selection without creating a full file; WebCodecs may
 // be offline or browser native but its label must be truthful.
 await page.locator('#export-format').selectOption('video');
 assert.equal(await page.locator('.capture-preflight-results').count(),0);
 await run.click();
 await page.locator('.capture-preflight-results').waitFor({timeout:35000});
 const route=await page.locator('.capture-preflight-results').innerText();
 assert.match(route,/OFFLINE WEBM|REAL-TIME VIDEO|No supported video recorder/);
 assert.match(route,/five-frame|Short sample only/i);
 assert.deepEqual(errors,[]);
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  '390px phone must not gain horizontal overflow');
 console.log('PASS F6J2C: real phone-width optional preflight, 1:1/9:16 and video routing, cloned physics, stale result invalidation');
}finally{await browser?.close();server.kill('SIGTERM');}
