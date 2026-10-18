import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs} from './ui-tabs.mjs';
const origin='http://127.0.0.1:4197';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4197','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;const logs=[];server.stderr.on('data',b=>logs.push(String(b)));
try{
 let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(done=>setTimeout(done,250));}
 assert(ready,'Vite preview unavailable: '+logs.join(''));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=withAutoTabs(await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 const pause=page.getByRole('button',{name:'Pause simulation'});
 if(await pause.isVisible())await pause.click();
 const skin=page.locator('#skin'),canvas=page.locator('canvas[aria-label^="Interactive cellular"]');
 const fingerprint=()=>canvas.evaluate(el=>{const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let h=2166136261;for(let i=0;i<d.length;i+=13)h=Math.imul(h^d[i],16777619);return h>>>0;});
 for(const kind of ['gyroid','quasicrystal','lissajous']){
  await skin.selectOption(kind);
  const quality=page.locator('#math-micro-detail');
  await quality.focus();await page.keyboard.press('Home');
  const original=await fingerprint();
  assert.equal(await page.locator('#math-micro-angle').count(),0,'No F6G controls at quality 0');
  await quality.focus();await page.keyboard.press('End');
  const mix=page.locator('#math-micro-mix');
  await mix.focus();await page.keyboard.press('End');
  await page.getByRole('button',{name:/RESET SKIN LAB/}).click();
  await quality.focus();await page.keyboard.press('End');
  await mix.focus();await page.keyboard.press('End');
  const base=await fingerprint();assert.notEqual(base,original);
  const angle=page.locator('#math-micro-angle'),time=page.locator('#math-micro-time-rate'),band=page.locator('#math-micro-band-shift');
  assert(await angle.isVisible()&&await time.isVisible()&&await band.isVisible());
  await angle.focus();await page.keyboard.press('End');
  assert.equal(Number(await angle.inputValue()),180);
  assert.notEqual(await fingerprint(),base,kind+' angle changes actual ink');
  const rotated=await fingerprint();
  await time.focus();await page.keyboard.press('Home');
  assert.equal(Number(await time.inputValue()),-3);
  assert.notEqual(await fingerprint(),rotated,kind+' micro time changes real math');
  const timed=await fingerprint();
  await band.focus();await page.keyboard.press('End');
  assert.equal(Number(await band.inputValue()),8);
  assert.notEqual(await fingerprint(),timed,kind+' micro band shift changes colors');
  await mix.focus();await page.keyboard.press('Home');
  assert.equal(await fingerprint(),original,kind+' opacity 0 unchanged pixels');
  console.log('PASS F6G mobile '+kind+': micro rotation, reverse phase, ink bands, disabled fallback');
 }
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'390px UI overflow');
 assert.deepEqual(errors,[]);
 console.log('PASS F6G phone-width interactive living microscopic inks');
}finally{await browser?.close();server.kill('SIGTERM');}
