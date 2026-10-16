import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/turmite-niches.ts','scripts/.t13-niches.mjs'],
 ['src/engine/turmite-dna-fossils.ts','scripts/.t13-dna.mjs'],
 ['src/engine/turmite-life.ts','scripts/.t13-life.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t13-spin.mjs'],
 ['src/engine/sim.ts','scripts/.t13-sim.mjs'],
 ['src/engine/types.ts','scripts/.t13-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t13-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t13-capture.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {DEFAULT_TURMITE_NICHES,validTurmiteNiches,siteNicheFitness,
  nicheSteerHeading,nicheEnergyAt,nicheNurseryHeading,nicheDirectionSite}=await load(0);
 const {encodeDnaFragment}=await load(1);
 const {DEFAULT_TURMITE_LIFE,stepTurmiteLife}=await load(2);
 const {stepTurmites,DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY}=await load(3);
 const {createWorld,stepWorld}=await load(4);
 const {INITIAL_SETTINGS}=await load(5);
 const {snapshotWorld,restoreWorldSnapshot}=await load(6);
 const {createCaptureCursor}=await load(7);
 const opt={...DEFAULT_TURMITE_NICHES,enabled:true,steering:8,
  policy:'kin',threshold:1,nutrient:24,hazard:20,nursery:true};
 assert(validTurmiteNiches(opt));
 for(const p of [{policy:'magic'},{tolerance:-1},{tolerance:4},
  {threshold:0},{threshold:256},{steering:-1},{steering:9},
  {nutrient:33},{hazard:33},{nursery:'yes'},{enabled:'yes'}])
  assert(!validTurmiteNiches({...opt,...p}),JSON.stringify(p));
 const fieldCode=new Uint8Array(49),fieldStr=new Uint8Array(49);
 const write=(x,y,locus,allele,strength=255)=>{
  fieldCode[y*7+x]=encodeDnaFragment(locus,allele);
  fieldStr[y*7+x]=strength;
 };
 const ant={x:3,y:3,heading:0,
  genome:{turn:0,write:2,metabolism:0,forage:0}};
 write(4,3,'write',2); // E matches the selected actual genome
 write(2,3,'write',-2); // W is hostile to this genotype
 assert.equal(siteNicheFitness(ant,fieldCode,fieldStr,3*7+4,opt).fitness,255);
 assert.equal(siteNicheFitness(ant,fieldCode,fieldStr,3*7+4,
  {...opt,enabled:false}).matching,true,
  'Physical DNA remains genuinely matching even when T13 habitat physics OFF');
 assert.equal(siteNicheFitness(ant,fieldCode,fieldStr,3*7+4,
  {...opt,threshold:255}).matching,true);
 assert.equal(siteNicheFitness(ant,fieldCode,fieldStr,3*7+2,opt).fitness,0);
 assert.equal(nicheSteerHeading(ant,3,3,0,7,7,false,fieldCode,fieldStr,opt),1,
  'Actual nearby matched DNA changes true L/R/S/U ant movement to EAST');
 assert.equal(nicheSteerHeading(ant,3,3,0,7,7,false,fieldCode,fieldStr,
  {...opt,policy:'novelty'}),3,'NOVELTY seeks real mismatched WEST DNA');
 assert.equal(nicheSteerHeading(ant,3,3,3,7,7,false,fieldCode,fieldStr,
  {...opt,policy:'avoid-foreign'}),0,'Hostile DNA repels a WEST-facing organism');
 assert.equal(nicheSteerHeading(ant,3,3,0,7,7,false,fieldCode,fieldStr,
  {...opt,steering:0}),0);
 assert.equal(nicheSteerHeading(ant,3,3,0,7,7,false,fieldCode,fieldStr,
  {...opt,threshold:255}),1,'Threshold is inclusive');
 assert.equal(nicheSteerHeading(ant,3,3,0,7,7,false,fieldCode,fieldStr,
  {...opt,threshold:255,steering:0}),0);
 // Finite-world edge regression: westward 'escape' at x=0 reflects EAST.
 // A foreign DNA site to the east cannot be dodged by pretending the
 // off-grid west cell is neutral, when the north neighbor is actually safe.
 const edgeCodes=new Uint8Array(49),edgeStrength=new Uint8Array(49);
 const mark=(x,y,score)=>{edgeCodes[x+y*7]=encodeDnaFragment('write',score);
  edgeStrength[x+y*7]=255;};
 mark(1,3,-2);mark(0,4,-2);
 const atEdge={...ant,x:0,y:3,heading:1};
 assert.equal(nicheDirectionSite(0,3,3,7,7,false),3*7+1,
  'Inspector compass must use the actual reflected EAST neighbor for off-grid WEST');
 assert.equal(nicheDirectionSite(0,3,3,7,7,true),3*7+6,
  'Wrapped worlds must show true opposite-edge WEST DNA');
 assert.equal(nicheSteerHeading(atEdge,0,3,1,7,7,false,
  edgeCodes,edgeStrength,{...opt,policy:'avoid-foreign'}),0,
  'At finite edge, off-grid west scores reflected east danger, chooses safe NORTH');
 assert.equal(siteNicheFitness(ant,fieldCode,fieldStr,3*7+4,
  {...opt,threshold:255,enabled:false}).matching,true);
 assert.equal(nicheEnergyAt(ant,3*7+4,fieldCode,fieldStr,opt),24);
 assert.equal(nicheEnergyAt(ant,3*7+2,fieldCode,fieldStr,opt),-20);
 assert.equal(nicheEnergyAt(ant,3*7+4,fieldCode,fieldStr,{...opt,enabled:false}),0);
 write(3,3,'write',2,200);
 const nutritionLife={...DEFAULT_TURMITE_LIFE,enabled:true,metabolism:0,
  pigmentFood:0,chemicalFood:0,breeding:'off',lifespan:1000};
 const original=[{...ant,alive:true,age:4,energy:100}];
 const moved=[{...original[0],x:3,y:2}];
 const nutrientResult=stepTurmiteLife(original,moved,new Uint8Array(49),
  undefined,undefined,7,7,false,nutritionLife,
  {...INITIAL_SETTINGS.turmiteEvolution,enabled:true},11,
  opt,fieldCode,fieldStr);
 assert.equal(nutrientResult.agents[0].energy,Math.min(255,100+Math.floor(200*24/255)));
 assert.equal(nutrientResult.agents[0].age,5);
 write(3,3,'write',-3,255);
 const hazard=stepTurmiteLife(original,moved,new Uint8Array(49),
  undefined,undefined,7,7,false,nutritionLife,
  {...INITIAL_SETTINGS.turmiteEvolution,enabled:true},11,
  opt,fieldCode,fieldStr);
 assert.equal(hazard.agents[0].energy,80,
  'Real hostile DNA saps exactly 20 physical energy units');
 const dead=stepTurmiteLife([{...original[0],energy:11}],moved,
  new Uint8Array(49),undefined,undefined,7,7,false,
  {...nutritionLife,metabolism:0},{...INITIAL_SETTINGS.turmiteEvolution,enabled:true},
  11,opt,fieldCode,fieldStr);
 assert.equal(dead.agents[0].alive,false,'Hostile habitat causes genuine death');
 assert.equal(dead.agents[0].energy,0);
 write(3,3,'write',2,255);
 const nurseryParent=[{...ant,x:3,y:3,heading:0,alive:true,age:5,energy:200},
  {x:1,y:1,heading:2,alive:false,age:2,energy:0}];
 const nurseryMoved=nurseryParent.map(a=>({...a}));
 const fertile={...nutritionLife,breeding:'bud',birthEnergy:100,birthCost:40};
 const nurseryResult=stepTurmiteLife(nurseryParent,nurseryMoved,
  new Uint8Array(49),undefined,undefined,7,7,false,fertile,
  {...INITIAL_SETTINGS.turmiteEvolution,enabled:true},11,
  opt,fieldCode,fieldStr);
 assert.deepEqual([nurseryResult.agents[1].x,nurseryResult.agents[1].y],
  [4,3],'True birth goes to an actual adjacent old DNA-matched nursery');
 const traditional=stepTurmiteLife(nurseryParent,nurseryMoved,
  new Uint8Array(49),undefined,undefined,7,7,false,fertile,
  {...INITIAL_SETTINGS.turmiteEvolution,enabled:true},11,
  {...opt,enabled:false},fieldCode,fieldStr);
 assert.deepEqual([traditional.agents[1].x,traditional.agents[1].y],[3,2],
  'T13 bypass reproduces exact old T9 birthing');
 // Strict old-field direction effect: an ant with a real eastward DNA
 // hotspot changes its physical movement, while an OFF ant does not.
 const physicalAnt=[{x:3,y:3,heading:0,genome:{...ant.genome}}];
 const evo={...INITIAL_SETTINGS.turmiteEvolution,enabled:true};
 const run=(cells,ants,n,niche,dnaCode,dnaStrength,life=INITIAL_SETTINGS.turmiteLife,
  dna=INITIAL_SETTINGS.turmiteDnaFossils)=>stepTurmites(cells,7,7,true,
  'SSSS',ants,n,DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,
  INITIAL_SETTINGS.turmitePheromoneRules,undefined,
  INITIAL_SETTINGS.turmiteDuet,undefined,INITIAL_SETTINGS.turmiteRhythm,
  life,evo,873,INITIAL_SETTINGS.turmiteGeneSpill,dna,
  dnaCode,dnaStrength,niche);
 const off=run(new Uint8Array(49),physicalAnt,1,{...opt,enabled:false},
  fieldCode,fieldStr);
 const on=run(new Uint8Array(49),physicalAnt,1,opt,fieldCode,fieldStr);
 assert.deepEqual([off.agents[0].x,off.agents[0].y],[3,2]);
 assert.deepEqual([on.agents[0].x,on.agents[0].y],[4,3],
  'T13 truly redirects ant movement in the CA universe');
 assert.notDeepEqual(on.agents,off.agents);
 const oldCfg={...INITIAL_SETTINGS,engine:'turmites',cellCount:40,
  turmiteCount:4,turmiteSteps:4,seed:873,turmiteFormation:'stack',
  turmiteRule:'RSLURSLU',
  turmiteEvolution:evo,turmiteNiches:opt,
  turmiteLife:{...fertile,founders:2,initialEnergy:170,metabolism:2},
  turmiteDnaFossils:{...INITIAL_SETTINGS.turmiteDnaFossils,
   enabled:true,deposit:180,decay:1,spread:4,uptake:100},
  turmiteGeneSpill:{...INITIAL_SETTINGS.turmiteGeneSpill,enabled:true},
  turmiteRhythm:{...INITIAL_SETTINGS.turmiteRhythm,enabled:true},
  turmitePheromoneRules:{...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true}
 };
 let world=createWorld(oldCfg);
 for(let i=0;i<12;i++)world=stepWorld(world,oldCfg);
 assert(world.turmiteDnaStrength.some(x=>x>0));
 const snap=snapshotWorld(world);
 let reloaded=restoreWorldSnapshot(snap,oldCfg);
 for(let i=0;i<40;i++){
  world=stepWorld(world,oldCfg);reloaded=stepWorld(reloaded,oldCfg);
  assert.deepEqual(world.cells,reloaded.cells);
  assert.deepEqual(world.turmiteAgents,reloaded.turmiteAgents);
  assert.deepEqual(world.turmiteDnaCode,reloaded.turmiteDnaCode);
  assert.deepEqual(world.turmiteDnaStrength,reloaded.turmiteDnaStrength);
  assert.deepEqual(world.turmitePheromones,reloaded.turmitePheromones);
 }
 const cursor=createCaptureCursor(world,oldCfg,12,12);
 const nextWorld=stepWorld(world,oldCfg);
 assert.equal(cursor.advance().changed,true);
 assert.deepEqual(cursor.current.turmiteAgents,nextWorld.turmiteAgents);
 assert.deepEqual(cursor.current.turmiteDnaCode,nextWorld.turmiteDnaCode);
 // Even with a preexisting DNA field in a restored legacy world, T13 OFF
 // MUST match the baseline regardless of all 3 ecological control values.
 const legacy={...oldCfg,turmiteNiches:{...opt,enabled:false}};
 const baseline=stepWorld(world,legacy);
 const bypass={...oldCfg,turmiteNiches:{...opt,enabled:false,
  steering:0,nutrient:0,hazard:0,nursery:false}};
 assert.deepEqual(stepWorld(world,bypass).turmiteAgents,baseline.turmiteAgents);
 assert.deepEqual(stepWorld(world,bypass).cells,baseline.cells);
 let checks=0;
 for(const policy of ['kin','novelty','avoid-foreign'])
 for(const threshold of [1,100,220])
 for(const nursery of [false,true])
 for(const steps of [1,2,4,8]){
  const testNiche={...opt,policy,threshold,nursery,steering:8};
  const poolCode=new Uint8Array(49),poolStrength=new Uint8Array(49);
  poolCode[3*7+3]=encodeDnaFragment('write',2);poolStrength[3*7+3]=250;
  poolCode[3*7+4]=encodeDnaFragment('write',-2);poolStrength[3*7+4]=240;
  const source=new Uint8Array(49).fill(1);
  const ants=[
   {x:3,y:3,heading:0,alive:true,age:2,energy:180,genome:{...ant.genome}},
   {x:3,y:3,heading:1,alive:true,age:2,energy:180,
    genome:{turn:0,write:-2,metabolism:0,forage:0}},
   {x:3,y:4,heading:2,alive:false,age:0,energy:0}
  ];
  const activeLife={...fertile,birthEnergy:100,metabolism:2};
  const dna={...INITIAL_SETTINGS.turmiteDnaFossils,
   enabled:true,deposit:210,uptake:100,spread:4};
  const batch=run(source,ants,steps,testNiche,poolCode,poolStrength,
   activeLife,dna);
  let single={cells:source,agents:ants,dnaCode:poolCode,dnaStrength:poolStrength};
  for(let k=0;k<steps;k++)
   single=run(single.cells,single.agents,1,testNiche,
    single.dnaCode,single.dnaStrength,activeLife,dna);
  assert.deepEqual(batch.agents,single.agents);
  assert.deepEqual(batch.cells,single.cells);
  assert.deepEqual(batch.dnaCode,single.dnaCode);
  assert.deepEqual(batch.dnaStrength,single.dnaStrength);
  checks++;
 }
 console.log('PASS T13: '+checks+' exact batched/serial genetic niches, colony births and DNA worlds');
 console.log('PASS T13: real spatial kin/foreign steering, nutrient and lethal habitat fitness, nursery birth choice');
 console.log('PASS T13: 40-generation saved genetics/chemistry/DNA replay, recorder parity and unchanged bypass physics');
}finally{
 await Promise.all(files.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
