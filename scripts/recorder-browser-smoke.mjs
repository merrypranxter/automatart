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
  // F4: print effects layer ON TOP of the skin, distinct modes, stacking,
  // mobile controls, recipe round-trip, and GIF export with color cycling.
  const artCanvas=page.locator('canvas[aria-label^="Interactive cellular"]');
  const basePrintImage=await artCanvas.evaluate(c=>c.toDataURL('image/png'));
  await page.locator('#print-master').check();
  const printResults=[];
  for(const id of ['posterize','halftone','solarize','xray','stipple','duotone']){
    for(const prev of ['posterize','halftone','solarize','xray','stipple','duotone']){
      if(prev!==id)await page.locator('#print-'+prev).uncheck().catch(()=>{});
    }
    await page.locator('#print-'+id).check();
    await page.waitForTimeout(75);
    printResults.push(await artCanvas.evaluate(c=>c.toDataURL('image/png')));
  }
  assert.equal(new Set(printResults).size,6,'Every print effect creates a different real rendering');
  assert(printResults.every(img=>img!==basePrintImage),'Print Shop changes pixels');
  await page.locator('#print-halftone').check();
  await page.getByRole('button',{name:'Move HALFTONE earlier'}).click();
  await page.locator('#print-halftone-size').fill('11');
  await page.locator('#print-mix').fill('0.75');
  assert(await page.locator('#print-surprise').isEnabled(),'Print surprise must be real');
  await page.locator('#print-surprise').click();
  await page.locator('#print-reset').click();
  assert.equal(await page.locator('#print-master').isChecked(),false,'Reset print disables stack');
  await page.getByRole('button',{name:'POP PRINT'}).click();
  assert(await page.locator('#print-master').isChecked(),'Preset enables Print Shop');
  assert(await page.locator('#print-posterize').isChecked());
  assert(await page.locator('#print-halftone').isChecked());
  // A saved JSON specimen preserves print stack without flattening its art.
  const [printRecipeFile]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const printRecipe=JSON.parse(await readFile(await printRecipeFile.path(),'utf8'));
  assert.equal(printRecipe.appearance.print.enabled,true,'Print Shop included in JSON recipe');
  assert(printRecipe.appearance.print.effects.some(e=>e.id==='halftone'&&e.enabled));
  await page.locator('#print-reset').click();
  await page.locator('input[type=file]').last().setInputFiles({
    name:'printshop-saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(printRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#print-master')?.checked===true);
  assert(await page.locator('#print-halftone').isChecked(),'Loaded recipe restores print layers');
  console.log('PASS: real browser six distinct print treatments, stacking controls and recipe round-trip');
  // F5 PNG snapshot: actual file bytes must match displayed dimensions,
  // and alternate aspect ratios must not restart the saved CA universe.
  const snapshotGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#snapshot-aspect').selectOption('portrait');
  await page.locator('#snapshot-size').selectOption('720');
  assert((await page.locator('.snapshot-dimensions').innerText()).includes('720 × 1,280'),
    '9:16 must preview exact 720x1280 output dimensions');
  const [snapshotDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE FULL-RES PNG'}).click()
  ]);
  const snapshotBytes=await readFile(await snapshotDownload.path());
  assert.equal(snapshotBytes.toString('ascii',1,4),'PNG','Real PNG file signature');
  assert.equal(snapshotBytes.readUInt32BE(16),720);
  assert.equal(snapshotBytes.readUInt32BE(20),1280);
  assert((await snapshotDownload.suggestedFilename()).includes('720x1280'),
    'Filename includes actual exported pixel dimensions');
  assert(await page.locator('.snapshot-ready').isVisible(),'PNG prepared for iPhone Share sheet');
  assert(await page.locator('.snapshot-ready button').first().isEnabled());
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),
    snapshotGen,'PNG must NOT advance world');
  await page.getByRole('button',{name:'Dismiss PNG ready panel'}).click();
  assert.equal(await page.locator('.snapshot-ready').count(),0);
  await page.locator('#snapshot-aspect').selectOption('landscape');
  assert((await page.locator('.snapshot-dimensions').innerText()).includes('1,280 × 720'));
  await page.locator('#snapshot-aspect').selectOption('square');
  assert((await page.locator('.snapshot-dimensions').innerText()).includes('720 × 720'));
  await page.locator('#snapshot-aspect').selectOption('current');
  assert(await page.locator('.snapshot-dimensions').isVisible());
  // Legacy recipes (settings + appearance only) retain default OFF Print
  // Shop, do not require a saved world, and show an accurate migration note.
  const oldRecipe=structuredClone(printRecipe);
  delete oldRecipe.world;
  delete oldRecipe.alien;
  delete oldRecipe.appearance.print;
  delete oldRecipe.appearance.paletteMotion;
  await page.locator('input[type=file]').last().setInputFiles({
    name:'old-automatart-recipe.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(oldRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#print-master')?.checked===false);
  assert(await page.locator('.status-msg').innerText().then(t=>t.includes('Legacy recipe loaded')),
    'Old settings-only recipe still imports with explicit legacy feedback');
  assert.equal(await page.locator('#print-master').isChecked(),false,
    'Old recipe never unexpectedly enables Print Shop');
  // Bad snapshots must be rejected without overwriting current saved cells.
  const badRecipe=structuredClone(printRecipe);
  badRecipe.world.arrays.cells='AQ==';
  const preBadGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('input[type=file]').last().setInputFiles({
    name:'corrupted-world.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(badRecipe))
  });
  await page.waitForFunction(()=>(document.querySelector('.status-msg')?.textContent||'').includes('Could not load recipe'));
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),preBadGen,
    'Corrupt recipe does not change current universe');
  // Restore F4 print recipe so recorder still verifies post-processing parity.
  await page.locator('input[type=file]').last().setInputFiles({
    name:'restored-f4-printshop.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(printRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#print-master')?.checked===true);
  console.log('PASS: browser F5 true PNG 9:16 pixels, iPhone share panel, legacy migration, corrupt-file rejection');


  // A1: ten new mathematically distinct visual signals. Test the actual
  // Color Lab dropdown, signal-specific controls, recipe persistence and
  // renderer output across mobile Chromium. The following GIF then encodes
  // the generation-dependent interference signal through the real worker.
  await page.locator('#skin').selectOption('pixels');
  await page.locator('#print-master').uncheck();
  const artA1=page.locator('canvas[aria-label^="Interactive cellular"]');
  const signalFrames=[];
  for(const id of ['entropy','boundaries','diversity','flow','birthFlash','deathHeat',
    'generationWave','angular','diagonal','gradient']){
    await page.locator('#source').selectOption(id);
    assert(await page.locator('.color-signal-lab').isVisible(),id+' inspector available');
    const png=await artA1.evaluate(c=>c.toDataURL('image/png'));
    signalFrames.push(png);
  }
  assert(new Set(signalFrames).size>=8,
    'At least eight A1 signals should differ on a paused specimen; empty histories may coincide');
  // Birth/death signals can correctly be flat before those events occur.
  // The Node regression creates active events and separately verifies that
  // all ten mathematical mappings can produce distinct output.
  await page.locator('#source').selectOption('angular');
  assert(await page.locator('#signal-center-x').isVisible(),'Angular center is adjustable');
  await page.locator('#signal-center-x').fill('0.22');
  await page.locator('#signal-center-y').fill('0.8');
  await page.locator('#source').selectOption('birthFlash');
  assert(await page.locator('#signal-history').isVisible(),'History threshold is adjustable');
  await page.locator('#source').selectOption('generationWave');
  assert(await page.locator('#signal-frequency').isVisible(),'Interference frequency is adjustable');
  await page.locator('#signal-frequency').fill('7');
  await page.locator('#signal-phase').fill('1.2');
  await artA1.click({position:{x:45,y:45}});
  assert((await page.locator('.color-signal-readout').innerText()).includes('SIGNAL'),
    'Tap on live canvas exposes real numerical math signal');
  const [signalRecipeDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const signalRecipe=JSON.parse(await readFile(await signalRecipeDownload.path(),'utf8'));
  assert.equal(signalRecipe.appearance.colorBy,'generationWave');
  assert.equal(signalRecipe.appearance.signalFrequency,7);
  await page.locator('#source').selectOption('state');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'a1-color-signals.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(signalRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#source')?.value==='generationWave');
  assert.equal(await page.locator('#signal-frequency').inputValue(),'7');
  await page.locator('#print-master').check();
  console.log('PASS: ten live Color Lab signals, signal sliders/inspector and A1 recipe roundtrip');
  // A2 dual source color mapping: endpoint fidelity and composite output.
  // The Math Lab stays paused so color comparison is exact.
  await page.locator('#print-master').uncheck();
  await page.locator('#skin').selectOption('pixels');
  await page.locator('#source').selectOption('age');
  const soloAge=await artA1.evaluate(c=>c.toDataURL('image/png'));
  await page.locator('#source').selectOption('entropy');
  const soloEntropy=await artA1.evaluate(c=>c.toDataURL('image/png'));
  await page.locator('#source').selectOption('age');
  await page.locator('#dual-enabled').check();
  await page.locator('#dual-source-a').selectOption('age');
  await page.locator('#dual-source-b').selectOption('entropy');
  await page.locator('#dual-blend').fill('0');
  assert.equal(await artA1.evaluate(c=>c.toDataURL('image/png')),soloAge,
    'A2 blend=0 must render exactly the unchanged standalone A image');
  await page.locator('#dual-blend').fill('1');
  assert.equal(await artA1.evaluate(c=>c.toDataURL('image/png')),soloEntropy,
    'A2 blend=1 must render exactly the unchanged standalone B image');
  await page.locator('#dual-blend').fill('0.5');
  const mixedDual=await artA1.evaluate(c=>c.toDataURL('image/png'));
  assert.notEqual(mixedDual,soloAge,'A2 mixture must differ from A-only');
  assert.notEqual(mixedDual,soloEntropy,'A2 mixture must differ from B-only');
  await page.locator('#dual-invert-a').check();
  assert.notEqual(await artA1.evaluate(c=>c.toDataURL('image/png')),mixedDual,
    'A2 independent invert A changes visible colors');
  await page.locator('#dual-invert-a').uncheck();
  await page.locator('#dual-offset-b').fill('3');
  await page.locator('#dual-strength-a').fill('1.5');
  assert.notEqual(await artA1.evaluate(c=>c.toDataURL('image/png')),mixedDual,
    'Per-source palette offset and scale affect the rendering');
  const beforeSwapA=await page.locator('#dual-source-a').inputValue();
  const beforeSwapB=await page.locator('#dual-source-b').inputValue();
  await page.locator('#dual-swap').click();
  assert.equal(await page.locator('#dual-source-a').inputValue(),beforeSwapB);
  assert.equal(await page.locator('#dual-source-b').inputValue(),beforeSwapA);
  await artA1.click({position:{x:40,y:40}});
  assert((await page.locator('.dual-math-inspector').innerText()).includes('BLENDED RGB'),
    'Real tapped-cell dual inspector reports both signals and final RGB');
  const [dualRecipeDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const dualRecipe=JSON.parse(await readFile(await dualRecipeDownload.path(),'utf8'));
  assert.equal(dualRecipe.appearance.dualColor.enabled,true);
  assert.equal(dualRecipe.appearance.dualColor.sourceA,beforeSwapB);
  await page.locator('#dual-reset').click();
  assert.equal(await page.locator('#dual-enabled').isChecked(),false,'Dual reset disables the patchbay');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'a2-dual-mapping.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(dualRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#dual-enabled')?.checked===true);
  assert.equal(await page.locator('#dual-source-a').inputValue(),beforeSwapB,
    'Loaded recipe recovers channel A source');
  assert.equal(await page.locator('#dual-offset-b').inputValue(),
    String(dualRecipe.appearance.dualColor.offsetB),'Loaded recipe recovers B offset');
  await page.locator('#dual-blend').fill('0.5');
  await page.locator('#print-master').check();
  console.log('PASS: A2 dual RGB endpoints, invert/scale/offset, swap, live inspector and recipe roundtrip');

  await page.locator('#skin').selectOption('mercury');
  assert(await page.locator('#skin-threshold').isVisible(),'Liquid density control appears');
  assert(await page.locator('#chrome-strength').isVisible(),'Chrome reflection control appears');
  assert(await page.locator('#temporal-rgb').isVisible(),'RGB time ghost control appears');
  assert(await page.locator('#fossil-opacity').isVisible(),'Cell fossil control appears');
  await page.locator('#temporal-rgb').focus();
  await page.locator('#temporal-rgb').press('End');
  // Test GIF capture under the A1 interference source. Existing mercury
  // controls were exercised above, but pixels make the signal visibly direct.
  await page.locator('#skin').selectOption('pixels');
  await page.locator('#source').selectOption('generationWave');
  // Record with A2 still on: each GIF frame must contain the same two-source
  // mathematical composite as the live preview, plus cycling palettes.
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
  console.log('PASS: 10 engines, 3 lattices, 7 skins, 10 NEW color signals, local GIF palettes and export dismissal');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
