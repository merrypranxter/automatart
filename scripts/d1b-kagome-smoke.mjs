import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/kagome.ts','scripts/.d1b-kagome.mjs'],
 ['src/engine/topology.ts','scripts/.d1b-topology.mjs'],
 ['src/engine/types.ts','scripts/.d1b-types.mjs'],
 ['src/engine/sim.ts','scripts/.d1b-sim.mjs'],
 ['src/engine/neighborhood.ts','scripts/.d1b-neighbors.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d1b-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.d1b-capture.mjs'],
 ['src/engine/alien-paint.ts','scripts/.d1b-paint.mjs'],
 ['src/engine/color-signals.ts','scripts/.d1b-colors.mjs'],
 ['src/engine/export-frame.ts','scripts/.d1b-export.mjs']
];
try{
 await Promise.all(modules.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,format:'esm',platform:'node',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(modules[i][1])).href);
 const {kagomeOffsets,kagomePolygon,kagomeExtent}=await load(0);
 const {neighborOffsets,polygonForCell,geometryExtent,projectionMap,lookupCell,cellCentroid}=await load(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {maxNeighborCount,validNeighborhoodSettings}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {createCaptureCursor,recommendedDimensions}=await load(6);
 const {alienFootprint,applyAlienStamp,INITIAL_ALIEN_BRUSH}=await load(7);
 const {computeColorSignal}=await load(8);
 const {exportFrameLayout}=await load(9);
 const mod=(x,n)=>(x%n+n)%n;
 const w=36,h=22;
 const graph=(x,y)=>neighborOffsets('kagome',x,y,'moore');
 const key=(a,b)=>[a,b].map(p=>p.map(z=>Math.round(z*1e6)).join(',')).sort().join('|');
 const edges=p=>new Set(p.map((a,i)=>key(a,p[(i+1)%p.length])));
 const area=p=>Math.abs(p.reduce((s,a,i)=>{
  const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];
 },0))/2;
 const side=Math.sqrt(3)/2;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const neighbors=graph(x,y),degree=x%3===0?6:3;
  assert.equal(neighbors.length,degree);
  assert.deepEqual(neighbors,kagomeOffsets(x,y));
  const seen=new Set();
  for(const [dx,dy] of neighbors){
   const xx=mod(x+dx,w),yy=mod(y+dy,h),to=yy*w+xx;
   assert.notEqual(to,y*w+x);assert(!seen.has(to));seen.add(to);
   assert(graph(xx,yy).some(([a,b])=>mod(xx+a,w)===x&&mod(yy+b,h)===y),
    'Reciprocal six/three neighbor torus');
  }
 }
 let checked=0;
 for(let y=2;y<h-2;y++)for(let x=6;x<w-6;x++){
  const p=kagomePolygon(x,y),sides=x%3===0?6:3;
  assert.equal(p.length,sides);
  const expected=x%3===0?3*Math.sqrt(3)*side*side/2:
    Math.sqrt(3)*side*side/4;
  assert(Math.abs(area(p)-expected)<1e-9,'Each face is a true regular hex/triangle');
  const own=edges(p);
  for(const [dx,dy] of graph(x,y)){
   const other=polygonForCell('kagome',x+dx,y+dy);
   assert.equal([...edges(other)].filter(edge=>own.has(edge)).length,1,
    'Graph neighbors share one whole physical polygon side');
   checked++;
  }
 }
 assert(checked>100);
 assert.throws(()=>kagomeExtent(35,h),/three-tile motifs/);
 const extent=kagomeExtent(w,h);
 assert.deepEqual(geometryExtent('kagome',w,h),extent);
 const map=projectionMap('kagome',w,h);
 assert(Math.abs(map.width/map.height-extent[0]/extent[1])<.03);
 assert([...map.indices].filter(id=>id!==0xffffffff).length>map.indices.length*.80);
 for(let y=2;y<h-2;y++)for(let x=6;x<w-6;x++){
  const [cx,cy]=cellCentroid('kagome',x,y);
  assert.deepEqual(lookupCell('kagome',w,h,cx/extent[0],cy/extent[1]),[x,y]);
 }
 const s={...INITIAL_SETTINGS,engine:'life',lifeRule:'custom',
  customBirth:[3,6],customSurvive:[],lattice:'kagome',
  neighborShape:'moore',cellCount:32,aspect:'square',wrap:false,density:0,seed:2026};
 const [sw,sh]=worldDimensions(s);
 assert.equal(sw,33);assert.equal(sh%2,0);
 assert.equal(maxNeighborCount(s),6);
 assert(validNeighborhoodSettings(s));
 assert(!validNeighborhoodSettings({...s,neighborShape:'custom'}));
 for(let sec=0;sec<3;sec++){
  const x=15+sec,y=sh/2,p=y*sw+x,world=createWorld(s);
  world.cells.fill(0);
  for(const [dx,dy] of graph(x,y))world.cells[(y+dy)*sw+x+dx]=1;
  assert.equal(stepWorld(world,s).cells[p],1,'Hex B6 or triangle B3 real birth');
  const [dx,dy]=graph(x,y)[0];world.cells[(y+dy)*sw+x+dx]=0;
  assert.equal(stepWorld(world,s).cells[p],0,'Missing one genuine edge blocks full-degree birth');
 }
 for(const engine of ['life','brians','cyclic','generations','excitable','species']){
  const setting={...s,engine};
  const a=createWorld(setting),b=stepWorld(a,setting);
  assert.equal(b.lattice,'kagome');
  assert.equal(b.cells.length,a.cells.length);
  const color=computeColorSignal(b,{...INITIAL_APPEARANCE,colorBy:'entropy'},'entropy');
  assert(color.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
 }
 const world=createWorld(s),restored=restoreWorldSnapshot(snapshotWorld(world),s);
 assert.deepEqual(restored.cells,world.cells);
 assert.deepEqual(stepWorld(restored,s).cells,stepWorld(world,s).cells);
 const anchor=[16,sh/2],brush={...INITIAL_ALIEN_BRUSH,stamp:'brush',size:0,mode:'paint'};
 assert(applyAlienStamp(world,s,anchor,brush,99).includes(anchor[1]*sw+anchor[0]));
 assert(alienFootprint(world,anchor,{...brush,size:4},99).length>=5);
 const cursor=createCaptureCursor(restored,s,10,10);cursor.advance();
 assert.deepEqual(cursor.current.cells,stepWorld(restored,s).cells);
 const [rw,rh]=recommendedDimensions(s,360);
 assert.equal(rw%2,0);assert.equal(rh%2,0);
 for(const aspect of ['current','square','portrait','landscape']){
  const l=exportFrameLayout(s,720,aspect,'contain');
  assert(l.image.width<=l.width&&l.image.height<=l.height);
 }
 console.log('PASS D1B: 3.6.3.6 exact shared-edge six/three Kagome graph and periodic reciprocity');
 console.log('PASS D1B: polygon areas, natural projection and touch selection');
 console.log('PASS D1B: true Life B3/B6, six engines, color signals, painting, recipe, capture and export frame');
}finally{
 await Promise.all(modules.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
