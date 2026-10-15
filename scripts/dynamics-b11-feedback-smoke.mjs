import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/wire-feedback-lab.ts','scripts/.b11-feedback.mjs'],
 ['src/engine/wire-cascade.ts','scripts/.b11-cascade.mjs'],
 ['src/engine/sim.ts','scripts/.b11-sim.mjs'],
 ['src/engine/types.ts','scripts/.b11-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b11-snapshot.mjs'],
 ['src/engine/wire-signal-scope.ts','scripts/.b11-scope.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {measureWireFeedback,sweepWireFeedback}=await load(0);
 const {wireCascadeLayout,wireCascadeFootprint,stampWireCascade,
  runWireCascadeBench,validWireCascade}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {forecastWireSignals}=await load(5);
 const s={...INITIAL_SETTINGS,engine:'wireworld',lattice:'square',cellCount:72,
  aspect:'square',density:0,seed:1198,wrap:false,
  wireDrive:'off',wireExciteMin:1,wireExciteMax:2};
 const idx=(p,w)=>p[1]*w+p[0];
 let tested=0,rotated=0;
 for(const out of [5,8,12]){
  const b9=runWireCascadeBench(9,out);
  assert(b9.allPass);
  const baseline=measureWireFeedback(out,false);
  assert.equal(baseline.truth,'0001');
  assert.equal(baseline.preservesAND,true);
  assert.equal(baseline.classified,'baseline');
  assert.deepEqual(baseline.rows[3].nandPort,[12],
   'Original B9 really has a returning electron at the former NAND port');
  assert.deepEqual(baseline.rows[3].output,[11+out],
   'Original B9 final 11 output must still work');
  const shield=measureWireFeedback(out,true);
  assert.equal(shield.truth,'0001','Real shield retains original full AND Boolean function');
  assert.equal(shield.classified,'return-blocked');
  assert(shield.preservesAND&&shield.blocksKnownReturn);
  assert.deepEqual(shield.rows[3].nandPort,[],
   'Calibrated physical guard stops every returning NAND-port HEAD, not just T12');
  assert.deepEqual(shield.rows[3].output,[11+out],
   'Guard must not break working downstream AND output');
  assert.deepEqual(shield.rows.slice(0,3).map(r=>r.nandPort),[[10],[10],[10]],
   'Guard MUST preserve forward NAND electron for all non-11 inputs');
  for(const entry of shield.rows)assert(entry.guards.length===2);
  tested+=8;
 }
 // Physical mistiming must be observed, not false-certificated.
 const outcomes=[];
 for(const west of [-1,0,1])for(const diagonal of [-1,0,1]){
  const read=measureWireFeedback(8,true,west,diagonal);
  assert.equal(read.rows.length,4);
  assert(/^[01]{4}$/.test(read.truth));
  outcomes.push(read);
  if(west===-1)assert.equal(read.truth,'1111',
   'Early horizontal guard changes true output fingerprint; not a reliable diode');
  if(west===0&&diagonal===0)assert(read.blocksKnownReturn);
  if(west===1&&diagonal===0)assert.equal(read.blocksKnownReturn,false,
   'A late guard must not be mislabeled as a return blocker');
 }
 assert(new Set(outcomes.map(x=>x.truth)).size>=2,'Timing shifts must genuinely alter original math');
 const scan=sweepWireFeedback(8,0);
 assert.equal(scan.length,3);
 assert.deepEqual(scan.map(row=>row.diagonalShift),[-1,0,1]);
 assert.equal(scan[1].blocksKnownReturn,true);
 assert.deepEqual(scan[1].returnTicks,[]);
 assert.throws(()=>sweepWireFeedback(8,2),/outside supported/);
 assert.throws(()=>wireCascadeLayout({radius:10,outputLength:8,rotation:0,
  a:1,b:1,feedbackShield:true}),/Invalid/,
  'Calibration must not be misrepresented for other radii');
 assert.throws(()=>wireCascadeLayout({radius:9,outputLength:8,rotation:0,
  a:1,b:1,feedbackShield:true,biasNWShift:1}),/Invalid/,
  'Misphased B10 bias cannot inherit the return-shield certificate');
 assert.throws(()=>wireCascadeLayout({radius:9,outputLength:8,rotation:0,
  a:1,b:1,feedbackShield:true,guardWestShift:1.5}),/Invalid/);
 // Genuine whole production-engine propagation across all four rotations,
 // three output distances, 4 input cases, plus optional mistuning.
 for(const guarded of [false,true])for(const out of [5,8,12])
  for(const rotation of [0,1,2,3])for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]]){
   const options={radius:9,outputLength:out,rotation,a,b,feedbackShield:guarded};
   let world=createWorld(s);world.cells.fill(0);
   const original=world.cells.slice(),generation=world.generation;
   const touched=wireCascadeFootprint(world,[36,36],options);
   const stamp=stampWireCascade(world,[36,36],options);
   assert.equal(world.generation,generation,'Installing feedback circuitry is a single art edit');
   assert(touched.length>20&&stamp.touched.length<2000,'No artboard-wide clearing');
   assert.notDeepEqual(world.cells,original);
   assert.equal((stamp.ports.guardPorts?.length??0),guarded?2:0);
   let restored=restoreWorldSnapshot(snapshotWorld(world),s);
   assert.deepEqual(restored.cells,world.cells);
   const sites=[
    stamp.ports.nand,
    [36+([rotation===0?-1:0][0]),36]
   ];
   // Test all five physically observed sites, including true upstream
   // return-wave points transformed by quarter-turn rotation.
   const r90=([x,y],k)=>k===1?[-y,x]:k===2?[-x,-y]:k===3?[y,-x]:[x,y];
   const upOne=r90([8,-8],rotation),upTwo=r90([7,-7],rotation);
   const anchor=[36,36];
   const physical=[
    stamp.ports.nand,
    [anchor[0]+upOne[0],anchor[1]+upOne[1]],
    [anchor[0]+upTwo[0],anchor[1]+upTwo[1]],
    stamp.ports.inverter,stamp.ports.output,
    ...(stamp.ports.guardPorts??[])
   ];
   const counts=physical.map(()=>[]);
   const horizon=18+out+32;
   for(let tick=0;tick<horizon;tick++){
    physical.forEach((p,i)=>{if(world.cells[idx(p,world.width)]===2)counts[i].push(tick);});
    world=stepWorld(world,s);restored=stepWorld(restored,s);
   }
   const expected=measureWireFeedback(out,guarded).rows.find(row=>row.a===a&&row.b===b);
   assert(expected);
   assert.deepEqual(counts,[expected.nandPort,expected.upstreamOne,expected.upstreamTwo,
    expected.detector,expected.output,...expected.guards],
    'Whole WORLD physical signal traces equal separately measured guard laboratory');
   assert.deepEqual(world.cells,restored.cells,'Exact replay after snapshot JSON');
   assert.equal(world.waveStimulusCount,0);
   rotated++;
  }
 // Must include optional phase tuning as actual modified conductor material.
 for(const diagonalShift of [-1,1]){
  const obs=measureWireFeedback(8,true,0,diagonalShift);
  let world=createWorld(s);world.cells.fill(0);
  const stamp=stampWireCascade(world,[36,36],{radius:9,outputLength:8,
   rotation:0,a:1,b:1,feedbackShield:true,guardDiagonalShift:diagonalShift});
  const site=stamp.ports.output;
  const ticks=[];
  for(let t=0;t<60;t++){
   if(world.cells[idx(site,world.width)]===2)ticks.push(t);
   world=stepWorld(world,s);
  }
  assert.deepEqual(ticks,obs.rows[3].output);
 }
 const world=createWorld(s);world.cells.fill(0);
 const onStage=stampWireCascade(world,[36,36],{radius:9,outputLength:8,
  rotation:0,a:1,b:1,feedbackShield:true});
 const before=world.cells.slice(),gen=world.generation;
 const points=[
  {label:'RETURN',x:onStage.ports.nand[0],y:onStage.ports.nand[1]},
  {label:'STAGE 2',x:onStage.ports.inverter[0],y:onStage.ports.inverter[1]},
  {label:'OUTPUT',x:onStage.ports.output[0],y:onStage.ports.output[1]},
  {label:'GUARD',x:onStage.ports.guardPorts[0][0],y:onStage.ports.guardPorts[0][1]}
 ];
 const projected=forecastWireSignals(world,s,points,64);
 const calibrated=measureWireFeedback(8,true).rows[3];
 assert.deepEqual(projected.traces.map(x=>x.headTicks),[
  calibrated.nandPort,calibrated.detector,calibrated.output,calibrated.guards[0]
 ]);
 assert.deepEqual(world.cells,before,'Scope cannot alter source canvas');
 assert.equal(world.generation,gen,'Scope cannot progress time');
 const tiny=createWorld({...s,cellCount:48}),notChanged=tiny.cells.slice();
 assert.throws(()=>stampWireCascade(tiny,[24,24],{radius:9,outputLength:12,
  rotation:0,a:1,b:1,feedbackShield:true}),/clipped/);
 assert.deepEqual(tiny.cells,notChanged,'Clipped guard must fail before clearing artwork');
 console.log('PASS B11: '+tested+' baseline/guard truth cases, including true 11 returning-head suppression');
 console.log('PASS B11: '+rotated+' rotated whole-world physics histories, all probe sites and exact JSON replay');
 console.log('PASS B11: mistuning changes Boolean fingerprints, explicit no-diode certificate, true 64-tick unmodified scope');
}finally{
 await Promise.all(files.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
