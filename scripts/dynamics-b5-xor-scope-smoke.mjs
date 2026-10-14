import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/wire-logic.ts','scripts/.b5-logic.mjs'],
 ['src/engine/wire-signal-scope.ts','scripts/.b5-scope.mjs'],
 ['src/engine/sim.ts','scripts/.b5-sim.mjs'],
 ['src/engine/types.ts','scripts/.b5-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b5-snapshot.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,platform:'node',format:'esm',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {runWireLogicBench,wireLogicLayout,wireLogicFootprint,stampWireLogic}=await load(0);
 const {forecastWireSignals}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const settings={...INITIAL_SETTINGS,engine:'wireworld',cellCount:64,
   lattice:'square',aspect:'square',seed:82641,wrap:false,density:0,
   wireDrive:'off',wireExciteMin:1,wireExciteMax:2};
 let total=0;
 const index=(pt,w)=>pt[1]*w+pt[0];
 for(const radius of [7,8,9,10,11,12]){
  const bench=runWireLogicBench('xor',radius);
  assert.equal(bench.allPass,true,'XOR must be mathematically verified for every available radius');
  assert.deepEqual(bench.cases.map(c=>c.hits[0]),[false,true,true,false],
   'XOR truth table is exactly 00=0, 01=1, 10=1, 11=0');
  for(const row of bench.cases){
   assert.equal(row.waveforms.length,1,'XOR has one real remote output');
   assert.equal(row.headTicks,undefined);
   if(row.a!==row.b){
    assert.deepEqual(row.firstTick,[radius+1],
      'XOR output arrives one diagonal cell per generation, with center firing at tick one');
    assert.equal(row.waveforms[0].filter(Boolean).length,1,
      'A single asserted dual-contact input creates ONE output pulse, not decorative periodic flashes');
   }else assert(row.waveforms[0].every(v=>!v),
    'Two asserted bits have four adjacent heads and BLOCK the output entirely');
   const layout=wireLogicLayout({kind:'xor',radius,rotation:0,a:row.a,b:row.b});
   assert.equal(layout.heads.length,2*(row.a+row.b),
    'One Boolean input is encoded by two real simultaneous HEAD cells');
   assert.equal(layout.tails.length,0,
    'Physical dual-contact trigger is not falsely claimed to be a 1-electron head/tail pair');
  }
  for(const rotation of [0,1,2,3])for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]]){
   const opts={kind:'xor',radius,rotation,a,b};
   let world=createWorld(settings);
   world.cells.fill(0);
   const start=world.generation,anchor=[32,32];
   const footprint=wireLogicFootprint(world,anchor,opts);
   assert(footprint.length>radius,'Gate has a nontrivial real conductor diagonal');
   const stamped=stampWireLogic(world,anchor,opts);
   assert.equal(world.generation,start);
   assert(stamped.touched.length<1000,'Only a local region is reset for isolated gate placement');
   const imported=restoreWorldSnapshot(snapshotWorld(world),settings);
   assert.deepEqual(imported.cells,world.cells);
   const cases=runWireLogicBench('xor',radius).cases;
   const expected=cases.find(c=>c.a===a&&c.b===b);
   assert(expected);
   const measured=[];
   for(let tick=0;tick<expected.waveforms[0].length;tick++){
    measured.push(world.cells[index(stamped.ports.outputs[0],world.width)]===2);
    world=stepWorld(world,settings);
    const reproduced=stepWorld(imported,settings);
    imported.cells=reproduced.cells;imported.generation=reproduced.generation;
    assert.deepEqual(world.cells,imported.cells,'XOR saved recipe follows EXACT same cellular law');
    assert.equal(world.waveStimulusCount,0,'Certified XOR is unforced canonical Wireworld');
   }
   assert.deepEqual(measured,expected.waveforms[0],
    'Every rotated real-world output matches exact XOR truth table, generation by generation');
   total++;
  }
 }
 const cellWorld=createWorld(settings);cellWorld.cells.fill(0);
 const site=[32,32],output=[40,24];
 stampWireLogic(cellWorld,site,{kind:'xor',radius:8,rotation:0,a:1,b:0});
 const original=cellWorld.cells.slice(),gen=cellWorld.generation;
 const probes=[{label:'CENTER',x:32,y:32},{label:'OUTPUT',x:40,y:24}];
 for(const steps of [16,32,64]){
  const projection=forecastWireSignals(cellWorld,settings,probes,steps);
  assert.equal(projection.horizon,steps);
  assert.equal(projection.fromGeneration,gen);
  assert.equal(projection.driven,false);
  let copy=restoreWorldSnapshot(snapshotWorld(cellWorld),settings);
  for(let i=0;i<steps;i++){
   for(const [j,p] of probes.entries()){
    const state=copy.cells[index([p.x,p.y],copy.width)];
    assert.equal(projection.traces[j].states[i],state,
     'Scope is EXACT at tick '+i+' state '+state+' under original production stepper');
   }
   copy=stepWorld(copy,settings);
  }
  assert.deepEqual(cellWorld.cells,original,'Future probe never mutates live current universe');
  assert.equal(cellWorld.generation,gen,'Future scan cannot advance canvas clock');
  assert.deepEqual(projection.traces[1].headTicks,[9],'Real XOR port emits one physical pulse at tick 9');
 }
 for(const drive of ['clock','sparks']){
  const s={...settings,wireDrive:drive,wirePeriod:6,wireSparkRate:.01,wireSource:'center'};
  const projection=forecastWireSignals(cellWorld,s,probes,32);
  assert.equal(projection.driven,true,'Probe includes opt-in source rather than pretending all signals are pure');
  let next=cellWorld;
  for(let t=0;t<32;t++){
   for(let j=0;j<probes.length;j++)
    assert.equal(projection.traces[j].states[t],next.cells[index([probes[j].x,probes[j].y],next.width)]);
   next=stepWorld(next,s);
  }
 }
 assert.throws(()=>forecastWireSignals(cellWorld,settings,[],12),/between one and four/);
 assert.throws(()=>forecastWireSignals(cellWorld,settings,probes,65),/horizon/);
 assert.throws(()=>forecastWireSignals(cellWorld,settings,[{label:'out',x:999,y:0}],12),/Invalid/);
 assert.throws(()=>wireLogicLayout({kind:'and',radius:9,rotation:0,a:1,b:1}),/Invalid/,
  'Do not silently advertise unverified AND structures');
 console.log('PASS B5: canonical true-cell XOR 00/01/10/11 for six radii and four rotations: '+total+' exact whole-world waveform cases');
 console.log('PASS B5: XOR dual-contact one-shot operation and physical four-head suppression; exact recipe replay');
 console.log('PASS B5: 16/32/64 tick scope samples real isolated and driven four-state physics without changing live art');
}finally{
 await Promise.all(jobs.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
