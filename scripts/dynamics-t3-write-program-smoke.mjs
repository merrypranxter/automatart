import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/spins-turmites.ts','scripts/.t3-core.mjs'],
 ['src/engine/sim.ts','scripts/.t3-sim.mjs'],
 ['src/engine/types.ts','scripts/.t3-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t3-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t3-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t3-mutation.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=async n=>import(pathToFileURL(resolve(files[n][1])).href);
 const {stepTurmites,seedTurmites,relocateTurmiteAgent,turmiteWriteAt,
  validTurmiteWriteProgram,DEFAULT_TURMITE_WRITE_PROGRAM}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {snapshotWorld,restoreWorldSnapshot}=await load(3);
 const {createCaptureCursor}=await load(4);
 const {requiresWorldRestart}=await load(5);
 const table=Array.from({length:24},(_,i)=>(23-i));
 const programs=[
  DEFAULT_TURMITE_WRITE_PROGRAM,
  {mode:'stride',stride:5,table},
  {mode:'stride',stride:-7,table},
  {mode:'stride',stride:0,table},
  {mode:'erase',stride:1,table},
  {mode:'table',stride:1,table}
 ];
 for(const length of [2,3,4,7,12,24])for(let state=0;state<length;state++){
  assert.equal(turmiteWriteAt(state,length), (state+1)%length,'Original +1 preserves T1 exactly');
  assert.equal(turmiteWriteAt(state,length,programs[1]),(state+5)%length);
  assert.equal(turmiteWriteAt(state,length,programs[2]),((state-7)%length+length)%length);
  assert.equal(turmiteWriteAt(state,length,programs[3]),state);
  assert.equal(turmiteWriteAt(state,length,programs[4]),0);
  assert.equal(turmiteWriteAt(state,length,programs[5]),(23-state)%length);
 }
 for(const bad of [
  {mode:'wrong',stride:1,table},{mode:'next',stride:100,table},
  {mode:'table',stride:1,table:table.slice(0,23)},
  {mode:'table',stride:1,table:table.map((v,i)=>i===4?24:v)},
  {mode:'table',stride:1,table:table.map((v,i)=>i===7?1.5:v)}
 ])assert(!validTurmiteWriteProgram(bad));
 assert.throws(()=>turmiteWriteAt(24,24,programs[0]),/Invalid T3/);
 const ants=[{x:2,y:3,heading:0},{x:4,y:5,heading:1},{x:7,y:6,heading:2}];
 const copy=structuredClone(ants);
 const moved=relocateTurmiteAgent(ants,12,12,1,11,0,3);
 assert.deepEqual(ants,copy,'Relocation cannot mutate saved source agent identities');
 assert.deepEqual(moved,[ants[0],{x:11,y:0,heading:3},ants[2]],
  'Exactly one existing agent is relocated and heading changed');
 for(const args of [[1,12,0,2,3,0],[12,12,1,12,0,0],
  [12,12,1,-1,0,0],[12,12,1,0,0,4]]){
  assert.throws(()=>relocateTurmiteAgent(ants,...args),/Invalid T3/);
 }
 const base={...INITIAL_SETTINGS,engine:'turmites',lattice:'square',
  aspect:'square',cellCount:48,wrap:true,seed:78312,turmiteRule:'RSLU'.repeat(6),
  turmiteCount:8,turmiteSteps:8,turmiteSpeciesCount:4,turmiteSpeciesStride:1,
  turmiteSpeciesMirror:true,turmiteHeadingShear:1,turmiteContact:'repel',
  turmiteFormation:'stack'};
 const dynamics={speciesCount:4,speciesStride:1,speciesMirror:true,
  headingShear:1,contact:'repel'};
 let exact=0;
 for(const rule of ['RL','RSLU','RSLU'.repeat(6)])
 for(const count of [1,4,8,12])
 for(const formation of ['orbit','stack','cross'])
 for(const steps of [1,2,4,8])
 for(const write of programs){
  const source=new Uint8Array(28*28);
  for(let i=0;i<source.length;i++)source[i]=(i*13+7)%rule.length;
  const agents=seedTurmites(28,28,count,917,formation);
  const original=source.slice(),before=structuredClone(agents);
  const accelerated=stepTurmites(source,28,28,true,rule,agents,steps,dynamics,write);
  let reference={cells:source,agents};
  for(let tick=0;tick<steps;tick++)
   reference=stepTurmites(reference.cells,28,28,true,rule,reference.agents,1,dynamics,write);
  assert.deepEqual(accelerated.cells,reference.cells);
  assert.deepEqual(accelerated.agents,reference.agents);
  assert.deepEqual(source,original);
  assert.deepEqual(agents,before);
  exact++;
 }
 // The distinct write rule changes ACTUAL pigments without changing the
 // read-color-dependent turn or altering unrelated grid cells.
 const first={x:3,y:3,heading:0};
 for(const write of programs){
  const source=new Uint8Array(49);source[3*7+3]=2;
  const output=stepTurmites(source,7,7,false,'RSLU',[first],1,undefined,write);
  assert.deepEqual(output.agents,[{x:2,y:3,heading:3}],
   'At current pigment #2 all writing programs must keep the exact L turn');
  assert.equal(output.cells[3*7+3],turmiteWriteAt(2,4,write));
  assert.equal(output.cells.reduce((sum,v)=>sum+v,0),output.cells[3*7+3]);
 }
 // Full production simulation with table writes, saved 24-state track,
 // independent T2 collision rules, and capture/replay.
 const settings={...base,turmiteWriteMode:'table',turmiteWriteStride:-7,
  turmiteWriteTable:table};
 let world=createWorld(settings);
 world.turmiteAgents=relocateTurmiteAgent(world.turmiteAgents,world.width,world.height,2,0,0,3);
 const physical=stepTurmites(world.cells,world.width,world.height,settings.wrap,
  settings.turmiteRule,world.turmiteAgents,settings.turmiteSteps,dynamics,
  {mode:'table',stride:-7,table});
 let actual=stepWorld(world,settings);
 assert.deepEqual(actual.cells,physical.cells);
 assert.deepEqual(actual.turmiteAgents,physical.agents);
 assert.equal(actual.generation,1);
 const snapshot=snapshotWorld(actual);
 let replay=restoreWorldSnapshot(snapshot,settings);
 for(let n=0;n<25;n++){
  actual=stepWorld(actual,settings);replay=stepWorld(replay,settings);
  assert.deepEqual(actual.cells,replay.cells,'Exact independently written pigment replay');
  assert.deepEqual(actual.turmiteAgents,replay.turmiteAgents,'Exact movable ant identity replay');
 }
 const recorder=createCaptureCursor(actual,settings,24,24);
 const expected=stepWorld(actual,settings);
 recorder.advance();
 assert.deepEqual(recorder.current.cells,expected.cells);
 assert.deepEqual(recorder.current.turmiteAgents,expected.turmiteAgents);
 // No restarts for any write mutation. Legacy recipes with absent keys fall
 // back to +1 (T1/T2) for real future simulation, NOT just display.
 for(const write of programs)assert(!requiresWorldRestart(settings,{
  ...settings,turmiteWriteMode:write.mode,turmiteWriteStride:write.stride,
  turmiteWriteTable:[...write.table]
 }));
 const old={...base,turmiteWriteMode:'next',turmiteWriteStride:1,
  turmiteWriteTable:[...DEFAULT_TURMITE_WRITE_PROGRAM.table]};
 const oldWorld=createWorld(old),legacySettings={...old};
 delete legacySettings.turmiteWriteMode;delete legacySettings.turmiteWriteStride;
 delete legacySettings.turmiteWriteTable;
 assert.deepEqual(stepWorld(oldWorld,legacySettings).cells,stepWorld(oldWorld,old).cells);
 assert.deepEqual(stepWorld(oldWorld,legacySettings).turmiteAgents,stepWorld(oldWorld,old).turmiteAgents);
 console.log('PASS T3: '+exact+' full anti-erasure/4-write-program/T2-species multi-round cell-perfect transitions');
 console.log('PASS T3: independent turn and write laws, 24-slot substitution, modular negative jumps and true erasure');
 console.log('PASS T3: safe selected-agent relocation, exact JSON replay, immutable capture and legacy behavior');
}finally{
 await Promise.all(files.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
