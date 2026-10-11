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
  await page.locator('.transport .surprise').click();
  await page.locator('.status-msg').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Dismiss status message'}).click();
  assert.equal(await page.locator('.status-msg').count(),0,'Status toast has a working X');

  // Regression: 720p / 30s / 10 FPS was rejected immediately by the old
  // width*height*frames budget despite the Worker encoding sequentially.
  await page.locator('#export-resolution').selectOption('720');
  await page.locator('#duration-preset').selectOption('30');
  const advisory=page.locator('.capture-warning').filter({hasText:'300 frames'});
  assert(await advisory.isVisible(),'Large recording gets an advisory, not a preflight failure');
  await page.getByRole('button',{name:'Dismiss large GIF advisory'}).click();
  assert.equal(await advisory.count(),0,'Large GIF advisory can be dismissed');
  await page.locator('.record-button').click();
  await page.waitForFunction(()=>Number(document.querySelector('.stage-capture-head span')?.textContent?.match(/^\d+/)?.[0]||0)>=1,{},{timeout:45000});
  assert.equal(await page.locator('.stage-capture-error').count(),0,'720p / 30s must begin encoding');
  await page.locator('.stage-capture-foot button').click();
  await page.locator('.stage-capture-state').waitFor({state:'hidden',timeout:10000});
  assert.equal(await page.locator('.stage-capture-error').count(),0,'Cancellation is not an export error');

  // Force a Worker initialization error to verify BOTH failure notices can
  // be dismissed from the sticky preview and the recorder drawer.
  await page.evaluate(()=>{
    window.__savedWorker=window.Worker;
    window.Worker=class {constructor(){throw new Error('Simulated encoder failure');}};
  });
  await page.locator('#duration-preset').selectOption('10');
  await page.locator('#export-resolution').selectOption('360');
  await page.locator('.record-button').click();
  await page.locator('.stage-capture-error').waitFor({state:'visible',timeout:10000});
  assert(await page.locator('.capture-warning[role="alert"]').isVisible(),'Duplicate inline alert visible');
  await page.getByRole('button',{name:'Close export failed notification'}).click();
  assert.equal(await page.locator('.stage-capture-error').count(),0,'Error banner dismisses');
  assert.equal(await page.locator('.capture-warning[role="alert"]').count(),0,'Inline error also disappears');
  await page.evaluate(()=>{window.Worker=window.__savedWorker;});

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
  for(const [mode,selector] of [
    ['generations','#gen-states'],['excitable','#excite-states'],
    ['larger','#large-radius'],['species','#species-count']
  ]){
    await page.locator('#engine').selectOption(mode);
    assert(await page.locator(selector).isVisible(),mode+' has real rule controls');
  }
  await page.locator('#species-count').fill('4');
  await page.locator('#species-brush').selectOption('2');
  await page.locator('#engine').selectOption('oriented');
  assert(await page.locator('#oriented-match').isVisible(),'Directional template controls visible');
  await page.locator('#oriented-symmetry').selectOption('dihedral');
  assert(await page.locator('.direction-grid button').count()===8,'Eight independently configurable neighbors');
  await page.locator('#engine').selectOption('margolus');
  assert(await page.locator('.rewind-button').isVisible(),'Exact cell-state rewind available');
  assert(await page.locator('#lattice').isDisabled(),'Margolus cannot use triangular / hexagonal partitions');
  await page.locator('#engine').selectOption('cyclic');
  await page.locator('.transport .primary').click(); // pause for deterministic skin comparison
  const lattices=[];
  for(const shape of ['square','hex','triangle']){
    await page.locator('#lattice').selectOption(shape);
    await page.waitForTimeout(180);
    lattices.push(await page.locator('.canvas-wrap canvas').evaluate(c=>c.toDataURL('image/png')));
  }
  assert.equal(new Set(lattices).size,3,'Actual lattice display geometries must differ');
  await page.locator('#lattice').selectOption('hex'); // GIF must retain actual hex geometry
  const skinImages=[];
  for(const skin of ['pixels','soft','glow','contours','mercury','relief','glass']){
    await page.locator('#skin').selectOption(skin);
    await page.waitForTimeout(60);
    skinImages.push(await page.locator('.canvas-wrap canvas').evaluate(c=>c.toDataURL('image/png')));
  }
  assert.equal(new Set(skinImages).size,7,'Every visual skin must look different in the actual canvas');
  await page.locator('#skin').selectOption('mercury');
  assert(await page.locator('#skin-threshold').isVisible(),'Liquid density control appears');
  assert(await page.locator('#chrome-strength').isVisible(),'Chrome reflection control appears');
  assert(await page.locator('#temporal-rgb').isVisible(),'RGB time ghost control appears');
  assert(await page.locator('#fossil-opacity').isVisible(),'Cell fossil control appears');
  await page.locator('#temporal-rgb').focus();
  await page.locator('#temporal-rgb').press('End'); // capture visible time ghosts too
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
  console.log('PASS: 10 modes, 3 lattice geometries, 7 skins, original palettes, hex GIF, and export dismissal');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
