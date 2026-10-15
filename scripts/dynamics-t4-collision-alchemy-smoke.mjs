import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const paths=[
 ['src/engine/spins-turmites.ts','scripts/.t4-core.mjs'],
 ['src/engine/sim.ts','scripts/.t4-sim.mjs'],
 ['src/engine/types.ts','scripts/.t4-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t4-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t4-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t4-mutation.mjs']
];
try{
 await Promise.all(paths.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async n=>import(pathToFileURL(resolve(paths[n][1])).href);
 const {stepTurmites,seedTurmites,turmiteWriteAt,turmiteAlchemyWriteAt,
  validTurmiteAlchemy,DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_WRITE_PROGRAM}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {snapshotWorld,restoreWorldSnapshot}=await load(3);
 const {createCaptureCursor}=await load(4);
 const {requiresWorldRestart}=await load(5);
 const copy=()=>structuredClone(DEFAULT_TURMITE_ALCHEMY);
 const a=copy();assert(validTurmiteAlchemy(a));assert.equal(a.enabled,false);
 assert.deepEqual(a.species.map(p=>p.mode),['next','stride','erase','table']);
 const alternate={...a,enabled:true};
 const global={...DEFAULT_TURMITE_WRITE_PROGRAM,mode:'stride',stride:5};
 for(const length of [2,3,4,7,12,24])for(let state=0;state<length;state++){
  for(let species=0;species<4;species++){
   const before=turmiteWriteAt(state,length,global);
   assert.equal(turmiteAlchemyWriteAt(state,length,species,1,global,a),before,
    'T4 disabled reproduces original T3 for every species');
   const expected=turmiteWriteAt(state,length,a.species[species]);
   assert.equal(turmiteAlchemyWriteAt(state,length,species,1,global,alternate),expected,
    'Each species has its own actual finite-state writing program');
   for(const occupants of [2,3,4,12]){
    assert.equal(turmiteAlchemyWriteAt(state,length,species,occupants,global,
     {...alternate,collision:'erase'}),0);
    assert.equal(turmiteAlchemyWriteAt(state,length,species,occupants,global,
     {...alternate,collision:'invert'}),length-1-expected);
    assert.equal(turmiteAlchemyWriteAt(state,length,species,occupants,global,
     {...alternate,collision:'fuse'}),(expected+occupants+species+1)%length);
    assert.equal(turmiteAlchemyWriteAt(state,length,species,occupants,global,
     {...alternate,collision:'none'}),expected);
   }
   assert.equal(turmiteAlchemyWriteAt(state,length,species,1,global,
    {...alternate,collision:'fuse'}),expected,
    'A single ant does not magically experience a collision');
  }
 }
 for(const invalid of [
  {...alternate,species:alternate.species.slice(0,3)},
  {...alternate,enabled:1},{...alternate,collision:'teleport'},
  {...alternate,species:alternate.species.map((v,i)=>i===2?{...v,stride:99}:v)}
 ])assert(!validTurmiteAlchemy(invalid),'Invalid alchemy rejected');
 assert.throws(()=>turmiteAlchemyWriteAt(0,4,4,2,global,alternate),/Invalid T4/);
 assert.throws(()=>turmiteAlchemyWriteAt(0,4,2,0,global,alternate),/Invalid T4/);
 // Collision is based on real SAME-CELL occupancy at the START of each
 // agent round; overlapping paint TRAILS or nearby cells don't count.
 const shared=[{x:3,y:3,heading:0},{x:3,y:3,heading:1},
  {x:3,y:3,heading:2},{x:3,y:3,heading:3}];
 const four={...alternate,collision:'fuse'};
 const before=new Uint8Array(49);
 const result=stepTurmites(before,7,7,true,'SSSS',shared,1,undefined,global,four);
 let trueColor=0;
 for(let species=0;species<4;species++)
  trueColor=turmiteAlchemyWriteAt(trueColor,4,species,4,global,four);
 assert.equal(result.cells[3*7+3],trueColor,'Co-located species sequentially react with the real freshly changed pigment');
 assert.equal(before[3*7+3],0,'No source mutation');
 assert.deepEqual(result.agents,shared.map(v=>({...v,x:v.x+(v.heading===1?1:v.heading===3?-1:0),
  y:v.y+(v.heading===2?1:v.heading===0?-1:0)})),
  'Writing independently cannot change how original S-turn ants physically move');
 const apart=[{x:3,y:3,heading:0},{x:5,y:3,heading:1}];
 const noEncounter=stepTurmites(before,7,7,true,'SSSS',apart,1,undefined,global,four);
 const eachSeparate=stepTurmites(before,7,7,true,'SSSS',apart,1,undefined,global,
  {...four,collision:'none'});
 assert.deepEqual(noEncounter,eachSeparate,'Different cells must never cause chemical reaction');
 const withErase=stepTurmites(before,7,7,true,'SSSS',shared,1,undefined,global,
  {...four,collision:'erase'});
 assert.equal(withErase.cells[3*7+3],0,'Dissolving an actual same-cell contact writes real state zero');
 // All multi-round, multi-species, multi-pigment cases must match exactly
 // the same number of actual one-step subrounds on original production math.
 const programs=[
  {enabled:false,collision:'none',species:a.species},
  {enabled:true,collision:'none',species:a.species},
  {enabled:true,collision:'fuse',species:a.species},
  {enabled:true,collision:'erase',species:a.species},
  {enabled:true,collision:'invert',species:a.species}
 ];
 const dynamicsList=[
  {speciesCount:1,speciesStride:0,speciesMirror:false,headingShear:0,contact:'shared'},
  {speciesCount:4,speciesStride:2,speciesMirror:true,headingShear:1,contact:'shared'},
  {speciesCount:4,speciesStride:1,speciesMirror:true,headingShear:3,contact:'repel'}
 ];
 let cases=0,reacted=0;
 for(const rule of ['RL','RSLU','RSLU'.repeat(6)])
 for(const agentsCount of [1,4,8])
 for(const formation of ['orbit','stack','cross'])
 for(const steps of [1,3,8])
 for(const dynamics of dynamicsList)
 for(const alchemy of programs){
  const agents=seedTurmites(22,22,agentsCount,2006,formation);
  const pigment=new Uint8Array(22*22);
  for(let i=0;i<pigment.length;i++)pigment[i]=(i*7+11)%rule.length;
  const original=pigment.slice();
  const accelerated=stepTurmites(pigment,22,22,true,rule,agents,steps,dynamics,global,alchemy);
  let repeat={cells:pigment,agents};
  for(let i=0;i<steps;i++)repeat=stepTurmites(repeat.cells,22,22,true,rule,
   repeat.agents,1,dynamics,global,alchemy);
  assert.deepEqual(accelerated.cells,repeat.cells);
  assert.deepEqual(accelerated.agents,repeat.agents);
  assert.deepEqual(pigment,original,'Original canvas remains unchanged');
  if(alchemy.enabled&&alchemy.collision!=='none'&&formation==='stack'&&agentsCount>1)reacted++;
  cases++;
 }
 assert(reacted>0);
 // Distinguish T2 encounter heading-reversal from completely independent
 // T4 chemical reactions. Shared T2 can still have active T4 chemistry.
 const turnShared={speciesCount:4,speciesStride:0,speciesMirror:false,headingShear:0,contact:'shared'};
 const turnRepel={...turnShared,contact:'repel'};
 const e1=stepTurmites(before,7,7,true,'SSSS',shared,1,turnShared,global,four);
 const e2=stepTurmites(before,7,7,true,'SSSS',shared,1,turnRepel,global,four);
 assert.deepEqual(e1.cells,e2.cells,'T4 chemistry is independent of whether T2 ants repel');
 assert.notDeepEqual(e1.agents,e2.agents,'Only T2 repel changes heading');
 // Full actual world uses the same identical production stepper, and the
 // serialized per-species settings survive save/import/replay & capture.
 const settings={...INITIAL_SETTINGS,engine:'turmites',lattice:'square',wrap:true,
  cellCount:48,seed:7821,turmiteRule:'RSLU'.repeat(6),turmiteCount:8,
  turmiteFormation:'stack',turmiteSteps:8,turmiteSpeciesCount:4,
  turmiteSpeciesStride:2,turmiteHeadingShear:1,turmiteContact:'repel',
  turmiteSpeciesMirror:true,turmiteAlchemy:four};
 let world=createWorld(settings);
 const current={speciesCount:4,speciesStride:2,speciesMirror:true,headingShear:1,contact:'repel'};
 const expected=stepTurmites(world.cells,world.width,world.height,settings.wrap,
  settings.turmiteRule,world.turmiteAgents,8,current,
  {mode:settings.turmiteWriteMode,stride:settings.turmiteWriteStride,table:settings.turmiteWriteTable},four);
 let actual=stepWorld(world,settings);
 assert.deepEqual(actual.cells,expected.cells);assert.deepEqual(actual.turmiteAgents,expected.agents);
 const snapshot=snapshotWorld(actual);
 let clone=restoreWorldSnapshot(snapshot,settings);
 for(let i=0;i<28;i++){
  actual=stepWorld(actual,settings);clone=stepWorld(clone,settings);
  assert.deepEqual(clone.cells,actual.cells);assert.deepEqual(clone.turmiteAgents,actual.turmiteAgents);
 }
 const cursor=createCaptureCursor(actual,settings,20,20);
 const anticipated=stepWorld(actual,settings);
 cursor.advance();
 assert.deepEqual(cursor.current.cells,anticipated.cells);
 assert.deepEqual(cursor.current.turmiteAgents,anticipated.turmiteAgents);
 for(const program of programs){
  assert(!requiresWorldRestart(settings,{...settings,turmiteAlchemy:program}),
   'Changing species chemistry and collision reactions is LIVE and must preserve art');
 }
 const old={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,
  turmiteRule:'RL',turmiteCount:1,turmiteSteps:1};
 const oldWorld=createWorld(old);
 const oldSettings={...old};delete oldSettings.turmiteAlchemy;
 assert.deepEqual(stepWorld(oldWorld,oldSettings).cells,stepWorld(oldWorld,old).cells);
 assert.deepEqual(stepWorld(oldWorld,oldSettings).turmiteAgents,stepWorld(oldWorld,old).turmiteAgents);
 console.log('PASS T4: '+cases+' independent whole-cell repeated-round alchemy comparisons; '+reacted+' true multi-body cases');
 console.log('PASS T4: 4 distinct real writers, chemical fusion/inversion/dissolving, original T3 bypass and no false proximity collisions');
 console.log('PASS T4: full-world 28-gen replay, immutable recorder frames, edit-live species profiles and unchanged old RL saves');
}finally{
 await Promise.all(paths.map(([,filename])=>unlink(resolve(filename)).catch(()=>{})));
}
