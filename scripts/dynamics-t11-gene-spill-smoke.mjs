import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/turmite-gene-spill.ts','scripts/.t11-spill.mjs'],
 ['src/engine/turmite-genetics.ts','scripts/.t11-genetics.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t11-ant.mjs'],
 ['src/engine/sim.ts','scripts/.t11-sim.mjs'],
 ['src/engine/types.ts','scripts/.t11-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t11-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t11-capture.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {DEFAULT_TURMITE_GENE_SPILL,validTurmiteGeneSpill,validTransferAgent,stepGeneSpill}=await load(0);
 const {NEUTRAL_TURMITE_GENOME}=await load(1);
 const {stepTurmites,DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {INITIAL_SETTINGS}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {createCaptureCursor}=await load(6);
 const settings={...DEFAULT_TURMITE_GENE_SPILL,enabled:true,radius:1,
  probability:100,mode:'copy',locus:'write',gate:'any'};
 assert(validTurmiteGeneSpill(settings));
 for(const patch of [{radius:-1},{radius:9},{probability:-1},{probability:101},
  {locus:'alien'},{mode:'telepathy'},{gate:'void'},{threshold:256},{enabled:2}]){
  assert(!validTurmiteGeneSpill({...settings,...patch}),JSON.stringify(patch));
 }
 assert(!validTransferAgent({x:0,y:0,transferCount:-1}));
 assert(!validTransferAgent({x:0,y:0,transferFrom:2},2));
 assert(validTransferAgent({x:0,y:0,transferFrom:1},2));
 assert(!validTransferAgent({x:0,y:0,transferGene:'unknown'}));
 const donor=[
  {x:2,y:2,alive:true,genome:{...NEUTRAL_TURMITE_GENOME,write:3}},
  {x:3,y:2,alive:true,genome:{...NEUTRAL_TURMITE_GENOME,write:-2}}
 ];
 const art=new Uint8Array(49),scent=new Uint8Array(49);
 const copy=stepGeneSpill(donor,donor,art,undefined,7,7,true,true,true,settings,135);
 assert.equal(copy.contacts,2);
 assert.equal(copy.transfers,2);
 assert.equal(copy.agents[0].genome.write,-2);
 assert.equal(copy.agents[1].genome.write,3,
  'Mutual exchange uses previous gene values, not another ant just-updated DNA');
 assert.equal(copy.agents[0].transferFrom,1);
 assert.equal(copy.agents[1].transferFrom,0);
 assert.equal(copy.agents[0].transferCount,1);
 assert(!('transferCount' in donor[0]),'Source genomes and contact counts must not be mutated');
 const none=stepGeneSpill(donor,donor,art,undefined,7,7,true,true,true,
  {...settings,probability:0},135);
 assert.equal(none.contacts,2);
 assert.equal(none.transfers,0);
 assert.equal(none.agents[0].transferCount,1,
  'Failed encounters still increment persistent RNG opportunity index');
 assert.equal(none.agents[0].genome.write,3);
 assert.equal(stepGeneSpill(donor,donor,art,undefined,7,7,true,true,true,
  {...settings,radius:0},135).contacts,0,
  'Radius 0 means real same-site meeting ONLY');
 assert.equal(stepGeneSpill(donor,donor,art,undefined,7,7,true,true,false,
  {...settings,enabled:false},135).transfers,0);
 assert.equal(stepGeneSpill(donor,donor,art,undefined,7,7,true,true,false,
  settings,135).transfers,0,'T11 cannot affect physics while T10 is disabled');
 const neighbors=donor.map((a,i)=>({...a,x:i===0?0:6,y:2}));
 assert.equal(stepGeneSpill(neighbors,neighbors,art,undefined,7,7,true,
  true,true,settings,135).contacts,2,'Toroidal edge neighbors make true physical contacts');
 assert.equal(stepGeneSpill(neighbors,neighbors,art,undefined,7,7,false,
  true,true,settings,135).contacts,0,'Finite boundaries do not wrap');
 const stacked=donor.map(a=>({...a,x:2,y:2}));
 assert.equal(stepGeneSpill(stacked,stacked,art,undefined,7,7,true,
  true,true,{...settings,radius:0},135).transfers,2);
 assert.equal(stepGeneSpill([{...stacked[0],alive:false},stacked[1]],
  stacked,art,undefined,7,7,true,true,true,settings,135).transfers,0,
  'Dormant donor never transmits, dormant recipient never receives');
 assert.equal(stepGeneSpill([{...stacked[0],alive:false},stacked[1]],
  stacked,art,undefined,7,7,true,false,true,settings,135).transfers,2,
  'With T9 bypassed dormant registers genuinely count as active Turmites');
 assert.equal(stepGeneSpill([stacked[0],{...stacked[1],alive:false}],stacked,
  art,undefined,7,7,true,true,true,settings,135).transfers,0,
  'Newborn cannot participate in its own birth microstep');
 assert.equal(stepGeneSpill(stacked,stacked,art,undefined,7,7,true,true,true,
  {...settings,gate:'pigment'},135).transfers,0);
 art[2+2*7]=1;
 assert.equal(stepGeneSpill(stacked,stacked,art,undefined,7,7,true,true,true,
  {...settings,gate:'pigment'},135).transfers,2,
  'Paint gate responds only to REAL previously stored pigment');
 assert.equal(stepGeneSpill(stacked,stacked,art,undefined,7,7,true,true,true,
  {...settings,gate:'scent',threshold:32},135).transfers,0);
 scent[2+2*7]=34;
 assert.equal(stepGeneSpill(stacked,stacked,art,scent,7,7,true,true,true,
  {...settings,gate:'scent',threshold:32},135).transfers,2,
  'Chemical gate reads genuine old T6 field, not a fake overlaid field');
 const blend=stepGeneSpill(donor,donor,art,undefined,7,7,true,true,true,
  {...settings,mode:'blend'},135);
 assert.equal(blend.agents[0].genome.write,1,
  'Signed +3 + -2 half-tie rounds away from zero');
 assert.equal(blend.agents[1].genome.write,1);
 const mutation=stepGeneSpill(stacked,stacked,art,undefined,7,7,true,true,true,
  {...settings,mode:'mutate'},135);
 assert.notEqual(mutation.agents[0].genome.write,donor[1].genome.write,
  'Physical mutagen modifies donated DNA even at boundaries');
 assert.notEqual(mutation.agents[1].genome.write,donor[0].genome.write);
 assert.deepEqual(mutation.agents,stepGeneSpill(stacked,stacked,art,
  undefined,7,7,true,true,true,{...settings,mode:'mutate'},135).agents);
 // With no T9 biology, two physically nearby ant programs exchange a
 // write allele after their real first step. The SECOND step writes actual
 // different Uint8 pigment because T10 now executes the received allele.
 const turns=[{x:2,y:2,heading:0,genome:{...NEUTRAL_TURMITE_GENOME,write:1}},
  {x:2,y:2,heading:1,genome:{...NEUTRAL_TURMITE_GENOME,write:-1}}];
 const evo={...INITIAL_SETTINGS.turmiteEvolution,enabled:true};
 const run=(cells,ants,n,sp,chemical,pheromone,life,seed=99)=>stepTurmites(
  cells,13,13,true,'RSLU',ants,n,DEFAULT_TURMITE_DYNAMICS,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_MEMORY,chemical,pheromone,INITIAL_SETTINGS.turmiteDuet,
  undefined,INITIAL_SETTINGS.turmiteRhythm,life,evo,seed,sp);
 const turnArt=new Uint8Array(169);
 const first=run(turnArt,turns,1,{...settings,radius:0},
  INITIAL_SETTINGS.turmitePheromoneRules,undefined,INITIAL_SETTINGS.turmiteLife);
 assert(first.agents.every(a=>a.transferCount===1));
 assert.equal(first.agents[0].genome.write,-1);
 assert.equal(first.agents[1].genome.write,1);
 const next=run(first.cells,first.agents,1,{...settings,enabled:false},
  INITIAL_SETTINGS.turmitePheromoneRules,undefined,INITIAL_SETTINGS.turmiteLife);
 const noExchange=run(first.cells,first.agents.map((a,i)=>({...a,genome:{...turns[i].genome}})),
  1,{...settings,enabled:false},INITIAL_SETTINGS.turmitePheromoneRules,
  undefined,INITIAL_SETTINGS.turmiteLife);
 assert.notDeepEqual(next.cells,noExchange.cells,
  'Transferred genes change actual second-step pixel writes, not palette colors');
 const program={...INITIAL_SETTINGS,engine:'turmites',cellCount:40,
  seed:745,turmiteCount:4,turmiteFormation:'stack',turmiteSteps:4,
  turmiteRule:'RSLURSLU',turmiteEvolution:evo,
  turmiteGeneSpill:{...settings,mode:'mutate',locus:'all',radius:3},
  turmiteMemory:{...INITIAL_SETTINGS.turmiteMemory,enabled:true},
  turmiteRhythm:{...INITIAL_SETTINGS.turmiteRhythm,enabled:true},
  turmitePheromoneRules:{...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true},
  turmiteDuet:{...INITIAL_SETTINGS.turmiteDuet,enabled:true}
 };
 let w=createWorld(program);
 for(let i=0;i<12;i++)w=stepWorld(w,program);
 assert(w.turmiteAgents.some(a=>(a.transferCount??0)>0));
 assert(w.turmiteAgents.some(a=>a.transferFrom!==undefined));
 assert(w.turmiteAgents.some(a=>a.genome!==undefined));
 const snap=snapshotWorld(w);
 let reloaded=restoreWorldSnapshot(snap,program);
 for(let i=0;i<40;i++){
  w=stepWorld(w,program);reloaded=stepWorld(reloaded,program);
  assert.deepEqual(w.turmiteAgents,reloaded.turmiteAgents);
  assert.deepEqual(w.cells,reloaded.cells);
  assert.deepEqual(w.turmitePheromones,reloaded.turmitePheromones);
  assert.deepEqual(w.turmiteRivalPheromones,reloaded.turmiteRivalPheromones);
 }
 const cursor=createCaptureCursor(w,program,12,12),nextGeneration=stepWorld(w,program);
 cursor.advance();
 assert.deepEqual(cursor.current.turmiteAgents,nextGeneration.turmiteAgents,
  'GIF/video cursor preserves exact old-contact counters and gene exchanges');
 const corrupt=structuredClone(snap);
 corrupt.turmiteAgents[0].transferFrom=11;
 assert.throws(()=>restoreWorldSnapshot(corrupt,program),/Invalid saved Turmite coordinate/);
 corrupt.turmiteAgents[0].transferFrom=0;
 corrupt.turmiteAgents[0].transferCount=-1;
 assert.throws(()=>restoreWorldSnapshot(corrupt,program),/Invalid saved Turmite coordinate/);
 const oldCfg={...INITIAL_SETTINGS,engine:'turmites',turmiteCount:2};
 const oldWorld=createWorld(oldCfg);
 assert(oldWorld.turmiteAgents.every(a=>a.transferCount===undefined));
 let checks=0;
 for(const mode of ['copy','blend','mutate'])
 for(const gate of ['any','pigment','scent'])
 for(const radius of [0,1,3])
 for(const n of [1,2,4,8]){
  const density=new Uint8Array(169).fill(1);
  const base=[{x:5,y:5,heading:1,genome:{...NEUTRAL_TURMITE_GENOME,turn:2}},
   {x:5,y:5,heading:3,genome:{...NEUTRAL_TURMITE_GENOME,write:-2}},
   {x:6,y:5,heading:0,genome:{...NEUTRAL_TURMITE_GENOME,forage:3}},
   {x:5,y:6,heading:2,genome:{...NEUTRAL_TURMITE_GENOME,metabolism:-1}}];
  const scentField=new Uint8Array(169).fill(90);
  const active={...settings,mode,gate,radius,threshold:20};
  const chemicals={...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true};
  const bulk=run(density,base,n,active,chemicals,scentField,INITIAL_SETTINGS.turmiteLife);
  let serial={cells:density,agents:base,pheromones:scentField};
  for(let k=0;k<n;k++)
   serial=run(serial.cells,serial.agents,1,active,chemicals,
    serial.pheromones,INITIAL_SETTINGS.turmiteLife);
  assert.deepEqual(bulk.agents,serial.agents);
  assert.deepEqual(bulk.cells,serial.cells);
  assert.deepEqual(bulk.pheromones,serial.pheromones);
  checks++;
 }
 console.log('PASS T11: '+checks+' exact batch/serial real-site gene contagion scenarios');
 console.log('PASS T11: synchronized old-gene reads, torus and finite geometry, pigment/scent gates, genuine next-step paint');
 console.log('PASS T11: 40-generation full DNA contact save/replay, GIF cursor parity, old settings bypass, forged donor rejection');
}finally{
 await Promise.all(files.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
