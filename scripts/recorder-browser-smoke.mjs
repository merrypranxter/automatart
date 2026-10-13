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
  // B1: real neighborhood count / stencils, not cosmetic overlays.
  await page.locator('#neighbor-shape').selectOption('square2');
  assert((await page.locator('.neighborhood-count').innerText()).includes('24'),
    'Radius-2 square has exactly 24 adjacent cells');
  await page.locator('#engine').selectOption('life');
  await page.locator('#life').selectOption('custom');
  assert.equal(await page.locator('.custom-rule-editor .rule-bits').first().locator('button').count(),25,
    'Birth/survival editor grows to B0..B24, not just B0..B8');
  await page.locator('.custom-rule-editor .rule-bits').first().locator('button').nth(10).click();
  assert.equal(await page.locator('.custom-rule-editor .rule-bits').first().locator('button').nth(10)
    .getAttribute('aria-pressed'),'true','B10 genuinely selectable');
  const b1Gen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#neighbor-shape').selectOption('diamond2');
  assert((await page.locator('.neighborhood-count').innerText()).includes('12'));
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b1Gen,
    'Changing a local neighborhood rule preserves the current universe');
  await page.locator('#neighbor-shape').selectOption('directional');
  await page.locator('.neighborhood-directions').getByRole('button',{name:'Neighborhood NW'}).click();
  assert((await page.locator('.neighborhood-count').innerText()).includes('7'),
    'Compass selection removes actual neighborhood contribution');
  const [b1File]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b1Json=JSON.parse(await readFile(await b1File.path(),'utf8'));
  assert.equal(b1Json.settings.neighborShape,'directional');
  assert.equal(b1Json.settings.neighborMask,254);
  assert(b1Json.settings.customBirth.includes(10),'B10 survives into saved JSON');
  await page.locator('#neighbor-shape').selectOption('moore');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'b1-directional.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(b1Json))
  });
  await page.waitForFunction(()=>document.querySelector('#neighbor-shape')?.value==='directional');
  assert((await page.locator('.neighborhood-count').innerText()).includes('7'));
  await page.locator('#neighbor-shape').selectOption('moore');
  console.log('PASS: B1 real browser 24/12 directional modes, B10 editor, no restart, and exact recipe mask round-trip');
  // B2: actual touch-editable 3x3/5x5 bitsets, transformations, legacy recipes.
  await page.locator('#neighbor-shape').selectOption('custom');
  const painter=page.locator('.stencil-grid');
  assert.equal(await painter.locator('button').count(),25,'B2 5x5 offers 25 visible positions');
  assert(await painter.getByRole('button',{name:'Center cell excluded'}).isDisabled());
  const stencilBefore=await page.locator('.neighborhood-count b').innerText();
  await painter.locator('[data-stencil-bit="2"]').click();
  assert.equal(Number(await page.locator('.neighborhood-count b').innerText()),
   Number(stencilBefore)+1,'Tapping actual radius-2 neighbor increases voter count');
  await page.getByRole('button',{name:'↻ ROTATE 90°'}).click();
  assert.equal(Number(await page.locator('.neighborhood-count b').innerText()),
   Number(stencilBefore)+1,'Rotation preserves exact voter count');
  await page.getByRole('button',{name:'3×3',exact:true}).click();
  assert.equal(await painter.locator('button').count(),9,'3x3 editor shrinks live graph');
  assert.equal(Number(await page.locator('.neighborhood-count b').innerText()),8,
   'Only eight neighboring cells remain in full 3x3 stencil');
  await page.getByRole('button',{name:'HOOK',exact:true}).click();
  const hookCount=Number(await page.locator('.neighborhood-count b').innerText());
  assert(hookCount>0&&hookCount<8,'Presets produce real nonempty irregular graphs');
  await page.getByRole('button',{name:'⇄ MIRROR'}).click();
  await page.getByRole('button',{name:'⚄ SEEDED SURPRISE'}).click();
  const stencilGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  const [b2Download]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b2Json=JSON.parse(await readFile(await b2Download.path(),'utf8'));
  assert.equal(b2Json.settings.neighborShape,'custom');
  assert.equal(b2Json.settings.customStencilSize,3);
  assert(Number.isInteger(b2Json.settings.customStencilMask),'25-bit mask saved in recipe');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),stencilGen,
   'Stencil painting preserves current generation');
  await page.locator('#neighbor-shape').selectOption('moore');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b2-custom.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(b2Json))
  });
  await page.waitForFunction(()=>document.querySelector('#neighbor-shape')?.value==='custom');
  assert.equal(await painter.locator('button').count(),9);
  const [b2Roundtrip]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b2Reload=JSON.parse(await readFile(await b2Roundtrip.path(),'utf8'));
  assert.equal(b2Reload.settings.customStencilMask,b2Json.settings.customStencilMask,
   'B2 saved stencil mask roundtrips exactly');
  const invalidB2=structuredClone(b2Json);
  invalidB2.settings.customStencilMask=1<<12; // center may never vote
  await page.locator('input[type=file]').last().setInputFiles({
   name:'bad-center.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalidB2))
  });
  await page.waitForFunction(()=>(document.querySelector('.status-msg')?.textContent||'').includes('Could not load recipe'));
  assert.equal(await page.locator('#neighbor-shape').inputValue(),'custom',
   'Invalid center-including mask must not clobber current universe');
  await page.locator('#lattice').selectOption('hex');
  assert.equal(await page.locator('.stencil-grid').count(),0,
   'Custom square neighborhood cannot silently run on hex graph');
  await page.locator('#lattice').selectOption('square');
  await page.locator('#neighbor-shape').selectOption('moore');
  console.log('PASS: B2 interactive 5x5/3x3 painting, transforms, save/load, invalid center and graph gating');
  // C1: Both new engines expose real states, exact snapshot data and compatible rules.
  await page.locator('#engine').selectOption('wireworld');
  assert(await page.locator('#wire-brush-2').isVisible(),'Wireworld head brush visible');
  await page.locator('#wire-brush-2').click();
  assert.equal(await page.locator('#wire-brush-2').getAttribute('aria-pressed'),'true');
  assert(await page.locator('#lattice').isDisabled(),'Wireworld is square-only');
  assert.equal(await page.locator('#neighbor-shape').count(),0,'Wireworld uses fixed Moore rules');
  await page.locator('#engine').selectOption('sandpile');
  assert(await page.locator('#sand-feed').isVisible(),'Sandpile feed visible');
  await page.locator('#sand-feed').fill('0');
  await page.locator('#sand-rounds').fill('4');
  await page.locator('#sand-brush').fill('24');
  await page.locator('#sand-source').selectOption('random');
  assert(await page.locator('.c1-grain-count').isVisible(),'Exact grain count displayed');
  const [c1File]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const c1Recipe=JSON.parse(await readFile(await c1File.path(),'utf8'));
  assert.equal(c1Recipe.settings.engine,'sandpile');
  assert.equal(c1Recipe.settings.sandFeed,0);
  assert.equal(c1Recipe.settings.sandBrush,24);
  assert(typeof c1Recipe.world.arrays.grains==='string','Full Uint32 grain snapshot included');
  await page.locator('#engine').selectOption('life');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'sandpile-integers.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(c1Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='sandpile');
  assert.equal(await page.locator('#sand-rounds').inputValue(),'4');
  const [c1Again]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const c1Roundtrip=JSON.parse(await readFile(await c1Again.path(),'utf8'));
  assert.equal(c1Roundtrip.world.arrays.grains,c1Recipe.world.arrays.grains,
   'Full grain-height bytes preserved through save/import/export');
  const broken=structuredClone(c1Recipe);broken.world.arrays.grains='AQ==';
  await page.locator('input[type=file]').last().setInputFiles({
   name:'bad-grain-data.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(broken))
  });
  await page.waitForFunction(()=>(document.querySelector('.status-msg')?.textContent||'').includes('Could not load recipe'));
  assert.equal(await page.locator('#engine').inputValue(),'sandpile','Invalid grain snapshot rejected');
  console.log('PASS: browser Wireworld brush, sandpile feed, exact Uint32 recipe and bad-file rejection');
  // C2: new mathematical engines, finger paints, rule parameters and
  // exact stochastic recipe replay without an unrecorded RNG cursor.
  await page.locator('#engine').selectOption('hodgepodge');
  assert(await page.locator('#hodge-k1').isVisible(),'Hodgepodge divisor K1 visible');
  assert(await page.locator('#hodge-k2').isVisible(),'Hodgepodge divisor K2 visible');
  assert(await page.locator('#lattice').isDisabled(),'Hodgepodge uses specified Moore square lattice');
  assert.equal(await page.locator('#neighbor-shape').count(),0);
  await page.locator('#hodge-growth').fill('20');
  await page.locator('#hodge-brush').fill('12');
  const [hodgeFile]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const hodgeJson=JSON.parse(await readFile(await hodgeFile.path(),'utf8'));
  assert.equal(hodgeJson.settings.engine,'hodgepodge');
  assert.equal(hodgeJson.settings.hodgeGrowth,20);
  assert.equal(hodgeJson.settings.hodgeBrush,12);
  await page.locator('#engine').selectOption('forestfire');
  assert(await page.locator('#forest-growth').isVisible());
  assert(await page.locator('#forest-lightning').isVisible());
  assert(await page.locator('#forest-brush-2').isVisible());
  await page.locator('#forest-growth').fill('87');
  await page.locator('#forest-lightning').fill('27');
  await page.locator('#forest-brush-1').click();
  assert.equal(await page.locator('#forest-brush-1').getAttribute('aria-pressed'),'true');
  const [forestFile]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const forestJson=JSON.parse(await readFile(await forestFile.path(),'utf8'));
  assert.equal(forestJson.settings.forestGrowth,.087);
  assert.equal(forestJson.settings.forestLightning,.0027);
  assert.equal(forestJson.settings.forestBrush,1);
  assert.equal(forestJson.world.engine,'forestfire');
  const savedCells=forestJson.world.arrays.cells,savedGeneration=forestJson.world.generation;
  await page.locator('#engine').selectOption('life');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'c2-forest.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(forestJson))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='forestfire');
  assert.equal(await page.locator('#forest-lightning').inputValue(),'27');
  const [forestRoundtrip]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const forestReload=JSON.parse(await readFile(await forestRoundtrip.path(),'utf8'));
  assert.equal(forestReload.world.arrays.cells,savedCells);
  assert.equal(forestReload.world.generation,savedGeneration);
  const bogus=structuredClone(forestJson);
  const invalid=Buffer.from(bogus.world.arrays.cells,'base64');invalid[3]=9;
  bogus.world.arrays.cells=invalid.toString('base64');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'c2-invalid-forest.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(bogus))
  });
  await page.waitForFunction(()=>(document.querySelector('.status-msg')?.textContent||'').includes('Could not load recipe'));
  assert.equal(await page.locator('#engine').inputValue(),'forestfire','Invalid forest snapshot rejected');
  await page.locator('#engine').selectOption('life');
  console.log('PASS: C2 real Hodgepodge sliders, seeded fire climate, exact recipe replay and corrupt-state rejection');
  // C3: physical Ising spins, Turmite heading agents and saved custom L/R rules.
  await page.locator('#engine').selectOption('ising');
  assert(await page.locator('#ising-temp').isVisible(),'Ising temperature slider exists');
  assert(await page.locator('#lattice').isDisabled(),'Ising requires square grid');
  await page.locator('#ising-temp').fill('110');
  await page.locator('#ising-coupling').fill('-100');
  await page.locator('#ising-field').fill('35');
  await page.locator('#ising-brush-down').click();
  assert.equal(await page.locator('#ising-brush-down').getAttribute('aria-pressed'),'true');
  const [isingFile]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const isingJson=JSON.parse(await readFile(await isingFile.path(),'utf8'));
  assert.equal(isingJson.settings.isingTemperature,1.1);
  assert.equal(isingJson.settings.isingCoupling,-1);
  assert.equal(isingJson.settings.isingField,.35);
  assert.equal(isingJson.settings.isingBrush,0);
  await page.locator('#engine').selectOption('turmites');
  assert(await page.locator('#turmite-count').isVisible(),'Turmite population setting exists');
  assert(await page.locator('#density').isDisabled(),'No destructive dummy density knob for Turmites');
  assert(await page.locator('#seed-pattern').isDisabled(),'No destructive dummy pattern knob for Turmites');
  await page.locator('#turmite-count').fill('3');
  await page.locator('#turmite-rule').fill('RLLR');
  await page.getByRole('button',{name:'USE RULE'}).click();
  await page.locator('#turmite-brush').fill('2');
  const [turmiteFile]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const turmiteJson=JSON.parse(await readFile(await turmiteFile.path(),'utf8'));
  assert.equal(turmiteJson.settings.engine,'turmites');
  assert.equal(turmiteJson.settings.turmiteRule,'RLLR');
  assert.equal(turmiteJson.settings.turmiteCount,3);
  assert.equal(turmiteJson.settings.turmiteBrush,2);
  assert.equal(turmiteJson.world.turmiteAgents.length,3);
  const initialAgents=turmiteJson.world.turmiteAgents;
  // Remain on the Turmite page while changing the committed rule. Reloading
  // a recipe must synchronize the editable turn sequence without remounting.
  await page.getByRole('button',{name:"LANGTON'S ANT"}).click();
  assert.equal(await page.locator('#turmite-rule').inputValue(),'RL');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'c3-turmites.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(turmiteJson))
  });
  await page.waitForFunction(()=>document.querySelector('#turmite-rule')?.value==='RLLR');
  assert.equal(await page.locator('#turmite-rule').inputValue(),'RLLR',
    'Rule editor syncs the committed turning sequence after same-engine recipe restore');
  const [agentRoundtrip]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const loadedAgents=JSON.parse(await readFile(await agentRoundtrip.path(),'utf8'));
  assert.deepEqual(loadedAgents.world.turmiteAgents,initialAgents,
   'All agent coordinates and headings survive import/export');
  const corrupt=structuredClone(turmiteJson);corrupt.world.turmiteAgents[0].x=99999;
  await page.locator('input[type=file]').last().setInputFiles({
   name:'invalid-agent.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(corrupt))
  });
  await page.waitForFunction(()=>(document.querySelector('.status-msg')?.textContent||'').includes('Could not load recipe'));
  assert.equal(await page.locator('#engine').inputValue(),'turmites',
   'Invalid agents do not corrupt live world');
  // Actual animated-GIF regression: ant marker at its saved location survives
  // canvas rendering, palette quantization and the real browser GIF Worker.
  await page.locator('#turmite-count').fill('1');
  await page.locator('#resolution').fill('32');
  await page.locator('#skin').selectOption('pixels');
  await page.locator('#source').selectOption('state');
  if(await page.locator('#print-master').isChecked())
   await page.locator('#print-master').uncheck();
  if(await page.locator('#dual-enabled').isChecked())
   await page.locator('#dual-enabled').uncheck();
  const [antRecipe]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const antData=JSON.parse(await readFile(await antRecipe.path(),'utf8'));
  const antPos=antData.world.turmiteAgents[0];
  const antW=antData.world.width,antH=antData.world.height;
  await page.locator('#duration-preset').selectOption('custom');
  await page.locator('#custom-seconds').fill('1');
  await page.locator('#export-fps').selectOption('10');
  await page.locator('.record-button').click();
  await page.locator('.stage-capture-success').waitFor({state:'visible',timeout:60000});
  const antGifBase64=await page.evaluate(async()=>{
   const img=document.querySelector('.export-preview img');
   if(!img?.src)throw Error('Missing Turmite GIF export preview');
   const bytes=new Uint8Array(await (await fetch(img.src)).arrayBuffer());
   let binary='';for(let i=0;i<bytes.length;i+=8192)
    binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return btoa(binary);
  });
  const {parseGIF,decompressFrames}=await import('gifuct-js');
  const parsedAnt=parseGIF(Buffer.from(antGifBase64,'base64'));
  const antFrames=decompressFrames(parsedAnt,true);
  assert(antFrames.length>=2,'Real Turmite GIF has multiple animation frames');
  const firstAnt=antFrames[0],fw=parsedAnt.lsd.width,fh=parsedAnt.lsd.height;
  // Offset diagonally from the heading stroke while remaining inside
  // the yellow agent disk (the center line itself is dark).
  const xx=Math.floor((antPos.x+.68)/antW*fw)-firstAnt.dims.left;
  const yy=Math.floor((antPos.y+.68)/antH*fh)-firstAnt.dims.top;
  assert(xx>=0&&yy>=0&&xx<firstAnt.dims.width&&yy<firstAnt.dims.height);
  const k=(yy*firstAnt.dims.width+xx)*4,rgba=firstAnt.patch.slice(k,k+4);
  assert(rgba[0]>160&&rgba[1]>160,
   'Encoded Turmite GIF actually retains a bright yellow agent at its saved grid coordinate: '+rgba.join(','));
  await page.locator('.stage-capture-success .dismiss-export').click();
  console.log('PASS: C3 real animated GIF encodes a visible ant marker at its saved coordinate');
  await page.locator('#engine').selectOption('life');
  console.log('PASS: C3 actual Ising and Turmite controls, L/R rules, agent snapshot and invalid load');
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
  // B1's preceding live rule/recipe tests may leave a sparse or quiescent
  // specimen. Use a reproducibly colorful CYCLIC simulation for the
  // export-specific palette regression; keep Dual A/B mapping enabled.
  await page.locator('#engine').selectOption('cyclic');
  await page.locator('#seed-pattern').selectOption('noise');
  await page.locator('#density').fill('72');
  await page.locator('#threshold').fill('1');
  await page.locator('#palette').selectOption('OPAL PRISM');
  await page.locator('#print-master').uncheck();
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
