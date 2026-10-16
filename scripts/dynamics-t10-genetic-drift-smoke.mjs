import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/turmite-genetics.ts','scripts/.t10-genes.mjs'],
 ['src/engine/turmite-life.ts','scripts/.t10-life.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t10-spin.mjs'],
 ['src/engine/sim.ts','scripts/.t10-sim.mjs'],
 ['src/engine/types.ts','scripts/.t10-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t10-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.t10-capture.mjs']
];
try {
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {DEFAULT_TURMITE_EVOLUTION,NEUTRAL_TURMITE_GENOME,validTurmiteEvolution,
  validTurmiteGenome,validGeneticAgent,genomeOf,inheritGenome,genomeDiversity}=await load(0);
 const {DEFAULT_TURMITE_LIFE,stepTurmiteLife,initializeLifecycle}=await load(1);
 const {stepTurmites,seedTurmites,DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {INITIAL_SETTINGS}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {createCaptureCursor}=await load(6);
 const evo={...DEFAULT_TURMITE_EVOLUTION,enabled:true,mutationRate:100,mutationSize:1,locus:'all'};
 assert(validTurmiteEvolution(evo));
 for(const b of [{mutationRate:-1},{mutationRate:101},{mutationSize:0},{mutationSize:4},
  {locus:'lie'},{enabled:1}])
  assert(!validTurmiteEvolution({...evo,...b}),'Reject malformed evolution: '+JSON.stringify(b));
 assert(validTurmiteGenome({turn:0,write:0,metabolism:0,forage:0}));
 assert(!validTurmiteGenome({turn:4,write:0,metabolism:0,forage:0}));
 assert(!validTurmiteGenome({turn:0,write:0,metabolism:Infinity,forage:0}));
 assert(!validGeneticAgent({genome:{...NEUTRAL_TURMITE_GENOME,turn:9}}));
 assert(!validGeneticAgent({brood:-1}));
 assert(!validGeneticAgent({parentId:12}));
 assert(!validGeneticAgent({parentId:11},2),'Cannot claim parent slot #12 in a 2-ant universe');
 assert(validGeneticAgent({parentId:1},2));
 assert(!validGeneticAgent({depth:4097}));
 assert.deepEqual(genomeOf({}),NEUTRAL_TURMITE_GENOME);
 const parent={genome:{turn:0,write:-1,metabolism:2,forage:-3},brood:7,depth:3};
 const copied=inheritGenome(parent,1,4,721,evo);
 const copiedAgain=inheritGenome(parent,1,4,721,evo);
 assert.deepEqual(copied,copiedAgain,'Mutation is a pure seeded function of identity, brood and slot');
 assert.notDeepEqual(copied,parent.genome,'A 100% mutation actually changes exactly one allele');
 assert.equal(Object.keys(parent.genome).filter(k=>parent.genome[k]!==copied[k]).length,1);
 assert.deepEqual(inheritGenome(parent,1,4,721,{...evo,mutationRate:0}),
  parent.genome,'Zero mutation rate makes exact clones');
 for(const locus of ['turn','write','metabolism','forage']){
  const genome=inheritGenome({genome:{...NEUTRAL_TURMITE_GENOME},brood:8},0,2,487,
    {...evo,locus,mutationSize:2});
  assert(Object.entries(genome).every(([name,n])=>name===locus?Math.abs(n)===2:n===0),
   'Mutation must hit exactly selected physical locus '+locus);
 }
 for(const n of [-3,3]){
  const atBoundary=inheritGenome({genome:{...NEUTRAL_TURMITE_GENOME,turn:n}},0,1,9,
   {...evo,locus:'turn',mutationSize:3});
  assert.notEqual(atBoundary.turn,n,'100% mutation cannot be silently lost at boundary');
  assert(atBoundary.turn<=3&&atBoundary.turn>=-3);
 }
 const foodCells=new Uint8Array(49);foodCells[24]=1;
 const founder=[
  {x:3,y:3,heading:1,alive:true,energy:210,age:9,
   memory:5,rhythmPhase:60,genome:{turn:1,write:2,metabolism:-2,forage:3},brood:4},
  {x:0,y:0,heading:0,alive:false,age:8,energy:0,
   memory:11,rhythmPhase:199,genome:{turn:-3,write:-3,metabolism:3,forage:-3},
   parentId:8,depth:7,brood:22}
 ];
 const after=founder.map(a=>({...a,x:(a.x+1)%7}));
 const life={...DEFAULT_TURMITE_LIFE,enabled:true,metabolism:5,pigmentFood:10,
  chemicalFood:0,birthEnergy:100,birthCost:40,lifespan:1024,breeding:'bud'};
 const noGene=stepTurmiteLife(founder,after,foodCells,undefined,undefined,7,7,true,
  life,DEFAULT_TURMITE_EVOLUTION);
 const withGenes=stepTurmiteLife(founder,after,foodCells,undefined,undefined,7,7,true,
  life,{...evo,mutationRate:0},99);
 assert.equal(noGene.agents[0].energy,175,
  'Legacy metabolism 5 and pigment food 10 subtract from 210, then reproduction 40');
 assert.equal(withGenes.agents[0].energy,183,
  'Heritable metabolism -2 and forage +3 modify actual old-site energy, then parent birth cost');
 assert.deepEqual(withGenes.agents[1].genome,founder[0].genome,
  'Newborn gets exact parent genome without mutation');
 assert.equal(withGenes.agents[1].parentId,0);
 assert.equal(withGenes.agents[1].depth,1);
 assert.equal(withGenes.agents[1].brood,0);
 assert.equal(withGenes.agents[0].brood,5,'One successful birth increments parent brood counter');
 assert.equal(noGene.agents[1].genome,undefined,
  'Without T10, dormant previous occupant genome may NEVER leak into new baby');
 assert.equal(noGene.agents[1].parentId,undefined);
 assert.equal(noGene.agents[1].depth,undefined);
 assert.equal(noGene.agents[1].brood,undefined);
 assert.deepEqual(founder[1].genome,{turn:-3,write:-3,metabolism:3,forage:-3},
  'Source agents must stay immutable');
 const mutant=stepTurmiteLife(founder,after,foodCells,undefined,undefined,7,7,true,
  life,{...evo,locus:'write'},99);
 assert.notEqual(mutant.agents[1].genome.write,founder[0].genome.write);
 assert.equal(mutant.agents[1].genome.turn,founder[0].genome.turn);
 assert.equal(mutant.agents[1].genome.metabolism,founder[0].genome.metabolism);
 const simple=[{x:3,y:3,heading:0,genome:{turn:1,write:1,metabolism:0,forage:0}}];
 const old=stepTurmites(new Uint8Array(49),7,7,true,'RSLU',simple);
 const turning=stepTurmites(new Uint8Array(49),7,7,true,'RSLU',simple,1,
  DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_MEMORY,undefined,undefined,undefined,undefined,undefined,
  DEFAULT_TURMITE_LIFE,evo,481);
 assert.deepEqual([old.agents[0].x,old.agents[0].y,old.agents[0].heading],[4,3,1]);
 assert.deepEqual([turning.agents[0].x,turning.agents[0].y,turning.agents[0].heading],
  [3,2,0],'Inherited gene changes genuine turning-rule execution R → S');
 assert.equal(old.cells[24],1);
 assert.equal(turning.cells[24],2,'Inherited ink gene modifies stored Uint8 paint, not colors');
 assert.equal(simple[0].genome.turn,1,'T10 step never mutates caller genomes');
 const bypassed=stepTurmites(new Uint8Array(49),7,7,true,'RSLU',simple,1,
  DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_MEMORY,undefined,undefined,undefined,undefined,undefined,
  DEFAULT_TURMITE_LIFE,{...evo,enabled:false},481);
 assert.deepEqual(bypassed.agents,old.agents);
 assert.deepEqual(bypassed.cells,old.cells,
  'T10 OFF exactly preserves pre-T10 movement and track even with persisted nonzero genes');
 assert.equal(genomeDiversity([{genome:NEUTRAL_TURMITE_GENOME,alive:true}],true),1,
  'One surviving organism is ONE distinct genome');
 assert.equal(genomeDiversity([{genome:NEUTRAL_TURMITE_GENOME,alive:false}],true),0);
 assert.equal(genomeDiversity([{genome:NEUTRAL_TURMITE_GENOME,alive:true},
  {genome:NEUTRAL_TURMITE_GENOME,alive:false},{genome:{...NEUTRAL_TURMITE_GENOME,turn:1}}],true),2);
 assert.equal(genomeDiversity([{genome:NEUTRAL_TURMITE_GENOME,alive:true},
  {genome:NEUTRAL_TURMITE_GENOME,alive:false},{genome:{...NEUTRAL_TURMITE_GENOME,turn:1}}],false),2);
 const cfg={...INITIAL_SETTINGS,engine:'turmites',cellCount:40,
  turmiteRule:'RSLURSLU',turmiteCount:8,turmiteSteps:4,
  turmiteFormation:'stack',turmiteSpeciesCount:4,
  turmiteMemory:{...INITIAL_SETTINGS.turmiteMemory,enabled:true,mode:'write'},
  turmitePheromoneRules:{...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true},
  turmiteDuet:{...INITIAL_SETTINGS.turmiteDuet,enabled:true,reaction:'neutralize'},
  turmiteRhythm:{...INITIAL_SETTINGS.turmiteRhythm,enabled:true},
  turmiteLife:{...life,founders:2,initialEnergy:200,birthEnergy:95,birthCost:35},
  turmiteEvolution:{...evo,mutationRate:100,locus:'all'}
 };
 let w=createWorld(cfg);
 assert.equal(w.turmiteAgents.length,8);
 for(let i=0;i<16;i++)w=stepWorld(w,cfg);
 assert(w.turmiteAgents.some(a=>a.parentId!==undefined),'Living colonies generate real lineages');
 assert(w.turmiteAgents.some(a=>a.genome!==undefined),'Real births store heritable alleles');
 const packed=snapshotWorld(w);
 assert.deepEqual(packed.turmiteAgents,w.turmiteAgents);
 let restored=restoreWorldSnapshot(packed,cfg);
 for(let i=0;i<40;i++){
  w=stepWorld(w,cfg);restored=stepWorld(restored,cfg);
  assert.deepEqual(w.turmiteAgents,restored.turmiteAgents,
   'Saved population genealogy, mutations, resources and oscillator phases replay exactly');
  assert.deepEqual(w.cells,restored.cells);
  assert.deepEqual(w.turmitePheromones,restored.turmitePheromones);
  assert.deepEqual(w.turmiteRivalPheromones,restored.turmiteRivalPheromones);
 }
 const rec=createCaptureCursor(w,cfg,12,12),recNext=stepWorld(w,cfg);
 rec.advance();
 assert.deepEqual(rec.current.turmiteAgents,recNext.turmiteAgents);
 const invalid=structuredClone(packed);
 invalid.turmiteAgents[0].genome={turn:99,write:0,metabolism:0,forage:0};
 assert.throws(()=>restoreWorldSnapshot(invalid,cfg),/Invalid saved Turmite coordinate/);
 invalid.turmiteAgents[0].genome={...NEUTRAL_TURMITE_GENOME};
 invalid.turmiteAgents[0].parentId=12;
 assert.throws(()=>restoreWorldSnapshot(invalid,cfg),/Invalid saved Turmite coordinate/);
 invalid.turmiteAgents[0].parentId=11;
 assert.throws(()=>restoreWorldSnapshot(invalid,cfg),/Invalid saved Turmite coordinate/,
  'Parent registry ID below 12 but above real capacity 8 must be rejected');
 invalid.turmiteAgents[0].parentId=7;
 assert.doesNotThrow(()=>restoreWorldSnapshot(invalid,cfg));
 const legacy={...INITIAL_SETTINGS,engine:'turmites',turmiteCount:3,cellCount:32};
 const plain=createWorld(legacy);
 assert(plain.turmiteAgents.every(a=>a.genome===undefined&&a.brood===undefined));
 let checks=0;
 const run=(cells,agents,n,settings,field,rival)=>stepTurmites(cells,13,13,true,
  'RSLURSLU',agents,n,DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,settings.memory,settings.chemical,field,
  settings.duet,rival,settings.rhythm,settings.life,settings.evo,789);
 for(const locus of ['all','turn','write','metabolism','forage'])
 for(const rate of [0,100])
 for(const chemistry of [false,true])
 for(const rhythmOn of [false,true])
 for(const steps of [1,2,4,8]){
  const settings={memory:{...INITIAL_SETTINGS.turmiteMemory,enabled:true,mode:'tick'},
   chemical:{...INITIAL_SETTINGS.turmitePheromoneRules,enabled:chemistry},
   duet:{...INITIAL_SETTINGS.turmiteDuet,enabled:chemistry},
   rhythm:{...INITIAL_SETTINGS.turmiteRhythm,enabled:rhythmOn},
   life:{...life,founders:2,initialEnergy:190},
   evo:{...evo,locus,mutationRate:rate}};
  const source=initializeLifecycle(seedTurmites(13,13,8,21,'stack'),
   {...life,founders:2,initialEnergy:190});
  const art=new Uint8Array(169).fill(1);
  const field=chemistry?new Uint8Array(169).fill(96):undefined;
  const rival=chemistry?new Uint8Array(169):undefined;
  const batch=run(art,source,steps,settings,field,rival);
  let serial={cells:art,agents:source,pheromones:field,rivalPheromones:rival};
  for(let k=0;k<steps;k++)
   serial=run(serial.cells,serial.agents,1,settings,serial.pheromones,serial.rivalPheromones);
  assert.deepEqual(batch.agents,serial.agents);
  assert.deepEqual(batch.cells,serial.cells);
  assert.deepEqual(batch.pheromones,serial.pheromones);
  assert.deepEqual(batch.rivalPheromones,serial.rivalPheromones);
  checks++;
 }
 console.log('PASS T10: '+checks+' accelerated/serial deterministic four-locus T1–T9 genealogical simulations');
 console.log('PASS T10: real inherited turn, stored ink, metabolic cost, pigment nutrition, mutation and stable parent IDs');
 console.log('PASS T10: unchanged OFF physics, 40-step exact genetic snapshot replay, recorder and malformed DNA rejected');
}finally{
 await Promise.all(files.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
