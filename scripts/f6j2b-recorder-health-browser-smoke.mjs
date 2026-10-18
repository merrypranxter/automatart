// Force Chromium through Safari-like native MediaRecorder fallback instead
// of WebCodecs. This catches timing diagnostics never visited by the default
// offline WebM browser test. NOT a substitute for physical iPhone Safari QA.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs,openTab} from './ui-tabs.mjs';
const url='http://127.0.0.1:4196';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4196','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const logs=[];server.stderr.on('data',x=>logs.push(String(x)));
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(url)).ok){ready=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,200));
 }
 assert(ready,'Preview server failed: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}));
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Object.defineProperty(window,'VideoEncoder',{configurable:true,value:undefined});
  window.__fallbackStarts=0;
  const oldStart=MediaRecorder.prototype.start;
  MediaRecorder.prototype.start=function(...args){
   window.__fallbackStarts++;
   return oldStart.apply(this,args);
  };
 });
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('#engine').selectOption('cyclic');
 await page.locator('#export-format').selectOption('video');
 await page.locator('#export-resolution').selectOption('360');
 await page.locator('#duration-preset').selectOption('custom');
 await page.locator('#custom-seconds').fill('3');
 await page.locator('#export-fps').selectOption('10');
 await page.locator('.record-button').click();
 await page.locator('.stage-capture-success').waitFor({timeout:45000});
 await openTab(page,'export');
 const report=page.locator('.capture-timing-report');
 assert(await report.isVisible(),'Completion page must contain timing transparency');
 const text=await report.innerText();
 assert.match(text,/REAL-TIME (BROWSER RECORDER|TIMING RISK)/);
 assert.match(text,/Painted \d+ frames/);
 assert.match(text,/\d+ exceeded the frame-time budget/);
 assert.match(text,/\d+ started late/);
 assert.match(text,/Recorder ran [0-9.]+ s/);
 assert.match(text,/Browser-native recording can still skip frames|Your phone had trouble/i);
 const starts=await page.evaluate(()=>window.__fallbackStarts);
 assert.equal(starts,1,'Force one real native MediaRecorder fallback');
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'Capture report must not overflow 390px');
 const video=page.locator('.export-preview video');
 assert(await video.isVisible());
 const meta=await video.evaluate(async el=>{
  if(el.readyState<1)await new Promise((ok,fail)=>{
   el.addEventListener('loadedmetadata',ok,{once:true});
   el.addEventListener('error',()=>fail(Error('Native recording metadata failed')),{once:true});
   setTimeout(()=>fail(Error('Video metadata timeout')),7000);
  });
  return {seconds:el.duration,width:el.videoWidth,height:el.videoHeight};
 });
 assert(meta.seconds>2&&meta.seconds<8,'Native recording should still play');
 assert(meta.width>0&&meta.height>0);
 assert.deepEqual(errors,[],'No fallback browser page errors');
 console.log('PASS F6J2B: forced real-time MediaRecorder recorded playable video, UI exposes truthful risk and deadline counts at 390px');
}finally{
 await browser?.close();server.kill('SIGTERM');
}
