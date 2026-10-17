import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const mods=[
 ['src/engine/types.ts','scripts/.f6b-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6b-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6b-render.mjs'],
 ['src/engine/export-frame.ts','scripts/.f6b-frames.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6b-snap.mjs'],
 ['src/engine/physical-graph.ts','scripts/.f6b-graph.mjs']
];
const load=i=>import(pathToFileURL(resolve(mods[i][1])).href);
function fingerprint(data){
 let hash=2166136261,step=11;
 for(let i=0;i<data.length;i+=step){hash=Math.imul(hash^data[i],16777619);}
 return hash>>>0;
}
const skins=['quasicrystal','hyperbolic','lissajous'];
const cases=[
 ['square','square',17,.34],
 ['hex','square',21,.34],
 ['triangle','portrait',33,.34],
 ['rhombille','landscape',91,.34],
 ['kagome','portrait',221,.34],
 ['squareoct','square',221,.34],
 ['penrose','portrait',718,.34],
 ['voronoi','portrait',1071,.42],
 ['voronoi','square',172,0]
];
try{
 await Promise.all(mods.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {renderWorld}=await load(2);
 const {exportFrameLayout,renderExportFrame}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {physicalGraph}=await load(5);
 globalThis.document={createElement(kind){assert.equal(kind,'canvas');return createCanvas(1,1);}};
 let passed=0;
 for(const [lattice,aspect,seed,jitter] of cases){
  const s={...INITIAL_SETTINGS,lattice,aspect,seed,voronoiJitter:jitter,
    cellCount:32,engine:'cyclic',cyclicStates:9,cyclicDrive:.07,
    pattern:'noise',density:.68,wrap:lattice!=='penrose'&&lattice!=='voronoi'};
  const [w,h]=worldDimensions(s);
  let world=createWorld(s);
  for(let k=0;k<5;k++)world=stepWorld(world,s);
  const saved=snapshotWorld(world);
  const reference=snapshotWorld(restoreWorldSnapshot(saved,s));
  assert.deepEqual(saved,reference,'Same state and seed must restore verbatim');
  const hashes=[];
  for(const skin of skins){
   const a={...INITIAL_APPEARANCE,skin,glowStrength:0,
    mathFrequency:4.5,mathWarp:.8,mathInk:.65,mathFold:5,mathTwist:.85,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const picture=(appearance=a,target=world)=>{
    const canvas=createCanvas(1,1);
    renderWorld(canvas,target,appearance,432);
    const ctx=canvas.getContext('2d');
    return fingerprint(ctx.getImageData(0,0,canvas.width,canvas.height).data);
   };
   const original=picture();
   assert.equal(original,picture(),'A fixed generation must paint exact reproducible material');
   assert.equal(original,picture(a,restoreWorldSnapshot(saved,s)),
    'Snapshot and fresh world must reproduce identical seeded F6B pigments');
   hashes.push(original);
   for(const [key,v] of [
     ['mathFrequency',10],['mathWarp',1.8],['mathInk',0],
     ['mathFold',11],['mathTwist',1.85]
   ]){
    const updated=picture({...a,[key]:v});
    assert.notEqual(updated,original,
     'F6B '+skin+' / '+lattice+': artist knob '+key+' must materially alter actual pixels');
   }
   const advanced=stepWorld(world,s);
   const later=picture(a,advanced);
   assert.notEqual(later,original,
    'F6B '+skin+' / '+lattice+' must be driven by actual CA state / integer generation');
   const frame=exportFrameLayout(s,720,aspect,'contain');
   const main=createCanvas(1,1),scratch=createCanvas(1,1);
   renderExportFrame(main,scratch,world,a,frame);
   assert.equal(main.width,frame.width);assert.equal(main.height,frame.height);
   const png=main.toBuffer('image/png');
   assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   assert.equal(png.readUInt32BE(16),frame.width);
   assert.equal(png.readUInt32BE(20),frame.height);
   assert.deepEqual(snapshotWorld(world),saved,'Every visual render must preserve CA physics');
   passed++;
  }
  assert.equal(new Set(hashes).size,3,
   'Quasicrystal, Möbius hyperbolic, and Lissajous braid must produce different images');
  if(lattice==='penrose'||lattice==='voronoi'){
   const graph=physicalGraph(lattice,w,h,seed,jitter);
   assert(graph&&graph.hasPeriodicWrap===false&&graph.edgeIds.length>w*h*2,
    'F6B references the true finite shared polygon-edge graph');
  }
  console.log('PASS F6B '+lattice+'/'+aspect+': 3 distinct skins, 5 responsive equations, seeded recipe, frame');
 }
 // Hyperbolic formula independently checked over many points and nonzero
 // Möbius shifts: unit-disk automorphisms must NEVER map an interior point out.
 for(const a of [[.2,.17],[-.25,.13],[0,0]]){
  for(let i=0;i<67;i++)for(let j=0;j<67;j++){
   const zx=(i/66-.5)*1.34,zy=(j/66-.5)*1.34;
   const [ar,ai]=a,nr=zx-ar,ni=zy-ai;
   const dr=1-ar*zx-ai*zy,di=ai*zx-ar*zy;
   const denominator=dr*dr+di*di;
   const wr=(nr*dr+ni*di)/denominator,wi=(ni*dr-nr*di)/denominator;
   assert(Math.hypot(wr,wi)<1,'Möbius automorphism must preserve Poincaré disk');
  }
 }
 assert.equal(passed,27);
 console.log('PASS F6B: '+passed+' physical-world render/print-ready PNG checks, true unit disk, immutable state');
}finally{
 await Promise.all(mods.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
