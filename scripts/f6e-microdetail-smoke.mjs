import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const modules=[
 ['src/engine/types.ts','scripts/.f6e-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6e-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6e-render.mjs'],
 ['src/engine/f6d-microdetail.ts','scripts/.f6e-subcell.mjs'],
 ['src/engine/export-frame.ts','scripts/.f6e-export.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6e-snapshot.mjs'],
 ['src/engine/physical-graph.ts','scripts/.f6e-graph.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
function fingerprint(canvas){
 const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let hash=2166136261;
 for(let i=0;i<pixels.length;i+=17)hash=Math.imul(hash^pixels[i],16777619);
 return hash>>>0;
}
const skins=['prism','facets','spinodal','quasicrystal','hyperbolic','lissajous'];
const families=[
 ['square','square',16,.34],
 ['hex','square',17,.34],
 ['triangle','portrait',18,.34],
 ['rhombille','landscape',19,.34],
 ['kagome','portrait',20,.34],
 ['squareoct','square',21,.34],
 ['penrose','portrait',23,.34],
 ['voronoi','portrait',27,.42],
 ['voronoi','square',31,0]
];
try{
 await Promise.all(modules.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {renderWorld}=await load(2);
 const {sampleMicroEquation,microBudget}=await load(3);
 const {renderExportFrame,exportFrameLayout}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {physicalGraph}=await load(6);
 globalThis.document={createElement(kind){assert.equal(kind,'canvas');return createCanvas(1,1);}};
 let cases=0;
 for(const [lattice,aspect,seed,jitter] of families){
  const settings={...INITIAL_SETTINGS,engine:'cyclic',lattice,aspect,
   cellCount:32,seed,voronoiJitter:jitter,
   cyclicStates:9,cyclicDrive:.07,density:.72,pattern:'noise',
   wrap:lattice!=='penrose'&&lattice!=='voronoi'};
  let world=createWorld(settings);
  for(let i=0;i<6;i++)world=stepWorld(world,settings);
  const snapshot=snapshotWorld(world);
  if(lattice==='penrose'||lattice==='voronoi'){
   const graph=physicalGraph(lattice,world.width,world.height,seed,jitter);
   assert(graph?.edgeIds.length>world.cells.length*2);
   assert.equal(graph.hasPeriodicWrap,false);
  }
  for(const skin of skins){
   const a={...INITIAL_APPEARANCE,skin,mathMicroDetail:2,
     mathMicroFrequency:5,mathMicroMix:.8,mathWarp:1.05,
     mathFrequency:4.5,mathInk:.7,mathFold:5,mathTwist:.85,
     glowStrength:0,
     print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const picture=(style=a,w=world,quality='export')=>{
    const canvas=createCanvas(1,1);
    renderWorld(canvas,w,style,330,undefined,quality);
    return fingerprint(canvas);
   };
   const original=picture({...a,mathMicroDetail:0});
   assert.equal(original,picture({...a,mathMicroMix:0}),
    'Turning microscopic ink to zero must return EXACT original art');
   const fine=picture();
   assert.notEqual(fine,original,skin+'/'+lattice+': opt-in micro detail changes pixels');
   assert.equal(fine,picture(),'Fixed universe and generation perfectly repeat');
   const replay=restoreWorldSnapshot(snapshot,settings);
   assert.equal(fine,picture(a,replay),'Exact saved-state pigment replay');
   assert.notEqual(fine,picture({...a,mathMicroFrequency:10}),
    skin+' microscopic frequency is a real control');
   assert.notEqual(fine,picture({...a,mathMicroMix:.2}),
    skin+' pigment intensity is a real control');
   assert.notEqual(fine,picture({...a,mathMicroDetail:1}),
    skin+' quality adjusts actual in-cell samples');
   assert.notEqual(fine,picture(a,stepWorld(world,settings)),
    skin+' microscopic fields respond to living cellular evolution');
   const sampleCoordinates=[
    [.11,.17],[.31,.22],[.52,.47],[.74,.75],[.91,.87],
    [.14,.71],[.88,.11],[.37,.91],[.63,.19]
   ];
   const signals=sampleCoordinates.map(([lx,ly])=>
    sampleMicroEquation(skin,.41,.57,lx,ly,.57,.17,-.21,a,world.generation,.28));
   assert(signals.every(Number.isFinite));
   assert(new Set(signals).size>=2,
    skin+' MUST EVALUATE the equation at different positions inside the SAME source cell');
   assert.deepEqual(snapshotWorld(world),snapshot,
    'No pigment operation may modify living CA state or history');
   cases++;
  }
  console.log('PASS F6E '+lattice+'/'+aspect+' × six distinct microscopic math skin equations');
 }
 for(const size of [512,1024,7296,16384]){
  for(let quality=1;quality<=3;quality++){
   const live=microBudget(size,quality,'preview'),exported=microBudget(size,quality,'export');
   assert(live.enabled&&exported.enabled);
   assert(live.estimatedSamples<=Math.max(size*4,live.maxSamples));
   assert(exported.estimatedSamples<=Math.max(size*4,exported.maxSamples));
   assert(exported.samples>=live.samples,'Export cannot use fewer samples than preview');
  }
 }
 // Native-resolution 1:1 and 9:16 PNG export uses exact Voronoi polygon clipping.
 for(const aspect of ['square','portrait']){
  const settings={...INITIAL_SETTINGS,lattice:'voronoi',engine:'cyclic',
   cellCount:32,aspect,seed:1098,voronoiJitter:.42,wrap:false};
  const world=createWorld(settings);
  for(const skin of ['prism','quasicrystal','hyperbolic','lissajous']){
   const a={...INITIAL_APPEARANCE,skin,mathMicroDetail:3,
    mathMicroFrequency:8,mathMicroMix:.8,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const frame=exportFrameLayout(settings,720,aspect,'contain');
   const target=createCanvas(1,1),scratch=createCanvas(1,1);
   renderExportFrame(target,scratch,world,a,frame);
   const png=target.toBuffer('image/png');
   assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   assert.equal(png.readUInt32BE(16),frame.width);
   assert.equal(png.readUInt32BE(20),frame.height);
   assert(frame.width>=720&&frame.height>=720);
  }
 }
 assert.equal(cases,54);
 console.log('PASS F6E: 54 true intra-cell mathematical pigments; eight physical lattices, reproducibility, exact original fallback and native PNG');
}finally{
 await Promise.all(modules.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
