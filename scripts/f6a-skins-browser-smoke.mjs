import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';
const origin='http://127.0.0.1:4183';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4183','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const log=[];server.stderr.on('data',v=>log.push(String(v)));
try{
 let connected=false;
 for(let t=0;t<90;t++){
  try{if((await fetch(origin)).ok){connected=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 assert(connected,'Production preview not running: '+log.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2
 }));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 const select=page.locator('#skin');
 const labels=[];
 const canvas=page.locator('canvas[aria-label^="Interactive cellular"]');
 const hash=()=>canvas.evaluate(el=>{
  const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  let x=2166136261;for(let i=0;i<d.length;i+=13){x=Math.imul(x^d[i],16777619);}
  return x>>>0;
 });
 const samples=[];
 for(const skin of ['prism','facets','spinodal']){
  await select.selectOption(skin);
  assert.equal(await select.inputValue(),skin);
  assert(await page.locator('#math-frequency').isVisible());
  assert(await page.locator('#math-warp').isVisible());
  assert(await page.locator('#math-ink').isVisible());
  const base=await hash();
  samples.push(base);
  const f=page.locator('#math-frequency');
  await f.focus();await page.keyboard.press('End');
  assert.equal(Number(await f.inputValue()),12);
  const changed=await hash();
  assert.notEqual(changed,base,'Actual frequency slider changes the canvas for '+skin);
  await page.keyboard.press('Home');
  assert.equal(Number(await f.inputValue()),.5);
  await page.locator('#math-warp').focus();await page.keyboard.press('Home');
  await page.locator('#math-ink').focus();await page.keyboard.press('Home');
  assert.equal(Number(await page.locator('#math-ink').inputValue()),0,
   'Flat pigment works with ink/glow optional');
  labels.push(skin);
 }
 assert.equal(new Set(samples).size,3,'Different looks actually appear in live artist preview');
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
   'Additional skin controls cannot create horizontal scroll on iPhone width');
 assert.deepEqual(errors,[],'F6A must not trigger production browser exceptions');
 console.log('PASS F6A 390px artist skin panel: '+labels.join(', ')+
  ' independently rendering, three live math knobs, non-glow and no horizontal scroll');
}finally{
 await browser?.close();server.kill('SIGTERM');
}
