import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const simPath=resolve('scripts/.skin-sim.mjs');
const renderPath=resolve('scripts/.skin-render.mjs');
const appearance={
  palette:['#ff24b9','#fdf428','#13f8d8','#7b30fa','#ff7527','#169dff'],
  colorBy:'state',skin:'pixels',showGrid:false,trails:true,
  paletteOffset:0,paletteCycle:0,paletteReverse:false,smoothPalette:false,
  saturation:1,contrast:1,brightness:1,glowStrength:.8,
  skinThreshold:.42,contourLines:5,contourWidth:1.5,chromeStrength:.8,
  glassLines:.7,temporalRGB:0,fossilOpacity:0
};
const settings={
  engine:'life',lifeRule:'conway',cellCount:48,aspect:'square',seed:17935,
  density:.51,wrap:true,pattern:'noise',neighborShape:'moore',
  customBirth:[3],customSurvive:[2,3],trailDecay:.89,
  cyclicStates:12,cyclicThreshold:2,wolframRule:30,genStates:8,
  genBirth:[3],genSurvive:[2,3],exciteStates:8,exciteThreshold:2,
  largeRadius:2,largeBirthMin:6,largeBirthMax:9,
  largeSurviveMin:5,largeSurviveMax:12,speciesCount:3,
  speciesBirth:2,speciesSurvive:1,speciesAttackBias:1
};
try{
  await Promise.all([
    build({entryPoints:['src/engine/sim.ts'],outfile:simPath,platform:'node',format:'esm',target:'node22',bundle:true}),
    build({entryPoints:['src/engine/render.ts'],outfile:renderPath,platform:'node',format:'esm',target:'node22',bundle:true})
  ]);
  const {createWorld,stepWorld}=await import(pathToFileURL(simPath).href);
  const {renderWorld}=await import(pathToFileURL(renderPath).href);
  globalThis.document={createElement(tag){
    assert.equal(tag,'canvas');
    return createCanvas(1,1);
  }};
  let world=createWorld(settings);
  for(let i=0;i<5;i++)world=stepWorld(world,settings);
  assert(world.previousCells&&world.olderCells&&world.fossils,'Temporal history is stored');
  assert.equal(world.previousCells.length,world.cells.length);
  const render=(skin,extras={})=>{
    const canvas=createCanvas(1,1);
    renderWorld(canvas,world,{...appearance,skin,...extras},400);
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let hash=2166136261;
    for(let i=0;i<pixels.length;i+=13){
      hash^=pixels[i];hash=Math.imul(hash,16777619);
    }
    return hash>>>0;
  };
  const originals=world.cells.slice();
  const modes=['pixels','soft','glow','contours','mercury','relief','glass','prism','facets','spinodal'];
  const out=modes.map(skin=>[skin,render(skin)]);
  assert.equal(new Set(out.map(x=>x[1])).size,out.length,
    'Each skin should render a visibly different pixel field '+JSON.stringify(out));
  assert.notEqual(render('pixels'),render('pixels',{temporalRGB:1}),
    'RGB history must change rendered colors');
  // The default world has naturally changed since generation 0; forcing
  // deposits exercises fossils even when no death occurred in an individual cell.
  const fossils=new Float32Array(world.cells.length);
  fossils.fill(.8);
  world={...world,fossils};
  assert.notEqual(render('pixels'),render('pixels',{fossilOpacity:1}),
    'Chromatic fossils must change the rendered output');
  assert.deepEqual(world.cells,originals,'No art renderer changes CA transition state');
  const next=stepWorld(world,settings);
  assert.deepEqual(next.previousCells,originals,'One frame of history exactly matches the past state');
  assert.deepEqual(next.olderCells,world.previousCells,'Two-frame history shifts correctly');
  console.log('PASS: 10 visually distinct skins, temporal RGB, fossils, history, immutable CA state');
}finally{
  await Promise.all([unlink(simPath).catch(()=>{}),unlink(renderPath).catch(()=>{})]);
}
