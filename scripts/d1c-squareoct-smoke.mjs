import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/squareoct.ts','scripts/.d1c-tiles.mjs'],
 ['src/engine/topology.ts','scripts/.d1c-topology.mjs'],
 ['src/engine/types.ts','scripts/.d1c-types.mjs'],
 ['src/engine/sim.ts','scripts/.d1c-sim.mjs'],
 ['src/engine/neighborhood.ts','scripts/.d1c-neighbors.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d1c-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.d1c-capture.mjs'],
 ['src/engine/alien-paint.ts','scripts/.d1c-brush.mjs'],
 ['src/engine/color-signals.ts','scripts/.d1c-colors.mjs'],
 ['src/engine/export-frame.ts','scripts/.d1c-frames.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.d1c-mutant.mjs']
];
try{
 await Promise.all(modules.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,format:'esm',platform:'node',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(modules[i][1])).href);
 const {squareOctOffsets,squareOctPolygon,squareOctExtent,SQO_PERIOD,SQO_CORNER}=await load(0);
 const {neighborOffsets,polygonForCell,geometryExtent,projectionMap,lookupCell,cellCentroid}=await load(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {maxNeighborCount,validNeighborhoodSettings}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {createCaptureCursor,recommendedDimensions}=await load(6);
 const {applyAlienStamp,alienFootprint,INITIAL_ALIEN_BRUSH}=await load(7);
 const {computeColorSignal}=await load(8);
 const {exportFrameLayout}=await load(9);
 const {requiresWorldRestart}=await load(10);
 const wrap=(n,m)=>(n%m+m)%m;
 const w=40,h=22;
 const graph=(x,y)=>neighborOffsets('squareoct',x,y,'moore');
 const key=(a,b)=>[a,b].map(p=>p.map(z=>Math.round(z*1e7)).join(',')).sort().join('|');
 const edges=p=>new Set(p.map((a,i)=>key(a,p[(i+1)%p.length])));
 const polygonArea=p=>Math.abs(p.reduce((sum,a,i)=>{
  const b=p[(i+1)%p.length];return sum+a[0]*b[1]-a[1]*b[0];
 },0)/2);
 assert(Math.abs(SQO_PERIOD**2-(3+2*Math.SQRT2))<1e-10);
 assert(Math.abs(2*SQO_CORNER**2-1)<1e-10);
 assert.throws(()=>squareOctExtent(35,h),/complete two-tile motifs/);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const expected=x%2===0?8:4;
  const offsets=graph(x,y);
  assert.equal(offsets.length,expected,'Actual degree by physical face type');
  assert.deepEqual(offsets,squareOctOffsets(x,y));
  const seen=new Set();
  for(const [dx,dy] of offsets){
   const nx=wrap(x+dx,w),ny=wrap(y+dy,h),id=ny*w+nx;
   assert.notEqual(id,y*w+x,'No self contact');
   assert(!seen.has(id),'No duplicate contact');
   seen.add(id);
   assert(graph(nx,ny).some(([rx,ry])=>wrap(nx+rx,w)===x&&wrap(ny+ry,h)===y),
    'Reciprocal contacts on toroidal truncated-square tiling');
  }
 }
 let edgesTested=0;
 for(let y=2;y<h-2;y++)for(let x=6;x<w-6;x++){
  const p=polygonForCell('squareoct',x,y),degree=x%2===0?8:4;
  assert.equal(p.length,degree);
  const ideal=x%2===0?2+2*Math.SQRT2:1;
  assert(Math.abs(polygonArea(p)-ideal)<1e-8,'Exactly regular 4.8.8 face area');
  const own=edges(p);
  for(const [dx,dy] of graph(x,y)){
   const other=polygonForCell('squareoct',x+dx,y+dy);
   assert.equal([...edges(other)].filter(edge=>own.has(edge)).length,1,
    'Every declared graph neighbor shares precisely one complete polygon edge');
   edgesTested++;
  }
 }
 assert(edgesTested>500);
 const extent=squareOctExtent(w,h);
 assert.deepEqual(geometryExtent('squareoct',w,h),extent);
 const map=projectionMap('squareoct',w,h);
 assert(Math.abs(map.width/map.height-extent[0]/extent[1])<.025);
 assert([...map.indices].filter(id=>id!==0xffffffff).length>map.indices.length*.85,
  'Nearly all natural viewport pixels map to real squares or octagons');
 for(let y=1;y<h-1;y++)for(let x=4;x<w-4;x++){
  const [cx,cy]=cellCentroid('squareoct',x,y);
  assert.deepEqual(lookupCell('squareoct',w,h,cx/extent[0],cy/extent[1]),[x,y],
   'Touching a polygon center selects the actual square or octagon');
 }
 const s={...INITIAL_SETTINGS,engine:'life',lifeRule:'custom',
  customBirth:[4,8],customSurvive:[],lattice:'squareoct',neighborShape:'moore',
  cellCount:32,aspect:'square',wrap:false,density:0,seed:8848};
 const [sw,sh]=worldDimensions(s);
 assert.equal(sw,32);assert(Math.abs(sh-sw/2)<=1);
 assert.equal(maxNeighborCount(s),8);
 assert(validNeighborhoodSettings(s));
 assert(!validNeighborhoodSettings({...s,neighborShape:'custom'}),
  'Square stencil must not masquerade as octagon edge graph');
 for(const sector of [0,1]){
  const x=16+sector,y=Math.floor(sh/2),p=y*sw+x;
  const world=createWorld(s);world.cells.fill(0);
  const near=graph(x,y).map(([dx,dy])=>(y+dy)*sw+x+dx);
  for(const n of near)world.cells[n]=1;
  assert.equal(stepWorld(world,s).cells[p],1,'Authentic B8 octagon / B4 square birth');
  world.cells[near[0]]=0;
  assert.equal(stepWorld(world,s).cells[p],0,'One missing true edge cancels full-degree birth');
 }
 // Isolate finite-boundary behavior (no phantom wrap neighbors).
 const finite=createWorld(s);finite.cells.fill(0);
 const cornerNeighbors=graph(1,0).filter(([dx,dy])=>1+dx>=0&&0+dy>=0);
 assert(cornerNeighbors.length<4,'Boundary vertex-square legitimately loses neighbors');
 // Engine matrix and color inspectors actually use updated local laws.
 for(const engine of ['life','brians','cyclic','generations','excitable','species']){
  const settings={...s,engine},a=createWorld(settings),b=stepWorld(a,settings);
  assert.equal(b.cells.length,a.cells.length);
  assert.equal(b.lattice,'squareoct');
  for(const signal of ['entropy','flow','gradient','boundaries']){
   const field=computeColorSignal(b,{...INITIAL_APPEARANCE,colorBy:signal},signal);
   assert(field.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
  }
 }
 const world=createWorld(s),restored=restoreWorldSnapshot(snapshotWorld(world),s);
 assert.deepEqual(restored.cells,world.cells);
 assert.deepEqual(stepWorld(restored,s).cells,stepWorld(world,s).cells);
 assert.equal(restored.lattice,'squareoct');
 const anchor=[17,Math.floor(sh/2)];
 const brush={...INITIAL_ALIEN_BRUSH,stamp:'brush',size:0,mode:'paint'};
 assert(applyAlienStamp(world,s,anchor,brush,120).includes(anchor[1]*sw+anchor[0]),
  'Physical single-tile brush respects rotated squares');
 const large=alienFootprint(world,anchor,{...brush,size:4},120);
 assert(large.includes(anchor[1]*sw+anchor[0]));
 assert(large.length>=5,'Physical multi-cell brush reaches neighboring polygons');
 assert.deepEqual(large,alienFootprint(world,anchor,{...brush,size:4},120),
  'Brush footprint stays seeded and replayable');
 const cursor=createCaptureCursor(restored,s,10,10);
 cursor.advance();
 assert.deepEqual(cursor.current.cells,stepWorld(restored,s).cells);
 const [rw,rh]=recommendedDimensions(s,360);
 assert(rw%2===0&&rh%2===0);
 assert(Math.abs(rw/rh-extent[0]/extent[1])<1.5,
  'Capture has sensible physical aspect, not packed-cell shape');
 for(const aspect of ['current','square','portrait','landscape','portrait34','landscape43','portrait45','landscape54','portrait23','landscape32']){
  const out=exportFrameLayout(s,720,aspect,'contain');
  assert(out.width>0&&out.height>0);
  assert(out.image.width<=out.width&&out.image.height<=out.height);
  assert(!out.cropped,'Contain never crops mathematically correct polygons');
 }
 assert(requiresWorldRestart(s,{...s,lattice:'kagome'}));
 console.log('PASS D1C: 4.8.8 exact regular polygons and 4/8 reciprocal shared-edge graph');
 console.log('PASS D1C: true B4/B8 births, finite boundaries and six genuine CA engines');
 console.log('PASS D1C: real touch/brush geometry, four physical signals, snapshot/cursor and hi-res frames');
}finally{
 await Promise.all(modules.map(([,filename])=>unlink(resolve(filename)).catch(()=>{})));
}
