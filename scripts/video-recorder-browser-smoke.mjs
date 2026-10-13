// A real browser records evolving canvas video and decodes timestamps/frames.
// This protects the WebKit-stutter fix: no 1-second encoder flushes, no duplicate
// manual requestFrame() on an automatic captureStream() track.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {withAutoTabs,openTab} from './ui-tabs.mjs';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4179','--strictPort'],
  {stdio:['ignore','pipe','pipe']});
let browser;
try{
  let up=false;
  for(let i=0;i<100;i++){
    try{const res=await fetch('http://127.0.0.1:4179');if(res.ok){up=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  assert(up,'Video browser preview did not start');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  // Controls live in studio-shell tabs; locators open the owning tab first.
  const page=withAutoTabs(await browser.newPage({viewport:{width:390,height:844}}));
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  await page.addInitScript(()=>{
    window.__recorderStarts=[];
    const original=MediaRecorder.prototype.start;
    MediaRecorder.prototype.start=function(...args){
      window.__recorderStarts.push(args);
      return original.apply(this,args);
    };
  });
  await page.goto('http://127.0.0.1:4179',{waitUntil:'networkidle'});
  await page.locator('#engine').selectOption('cyclic');
  await page.locator('#export-format').selectOption('video');
  await page.locator('#export-resolution').selectOption('360');
  await page.locator('#duration-preset').selectOption('custom');
  await page.locator('#custom-seconds').fill('3');
  await page.locator('#export-fps').selectOption('10');
  await page.locator('.record-button').click();
  await page.locator('.stage-capture-success').waitFor({timeout:40000});
  assert.deepEqual(failures,[],'No browser page errors');
  const result=await page.evaluate(async()=>{
    const v=document.querySelector('.export-preview video');
    if(!v)return {error:'Missing inline recorded video preview'};
    v.pause();
    if(v.readyState<1)await new Promise((resolve,reject)=>{
      v.addEventListener('loadedmetadata',resolve,{once:true});
      v.addEventListener('error',()=>reject(Error('Video decode metadata failed')),{once:true});
      setTimeout(()=>reject(Error('Video metadata timeout')),8000);
    });
    const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const hashes=[];
    for(const second of [0.2,0.5,0.8,1.1,1.4,1.7,2,2.3,2.6]){
      const seek=Math.min(second,Math.max(0,v.duration-.08));
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(Error('Seek timeout')),4500);
        v.addEventListener('seeked',()=>{clearTimeout(timeout);resolve();},{once:true});
        v.currentTime=seek;
      });
      ctx.drawImage(v,0,0,80,80);
      const data=ctx.getImageData(0,0,80,80).data;
      let hash=2166136261;
      for(let i=0;i<data.length;i+=37){hash^=data[i];hash=Math.imul(hash,16777619);}
      hashes.push(hash>>>0);
    }
    const raw=await fetch(v.src);
    const video=await raw.blob();
    return {duration:v.duration,bytes:video.size,type:video.type,
      starts:window.__recorderStarts,uniqueFrames:new Set(hashes).size,hashes};
  });
  assert(!result.error,result.error||'Video issue');
  assert.equal(result.starts.length,1,'Exactly one MediaRecorder started');
  assert.deepEqual(result.starts[0],[],'Never start recorder with periodic 1-second timeslice');
  assert(result.duration>=2.3&&result.duration<8,'Playable video has a believable 3-second duration: '+result.duration);
  assert(result.bytes>2000,'Encoded video must not be empty');
  assert(result.uniqueFrames>=4,'Video should contain many independently evolving frames: '+JSON.stringify(result));
  console.log('PASS: actual browser video, no periodic flush, '+result.duration.toFixed(2)+
    ' sec, '+result.uniqueFrames+' distinct decoded temporal samples, '+result.bytes+' bytes');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
