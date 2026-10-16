import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/turmite-dna-fossils.ts','scripts/.t12-dna.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t12-ant.mjs'],
 ['src/engine/types.ts','scripts/.t12-types.mjs'],
 ['src/engine/sim.ts','scripts/.t12-sim.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t12-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t12-capture.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {DEFAULT_TURMITE_DNA_FOSSILS,validDnaFossilSettings,
  validDnaFossilAgent,validDnaPool,encodeDnaFragment,
  decodeDnaFragment,stepDnaFossils,dnaPoolStats}=await load(0);
 const {stepTurmites,DEFAULT_TURMITE_DYNAMICS,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_MEMORY}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {createCaptureCursor}=await load(5);
 const s={...DEFAULT_TURMITE_DNA_FOSSILS,enabled:true,deposit:170,
  spread:0,decay:0,uptake:100,threshold:1,locus:'write',mode:'copy'};
 assert(validDnaFossilSettings(s));
 for(const patch of [{enabled:'yes'},{deposit:-1},{deposit:256},{decay:33},
  {spread:9},{uptake:101},{threshold:0},{threshold:256},
  {locus:'alien'},{mode:'telepathy'}]){
  assert(!validDnaFossilSettings({...s,...patch}),JSON.stringify(patch));
 }
 for(const [locus,id] of [['turn',0],['write',1],['metabolism',2],['forage',3]])
 for(let gene=-3;gene<=3;gene++)
  assert.deepEqual(decodeDnaFragment(encodeDnaFragment(locus,gene)),
   {locus,allele:gene},'Every true gene+allele must have a unique lattice fragment');
 assert.equal(decodeDnaFragment(0),null);
 assert.throws(()=>decodeDnaFragment(29),/Invalid extracellular/);
 assert(!validDnaFossilAgent({x:0,y:0,uptakeCount:-1},49));
 assert(!validDnaFossilAgent({x:0,y:0,uptakeSite:49},49));
 assert(!validDnaFossilAgent({x:0,y:0,uptakeGene:'horror'},49));
 const zero={code:new Uint8Array(49),strength:new Uint8Array(49)};
 assert(validDnaPool(zero,49));
 const broken={code:zero.code.slice(),strength:zero.strength.slice()};
 broken.code[4]=29;
 assert(!validDnaPool(broken,49));
 broken.code[4]=0;broken.strength[4]=40;
 assert(!validDnaPool(broken,49),'Strength cannot exist without genetic identity');
 const gene={turn:0,write:2,metabolism:0,forage:0};
 const before=[
  {x:2,y:2,alive:true,genome:gene},
  {x:0,y:0,alive:true,genome:{turn:0,write:0,metabolism:0,forage:0}}
 ];
 const first=stepDnaFossils(before,before,zero,new Uint8Array(49),
  7,7,true,true,true,s,871);
 assert.equal(first.exposures,0,'Newly shed DNA cannot be taken up in the same microstep');
 assert.equal(first.pool.code[2+2*7],encodeDnaFragment('write',2));
 assert.equal(first.pool.strength[2+2*7],170);
 assert.equal(first.pool.strength[0],170);
 assert.equal(zero.strength[16],0,'Environmental field input stays immutable');
 const revisiting=[{...before[0],x:5,y:5},
  {...before[1],x:2,y:2}];
 const transform=stepDnaFossils(revisiting,revisiting,first.pool,new Uint8Array(49),
  7,7,true,true,true,{...s,deposit:0},871);
 assert.equal(transform.exposures,1);
 assert.equal(transform.uptakes,1);
 assert.equal(transform.agents[1].genome.write,2,
  'Visiting a REAL earlier site changes actual visitor genetic DNA');
 assert.equal(transform.agents[1].uptakeCount,1);
 assert.equal(transform.agents[1].uptakeGene,'write');
 assert.equal(transform.agents[1].uptakeSite,16);
 assert.equal(transform.agents[0].genome.write,2);
 const inert=stepDnaFossils(revisiting,revisiting,first.pool,new Uint8Array(49),
  7,7,true,true,true,{...s,deposit:0,uptake:0},871);
 assert.equal(inert.exposures,1);assert.equal(inert.uptakes,0);
 assert.equal(inert.agents[1].uptakeCount,1,'Exposure counter tracks FAILED absorption');
 const mutated=stepDnaFossils(revisiting,revisiting,first.pool,new Uint8Array(49),
  7,7,true,true,true,{...s,deposit:0,mode:'mutate'},871);
 assert.notEqual(mutated.agents[1].genome.write,2,'Mutagenic spores change allele');
 assert.deepEqual(mutated.agents,stepDnaFossils(revisiting,revisiting,
  first.pool,new Uint8Array(49),7,7,true,true,true,
  {...s,deposit:0,mode:'mutate'},871).agents);
 const mixed=stepDnaFossils(revisiting,revisiting,first.pool,new Uint8Array(49),
  7,7,true,true,true,{...s,deposit:0,mode:'blend'},871);
 assert.equal(mixed.agents[1].genome.write,1);
 const frozen=stepDnaFossils(revisiting,revisiting,first.pool,new Uint8Array(49),
  7,7,true,true,true,{...s,enabled:false},871);
 assert.deepEqual(frozen.pool,first.pool);
 assert.equal(frozen.exposures,0);assert.equal(frozen.agents[1].genome.write,0);
 const t10Off=stepDnaFossils(revisiting,revisiting,first.pool,new Uint8Array(49),
  7,7,true,true,false,s,871);
 assert.deepEqual(t10Off.pool,first.pool);
 const dead=[{...revisiting[0],alive:false},revisiting[1]];
 const deadResult=stepDnaFossils(dead,dead,first.pool,new Uint8Array(49),
  7,7,true,true,true,{...s,deposit:0},871);
 assert.equal(deadResult.exposures,1,'Live visitor can absorb old fossil with another ant dormant');
 const diedThisStep=stepDnaFossils([before[0]],[{...before[0],alive:false}],
  zero,new Uint8Array(49),7,7,true,true,true,s,871);
 assert.equal(diedThisStep.pool.strength[16],170,
  'True death still sheds a LAST viable fragment at previous location');
 const newborn=stepDnaFossils([{...before[0],alive:false}],
  [{...before[0],alive:true}],zero,new Uint8Array(49),7,7,true,true,true,s,871);
 assert.equal(newborn.pool.strength[16],0,'New baby never deposits dead slot DNA');
 // Diffusion copies information one neighbor site per microstep, without
 // accelerating through a newly created fragment in the same microstep.
 const seedPool={code:new Uint8Array(49),strength:new Uint8Array(49)};
 seedPool.code[0]=encodeDnaFragment('turn',3);seedPool.strength[0]=200;
 const propagated=stepDnaFossils([{x:5,y:5}], [{x:5,y:5}],
  seedPool,new Uint8Array(49),7,7,false,false,true,
  {...s,deposit:0,spread:8,decay:2},871);
 assert.equal(propagated.pool.strength[1],198);
 assert.equal(propagated.pool.code[1],seedPool.code[0]);
 assert.equal(propagated.pool.code[2],0,'No same-step multiple-hop teleporting DNA');
 assert.equal(propagated.pool.code[6],0,'Finite edge does not wrap');
 const wrapped=stepDnaFossils([{x:5,y:5}],[{x:5,y:5}],
  seedPool,new Uint8Array(49),7,7,true,false,true,
  {...s,deposit:0,spread:8,decay:2},871);
 assert.equal(wrapped.pool.code[6],seedPool.code[0]);
 const extinct=stepDnaFossils([{x:5,y:5,alive:false}],[{x:5,y:5,alive:false}],
  seedPool,new Uint8Array(49),7,7,true,true,true,
  {...s,deposit:0,spread:8,decay:2},871);
 assert.equal(extinct.pool.code[1],seedPool.code[0],
  'Extracellular DNA continues spreading even after total colony extinction');
 assert(dnaPoolStats(wrapped.pool).sites>2);
 // Unit test one real T10 ant acquires an old spore and the NEXT step
 // genuinely modifies stored Uint8 cells compared with a non-uptake ant.
 const oldCells=new Uint8Array(169),ant=[{x:6,y:6,heading:0,
  genome:{turn:0,write:0,metabolism:0,forage:0}}];
 const pool={code:new Uint8Array(169),strength:new Uint8Array(169)};
 pool.code[6+6*13]=encodeDnaFragment('write',2);
 pool.strength[6+6*13]=250;
 const evo={...INITIAL_SETTINGS.turmiteEvolution,enabled:true};
 const run=(cells,ants,n,dna,coded,strong)=>stepTurmites(cells,13,13,true,
  'RSLU',ants,n,DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,
  INITIAL_SETTINGS.turmitePheromoneRules,undefined,
  INITIAL_SETTINGS.turmiteDuet,undefined,INITIAL_SETTINGS.turmiteRhythm,
  INITIAL_SETTINGS.turmiteLife,evo,871,INITIAL_SETTINGS.turmiteGeneSpill,
  dna,coded,strong);
 const stepped=run(oldCells,ant,1,{...s,deposit:0},pool.code,pool.strength);
 assert.equal(stepped.agents[0].genome.write,2);
 assert.equal(stepped.cells[6+6*13],1,'Old DNA cannot influence this step prior paint');
 const second=run(stepped.cells,stepped.agents,1,{...s,enabled:false},
  stepped.dnaCode,stepped.dnaStrength);
 const counter=run(stepped.cells,stepped.agents.map(a=>({...a,genome:{...a.genome,write:0}})),
  1,{...s,enabled:false},stepped.dnaCode,stepped.dnaStrength);
 assert.notDeepEqual(second.cells,counter.cells,
  'Actually absorbed extracellular DNA changes next-step real Uint8 paint');
 const cfg={...INITIAL_SETTINGS,engine:'turmites',seed:871,cellCount:40,
  turmiteCount:4,turmiteFormation:'stack',turmiteSteps:4,turmiteRule:'RSLURSLU',
  turmiteEvolution:evo,turmiteDnaFossils:{...s,spread:5,decay:2,deposit:150},
  turmitePheromoneRules:{...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true},
  turmiteGeneSpill:{...INITIAL_SETTINGS.turmiteGeneSpill,enabled:true,probability:100},
  turmiteRhythm:{...INITIAL_SETTINGS.turmiteRhythm,enabled:true},
  turmiteMemory:{...INITIAL_SETTINGS.turmiteMemory,enabled:true}
 };
 let world=createWorld(cfg);
 assert(world.turmiteDnaCode instanceof Uint8Array);
 for(let i=0;i<12;i++)world=stepWorld(world,cfg);
 assert(world.turmiteDnaStrength.some(x=>x>0));
 const snap=snapshotWorld(world);
 let restored=restoreWorldSnapshot(snap,cfg);
 assert.deepEqual(world.turmiteDnaCode,restored.turmiteDnaCode);
 assert.deepEqual(world.turmiteDnaStrength,restored.turmiteDnaStrength);
 for(let i=0;i<40;i++){
  world=stepWorld(world,cfg);restored=stepWorld(restored,cfg);
  assert.deepEqual(world.cells,restored.cells);
  assert.deepEqual(world.turmiteAgents,restored.turmiteAgents);
  assert.deepEqual(world.turmiteDnaCode,restored.turmiteDnaCode);
  assert.deepEqual(world.turmiteDnaStrength,restored.turmiteDnaStrength);
  assert.deepEqual(world.turmitePheromones,restored.turmitePheromones);
 }
 const cursor=createCaptureCursor(world,cfg,12,12);
 const nextWorld=stepWorld(world,cfg);
 assert.equal(cursor.advance().changed,true);
 assert.deepEqual(cursor.current.turmiteDnaCode,nextWorld.turmiteDnaCode);
 assert.deepEqual(cursor.current.turmiteDnaStrength,nextWorld.turmiteDnaStrength);
 const bogus=structuredClone(snap);
 bogus.arrays.turmiteDnaCode=Buffer.from(new Uint8Array(world.cells.length).fill(29)).toString('base64');
 assert.throws(()=>restoreWorldSnapshot(bogus,cfg),/Invalid saved extracellular DNA/);
 bogus.arrays.turmiteDnaCode=snap.arrays.turmiteDnaCode;
 bogus.turmiteAgents[0].uptakeSite=world.cells.length;
 assert.throws(()=>restoreWorldSnapshot(bogus,cfg),/Invalid saved Turmite coordinate/);
 const legacyCfg={...INITIAL_SETTINGS,engine:'turmites',turmiteCount:2};
 const legacyWorld=createWorld(legacyCfg);
 assert.equal(legacyWorld.turmiteDnaCode,undefined);
 assert.equal(legacyWorld.turmiteDnaStrength,undefined);
 const oldSaved=snapshotWorld(legacyWorld);
 const restoredLegacy=restoreWorldSnapshot(oldSaved,
  {...legacyCfg,turmiteDnaFossils:{...s,enabled:true}});
 assert.equal(restoredLegacy.turmiteDnaCode,undefined,
  'Old recipes missing DNA fields must remain valid until true stepping');
 let checks=0;
 for(const mode of ['copy','blend','mutate'])
 for(const spread of [0,3,8])
 for(const threshold of [1,100])
 for(const steps of [1,2,4,8]){
  const opt={...s,mode,spread,threshold,deposit:210,decay:2};
  const cells=new Uint8Array(169).fill(1);
  const ant=[
   {x:5,y:5,heading:0,genome:{turn:1,write:0,metabolism:0,forage:0}},
   {x:5,y:5,heading:1,genome:{turn:0,write:2,metabolism:0,forage:0}},
   {x:6,y:5,heading:2,genome:{turn:0,write:0,metabolism:-1,forage:1}}
  ];
  const dna=new Uint8Array(169),str=new Uint8Array(169);
  dna[5+5*13]=encodeDnaFragment('forage',3);
  str[5+5*13]=255;
  const batch=run(cells,ant,steps,opt,dna,str);
  let serial={cells,agents:ant,dnaCode:dna,dnaStrength:str};
  for(let k=0;k<steps;k++)serial=run(serial.cells,serial.agents,1,
   opt,serial.dnaCode,serial.dnaStrength);
  assert.deepEqual(batch.agents,serial.agents);
  assert.deepEqual(batch.cells,serial.cells);
  assert.deepEqual(batch.dnaCode,serial.dnaCode);
  assert.deepEqual(batch.dnaStrength,serial.dnaStrength);
  checks++;
 }
 console.log('PASS T12: '+checks+' exact batched/serial environmental DNA worlds');
 console.log('PASS T12: real fragment uptake, one-hop propagation, final death deposit, extinction fossils and next-step paint');
 console.log('PASS T12: 40-generation full genome/field/chemistry saved replay, video/GIF cursor and malformed DNA rejection');
}finally{
 await Promise.all(files.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
