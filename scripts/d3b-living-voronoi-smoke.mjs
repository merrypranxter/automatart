import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const modules=[
 ['src/engine/types.ts','scripts/.d3b-types.mjs'],
 ['src/engine/voronoi.ts','scripts/.d3b-voronoi.mjs'],
 ['src/engine/topology.ts','scripts/.d3b-topology.mjs'],
 ['src/engine/sim.ts','scripts/.d3b-sim.mjs'],
 ['src/engine/neighborhood.ts','scripts/.d3b-neighborhood.mjs'],
 ['src/engine/alien-paint.ts','scripts/.d3b-paint.mjs'],
 ['src/engine/color-signals.ts','scripts/.d3b-color.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d3b-snap.mjs'],
 ['src/engine/export-frame.ts','scripts/.d3b-export.mjs'],
 ['src/engine/capture.ts','scripts/.d3b-capture.mjs']
];
const load=async n=>import(pathToFileURL(resolve(modules[n][1])).href);
try{
 await Promise.all(modules.map(([entry,outfile])=>
   build({entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'})));
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(0);
 const {voronoiPatch,voronoiNeighbors,voronoiHitTest}=await load(1);
 const {projectionMap,lookupCell,polygonForCell,cellCentroid}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {maxNeighborCount,normalizeActiveVotes}=await load(4);
 const {alienFootprint,applyAlienStamp,INITIAL_ALIEN_BRUSH}=await load(5);
 const {computeColorSignal}=await load(6);
 const {snapshotWorld,restoreWorldSnapshot}=await load(7);
 const {exportFrameLayout,renderExportFrame}=await load(8);
 const {createCaptureCursor}=await load(9);
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
 const seeds=[{aspect:'square',jitter:.34,count:32,seed:711},
  {aspect:'portrait',jitter:.42,count:64,seed:412},
  {aspect:'landscape',jitter:0,count:48,seed:710}];
 for(const entry of seeds){
  const s={...INITIAL_SETTINGS,lattice:'voronoi',voronoiJitter:entry.jitter,
    cellCount:entry.count,aspect:entry.aspect,seed:entry.seed,
    wrap:false,engine:'life',lifeRule:'custom',customBirth:[7],customSurvive:[],
    pattern:'center',density:.55};
  const [w,h]=worldDimensions(s),p=voronoiPatch(w,h,s.seed,s.voronoiJitter);
  assert.equal(p.cells.length,w*h);assert.equal(p.hasPeriodicWrap,false);
  assert.equal(maxNeighborCount(s),12);
  assert.equal(normalizeActiveVotes({...s,cyclicThreshold:24}).cyclicThreshold,24);
  const world=createWorld(s);
  assert.equal(world.voronoiSeed,s.seed);
  assert.equal(world.voronoiJitter,entry.jitter);
  assert.equal(world.wrap,false);
  assert.throws(()=>stepWorld(world,{...s,wrap:true}),/cannot wrap/);
  const map=projectionMap('voronoi',w,h,s.seed,s.voronoiJitter);
  assert(Math.abs(map.width/map.height-w/h)<.02);
  let tiny=0;
  for(let id=0;id<p.cells.length;id++){
   const tile=p.cells[id],x=id%w,y=Math.floor(id/w);
   assert.equal(voronoiNeighbors(w,h,s.seed,id,s.voronoiJitter).length,tile.neighbors.length);
   assert.deepEqual(polygonForCell('voronoi',x,y,w,h,s.seed,s.voronoiJitter),tile.polygon.map(v=>[...v]));
   assert.deepEqual(cellCentroid('voronoi',x,y,w,h,s.seed,s.voronoiJitter),[...tile.centroid]);
   const u=tile.centroid[0]/w,v=tile.centroid[1]/h;
   assert.equal(voronoiHitTest(w,h,s.seed,s.voronoiJitter,u,v),id);
   assert.deepEqual(lookupCell('voronoi',w,h,u,v,s.seed,s.voronoiJitter),[x,y]);
   if(tile.neighbors.length>=7)tiny++;
  }
  if(entry.jitter>0)assert(tiny>0,'Seven+ genuine polygon neighbors exist');
  // Deterministic polygon target: seed geometry must ACTUALLY change.
  if(entry.jitter>0)assert.notDeepEqual(
    p.cells[0].polygon,voronoiPatch(w,h,s.seed+1,s.voronoiJitter).cells[0].polygon);
  const target=p.cells.findIndex(c=>c.neighbors.length>=7);
  if(target>=0){
   // Force Life B7 at exact polygon edges; A nearby storage slot cannot vote.
   const q={...s,customBirth:[p.cells[target].neighbors.length]};
   const a=createWorld(q);a.cells.fill(0);
   for(const id of p.cells[target].neighbors)a.cells[id]=1;
   assert.equal(stepWorld(a,q).cells[target],1,'Birth reads ALL real polygon neighbors');
   const first=p.cells[target].neighbors[0];a.cells[first]=0;
   assert.equal(stepWorld(a,q).cells[target],0,'Removing one real edge blocks exact birth');
   const fake=[target-1,target+1,target-w,target+w].find(id=>
    id>=0&&id<w*h&&!p.cells[target].neighbors.includes(id));
   assert(fake!==undefined);
   const ghost=createWorld({...s,customBirth:[1]});ghost.cells.fill(0);
   ghost.cells[fake]=1;
   assert.equal(stepWorld(ghost,{...s,customBirth:[1]}).cells[target],0,
    'Packed storage proximity is not Voronoi adjacency');
  }
  for(const engine of ['life','brians','cyclic','generations','excitable','species']){
   const settings={...s,engine,pattern:'noise',density:.36};
   const a=createWorld(settings);
   const after=stepWorld(a,settings),again=stepWorld(a,settings);
   assert.deepEqual(after.cells,again.cells,'Deterministic '+engine);
   assert.equal(after.cells.length,w*h);
   assert.equal(after.voronoiJitter,entry.jitter);
   assert.equal(after.wrap,false);
   if(engine==='cyclic')assert(Number.isFinite(after.stepStructural));
   for(const signal of ['entropy','boundaries','diversity','gradient','flow','angular','generationWave']){
    const field=computeColorSignal(after,{...INITIAL_APPEARANCE,colorBy:signal},signal);
    assert.equal(field.length,w*h);
    assert(field.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
   }
  }
  const origin=p.cells.findIndex(c=>c.neighbors.length>=5);
  const brush={...INITIAL_ALIEN_BRUSH,mode:'paint',stamp:'brush',size:0,
    symmetry:'single',scatter:1,density:1};
  const anchor=[origin%w,Math.floor(origin/w)];
  assert(alienFootprint(world,anchor,brush,51).includes(origin));
  const affected=applyAlienStamp(world,s,anchor,brush,51);
  assert(affected.includes(origin));
  assert.equal(world.cells[origin],1);
  const big=alienFootprint(world,anchor,{...brush,size:3},51);
  assert(big.length>5&&big.includes(origin));
  assert.deepEqual(big,alienFootprint(world,anchor,{...brush,size:3},51));
  const restored=restoreWorldSnapshot(snapshotWorld(world),s);
  assert.deepEqual(restored.cells,world.cells);
  assert.equal(restored.voronoiSeed,s.seed);
  assert.equal(restored.voronoiJitter,entry.jitter);
  assert.deepEqual(stepWorld(restored,s).cells,stepWorld(world,s).cells);
  const cursor=createCaptureCursor(world,s,10,10);
  cursor.advance();
  assert.deepEqual(cursor.current.cells,stepWorld(world,s).cells);
  for(const aspect of ['current','square','portrait','landscape','portrait34',
   'landscape43','portrait45','landscape54','portrait23','landscape32']){
   const frame=exportFrameLayout(s,720,aspect,'contain');
   assert(frame.width>0&&frame.height>0);
   assert(frame.image.width<=frame.width&&frame.image.height<=frame.height);
  }
  console.log('PASS D3B '+w+'×'+h+' jitter '+entry.jitter+
    ', six living laws, exact seed geometry, shape painting and 10 frames');
 }
 // Actual high-pixel art: polygon should be rendered sharply, not stretched
 // from the 640px preview. A single known cell on a black surrounding
 // background must fill its REAL geometric center in PNG.
 const s={...INITIAL_SETTINGS,engine:'life',lattice:'voronoi',cellCount:32,
  aspect:'square',voronoiJitter:.42,seed:19384,wrap:false,density:0};
 const world=createWorld(s),p=voronoiPatch(32,32,s.seed,s.voronoiJitter);
 world.cells.fill(0);
 const id=p.cells.findIndex(c=>c.neighbors.length>=7);
 assert(id>=0);world.cells[id]=1;
 const a={...INITIAL_APPEARANCE,skin:'pixels',palette:['#090617','#fff000'],
  colorBy:'state',showGrid:false,trails:false,glowStrength:0,
  print:{...INITIAL_APPEARANCE.print,enabled:false}};
 const snap=snapshotWorld(world);
 for(const aspect of ['square','portrait','landscape']){
  const l=exportFrameLayout(s,aspect==='square'?2160:720,aspect,'contain');
  const target=createCanvas(1,1),scratch=createCanvas(1,1);
  renderExportFrame(target,scratch,world,a,l);
  const c=target.getContext('2d');
  const center=p.cells[id].centroid;
  const xx=l.image.x+center[0]/32*l.image.width;
  const yy=l.image.y+center[1]/32*l.image.height;
  const px=c.getImageData(Math.round(xx),Math.round(yy),1,1).data;
  assert(px[0]>130&&px[1]>130,'Production polygon center retains bright physical pigment');
  const png=target.toBuffer('image/png');
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  console.log('PASS D3B genuine polygon PNG '+l.width+'×'+l.height);
 }
 assert.deepEqual(snapshotWorld(world),snap,'Export cannot mutate simulation state');
 console.log('PASS D3B living Voronoi physics/paint/color/recipe and native-resolution art');
}finally{
 await Promise.all(modules.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
