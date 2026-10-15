import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const paths=[
 ['src/engine/spins-turmites.ts','scripts/.t5-core.mjs'],
 ['src/engine/sim.ts','scripts/.t5-sim.mjs'],
 ['src/engine/types.ts','scripts/.t5-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t5-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t5-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t5-mutation.mjs']
];
try{
 await Promise.all(paths.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(paths[i][1])).href);
 const {stepTurmites,seedTurmites,relocateTurmiteAgent,
  turmiteMemoryAdvance,validTurmiteMemory,DEFAULT_TURMITE_MEMORY,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_WRITE_PROGRAM}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {snapshotWorld,restoreWorldSnapshot}=await load(3);
 const {createCaptureCursor}=await load(4);
 const {requiresWorldRestart}=await load(5);
 const memory={...DEFAULT_TURMITE_MEMORY,enabled:true,states:8,
  mode:'read',turnBias:1,writeBias:1};
 assert(validTurmiteMemory(DEFAULT_TURMITE_MEMORY));
 for(const v of [{...memory,states:0},{...memory,states:25},
  {...memory,turnBias:4},{...memory,writeBias:-4},
  {...memory,mode:'hallucination'},{...memory,enabled:'true'}])
  assert.equal(validTurmiteMemory(v),false);
 assert.throws(()=>turmiteMemoryAdvance(8,1,2,1,memory),/Invalid T5/);
 for(let m=0;m<8;m++)for(let read=0;read<24;read++)
  for(let write=0;write<24;write++)for(const occupants of [1,2,3,4,12]){
   for(const mode of ['tick','read','write','collision']){
    const v={...memory,mode};
    const advance=mode==='tick'?1:mode==='read'?read+1:
     mode==='write'?write+1:occupants>1?occupants:0;
    assert.equal(turmiteMemoryAdvance(m,read,write,occupants,v),(m+advance)%8);
   }
  }
 const square=new Uint8Array(49);square[3*7+3]=1;
 const ant=[{x:3,y:3,heading:0,memory:2}];
 const historical=stepTurmites(square,7,7,true,'RLSS',ant,1,undefined,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,memory);
 assert.deepEqual(historical.agents,[{x:3,y:2,heading:0,memory:4}],
  'Track 1 plus remembered 2 samples S; remembered phase advances by read 1 + 1');
 assert.equal(historical.cells[3*7+3],0,
  'Real outgoing pigment is (old 1 + 1 + memory 2) modulo 4');
 const unmemoried=stepTurmites(square,7,7,true,'RLSS',
  [{x:3,y:3,heading:0}],1);
 assert.deepEqual(unmemoried.agents,[{x:2,y:3,heading:3}],
  'Classic L turn stays intact');
 assert.equal(unmemoried.cells[3*7+3],2);
 assert.equal(square[3*7+3],1,'Never modify input tracks');
 assert.deepEqual(relocateTurmiteAgent(ant,7,7,0,1,5,2),
  [{x:1,y:5,heading:2,memory:2}],
  'Manual T3 relocation must not delete actual T5 agent memory');
 const contact={...memory,mode:'collision',turnBias:0,writeBias:0};
 const together=stepTurmites(new Uint8Array(49),7,7,true,'SSSS',
  [{x:3,y:3,heading:0},{x:3,y:3,heading:1}],1,undefined,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,contact);
 assert.deepEqual(together.agents.map(a=>a.memory),[2,2],
  'Same-site physical collision increments BOTH agent registers');
 const apart=stepTurmites(new Uint8Array(49),7,7,true,'SSSS',
  [{x:3,y:3,heading:0},{x:4,y:3,heading:1}],1,undefined,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,contact);
 assert.deepEqual(apart.agents.map(a=>a.memory),[0,0],
  'Adjacent ants are NOT in contact and gain no collision scars');

 const dynamics=[
  {speciesCount:1,speciesStride:0,speciesMirror:false,headingShear:0,contact:'shared'},
  {speciesCount:4,speciesStride:2,speciesMirror:true,headingShear:3,contact:'repel'}
 ];
 const alchemies=[
  DEFAULT_TURMITE_ALCHEMY,
  {...DEFAULT_TURMITE_ALCHEMY,enabled:true,collision:'fuse'},
  {...DEFAULT_TURMITE_ALCHEMY,enabled:true,collision:'invert'}
 ];
 const modes=['tick','read','write','collision'];
 let cases=0;
 for(const d of dynamics)for(const alchemy of alchemies)
 for(const mode of modes)for(const steps of [1,2,4,8])
 for(const formation of ['orbit','stack']){
  const n=18,w=18,rule='RSLU'.repeat(3),source=new Uint8Array(n*n);
  for(let i=0;i<source.length;i++)source[i]=(i*7+Math.floor(i/n)*3)%rule.length;
  const agents=seedTurmites(w,n,8,7321,formation);
  const local={...memory,states:3+steps,mode,turnBias:steps%4,writeBias:steps%7-3};
  const batch=stepTurmites(source,w,n,true,rule,agents,steps,d,
   DEFAULT_TURMITE_WRITE_PROGRAM,alchemy,local);
  let separate={cells:source,agents};
  for(let round=0;round<steps;round++)
   separate=stepTurmites(separate.cells,w,n,true,rule,separate.agents,1,d,
    DEFAULT_TURMITE_WRITE_PROGRAM,alchemy,local);
  assert.deepEqual(batch.cells,separate.cells,'Exact accelerated memory track parity');
  assert.deepEqual(batch.agents,separate.agents,'Exact repeated memory register/position parity');
  assert(batch.agents.every(a=>Number.isInteger(a.memory)&&a.memory>=0&&a.memory<local.states));
  assert(source.every((v,i)=>v===(i*7+Math.floor(i/n)*3)%rule.length));
  cases++;
 }
 const settings={...INITIAL_SETTINGS,engine:'turmites',lattice:'square',
  turmiteRule:'RSLU'.repeat(3),turmiteCount:8,turmiteFormation:'stack',
  turmiteSpeciesCount:4,turmiteSpeciesStride:2,turmiteHeadingShear:2,
  turmiteSpeciesMirror:true,turmiteContact:'repel',turmiteSteps:8,
  turmiteAlchemy:{...DEFAULT_TURMITE_ALCHEMY,enabled:true,collision:'fuse'},
  turmiteMemory:{...memory,mode:'write',states:11}};
 let original=createWorld(settings);
 for(let i=0;i<19;i++)original=stepWorld(original,settings);
 assert(original.turmiteAgents.some(a=>a.memory!==0),'Memory must really evolve');
 const packed=snapshotWorld(original);
 assert.deepEqual(packed.turmiteAgents,original.turmiteAgents);
 let loaded=restoreWorldSnapshot(packed,settings);
 assert.deepEqual(loaded.turmiteAgents,original.turmiteAgents,
  'All T5 internal states round-trip through actual world snapshot');
 for(let i=0;i<30;i++){
  original=stepWorld(original,settings);
  loaded=stepWorld(loaded,settings);
  assert.deepEqual(loaded.cells,original.cells);
  assert.deepEqual(loaded.turmiteAgents,original.turmiteAgents);
 }
 const cursor=createCaptureCursor(original,settings,20,20);
 const following=stepWorld(original,settings);cursor.advance();
 assert.deepEqual(cursor.current.cells,following.cells);
 assert.deepEqual(cursor.current.turmiteAgents,following.turmiteAgents);
 assert.deepEqual(snapshotWorld(original).turmiteAgents,original.turmiteAgents,
  'Read-only export cursor never changes its source world');

 const bad=structuredClone(packed);bad.turmiteAgents[0].memory=24;
 assert.throws(()=>restoreWorldSnapshot(bad,settings),/Invalid saved Turmite coordinate/);
 const badFraction=structuredClone(packed);badFraction.turmiteAgents[0].memory=2.5;
 assert.throws(()=>restoreWorldSnapshot(badFraction,settings),/Invalid saved Turmite coordinate/);
 const legacySettings={...INITIAL_SETTINGS,engine:'turmites',cellCount:32};
 delete legacySettings.turmiteMemory;
 const newClassic={...legacySettings,turmiteMemory:{...DEFAULT_TURMITE_MEMORY}};
 let a=createWorld(newClassic),b=createWorld(newClassic);
 for(let i=0;i<36;i++){
  a=stepWorld(a,legacySettings);b=stepWorld(b,newClassic);
  assert.deepEqual(a.cells,b.cells);
  assert.deepEqual(a.turmiteAgents,b.turmiteAgents);
  assert(a.turmiteAgents.every(ant=>ant.memory===undefined),
   'Legacy T1–T4 worlds do not acquire new register fields while disabled');
 }
 const oldSave=snapshotWorld(a);oldSave.turmiteAgents.forEach(v=>delete v.memory);
 assert.deepEqual(restoreWorldSnapshot(oldSave,newClassic).turmiteAgents,a.turmiteAgents);
 for(const v of [
  {...memory,enabled:false},{...memory,mode:'tick'},{...memory,mode:'collision'},
  {...memory,states:20},{...memory,turnBias:3},{...memory,writeBias:-3}
 ])assert(!requiresWorldRestart(settings,{...settings,turmiteMemory:v}),
  'T5 memory knobs must be nondestructive live edits');
 console.log('PASS T5: '+cases+' exact accelerated multi-agent/multi-species memory histories');
 console.log('PASS T5: four independent register dynamics, real turn/write feedback, physical collision-only scars');
 console.log('PASS T5: 30-generation world replay, preserved placement, snapshot validation, recorder and legacy T4');
}finally{
 await Promise.all(paths.map(([,filename])=>unlink(resolve(filename)).catch(()=>{})));
}
