import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';

const origin='http://127.0.0.1:4185';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4185','--strictPort'],{stdio:['ignore','pipe','pipe']});
const logs=[];server.stderr.on('data',data=>logs.push(String(data)));
let browser;
try{
 let up=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(origin)).ok){up=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 assert(up,'Cannot connect to production preview: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({
  viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2
 }));
 const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 const select=page.locator('#skin');
 const canvas=page.locator('canvas[aria-label^="Interactive cellular"]');
 const hash=()=>canvas.evaluate(el=>{
  const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  let h=2166136261;
  for(let i=0;i<d.length;i+=13)h=Math.imul(h^d[i],16777619);
  return h>>>0;
 });
 const fingerprints=[];
 for(const skin of ['quasicrystal','hyperbolic','lissajous']){
  await select.selectOption(skin);
  assert.equal(await select.inputValue(),skin);
  const initial=await hash();fingerprints.push(initial);
  for(const id of ['math-frequency','math-warp','math-ink','math-fold','math-twist'])
   assert(await page.locator('#'+id).isVisible(),'Real '+skin+' knob is visible: '+id);
  const slider=page.locator('#math-fold');
  await slider.focus();await page.keyboard.press('End');
  assert.equal(Number(await slider.inputValue()),12);
  assert.notEqual(await hash(),initial,skin+' fold control changes rendered canvas');
  await slider.focus();await page.keyboard.press('Home');
  assert.equal(Number(await slider.inputValue()),3);
  const twist=page.locator('#math-twist');
  await twist.focus();await page.keyboard.press('End');
  assert.equal(Number(await twist.inputValue()),2);
  await page.locator('#math-frequency').focus();await page.keyboard.press('End');
  assert.equal(Number(await page.locator('#math-frequency').inputValue()),12);
  await page.locator('#math-ink').focus();await page.keyboard.press('Home');
  assert.equal(Number(await page.locator('#math-ink').inputValue()),0,
   'Artist may use full-color non-outline, non-glow finish');
  console.log('PASS F6B live browser '+skin+' fold/twist/frequency/flat-ink controls');
 }
 assert.equal(new Set(fingerprints).size,3,'All F6B materials have distinct actual browser pixels');
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),
  'F6B added controls must not cause 390px mobile overflow');
 assert.deepEqual(exceptions,[],'F6B renderer cannot throw browser exceptions');
 console.log('PASS F6B 390px mobile browser, three distinct mathematically driven looks');
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
