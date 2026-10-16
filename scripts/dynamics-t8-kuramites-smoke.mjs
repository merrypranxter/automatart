import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const files=[
 ['src/engine/turmite-rhythm.ts','scripts/.t8-rhythm.mjs'],
 ['src/engine/spins-turmites.ts','scripts/.t8-turmites.mjs'],
 ['src/engine/sim.ts','scripts/.t8-sim.mjs'],
 ['src/engine/types.ts','scripts/.t8-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.t8-snap.mjs'],
 ['src/engine/capture.ts','scripts/.t8-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.t8-mutation.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {DEFAULT_TURMITE_RHYTHM,validTurmiteRhythm,phaseOf,rhythmIndex,
  initialRhythmPhase,stepRhythmPhases,rhythmOrderParameter}=await load(0);
 const {stepTurmites,seedTurmites,DEFAULT_TURMITE_DYNAMICS,
  DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY}=await load(1);
 const {stepWorld,createWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {createCaptureCursor}=await load(5);
 const {requiresWorldRestart}=await load(6);
 const on={...DEFAULT_TURMITE_RHYTHM,enabled:true};
 assert(validTurmiteRhythm(on));
 for(const bad of [{...on,frequency:33},{...on,detune:-1},{...on,coupling:-33},
  {...on,radius:0},{...on,chemistry:17},{...on,mode:'pretend'},
  {...on,turnBias:4},{...on,writeBias:-4},{...on,enabled:1}])
  assert(!validTurmiteRhythm(bad),'Invalid T8 register settings rejected');
 assert.equal(initialRhythmPhase(0),0);
 assert.equal(initialRhythmPhase(1),73);
 assert.equal(initialRhythmPhase(2),146);
 assert.equal(phaseOf({x:0,y:0},1),73);
 assert.equal(rhythmIndex(0,'phase'),0);
 assert.equal(rhythmIndex(32,'phase'),1);
 assert.equal(rhythmIndex(255,'phase'),7);
 assert.equal(rhythmIndex(255,'inverse'),1);
 assert.equal(rhythmIndex(0,'pulse'),1);
 assert.equal(rhythmIndex(64,'pulse'),0);
 assert.throws(()=>phaseOf({x:0,y:0,rhythmPhase:256},0),/Invalid T8/);
 assert.throws(()=>rhythmIndex(-1,'phase'),/Invalid T8/);
 assert(Math.abs(rhythmOrderParameter([{x:0,y:0,rhythmPhase:0},
  {x:0,y:0,rhythmPhase:128}]))<1e-12,'Antiphase oscillators cancel order');
 assert(Math.abs(rhythmOrderParameter([{x:0,y:0,rhythmPhase:7},
  {x:0,y:0,rhythmPhase:7}])-1)<1e-12,'Identical oscillators have R=1');
 const pair=[{x:3,y:3,rhythmPhase:0},{x:4,y:3,rhythmPhase:64}];
 const syn={...on,frequency:0,detune:0,coupling:32,radius:12,chemistry:0};
 assert.deepEqual(stepRhythmPhases(pair,1,8,8,true,syn),[32,32],
  'Attractive sinusoidal Kuramoto coupling synchronizes two quarter-cycle separated oscillators');
 assert.deepEqual(stepRhythmPhases(pair,1,8,8,true,{...syn,coupling:-32}),[224,96],
  'Negative coupling increases, rather than suppresses, phase separation');
 // Codex P2: JS Math.round has asymmetric negative half ties. In this real
 // sin-lookup pair, sin(30*2π/256) quantizes to 688/1024, so K=32
 // produces EXACT 21.5. Both ants must get opposite 22-tick forces.
 const tie=[{x:3,y:3,rhythmPhase:0},{x:4,y:3,rhythmPhase:30}];
 assert.deepEqual(stepRhythmPhases(tie,1,8,8,true,syn),[22,8],
  'Signed half-ticks must cancel exactly, never cause fake global oscillator drift');
 assert.deepEqual(stepRhythmPhases(tie,1,8,8,true,{...syn,coupling:-32}),[234,52],
  'Negative K half-ticks must likewise be equal-and-opposite');
 assert.deepEqual(stepRhythmPhases(pair,1,8,8,true,{...syn,radius:1}),[0,64],
  'Physical neighbor radius excludes agents at its exact boundary');
 assert.deepEqual(stepRhythmPhases(pair,1,8,8,true,{...syn,coupling:0}),[0,64],
  'Zero coupling preserves independent intrinsic frequencies');
 const wrapPair=[{x:0,y:4,rhythmPhase:0},{x:7,y:4,rhythmPhase:64}];
 assert.deepEqual(stepRhythmPhases(wrapPair,1,8,8,true,{...syn,radius:2}),[32,32]);
 assert.deepEqual(stepRhythmPhases(wrapPair,1,8,8,false,{...syn,radius:2}),[0,64],
  'Finite-edge clocks cannot hear one another through nonexistent torus connections');
 const chemicalA=new Uint8Array(64),chemicalB=new Uint8Array(64);
 chemicalA[3*8+3]=255;chemicalB[3*8+4]=255;
 assert.deepEqual(stepRhythmPhases(pair,1,8,8,true,
  {...syn,coupling:0,chemistry:16},chemicalA,chemicalB),[16,48],
  'True signed chemistry A-B changes each local oscillator frequency');
 assert.deepEqual(stepRhythmPhases(pair,2,8,8,true,
  {...syn,coupling:0,chemistry:0,detune:7}),[0,71],
  'Species identity truly detunes natural oscillator rates');
 assert.deepEqual(stepRhythmPhases(pair,2,8,8,true,
  {...syn,enabled:false},chemicalA,chemicalB),[0,64],
  'OFF freezes existing real phases');
 assert.deepEqual(pair.map(x=>x.rhythmPhase),[0,64],
  'All oscillators read previous phases simultaneously and never mutate source agents');
 assert.throws(()=>stepRhythmPhases(pair,1,8,8,true,syn,new Uint8Array(63)),/Invalid T8/);
 assert.throws(()=>stepRhythmPhases([{x:-1,y:0}],1,8,8,true,syn),/Invalid T8/);

 const cells=new Uint8Array(49),solo=[{x:3,y:3,heading:0,rhythmPhase:32}];
 const phaseMode={...on,frequency:12,detune:0,coupling:0,mode:'phase',
  turnBias:1,writeBias:1};
 const old=stepTurmites(cells,7,7,true,'RSLU',solo);
 const rotated=stepTurmites(cells,7,7,true,'RSLU',solo,1,
  DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,undefined,undefined,
  undefined,undefined,phaseMode);
 assert.deepEqual(old.agents[0],{x:4,y:3,heading:1,rhythmPhase:32});
 assert.equal(old.cells[3*7+3],1);
 assert.deepEqual(rotated.agents[0],{x:3,y:2,heading:0,rhythmPhase:44},
  'Phase sector changes actual command R into S, then advances persistent oscillator');
 assert.equal(rotated.cells[3*7+3],2,'Oscillator changes ACTUAL indexed pigment, not the palette');
 assert.equal(cells[3*7+3],0);
 const pulse=stepTurmites(cells,7,7,true,'RSLU',solo,1,
  DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,undefined,undefined,
  undefined,undefined,{...phaseMode,mode:'pulse'});
 assert.equal(pulse.cells[24],1,'Pulse gate closes outside crest sector');
 const off=stepTurmites(cells,7,7,true,'RSLU',solo,1,
  DEFAULT_TURMITE_DYNAMICS,DEFAULT_TURMITE_WRITE_PROGRAM,
  DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY,undefined,undefined,
  undefined,undefined,{...phaseMode,enabled:false});
 assert.deepEqual(off.cells,old.cells);
 assert.deepEqual(off.agents,old.agents,
  'Disabling T8 restores EXACT T1–T7 trajectories and retains frozen saved oscillator registers');

 const rule='RSLU'.repeat(3),art=new Uint8Array(16*16);
 for(let p=0;p<art.length;p++)art[p]=(p*5+Math.floor(p/16))%rule.length;
 let cases=0;
 for(const mode of ['phase','pulse','inverse'])
 for(const coupling of [-32,0,32])for(const speciesCount of [1,2,4])
 for(const formation of ['stack','orbit'])for(const steps of [1,2,4,8]){
  const agents=seedTurmites(16,16,8,7219,formation);
  const a=new Uint8Array(256),b=new Uint8Array(256);
  for(let p=0;p<256;p++){a[p]=(p*9)%61;b[p]=(p*7)%47;}
  const spin={...DEFAULT_TURMITE_DYNAMICS,speciesCount,contact:'repel',
   headingShear:2,speciesMirror:true,speciesStride:1};
  const chem={...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true,deposit:19,
   diffusion:4,evaporation:1,steering:'alternating',strength:2,threshold:1};
  const duet={...INITIAL_SETTINGS.turmiteDuet,enabled:true,reaction:'convertB',
   reactionRate:6,navigation:'territories'};
  const mem={...DEFAULT_TURMITE_MEMORY,enabled:true,mode:'write',writeBias:1};
  const oscillators={...phaseMode,mode,coupling,frequency:12,detune:5,
   chemistry:10,radius:16,turnBias:2,writeBias:-2};
  const batch=stepTurmites(art,16,16,true,rule,agents,steps,spin,
   DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,
   mem,chem,a,duet,b,oscillators);
  let split={cells:art,agents,pheromones:a,rivalPheromones:b};
  for(let step=0;step<steps;step++)
   split=stepTurmites(split.cells,16,16,true,rule,split.agents,1,spin,
    DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,mem,chem,
    split.pheromones,duet,split.rivalPheromones,oscillators);
  assert.deepEqual(batch.cells,split.cells,'T8 accelerated actual pigments equal repeated substeps');
  assert.deepEqual(batch.agents,split.agents,'T8 synchronous phases, headings and T5 memory match serial stepping');
  assert.deepEqual(batch.pheromones,split.pheromones);
  assert.deepEqual(batch.rivalPheromones,split.rivalPheromones);
  assert.equal(art[0],0);assert.equal(a[1],9);assert.equal(b[1],7);
  cases++;
 }
 const settings={...INITIAL_SETTINGS,engine:'turmites',cellCount:40,
  turmiteRule:rule,turmiteCount:8,turmiteSteps:6,turmiteFormation:'stack',
  turmiteSpeciesCount:4,turmiteContact:'repel',turmiteHeadingShear:2,
  turmiteMemory:{...DEFAULT_TURMITE_MEMORY,enabled:true,mode:'read'},
  turmitePheromoneRules:{...INITIAL_SETTINGS.turmitePheromoneRules,enabled:true},
  turmiteDuet:{...INITIAL_SETTINGS.turmiteDuet,enabled:true,reaction:'neutralize'},
  turmiteRhythm:{...phaseMode,coupling:26,detune:5,chemistry:13}};
 let world=createWorld(settings);
 assert(world.turmiteAgents.every(a=>a.rhythmPhase===undefined));
 for(let i=0;i<14;i++)world=stepWorld(world,settings);
 assert(world.turmiteAgents.every(a=>Number.isInteger(a.rhythmPhase)&&a.rhythmPhase>=0&&a.rhythmPhase<=255));
 const snap=snapshotWorld(world);
 assert(snap.turmiteAgents.every(a=>Number.isInteger(a.rhythmPhase)));
 let restored=restoreWorldSnapshot(snap,settings);
 for(let i=0;i<30;i++){
  world=stepWorld(world,settings);restored=stepWorld(restored,settings);
  assert.deepEqual(world.cells,restored.cells);
  assert.deepEqual(world.turmiteAgents,restored.turmiteAgents);
  assert.deepEqual(world.turmitePheromones,restored.turmitePheromones);
  assert.deepEqual(world.turmiteRivalPheromones,restored.turmiteRivalPheromones);
 }
 const cursor=createCaptureCursor(world,settings,10,10);
 const next=stepWorld(world,settings);
 const {changed}=cursor.advance();
 assert.deepEqual(cursor.current.turmiteAgents,next.turmiteAgents);
 assert.deepEqual(cursor.current.cells,next.cells);
 assert.deepEqual(cursor.current.turmitePheromones,next.turmitePheromones);
 assert.deepEqual(cursor.current.turmiteRivalPheromones,next.turmiteRivalPheromones);
 assert.equal(changed,true,'Genuine oscillator changes count as physical activity');
 const malformed=structuredClone(snap);malformed.turmiteAgents[0].rhythmPhase=256;
 assert.throws(()=>restoreWorldSnapshot(malformed,settings),/Invalid saved Turmite coordinate/);
 const legacy={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,turmiteRule:'RL'};
 delete legacy.turmiteRhythm;
 let oldWorld=createWorld({...legacy,turmiteRhythm:DEFAULT_TURMITE_RHYTHM});
 const baseline={...legacy,turmiteRhythm:DEFAULT_TURMITE_RHYTHM};
 for(let i=0;i<32;i++){
  oldWorld=stepWorld(oldWorld,baseline);
  assert.equal(oldWorld.turmiteAgents[0].rhythmPhase,undefined);
 }
 const oldSave=snapshotWorld(oldWorld);
 assert.equal(oldSave.turmiteAgents[0].rhythmPhase,undefined);
 const upgraded=restoreWorldSnapshot(oldSave,{...baseline,turmiteRhythm:{...phaseMode}});
 assert.equal(upgraded.turmiteAgents[0].rhythmPhase,undefined,
  'Legacy old saves may opt in, using deterministic identity phases without corrupting history');
 for(const setting of [{...phaseMode,frequency:0},{...phaseMode,mode:'inverse'},
  {...phaseMode,coupling:-20},{...phaseMode,chemistry:16},
  {...phaseMode,enabled:false}])
  assert(!requiresWorldRestart(settings,{...settings,turmiteRhythm:setting}),
   'Every T8 rhythm parameter is live and non-destructive');
 console.log('PASS T8: '+cases+' exact accelerated/serial coupled multi-agent T1–T7 combinations');
 console.log('PASS T8: true Kuramoto sync/repulsion, spatial radius, wrap, chemistry feedback and actual track transitions');
 console.log('PASS T8: deterministic 30-generation saved phases, recorder, live edits, malformed phase rejection, legacy bypass');
}finally{
 await Promise.all(files.map(([,p])=>unlink(resolve(p)).catch(()=>{})));
}
