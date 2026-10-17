import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';

const origin='http://127.0.0.1:4187';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4187','--strictPort'],{stdio:['ignore','pipe','pipe']});
const logs=[];server.stderr.on('data',d=>logs.push(String(d)));
let browser;
try{
 let ready=false;
 for(let tries=0;tries<80;tries++){
  try{if((await fetch(origin)).ok){ready=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 assert(ready,'Built Vite preview unavailable: '+logs.join(''));
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
 const hash=()=>canvas.evaluate(node=>{
  const pixels=node.getContext('2d').getImageData(0,0,node.width,node.height).data;
  let h=2166136261;
  for(let i=0;i<pixels.length;i+=13)h=Math.imul(h^pixels[i],16777619);
  return h>>>0;
 });
 const observed=[];
 for(const skin of ['gyroid','inversion','cusp']){
  await select.selectOption(skin);
  assert.equal(await select.inputValue(),skin);
  for(const id of ['math-frequency','math-warp','math-ink','math-fold',
   'math-twist','math-slice','math-pole-x','math-pole-y']){
   assert(await page.locator('#'+id).isVisible(),skin+' exposes '+id);
  }
  // All skins share Appearance math parameters: reset this slider before
  // each check so the previous skin cannot leave us already at the target.
  const slice=page.locator('#math-slice');
  await slice.focus();await page.keyboard.press('Home');
  assert.equal(Number(await slice.inputValue()),-2);
  const old=await hash();
  observed.push(old);
  // Gyroid z = PI*slice is truly 2PI-periodic: 0 and End=2 are
  // equivalent cuts. Test a NON-equivalent half-period section instead,
  // preserving the useful exact loop rather than falsifying the material.
  await slice.focus();await page.keyboard.press('End');
  assert.equal(Number(await slice.inputValue()),2);
  for(let n=0;n<10;n++)await page.keyboard.press('ArrowLeft');
  assert(Math.abs(Number(await slice.inputValue())-1)<1e-8);
  await page.waitForFunction(oldHash=>{
   const el=document.querySelector('canvas[aria-label^="Interactive cellular"]');
   if(!el)return false;
   const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
   let h=2166136261;
   for(let i=0;i<d.length;i+=13)h=Math.imul(h^d[i],16777619);
   return (h>>>0)!==oldHash;
  },old,{timeout:3000});
  assert.notEqual(await hash(),old,'A nonperiodically equivalent '+skin+' slice changes rendered pixels');
  const poleX=page.locator('#math-pole-x');
  await poleX.focus();await page.keyboard.press('Home');
  assert.equal(Number(await poleX.inputValue()),.05);
  const poleY=page.locator('#math-pole-y');
  await poleY.focus();await page.keyboard.press('End');
  assert.equal(Number(await poleY.inputValue()),.95);
  await page.locator('#math-ink').focus();await page.keyboard.press('Home');
  assert.equal(Number(await page.locator('#math-ink').inputValue()),0,
   'The flat-ink finish must be usable without outlines and without bloom');
  console.log('PASS F6C 390px '+skin+': all 8 controls and mathematical section/pole changes');
 }
 assert.equal(new Set(observed).size,3,
  'Three new F6C materials must render distinct live browser pixels');
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'Eight material sliders may not introduce horizontal iPhone scrolling');
 assert.deepEqual(errors,[],'No runtime errors allowed in mobile material renderer');
 console.log('PASS F6C: physical gyroid/inversion/cusp materials usable in real mobile UI');
}finally{
 await browser?.close();server.kill('SIGTERM');
}
