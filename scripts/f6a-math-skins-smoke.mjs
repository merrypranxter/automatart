import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/types.ts','scripts/.f6a-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6a-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6a-render.mjs'],
 ['src/engine/export-frame.ts','scripts/.f6a-frame.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6a-snapshot.mjs'],
 ['src/engine/physical-graph.ts','scripts/.f6a-graph.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
const sha=bytes=>{
 let h=2166136261;
 for(let i=0;i<bytes.length;i+=23){h^=bytes[i];h=Math.imul(h,16777619);}
 return h>>>0;
};
try{
 await Promise.all(modules.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'})));
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {renderWorld}=await load(2);
 const {renderExportFrame,exportFrameLayout}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {physicalGraph}=await load(5);
 globalThis.document={createElement(kind){assert.equal(kind,'canvas');return createCanvas(1,1);}};
 const skins=['prism','facets','spinodal'];
 let checks=0,distinct=0;
 const families=[
  ['square','square',19,.34],
  ['hex','square',19,.34],
  ['triangle','portrait',19,.34],
  ['rhombille','landscape',19,.34],
  ['kagome','portrait',19,.34],
  ['squareoct','square',19,.34],
  ['penrose','portrait',19,.34],
  ['voronoi','portrait',19,.42],
  ['voronoi','square',21,0]
 ];
 for(const [lattice,aspect,seed,jitter] of families){
  const s={...INITIAL_SETTINGS,engine:'cyclic',lattice,aspect,seed,
   voronoiJitter:jitter,cellCount:32,density:.62,pattern:'noise',
   wrap:lattice!=='penrose'&&lattice!=='voronoi'};
  const [w,h]=worldDimensions(s);
  let world=createWorld(s);
  for(let k=0;k<4;k++)world=stepWorld(world,s);
  const snapshot=snapshotWorld(world);
  const samples=[];
  for(const skin of skins){
   const app={...INITIAL_APPEARANCE,skin,
    mathFrequency:5,mathWarp:1.15,mathInk:.7,
    glowStrength:0,print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const render=(param=app)=>{
    const canvas=createCanvas(1,1);
    renderWorld(canvas,world,param,320,undefined,'preview');
    const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return sha(bytes);
   };
   const base=render();
   samples.push(base);
   assert.equal(render(),base,'Same exact generation must render identically');
   for(const [param,value] of [
    ['mathFrequency',10],['mathWarp',0],['mathInk',0]
   ]){
    assert.notEqual(base,render({...app,[param]:value}),
     skin+' '+param+' must visibly affect art across '+lattice);
   }
   // Discrete crystal sectors are permitted to remain unchanged for a
   // single tick. Compare over sustained real CA evolution, not a forced
   // visual flicker on every frame.
   let next=world;
   for(let tick=0;tick<24;tick++)next=stepWorld(next,s);
   const later=createCanvas(1,1);
   renderWorld(later,next,app,320);
   const laterHash=sha(later.getContext('2d').getImageData(0,0,later.width,later.height).data);
   console.log('CHECK F6A '+lattice+'/'+skin+' current '+base+' after 24 '+laterHash);
   assert.notEqual(base,laterHash,'Skin responds to live evolution and integer generation');
   const replay=restoreWorldSnapshot(snapshot,s);
   const canvas=createCanvas(1,1);
   renderWorld(canvas,replay,app,320);
   assert.equal(base,sha(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data),
    'World snapshot replay reproduces identical F6 artwork');
   const layout=exportFrameLayout(s,720,aspect,'contain');
   const target=createCanvas(1,1),scratch=createCanvas(1,1);
   renderExportFrame(target,scratch,world,app,layout);
   assert.equal(target.width,layout.width);
   assert.equal(target.height,layout.height);
   const png=target.toBuffer('image/png');
   assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   checks++;
  }
  assert.equal(new Set(samples).size,3,'The three math skins are NOT renamed variants of the same effect');
  assert.deepEqual(snapshotWorld(world),snapshot,'No color rendering can ever change physical cellular state');
  if(lattice==='penrose'||lattice==='voronoi')
   assert(physicalGraph(lattice,w,h,seed,jitter)?.edgeIds.length>0);
  distinct++;
  console.log('PASS F6A '+lattice+'/'+aspect+' 3 distinct reactive pigments + controls + PNG + replay');
 }
 console.log('PASS F6A '+checks+' actual math pigment outputs across '+distinct+
 ' topology/ratio/seed cases; no physics changes; original seven skins still covered by legacy QA');
}finally{
 await Promise.all(modules.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
