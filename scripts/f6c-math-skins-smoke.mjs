import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const mods=[
 ['src/engine/types.ts','scripts/.f6c-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6c-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6c-render.mjs'],
 ['src/engine/f6c-math-skins.ts','scripts/.f6c-math.mjs'],
 ['src/engine/export-frame.ts','scripts/.f6c-frame.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6c-snapshot.mjs'],
 ['src/engine/physical-graph.ts','scripts/.f6c-graph.mjs']
];
const load=i=>import(pathToFileURL(resolve(mods[i][1])).href);
function pixelHash(data){
 let h=2166136261;
 for(let j=0;j<data.length;j+=13)h=Math.imul(h^data[j],16777619);
 return h>>>0;
}
const skins=['gyroid','inversion','cusp'];
const worlds=[
 ['square','square',17,.34],
 ['hex','square',21,.34],
 ['triangle','portrait',33,.34],
 ['rhombille','landscape',91,.34],
 ['kagome','portrait',221,.34],
 ['squareoct','square',313,.34],
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
 const {gyroidLevel,circleInversion,cuspDiscriminant,isF6CSkin}=await load(3);
 const {renderExportFrame,exportFrameLayout}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {physicalGraph}=await load(6);
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
 // Mathematical identities for the actual public functions used by the skin.
 assert.equal(gyroidLevel(0,0,0),0);
 assert(Math.abs(gyroidLevel(Math.PI/2,0,0)-1)<1e-12);
 for(const [x,y,z] of [[.8,1.7,-2.1],[-1.2,.2,.8],[0,.71,2]]){
  assert(Math.abs(gyroidLevel(x+2*Math.PI,y,z)-gyroidLevel(x,y,z))<1e-12);
 }
 assert.equal(circleInversion(.2,.3,.2,.3,.6),null,
  'The mathematical inversion pole must NOT be silently clamped');
 for(const center of [[0,0],[.15,-.3],[-.2,.4]]){
  for(const point of [[.4,.2],[.7,-.55],[-.6,.8],[.02,-.4]]){
   if(Math.hypot(point[0]-center[0],point[1]-center[1])<.0001)continue;
   const mapped=circleInversion(point[0],point[1],...center,.57);
   assert(mapped);
   const inverse=circleInversion(mapped[0],mapped[1],...center,.57);
   assert(inverse&&Math.hypot(inverse[0]-point[0],inverse[1]-point[1])<1e-10,
    'True circle inversion must be its own inverse');
  }
 }
 for(const t of [-2,-.5,-.2,0,.2,.8,2]){
  const u=-3*t*t,v=2*t*t*t;
  assert(Math.abs(cuspDiscriminant(u,v))<1e-8,
   'Critical cubic discriminant exactly vanishes on the canonical cusp');
 }
 assert(cuspDiscriminant(-1,0)<0&&cuspDiscriminant(1,0)>0,
  'The opposite sides of a cusp yield opposite cubic root regimes');
 assert(skins.every(isF6CSkin));
 let renderCases=0;
 for(const [lattice,aspect,seed,jitter] of worlds){
  const s={...INITIAL_SETTINGS,lattice,aspect,seed,
   voronoiJitter:jitter,cellCount:32,engine:'cyclic',cyclicStates:9,
   cyclicDrive:.07,pattern:'noise',density:.7,
   wrap:lattice!=='penrose'&&lattice!=='voronoi'};
  const [w,h]=worldDimensions(s);
  let world=createWorld(s);
  for(let i=0;i<7;i++)world=stepWorld(world,s);
  const original=snapshotWorld(world);
  const hashes=[];
  for(const skin of skins){
   const a={...INITIAL_APPEARANCE,skin,glowStrength:0,
    mathFrequency:4.5,mathWarp:.8,mathInk:.65,
    mathFold:5,mathTwist:.85,mathSlice:.3,mathPoleX:.5,mathPoleY:.5,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const image=(app=a,source=world)=>{
    const c=createCanvas(1,1);renderWorld(c,source,app,360);
    return pixelHash(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
   };
   const h1=image();
   assert.equal(h1,image(),'Identical generations must have identical pixels');
   assert.equal(h1,image(a,restoreWorldSnapshot(original,s)),
    'F6C output must reproduce saved recipes without wall-clock randomness');
   hashes.push(h1);
   assert.notEqual(h1,image({...a,mathFrequency:10}),
    'Frequency must genuinely deform each F6C material');
   assert.notEqual(h1,image({...a,mathWarp:1.8}),
    'Actual living field deformation must affect each F6C material');
   assert.notEqual(h1,image({...a,mathInk:0}),
    'Hard-edge ink is genuinely optional and adjustable');
   assert.notEqual(h1,image({...a,mathFold:11}),
    'Symmetry/sector order must alter the actual material equation');
   assert.notEqual(h1,image({...a,mathTwist:1.8}),
    'Phase twist must alter the actual material equation');
   assert.notEqual(h1,image({...a,mathSlice:-1.6}),
    'The signed section parameter must alter actual mathematics');
   assert.notEqual(h1,image({...a,mathPoleX:.16}),
    'Moving the X math center must change actual geometry');
   assert.notEqual(h1,image({...a,mathPoleY:.85}),
    'Moving the Y math center must change actual geometry');
   const after=stepWorld(world,s);
   assert.notEqual(h1,image(a,after),
    'A new live cellular generation must change the mathematical pigment');
   const layout=exportFrameLayout(s,720,aspect,'contain');
   const out=createCanvas(1,1),scratch=createCanvas(1,1);
   renderExportFrame(out,scratch,world,a,layout);
   assert.equal(out.width,layout.width);assert.equal(out.height,layout.height);
   const png=out.toBuffer('image/png');
   assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   assert.equal(png.readUInt32BE(16),layout.width);
   assert.equal(png.readUInt32BE(20),layout.height);
   assert.deepEqual(snapshotWorld(world),original,
    'Rendering must never change cellular physics or history');
   renderCases++;
  }
  assert.equal(new Set(hashes).size,skins.length,
   'Gyroid, inversion and cusp must not be identical under the same palette');
  if(lattice==='penrose'||lattice==='voronoi')
   assert(physicalGraph(lattice,w,h,seed,jitter)?.edgeIds.length>w*h*2,
    'Irregular physical neighbor gradients must use the full-edge graph');
  console.log('PASS F6C '+lattice+'/'+aspect+
    ': three unique living materials, eight mathematical artist controls, PNG and exact recipe');
 }
 assert.equal(renderCases,27);
 console.log('PASS F6C 27 distinct material/geometry tests + gyroid periodicity / inversion involution / cusp discriminant identities');
}finally{
 await Promise.all(mods.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
