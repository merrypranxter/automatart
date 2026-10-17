import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/types.ts','scripts/.d4b-types.mjs'],
 ['src/engine/sim.ts','scripts/.d4b-sim.mjs'],
 ['src/engine/physical-graph.ts','scripts/.d4b-physical.mjs'],
 ['src/engine/penrose.ts','scripts/.d4b-penrose.mjs'],
 ['src/engine/voronoi.ts','scripts/.d4b-voronoi.mjs'],
 ['src/engine/color-signals.ts','scripts/.d4b-signals.mjs'],
 ['src/engine/cyclic-dynamics.ts','scripts/.d4b-cyclic.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d4b-snap.mjs'],
 ['src/engine/export-frame.ts','scripts/.d4b-frames.mjs'],
 ['src/engine/capture.ts','scripts/.d4b-capture.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
function oracleStep(cells,patch,s,generation,cyclicAdvance){
 const n=cells.length,next=new Uint8Array(n),votes=new Uint8Array(n);
 for(let i=0;i<n;i++){
  const old=cells[i],neighborIds=(patch.tiles??patch.cells)[i].neighbors;
  let count=0,counts=new Uint8Array(9);
  for(const q of neighborIds){
   const state=cells[q];
   if(s.engine==='species'){
    if(state>0&&state<=s.speciesCount){counts[state]++;count++;}
   }else if(s.engine==='cyclic'
     ?((state-old+s.cyclicStates)%s.cyclicStates===1):state===1)count++;
  }
  votes[i]=count;
  switch(s.engine){
   case 'life':next[i]=old
    ?Number(s.customSurvive.includes(count)):Number(s.customBirth.includes(count));break;
   case 'brians':next[i]=old===0?Number(s.brainBirthMatch==='atLeast'?
     count>=s.brainBirthCount:count===s.brainBirthCount):old===1?2:0;break;
   case 'cyclic':next[i]=cyclicAdvance(old,count,s.cyclicThreshold,s.cyclicDrive,
     s.seed,generation,i,s.cyclicStates);break;
   case 'generations':next[i]=old===0?Number(s.genBirth.includes(count)):
      old===1?(s.genSurvive.includes(count)?1:2):
      old+1>=s.genStates?0:old+1;break;
   case 'excitable':next[i]=old===0?Number(count>=s.exciteThreshold):
      old+1>=s.exciteStates?0:old+1;break;
   case 'species':{
    let leader=0,best=0;
    for(let j=1;j<=s.speciesCount;j++)if(counts[j]>best){best=counts[j];leader=j;}
    const own=old>0?counts[old]:0;
    next[i]=old===0?(best>=s.speciesBirth?leader:0):
     (leader!==0&&leader!==old&&best>=s.speciesBirth&&best>=own+s.speciesAttackBias?
      leader:own>=s.speciesSurvive?old:0);
   }
  }
 }
 return {next,votes};
}
function oldGraphSignal(world,signal,patch){
 const n=world.cells.length,w=world.width,h=world.height;
 const faces=patch.tiles??patch.cells,previous=world.previousCells??world.cells;
 const older=world.olderCells??previous,out=new Float32Array(n);
 const densities=new Float32Array(n);
 if(signal==='gradient')for(let i=0;i<n;i++){
  let occupied=Number(world.cells[i]>0);
  for(const q of faces[i].neighbors)occupied+=Number(world.cells[q]>0);
  densities[i]=occupied/(faces[i].neighbors.length+1);
 }
 for(let i=0;i<n;i++){
  const tile=faces[i],old=world.cells,v=old[i];
  if(signal==='boundaries'){
   let diff=0;for(const q of tile.neighbors)if(old[q]!==v)diff++;
   out[i]=diff/Math.max(1,tile.neighbors.length);
  }else if(signal==='flow'){
   let vx=0,vy=0,energy=0;
   for(const q of tile.neighbors){
    const change=(old[q]!==previous[q]?1:0)+(previous[q]!==older[q]?0.5:0);
    vx+=(faces[q].centroid[0]-tile.centroid[0])*change;
    vy+=(faces[q].centroid[1]-tile.centroid[1])*change;
    energy+=change;
   }
   out[i]=energy>0&&Math.hypot(vx,vy)>.001
     ?(((Math.atan2(vy,vx)+Math.PI)/(2*Math.PI))%1+1)%1:.035;
  }else if(signal==='gradient'){
   let dx=0,dy=0;
   for(const q of tile.neighbors){
    const nx=faces[q].centroid[0]-tile.centroid[0],
      ny=faces[q].centroid[1]-tile.centroid[1];
    const length=Math.hypot(nx,ny)||1;
    const delta=densities[q]-densities[i];
    dx+=nx/length*delta;dy+=ny/length*delta;
   }
   out[i]=Math.min(1,Math.max(0,Math.hypot(dx,dy)*.55));
  }
 }
 return out;
}
try{
 await Promise.all(modules.map(([entryPoints,outfile])=>build({
  entryPoints:[entryPoints],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {physicalGraph}=await load(2);
 const {penrosePatch}=await load(3);
 const {voronoiPatch}=await load(4);
 const {computeColorSignal}=await load(5);
 const {cyclicAdvance}=await load(6);
 const {snapshotWorld,restoreWorldSnapshot}=await load(7);
 const {exportFrameLayout,renderExportFrame}=await load(8);
 const {createCaptureCursor}=await load(9);
 globalThis.document={createElement(kind){assert.equal(kind,'canvas');return createCanvas(1,1);}};
 const engines=['life','brians','cyclic','generations','excitable','species'];
 let checked=0,frameCount=0,graphCases=0;
 for(const lattice of ['penrose','voronoi']){
  for(const [aspect,seed,jitter] of [
   ['square',17,0],['portrait',72839,.42],['landscape',908,.34]
  ]){
   const shared={...INITIAL_SETTINGS,lattice,aspect,cellCount:32,seed,
    voronoiJitter:jitter,wrap:false,pattern:'noise',density:.54,
    customBirth:[3,5],customSurvive:[2,3,4],lifeRule:'custom',
    brainBirthCount:2,brainBirthMatch:'atLeast',brainStimulus:'off',
    waveStimulus:'off',cyclicDrive:0,cyclicReach:1,
    genBirth:[2,3,4],genSurvive:[2,3],genStates:6,
    exciteStates:6,exciteThreshold:2,speciesCount:4,
    speciesBirth:2,speciesSurvive:1,speciesAttackBias:1};
   const [w,h]=worldDimensions(shared);
   const patch=lattice==='penrose'?penrosePatch(w,h):voronoiPatch(w,h,seed,jitter);
   const graph=physicalGraph(lattice,w,h,seed,jitter);
   assert(graph&&graph.length===w*h);
   assert.strictEqual(graph,physicalGraph(lattice,w,h,seed,jitter),
    'Unchanged geometry reuses the same physical graph across thousands of frames');
   assert.equal(graph.hasPeriodicWrap,false);
   assert.equal(graph.starts.length,w*h+1);
   assert.equal(graph.starts[w*h],graph.edgeIds.length);
   for(let id=0;id<w*h;id++){
    const face=(patch.tiles??patch.cells)[id];
    assert.deepEqual([...graph.edgeIds.subarray(graph.starts[id],graph.starts[id+1])],
     [...face.neighbors],'CSR data matches the source FULL-EDGE geometry without fake nearest-grid cells');
    assert.equal(graph.centerX[id],face.centroid[0]);
    assert.equal(graph.centerY[id],face.centroid[1]);
    for(let k=graph.starts[id];k<graph.starts[id+1];k++){
     const q=graph.edgeIds[k];
     assert((patch.tiles??patch.cells)[q].neighbors.includes(id),'Reciprocal physical edges');
    }
   }
   if(lattice==='voronoi'){
    assert.notStrictEqual(graph,physicalGraph(lattice,w,h,seed+1,jitter),
     'Different seeded worlds MUST NOT share graph geometry');
    if(jitter>0)assert.notStrictEqual(graph,physicalGraph(lattice,w,h,seed,0),
     'Changing jitter invalidates graph geometry');
   }
   graphCases++;
   for(const engine of engines){
    const s={...shared,engine};
    let world=createWorld(s);
    for(let gen=0;gen<8;gen++){
     const before=snapshotWorld(world);
     const expected=oracleStep(world.cells,patch,s,world.generation,cyclicAdvance);
     const after=stepWorld(world,s);
     assert.deepEqual(after.cells,expected.next,'Canonical six-law cell states, no graph physics drift');
     assert.deepEqual(after.neighbors,expected.votes,'Canonical exact neighbor-vote counts');
     assert.equal(after.generation,world.generation+1);
     assert.deepEqual(snapshotWorld(world),before,'Steps never mutate previous snapshot');
     const restored=restoreWorldSnapshot(snapshotWorld(after),s);
     assert.deepEqual(stepWorld(restored,s).cells,stepWorld(after,s).cells);
     if(engine==='cyclic'){
      let changed=0,total=0;
      for(let id=0;id<w*h;id++)for(const q of (patch.tiles??patch.cells)[id].neighbors){
       const a=(world.cells[q]-world.cells[id]+s.cyclicStates)%s.cyclicStates;
       const b=(after.cells[q]-after.cells[id]+s.cyclicStates)%s.cyclicStates;
       if(a!==b)changed++;total++;
      }
      assert(Math.abs(after.stepStructural-(total?changed/total:0))<1e-12);
     }
     if(gen===1){
      for(const signal of ['boundaries','flow','gradient']){
       const result=computeColorSignal(after,INITIAL_APPEARANCE,signal);
       const oracle=oldGraphSignal(after,signal,patch);
       assert(result?.length===oracle.length);
       for(let id=0;id<oracle.length;id++)
        assert(Math.abs(result[id]-oracle[id])<1e-6,
         'Colors must remain EXACT for '+signal+' at '+id+' '+lattice);
      }
      const cursor=createCaptureCursor(world,s,10,10);
      cursor.advance();
      assert.deepEqual(cursor.current.cells,after.cells,'Frame capture exact integer step');
     }
     world=after;checked++;
    }
    if(engine==='life'){
      const sCanvas={...s,aspect};
      const canvas=createCanvas(1,1),scratch=createCanvas(1,1);
      for(const aspectId of ['square','portrait','landscape']){
       const l=exportFrameLayout(sCanvas,720,aspectId,'contain');
       renderExportFrame(canvas,scratch,world,INITIAL_APPEARANCE,l);
       assert.equal(canvas.width,l.width);assert.equal(canvas.height,l.height);
       const png=canvas.toBuffer('image/png');
       assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
       frameCount++;
      }
    }
   }
   console.log('PASS D4B '+lattice+'/'+aspect+' seed '+seed+' · 6 engines × 8 exact steps, 3 signals, graph/PNG/replay');
  }
 }
 assert.equal(physicalGraph('square',32,32),null);
 console.log('PASS D4B '+graphCases+' independent graph patches, '+checked+
  ' full canonical steps, '+frameCount+' physical resolution frames; no fake wrap/seed or jitter collisions');
}finally{
 await Promise.all(modules.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
