import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/turmite-life.ts','scripts/.t9-life.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t9-spin.mjs'],
 ['src/engine/types.ts','scripts/.t9-types.mjs'],
 ['src/engine/sim.ts','scripts/.t9-sim.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t9-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t9-capture.mjs'],
 ['src/engine/turmite-rhythm.ts','scripts/.t9-rhythm.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,format:'esm',platform:'node',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {DEFAULT_TURMITE_LIFE,validTurmiteLife,initializeLifecycle,
  stepTurmiteLife,lifeIsActive,validateLifecycleAgent}=await load(0);
 const {seedTurmites,stepTurmites}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {createCaptureCursor}=await load(5);
 const {rhythmOrderParameter}=await import(pathToFileURL(resolve('scripts/.t9-rhythm.mjs')).href);
 const paired=[{x:1,y:1,heading:0,alive:false,rhythmPhase:0},
  {x:2,y:2,heading:1,alive:true,rhythmPhase:128}];
 assert(Math.abs(rhythmOrderParameter(paired,true)-1)<1e-12,
  'T9 ON: the lone living ant is trivially perfectly coherent');
 assert(Math.abs(rhythmOrderParameter(paired,false))<1e-12,
  'T9 OFF: both ant clocks are participating and the order includes both');
 const l={...DEFAULT_TURMITE_LIFE,enabled:true,founders:1};
 assert(validTurmiteLife(l));
 for(const patch of [{founders:0},{founders:13},{lifespan:1},{lifespan:4097},
  {initialEnergy:256},{pigmentFood:33},{chemicalFood:-1},{birthCost:0},
  {birthEnergy:256},{metabolism:17},{breeding:'magic'},{enabled:'yes'}]){
  assert(!validTurmiteLife({...l,...patch}),JSON.stringify(patch));
 }
 assert(!validateLifecycleAgent({x:0,y:0,heading:0,energy:256}));
 assert(!validateLifecycleAgent({x:0,y:0,heading:0,alive:'yes'}));
 assert(!validateLifecycleAgent({x:0,y:0,heading:0,age:-1}));
 const generated=seedTurmites(7,7,4,39,'cross');
 const founders=initializeLifecycle(generated,l);
 assert.deepEqual(founders.map(a=>a.alive),[true,false,false,false]);
 assert.deepEqual(founders.map(a=>a.energy),[96,0,0,0]);
 assert(generated.every(a=>!('alive' in a)),
  'Creating a colony never mutates the original agent registry');
 assert.deepEqual(initializeLifecycle(generated,{...l,enabled:false}),generated,
  'T9 OFF preserves byte-for-byte T1–T8 legacy agent shape');
 const original=[
  {x:2,y:2,heading:1,alive:true,age:4,energy:170,memory:6,rhythmPhase:33},
  {x:3,y:3,heading:0,alive:false,age:10,energy:0,memory:5,rhythmPhase:40},
  {x:4,y:3,heading:3,alive:false,age:10,energy:0,memory:7,rhythmPhase:10}
 ];
 const moved=original.map(a=>({...a,x:Math.min(6,a.x+1)}));
 const food=new Uint8Array(49);food[2+2*7]=1;
 const a=new Uint8Array(49);a[2+2*7]=255;
 const b=new Uint8Array(49);b[2+2*7]=255;
 const reproduction={...l,metabolism:4,pigmentFood:10,chemicalFood:8,
  birthEnergy:150,birthCost:50,breeding:'bud'};
 const birth=stepTurmiteLife(original,moved,food,a,b,7,7,true,reproduction);
 assert.equal(birth.stats.births,1);
 assert.equal(birth.stats.active,2);
 assert.equal(birth.agents[0].energy,134,'Parent pays a genuine finite energetic birth cost');
 assert.equal(birth.agents[0].age,5);
 assert.equal(birth.agents[1].alive,true);
 assert.equal(birth.agents[1].age,0);
 assert.equal(birth.agents[1].energy,50);
 assert.deepEqual([birth.agents[1].x,birth.agents[1].y],[4,2],
  'Genuine newborn is located at an adjacent physical cell');
 assert.equal(birth.agents[1].memory,0);
 assert.equal(birth.agents[1].rhythmPhase,73);
 assert.equal(birth.agents[2].alive,false,'One birth per viable parent, other slot stays dormant');
 assert.deepEqual(original[1],{x:3,y:3,heading:0,alive:false,age:10,energy:0,memory:5,rhythmPhase:40});
 const split=stepTurmiteLife(original,moved,food,a,b,7,7,true,
  {...reproduction,breeding:'split'});
 assert.equal(split.agents[1].heading,3,'Split buds against parent heading');
 assert.equal(split.agents[1].energy,25);
 const noBirth=stepTurmiteLife(original,moved,food,a,b,7,7,true,
  {...reproduction,breeding:'off'});
 assert.equal(noBirth.stats.births,0);
 assert.equal(noBirth.agents[1].alive,false);
 const noChem=stepTurmiteLife(original,moved,food,undefined,undefined,7,7,true,reproduction);
 assert.equal(noChem.agents[0].energy,126,
  'Saved old scent, not future paint or fake overlay, provides real resource');
 const starvation=stepTurmiteLife([{
  x:2,y:2,heading:0,alive:true,age:1,energy:2
 }],[{x:2,y:1,heading:0}],new Uint8Array(49),undefined,undefined,7,7,true,
 {...reproduction,pigmentFood:0,chemicalFood:0,metabolism:5});
 assert.equal(starvation.agents[0].alive,false);
 assert.equal(starvation.agents[0].energy,0);
 const senescent=stepTurmiteLife([{
  x:2,y:2,heading:0,alive:true,age:5,energy:180
 }],[{x:2,y:1,heading:0}],new Uint8Array(49),undefined,undefined,7,7,true,
 {...reproduction,lifespan:6,metabolism:0});
 assert.equal(senescent.agents[0].alive,false,'True microstep age forces mortality');
 assert.deepEqual(stepTurmiteLife(original,moved,food,a,b,7,7,true,
 {...reproduction,enabled:false}).agents,moved,'T9 bypass freezes biology');
 const rule='RSLU';
 const agents=initializeLifecycle(seedTurmites(13,13,6,42,'cross'),{
  ...l,founders:2,initialEnergy:130
 });
 const state=new Uint8Array(169);state.fill(1);
 const settings={...INITIAL_SETTINGS,engine:'turmites',cellCount:40,
  turmiteRule:'RSLURSLU',turmiteCount:8,turmiteSteps:4,
  turmiteSpeciesCount:4,turmiteContact:'repel',turmiteFormation:'cross',
  turmiteLife:{...l,founders:2,initialEnergy:150,
   birthEnergy:125,birthCost:40,metabolism:2,pigmentFood:16,lifespan:24},
  turmiteMemory:{...INITIAL_SETTINGS.turmiteMemory,enabled:true,mode:'write'},
  turmiteRhythm:{...INITIAL_SETTINGS.turmiteRhythm,enabled:true,coupling:18},
  turmitePheromoneRules:{...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true},
  turmiteDuet:{...INITIAL_SETTINGS.turmiteDuet,enabled:true}
 };
 let world=createWorld(settings);
 assert.equal(world.turmiteLifeEnabled,true);
 assert.equal(world.turmiteAgents.length,8);
 assert.equal(world.turmiteAgents.filter(lifeIsActive).length,2);
 assert(world.turmiteAgents.slice(2).every(a=>a.energy===0&&a.alive===false));
 for(let i=0;i<18;i++)world=stepWorld(world,settings);
 assert(world.turmiteAgents.some(a=>a.alive===true&&a.age>0),
  'Real moving ecological agents maintain age and nutrient registers');
 const cursor=createCaptureCursor(world,settings,12,12);
 const first=stepWorld(world,settings);
 assert.equal(cursor.advance().changed,true,'Metabolism and aging are real physical changes in recorder');
 assert.deepEqual(cursor.current.turmiteAgents,first.turmiteAgents);
 const snap=snapshotWorld(world);
 assert.deepEqual(snap.turmiteAgents,world.turmiteAgents);
 let replay=restoreWorldSnapshot(snap,settings);
 for(let step=0;step<32;step++){
  world=stepWorld(world,settings);
  replay=stepWorld(replay,settings);
  assert.deepEqual(replay.turmiteAgents,world.turmiteAgents);
  assert.deepEqual(replay.cells,world.cells);
  assert.deepEqual(replay.turmitePheromones,world.turmitePheromones);
  assert.deepEqual(replay.turmiteRivalPheromones,world.turmiteRivalPheromones);
 }
 const malformed=structuredClone(snap);
 malformed.turmiteAgents[0].energy=999;
 assert.throws(()=>restoreWorldSnapshot(malformed,settings),/Invalid saved Turmite coordinate/);
 const legacy={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,turmiteCount:3};
 const worldOld=createWorld(legacy);
 assert(worldOld.turmiteAgents.every(a=>a.energy===undefined&&a.age===undefined&&a.alive===undefined));
 assert.equal(worldOld.turmiteLifeEnabled,false);
 for(let i=0;i<8;i++)assert.equal(stepWorld(worldOld,legacy).turmiteAgents[0].energy,undefined);
 let checks=0;
 for(const breeding of ['off','bud','split'])
 for(const chemOn of [false,true])
 for(const rhythmOn of [false,true])
 for(const steps of [1,2,4,8]){
  const L={...l,founders:2,breeding,initialEnergy:135,metabolism:1,
   birthEnergy:105,birthCost:38,pigmentFood:20,lifespan:38};
  const initial=initializeLifecycle(agents,L);
  const scent=chemOn?new Uint8Array(169).fill(81):undefined;
  const rhythm={...INITIAL_SETTINGS.turmiteRhythm,enabled:rhythmOn};
  const memory={...INITIAL_SETTINGS.turmiteMemory,enabled:true,mode:'tick'};
  const chem={...INITIAL_SETTINGS.turmitePheromoneRules,enabled:chemOn};
  const duel={...INITIAL_SETTINGS.turmiteDuet,enabled:chemOn};
  const args=[INITIAL_SETTINGS.turmiteAlchemy,memory,chem] ;
  const run=(cell,ant,round,field,bField)=>stepTurmites(cell,13,13,true,rule,ant,round,
   {...{speciesCount:2,speciesStride:0,speciesMirror:false,headingShear:0,contact:'repel'}},
   {mode:'next',stride:1,table:INITIAL_SETTINGS.turmiteWriteTable},
   ...args,field,duel,bField,rhythm,L);
  const batch=run(state,initial,steps,scent,chemOn?new Uint8Array(169):undefined);
  let single={cells:state,agents:initial,pheromones:scent,
   rivalPheromones:chemOn?new Uint8Array(169):undefined};
  for(let i=0;i<steps;i++)
   single=run(single.cells,single.agents,1,single.pheromones,single.rivalPheromones);
  assert.deepEqual(batch.agents,single.agents);
  assert.deepEqual(batch.cells,single.cells);
  assert.deepEqual(batch.pheromones,single.pheromones);
  assert.deepEqual(batch.rivalPheromones,single.rivalPheromones);
  checks++;
 }
 console.log('PASS T9: '+checks+' exact batched/serial living T5–T8 chemistry and oscillator combinations');
 console.log('PASS T9: real old-track/scent nutrition, starvation, age mortality, budding/splitting, stable dormant IDs');
 console.log('PASS T9: unchanged OFF baseline, 32-generation recipe/GIF cursor parity, malformed energy rejection');
}finally{
 await Promise.all(files.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
