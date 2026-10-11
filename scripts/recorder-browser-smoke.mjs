// Exercise the real Vite production UI and bundled GIF Worker in Chromium.
// This catches regressions that the Node GIF encoder smoke test cannot see.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const url='http://127.0.0.1:4178';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4178','--strictPort'],{
  stdio:['ignore','pipe','pipe']
});
let browser;
const diagnostics=[];
server.stderr.on('data',d=>diagnostics.push(String(d)));
try{
  let ready=false;
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw Error('Preview server exited: '+diagnostics.join(''));
    try{const res=await fetch(url);if(res.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert(ready,'Vite preview server failed to start: '+diagnostics.join(''));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const WorkerCtor=window.Worker;
    window.__gifWorkersCreated=0;
    window.Worker=class extends WorkerCtor{
      constructor(...args){super(...args);window.__gifWorkersCreated++;}
    };
  });
  await page.goto(url,{waitUntil:'networkidle'});
  // Palette import + new phase-2 controls must work in the actual UI.
  await page.locator('#palette').selectOption('OPAL PRISM');
  assert.equal(await page.locator('.color-wells input[type=color]').count(),12,
    'Original Moire palettes must display all twelve editable stops');
  await page.locator('#source').selectOption('radius');
  await page.locator('#neighbor-shape').selectOption('vonNeumann');
  // Exercise custom birth/survival rule editor, then return to cyclic for GIF.
  await page.locator('#engine').selectOption('life');
  await page.locator('#life').selectOption('custom');
  await page.locator('.rule-bits').first().locator('button').nth(4).click();
  assert.equal(await page.locator('.rule-bits').first().locator('button').nth(4).getAttribute('aria-pressed'),'true');
  await page.locator('#engine').selectOption('cyclic');
  await page.locator('#duration-preset').selectOption('custom');
  await page.locator('#custom-seconds').fill('1');
  await page.locator('#export-fps').selectOption('5');
  await page.locator('.record-button').click();
  await page.locator('.stage-capture-state').waitFor({state:'visible',timeout:10000});
  await page.locator('.stage-capture-success').waitFor({state:'visible',timeout:45000});
  assert.deepEqual(errors,[], 'No page-level errors expected');
  const result=await page.evaluate(async()=>{
    const img=document.querySelector('.export-preview img');
    const exportStatus=document.querySelector('.stage-capture-success')?.textContent||'';
    const frameDetail=document.querySelector('.finished-export')?.textContent||'';
    if(!img?.src)return {error:'Missing output GIF preview'};
    const response=await fetch(img.src);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const header=new TextDecoder().decode(bytes.subarray(0,6));
    let cursor=13, count=0;
    const flags=bytes[10];
    if(flags&0x80)cursor+=3*(1<<((flags&7)+1));
    const skip=()=>{while(cursor<bytes.length){const length=bytes[cursor++];if(!length)break;cursor+=length;}};
    while(cursor<bytes.length){
      const marker=bytes[cursor++];
      if(marker===0x3b)break;
      if(marker===0x21){cursor++;skip();continue;}
      if(marker===0x2c){
        const packed=bytes[cursor+8];cursor+=9;
        if(packed&0x80)cursor+=3*(1<<((packed&7)+1));
        cursor++;skip();count++;continue;
      }
      break;
    }
    return {workers:window.__gifWorkersCreated,header,frames:count,size:bytes.length,exportStatus,frameDetail};
  });
  assert(!result.error,result.error||'');
  assert.equal(result.workers,1,'Browser export should create a real Web Worker');
  assert.equal(result.header,'GIF89a','Should produce GIF content');
  assert.equal(result.frames,5,'Should encode all five frames (1 sec at 5 FPS)');
  assert(result.frameDetail.includes('changing steps'),'UI should explain whether cells changed');
  assert(result.size>1000,'GIF must be nonempty');
  console.log('PASS: REAL BROWSER GIF worker='+result.workers+' frames='+result.frames+' bytes='+result.size);
  await page.locator('.stage-capture-success .dismiss-export').click();
  assert.equal(await page.locator('.stage-capture-success').count(),0,'X dismisses sticky export banner');
  assert.equal(await page.locator('.finished-export').count(),0,'X also removes finished preview from controls');
  console.log('PASS: original 12-stop palette, extra rules, and dismissible export panels');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
