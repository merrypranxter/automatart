import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/wire-timing.ts','scripts/.b6-timing.mjs'],
 ['src/engine/wire-signal-scope.ts','scripts/.b6-scope.mjs'],
 ['src/engine/sim.ts','scripts/.b6-sim.mjs'],
 ['src/engine/types.ts','scripts/.b6-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b6-snap.mjs'],
 ['src/engine/capture.ts','scripts/.b6-capture.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {runWireTimingBench,wireTimingLayout,wireTimingFootprint,stampWireTiming,
  expectedTimingTicks}=await load(0);
 const {forecastWireSignals}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {createCaptureCursor}=await load(5);
 const s={...INITIAL_SETTINGS,engine:'wireworld',cellCount:64,aspect:'square',
  lattice:'square',wrap:false,wireDrive:'off',wireExciteMin:1,wireExciteMax:2,
  density:0,seed:82641};
 let theoretical=0,integrated=0,measured=0;
 // All geometry modes, shortest/longest paths and delay offsets:
 for(const kind of ['delay','lanes','train'])for(const r of [7,9,12])
  for(const offset of [0,3,6,12]){
   if(kind==='train'&&offset<3)continue;
   const bench=runWireTimingBench(kind,r,offset);
   assert(bench.allPass,'All genuine signal pulse arrivals must match precise wire lengths '+kind+'/'+r+'/'+offset);
   const cases=kind==='delay'?[[0,0],[1,0]]:[[0,0],[0,1],[1,0],[1,1]];
   assert.equal(bench.cases.length,cases.length);
   for(let i=0;i<cases.length;i++){
    const {a,b,actualTicks,expectedTicks,pass}=bench.cases[i];
    assert.deepEqual([a,b],cases[i]);
    assert(pass);
    assert.deepEqual(actualTicks,expectedTimingTicks(kind,r,offset,a,b),
     'Output pulse timing is derived from real propagation, not a runtime counter');
    assert.deepEqual(actualTicks,expectedTicks);
    if(kind==='train'&&a&&b)
     assert.deepEqual(actualTicks[0],[2*r-1,2*r+offset-1],
      'Two simultaneous seeded inputs become two time-separated HEAD events on one rail');
    if(kind==='lanes'&&a&&b)
     assert.equal(actualTicks[1][0]-actualTicks[0][0],offset,
      'Extra physical conductor length equals measured lane skew');
    theoretical++;
   }
  }
 // Rotated, real-world proof through production stepWorld. Starting cells
 // are generated ONCE, installed as a local art edit, then run naturally.
 for(const kind of ['delay','lanes','train'])for(const radius of [7,12])
  for(const offset of [kind==='train'?3:0,12]){
   const bench=runWireTimingBench(kind,radius,offset);
   for(const rotation of [0,1,2,3])for(const entry of bench.cases){
    const opts={kind,radius,offset,rotation,a:entry.a,b:entry.b};
    let world=createWorld(s);world.cells.fill(0);
    const clean=world.cells.slice(),anchor=[32,32];
    const ids=wireTimingFootprint(world,anchor,opts);
    assert(ids.length>10);
    const {outputs,inputs,touched}=stampWireTiming(world,anchor,opts);
    assert.equal(world.generation,0,'Stamp is an art edit, never a hidden simulation step');
    assert.notDeepEqual(world.cells,clean,'Stamp writes genuine conductive cells');
    assert(touched.length<1400,'Clearance affects local cells only, no full-artboard wipe');
    assert.equal(outputs.length,kind==='lanes'?2:1);
    assert.equal(inputs.length,kind==='delay'?1:2);
    assert(ids.every(id=>[1,2,3].includes(world.cells[id])));
    const snapshot=snapshotWorld(world);
    let imported=restoreWorldSnapshot(snapshot,s);
    assert.deepEqual(world.cells,imported.cells);
    const actual=outputs.map(()=>[]);
    const horizon=2*radius+offset+5;
    for(let tick=0;tick<horizon;tick++){
     for(let j=0;j<outputs.length;j++)if(world.cells[outputs[j][1]*world.width+outputs[j][0]]===2)
      actual[j].push(tick);
     world=stepWorld(world,s);imported=stepWorld(imported,s);
     assert.equal(world.waveStimulusCount,0,'Pure original Wireworld; no forced signal sources');
     if(tick===horizon-1)assert.deepEqual(world.cells,imported.cells,
      'Recipe restore and live progression must agree bit-for-bit');
    }
    assert.deepEqual(actual,entry.actualTicks,
     'Rotated on-stage HEAD histories equal genuinely simulated isolated bench');
    integrated++;
   }
  }
 // Scope is the real-world clock comparator, not a fake AND gate.
 let stamped=createWorld(s);stamped.cells.fill(0);
 const route={kind:'lanes',radius:9,offset:7,rotation:0,a:1,b:1};
 const stamp=stampWireTiming(stamped,[32,32],route);
 const original=stamped.cells.slice(),generation=stamped.generation;
 const points=stamp.outputs.map(([x,y],i)=>({label:'LANE '+(i+1),x,y}));
 for(const horizon of [16,32,64]){
  const forecast=forecastWireSignals(stamped,s,points,horizon);
  assert.equal(forecast.fromGeneration,generation);
  assert.equal(forecast.horizon,horizon);
  let next=restoreWorldSnapshot(snapshotWorld(stamped),s);
  for(let tick=0;tick<horizon;tick++){
   for(let i=0;i<points.length;i++){
    const point=points[i],id=point.y*next.width+point.x;
    assert.equal(forecast.traces[i].states[tick],next.cells[id],
     'Physical HEAD/TAIL states match production evolution at tick '+tick);
   }
   next=stepWorld(next,s);
  }
  if(horizon>=32)assert.deepEqual(forecast.traces.map(v=>v.firstHead),[17,24],
   'True 7-cell lane skew, not a visual time-offset trick');
  assert.deepEqual(stamped.cells,original,'Scope must never paint over the universe');
  assert.equal(stamped.generation,generation,'Scope must never advance actual generation');
  measured++;
 }
 assert.throws(()=>stampWireTiming(stamped,[0,0],route),/clipped/);
 assert.deepEqual(stamped.cells,original,'Clipped route placement fails atomically');
 assert.throws(()=>wireTimingLayout({...route,kind:'train',offset:2}),/Invalid/);
 const captured=createCaptureCursor(stamped,s,10,10);
 for(let i=0;i<8;i++)captured.advance();
 assert.equal(captured.current.generation,8);
 console.log('PASS B6: '+theoretical+' canonical routing bench cases + '+integrated+' physically rotated live-world port histories');
 console.log('PASS B6: verified physical length=delay, isolated lane skew, two distinct HEAD pulses, exact recipe replay');
 console.log('PASS B6: '+measured+' nondestructive real-state scope parity scans and no false AND/crossover claim');
}finally{
 await Promise.all(jobs.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
