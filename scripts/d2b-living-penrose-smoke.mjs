import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const modules=[
 ['src/engine/types.ts','scripts/.d2b-types.mjs'],
 ['src/engine/penrose.ts','scripts/.d2b-graph.mjs'],
 ['src/engine/topology.ts','scripts/.d2b-topology.mjs'],
 ['src/engine/sim.ts','scripts/.d2b-sim.mjs'],
 ['src/engine/neighborhood.ts','scripts/.d2b-neighbors.mjs'],
 ['src/engine/alien-paint.ts','scripts/.d2b-paint.mjs'],
 ['src/engine/color-signals.ts','scripts/.d2b-signals.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d2b-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.d2b-capture.mjs'],
 ['src/engine/export-frame.ts','scripts/.d2b-export.mjs']
];
try{
 await Promise.all(modules.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,format:'esm',platform:'node',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(modules[i][1])).href);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(0);
 const {penrosePatch,penroseNeighbors,penroseCanWrap}=await load(1);
 const {geometryExtent,polygonForCell,cellCentroid,projectionMap,lookupCell}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {maxNeighborCount,validNeighborhoodSettings}=await load(4);
 const {alienFootprint,applyAlienStamp,INITIAL_ALIEN_BRUSH}=await load(5);
 const {computeColorSignal}=await load(6);
 const {snapshotWorld,restoreWorldSnapshot}=await load(7);
 const {createCaptureCursor,recommendedDimensions}=await load(8);
 const {exportFrameLayout}=await load(9);
 const s={...INITIAL_SETTINGS,engine:'life',lifeRule:'custom',customBirth:[4],
  customSurvive:[],lattice:'penrose',wrap:false,neighborShape:'moore',
  cellCount:32,aspect:'square',density:0,seed:5813,pattern:'noise'};
 const [w,h]=worldDimensions(s),p=penrosePatch(w,h);
 assert.equal(p.tiles.length,w*h);assert.deepEqual(geometryExtent('penrose',w,h),p.extent);
 assert.equal(maxNeighborCount(s),4);assert(validNeighborhoodSettings(s));
 assert(!validNeighborhoodSettings({...s,neighborShape:'square2'}));
 assert.equal(penroseCanWrap(),false);
 assert.equal(createWorld(s).wrap,false);
 assert.throws(()=>stepWorld(createWorld(s),{...s,wrap:true}),/cannot wrap/);
 const edgeKey=(a,b)=>[a,b].map(v=>v.map(z=>Math.round(z*1e7)).join(',')).sort().join('|');
 const edges=t=>new Set(t.vertices.map((v,i)=>edgeKey(v,t.vertices[(i+1)%4])));
 const finite=p.tiles.filter(t=>t.neighbors.length<4).length;
 assert(finite>0&&finite<w*h*.2,'Only bounded patch border sites lose edges');
 let tested=0;
 for(let i=0;i<p.tiles.length;i++){
  const t=p.tiles[i],x=i%w,y=Math.floor(i/w);
  const poly=polygonForCell('penrose',x,y,w,h),cent=cellCentroid('penrose',x,y,w,h);
  assert.deepEqual(poly,t.vertices.map(v=>[...v]));
  assert.deepEqual(cent,[...t.centroid]);
  assert.deepEqual(penroseNeighbors(w,h,i),t.neighbors);
  const own=edges(t);
  for(const neighbor of t.neighbors){
   assert(p.tiles[neighbor].neighbors.includes(i),'Graph reciprocity');
   assert.equal([...edges(p.tiles[neighbor])].filter(e=>own.has(e)).length,1,
    'Only genuine whole rhomb sides can vote in the automaton');
   tested++;
  }
 }
 assert(tested>w*h*3.4,'Large connected interior graph');
 const interior=p.tiles.findIndex(t=>t.neighbors.length===4);
 assert(interior>=0);
 const ix=interior%w,iy=Math.floor(interior/w);
 const active=createWorld(s);active.cells.fill(0);
 for(const neighbor of p.tiles[interior].neighbors)active.cells[neighbor]=1;
 assert.equal(stepWorld(active,s).cells[interior],1,
  'Life B4 birth reads actual four rhomb faces');
 active.cells[p.tiles[interior].neighbors[0]]=0;
 assert.equal(stepWorld(active,s).cells[interior],0,
  'A missing real edge blocks the birth');
 // A packed-adjacent site has no right to vote without sharing a polygon side.
 const nonEdge=[interior-1,interior+1,interior-w,interior+w].find(i=>
  i>=0&&i<p.tiles.length&&!p.tiles[interior].neighbors.includes(i));
 assert(nonEdge!==undefined);
 const ghost=createWorld({...s,customBirth:[1]});ghost.cells.fill(0);
 ghost.cells[nonEdge]=1;
 assert.equal(stepWorld(ghost,{...s,customBirth:[1]}).cells[interior],0,
  'Never reinterpret nearby packed array addresses as physical edges');
 for(const engine of ['life','brians','cyclic','generations','excitable','species']){
  const settings={...s,engine,density:0.4};
  const a=createWorld(settings),b=stepWorld(a,settings);
  assert.equal(a.lattice,'penrose');assert.equal(b.lattice,'penrose');
  assert.equal(b.cells.length,w*h);assert(b.cells.every(v=>Number.isInteger(v)));
  assert.equal(b.wrap,false);
  if(engine==='cyclic')assert(Number.isFinite(b.stepStructural));
  for(const signal of ['entropy','boundaries','diversity','gradient','flow','angular','generationWave']){
   const field=computeColorSignal(b,{...INITIAL_APPEARANCE,colorBy:signal},signal);
   assert.equal(field.length,w*h);
   assert(field.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
  }
 }
 const map=projectionMap('penrose',w,h);
 assert(Math.abs(map.width/map.height-p.extent[0]/p.extent[1])<.03);
 const picked=[interior,...p.tiles.map((_,i)=>i).filter(i=>i%71===0).slice(0,10)];
 for(const index of picked){
  const t=p.tiles[index];
  const hit=lookupCell('penrose',w,h,t.centroid[0]/p.extent[0],t.centroid[1]/p.extent[1]);
  assert.deepEqual(hit,[index%w,Math.floor(index/w)],'Tap selects true rhomb polygon');
 }
 const brush={...INITIAL_ALIEN_BRUSH,mode:'paint',stamp:'brush',size:0,symmetry:'single'};
 const world=createWorld(s),anchor=[ix,iy],id=iy*w+ix;
 assert(alienFootprint(world,anchor,brush,49).includes(id));
 assert(applyAlienStamp(world,s,anchor,brush,49).includes(id));
 assert.equal(world.cells[id],1);
 const larger=alienFootprint(world,anchor,{...brush,size:3},49);
 assert(larger.includes(id)&&larger.length>=5);
 assert.deepEqual(larger,alienFootprint(world,anchor,{...brush,size:3},49));
 const restored=restoreWorldSnapshot(snapshotWorld(world),s);
 assert.deepEqual(restored.cells,world.cells);
 assert.deepEqual(stepWorld(restored,s).cells,stepWorld(world,s).cells);
 const cursor=createCaptureCursor(world,s,10,10);cursor.advance();
 assert.deepEqual(cursor.current.cells,stepWorld(world,s).cells);
 const wide=worldDimensions({...s,cellCount:256,aspect:'portrait'});
 assert.equal(wide[0],64);assert(wide[0]*wide[1]<18000);
 const [rw,rh]=recommendedDimensions(s,720);
 assert(rw>0&&rh>0);
 for(const aspect of ['current','square','portrait','landscape','portrait34','landscape43',
   'portrait45','landscape54','portrait23','landscape32']){
  const frame=exportFrameLayout(s,720,aspect,'contain');
  assert(frame.width>0&&frame.height>0);
  assert(frame.image.width<=frame.width&&frame.image.height<=frame.height);
 }
 console.log('PASS D2B: '+w*h+' true P3 face cells, '+tested+' authenticated reciprocal full-edge votes');
 console.log('PASS D2B: actual B4 transitions, no packed false neighbors, six engine trajectories');
 console.log('PASS D2B: geometric tap/paint, seven physical/color signals, snapshots and capture replay');
 console.log('PASS D2B: finite-only boundaries, 64-column mobile cap and 9 export frame ratios');
}finally{
 await Promise.all(modules.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
