import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/spins-turmites.ts','scripts/.t1-core.mjs'],
 ['src/engine/sim.ts','scripts/.t1-sim.mjs'],
 ['src/engine/types.ts','scripts/.t1-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t1-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t1-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t1-mutation.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const get=async n=>import(pathToFileURL(resolve(jobs[n][1])).href);
 const {stepTurmites,seedTurmites,validTurmiteRule}=await get(0);
 const {createWorld,stepWorld}=await get(1);
 const {INITIAL_SETTINGS}=await get(2);
 const {snapshotWorld,restoreWorldSnapshot}=await get(3);
 const {createCaptureCursor}=await get(4);
 const {requiresWorldRestart}=await get(5);
 const start=[{x:3,y:3,heading:0}];
 // Complete 4-symbol heading algebra: N=0,E=1,S=2,W=3.
 const turns=[
  ['L',{x:2,y:3,heading:3}],
  ['R',{x:4,y:3,heading:1}],
  ['S',{x:3,y:2,heading:0}],
  ['U',{x:3,y:4,heading:2}]
 ];
 for(const [symbol,expected] of turns){
  const res=stepTurmites(new Uint8Array(49),7,7,false,symbol+'R',start);
  assert.deepEqual(res.agents,[expected],'Real '+symbol+' transformation must move the ant');
  assert.equal(res.cells[3*7+3],1,'Every real turn increments the current track state');
 }
 assert(validTurmiteRule('RL'),'Canonical Langton must remain valid');
 assert(validTurmiteRule('RSLU'.repeat(6)),'Twenty-four physical track-state slots');
 for(const bad of ['R','LR'.repeat(13),'RSQ','rslu','LLLLLLLLLLLLLLLLLLLLLLLLL']){
  assert(!validTurmiteRule(bad),'Rule validator must reject '+bad);
 }
 for(const bad of [0,9,-1,1.3,NaN]){
  assert.throws(()=>stepTurmites(new Uint8Array(49),7,7,true,'RL',start,bad),
   /Invalid Turmite/,'Disallow unbounded or nonintegral substeps');
 }
 // 24 colors really cycle modulo 24 instead of merely affecting shading.
 const genome='RSLU'.repeat(6),cells=new Uint8Array(49);
 cells[3*7+3]=23;
 const first=stepTurmites(cells,7,7,true,genome,start);
 assert.equal(first.cells[3*7+3],0);
 assert.equal(cells[3*7+3],23,'No mutation of source track');
 assert.equal(first.agents[0].heading,2,'State 23 is U-turn, not state-zero R');
 // Stable ID order: two agents at the same cell use the next TRUE pigment.
 const collision=stepTurmites(new Uint8Array(49),7,7,true,'RS',
  [{x:3,y:3,heading:0},{x:3,y:3,heading:0}],1);
 assert.equal(collision.cells[3*7+3],0);
 assert.deepEqual(collision.agents,[{x:4,y:3,heading:1},{x:3,y:2,heading:0}]);
 // Each unit of acceleration must be an actual COMPLETE multi-agent
 // read/turn/write/move cycle; not rendering-time or GIF-frame duplication.
 let directCases=0;
 for(const rule of ['RL','LR','RS','US','RSLU','RSLURSLU','RSLU'.repeat(6)])
  for(const wrap of [false,true])
  for(const antCount of [1,3,12])
  for(const stepCount of [1,2,4,8]){
   const seed=8123+rule.length*13+antCount*7,source=new Uint8Array(24*24);
   for(let i=0;i<source.length;i++)source[i]=(i*13+seed)%rule.length;
   const agents=seedTurmites(24,24,antCount,seed);
   const accelerated=stepTurmites(source,24,24,wrap,rule,agents,stepCount);
   let naive={cells:source,agents};
   for(let round=0;round<stepCount;round++)
    naive=stepTurmites(naive.cells,24,24,wrap,rule,naive.agents);
   assert.deepEqual(accelerated.cells,naive.cells,
    'Accelerated generations MUST equal sequential actual pixel writes');
   assert.deepEqual(accelerated.agents,naive.agents,
    'Accelerated generations MUST equal sequential actual agent movements');
   assert.deepEqual(source,Uint8Array.from(source));
   directCases++;
  }
 const config={...INITIAL_SETTINGS,engine:'turmites',lattice:'square',
  aspect:'square',cellCount:48,seed:50042,wrap:true,
  turmiteRule:genome,turmiteCount:7,turmiteSteps:8,turmiteBrush:23};
 let world=createWorld(config);
 assert.equal(world.turmiteAgents.length,7);
 const seedAgents=world.turmiteAgents.map(a=>({...a}));
 const manual=stepTurmites(world.cells,world.width,world.height,
  config.wrap,config.turmiteRule,seedAgents,8);
 let advanced=stepWorld(world,config);
 assert.deepEqual(advanced.cells,manual.cells);
 assert.deepEqual(advanced.turmiteAgents,manual.agents);
 assert.equal(advanced.generation,1,'Eight physical microsteps still count as one exported generation');
 assert.equal(advanced.turmiteRule,genome);
 // Restore/import long-rule artwork and continue perfectly reproducibly.
 const serialized=snapshotWorld(advanced);
 let restored=restoreWorldSnapshot(serialized,config);
 assert.deepEqual(restored.cells,advanced.cells);
 assert.deepEqual(restored.turmiteAgents,advanced.turmiteAgents);
 for(let n=0;n<22;n++){
  advanced=stepWorld(advanced,config);
  restored=stepWorld(restored,config);
  assert.deepEqual(advanced.cells,restored.cells);
  assert.deepEqual(advanced.turmiteAgents,restored.turmiteAgents);
 }
 const bad=structuredClone(serialized);
 const oldArray=Uint8Array.from(atob(bad.arrays.cells),x=>x.charCodeAt(0));
 oldArray[0]=genome.length;
 bad.arrays.cells=btoa(String.fromCharCode(...oldArray));
 assert.throws(()=>restoreWorldSnapshot(bad,config),/Invalid Turmite track/);
 const cursor=createCaptureCursor(advanced,config,12,12);
 let previous=cursor.current;
 for(let i=0;i<3;i++){
  const prior=previous;
  previous=cursor.advance().world??cursor.current;
  assert.equal(cursor.current.generation,advanced.generation+i+1,
   'Capture advances one displayed generation per eight real moves');
  const expected=stepWorld(prior,config);
  assert.deepEqual(cursor.current.turmiteAgents,expected.turmiteAgents);
  assert.deepEqual(cursor.current.cells,expected.cells);
 }
 assert(!requiresWorldRestart(config,{...config,turmiteSteps:4}),
  'Changing physical step count must preserve live painted track and ant coordinates');
 assert(!requiresWorldRestart(config,{...config,turmiteBrush:0}));
 assert(requiresWorldRestart(config,{...config,turmiteRule:'RL'}),
  'New turn genomes require resetting invalid old pigment states');
 assert(requiresWorldRestart(config,{...config,turmiteCount:6}));
 // Old L/R recipes without the new knob are fully backwards compatible;
 // old playback still uses exactly one step per displayed generation.
 const legacy={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,
  turmiteRule:'RL',turmiteCount:1,turmiteSteps:1};
 const oldRecipe=snapshotWorld(createWorld(legacy));
 const legacySettings={...legacy};delete legacySettings.turmiteSteps;
 const oldLoad=restoreWorldSnapshot(oldRecipe,{...INITIAL_SETTINGS,...legacySettings});
 assert.deepEqual(stepWorld(oldLoad,{...INITIAL_SETTINGS,...legacySettings}).cells,
  stepWorld(createWorld(legacy),legacy).cells);
 console.log('PASS T1: '+directCases+' independent 4-turn / 24-state / 1–8-substep multi-agent trajectories');
 console.log('PASS T1: true state-23 modulo transition, all heading commands and agent collision ordering');
 console.log('PASS T1: exact saved long-genome playback, full-speed recorder frames, live step edits and legacy RL recipes');
}finally{
 await Promise.all(jobs.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
