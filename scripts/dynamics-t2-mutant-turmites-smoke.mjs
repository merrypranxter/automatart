import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/spins-turmites.ts','scripts/.t2-core.mjs'],
 ['src/engine/sim.ts','scripts/.t2-sim.mjs'],
 ['src/engine/types.ts','scripts/.t2-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t2-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.t2-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t2-mutation.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {seedTurmites,stepTurmites,turmiteTurnAt,validTurmiteDynamics,
  DEFAULT_TURMITE_DYNAMICS}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {INITIAL_SETTINGS}=await load(2);
 const {snapshotWorld,restoreWorldSnapshot}=await load(3);
 const {createCaptureCursor}=await load(4);
 const {requiresWorldRestart}=await load(5);
 const base={...INITIAL_SETTINGS,engine:'turmites',lattice:'square',
  aspect:'square',cellCount:48,wrap:true,density:0,seed:61309,
  turmiteRule:'RSLU',turmiteSteps:1,turmiteCount:4};
 // Same physical pigment, four distinct species turn commands.
 const mixed={speciesCount:4,speciesStride:1,speciesMirror:false,headingShear:0,contact:'shared'};
 assert(validTurmiteDynamics(mixed));
 assert.deepEqual([0,1,2,3].map(species=>turmiteTurnAt('RSLU',0,0,species,mixed)),
  ['R','S','L','U']);
 // Species handedness changes actual rotation after the lookup.
 assert.equal(turmiteTurnAt('RSLU',0,0,2,{...mixed,speciesMirror:true}),'L');
 assert.equal(turmiteTurnAt('RSLU',0,0,3,{...mixed,speciesMirror:true}),'U');
 const handed={...mixed,speciesCount:2,speciesMirror:true};
 assert.equal(turmiteTurnAt('RL',0,0,1,handed),'R',
  'Odd species reads L and physically mirrors it into an R turn');
 // Same species, same paint: heading changes the TRUE command index.
 const sheared={...mixed,speciesCount:1,headingShear:1};
 assert.deepEqual([0,1,2,3].map(heading=>turmiteTurnAt('RSLU',0,heading,0,sheared)),
  ['R','S','L','U']);
 const sameSite=[{x:3,y:3,heading:0},{x:3,y:3,heading:1}];
 const shared=stepTurmites(new Uint8Array(49),7,7,true,'SS',sameSite,1,{
  ...mixed,speciesCount:1});
 const repel=stepTurmites(new Uint8Array(49),7,7,true,'SS',sameSite,1,{
  ...mixed,speciesCount:1,contact:'repel'});
 assert.deepEqual(shared.agents,[{x:3,y:2,heading:0},{x:4,y:3,heading:1}]);
 assert.deepEqual(repel.agents,[{x:3,y:4,heading:2},{x:2,y:3,heading:3}],
  'A real same-cell encounter reverses both incoming headings before DNA lookup');
 assert.equal(shared.cells[3*7+3],0);
 assert.deepEqual(repel.cells,shared.cells,
  'Encounter changes movement, NOT sequential shared pigment increment laws');
 const separate=stepTurmites(new Uint8Array(49),7,7,true,'SS',
  [{x:3,y:3,heading:0},{x:5,y:3,heading:1}],1,{...mixed,contact:'repel'});
 assert.deepEqual(separate.agents,[{x:3,y:2,heading:0},{x:6,y:3,heading:1}],
  'Repel never fires for different sites');
 const ring=seedTurmites(48,48,8,61309);
 assert.deepEqual(seedTurmites(48,48,8,61309,'orbit'),ring,
  'All old default agent placements remain byte-compatible');
 const pile=seedTurmites(48,48,8,61309,'stack');
 assert(pile.every(a=>a.x===24&&a.y===24));
 assert.deepEqual(pile.map(a=>a.heading),[0,1,2,3,0,1,2,3]);
 const cross=seedTurmites(48,48,8,61309,'cross');
 assert.equal(new Set(cross.map(a=>a.x+':'+a.y)).size,8);
 assert(cross.every(a=>Math.abs(a.x-24)+Math.abs(a.y-24)<=2));
 assert.throws(()=>seedTurmites(24,24,4,42,'invalid'),/Invalid/);
 for(const bad of [
  {...mixed,speciesCount:0},{...mixed,speciesCount:5},
  {...mixed,headingShear:2.2},{...mixed,speciesStride:-1},
  {...mixed,speciesMirror:1},{...mixed,contact:'forbidden'}
 ])assert(!validTurmiteDynamics(bad));
 assert.throws(()=>turmiteTurnAt('RL',0,0,2,handed),/Invalid T2/);
 const original=[{x:5,y:5,heading:0},{x:5,y:5,heading:1}];
 const allStates=new Uint8Array(24*24);
 for(let i=0;i<allStates.length;i++)allStates[i]=(17*i+4)%24;
 const actualSettings=[
  DEFAULT_TURMITE_DYNAMICS,
  {...mixed,speciesCount:4},
  {...mixed,speciesCount:4,speciesMirror:true,headingShear:2},
  {...mixed,speciesCount:2,speciesStride:3,headingShear:1,contact:'repel'},
  {...mixed,speciesCount:1,contact:'repel',headingShear:3}
 ];
 let exact=0;
 for(const rule of ['RL','RS','RSLU','RSLU'.repeat(6)])
 for(const wrap of [false,true])
 for(const count of [1,4,12])
 for(const placement of ['orbit','stack','cross'])
 for(const dynamics of actualSettings)
 for(const steps of [1,4,8]){
  const agents=seedTurmites(24,24,count,125,placement);
  const source=allStates.map(v=>v%rule.length);
  const accelerated=stepTurmites(source,24,24,wrap,rule,agents,steps,dynamics);
  let individual={cells:source,agents};
  for(let n=0;n<steps;n++)
   individual=stepTurmites(individual.cells,24,24,wrap,rule,individual.agents,1,dynamics);
  assert.deepEqual(accelerated.cells,individual.cells);
  assert.deepEqual(accelerated.agents,individual.agents);
  assert.deepEqual(source,allStates.map(v=>v%rule.length),'Source pigment never mutates');
  exact++;
 }
 const mutantSettings={...base,turmiteRule:'RSLU'.repeat(6),turmiteSteps:8,
  turmiteCount:8,turmiteSpeciesCount:4,turmiteSpeciesStride:3,
  turmiteSpeciesMirror:true,turmiteHeadingShear:2,turmiteContact:'repel',
  turmiteFormation:'stack'};
 let world=createWorld(mutantSettings);
 assert(world.turmiteAgents.every(a=>a.x===24&&a.y===24));
 const sourceAgent=world.turmiteAgents.map(a=>({...a}));
 const dynamics={speciesCount:4,speciesStride:3,speciesMirror:true,
  headingShear:2,contact:'repel'};
 const manual=stepTurmites(world.cells,world.width,world.height,true,
  mutantSettings.turmiteRule,sourceAgent,8,dynamics);
 let stepped=stepWorld(world,mutantSettings);
 assert.deepEqual(stepped.cells,manual.cells);
 assert.deepEqual(stepped.turmiteAgents,manual.agents);
 assert.equal(stepped.generation,1);
 const packed=snapshotWorld(stepped);
 let loaded=restoreWorldSnapshot(packed,mutantSettings);
 assert.deepEqual(loaded.turmiteAgents,stepped.turmiteAgents);
 for(let i=0;i<25;i++){
  stepped=stepWorld(stepped,mutantSettings);
  loaded=stepWorld(loaded,mutantSettings);
  assert.deepEqual(loaded.cells,stepped.cells);
  assert.deepEqual(loaded.turmiteAgents,stepped.turmiteAgents);
 }
 const recorded=createCaptureCursor(stepped,mutantSettings,20,20);
 const recordedOrigin=recorded.current.turmiteAgents.map(a=>({...a}));
 const anticipated=stepWorld(stepped,mutantSettings);
 recorded.advance();
 assert.deepEqual(recorded.current.turmiteAgents,anticipated.turmiteAgents);
 assert.deepEqual(recorded.current.cells,anticipated.cells);
 assert.deepEqual(stepped.turmiteAgents,recordedOrigin,
  'Capturing a mutant ant frame cannot change source headings');
 const liveKeys=['turmiteSpeciesCount','turmiteSpeciesStride','turmiteSpeciesMirror',
  'turmiteHeadingShear','turmiteContact','turmiteSteps'];
 for(const key of liveKeys)assert(!requiresWorldRestart(mutantSettings,{
  ...mutantSettings,[key]:INITIAL_SETTINGS[key]}),
  'A live "+key+" edit must not erase the current artwork');
 assert(requiresWorldRestart(mutantSettings,{...mutantSettings,turmiteFormation:'cross'}));
 assert(requiresWorldRestart(mutantSettings,{...mutantSettings,turmiteRule:'RL'}));
 // Recipe schema intentionally unchanged: species derives from agent INDEX.
 assert(packed.turmiteAgents.every(agent=>Object.keys(agent).sort().join(',')==='heading,x,y'));
 const old={...INITIAL_SETTINGS,engine:'turmites',turmiteRule:'RL',
  turmiteCount:1,turmiteSteps:1};
 const legacyPacked=snapshotWorld(createWorld(old));
 const legacyWithDefaults={...INITIAL_SETTINGS,...old};
 const legacyRestored=restoreWorldSnapshot(legacyPacked,legacyWithDefaults);
 assert.deepEqual(stepWorld(legacyRestored,legacyWithDefaults).cells,
  stepWorld(createWorld(old),legacyWithDefaults).cells);
 console.log('PASS T2: '+exact+' completely independent individual-vs-microstep multi-species transition comparisons');
 console.log('PASS T2: real four-heading index algebra, species chirality, co-location repulsion, stable placements');
 console.log('PASS T2: full-world seeded mutant collision replay, GIF cursor, live editing and unmodified legacy save schema');
}finally{
 await Promise.all(files.map(([,filename])=>unlink(resolve(filename)).catch(()=>{})));
}
