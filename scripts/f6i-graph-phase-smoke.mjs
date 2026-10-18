import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mods=[
 ['src/engine/f6i-graph-phase.ts','scripts/.f6i-phase.mjs'],
 ['src/engine/types.ts','scripts/.f6i-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6i-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6i-render.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6i-snapshot.mjs'],
 ['src/engine/physical-graph.ts','scripts/.f6i-physical.mjs'],
 ['src/engine/export-frame.ts','scripts/.f6i-frame.mjs']
];
const load=i=>import(pathToFileURL(resolve(mods[i][1])).href);
function hash(canvas){
 const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let h=2166136261;
 for(let i=0;i<pixels.length;i+=17)h=Math.imul(h^pixels[i],16777619);
 return h>>>0;
}
try{
 await Promise.all(mods.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const {microPhaseAdjacency,microGraphPhaseOffsets,validateMicroPhaseMode}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {renderWorld}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {physicalGraph}=await load(5);
 const {renderExportFrame,exportFrameLayout}=await load(6);
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
 assert.equal(validateMicroPhaseMode('future'),'off');
 assert.equal(validateMicroPhaseMode('repel'),'repel');
 const skins=['prism','facets','spinodal','quasicrystal','hyperbolic','lissajous','gyroid','inversion','cusp'];
 const worlds=[['square','square',101,.34],['penrose','portrait',113,.34],['voronoi','portrait',137,.42]];
 const effects={attract:0,repel:0,strength:0,depth:0};
 let cases=0;
 for(const [lattice,aspect,seed,jitter] of worlds){
  const settings={...INITIAL_SETTINGS,lattice,aspect,seed,voronoiJitter:jitter,
   engine:'cyclic',cyclicStates:9,cyclicDrive:.08,pattern:'noise',density:.74,
   cellCount:24,wrap:lattice==='square'};
  let world=createWorld(settings);
  for(let i=0;i<11;i++)world=stepWorld(world,settings);
  const saved=snapshotWorld(world);
  const graph=microPhaseAdjacency(world);
  assert.equal(graph.starts.length,world.cells.length+1);
  assert(graph.edges.length>world.cells.length);
  const occupancy=new Float32Array(world.cells.length);
  for(let i=0;i<occupancy.length;i++)occupancy[i]=world.cells[i]/9;
  if(lattice==='penrose'||lattice==='voronoi'){
   const physical=physicalGraph(lattice,world.width,world.height,seed,jitter);
   assert.deepEqual(graph.starts,physical.starts,'Use EXACT shared-edge adjacency');
   assert.deepEqual(graph.edges,physical.edgeIds,'Use physical neighbors, not packed indices');
   assert.deepEqual(graph.centerX,physical.centerX);
   assert.deepEqual(graph.centerY,physical.centerY);
  }else{
   const i=12*world.width+12,degree=graph.starts[i+1]-graph.starts[i];
   assert.equal(degree,8,'Interior square Moore uses eight real legal neighbors');
  }
  assert.equal(microGraphPhaseOffsets(world,occupancy,{mode:'off',strength:2,depth:5}),null);
  assert.equal(microGraphPhaseOffsets(world,occupancy,{mode:'repel',strength:0,depth:5}),null);
  const attract=microGraphPhaseOffsets(world,occupancy,{mode:'attract',strength:1.5,depth:2});
  const repel=microGraphPhaseOffsets(world,occupancy,{mode:'repel',strength:1.5,depth:2});
  const deep=microGraphPhaseOffsets(world,occupancy,{mode:'attract',strength:1.5,depth:5});
  assert(attract.every(Number.isFinite)&&repel.every(Number.isFinite));
  assert(attract.every(x=>Math.abs(x)<=2.00001));
  assert.notDeepEqual(attract,repel,'Attraction and frustration are distinct');
  assert.notDeepEqual(attract,deep,'More Jacobi passes alter phase propagation');
  assert.deepEqual(attract,microGraphPhaseOffsets(world,occupancy,{mode:'attract',strength:1.5,depth:2}),
   'Instant phase relaxation is perfectly deterministic');
  for(const skin of skins){
   const a={...INITIAL_APPEARANCE,skin,mathMicroDetail:2,
    mathMicroFrequency:7,mathMicroMix:.85,mathMicroPhaseMode:'off',
    mathMicroPhaseStrength:.8,mathMicroPhaseDepth:2,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const render=(appearance=a,w=world)=>{
    const c=createCanvas(1,1);
    renderWorld(c,w,appearance,360,undefined,'export');
    return hash(c);
   };
   const original=render({...a,mathMicroDetail:0});
   assert.equal(original,render({...a,mathMicroMix:0,mathMicroPhaseMode:'attract'}),
    'Zero strength ink means strict old pixels');
   assert.equal(original,render({...a,mathMicroDetail:0,mathMicroPhaseMode:'repel'}),
    'Quality 0 must bypass graph phase');
   const baseline=render();
   const legacy={...a};
   delete legacy.mathMicroPhaseMode;delete legacy.mathMicroPhaseStrength;delete legacy.mathMicroPhaseDepth;
   assert.equal(baseline,render(legacy),'Old recipe without F6I keys = old artwork');
   assert.equal(baseline,render({...a,mathMicroPhaseMode:'attract',mathMicroPhaseStrength:0}),
    'Phase coupling 0 = exact old pixels');
   assert.equal(baseline,render({...a,mathMicroPhaseMode:'off',mathMicroPhaseDepth:5,mathMicroPhaseStrength:2}),
    'Off mode strictly ignores inactive slider settings');
   const pull=render({...a,mathMicroPhaseMode:'attract',mathMicroPhaseStrength:1.5});
   const push=render({...a,mathMicroPhaseMode:'repel',mathMicroPhaseStrength:1.5});
   const strong=render({...a,mathMicroPhaseMode:'attract',mathMicroPhaseStrength:.3});
   const longer=render({...a,mathMicroPhaseMode:'attract',mathMicroPhaseStrength:1.5,mathMicroPhaseDepth:5});
   if(pull!==baseline)effects.attract++;
   if(push!==baseline&&push!==pull)effects.repel++;
   if(strong!==pull)effects.strength++;
   if(longer!==pull)effects.depth++;
   assert.equal(pull,render({...a,mathMicroPhaseMode:'attract',mathMicroPhaseStrength:1.5}),
    'Identical generation produces identical pixels');
   assert.equal(pull,render({...a,mathMicroPhaseMode:'attract',mathMicroPhaseStrength:1.5},
      restoreWorldSnapshot(saved,settings)),'Saved world replays graph phases exactly');
   assert.deepEqual(snapshotWorld(world),saved,'Rendering does not modify original CA');
   cases++;
  }
  console.log('PASS F6I '+lattice+' actual adjacency + nine original mathematical skins');
 }
 for(const [key,n] of Object.entries(effects))
  assert(n>=20,'Expected live '+key+' visible on >=20 of 27 materials, got '+n);
 const s={...INITIAL_SETTINGS,lattice:'voronoi',engine:'cyclic',
  cellCount:24,aspect:'portrait',seed:731,voronoiJitter:.42,wrap:false};
 const w=createWorld(s);
 const a={...INITIAL_APPEARANCE,skin:'quasicrystal',mathMicroDetail:3,mathMicroMix:.9,
  mathMicroPhaseMode:'repel',mathMicroPhaseStrength:1.6,mathMicroPhaseDepth:4,
  print:{...INITIAL_APPEARANCE.print,enabled:false}};
 const layout=exportFrameLayout(s,720,'portrait','contain');
 const out=createCanvas(1,1),scratch=createCanvas(1,1);
 renderExportFrame(out,scratch,w,a,layout);
 const png=out.toBuffer('image/png');
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(png.readUInt32BE(16),layout.width);
 assert.equal(png.readUInt32BE(20),layout.height);
 assert.equal(cases,27);
 console.log('PASS F6I: 27 math skins; effects='+JSON.stringify(effects)+', native 9:16 PNG & old-world identity');
}finally{
 await Promise.all(mods.map(([,p])=>unlink(resolve(p)).catch(()=>{})));
}
