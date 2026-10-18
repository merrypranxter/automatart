import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';
const origin='http://127.0.0.1:4199';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4199','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const logs=[];server.stderr.on('data',b=>logs.push(String(b)));
try{
 let ready=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(origin)).ok){ready=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 assert(ready,'Production preview unavailable: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2
 }));
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 const skin=page.locator('#skin');
 const canvas=page.locator('canvas[aria-label^="Interactive cellular"]');
 const image=()=>canvas.evaluate(el=>{
  const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  let h=2166136261;
  for(let i=0;i<data.length;i+=13)h=Math.imul(h^data[i],16777619);
  return h>>>0;
 });
 for(const kind of ['gyroid','quasicrystal','lissajous']){
  await skin.selectOption(kind);
  await page.getByRole('button',{name:/RESET SKIN LAB/}).click();
  const quality=page.locator('#math-micro-detail');
  const plain=await image();
  await quality.focus();await page.keyboard.press('End');
  const mix=page.locator('#math-micro-mix');
  await mix.focus();await page.keyboard.press('End');
  const original=await image();
  assert.notEqual(original,plain,'Details visible');
  const mode=page.locator('#math-micro-phase-mode');
  assert(await mode.isVisible()&&await mode.inputValue()==='off');
  await mode.selectOption('attract');
  const strength=page.locator('#math-micro-phase-strength');
  const depth=page.locator('#math-micro-phase-depth');
  assert(await strength.isVisible()&&await depth.isVisible());
  const attracted=await image();
  assert.notEqual(attracted,original,kind+' real graph must alter pixels');
  await strength.focus();await page.keyboard.press('Home');
  assert.equal(Number(await strength.inputValue()),0);
  assert.equal(await image(),original,kind+' coupling strength zero restores exact original');
  await strength.focus();await page.keyboard.press('End');
  assert.equal(Number(await strength.inputValue()),2);
  const strong=await image();
  assert.notEqual(strong,original);
  await depth.focus();await page.keyboard.press('End');
  assert.equal(Number(await depth.inputValue()),5);
  assert.notEqual(await image(),strong,kind+' propagation depth changes appearance');
  await mode.selectOption('repel');
  assert.notEqual(await image(),strong,kind+' repelling phase changes result');
  await mode.selectOption('off');
  assert.equal(await image(),original,kind+' off is byte-identical to legacy');
  await mode.selectOption('repel');
  await mix.focus();await page.keyboard.press('Home');
  assert.equal(await image(),plain,kind+' zero micro mix bypasses coupling');
  console.log('PASS F6I mobile '+kind+': physical phase mode, strength, depth, reset, exact off');
 }
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'F6I mode and sliders must fit 390px iPhone viewport');
 assert.deepEqual(errors,[],'No production browser faults');
 console.log('PASS F6I real iPhone-width browser graph phase controls');
}finally{await browser?.close();server.kill('SIGTERM');}
