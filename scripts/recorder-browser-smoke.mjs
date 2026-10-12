// Exercise the real Vite production UI and bundled GIF Worker in Chromium.
// This catches regressions that the Node GIF encoder smoke test cannot see.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
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
  // Funhouse F1 regression: precise stepping, authentic B/S roulette, and two
  // unmistakably different random color buttons.
  await page.locator('.transport .primary').click(); // pause first
  await page.waitForTimeout(100);
  // F2: Mutation Dice must operate on the live world without restarting it,
  // preserve protectable palette/rules, and exactly undo the prior pixels.
  const mutateStart=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  const pixelBefore=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  const engineBefore=await page.locator('#engine').inputValue();
  await page.locator('#mutation-strength').selectOption('wtf');
  await page.locator('#mutation-throw').click();
  assert(await page.locator('.mutation-result').isVisible(),'Mutation result includes actual changed knobs');
  assert.equal(await page.locator('#engine').inputValue(),engineBefore,'Engine locked by default');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),mutateStart,
    'Default mutation does not reset or advance current world');
  assert(await page.locator('#mutation-undo').isEnabled(),'Undo becomes available after mutation');
  await page.locator('#mutation-undo').click();
  await page.waitForTimeout(100);
  const pixelRestored=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  assert.equal(pixelRestored,pixelBefore,'Undo restores exact previous rendered universe');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),mutateStart);
  const originalSwatches=await page.locator('.color-wells input[type=color]').evaluateAll(els=>els.map(e=>e.value));
  await page.getByRole('checkbox',{name:'Lock COLOR PALETTE'}).check();
  await page.getByRole('checkbox',{name:'Lock MATH / RULES'}).check();
  await page.locator('#mutation-throw').click();
  assert.deepEqual(await page.locator('.color-wells input[type=color]').evaluateAll(els=>els.map(e=>e.value)),
    originalSwatches,'Lock palette protects every RGB swatch');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),mutateStart);
  await page.locator('#mutation-undo').click();
  await page.getByRole('checkbox',{name:'Lock COLOR PALETTE'}).uncheck();
  await page.getByRole('checkbox',{name:'Lock MATH / RULES'}).uncheck();
  assert(await page.getByRole('checkbox',{name:'Allow mutations to restart the universe'}).isVisible());
  const startGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('.funhouse-time-controls button').nth(0).click(); // STEP +10
  await page.waitForFunction(start=>Number(document.querySelector('.readouts b')?.textContent?.replaceAll(',',''))===start+10,startGen);
  await page.locator('.funhouse-time-controls button').nth(1).click(); // STEP +100
  await page.waitForFunction(start=>Number(document.querySelector('.readouts b')?.textContent?.replaceAll(',',''))===start+110,startGen);
  assert.equal(await page.locator('.funhouse-time-controls span').count(),0,'Fast forward finishes and clears progress');
  await page.locator('#engine').selectOption('life');
  for(const name of ['maze','mazectric','replicator','diamoeba','coral','amoeba']){
    await page.locator('#life').selectOption(name);
    assert.equal(await page.locator('#life').inputValue(),name,'Named rule '+name+' selectable');
  }
  // F3 integration: genuine square-grid mirror stamps, preview ghost,
  // exact active-cell state recipe snapshot, and backward-compatible loading.
  await page.locator('#life').selectOption('conway');
  await page.locator('#seed-pattern').selectOption('center');
  await page.locator('#density').fill('1');
  await page.locator('#alien-symmetry').selectOption('mirror');
  await page.locator('#alien-stamp').selectOption('glider');
  assert.equal(await page.locator('#alien-stamp').inputValue(),'glider','Conway glider is available for compatible rules');
  await page.locator('#alien-density').fill('100');
  const art=page.locator('canvas[aria-label^="Interactive cellular"]');
  const rect=await art.boundingBox();
  assert(rect&&rect.width>0&&rect.height>0,'Interactive art canvas is visible');
  const position={x:rect.width*.27,y:rect.height*.37};
  await art.hover({position});
  const previewPixels=await page.locator('canvas.alien-brush-preview').evaluate(c=>{
    const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let visible=0;for(let i=3;i<p.length;i+=4)if(p[i]>0)visible++;
    return visible;
  });
  assert(previewPixels>0,'The actual stamped/mirrored cells get a hover preview');
  const beforeStamp=await art.evaluate(c=>c.toDataURL());
  await art.click({position});
  const afterStamp=await art.evaluate(c=>c.toDataURL());
  assert.notEqual(afterStamp,beforeStamp,'Stamp changes real mathematical cell pixels');
  const stampGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  const [savedRecipe]=await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const json=await readFile(await savedRecipe.path(),'utf8');
  const recipe=JSON.parse(json);
  assert.equal(recipe.world.kind,'automatart-world-v1','Recipe includes exact cell snapshot');
  assert.equal(recipe.alien.brush.stamp,'glider','Recipe remembers stamp');
  assert(recipe.alien.recentStrokes.length>=1,'Recipe saves seeded stroke history');
  assert.equal(recipe.world.generation,stampGen);
  await page.locator('.transport .surprise').click();
  await page.locator('input[type=file]').last().setInputFiles({
    name:'restored-alien-recipe.json',mimeType:'application/json',buffer:Buffer.from(json)
  });
  await page.waitForFunction(target=>
    document.querySelector('.readouts b')?.textContent?.replaceAll(',','')===String(target),stampGen);
  assert.equal(await page.locator('#alien-stamp').inputValue(),'glider','Alien stamp settings restored');
  assert.equal(await art.evaluate(c=>c.toDataURL()),afterStamp,'Loaded recipe reproduces the exact painted universe');
  // Resume normal live state for all existing capture and skin tests below.
  await page.locator('.transport .primary').click();
  await page.locator('#palette').selectOption('OPAL PRISM');
  assert.equal(await page.locator('.color-wells input[type=color]').count(),12);
  await page.locator('#random-preset').click();
  assert.notEqual(await page.locator('#palette').inputValue(),'CUSTOM','Random Palette picks a named preset');
  await page.locator('#palette').selectOption('OPAL PRISM');
  const beforeColors=await page.locator('.color-wells input[type=color]').evaluateAll(els=>els.map(e=>e.value));
  await page.locator('#random-colors').click();
  const newColors=await page.locator('.color-wells input[type=color]').evaluateAll(els=>els.map(e=>e.value));
  assert.equal(newColors.length,12,'New RGB palette keeps twelve editable swatches');
  assert(newColors.every(c=>/^#[0-9a-f]{6}$/i.test(c)));
  assert.notDeepEqual(newColors,beforeColors,'Random Colors creates a genuinely new palette');
  assert.equal(await page.locator('#palette').inputValue(),'CUSTOM','New colors are not a named preset');
  await page.locator('.color-wells input[type=color]').first().fill('#12fabc');
  assert.equal(await page.locator('.color-wells input[type=color]').first().inputValue(),'#12fabc','Every invented swatch remains editable');
  await page.getByRole('button',{name:'ROTATE STOPS'}).click();
  await page.getByRole('button',{name:'REVERSE STOPS'}).click();
  await page.getByRole('button',{name:'SHUFFLE STOPS'}).click();
  await page.locator('#palette-motion').selectOption('pingpong');
  assert.equal(await page.locator('#palette-motion').inputValue(),'pingpong');
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
    lattices.push(await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL('image/png')));
  }
  assert.equal(new Set(lattices).size,3,'Actual lattice display geometries must differ');
  await page.locator('#lattice').selectOption('hex'); // GIF must retain actual hex geometry
  const skinImages=[];
  for(const skin of ['pixels','soft','glow','contours','mercury','relief','glass']){
    await page.locator('#skin').selectOption(skin);
    await page.waitForTimeout(60);
    skinImages.push(await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL('image/png')));
  }
  assert.equal(new Set(skinImages).size,7,'Every visual skin must look different in the actual canvas');
  await page.locator('#skin').selectOption('mercury');
  assert(await page.locator('#skin-threshold').isVisible(),'Liquid density control appears');
  assert(await page.locator('#chrome-strength').isVisible(),'Chrome reflection control appears');
  assert(await page.locator('#temporal-rgb').isVisible(),'RGB time ghost control appears');
  assert(await page.locator('#fossil-opacity').isVisible(),'Cell fossil control appears');
  await page.locator('#temporal-rgb').focus();
  await page.locator('#temporal-rgb').press('End'); // capture visible time ghosts too
  await page.locator('#palette-cycle').focus();
  await page.locator('#palette-cycle').press('End'); // ensure GIF frames require NEW colors
  await page.locator('#duration-preset').selectOption('custom');
  await page.locator('#custom-seconds').fill('1');
  await page.locator('#export-fps').selectOption('10'); // exercise compressed-byte sampling at frame 6
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
    let cursor=13, count=0, localTables=0;
    const localPalettes=[];
    const flags=bytes[10];
    if(flags&0x80)cursor+=3*(1<<((flags&7)+1));
    const skip=()=>{while(cursor<bytes.length){const length=bytes[cursor++];if(!length)break;cursor+=length;}};
    while(cursor<bytes.length){
      const marker=bytes[cursor++];
      if(marker===0x3b)break;
      if(marker===0x21){cursor++;skip();continue;}
      if(marker===0x2c){
        const packed=bytes[cursor+8];cursor+=9;
        if(packed&0x80){
          const length=3*(1<<((packed&7)+1));
          localTables++;
          localPalettes.push(Array.from(bytes.subarray(cursor,cursor+length)).join(','));
          cursor+=length;
        }
        cursor++;skip();count++;continue;
      }
      break;
    }
    return {workers:window.__gifWorkersCreated,header,frames:count,size:bytes.length,
      localTables,uniquePalettes:new Set(localPalettes).size,exportStatus,frameDetail};
  });
  assert(!result.error,result.error||'');
  assert(result.workers>=2,'Cancelled long export and finished short export must each create a real Web Worker');
  assert.equal(result.header,'GIF89a','Should produce GIF content');
  assert.equal(result.frames,10,'Should encode ten frames and exercise real byte-size monitoring');
  assert.equal(result.localTables,9,'Every later frame must have its own local palette');
  assert(result.uniquePalettes>=2,'Color cycling MUST produce distinct per-frame GIF palettes');
  assert(result.frameDetail.includes('changing steps'),'UI should explain whether cells changed');
  assert(result.size>1000,'GIF must be nonempty');
  console.log('PASS: REAL BROWSER GIF worker='+result.workers+' frames='+result.frames+' bytes='+result.size+
    ' changing GIF palettes='+result.uniquePalettes);
  await page.locator('.stage-capture-success .dismiss-export').click();
  assert.equal(await page.locator('.stage-capture-success').count(),0,'X dismisses sticky export banner');
  assert.equal(await page.locator('.finished-export').count(),0,'X also removes finished preview from controls');
  console.log('PASS: 10 modes, 3 lattice geometries, 7 skins, original palettes, hex GIF, and export dismissal');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
