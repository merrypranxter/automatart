import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/wire-logic.ts','scripts/.b7-logic.mjs'],
 ['src/engine/wire-inhibition.ts','scripts/.b7-inhibition.mjs'],
 ['src/engine/sim.ts','scripts/.b7-sim.mjs'],
 ['src/engine/types.ts','scripts/.b7-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b7-snap.mjs'],
 ['src/engine/wire-signal-scope.ts','scripts/.b7-scope.mjs'],
 ['src/engine/capture.ts','scripts/.b7-capture.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const get=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {wireLogicLayout,runWireLogicBench,stampWireLogic,wireLogicFootprint}=await get(0);
 const {inspectWireInhibition}=await get(1);
 const {stepWorld,createWorld}=await get(2);
 const {INITIAL_SETTINGS}=await get(3);
 const {restoreWorldSnapshot,snapshotWorld}=await get(4);
 const {forecastWireSignals}=await get(5);
 const {createCaptureCursor}=await get(6);
 const s={...INITIAL_SETTINGS,engine:'wireworld',lattice:'square',cellCount:72,
  aspect:'square',wrap:false,seed:1982,density:0,
  wireExciteMin:1,wireExciteMax:2,wireDrive:'off'};
 const indices=(pt,w)=>pt[1]*w+pt[0];
 let integrated=0,isolated=0,longHorizon=0;
 for(const radius of [7,8,9,10,11,12])for(const kind of ['nand','not']){
  const bench=runWireLogicBench(kind,radius);
  assert(bench.allPass,kind+' 1..2-head full truth table failed at radius '+radius);
  const bits=kind==='nand'?[[0,0],[0,1],[1,0],[1,1]]:[[0,0],[1,0]];
  const truth=kind==='nand'?[true,true,true,false]:[true,false];
  assert.deepEqual(bench.cases.map(v=>v.hits[0]),truth);
  for(const [index,[a,b]] of bits.entries()){
   const expected=truth[index],trace=inspectWireInhibition(kind,radius,a,b);
   const junctionHeads=kind==='nand'?1+a+b:2+a;
   assert.equal(trace.neighborHeads[0],junctionHeads,
    'The source input truth is a genuine 8-neighbor HEAD count, not a Boolean shortcut');
   assert.equal(trace.junctionStates[0],1,'Junction begins as actual conductor');
   assert.equal(trace.junctionStates[1],expected?2:1,
    'Actual head suppression must agree with original production physics');
   assert.deepEqual(trace.outputHeadTicks,expected?[radius+1]:[],
    'Exactly one true output pulse in the appropriate case; NO late false positives');
   assert.equal(trace.exact,true);
   assert.deepEqual(bench.cases[index].waveforms[0].flatMap((yes,t)=>yes?[t]:[]),
    trace.outputHeadTicks,'Independent bench and collision microscope observe the same true HEADS');
   isolated++;
  }
 }
 // Full actual-world rotation tests, output traces and recipe replay through
 // canonical production stepWorld. Every logical case and all 6 radii.
 for(const radius of [7,8,9,10,11,12])for(const kind of ['nand','not'])
  for(const rotation of [0,1,2,3]){
   const truth=runWireLogicBench(kind,radius);
   for(const example of truth.cases){
    const opts={kind,radius,rotation,a:example.a,b:example.b};
    let world=createWorld(s);world.cells.fill(0);
    const anchor=[36,36],before=world.cells.slice(),g0=world.generation;
    const footprint=wireLogicFootprint(world,anchor,opts);
    const stamp=stampWireLogic(world,anchor,opts);
    assert.equal(world.generation,g0,'Stamping wires is a manual input, not a universe step');
    assert(footprint.length>=radius+3,'Real multi-site emitter and diagonal output must exist');
    assert(stamp.touched.length<1024,'Only a bounded local area may be cleared');
    assert.notDeepEqual(before,world.cells);
    for(let i=0;i<world.cells.length;i++)assert(world.cells[i]<=3,'Only canonical four states');
    let reloaded=restoreWorldSnapshot(snapshotWorld(world),s);
    assert.deepEqual(reloaded.cells,world.cells);
    const path=stamp.ports.outputs[0],p=indices(path,world.width);
    const actual=[];
    const duration=2*radius+60;
    for(let tick=0;tick<duration;tick++){
     if(world.cells[p]===2)actual.push(tick);
     world=stepWorld(world,s);reloaded=stepWorld(reloaded,s);
     assert.equal(world.waveStimulusCount,0,'Gate must be unforced original Wireworld');
    }
    assert.deepEqual(actual,example.hits[0]?[radius+1]:[],
     'Do not advertise NAND/NOT with delayed spurious HEADS');
    assert.deepEqual(world.cells,reloaded.cells,'Saved recipe and live isolated world replay bit-exactly');
    integrated++;
   }
  }
 // The nondestructive future oscilloscope must also see the new real port.
 for(const kind of ['nand','not']){
  const world=createWorld(s);world.cells.fill(0);
  const opts={kind,radius:10,rotation:0,a:kind==='nand'?1:0,b:1};
  const stamp=stampWireLogic(world,[36,36],opts),port=stamp.ports.outputs[0];
  const before=world.cells.slice(),generation=world.generation;
  const result=forecastWireSignals(world,s,[{label:'GATE',x:port[0],y:port[1]}],64);
  assert.deepEqual(result.traces[0].headTicks,kind==='nand'?[]:[11]);
  assert.deepEqual(before,world.cells,'The physics scope never mutates artwork');
  assert.equal(generation,world.generation);
  const cursor=createCaptureCursor(world,s,20,20);cursor.advance();
  assert.equal(cursor.current.generation,1);
  longHorizon++;
 }
 // A visually plausible AND or crossover is not a verified component.
 assert.throws(()=>wireLogicLayout({kind:'and',radius:9,rotation:0,a:1,b:1}),/Invalid/);
 assert.throws(()=>wireLogicLayout({kind:'crossover',radius:9,rotation:0,a:1,b:1}),/Invalid/);
 const clipped=createWorld(s),pixels=clipped.cells.slice();
 assert.throws(()=>stampWireLogic(clipped,[0,0],{kind:'nand',radius:9,rotation:0,a:0,b:0}),/artboard edge/);
 assert.deepEqual(clipped.cells,pixels,'Failed edge stamp must leave canvas unmodified');
 console.log('PASS B7: '+isolated+' physical bias-contact truth rows, junction HEAD census and NO late phantom outputs');
 console.log('PASS B7: '+integrated+' rotated NAND and NOT real-world 70+ generation histories and exact JSON replay');
 console.log('PASS B7: '+longHorizon+' immutable 64-tick live-world signal scopes; no fake AND or crossover');
}finally{
 await Promise.all(jobs.map(([,filename])=>unlink(resolve(filename)).catch(()=>{})));
}
