import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';

const origin='http://127.0.0.1:4189';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4189','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const errors=[];server.stderr.on('data',d=>errors.push(String(d)));
try{
 let ready=false;
 for(let attempt=0;attempt<80;attempt++){
  try{if((await fetch(origin)).ok){ready=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 assert(ready,'Built Vite preview unavailable: '+errors.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2
 }));
 const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 const select=page.locator('#skin'),stage=page.locator('canvas[aria-label^="Interactive cellular"]');
 const fingerprint=()=>stage.evaluate(canvas=>{
  const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let h=2166136261;
  for(let i=0;i<d.length;i+=13)h=Math.imul(h^d[i],16777619);
  return h>>>0;
 });
 for(const skin of ['gyroid','inversion','cusp']){
  await select.selectOption(skin);
  assert.equal(await select.inputValue(),skin);
  const quality=page.locator('#math-micro-detail');
  assert(await quality.isVisible(),skin+' shows subcell quality control');
  await quality.focus();await page.keyboard.press('Home');
  assert.equal(Number(await quality.inputValue()),0,'Previous visual settings default to OFF');
  const plain=await fingerprint();
  await quality.focus();await page.keyboard.press('End');
  assert.equal(Number(await quality.inputValue()),3,'Artist can choose high quality');
  const detailed=await fingerprint();
  assert.notEqual(detailed,plain,'Real subcell sampling must alter '+skin+' live canvas');
  const micro=page.locator('#math-micro-frequency');
  const mix=page.locator('#math-micro-mix');
  assert(await micro.isVisible()&&await mix.isVisible());
  await micro.focus();await page.keyboard.press('End');
  assert.equal(Number(await micro.inputValue()),12);
  assert.notEqual(await fingerprint(),detailed,'Micro equation frequency actually changes art');
  await mix.focus();await page.keyboard.press('Home');
  assert.equal(Number(await mix.inputValue()),0);
  assert.equal(await fingerprint(),plain,
   'Zero subcell mix must restore exact original mathematical rendering');
  await mix.focus();await page.keyboard.press('End');
  await micro.focus();await page.keyboard.press('Home');
  console.log('PASS F6D mobile '+skin+' live preview / quality / frequency / original untouched when mix zero');
 }
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'New F6D sliders must not cause horizontal iPhone-width overflow');
 assert.deepEqual(exceptions,[],'F6D may not throw in phone viewport');
 console.log('PASS F6D: 390px mobile production browser all three opt-in subcell mathematical skins');
}finally{
 await browser?.close();server.kill('SIGTERM');
}
