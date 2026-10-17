import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const modules=[
 ['src/engine/types.ts','scripts/.d4a-types.mjs'],
 ['src/engine/sim.ts','scripts/.d4a-sim.mjs'],
 ['src/engine/cell-inspector.ts','scripts/.d4a-inspector.mjs'],
 ['src/engine/topology.ts','scripts/.d4a-topology.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d4a-snapshot.mjs'],
 ['src/engine/export-frame.ts','scripts/.d4a-frame.mjs'],
 ['src/engine/capture.ts','scripts/.d4a-capture.mjs'],
 ['src/engine/neighborhood.ts','scripts/.d4a-neighborhood.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
const lattices=['square','hex','triangle','rhombille','kagome','squareoct','penrose','voronoi'];
const engines=['life','brians','cyclic','generations','excitable','species'];
const aspects=['square','portrait','landscape','portrait34','landscape43',
 'portrait45','landscape54','portrait23','landscape32'];
const nearly=(x,y,tol=1e-6)=>Math.abs(x-y)<tol;
try{
 await Promise.all(modules.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {inspectCell}=await load(2);
 const {polygonForCell,cellCentroid,geometryExtent,lookupCell}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {exportFrameLayout,renderExportFrame}=await load(5);
 const {createCaptureCursor}=await load(6);
 const {maxNeighborCount,normalizeActiveVotes}=await load(7);
 globalThis.document={createElement(kind){assert.equal(kind,'canvas');return createCanvas(1,1);}};
 let cases=0,worlds=0,inspections=0;
 for(const shape of lattices){
  for(const aspect of ['square','portrait']){
   const cfg={...INITIAL_SETTINGS,engine:'life',lattice:shape,
    cellCount:shape==='voronoi'||shape==='penrose'?32:48,aspect,
    wrap:shape==='voronoi'||shape==='penrose'?false:true,
    seed:1188,voronoiJitter:.4,density:.18,pattern:'noise',
    lifeRule:'custom',customBirth:[3],customSurvive:[2,3]};
   const [w,h]=worldDimensions(cfg);
   const world=createWorld(cfg);
   assert.equal(world.width,w);assert.equal(world.height,h);
   const [ex,ey]=geometryExtent(shape,w,h);
   assert(ex>0&&ey>0);
   const points=[[0,0],[w-1,h-1],[Math.floor(w/2),Math.floor(h/2)],
      [Math.min(3,w-1),Math.min(4,h-1)]];
   for(const [x,y] of points){
    const g=inspectCell(world,x,y);
    assert(g&&g.id===y*w+x&&g.lattice===shape);
    assert(g.area>0&&Number.isFinite(g.area),'True cell polygon area');
    assert.equal(g.degree,g.neighborIds.length);
    assert(g.degree>0&&g.degree<=maxNeighborCount(cfg),
      'Actual degree within the declared engine/lattice rule bound');
    assert.equal(new Set(g.neighborIds).size,g.neighborIds.length);
    assert(g.neighborIds.every(id=>id>=0&&id<w*h&&id!==g.id));
    assert.equal(g.nonzeroNeighbors,
       g.neighborIds.filter(id=>world.cells[id]>0).length);
    assert.deepEqual(g.center,cellCentroid(shape,x,y,w,h,cfg.seed,cfg.voronoiJitter));
    if(shape==='penrose'||shape==='voronoi'){
      const u=g.center[0]/ex,v=g.center[1]/ey;
      assert.deepEqual(lookupCell(shape,w,h,u,v,cfg.seed,cfg.voronoiJitter),[x,y]);
    }
    const poly=polygonForCell(shape,x,y,w,h,cfg.seed,cfg.voronoiJitter);
    let twiceArea=0;
    for(let k=0;k<poly.length;k++){
      const a=poly[k],b=poly[(k+1)%poly.length];
      twiceArea+=a[0]*b[1]-b[0]*a[1];
    }
    assert(nearly(g.area,Math.abs(twiceArea)*.5),
      'Inspector area equals actual rendered physical polygon shoelace area');
    inspections++;
   }
   for(const p of [[-1,1],[0,-1],[w,0],[w+5,h+2],[NaN,1]])
    assert.equal(inspectCell(world,...p),null,'An old invalid selection cannot index another world');
   // Verify that cell styling and physics remain independent of inspector.
   const before=snapshotWorld(world);
   inspectCell(world,Math.floor(w/2),Math.floor(h/2));
   assert.deepEqual(snapshotWorld(world),before,'Reading inspector cannot mutate state');
   for(const engine of engines){
    const s={...cfg,engine};
    const a=createWorld(s);
    const initial=snapshotWorld(a);
    const after=stepWorld(a,s),again=stepWorld(a,s);
    assert.deepEqual(after.cells,again.cells,'Deterministic '+engine+' / '+shape);
    assert.equal(after.lattice,shape);
    assert.deepEqual(snapshotWorld(a),initial,'Stepping cannot alter original world');
    const packed=snapshotWorld(after);
    const restored=restoreWorldSnapshot(packed,s);
    assert.deepEqual(snapshotWorld(restored),packed,'Exact JSON world restore '+engine+' / '+shape);
    assert.deepEqual(stepWorld(restored,s).cells,stepWorld(after,s).cells,
     'Restored and live next generation agree');
    const cursor=createCaptureCursor(a,s,10,10);
    cursor.advance();
    assert.deepEqual(cursor.current.cells,after.cells,
     'Capture cursor has the same integer-generation physical state');
    if(shape==='penrose'||shape==='voronoi'){
      assert(!after.wrap,'Finite aperiodic/irregular topology never wraps');
      assert.throws(()=>stepWorld(a,{...s,wrap:true}),/cannot wrap/);
    }
    worlds++;
   }
   const c=createCanvas(1,1),scratch=createCanvas(1,1),settings=cfg;
   for(const artAspect of ['square','portrait']){
    const frame=exportFrameLayout(settings,720,artAspect,'contain');
    renderExportFrame(c,scratch,world,{...INITIAL_APPEARANCE,print:{...INITIAL_APPEARANCE.print,enabled:false}},frame);
    assert.equal(c.width,frame.width);
    assert.equal(c.height,frame.height);
    const png=c.toBuffer('image/png');
    assert.equal(png.readUInt32BE(16),frame.width);
    assert.equal(png.readUInt32BE(20),frame.height);
   }
   for(const artAspect of aspects){
    const layout=exportFrameLayout(settings,1080,artAspect,'contain');
    assert(layout.width>=2&&layout.height>=2&&!layout.cropped);
    assert(layout.image.width<=layout.width&&layout.image.height<=layout.height);
   }
   assert.deepEqual(snapshotWorld(world),before,'Frame exports cannot mutate evolution');
   cases++;
   console.log('PASS D4A '+shape+'/'+aspect+' × six genuine CA engines; real cell math, save/replay, PNG framing');
  }
 }
 for(const lattice of lattices){
  const settings={...INITIAL_SETTINGS,lattice,engine:'cyclic',
   wrap:lattice==='penrose'||lattice==='voronoi'?false:true};
  const normalized=normalizeActiveVotes(settings);
  assert.equal(normalized.lattice,lattice);
  assert(normalized.cyclicThreshold<=maxNeighborCount(normalized));
 }
 assert.deepEqual(lattices.length,8);
 console.log('PASS D4A '+cases+' topology/aspect combinations; '+worlds+
  ' deterministic physical worlds; '+inspections+
  ' true-cell topology inspections; exact roundtrip, nine frame layouts and output PNG');
}finally{
 await Promise.all(modules.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
