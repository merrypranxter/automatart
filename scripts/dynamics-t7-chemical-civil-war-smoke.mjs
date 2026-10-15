import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const files=[
 ['src/engine/turmite-duet.ts','scripts/.t7-duet.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t7-ants.mjs'],
 ['src/engine/sim.ts','scripts/.t7-sim.mjs'],
 ['src/engine/types.ts','scripts/.t7-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t7-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t7-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t7-mutation.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async index=>import(pathToFileURL(resolve(files[index][1])).href);
 const {DEFAULT_TURMITE_DUET,validTurmiteDuet,duetHeading,stepTurmiteDuet}=await load(0);
 const {stepTurmites,seedTurmites,DEFAULT_TURMITE_DYNAMICS,
   DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY}=await load(1);
 const {stepWorld,createWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {createCaptureCursor}=await load(5);
 const {requiresWorldRestart}=await load(6);
 const d={...DEFAULT_TURMITE_DUET,enabled:true,deposit:20,diffusion:0,
  evaporation:0,reaction:'none',reactionRate:0,threshold:1,strength:2};
 const c={...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true,
  deposit:12,diffusion:0,evaporation:0,steering:'off',strength:0};
 assert(validTurmiteDuet(d));
 for(const bad of [{...d,enabled:'yes'},{...d,diffusion:9},{...d,deposit:-1},
  {...d,evaporation:9},{...d,reaction:'magic'},{...d,reactionRate:25},
  {...d,navigation:'reverse-time'},{...d,strength:3},{...d,threshold:0}])
  assert(!validTurmiteDuet(bad));
 const zero=new Uint8Array(49);
 const center=[{x:3,y:3}];
 const group=stepTurmiteDuet(zero,zero,7,7,true,center,center,c,d);
 assert.equal(group.a[3*7+3],12);
 assert.equal(group.b[3*7+3],20);
 assert.equal(zero[3*7+3],0,'Source chemistry arrays MUST remain untouched');
 assert.throws(()=>stepTurmiteDuet(zero,new Uint8Array(48),7,7,true,center,center,c,d),/Invalid active T7/);
 const reaction=(mode,rate)=>stepTurmiteDuet(zero,zero,7,7,true,center,center,c,
  {...d,reaction:mode,reactionRate:rate});
 const neutral=reaction('neutralize',7);
 assert.equal(neutral.a[24],5);assert.equal(neutral.b[24],13);
 const eatA=reaction('convertA',8);
 assert.equal(eatA.a[24],20);assert.equal(eatA.b[24],12);
 const eatB=reaction('convertB',8);
 assert.equal(eatB.a[24],4);assert.equal(eatB.b[24],28);
 const sit=reaction('neutralize',0);
 assert.equal(sit.a[24],12);assert.equal(sit.b[24],20);
 const overA=stepTurmiteDuet(Uint8Array.from({length:49},()=>254),
  Uint8Array.from({length:49},()=>254),7,7,true,[],[],c,
  {...d,reaction:'convertA',reactionRate:24});
 assert.equal(overA.a[24],255);assert.equal(overA.b[24],253,
  'Conversion must preserve chemical mass until the 8-bit saturation limit');
 const guideA=new Uint8Array(49),guideB=new Uint8Array(49);
 guideA[2*7+3]=80; // north A
 guideB[3*7+4]=80; // east B
 assert.equal(duetHeading(guideA,guideB,7,7,true,3,3,2,0,d),0,
  'Even species seek A gradient even when old heading faced south');
 assert.equal(duetHeading(guideA,guideB,7,7,true,3,3,2,1,d),1,
  'Odd species seek a different B gradient on the same real lattice');
 assert.equal(duetHeading(guideA,guideB,7,7,true,3,3,2,0,
  {...d,navigation:'inverted'}),1,'Species affinities invert mathematically');
 assert.equal(duetHeading(guideA,guideB,7,7,true,3,3,2,0,
  {...d,strength:1}),3,'Max quarter-turn limit on a 180-degree gradient');
 assert.equal(duetHeading(guideA,guideB,7,7,true,3,3,2,0,
  {...d,threshold:64}),0,'A strong enough gradient still steers');
 assert.equal(duetHeading(guideA,guideB,7,7,true,3,3,2,0,
  {...d,threshold:64,strength:0}),2,'Zero strength bypasses all gradients');
 assert.equal(duetHeading(zero,zero,7,7,true,3,3,2,0,d),2,'No phantom chemical direction');
 assert.throws(()=>duetHeading(guideA,new Uint8Array(48),7,7,true,3,3,2,0,d),/Invalid T7/);

 // True Turmite multi-species deposition. Even species write only A, odd B.
 const active={...d,navigation:'off',reaction:'none'};
 const spin={...DEFAULT_TURMITE_DYNAMICS,speciesCount:2};
 const agents=[{x:3,y:3,heading:0},{x:4,y:3,heading:0}];
 const physical=stepTurmites(zero,7,7,true,'SS',agents,1,spin,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,
  c,zero,active,zero);
 assert.equal(physical.pheromones[3*7+3],12);
 assert.equal(physical.rivalPheromones[3*7+4],20);
 assert.equal(physical.pheromones[3*7+4],0);
 assert.equal(physical.rivalPheromones[3*7+3],0);
 const noT7=stepTurmites(zero,7,7,true,'SS',agents,1,spin,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,
  c,zero,{...d,enabled:false});
 assert.equal(noT7.pheromones[3*7+3],12);
 assert.equal(noT7.pheromones[3*7+4],12,'T7 off restores exact all-species T6 deposition');
 assert.equal(noT7.rivalPheromones,undefined);
 const froze=stepTurmites(zero,7,7,true,'SS',agents,1,spin,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,
  {...c,enabled:false},group.a,{...d,enabled:true},group.b);
 assert.deepEqual(froze.pheromones,group.a);
 assert.deepEqual(froze.rivalPheromones,group.b,
  'Disabling T6 freezes both chemical fields without erasing real history');
 const rule='RSLU'.repeat(3),colors=new Uint8Array(16*16);
 for(let i=0;i<colors.length;i++)colors[i]=(i*3+Math.floor(i/16))%rule.length;
 const dynamical=[
  {speciesCount:2,speciesStride:0,speciesMirror:false,headingShear:0,contact:'shared'},
  {speciesCount:4,speciesStride:2,speciesMirror:true,headingShear:2,contact:'repel'}
 ];
 let cases=0;
 for(const dyn of dynamical)for(const formation of ['stack','orbit'])
 for(const steps of [1,2,4,8])
 for(const navigation of ['off','territories','inverted'])
 for(const reactionName of ['none','neutralize','convertA','convertB']){
  const seeded=seedTurmites(16,16,8,7721,formation);
  const beforeA=new Uint8Array(256),beforeB=new Uint8Array(256);
  for(let p=0;p<256;p++){beforeA[p]=(p*11)%47;beforeB[p]=(p*5)%37;}
  const m={...DEFAULT_TURMITE_MEMORY,enabled:true,mode:'read',writeBias:1};
  const duet={...d,deposit:steps*3,diffusion:steps,evaporation:steps%2,
   reaction:reactionName,reactionRate:steps*2,navigation};
  const batch=stepTurmites(colors,16,16,true,rule,seeded,steps,dyn,
   DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,m,c,beforeA,duet,beforeB);
  let replay={cells:colors,agents:seeded,pheromones:beforeA,rivalPheromones:beforeB};
  for(let i=0;i<steps;i++)
   replay=stepTurmites(replay.cells,16,16,true,rule,replay.agents,1,dyn,
    DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,m,c,
    replay.pheromones,duet,replay.rivalPheromones);
  assert.deepEqual(batch.cells,replay.cells);
  assert.deepEqual(batch.agents,replay.agents);
  assert.deepEqual(batch.pheromones,replay.pheromones);
  assert.deepEqual(batch.rivalPheromones,replay.rivalPheromones);
  assert.equal(colors[0],0);
  assert.equal(beforeA[1],11);assert.equal(beforeB[1],5);
  cases++;
 }
 const settings={...INITIAL_SETTINGS,engine:'turmites',cellCount:40,
  turmiteRule:'RSLU'.repeat(3),turmiteCount:8,turmiteSteps:6,
  turmiteFormation:'stack',turmiteSpeciesCount:4,turmiteContact:'repel',
  turmiteMemory:{...DEFAULT_TURMITE_MEMORY,enabled:true,mode:'write'},
  turmitePheromoneRules:{...c,steering:'attract',strength:2},
  turmiteDuet:{...d,enabled:true,reaction:'neutralize',reactionRate:4}};
 let world=createWorld(settings);
 assert.equal(world.turmiteRivalPheromones.length,world.width*world.height);
 for(let i=0;i<16;i++)world=stepWorld(world,settings);
 assert(world.turmiteRivalPheromones.some(v=>v>0));
 const packed=snapshotWorld(world);
 assert.equal(typeof packed.arrays.turmiteRivalPheromones,'string');
 let restored=restoreWorldSnapshot(packed,settings);
 assert.deepEqual(restored.turmiteRivalPheromones,world.turmiteRivalPheromones);
 for(let i=0;i<30;i++){
  world=stepWorld(world,settings);restored=stepWorld(restored,settings);
  assert.deepEqual(world.cells,restored.cells);
  assert.deepEqual(world.turmiteAgents,restored.turmiteAgents);
  assert.deepEqual(world.turmitePheromones,restored.turmitePheromones);
  assert.deepEqual(world.turmiteRivalPheromones,restored.turmiteRivalPheromones);
 }
 const cur=createCaptureCursor(world,settings,10,10);
 const advanced=stepWorld(world,settings);cur.advance();
 assert.deepEqual(cur.current.turmitePheromones,advanced.turmitePheromones);
 assert.deepEqual(cur.current.turmiteRivalPheromones,advanced.turmiteRivalPheromones);
 assert.deepEqual(world.turmiteRivalPheromones,restored.turmiteRivalPheromones);
 const bogus=structuredClone(packed);bogus.arrays.turmiteRivalPheromones='AA==';
 assert.throws(()=>restoreWorldSnapshot(bogus,settings),/wrong length/);
 const t6={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,
  turmitePheromoneRules:{...c}};
 const oldWorld=createWorld(t6);let old=stepWorld(oldWorld,t6);
 const migrated={...t6,turmiteDuet:{...d,enabled:true}};
 const restoredOld=restoreWorldSnapshot(snapshotWorld(old),migrated);
 assert.deepEqual(restoredOld.turmiteRivalPheromones,new Uint8Array(old.width*old.height),
  'Old T6 snapshots opt into empty B field without replacing saved A field');
 assert.deepEqual(restoredOld.turmitePheromones,old.turmitePheromones);
 const legacy={...t6};delete legacy.turmiteDuet;
 let legacyWorld=createWorld(t6),newDefault=createWorld({...t6,turmiteDuet:DEFAULT_TURMITE_DUET});
 for(let i=0;i<20;i++){
  legacyWorld=stepWorld(legacyWorld,legacy);
  newDefault=stepWorld(newDefault,{...t6,turmiteDuet:DEFAULT_TURMITE_DUET});
  assert.deepEqual(legacyWorld.cells,newDefault.cells);
  assert.deepEqual(legacyWorld.turmiteAgents,newDefault.turmiteAgents);
  assert.deepEqual(legacyWorld.turmitePheromones,newDefault.turmitePheromones);
  assert.equal(legacyWorld.turmiteRivalPheromones,undefined);
 }
 for(const patch of [{...d,enabled:false},{...d,reaction:'convertA'},
  {...d,deposit:0},{...d,diffusion:8},{...d,navigation:'inverted'}])
  assert(!requiresWorldRestart(settings,{...settings,turmiteDuet:patch}));
 // P2 regression: pigments and all agent positions/headings repeat after
 // FOUR genuine moves; only chemical history evolves. Settled export must
 // NOT stop at generation 3 or lose a later chemical-driven turn.
 const settledSettings={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,
  turmiteRule:'RR',turmiteWriteMode:'erase',turmiteCount:1,turmiteSteps:4,
  turmitePheromoneRules:{...c,deposit:2,diffusion:0,evaporation:0,
   steering:'off',strength:0},
  turmiteDuet:{...DEFAULT_TURMITE_DUET}};
 const start=createWorld(settledSettings);
 const cursor=createCaptureCursor(start,settledSettings,10,10);
 const firstCells=start.cells.slice(),firstAgents=structuredClone(start.turmiteAgents);
 for(let i=0;i<4;i++){
  const {changed,settled}=cursor.advance();
  assert.equal(changed,true,'Chemical state changes must count as physics changes');
  assert.equal(settled,false,'Do not truncate a temporarily identical visible animation');
  assert.deepEqual(cursor.current.cells,firstCells,'No ordinary pigment changed');
  assert.deepEqual(cursor.current.turmiteAgents,firstAgents,'Same visible ant arrangement');
 }
 // Make only B evolve while A and agents are static, and check both grids.
 const two={...settledSettings,turmiteCount:2,turmiteSpeciesCount:2,
  turmitePheromoneRules:{...settledSettings.turmitePheromoneRules,deposit:0},
  turmiteDuet:{...d,enabled:true,deposit:3,diffusion:0,evaporation:0,
   navigation:'off',reaction:'none',reactionRate:0}};
 const twin=createWorld(two);
 const other=createCaptureCursor(twin,two,10,10);
 for(let i=0;i<4;i++){
  const {changed,settled}=other.advance();
  assert(changed&&!settled,'B-only evolving chemistry must prevent premature settled cut');
  assert.deepEqual(other.current.cells,twin.cells);
  assert.deepEqual(other.current.turmiteAgents,twin.turmiteAgents);
  assert.deepEqual(other.current.turmitePheromones,twin.turmitePheromones);
  assert(other.current.turmiteRivalPheromones.some(v=>v>0));
 }
 console.log('PASS T7: '+cases+' genuine dual chemistry serial/batch scenarios, signed steering and physically local reactions');
 console.log('PASS T7: 30 generation A/B snapshots, recorder replay, legacy T6 and live controls');
 console.log('PASS T6 review fix: no premature settled GIF/video stop when invisible A or B chemistry evolves');
}finally{
 await Promise.all(files.map(([,file])=>unlink(resolve(file)).catch(()=>{})));
}
