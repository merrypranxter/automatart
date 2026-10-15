import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const paths=[
 ['src/engine/turmite-pheromones.ts','scripts/.t6-chemical.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t6-ant.mjs'],
 ['src/engine/sim.ts','scripts/.t6-sim.mjs'],
 ['src/engine/types.ts','scripts/.t6-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t6-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t6-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t6-mutation.mjs']
];
try{
 await Promise.all(paths.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(paths[i][1])).href);
 const {validTurmitePheromones,DEFAULT_TURMITE_PHEROMONES,
  pheromoneSteerHeading,stepTurmitePheromones,pheromoneStats}=await load(0);
 const {stepTurmites,seedTurmites,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_MEMORY}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {createCaptureCursor}=await load(5);
 const {requiresWorldRestart}=await load(6);
 const on={...DEFAULT_TURMITE_PHEROMONES,enabled:true};
 assert(validTurmitePheromones(on));
 for(const invalid of [
  {...on,enabled:1},{...on,deposit:33},{...on,diffusion:9},
  {...on,evaporation:-1},{...on,threshold:0},{...on,strength:3},
  {...on,steering:'pretend'}
 ])assert(!validTurmitePheromones(invalid),'Bad T6 control rejected');
 const zeros=new Uint8Array(49);
 const chem={...on,deposit:32,diffusion:0,evaporation:0,steering:'attract',strength:2,threshold:1};
 const single=[{x:3,y:3,heading:0}];
 const first=stepTurmites(zeros,7,7,true,'SS',single,1,undefined,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_MEMORY,chem);
 assert.equal(first.pheromones[3*7+3],32,'Real ant origin receives physical chemical');
 assert.equal(first.pheromones[2*7+3],0,'The future destination does not get a phantom deposit');
 assert.deepEqual(first.agents,[{x:3,y:2,heading:0}]);
 const second=stepTurmites(first.cells,7,7,true,'SS',first.agents,1,
  undefined,DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_MEMORY,chem,first.pheromones);
 assert.deepEqual(second.agents,[{x:3,y:3,heading:2}],
  'Ant must physically turn backward toward the REAL deposited chemical gradient');
 assert.equal(second.pheromones[3*7+3],32);
 assert.equal(second.pheromones[2*7+3],32);
 assert.equal(first.pheromones[2*7+3],0,'Chemical steps must never mutate source field');
 assert.equal(zeros[3*7+3],0,'Chemical simulation never mutates original pigment');
 const repel={...chem,steering:'repel'};
 const concentration=new Uint8Array(49);
 concentration[3*7+3]=30;concentration[2*7+3]=50;
 concentration[3*7+4]=0; // east: target for repulsion
 const attracted=pheromoneSteerHeading(concentration,7,7,true,3,3,0,0,chem);
 const repelled=pheromoneSteerHeading(concentration,7,7,true,3,3,0,1,repel);
 assert.equal(attracted,0,'Attractor follows stronger north site');
 assert.equal(repelled,1,'Repulsor flees the same high concentration to east');
 const alternating={...chem,steering:'alternating'};
 assert.equal(pheromoneSteerHeading(concentration,7,7,true,3,3,2,0,alternating),0);
 assert.equal(pheromoneSteerHeading(concentration,7,7,true,3,3,2,1,alternating),1);
 assert.equal(pheromoneSteerHeading(new Uint8Array(49),7,7,true,3,3,2,0,chem),2,
  'Zero chemical gradients MUST NOT rotate ants');
 assert.equal(pheromoneSteerHeading(concentration,7,7,true,3,3,2,0,
  {...chem,strength:1}),1,'Quarter-turn steering must respect maximum 90 degrees');
 assert.equal(pheromoneSteerHeading(concentration,7,7,true,3,3,2,0,
  {...chem,threshold:32}),2,'Sub-threshold gradients must not influence heading');
 const diffuse={...chem,diffusion:8,deposit:8};
 const spread=stepTurmitePheromones(zeros,7,7,true,single,diffuse);
 assert.equal(spread[3*7+3],4);
 for(const p of [2*7+3,4*7+3,3*7+2,3*7+4])assert.equal(spread[p],1);
 assert.equal(pheromoneStats(spread).total,8,'An isolated impulse conserves exactly for this stencil');
 const dissipated=stepTurmitePheromones(zeros,7,7,true,single,
  {...chem,deposit:12,diffusion:0,evaporation:5});
 assert.equal(dissipated[3*7+3],7);
 assert.equal(pheromoneStats(dissipated).occupied,1);
 const saturated=stepTurmitePheromones(Uint8Array.from({length:49},()=>250),
  7,7,true,Array.from({length:12},()=>single[0]),{...chem,deposit:32});
 assert.equal(saturated[3*7+3],255,'Two+ body pileups must saturate, not overflow Uint8');
 const border=stepTurmitePheromones(zeros,7,7,false,[{x:0,y:0}],
  {...diffuse,deposit:16});
 assert.equal(border[0],10,'Finite edges mirror missing neighbors, not teleport chemicals');
 const torus=stepTurmitePheromones(zeros,7,7,true,[{x:0,y:0}],
  {...diffuse,deposit:16});
 assert.equal(torus[0],8,'Periodic torus uses true wrapped physical neighbors');
 assert(torus[6]>0&&torus[6*7]>0,'Wrap causes real cross-edge chemical diffusion');
 assert.throws(()=>stepTurmitePheromones(new Uint8Array(48),7,7,true,single,chem),/Invalid T6/);
 assert.throws(()=>pheromoneSteerHeading(zeros,7,7,true,7,3,0,0,chem),/Invalid T6/);
 const off={...chem,enabled:false};
 const old=stepTurmites(zeros,7,7,true,'RL',single);
 const bypass=stepTurmites(zeros,7,7,true,'RL',single,1,undefined,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
  DEFAULT_TURMITE_MEMORY,off,concentration);
 assert.deepEqual(bypass.cells,old.cells);
 assert.deepEqual(bypass.agents,old.agents);
 assert.deepEqual(bypass.pheromones,concentration,
  'Disabling T6 must freeze real history without modifying it');
 assert(!('pheromones' in old),'Legacy Turmite return type must remain identical');

 let cases=0;
 const dynamics=[
  {speciesCount:1,speciesStride:0,speciesMirror:false,headingShear:0,contact:'shared'},
  {speciesCount:4,speciesStride:2,speciesMirror:true,headingShear:3,contact:'repel'}
 ];
 const alchemy=[
  DEFAULT_TURMITE_ALCHEMY,
  {...DEFAULT_TURMITE_ALCHEMY,enabled:true,collision:'fuse'}
 ];
 const memories=[DEFAULT_TURMITE_MEMORY,{...DEFAULT_TURMITE_MEMORY,enabled:true,mode:'read',writeBias:1}];
 const modes=['attract','repel','alternating','off'];
 for(const d of dynamics)for(const a of alchemy)
 for(const m of memories)for(const steering of modes)
 for(const steps of [1,2,4,8])for(const formation of ['stack','orbit']){
  const w=14,h=14,rule='RSLU'.repeat(3),cells=new Uint8Array(w*h);
  for(let i=0;i<cells.length;i++)cells[i]=(i*5+Math.floor(i/w))%rule.length;
  const source=cells.slice(),agents=seedTurmites(w,h,8,23412,formation);
  const starting=new Uint8Array(w*h);
  for(let i=0;i<starting.length;i++)starting[i]=(i*11)%75;
  const existing=starting.slice();
  const cfg={...chem,steering,deposit:steps*3,diffusion:steps,evaporation:steps%3,
   strength:2,threshold:1};
  const batch=stepTurmites(cells,w,h,true,rule,agents,steps,d,
   DEFAULT_TURMITE_WRITE_PROGRAM,a,m,cfg,starting);
  let reference={cells,agents,pheromones:starting};
  for(let s=0;s<steps;s++)
   reference=stepTurmites(reference.cells,w,h,true,rule,reference.agents,1,d,
    DEFAULT_TURMITE_WRITE_PROGRAM,a,m,cfg,reference.pheromones);
  assert.deepEqual(batch.cells,reference.cells,'T6 batched = repeated true pigment writes');
  assert.deepEqual(batch.agents,reference.agents,'T6 batched = repeated true ant paths and T5 registers');
  assert.deepEqual(batch.pheromones,reference.pheromones,'T6 batched = repeated full chemical fields');
  assert.deepEqual(cells,source,'Never mutate original art');
  assert.deepEqual(starting,existing,'Never mutate original chemical history');
  cases++;
 }
 const settings={...INITIAL_SETTINGS,engine:'turmites',cellCount:40,
  turmiteRule:'RSLU'.repeat(3),turmiteCount:8,turmiteFormation:'stack',turmiteSteps:6,
  turmiteSpeciesCount:4,turmiteHeadingShear:1,turmiteContact:'repel',
  turmiteAlchemy:{...DEFAULT_TURMITE_ALCHEMY,enabled:true,collision:'fuse'},
  turmiteMemory:{...DEFAULT_TURMITE_MEMORY,enabled:true,writeBias:1},
  turmitePheromoneRules:{...chem,diffusion:4,evaporation:1,steering:'alternating'}};
 let world=createWorld(settings);
 assert.equal(world.turmitePheromones.length,world.width*world.height);
 for(let i=0;i<15;i++)world=stepWorld(world,settings);
 assert(pheromoneStats(world.turmitePheromones).occupied>0);
 const saved=snapshotWorld(world);
 assert.equal(typeof saved.arrays.turmitePheromones,'string');
 let restored=restoreWorldSnapshot(saved,settings);
 assert.deepEqual(restored.turmitePheromones,world.turmitePheromones);
 for(let i=0;i<30;i++){
  world=stepWorld(world,settings);restored=stepWorld(restored,settings);
  assert.deepEqual(world.cells,restored.cells);
  assert.deepEqual(world.turmiteAgents,restored.turmiteAgents);
  assert.deepEqual(world.turmitePheromones,restored.turmitePheromones);
 }
 const cursor=createCaptureCursor(world,settings,20,20);
 const cursorNext=stepWorld(world,settings);
 cursor.advance();
 assert.deepEqual(cursor.current.cells,cursorNext.cells);
 assert.deepEqual(cursor.current.turmiteAgents,cursorNext.turmiteAgents);
 assert.deepEqual(cursor.current.turmitePheromones,cursorNext.turmitePheromones,
  'Recorder advances the exact same physical chemical lattice');
 assert.deepEqual(world.turmitePheromones,restored.turmitePheromones,
  'Read-only recorder does not touch source chemical history');
 const corrupted=structuredClone(saved);corrupted.arrays.turmitePheromones='AA==';
 assert.throws(()=>restoreWorldSnapshot(corrupted,settings),/wrong length/);
 const legacy={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,turmiteRule:'RL'};
 delete legacy.turmitePheromoneRules;
 const classic={...legacy,turmitePheromoneRules:{...DEFAULT_TURMITE_PHEROMONES}};
 let l=createWorld(classic),r=createWorld(classic);
 for(let i=0;i<25;i++){
  l=stepWorld(l,legacy);r=stepWorld(r,classic);
  assert.deepEqual(l.cells,r.cells);
  assert.deepEqual(l.turmiteAgents,r.turmiteAgents);
  assert.equal(l.turmitePheromones,undefined);
 }
 const legacySnap=snapshotWorld(l);
 assert(!Object.hasOwn(legacySnap.arrays,'turmitePheromones'));
 assert.equal(restoreWorldSnapshot(legacySnap,classic).turmitePheromones,undefined);
 assert.deepEqual(restoreWorldSnapshot(legacySnap,{...classic,
  turmitePheromoneRules:{...chem}}).turmitePheromones,new Uint8Array(l.width*l.height),
  'Old-world snapshot can safely opt into true T6 with zeroed field');
 for(const variation of [off,{...chem,deposit:0},{...chem,steering:'repel'},
  {...chem,diffusion:8},{...chem,threshold:16}]){
  assert(!requiresWorldRestart(settings,{...settings,turmitePheromoneRules:variation}),
   'Every T6 chemical control must be LIVE and never erase the current world');
 }
 console.log('PASS T6: '+cases+' exact true multistep chemotaxis, T5 memory, T4 collision and full field combinations');
 console.log('PASS T6: synchronous deposits, saturating pileups, torus/reflecting edges, signed gradients, no false motion');
 console.log('PASS T6: 30-generation replay, saved 8-bit second lattice, recorder parity, legacy T1–T5 and live controls');
}finally{
 await Promise.all(paths.map(([,filename])=>unlink(resolve(filename)).catch(()=>{})));
}
