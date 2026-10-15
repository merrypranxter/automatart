import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/wire-cascade.ts','scripts/.b9-cascade.mjs'],
 ['src/engine/sim.ts','scripts/.b9-sim.mjs'],
 ['src/engine/types.ts','scripts/.b9-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b9-snapshot.mjs'],
 ['src/engine/wire-signal-scope.ts','scripts/.b9-scope.mjs'],
 ['src/engine/capture.ts','scripts/.b9-capture.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {validWireCascade,wireCascadeLayout,wireCascadeFootprint,stampWireCascade,runWireCascadeBench}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {snapshotWorld,restoreWorldSnapshot}=await load(3);
 const {forecastWireSignals}=await load(4);
 const {createCaptureCursor}=await load(5);
 const s={...INITIAL_SETTINGS,engine:'wireworld',cellCount:72,aspect:'square',
  lattice:'square',density:0,seed:1982,wrap:false,
  wireDrive:'off',wireExciteMin:1,wireExciteMax:2};
 const at=(p,w)=>p[1]*w+p[0];
 let benchCount=0,stageCases=0,fullCount=0;
 // Certified isolated full four-state NAND -> traveling signal -> physically
 // synchronized NOT with two independent bias arms. No Boolean evaluation
 // drives cell steps or determines the observed tick arrays.
 for(let radius=7;radius<=12;radius++)for(const outLength of [5,8,12]){
  const bench=runWireCascadeBench(radius,outLength);
  assert(bench.allPass,'Physical cascade must pass every input pair '+radius+'/'+outLength);
  assert.deepEqual(bench.cases.map(row=>Number(row.outputTicks.length>0)),[0,0,0,1],
   'Remote output is true AND, with no late spurious electron arrivals');
  for(const row of bench.cases){
   const nandExpected=row.a&&row.b?[radius+3]:[radius+1];
   assert.equal(row.nandForward,!(row.a&&row.b),
    'Only the decision-time NAND wave counts as forward output; late returns are genuine wire feedback');
   assert.deepEqual(row.nandFeedbackTicks,row.a&&row.b?[radius+3]:[]);
   const secondExpected=row.a&&row.b?[radius+2]:[];
   const andExpected=row.a&&row.b?[radius+2+outLength]:[];
   assert.deepEqual(row.nandTicks,nandExpected,'Probe records true forward NAND and any late reverse-propagating HEAD');
   assert.deepEqual(row.biasTicks,[[radius+1],[radius+1]],
    'Two real independent bias electron waves MUST arrive in the NAND signal window');
   assert.deepEqual(row.secondStageTicks,secondExpected,
    'Second stage must compute inhibition from THREE vs TWO traveling HEADS');
   assert.deepEqual(row.outputTicks,andExpected);
   assert.deepEqual(row.expectedOutputTicks,andExpected);
   benchCount++;
  }
 }
 // Embedded in the full production canvas, four rotations, multiple radii,
 // three output conductor lengths, every Boolean case. No pre-programmed
 // outputs are allowed, and real snapshots must replay bit-identically.
 for(const radius of [7,9,12])for(const outputLength of [5,8,12])
  for(const rotation of [0,1,2,3])for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]]){
   const options={radius,outputLength,rotation,a,b},anchor=[36,36];
   assert(validWireCascade(options));
   let world=createWorld(s);world.cells.fill(0);
   const startGen=world.generation;
   const stamp=stampWireCascade(world,anchor,options);
   assert.equal(world.generation,startGen,'Installing a cascade cannot reset universe time');
   assert(stamp.touched.length<2500&&stamp.touched.length>100,
    'A complete two-stage cascade fits a LOCAL bounding box, not entire world');
   const original=world.cells.slice();
   assert.equal(wireCascadeFootprint(world,anchor,options).every(i=>[1,2,3].includes(world.cells[i])),true);
   let replay=restoreWorldSnapshot(snapshotWorld(world),s);
   assert.deepEqual(world.cells,replay.cells,'Recipe encodes exact initialized two-stage physical device');
   const sampled={nand:[],inverter:[],bias0:[],bias1:[],output:[]};
   const tickLimit=2*radius+outputLength+32;
   for(let tick=0;tick<tickLimit;tick++){
    if(world.cells[at(stamp.ports.nand,world.width)]===2)sampled.nand.push(tick);
    if(world.cells[at(stamp.ports.inverter,world.width)]===2)sampled.inverter.push(tick);
    if(world.cells[at(stamp.ports.biases[0],world.width)]===2)sampled.bias0.push(tick);
    if(world.cells[at(stamp.ports.biases[1],world.width)]===2)sampled.bias1.push(tick);
    if(world.cells[at(stamp.ports.output,world.width)]===2)sampled.output.push(tick);
    world=stepWorld(world,s);replay=stepWorld(replay,s);
    assert.equal(world.waveStimulusCount,0,'No external fake gate injections');
   }
   const expected=runWireCascadeBench(radius,outputLength).cases.find(row=>row.a===a&&row.b===b);
   assert(expected);
   assert.deepEqual(sampled.nand,expected.nandTicks,
    'Live physical NAND output equals truly simulated isolated stage one');
   assert.deepEqual(sampled.inverter,expected.secondStageTicks);
   assert.deepEqual([sampled.bias0,sampled.bias1],expected.biasTicks,
    'Independent traveling bias HEADS really meet at stage two');
   assert.deepEqual(sampled.output,expected.outputTicks,
    'Real production stepWorld gate output matches exhaustive AND truth table');
   assert.deepEqual(world.cells,replay.cells,'Full future evolution from saved recipe identical');
   if(a===1&&b===1){
    assert.notDeepEqual(original,world.cells);
    fullCount++;
   }
   stageCases++;
  }
 // Full future inspector must detect BOTH cascaded gates without changing
 // any source art, no hidden changes in seed or generation.
 const world=createWorld(s);world.cells.fill(0);
 const ports=stampWireCascade(world,[36,36],{radius:9,outputLength:8,rotation:0,a:1,b:1}).ports;
 const unchanged=world.cells.slice(),gen=world.generation;
 const points=[
  {label:'NAND',x:ports.nand[0],y:ports.nand[1]},
  {label:'STAGE 2',x:ports.inverter[0],y:ports.inverter[1]},
  {label:'BIAS',x:ports.biases[0][0],y:ports.biases[0][1]},
  {label:'AND',x:ports.output[0],y:ports.output[1]}
 ];
 const scope=forecastWireSignals(world,s,points,64);
 assert.deepEqual(scope.traces.map(t=>t.headTicks),[[12],[11],[10],[19]],
  'Read-only scope captures both stages, timed bias AND reverse HEAD feedback after AND fires');
 assert.deepEqual(world.cells,unchanged);
 assert.equal(world.generation,gen);
 const captured=createCaptureCursor(world,s,20,20);captured.advance();
 assert.equal(captured.current.generation,1);
 assert.throws(()=>wireCascadeLayout({radius:6,outputLength:8,rotation:0,a:1,b:1}),
  /Invalid/);
 assert.throws(()=>wireCascadeLayout({radius:9,outputLength:13,rotation:0,a:1,b:1}),
  /Invalid/);
 const small=createWorld({...s,cellCount:48});small.cells.fill(0);
 const unmodified=small.cells.slice(),options={radius:12,outputLength:12,rotation:0,a:1,b:1};
 assert.throws(()=>stampWireCascade(small,[24,24],options),/clipped/);
 assert.deepEqual(small.cells,unmodified,'Refuse partially clipped gate before any edits');
 console.log('PASS B9: '+benchCount+' isolated genuinely cascaded AND cases and '+stageCases+' rotated integrated true-cell worlds');
 console.log('PASS B9: synchronized independent bias waves, physical NAND/NOT feedback, exact AND port timing and 0 false pulses');
 console.log('PASS B9: '+fullCount+' real 11 gate firings, recipe-bit-exact replay, safe clipping and unmodified four-site future scope');
}finally{
 await Promise.all(files.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
