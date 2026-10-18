import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';
const origin='http://127.0.0.1:4198';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4198','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const logs=[];server.stderr.on('data',b=>logs.push(String(b)));
try{
 let ready=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(origin)).ok){ready=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 assert(ready,'Vite preview unavailable: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2
 }));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 const select=page.locator('#skin');
 const canvas=page.locator('canvas[aria-label^="Interactive cellular"]');
 const fingerprint=()=>canvas.evaluate(el=>{
  const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  let hash=2166136261;
  for(let i=0;i<data.length;i+=13)hash=Math.imul(hash^data[i],16777619);
  return hash>>>0;
 });
 for(const skin of ['gyroid','quasicrystal','lissajous']){
  await select.selectOption(skin);
  await page.getByRole('button',{name:/RESET SKIN LAB/}).click();
  const quality=page.locator('#math-micro-detail');
  const plain=await fingerprint();
  await quality.focus();await page.keyboard.press('End');
  const mix=page.locator('#math-micro-mix');
  await mix.focus();await page.keyboard.press('End');
  const original=await fingerprint();assert.notEqual(original,plain);
  const domain=page.locator('#math-micro-domain');
  assert(await domain.isVisible()&&await domain.inputValue()==='none');
  for(const mode of ['power','kaleidoscope','vortex']){
   await domain.selectOption(mode);
   assert.equal(await domain.inputValue(),mode);
   const order=page.locator('#math-micro-domain-order');
   const coupling=page.locator('#math-micro-domain-coupling');
   assert(await order.isVisible()&&await coupling.isVisible());
   const changed=await fingerprint();
   assert.notEqual(changed,original,skin+'/'+mode+' must transform actual micro ink');
   await order.focus();await page.keyboard.press('End');
   assert.equal(Number(await order.inputValue()),8);
   const ordered=await fingerprint();
   assert.notEqual(ordered,changed,skin+'/'+mode+' mathematical order must affect image');
   await coupling.focus();await page.keyboard.press('Home');
   assert.equal(Number(await coupling.inputValue()),0);
   const uncoupled=await fingerprint();
   assert.notEqual(uncoupled,ordered,skin+'/'+mode+' physical field must couple to pigment');
   // Return settings to default before testing next morphism.
   await order.focus();await page.keyboard.press('Home');
   await coupling.focus();await page.keyboard.press('Home');
   await coupling.focus();await page.keyboard.press('ArrowRight');
   await coupling.focus();await page.keyboard.press('End');
  }
  await domain.selectOption('none');
  assert.equal(await fingerprint(),original,skin+' OFF equals exactly original F6G art');
  await domain.selectOption('power');
  await mix.focus();await page.keyboard.press('Home');
  assert.equal(await fingerprint(),plain,skin+' zero ink remains exact legacy pixels');
  await page.getByRole('button',{name:/RESET SKIN LAB/}).click();
  assert.equal(await page.locator('#math-micro-domain').count(),0,
   'Reset disables microscopic controls and domain mode');
  console.log('PASS F6H mobile '+skin+': three nonlinear mathematical domains and reset');
 }
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'F6H must not overflow 390px iPhone-width screen');
 assert.deepEqual(errors,[],'No production browser errors');
 console.log('PASS F6H: mobile nonlinear domain mutation and exact legacy fallback');
}finally{
 await browser?.close();server.kill('SIGTERM');
}
