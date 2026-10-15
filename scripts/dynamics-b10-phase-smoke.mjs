import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/wire-phase-lab.ts','scripts/.b10-phase.mjs'],
 ['src/engine/wire-cascade.ts','scripts/.b10-cascade.mjs'],
 ['src/engine/sim.ts','scripts/.b10-sim.mjs'],
 ['src/engine/types.ts','scripts/.b10-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b10-snap.mjs'],
 ['src/engine/wire-signal-scope.ts','scripts/.b10-scope.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {measureWirePhase,sweepWirePhaseNW}=await load(0);
 const {wireCascadeLayout,stampWireCascade,wireCascadeFootprint,
  runWireCascadeBench,validWireCascade}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {forecastWireSignals}=await load(5);
 const s={...INITIAL_SETTINGS,engine:'wireworld',cellCount:72,aspect:'square',
  lattice:'square',density:0,seed:1982,wrap:false,
  wireDrive:'off',wireExciteMin:1,wireExciteMax:2};
 const index=(p,w)=>p[1]*w+p[0];
 let predicted=0,integrated=0,snapshotCases=0;
 // The B9 verified circuit is not allowed to drift by even a single cell.
 for(let radius=7;radius<=12;radius++)for(const outputLength of [5,8,12]){
  const original=runWireCascadeBench(radius,outputLength);
  const phase=measureWirePhase(radius,outputLength,0,0);
  assert(original.allPass);
  assert(phase.observedAND,'Zero shift must equal precisely verified B9 AND at every supported size');
  assert.equal(phase.truth,'0001');
  assert(phase.synchronized);
  for(let i=0;i<4;i++){
   assert.deepEqual(phase.rows[i].nandTicks,original.cases[i].nandTicks);
   assert.deepEqual(phase.rows[i].stage2Ticks,original.cases[i].secondStageTicks);
   assert.deepEqual([phase.rows[i].biasNWTicks,phase.rows[i].biasNETicks],
    original.cases[i].biasTicks);
   assert.deepEqual(phase.rows[i].outputTicks,original.cases[i].outputTicks);
   predicted++;
  }
 }
 // Deliberately desynchronize either physical bias rail by removing/adding
 // 1/2/3 ACTUAL conductor segments. Never force a truth fingerprint.
 const fingerprints=new Set();
 for(const nw of [-3,-2,-1,0,1,2,3])for(const ne of [-3,-1,0,1,3]){
  const config={radius:9,outputLength:8,rotation:0,a:1,b:1,
   biasNWShift:nw,biasNEShift:ne};
  assert(validWireCascade(config));
  const layout=wireCascadeLayout(config);
  assert(layout.heads.length>=3,'Two genuine bias source HEADS + one NAND bias');
  const bench=measureWirePhase(9,8,nw,ne);
  assert.equal(bench.rows.length,4);
  assert.equal(bench.truth.length,4);
  assert(/^[01]{4}$/.test(bench.truth));
  assert.deepEqual(bench.rows.map(row=>[row.a,row.b]),[[0,0],[0,1],[1,0],[1,1]]);
  if(nw===0&&ne===0)assert.equal(bench.truth,'0001');
  assert.equal(bench.synchronized,nw===0&&ne===0);
  fingerprints.add(bench.truth+'|'+bench.rows[3].outputTicks.join(','));
  for(const row of bench.rows){
   // The arrival is measured in actual grid time, not given from a slider.
   // Feedback can generate additional legitimate later HEAD events.
   assert(row.biasNWTicks.includes(10+nw),
    'NW initial HEAD travels its actual conductor length to real contact');
   assert(row.biasNETicks.includes(10+ne),
    'NE initial HEAD travels its actual conductor length to real contact');
   predicted++;
  }
 }
 assert(fingerprints.size>=2,
  'Phase should lead to at least two physically different output histories');
 // 5 authentic full-world phase scans, explicitly triggered, not on each
 // React rerender; outcomes match the direct bench byte-for-byte.
 for(const ne of [-2,0,2]){
  const scanned=sweepWirePhaseNW(9,8,ne);
  assert.equal(scanned.length,5);
  assert.deepEqual(scanned.map(row=>row.nwShift),[-2,-1,0,1,2]);
  for(const result of scanned){
   const bench=measureWirePhase(9,8,result.nwShift,ne);
   assert.equal(result.truth,bench.truth);
   assert.deepEqual(result.final11Ticks,bench.rows[3].outputTicks);
   assert.equal(result.observedAND,bench.observedAND);
  }
 }
 // Every timed case tested against ORIGINAL production stepWorld on a
 // live 72x72 artwork, rotated and restored through ordinary recipe JSON.
 for(const radius of [7,12])for(const nw of [-3,0,3])for(const ne of [-3,0,3])
  for(const rotation of [0,2])for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]]){
   const config={radius,outputLength:8,rotation,a,b,biasNWShift:nw,biasNEShift:ne};
   let world=createWorld(s);world.cells.fill(0);
   const at=[36,36],start=world.generation;
   const footprint=wireCascadeFootprint(world,at,config);
   const stamp=stampWireCascade(world,at,config);
   assert.equal(world.generation,start);
   assert(footprint.length>20&&stamp.touched.length<3000);
   const previous=world.cells.slice();
   let restored=restoreWorldSnapshot(snapshotWorld(world),s);
   assert.deepEqual(restored.cells,world.cells);
   const observed={nandTicks:[],stage2Ticks:[],biasNWTicks:[],biasNETicks:[],outputTicks:[]};
   const ports=stamp.ports;
   const horizon=2*radius+8+32;
   for(let tick=0;tick<horizon;tick++){
    if(world.cells[index(ports.nand,world.width)]===2)observed.nandTicks.push(tick);
    if(world.cells[index(ports.inverter,world.width)]===2)observed.stage2Ticks.push(tick);
    if(world.cells[index(ports.biases[0],world.width)]===2)observed.biasNWTicks.push(tick);
    if(world.cells[index(ports.biases[1],world.width)]===2)observed.biasNETicks.push(tick);
    if(world.cells[index(ports.output,world.width)]===2)observed.outputTicks.push(tick);
    world=stepWorld(world,s);restored=stepWorld(restored,s);
   }
   const bench=measureWirePhase(radius,8,nw,ne).rows.find(row=>row.a===a&&row.b===b);
   assert(bench);
   assert.deepEqual(observed,bench,
    'Independent whole-world evolution measures the EXACT same 5-site head time-series as isolated phase bench');
   assert.deepEqual(world.cells,restored.cells,'The real delayed conductors replay from JSON bit-exactly');
   assert.deepEqual(previous.length,world.cells.length);
   assert.equal(world.waveStimulusCount,0);
   integrated++;snapshotCases++;
  }
 // Read-only actual stage probe must show independent phase skew without
 // modifying original artwork, seed, generation, or settings.
 const world=createWorld(s);world.cells.fill(0);
 const install=stampWireCascade(world,[36,36],{radius:9,outputLength:8,
  rotation:0,a:1,b:1,biasNWShift:2,biasNEShift:-1});
 const before=world.cells.slice(),generation=world.generation;
 const probes=[
  {label:'NW',x:install.ports.biases[0][0],y:install.ports.biases[0][1]},
  {label:'NE',x:install.ports.biases[1][0],y:install.ports.biases[1][1]},
  {label:'JUNCTION',x:install.ports.inverter[0],y:install.ports.inverter[1]},
  {label:'REMOTE',x:install.ports.output[0],y:install.ports.output[1]}
 ];
 const future=forecastWireSignals(world,s,probes,64);
 const predictedTimes=measureWirePhase(9,8,2,-1).rows[3];
 assert.deepEqual(future.traces.map(row=>row.headTicks),
  [predictedTimes.biasNWTicks,predictedTimes.biasNETicks,
   predictedTimes.stage2Ticks,predictedTimes.outputTicks]);
 assert.deepEqual(world.cells,before);
 assert.equal(world.generation,generation);
 assert.throws(()=>wireCascadeLayout({radius:9,outputLength:8,rotation:0,a:1,b:1,biasNWShift:4}),/Invalid/);
 assert.throws(()=>wireCascadeLayout({radius:9,outputLength:8,rotation:0,a:1,b:1,biasNEShift:0.5}),/Invalid/);
 const small=createWorld({...s,cellCount:48}),untouched=small.cells.slice();
 assert.throws(()=>stampWireCascade(small,[24,24],{radius:12,outputLength:12,
  rotation:0,a:1,b:1,biasNWShift:3,biasNEShift:3}),/clipped/);
 assert.deepEqual(small.cells,untouched,'Edge collision must not partially wipe art');
 console.log('PASS B10: '+predicted+' exact B9 zero-phase and independently phased 4-bit truth events');
 console.log('PASS B10: '+integrated+' genuinely rotated whole-world phase mutations with byte-exact recipe replay');
 console.log('PASS B10: on-demand scanned truth fingerprints, physical rail-length timings, no source mutation and atomic clipping');
}finally{
 await Promise.all(files.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
