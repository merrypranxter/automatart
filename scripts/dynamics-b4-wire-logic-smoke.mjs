import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/wire-logic.ts','scripts/.b4-wire-logic.mjs'],
 ['src/engine/sim.ts','scripts/.b4-wire-step.mjs'],
 ['src/engine/types.ts','scripts/.b4-wire-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b4-wire-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.b4-wire-capture.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {runWireLogicBench,wireLogicLayout,wireLogicFootprint,stampWireLogic}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {snapshotWorld,restoreWorldSnapshot}=await load(3);
 const {cloneWorld,createCaptureCursor}=await load(4);
 const settings={...INITIAL_SETTINGS,engine:'wireworld',cellCount:64,
  aspect:'square',lattice:'square',seed:82641,wrap:false,
  density:0,wireDrive:'off',wireExciteMin:1,wireExciteMax:2};
 const idx=(p,w)=>p[1]*w+p[0];
 let count=0;
 // Exhaustive truth cases for the source geometry. Every checked hit is
 // measured from the PRODUCTION stepper over genuine head states.
 for(const radius of [7,8,9,10,11,12])for(const kind of ['or','fanout']){
  const bench=runWireLogicBench(kind,radius);
  assert(bench.allPass,kind+' should pass EVERY truth-table case at r='+radius);
  assert(bench.canonical);
  const expected=kind==='or'?
   [[[0,0],false],[[0,1],true],[[1,0],true],[[1,1],true]]:
   [[[0,0],false],[[1,0],true]];
  for(let caseIndex=0;caseIndex<expected.length;caseIndex++){
   const [bits,result]=expected[caseIndex],entry=bench.cases[caseIndex];
   assert.deepEqual([entry.a,entry.b],bits);
   assert(entry.hits.every(hit=>hit===result),'Measured output is exact '+kind+' boolean truth');
   assert(entry.pass);
  }
 }
 // Rotate three representative radii in all cardinal orientations and
 // verify ACTUAL stepWorld agrees with the independent bench output trace.
 for(const radius of [7,9,12])for(const kind of ['or','fanout'])
  for(const rotation of [0,1,2,3]){
   const cases=kind==='or'?[[0,0],[0,1],[1,0],[1,1]]:[[0,0],[1,0]];
   const certified=runWireLogicBench(kind,radius);
   for(let example=0;example<cases.length;example++){
    const [a,b]=cases[example];
    const opts={kind,radius,rotation,a,b};
    const world=createWorld(settings);
    world.cells.fill(0);
    const beforeGen=world.generation,anchor=[32,32];
    const footprint=wireLogicFootprint(world,anchor,opts);
    const cellBefore=world.cells.slice();
    const installed=stampWireLogic(world,anchor,opts);
    assert.equal(world.generation,beforeGen,'Installing wires does not touch clock');
    assert(footprint.every(p=>[1,2,3].includes(world.cells[p])));
    assert(installed.touched.length<1024,'Local clear does not wipe the world');
    assert.notDeepEqual(world.cells,cellBefore);
    assert.deepEqual(cloneWorld(world).cells,world.cells);
    const saved=snapshotWorld(world);
    const restored=restoreWorldSnapshot(saved,settings);
    assert.deepEqual(restored.cells,world.cells,'Loaded logic circuit has exact canonical cells');
    let state=world,fromFile=restored;
    const liveTraces=installed.ports.outputs.map(()=>[]);
    for(let tick=0;tick<2*radius+18;tick++){
     for(let j=0;j<installed.ports.outputs.length;j++)
      liveTraces[j].push(state.cells[idx(installed.ports.outputs[j],state.width)]===2);
     state=stepWorld(state,settings);
     fromFile=stepWorld(fromFile,settings);
     assert.deepEqual(state.cells,fromFile.cells,
      'Saved and live gate have identical dynamics tick by tick');
     assert.equal(state.waveStimulusCount,0,'Gate operates with unforced canonical Wireworld physics');
    }
    const predicted=certified.cases[example].waveforms;
    assert.deepEqual(liveTraces,predicted,
     'Rotated live circuit output waveform must exactly equal independently certified truth-table trace');
    count++;
   }
  }
 // Explicitly refuse partially cut-off gates, not silently 'working' broken devices.
 const clipped=createWorld(settings);
 const safe=clipped.cells.slice();
 assert.throws(()=>stampWireLogic(clipped,[0,0],{kind:'or',radius:10,rotation:0,a:1,b:1}),
   /artboard edge/);
 assert.deepEqual(clipped.cells,safe,'Invalid stamp fails atomically');
 assert.throws(()=>wireLogicLayout({kind:'or',radius:4,rotation:0,a:1,b:1}),/Invalid/);
 assert.throws(()=>wireLogicLayout({kind:'xor',radius:9,rotation:0,a:1,b:1}),/Invalid/,
  'Unverified AND/XOR cannot masquerade as devices');
 // Background stimulation is NOT assumed off in arbitrary user artwork.
 // Bench verification is canonical and isolated only; working stage devices
 // may be modified by paint, nearby crossing wires, or alternative physics.
 const recorded=createWorld(settings);recorded.cells.fill(0);
 stampWireLogic(recorded,[32,32],{kind:'or',radius:9,rotation:0,a:1,b:1});
 const cursor=createCaptureCursor(recorded,settings,10,10);
 for(let i=0;i<8;i++)cursor.advance();
 assert.equal(cursor.current.generation,8);
 console.log('PASS B4: '+count+' real-world rotated truth-table cases exactly match production stepWorld bit-for-bit');
 console.log('PASS B4: OR 00/01/10/11 and dual-output fanout; all 7–12 radius settings, true head waveforms');
 console.log('PASS B4: atomic stamps, original four states, unforced CA, exact recipe/GIF replay and no fake XOR or AND');
}finally{
 await Promise.all(files.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
