import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';
const origin='http://127.0.0.1:4191';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4191','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const logs=[];server.stderr.on('data',b=>logs.push(String(b)));
try{
 let ready=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(origin)).ok){ready=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 assert(ready,'Built Vite preview unavailable: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2
 }));
 const faults=[];page.on('pageerror',err=>faults.push(err.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 const select=page.locator('#skin');
 const canvas=page.locator('canvas[aria-label^="Interactive cellular"]');
 const fingerprint=()=>canvas.evaluate(el=>{
  const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  let hash=2166136261;
  for(let i=0;i<d.length;i+=13)hash=Math.imul(hash^d[i],16777619);
  return hash>>>0;
 });
 for(const skin of ['prism','facets','spinodal','quasicrystal','hyperbolic','lissajous']){
  await select.selectOption(skin);
  assert.equal(await select.inputValue(),skin);
  const quality=page.locator('#math-micro-detail');
  assert(await quality.isVisible(),skin+' opt-in subcell quality control should exist');
  // F6D parameters are global artist settings; clear state carried by
  // the PREVIOUS skin before comparing any screenshots.
  await quality.focus();await page.keyboard.press('Home');
  assert.equal(Number(await quality.inputValue()),0);
  const plain=await fingerprint();
  await page.locator('#math-micro-frequency').count(); // hidden while quality is 0
  await quality.focus();await page.keyboard.press('End');
  assert.equal(Number(await quality.inputValue()),3);
  const frequency=page.locator('#math-micro-frequency');
  const mix=page.locator('#math-micro-mix');
  assert(await frequency.isVisible()&&await mix.isVisible());
  await mix.focus();await page.keyboard.press('End');
  assert.equal(Number(await mix.inputValue()),1);
  // The art controls are intentionally shared between skins. Reset the
  // frequency before each check: the previous material may have left the
  // slider AT its maximum, making End a no-op rather than a failed shader.
  await frequency.focus();await page.keyboard.press('Home');
  assert.equal(Number(await frequency.inputValue()),.5);
  const detailed=await fingerprint();
  assert.notEqual(detailed,plain,skin+' quality 3 must change real visible pixels');
  await frequency.focus();await page.keyboard.press('End');
  assert.equal(Number(await frequency.inputValue()),12);
  assert.notEqual(await fingerprint(),detailed,skin+' fine frequency must change actual canvas');
  await mix.focus();await page.keyboard.press('Home');
  assert.equal(Number(await mix.inputValue()),0);
  assert.equal(await fingerprint(),plain,skin+' strength 0 returns exact ORIGINAL pixels');
  console.log('PASS F6E phone '+skin+': working true polygon detail, frequency and original fallback');
 }
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'F6E controls may not cause 390px horizontal iPhone overflow');
 assert.deepEqual(faults,[],'F6E render and control must have no production exceptions');
 console.log('PASS F6E: all six F6A/B subcell skins in actual 390px mobile Chromium');
}finally{
 await browser?.close();server.kill('SIGTERM');
}
