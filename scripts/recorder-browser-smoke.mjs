// Exercise the real Vite production UI and bundled GIF Worker in Chromium.
// This catches regressions that the Node GIF encoder smoke test cannot see.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {withAutoTabs,openTab} from './ui-tabs.mjs';

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
  // Controls live in studio-shell tabs; locators open the owning tab first.
  const page=withAutoTabs(await browser.newPage({viewport:{width:390,height:844}}));
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
  // Studio shell: stage always on screen, one tab rail, one visible panel,
  // and nothing wider than a phone.
  const tabIds=['world','rules','paint','mutate','color','patch','skin','print','export'];
  assert.equal(await page.locator('[role="tab"]').count(),tabIds.length,'One tab per control section');
  for(const id of tabIds){
    await openTab(page,id);
    assert.equal(await page.locator('[role="tabpanel"]:not([hidden])').count(),1,'Exactly one panel visible: '+id);
    assert(await page.locator('#panel-'+id).isVisible(),id+' panel visible when its tab is selected');
    assert(await page.locator('canvas[aria-label^="Interactive cellular"]').isVisible(),'Stage stays visible on '+id);
    assert(await page.locator('.transport .primary').isVisible(),'Transport stays visible on '+id);
    assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'No horizontal page scroll on '+id);
  }
  await page.locator('#tab-export').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#tab-world').getAttribute('aria-selected'),'true','Home jumps to first tab');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tab-rules').getAttribute('aria-selected'),'true','Arrow keys move between tabs');
  await openTab(page,'world');
  await page.locator('.export-button').click();
  assert.equal(await page.locator('#tab-export').getAttribute('aria-selected'),'true','Top-bar EXPORT opens the export panel');
  assert(await page.locator('#engine').isVisible(),'Species picker lives in the always-visible top bar');
  console.log('PASS: studio shell tabs, keyboard navigation, persistent stage and phone-width layout');
  // Dynamics P1: actual evolution instead of coarse ineffective sliders.
  await page.locator('.transport .primary').click(); // pause before comparing generations
  await page.waitForTimeout(100);
  assert(await page.locator('#cyclic-reach').isVisible(),'Real chase-field control is available');
  const cyclicGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#cyclic-reach').fill('3');
  await page.locator('#cyclic-drive').fill('25');
  await page.locator('#threshold').fill('2');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),cyclicGen,
   'Changing chase dynamics does not reset the running cells');
  const [cyclicFile]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const tunedCyclic=JSON.parse(await readFile(await cyclicFile.path(),'utf8'));
  assert.equal(tunedCyclic.settings.cyclicReach,3);
  assert.equal(tunedCyclic.settings.cyclicDrive,.0025);
  assert.equal(tunedCyclic.settings.cyclicThreshold,2);
  await page.getByRole('button',{name:'CLASSIC · PURE CA'}).click();
  assert.equal(await page.locator('#cyclic-drive').inputValue(),'0');
  await page.locator('#engine').selectOption('life');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'cyclic-dynamics-p1.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(tunedCyclic))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='cyclic');
  assert.equal(await page.locator('#cyclic-reach').inputValue(),'3');
  assert.equal(await page.locator('#cyclic-drive').inputValue(),'25');
  const legacy=structuredClone(tunedCyclic);
  delete legacy.settings.cyclicReach;delete legacy.settings.cyclicDrive;
  await page.locator('input[type=file]').last().setInputFiles({
    name:'cyclic-legacy-recipe.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(legacy))
  });
  await page.waitForFunction(()=>document.querySelector('#cyclic-reach')?.value==='1');
  assert.equal(await page.locator('#cyclic-drive').inputValue(),'0');
  const oversized=structuredClone(tunedCyclic);
  oversized.settings.cyclicReach=99;
  await page.locator('input[type=file]').last().setInputFiles({
    name:'cyclic-out-of-range-recipe.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(oversized))
  });
  await page.waitForFunction(()=>document.querySelector('#cyclic-reach')?.value==='6');
  const [clamped]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const validated=JSON.parse(await readFile(await clamped.path(),'utf8'));
  assert.equal(validated.settings.cyclicReach,6,'Saved rule exactly matches the visible maximum');
  console.log('PASS: Dynamics P1 live knobs, seeded drive, exact JSON roundtrip and classic migration');
  // Dynamics A1: labels and the reset itself must be unmistakable.
  await openTab(page,'rules');
  assert(await page.locator('#cyclic-world-filament-engine').isVisible(),
    'Calibrated Cyclic worlds accessible from studio RULES');
  await page.locator('#cyclic-world-slow-spores').click();
  await page.waitForFunction(()=>document.querySelector('#states')?.value==='12');
  assert.equal(await page.locator('#density').inputValue(),'20');
  assert.equal(await page.locator('#threshold').inputValue(),'2');
  assert.equal(await page.locator('#cyclic-reach').inputValue(),'1');
  assert.equal(await page.locator('#cyclic-drive').inputValue(),'0');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),0,
   'Structural world presets deliberately restart the simulation');
  await page.locator('#cyclic-world-filament-engine').click();
  await page.waitForFunction(()=>document.querySelector('#states')?.value==='16');
  assert.equal(await page.locator('#density').inputValue(),'36');
  assert.equal(await page.locator('#threshold').inputValue(),'2');
  await page.getByRole('button',{name:'STEP +1'}).click();
  await page.waitForFunction(()=>Number((document.querySelector('.readouts b')?.textContent||'0').replaceAll(',',''))===1);
  assert(await page.getByText('NEIGHBOR RELATIONSHIPS CHANGED').isVisible(),
   'Real structural motion metric is visible, distinct from changes in cell phases');
  await page.locator('#cyclic-world-filament-engine').click();
  await page.waitForFunction(()=>Number((document.querySelector('.readouts b')?.textContent||'0').replaceAll(',',''))===0);
  await page.locator('#cyclic-world-seeded-bloom').click();
  await page.waitForFunction(()=>document.querySelector('#states')?.value==='12');
  assert.equal(await page.locator('#cyclic-drive').inputValue(),'5');
  const [a1File]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const a1Recipe=JSON.parse(await readFile(await a1File.path(),'utf8'));
  assert.equal(a1Recipe.settings.cyclicStates,12);
  assert.equal(a1Recipe.settings.cyclicThreshold,2);
  assert.equal(a1Recipe.settings.cyclicDrive,.0005);
  assert.equal(a1Recipe.settings.pattern,'noise');
  await page.locator('#engine').selectOption('life');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'a1-cyclic-tested-profile.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(a1Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='cyclic');
  assert.equal(await page.locator('#cyclic-drive').inputValue(),'5');
  await openTab(page,'world');
  console.log('PASS: A1 calibrated Cyclic pure/driven new worlds, explicit reset, structure meter and recipe roundtrip');
  // Dynamics B1: physical paired electrodes, 4/8/12/24 real graph controls,
  // alternate match rule, JSON roundtrip and legacy recipe compatibility.
  await page.locator('#engine').selectOption('brians');
  await openTab(page,'rules');
  assert(await page.locator('#brain-forecast').isVisible(),
    'Brian has a real birth forecast from canonical current cells');
  assert.equal(await page.locator('#brain-stimulus-off').getAttribute('aria-pressed'),'true');
  const brainGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#brain-neighbors-square2').click();
  await page.locator('#brain-birth-count').fill('3');
  await page.locator('#brain-match-at-least').click();
  await page.locator('#brain-stimulus-clock').click();
  await page.locator('#brain-clock-period').fill('11');
  await page.locator('#brain-source-ring').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),brainGen,
    'Live Brain parameters do not reset the universe');
  const [brainDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const brainRecipe=JSON.parse(await readFile(await brainDownload.path(),'utf8'));
  assert.equal(brainRecipe.settings.brainBirthCount,3);
  assert.equal(brainRecipe.settings.brainBirthMatch,'atLeast');
  assert.equal(brainRecipe.settings.brainStimulus,'clock');
  assert.equal(brainRecipe.settings.brainClockSource,'ring');
  assert.equal(brainRecipe.settings.brainClockPeriod,11);
  await page.locator('#brain-preset-classic').click();
  assert.equal(await page.locator('#brain-stimulus-off').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#brain-birth-count').inputValue(),'2');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'b1-electric-brain.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(brainRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#brain-clock-period')?.value==='11');
  assert.equal(await page.locator('#brain-match-at-least').getAttribute('aria-pressed'),'true');
  const legacyBrain=structuredClone(brainRecipe);
  for(const key of ['brainBirthCount','brainBirthMatch','brainStimulus',
    'brainClockSource','brainClockPeriod','brainSparkRate'])delete legacyBrain.settings[key];
  await page.locator('input[type=file]').last().setInputFiles({
    name:'b1-classic-legacy.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(legacyBrain))
  });
  await page.waitForFunction(()=>document.querySelector('#brain-stimulus-off')?.getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('#brain-birth-count').inputValue(),'2');
  await page.locator('#brain-preset-filament').click();
  assert.equal(await page.locator('#brain-stimulus-sparks').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#brain-spark-rate').inputValue(),'10');
  // Restore the original eight-neighbor Brain before later tests switch engines.
  // Otherwise the legacy Conway glider fixture inherits the 12-voter stencil
  // and quite correctly refuses an incompatible classic glider stamp.
  await page.locator('#brain-preset-classic').click();
  assert.equal(await page.locator('#brain-neighbors-moore').getAttribute('aria-pressed'),'true');
  console.log('PASS B1: Brian neighbors, real electrodes, live rule changes, recipe and pure legacy restore');

  // Dynamics A2: real opt-in forcing for Excitable and Afterlife, never
  // just a color shimmer; saved recipe reflects exact live math controls.
  await page.locator('#engine').selectOption('excitable');
  await openTab(page,'rules');
  assert(await page.locator('#wave-mode-off').isVisible(),'Excitable has a real wave lab');
  assert.equal(await page.locator('#wave-mode-off').getAttribute('aria-pressed'),'true');
  const eStart=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#wave-mode-clock').click();
  await page.locator('#wave-period').fill('7');
  await page.locator('#wave-source-quad').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),eStart,
    'External source parameters affect running cells without restarting');
  const [waveRecipeFile]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const waveRecipe=JSON.parse(await readFile(await waveRecipeFile.path(),'utf8'));
  assert.equal(waveRecipe.settings.waveStimulus,'clock');
  assert.equal(waveRecipe.settings.waveClockSource,'quad');
  assert.equal(waveRecipe.settings.waveClockPeriod,7);
  await page.locator('#engine').selectOption('generations');
  assert(await page.locator('#wave-mode-clock').isVisible(),'Afterlife shares honest source controls');
  await page.locator('#wave-preset-sparse-noise').click();
  assert.equal(await page.locator('#wave-spark-rate').inputValue(),'5');
  const [afterRecipeFile]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const afterRecipe=JSON.parse(await readFile(await afterRecipeFile.path(),'utf8'));
  assert.equal(afterRecipe.settings.engine,'generations');
  assert.equal(afterRecipe.settings.waveSparkRate,.0005);
  assert.equal(afterRecipe.settings.waveStimulus,'sparks');
  await page.locator('#engine').selectOption('life');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'a2-afterlife-sparks.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(afterRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='generations');
  assert.equal(await page.locator('#wave-spark-rate').inputValue(),'5');
  const legacyWave=structuredClone(waveRecipe);
  delete legacyWave.settings.waveStimulus;
  delete legacyWave.settings.waveSparkRate;
  delete legacyWave.settings.waveClockPeriod;
  delete legacyWave.settings.waveClockSource;
  await page.locator('input[type=file]').last().setInputFiles({
    name:'a2-pure-legacy.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(legacyWave))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='excitable');
  assert.equal(await page.locator('#wave-mode-off').getAttribute('aria-pressed'),'true',
    'Older recipes restore original autonomous dynamics, never opt into forced waves');
  await page.locator('#engine').selectOption('cyclic');
  await openTab(page,'world');
  console.log('PASS: A2 true wave modes, clock sources, live edits, seeded sparks and legacy recipe import');
  // B2: real 2x2 reversible block law selection, historical inverses, and recipes.
  await page.locator('#engine').selectOption('margolus');
  await openTab(page,'rules');
  assert(await page.locator('#margolus-a').isVisible(),'Reversible laws have full live controls');
  await page.locator('#margolus-preset-braid').click();
  assert.equal(await page.locator('#margolus-a').inputValue(),'braid');
  assert.equal(await page.locator('#margolus-b').inputValue(),'vortex');
  assert.equal(await page.locator('#margolus-period').inputValue(),'6');
  const b2Start=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.getByRole('button',{name:'STEP +1'}).click();
  await page.getByRole('button',{name:'STEP +1'}).click();
  await page.getByRole('button',{name:'STEP +1'}).click();
  const b2Three=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  assert.equal(b2Three,b2Start+3,'Three genuine forward block transitions');
  await page.locator('#margolus-a').selectOption('collision');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b2Three,
   'Live rule edits must NOT clear existing cells');
  await page.getByRole('button',{name:'STEP +1'}).click();
  await page.locator('#margolus-back-one').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b2Three,
   'Exact inverse walks back through a live law edit');
  await page.locator('#margolus-back-ten').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),0);
  await page.getByRole('button',{name:'STEP +1'}).click();
  const [margolusB2Download]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b2Recipe=JSON.parse(await readFile(await margolusB2Download.path(),'utf8'));
  assert.equal(b2Recipe.settings.margolusRuleA,'collision');
  assert.equal(b2Recipe.settings.margolusMode,'alternate');
  assert(b2Recipe.world.margolusEpochs.length>=1,'Saved world must include exact epoch records');
  await page.locator('#margolus-preset-original').click();
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b2-history-replay.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(b2Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#margolus-a')?.value==='collision');
  assert.equal(await page.locator('#margolus-mode-alternate').getAttribute('aria-pressed'),'true');
  const legacyB2=structuredClone(b2Recipe);
  for(const key of ['margolusRuleA','margolusRuleB','margolusMode','margolusPeriod'])
   delete legacyB2.settings[key];
  delete legacyB2.world.margolusEpochs;
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b2-old-classic.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(legacyB2))
  });
  await page.waitForFunction(()=>document.querySelector('#margolus-a')?.value==='cw');
  assert.equal(await page.locator('#margolus-mode-single').getAttribute('aria-pressed'),'true');
  await page.locator('#engine').selectOption('cyclic');
  await openTab(page,'world');
  console.log('PASS B2: reversible block presets, real backward stepping, live edits and historical recipe compatibility');

  // B3: actual conductor template placement, live mathematics, and JSON.
  await page.locator('#engine').selectOption('wireworld');
  await openTab(page,'rules');
  assert(await page.locator('#wire-template').isVisible(),'B3 circuit generator is mounted');
  assert.equal(await page.locator('#wire-drive-off').getAttribute('aria-pressed'),'true');
  await page.locator('#wire-template').selectOption('loop');
  await page.locator('#wire-template-radius').fill('8');
  await page.locator('#wire-template-rotation').selectOption('1');
  const wireStart=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#wire-stamp-center').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),wireStart,
   'True circuit stamping does not restart the universe');
  assert(await page.getByText('Placed loop').isVisible(),'B3 circuit changes source world cells');
  await page.locator('#wire-rule-surge').click();
  assert.equal(await page.locator('#wire-excite-max').inputValue(),'3');
  await page.locator('#wire-drive-clock').click();
  await page.locator('#wire-clock-period').fill('17');
  await page.locator('#wire-source-quad').click();
  const [b3File]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b3Recipe=JSON.parse(await readFile(await b3File.path(),'utf8'));
  assert.equal(b3Recipe.settings.wireDrive,'clock');
  assert.equal(b3Recipe.settings.wirePeriod,17);
  assert.equal(b3Recipe.settings.wireSource,'quad');
  assert.equal(b3Recipe.settings.wireExciteMax,3);
  assert(b3Recipe.world.arrays.cells.length>200,'Real conductor artwork stored in snapshot');
  await page.locator('#wire-rule-canonical').click();
  await page.locator('#wire-drive-off').click();
  await page.locator('input[type=file]').last().setInputFiles({
    name:'b3-real-electric-circuit.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(b3Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#wire-clock-period')?.value==='17');
  assert.equal(await page.locator('#wire-excite-max').inputValue(),'3');
  const legacyWire=structuredClone(b3Recipe);
  for(const key of ['wireExciteMin','wireExciteMax','wireDrive','wirePeriod','wireSource','wireSparkRate'])
    delete legacyWire.settings[key];
  await page.locator('input[type=file]').last().setInputFiles({
    name:'b3-legacy-pure-wireworld.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(legacyWire))
  });
  await page.waitForFunction(()=>document.querySelector('#wire-drive-off')?.getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('#wire-excite-max').inputValue(),'2');
  await page.locator('#wire-template').selectOption('elbow');
  await page.locator('#wire-stamp-arm').click();
  assert.equal(await page.locator('#wire-stamp-arm').getAttribute('aria-pressed'),'true');
  const wireArt=page.locator('canvas[aria-label^="Interactive cellular"]');
  const wb=await wireArt.boundingBox();
  await wireArt.hover({position:{x:wb.width*.5,y:wb.height*.5}});
  assert((await page.locator('canvas.alien-brush-preview').evaluate(c=>
    c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0))),
    'Armed circuit accurately previews canonical conductor sites');
  await wireArt.click({position:{x:wb.width*.5,y:wb.height*.5}});
  assert.equal(await page.locator('#wire-stamp-arm').getAttribute('aria-pressed'),'false',
    'Stage tap stamps one true circuit then safely disarms');
  await page.locator('#engine').selectOption('cyclic');
  await openTab(page,'world');
  console.log('PASS B3: live math, circuit stamps, tap-preview, source controls and pure legacy recipes');

  // B4: mathematical four-state OR and fanout, actual signal traces,
  // stage installation without reset, and saved snapshot fidelity.
  await page.locator('#engine').selectOption('wireworld');
  await openTab(page,'rules');
  assert(await page.locator('#logic-certification').isVisible(),
    'B4 real Wireworld logic bench must be available');
  assert.match(await page.locator('#logic-certification').innerText(),
    /ALL CASES VERIFIED/,'Truth table certifies four real OR cases');
  assert.equal(await page.locator('.wire-logic-lab .wire-logic-truth-table tbody tr').count(),4);
  await page.locator('#logic-radius').fill('12');
  assert.match(await page.locator('#logic-certification').innerText(),/ALL CASES VERIFIED/);
  await page.locator('#logic-rotation').selectOption('3');
  await page.locator('#logic-input-a').uncheck();
  await page.locator('#logic-input-b').check();
  const logicBefore=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#logic-install').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),logicBefore,
    'Installing the real logic device cannot restart the current universe');
  assert(await page.locator('#wire-logic-live-probe').isVisible(),
    'Read actual current-world output port states');
  assert.equal(await page.locator('#wire-logic-live-probe').getByText('CONDUCTOR',{exact:false}).count()>0,true);
  const [b4File]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b4Recipe=JSON.parse(await readFile(await b4File.path(),'utf8'));
  assert.equal(b4Recipe.world.kind,'automatart-world-v1');
  assert(b4Recipe.world.arrays.cells.length>100,'A real conductor device is serialized');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'b4-canonical-or-stamped.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(b4Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='wireworld');
  await page.locator('#logic-device').selectOption('fanout');
  assert.equal(await page.locator('.wire-logic-lab .wire-logic-truth-table tbody tr').count(),2);
  assert.match(await page.locator('#logic-certification').innerText(),/ALL CASES VERIFIED/);
  await page.locator('#logic-radius').fill('7');
  await page.locator('#logic-input-a').check();
  await page.locator('#logic-install').click();
  assert(await page.locator('#wire-logic-live-probe').getByText('OUT 2',{exact:false}).isVisible(),
    'Fanout monitors two actually simulated remote output cells');
  // B5: real XOR four-case truth table plus live-world future scope.
  await page.locator('#logic-device').selectOption('xor');
  assert.equal(await page.locator('.wire-logic-lab .wire-logic-truth-table tbody tr').count(),4);
  assert.match(await page.locator('#logic-certification').innerText(),/ALL CASES VERIFIED/,
   'XOR cannot appear as a certified device unless real 00/01/10/11 physics passes');
  await page.locator('#logic-input-b').uncheck();
  await page.locator('#logic-radius').fill('9');
  await page.locator('#logic-rotation').selectOption('0');
  const xorGen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#logic-install').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),xorGen,
   'XOR geometry stamps must not advance the artwork');
  const xorPixels=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  assert(await page.locator('#wire-logic-live-probe').isVisible());
  await page.locator('#wire-scope-horizon-16').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),/HEAD on tick\(s\) 10/,
   'Real-world XOR port, with only A asserted, must fire exactly 10 ticks later');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),xorGen,
   'Future electrical scope cannot advance the canonical artwork');
  const scopedPixels=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  assert.equal(scopedPixels,xorPixels,'Diagnostic scope must not paint or mutate underlying cells');
  await page.locator('#wire-scope-horizon-32').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),/32 ticks/);
  await page.locator('#logic-input-b').check();
  await page.locator('#logic-install').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),
    /No electron HEAD reached this site within the measured horizon/,
    'The two asserted XOR inputs must inhibit output using canonical 4-head suppression');
  const [b5File]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b5Recipe=JSON.parse(await readFile(await b5File.path(),'utf8'));
  assert.equal(b5Recipe.world.kind,'automatart-world-v1');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b5-canonical-xor-circuit.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(b5Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='wireworld');
  // B6: physical conductor delay lanes, measurable head timing and pure stage.
  assert(await page.locator('#wire-route-kind').isVisible(),'B6 routing/timing instrument mounted');
  await page.locator('#wire-route-kind').selectOption('lanes');
  await page.locator('#wire-route-radius').fill('9');
  await page.locator('#wire-route-offset').fill('7');
  assert.match(await page.locator('#wire-route-certification').innerText(),/ALL ROUTE TIMINGS VERIFIED/,
    'Physical timing bench certifies each A/B signal configuration');
  const b6Before=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#wire-route-install').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b6Before,
    'Physical lane insertion must preserve the universe clock');
  assert(await page.locator('#wire-route-live').isVisible(),'Actual current-world output probes present');
  const b6Pixels=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  await page.locator('#wire-route-measure').click();
  const b6Trace=await page.locator('#wire-route-measurement').innerText();
  assert.match(b6Trace,/T17/,'Lane A HEAD reaches the distant output after 17 genuine transitions');
  assert.match(b6Trace,/T24/,'Extra seven physical wire cells delay lane B by seven real transitions');
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b6Before);
  assert.equal(await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL()),
    b6Pixels,'Measuring future signals cannot repaint the source canvas');
  await page.locator('#wire-route-kind').selectOption('train');
  await page.locator('#wire-route-offset').fill('5');
  assert.match(await page.locator('#wire-route-certification').innerText(),/ALL ROUTE TIMINGS VERIFIED/);
  assert.match(await page.locator('.wire-logic-truth-table').last().innerText(),/T22/,
    'The true two-pulse train contains a physically delayed second HEAD');
  await page.locator('#wire-route-install').click();
  await page.locator('#wire-route-measure').click();
  assert.match(await page.locator('#wire-route-measurement').innerText(),/T17, T22/,
    'A single conductor rail delivers two actual electron HEAD events');
  const [b6Download]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b6Saved=JSON.parse(await readFile(await b6Download.path(),'utf8'));
  assert.equal(b6Saved.world.kind,'automatart-world-v1');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b6-physical-timing-rail.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(b6Saved))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='wireworld');
  // B7: physics-certified NAND/NOT, actual Moore-neighbor heads, recipe.
  await page.locator('#logic-device').selectOption('nand');
  assert.equal(await page.locator('.wire-logic-lab .wire-logic-truth-table tbody tr').count(),4);
  assert.match(await page.locator('#logic-certification').innerText(),/ALL CASES VERIFIED/);
  assert.match(await page.locator('#wire-inhibition-certified').innerText(),/PASS/);
  assert.equal(await page.locator('.wire-inhibition-inspector tbody tr').count(),4);
  assert.match(await page.locator('.wire-inhibition-inspector tbody').innerText(),/3/);
  await page.locator('#logic-radius').fill('12');
  await page.locator('#logic-rotation').selectOption('2');
  await page.locator('#logic-input-a').check();
  await page.locator('#logic-input-b').check();
  const b7Start=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#logic-install').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b7Start,
    'Real NAND gate cannot reset a living artwork');
  assert(await page.locator('#wire-logic-live-probe').isVisible());
  await page.locator('#wire-scope-horizon-32').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),
    /No electron HEAD reached this site within the measured horizon/,
    'NAND A=1 B=1 suppression must produce zero output HEADS');
  await page.locator('#logic-input-b').uncheck();
  await page.locator('#logic-install').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),/HEAD on tick\(s\) 13/,
    'NAND A-only must create exactly one genuine electron HEAD at tick 13');
  await page.locator('#logic-device').selectOption('not');
  assert.equal(await page.locator('.wire-logic-lab .wire-logic-truth-table tbody tr').count(),2);
  assert.equal(await page.locator('.wire-inhibition-inspector tbody tr').count(),2);
  await page.locator('#logic-input-a').uncheck();
  await page.locator('#logic-install').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),/HEAD on tick\(s\) 13/,
    'NOT input 0 emits exactly one genuine HEAD with fixed two-head bias');
  const [b7Download]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b7Saved=JSON.parse(await readFile(await b7Download.path(),'utf8'));
  assert.equal(b7Saved.world.kind,'automatart-world-v1');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b7-real-inhibition-gate.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(b7Saved))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='wireworld');
  // B8: NOR + true 3-input NAE with live stage, physics spectrum, and save.
  await page.locator('#logic-device').selectOption('nor');
  assert.equal(await page.locator('.wire-logic-lab .wire-logic-truth-table tbody tr').count(),4);
  assert.equal(await page.locator('.wire-inhibition-inspector tbody tr').count(),4);
  assert.match(await page.locator('#logic-certification').innerText(),/ALL CASES VERIFIED/);
  assert.match(await page.locator('#wire-threshold-fingerprint').innerText(),/1000/);
  await page.locator('#logic-input-a').check();
  await page.locator('#logic-input-b').check();
  await page.locator('#logic-install').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),
   /No electron HEAD reached this site within the measured horizon/,
   'NOR 11 physically suppresses the remote port');
  await page.locator('#logic-input-a').uncheck();
  await page.locator('#logic-input-b').uncheck();
  await page.locator('#logic-install').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),/HEAD on tick\(s\) 13/,
   'NOR 00 emits a genuine HEAD at the expected wire distance');
  await page.locator('#logic-device').selectOption('nae');
  assert.equal(await page.locator('.wire-logic-lab .wire-logic-truth-table tbody tr').count(),8);
  assert.equal(await page.locator('.wire-inhibition-inspector tbody tr').count(),8);
  assert.match(await page.locator('#wire-threshold-fingerprint').innerText(),/01111110/);
  assert.equal(await page.locator('#wire-threshold-spectrum tr[data-law="surge"] td').last().innerText(),'1',
   'Under true 1..3-head alternate physics, saturated 111 now emits a head');
  assert(await page.locator('#logic-input-c').isVisible(),
   'NAE introduces an actual third independent physical input contact');
  await page.locator('#logic-input-a').check();
  await page.locator('#logic-input-b').check();
  await page.locator('#logic-input-c').check();
  const b8Start=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  await page.locator('#logic-install').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b8Start);
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),
   /No electron HEAD reached this site within the measured horizon/,
   'NAE 111 is silent because 3 heads physically inhibit the conductor');
  await page.locator('#logic-input-c').uncheck();
  await page.locator('#logic-install').click();
  await page.locator('#wire-scope-scan').click();
  assert.match(await page.locator('#wire-scope-result').innerText(),/HEAD on tick\(s\) 13/,
   'NAE 110 physically excites the conductor and reaches the output');
  const [b8File]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b8Recipe=JSON.parse(await readFile(await b8File.path(),'utf8'));
  assert.equal(b8Recipe.world.kind,'automatart-world-v1');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b8-real-three-input-threshold.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(b8Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='wireworld');
  // B9: real two-stage NAND -> synchronized NOT -> AND. No Boolean shortcuts.
  assert(await page.locator('#wire-cascade-certification').isVisible(),
   'B9 cascade physically proven on real four-state conductor artwork');
  assert.match(await page.locator('#wire-cascade-certification').innerText(),/ALL FOUR INPUT CASES CERTIFIED/);
  assert.equal(await page.locator('#wire-cascade-truth tbody tr').count(),4);
  assert.match(await page.locator('#wire-cascade-truth').innerText(),/T19/,
   'A real two-stage AND pulse reaches the remote output after NAND + bias collision + wire travel');
  await page.locator('#wire-rule-canonical').click();
  await page.locator('#wire-drive-off').click();
  await page.locator('#wire-cascade-radius').fill('9');
  await page.locator('#wire-cascade-output-length').fill('8');
  await page.locator('#wire-cascade-rotation').selectOption('0');
  await page.locator('#wire-cascade-a').check();
  await page.locator('#wire-cascade-b').check();
  const b9Gen=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  assert(await page.locator('#wire-cascade-install').isEnabled(),
   'The user can stamp an actually certified cascade');
  await page.locator('#wire-cascade-install').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),b9Gen,
   'A full physical AND cascade is installed without resetting time');
  assert(await page.locator('#wire-cascade-live').isVisible());
  const b9Pixels=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  await page.locator('#wire-cascade-measure').click();
  const b9Trace=await page.locator('#wire-cascade-measurement').innerText();
  assert.match(b9Trace,/STAGE 2.*T11/);
  assert.match(b9Trace,/BIAS NW.*T10/);
  assert.match(b9Trace,/FINAL AND.*T19/);
  assert.match(b9Trace,/STAGE 1 NAND: T12/,
   'The stage-two ignition generates an honest reverse-propagating HEAD at NAND port on tick 12');
  assert.match(await page.locator('#wire-cascade-truth').innerText(),/T12/,
   'The physical truth table includes delayed backpropagation rather than hiding it');
  assert.equal(await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL()),
    b9Pixels,'Four-site nondestructive scope must not repaint or advance source artwork');
  await page.locator('#wire-cascade-b').uncheck();
  await page.locator('#wire-cascade-install').click();
  await page.locator('#wire-cascade-measure').click();
  const b9Off=await page.locator('#wire-cascade-measurement').innerText();
  assert.match(b9Off,/STAGE 1 NAND: T10/);
  assert.match(b9Off,/FINAL AND: NO HEAD/,'One asserted input must NEVER falsely activate AND');
  const [b9File]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b9Recipe=JSON.parse(await readFile(await b9File.path(),'utf8'));
  assert.equal(b9Recipe.world.kind,'automatart-world-v1');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b9-real-physical-and-cascade.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(b9Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='wireworld');
  // B10: physically adjustable independently timed bias waves, not an animation.
  assert(await page.locator('#wire-phase-bits').isVisible());
  assert.equal(await page.locator('#wire-phase-bits').innerText(),'0001',
   'Perfectly synchronized original B9 AND geometry remains byte-for-byte intact');
  assert.match(await page.locator('#wire-phase-certification').innerText(),/EXACT B9 CERTIFIED AND/);
  await page.locator('#wire-phase-nw').fill('2');
  await page.locator('#wire-phase-ne').fill('-1');
  assert.equal(await page.locator('#wire-phase-nw-time').innerText(),'T12');
  assert.equal(await page.locator('#wire-phase-ne-time').innerText(),'T9');
  assert.match(await page.locator('#wire-phase-certification').innerText(),/EXPERIMENTAL PHASE SPECIMEN/);
  assert.equal(await page.locator('#wire-phase-truth tbody tr').count(),4);
  const beforeScan=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  await page.locator('#wire-phase-scan').click();
  assert.equal(await page.locator('#wire-phase-scan-results tbody tr').count(),5);
  assert.equal(await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL()),beforeScan,
   'Phase spectrum must measure separate copied universes and leave the artwork untouched');
  await page.locator('#wire-phase-rotation').selectOption('0');
  await page.locator('#wire-phase-a').check();
  await page.locator('#wire-phase-b').check();
  const phaseStart=Number((await page.locator('.readouts b').first().innerText()).replaceAll(',',''));
  assert(await page.locator('#wire-phase-install').isEnabled());
  await page.locator('#wire-phase-install').click();
  assert.equal(Number((await page.locator('.readouts b').first().innerText()).replaceAll(',','')),phaseStart,
   'Mutating rail length is an art edit, not a simulated generation advancement');
  assert(await page.locator('#wire-phase-live').isVisible());
  const b10Pixels=await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL());
  await page.locator('#wire-phase-measure').click();
  const phaseReport=await page.locator('#wire-phase-measurement').innerText();
  assert.match(phaseReport,/NW BIAS:.*T12/);
  assert.match(phaseReport,/NE BIAS:.*T9/);
  assert.equal(await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL()),b10Pixels,
   'Four actual phase probes cannot mutate the real stage');
  const [b10File]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const b10Recipe=JSON.parse(await readFile(await b10File.path(),'utf8'));
  assert.equal(b10Recipe.world.kind,'automatart-world-v1');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'b10-physical-wire-phase-specimen.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(b10Recipe))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='wireworld');
  await page.locator('#wire-phase-reset').click();
  assert.equal(await page.locator('#wire-phase-bits').innerText(),'0001');
  assert.match(await page.locator('#wire-phase-certification').innerText(),/EXACT B9 CERTIFIED AND/);
  await page.locator('#engine').selectOption('cyclic');
  await openTab(page,'world');
  console.log('PASS B10: true physical ±bias-rail phase mutation, five full-universe scans, read-only scope and exact portable recipe');

  // Funhouse F1 regression: precise stepping, authentic B/S roulette, and two
  // unmistakably different random color buttons.
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
  // Hold time still while comparing generation counters: a restart would
  // still reset the counter to 0, but a running 18 gen/s clock can no longer
  // race Playwright's scroll/stability waits.
  const setLive=async want=>{
    const live=(await page.locator('.transport .primary').getAttribute('aria-label'))==='Pause simulation';
    if(live!==want)await page.locator('.transport .primary').click();
  };
  await setLive(false);
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
  await setLive(true);
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
  // C4: Studio Shell preserves genuine HPP particle and solid-wall controls.
  await page.locator('#engine').selectOption('hpp');
  assert(await page.locator('#hpp-tool-particles').isVisible(),'HPP controls are visible in RULES');
  assert(await page.locator('#lattice').isDisabled(),'HPP needs a four-velocity square lattice');
  await page.locator('#hpp-mask-5').click();
  assert.equal(await page.locator('#hpp-mask-5').getAttribute('aria-pressed'),'true');
  // Individual channel switches expose all 15 legal physical masks, not
  // merely the seven shortcut buttons.
  await page.locator('#hpp-bit-4').click();
  assert.equal(await page.locator('#hpp-bit-4').getAttribute('aria-pressed'),'false');
  await page.locator('#hpp-bit-2').click();
  assert.equal(await page.locator('#hpp-bit-2').getAttribute('aria-pressed'),'true');
  await page.locator('#hpp-mask-5').click();
  await page.locator('#hpp-tool-walls').click();
  assert.equal(await page.locator('#hpp-tool-walls').getAttribute('aria-pressed'),'true');
  // Plant a REAL reflecting obstacle using a pointer event on the live canvas.
  const hppCanvas=page.locator('canvas[aria-label^="Interactive cellular"]');
  const canvasBox=await hppCanvas.boundingBox();
  assert(canvasBox&&canvasBox.width>30&&canvasBox.height>30,'Lattice canvas visible');
  await hppCanvas.click({position:{x:Math.floor(canvasBox.width/2),y:Math.floor(canvasBox.height/2)}});
  const [hppRecipe]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const hppData=JSON.parse(await readFile(await hppRecipe.path(),'utf8'));
  assert.equal(hppData.settings.engine,'hpp');
  assert.equal(hppData.settings.hppTool,'walls');
  assert.equal(hppData.settings.hppBrush,5);
  const actualWalls=Buffer.from(hppData.world.arrays.hppWalls,'base64');
  assert.equal(actualWalls.length,hppData.world.width*hppData.world.height,'Walls are saved canonically');
  assert(actualWalls.some(v=>v===1),'Real pointer painted at least one reflecting wall');
  const wallIndex=actualWalls.indexOf(1);
  const captureWallPixel=()=>hppCanvas.evaluate((canvas,p)=>{
    const ctx=canvas.getContext('2d');
    const xx=Math.floor(((p.index%p.w)+.5)*canvas.width/p.w);
    const yy=Math.floor((Math.floor(p.index/p.w)+.5)*canvas.height/p.h);
    return Array.from(ctx.getImageData(xx,yy,1,1).data);
  },{index:wallIndex,w:hppData.world.width,h:hppData.world.height});
  for(const skin of ['mercury','relief','glass']){
    await page.locator('#skin').selectOption(skin);
    await page.waitForTimeout(80);
    const pixel=await captureWallPixel();
    assert.deepEqual(pixel,[190,222,231,255],skin+' skin preserves a true silver wall overlay');
  }
  await page.locator('#engine').selectOption('life');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'c4-hpp-world.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(hppData))
  });
  await page.waitForFunction(()=>document.querySelector('#engine')?.value==='hpp');
  assert.equal(await page.locator('#hpp-tool-walls').getAttribute('aria-pressed'),'true');
  const [hppReload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const restoredHpp=JSON.parse(await readFile(await hppReload.path(),'utf8'));
  assert.equal(restoredHpp.world.arrays.hppWalls,hppData.world.arrays.hppWalls);
  assert.equal(restoredHpp.world.arrays.cells,hppData.world.arrays.cells);
  await page.locator('#engine').selectOption('life');
  console.log('PASS: C4 HPP controls, immutable wall masks and exact Studio Shell recipe roundtrip');
  // C3: physical Ising spins, Turmite heading agents and saved custom L/R rules.
  await page.locator('#engine').selectOption('ising');
  assert(await page.locator('#ising-temp').isVisible(),'Ising temperature slider exists');
  assert(await page.locator('#lattice').isDisabled(),'Ising requires square grid');
  await page.locator('#ising-temp').fill('110');
  await page.locator('#ising-coupling').fill('-100');
  await page.locator('#ising-field').fill('40');
  await page.locator('#ising-brush-down').click();
  assert.equal(await page.locator('#ising-brush-down').getAttribute('aria-pressed'),'true');
  const [isingFile]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const isingJson=JSON.parse(await readFile(await isingFile.path(),'utf8'));
  assert.equal(isingJson.settings.isingTemperature,1.1);
  assert.equal(isingJson.settings.isingCoupling,-1);
  assert.equal(isingJson.settings.isingField,.4);
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
  await page.locator('#turmite-rule').fill('LLRR'); // deliberately uncommitted
  await page.locator('#turmite-brush').fill('1');
  assert.equal(await page.locator('#turmite-rule').inputValue(),'LLRR',
   'Changing track brush does not destroy uncommitted turn-rule text');
  await page.locator('input[type=file]').last().setInputFiles({
   name:'c3-same-rule-reload.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(turmiteJson))
  });
  await page.waitForFunction(()=>document.querySelector('#turmite-rule')?.value==='RLLR');
  assert.equal(await page.locator('#turmite-rule').inputValue(),'RLLR',
   'Same-rule import resets stale draft rather than silently replacing saved agents');
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
  const gridBeforeAntGif=await page.locator('#resolution').inputValue();
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
  await page.locator('#resolution').fill(gridBeforeAntGif);
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
  assert(await page.locator('#margolus-back-one').isVisible(),'Exact cell-state rewind available');
  assert(await page.locator('#lattice').isDisabled(),'Margolus cannot use triangular / hexagonal partitions');
  await page.locator('#engine').selectOption('cyclic');
  // A deterministic, populated baseline is required to distinguish all
  // seven visual skins; don't depend on the sparse seed left by prior tests.
  await page.locator('#seed-pattern').selectOption('noise');
  await page.locator('#density').fill('48');
  await page.locator('.transport .primary').click(); // pause for deterministic skin comparison
  const lattices=[];
  for(const shape of ['square','hex','triangle','rhombille']){
    await page.locator('#lattice').selectOption(shape);
    await page.waitForTimeout(180);
    lattices.push(await page.locator('canvas[aria-label^="Interactive cellular"]').evaluate(c=>c.toDataURL('image/png')));
  }
  assert.equal(new Set(lattices).size,4,'All four real lattice display geometries must differ');
  // D1a: irregular *tile* geometry, real pointer target and snapshot on the
  // new periodic diamond graph, not a cosmetic geometry skin.
  await page.locator('#lattice').selectOption('rhombille');
  assert((await page.locator('.lattice-picker').innerText()).includes('60°/120°'),
    'Rhombille states the mathematical geometry and four edge graph');
  const rhombilleCanvas=page.locator('canvas[aria-label^="Interactive cellular"]');
  const shapePixels=await rhombilleCanvas.evaluate(c=>[c.width,c.height]);
  assert(shapePixels[0]>100&&shapePixels[1]>100);
  // INVERT is guaranteed to change the selected diamond regardless of its
  // starting color. Save pre-click bytes to prove the pointer actually paints.
  await page.locator('#alien-stamp').selectOption('brush');
  await page.locator('#alien-size').fill('0');
  await page.locator('.alien-button-row button').last().click();
  const [preTapFile]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const preTap=JSON.parse(await readFile(await preTapFile.path(),'utf8'));
  // Finger/click maps to a real diamond polygon; save its resulting states.
  const hitBox=await rhombilleCanvas.boundingBox();
  assert(hitBox&&hitBox.width>80&&hitBox.height>80);
  await rhombilleCanvas.click({position:{x:Math.floor(hitBox.width*.55),y:Math.floor(hitBox.height*.48)}});
  const [d1aRecipe]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const diamondRecipe=JSON.parse(await readFile(await d1aRecipe.path(),'utf8'));
  assert.notEqual(diamondRecipe.world.arrays.cells,preTap.world.arrays.cells,
    'Real pointer paints a rhombus instead of silently dropping the gesture');
  assert.equal(diamondRecipe.settings.lattice,'rhombille');
  assert.equal(diamondRecipe.world.width%3,0,'Saved rhombille has 3 diamonds per hex');
  assert.equal(diamondRecipe.world.height%2,0,'Even-offset-row torus');
  assert.equal(Buffer.from(diamondRecipe.world.arrays.cells,'base64').length,
    diamondRecipe.world.width*diamondRecipe.world.height);
  await page.locator('#lattice').selectOption('square');
  await page.locator('input[type=file]').last().setInputFiles({
    name:'rhombille-real-diamonds.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(diamondRecipe))
  });
  await page.waitForFunction(()=>document.querySelector('#lattice')?.value==='rhombille');
  const [d1aRoundtrip]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'SAVE RECIPE'}).click()
  ]);
  const restoredDiamonds=JSON.parse(await readFile(await d1aRoundtrip.path(),'utf8'));
  assert.deepEqual(restoredDiamonds.world.arrays.cells,diamondRecipe.world.arrays.cells,
    'Diamond graph recipe round-trips real painted cell state');
  console.log('PASS: D1a rhombille Studio Shell rendering, touch painting and exact diamond snapshot');
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
