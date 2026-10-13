import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/rhombille.ts','scripts/.d1a-tiles.mjs'],
 ['src/engine/topology.ts','scripts/.d1a-topology.mjs'],
 ['src/engine/sim.ts','scripts/.d1a-sim.mjs'],
 ['src/engine/types.ts','scripts/.d1a-types.mjs'],
 ['src/engine/neighborhood.ts','scripts/.d1a-neighbors.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d1a-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.d1a-capture.mjs'],
 ['src/engine/alien-paint.ts','scripts/.d1a-brush.mjs'],
 ['src/engine/color-signals.ts','scripts/.d1a-colors.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.d1a-mutate.mjs'],
 ['src/engine/snapshot.ts','scripts/.d1a-still.mjs']
];
try{
 await Promise.all(modules.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,format:'esm',platform:'node',target:'node22'})));
 const mod=async n=>import(pathToFileURL(resolve(modules[n][1])).href);
 const {rhombilleOffsets,rhombillePolygon,rhombilleArea,rhombilleExtent}=await mod(0);
 const {neighborOffsets,polygonForCell,geometryExtent,projectionMap,lookupCell}=await mod(1);
 const {createWorld,stepWorld}=await mod(2);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await mod(3);
 const {maxNeighborCount,validNeighborhoodSettings,normalizeActiveVotes}=await mod(4);
 const {snapshotWorld,restoreWorldSnapshot}=await mod(5);
 const {cloneWorld,createCaptureCursor,recommendedDimensions}=await mod(6);
 const {applyAlienStamp,INITIAL_ALIEN_BRUSH}=await mod(7);
 const {computeColorSignal}=await mod(8);
 const {requiresWorldRestart}=await mod(9);
 const {snapshotLayout}=await mod(10);
 const w=36,h=12;
 const modn=(v,m)=>(v%m+m)%m;
 const graph=(x,y)=>neighborOffsets('rhombille',x,y,'moore');
 assert.deepEqual(graph(6,4),rhombilleOffsets(6,4));
 assert.equal(rhombilleOffsets(0,0).length,4);
 // Vertex-cell and edge-cell distinctions matter: a diamond has FOUR sides.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const seen=new Set;
  const neighbors=graph(x,y);
  assert.equal(neighbors.length,4,'Every rhombus has four full edges');
  for(const [dx,dy] of neighbors){
   const xx=modn(x+dx,w),yy=modn(y+dy,h),key=yy*w+xx;
   assert.notEqual(key,y*w+x,'No self-neighbor');
   assert(!seen.has(key),'No duplicated edge contacts');
   seen.add(key);
   assert(graph(xx,yy).some(([rx,ry])=>
    modn(xx+rx,w)===x&&modn(yy+ry,h)===y),
    'Exact reciprocal rhombille adjacency on even-row torus');
  }
 }
 // Reconstruct boundary edges from genuine lozenge polygons. Interior
 // adjacent diamonds share exactly one geometric EDGE, not a point/corner.
 const edgeKey=(a,b)=>{
  const p=[a,b].map(v=>v.map(x=>Math.round(x*1e5)).join(',')).sort();
  return p.join('|');
 };
 const edges=(poly)=>new Set(poly.map((a,i)=>edgeKey(a,poly[(i+1)%poly.length])));
 const area=Math.sqrt(3)/2;
 let checked=0;
 for(let y=2;y<h-2;y++)for(let col=2;col<w/3-2;col++)for(let sector=0;sector<3;sector++){
  const x=3*col+sector,polygon=polygonForCell('rhombille',x,y);
  assert.equal(polygon.length,4);
  assert(Math.abs(rhombilleArea(polygon)-area)<1e-9,
   '60°/120° rhombus exact equal area');
  const ownEdges=edges(polygon);
  for(const [dx,dy] of graph(x,y)){
   const other=polygonForCell('rhombille',x+dx,y+dy);
   const common=[...edges(other)].filter(edge=>ownEdges.has(edge));
   assert.equal(common.length,1,'Graph adjacency corresponds to exactly one geometrically shared edge');
   checked++;
  }
 }
 assert(checked>100);
 assert.throws(()=>rhombilleExtent(35,h),/complete three-diamond/);
 const [ex,ey]=rhombilleExtent(w,h);
 assert.deepEqual(geometryExtent('rhombille',w,h),[ex,ey]);
 const projected=projectionMap('rhombille',w,h);
 assert(Math.abs(projected.width/projected.height-ex/ey)<.02,
  'Projection uses genuine geometric aspect, no stretched diamonds');
 let coverage=0;
 for(const id of projected.indices)if(id!==0xffffffff)coverage++;
 assert(coverage>projected.indices.length*.80,'Lozenges cover most of finite viewport');
 for(let y=1;y<h-1;y++)for(let x=3;x<w-3;x++){
  const poly=rhombillePolygon(x,y);
  const cx=poly.reduce((sum,p)=>sum+p[0],0)/4;
  const cy=poly.reduce((sum,p)=>sum+p[1],0)/4;
  assert.deepEqual(lookupCell('rhombille',w,h,cx/ex,cy/ey),[x,y],
   'Tap/click lookup returns the true diamond beneath the pointer');
 }
 const s={...INITIAL_SETTINGS,engine:'life',lifeRule:'custom',customBirth:[4],
   customSurvive:[],lattice:'rhombille',neighborShape:'moore',
   cellCount:32,aspect:'square',density:0,wrap:false,seed:1542};
 const [simW,simH]=worldDimensions(s);
 assert.equal(simW,33,'Nominal 32-column resolution rounds to a complete 11-hex / 33-diamond graph');
 assert.equal(simH%2,0,'Row parity wraps on an even-height honeycomb');
 assert.equal(maxNeighborCount(s),4);
 assert(validNeighborhoodSettings(s));
 assert(!validNeighborhoodSettings({...s,neighborShape:'custom'}),
  'Square stencil does not pretend to define diamond edge adjacency');
 let world=createWorld(s);
 assert.equal(world.width,simW);assert.equal(world.height,simH);
 const x=3*5+1,y=simH/2,index=y*simW+x;
 world.cells.fill(0);
 const adjacent=graph(x,y).map(([dx,dy])=>(y+dy)*simW+x+dx);
 for(const p of adjacent)world.cells[p]=1;
 const next=stepWorld(world,s);
 assert.equal(next.cells[index],1,'Life B4 birth occurs on exactly four rhombus edge neighbors');
 world.cells[adjacent[0]]=0;
 assert.equal(stepWorld(world,s).cells[index],0,'Three of four neighbors cannot satisfy rhombille B4');
 for(const engine of ['life','brians','cyclic','generations','excitable','species']){
  const settings={...s,engine};
  const a=createWorld(settings);
  const n=stepWorld(a,settings);
  assert.equal(n.cells.length,a.cells.length,engine+' evolves without square-neighbor fallback');
  assert.equal(n.lattice,'rhombille');
  const hist=computeColorSignal(n,{...INITIAL_APPEARANCE,colorBy:'entropy'},'entropy');
  assert(hist.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
 }
 const serialized=snapshotWorld(next);
 const loaded=restoreWorldSnapshot(serialized,s);
 assert.deepEqual(loaded.cells,next.cells);
 assert.equal(loaded.lattice,'rhombille');
 assert.deepEqual(stepWorld(loaded,s).cells,stepWorld(next,s).cells);
 const cloned=cloneWorld(loaded);cloned.cells[0]^=1;
 assert.notEqual(cloned.cells[0],loaded.cells[0]);
 const brush={...INITIAL_ALIEN_BRUSH,stamp:'brush',size:0,mode:'paint'};
 const target=[x,y],painted=createWorld(s);
 const footprint=applyAlienStamp(painted,s,target,brush,242);
 assert(footprint.includes(index),'Symmetric paint uses diamond hit-test and same world index');
 // Sector zero -> sector one physically points left-and-down. Packed x+1
 // is just an address; it must NOT be interpreted as eastward movement.
 const directional=createWorld(s);
 directional.cells.fill(0);
 const sectorZeroIndex=y*simW+(x-1);
 directional.cells[index]=1; // sector 1 of this hex
 directional.previousCells.fill(0);
 directional.olderCells.fill(0);
 const flow=computeColorSignal(directional,{...INITIAL_APPEARANCE,colorBy:'flow'},'flow');
 const physicallyExpected=(Math.atan2(.75,-Math.sqrt(3)/4)+Math.PI)/(2*Math.PI);
 assert(Math.abs(flow[sectorZeroIndex]-physicallyExpected)<.015,
  'Flow inspector follows true lozenge centroid, not storage-column delta');
 for(const aspect of ['current','square','portrait','landscape']){
  const layout=snapshotLayout(s,{aspect,shortSide:720});
  const [physicalW,physicalH]=geometryExtent('rhombille',simW,simH);
  assert(Math.abs(layout.image.width/layout.image.height-physicalW/physicalH)<.008,
    'PNG letterbox/crop preserves diamond geometry without stretching');
  assert(layout.image.width<=layout.width&&layout.image.height<=layout.height);
 }
 const cap=createCaptureCursor(next,s,10,10);
 assert.deepEqual(cap.current.cells,next.cells);
 cap.advance();
 assert.deepEqual(cap.current.cells,stepWorld(next,s).cells);
 const [rw,rh]=recommendedDimensions(s,360);
 assert.equal(rw%2,0);assert.equal(rh%2,0);
 const [liveEx,liveEy]=geometryExtent('rhombille',simW,simH);
 assert(Math.abs(rh/rw-liveEy/liveEx)<.02,'Rhombille recorder preserves real diamond shape');
 assert(requiresWorldRestart(s,{...s,lattice:'hex'}));
 assert.equal(normalizeActiveVotes({...s,engine:'cyclic',cyclicThreshold:24}).cyclicThreshold,4);
 for(const aspect of ['square','portrait','landscape']){
  const [ww,hh]=worldDimensions({...s,aspect});
  assert(ww%3===0&&hh%2===0,'Every rhombille aspect has complete motifs and even row parity');
 }
 console.log('PASS D1a: 4 reciprocal shared-edge diamond neighbors and exact 60/120 rhombus geometry');
 console.log('PASS D1a: edge-isomorphic graph, projected coverage and finger hit-testing');
 console.log('PASS D1a: actual Life B4 transitions, six CA engines, inspector, snapshots, brush and exports');
}finally{
 await Promise.all(modules.map(([,f])=>unlink(resolve(f)).catch(()=>{})));
}
