import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mods=[
 ['src/engine/sim.ts','scripts/.b1-brain-sim.mjs'],
 ['src/engine/types.ts','scripts/.b1-brain-types.mjs'],
 ['src/engine/brain-dynamics.ts','scripts/.b1-brain-params.mjs'],
 ['src/engine/capture.ts','scripts/.b1-brain-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.b1-brain-mutation.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b1-brain-snapshot.mjs'],
 ['src/engine/neighborhood.ts','scripts/.b1-brain-neighbors.mjs']
];
try{
 await Promise.all(mods.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,platform:'node',format:'esm',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(mods[i][1])).href);
 const {createWorld,stepWorld}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {brainStimulusAt,brainElectrodeBlock,brainNaturalBirth,brainBirthForecast,validBrainParams}=await load(2);
 const {createCaptureCursor}=await load(3);
 const {mutateAutomatart,requiresWorldRestart}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {normalizeActiveVotes,maxNeighborCount}=await load(6);
 const pure={...INITIAL_SETTINGS,engine:'brians',cellCount:32,aspect:'square',lattice:'square',
   neighborShape:'moore',wrap:true,pattern:'noise',density:.36};
 assert.equal(pure.brainBirthCount,2);
 assert.equal(pure.brainBirthMatch,'exact');
 assert.equal(pure.brainStimulus,'off');
 assert(!brainNaturalBirth(1,pure)&&brainNaturalBirth(2,pure)&&!brainNaturalBirth(3,pure));
 assert(brainNaturalBirth(3,{...pure,brainBirthMatch:'atLeast'}));
 assert(!validBrainParams({mode:'sparks',source:'center',rate:2,period:8,seed:1,generation:0}));
 assert(validBrainParams({mode:'sparks',source:'center',rate:.001,period:8,seed:1,generation:0}));
 const parameters={mode:'clock',source:'center',rate:0,period:5,seed:232,generation:4};
 const w=32,h=32;
 assert(brainElectrodeBlock(8,8,w,h,'center'));
 let n=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)
  if(brainStimulusAt(0,x,y,w,h,parameters))n++;
 assert.equal(n,4,'Single electrode ignites exactly four 2x2 canonical cells');
 assert(!brainStimulusAt(1,16,16,w,h,parameters)&&!brainStimulusAt(2,16,16,w,h,parameters),
  'Never overwrite live or refractory cells');
 assert(!brainStimulusAt(0,16,16,w,h,{...parameters,generation:2}));
 for(const [source,expected] of [['quad',16],['ring',48]]){
  n=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)
   if(brainStimulusAt(0,x,y,w,h,{...parameters,source}))n++;
  assert.equal(n,expected,source+' fires 2x2 real-cell electrode clusters');
 }
 const dead=createWorld({...pure,density:0});dead.cells.fill(0);
 const quiet=stepWorld(dead,pure);
 assert(quiet.cells.every(v=>v===0)&&quiet.waveStimulusCount===0);
 const clock={...pure,brainStimulus:'clock',brainClockPeriod:5};
 let fire=createWorld(clock);fire.cells.fill(0);
 for(let j=0;j<4;j++){
  fire=stepWorld(fire,clock);
  assert.equal(fire.waveStimulusCount,0,'Clock is not continuous cosmetic motion');
 }
 fire=stepWorld(fire,clock);
 assert.equal(fire.waveStimulusCount,4);
 for(const p of [16+16*w,17+16*w,16+17*w,17+17*w])assert.equal(fire.cells[p],1);
 fire=stepWorld(fire,clock);
 for(const p of [16+16*w,17+16*w,16+17*w,17+17*w])assert.equal(fire.cells[p],2,
  'All injected cells obey exactly one refractory step after firing');
 assert.equal(fire.waveStimulusCount,0);
 fire=stepWorld(fire,clock);
 for(const p of [16+16*w,17+16*w,16+17*w,17+17*w])assert.equal(fire.cells[p],0,
  'All injected cells return to rest; the pulse cannot override refractory physics');
 assert(!requiresWorldRestart(pure,{...pure,brainBirthCount:1,brainBirthMatch:'atLeast',
   brainStimulus:'sparks',brainSparkRate:.005,brainClockPeriod:7,brainClockSource:'quad'}));
 const adjusted=normalizeActiveVotes({...pure,neighborShape:'vonNeumann',brainBirthCount:20});
 assert.equal(maxNeighborCount(adjusted),4);
 assert.equal(adjusted.brainBirthCount,4);

 let scenarios=0;
 for(const lattice of ['square','hex','triangle','rhombille']){
  const shapes=lattice==='square'?['moore','vonNeumann','diamond2','square2','custom']:['moore'];
  for(const shape of shapes)for(const wrap of [true,false])
   for(const [match,threshold] of [['exact',2],['exact',1],['atLeast',2]]){
    const s={...pure,lattice,neighborShape:shape,wrap,
      brainBirthCount:threshold,brainBirthMatch:match};
    let world=createWorld(s);
    for(let k=0;k<12;k++){
     const forecast=brainBirthForecast(world,s);
     assert.equal(forecast.examined,world.cells.length);
     const next=stepWorld(world,s);
     // Compute the canonical Brain rule independently: no forcing.
     let expected=0;
     for(let p=0;p<world.cells.length;p++){
      const old=world.cells[p],near=next.neighbors[p];
      const birth=match==='exact'?near===threshold:near>=threshold;
      const state=old===1?2:old===2?0:birth?1:0;
      assert.equal(next.cells[p],state,
       'Pure Brain must preserve exact synchronous three-state transitions on all graph geometries');
      if(old===0&&birth)expected++;
     }
     assert.equal(forecast.naturalBirths,expected,
       'Forecast only counts genuinely eligible resting sites');
     assert.equal(next.waveStimulusCount,0);
     world=next;
    }
    scenarios++;
   }
 }
 const stronger={...pure,brainStimulus:'sparks',brainSparkRate:.01,seed:234567};
 let a=createWorld(stronger),b=createWorld(stronger),stimulated=0;
 for(let i=0;i<80;i++){
  a=stepWorld(a,stronger);b=stepWorld(b,stronger);
  assert.deepEqual(a.cells,b.cells,'Every fired cell repeats exactly from seed/tick/tile');
  stimulated+=a.waveStimulusCount;
 }
 assert(stimulated>0,'Seeded group impulses genuinely fired resting cells');
 const restored=restoreWorldSnapshot(snapshotWorld(a),stronger);
 assert.deepEqual(stepWorld(restored,stronger).cells,stepWorld(a,stronger).cells,
  'Recorded recipe snapshot resumes exactly without hidden RNG state');
 const stale=createWorld({...pure,density:0});stale.cells.fill(0);
 const cursor=createCaptureCursor(stale,{...pure,brainStimulus:'clock',brainClockPeriod:120},10,10);
 for(let i=0;i<8;i++)assert.equal(cursor.advance().settled,false,
   'Capture must not falsely stop during real clocked lull');
 const sparky=createCaptureCursor(stale,{...stronger,brainStimulus:'sparks'},10,10);
 for(let i=0;i<5;i++)assert.equal(sparky.advance().settled,false,
   'Seeded future ignition keeps recorder awake');
 const trulyPure=createCaptureCursor(stale,pure,10,10);
 for(let i=0;i<2;i++)assert.equal(trulyPure.advance().settled,false);
 assert.equal(trulyPure.advance().settled,true,
   'Autonomous Brain is still allowed to become genuinely stationary');
 const mutated=mutateAutomatart({...pure,brainStimulus:'clock'},
  INITIAL_APPEARANCE,{strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},
   allowRestart:false},987);
 assert.equal(mutated.settings.brainStimulus,'clock','Rule lock freezes Brain experiment settings');
 assert.equal(mutated.settings.brainBirthCount,2);
 const capped=brainBirthForecast(createWorld({...pure,cellCount:192}),pure,100);
 assert(capped.examined<=100&&capped.examined>0,'Inspector samples, never blocks huge phone world');
 console.log('PASS B1: pure-original Brain exactly preserved across '+scenarios+' cases, exotic lattices, borders and firing-rule variants');
 console.log('PASS B1: physical 2x2 electrodes, single/four/ring timing, refractory immunity and deterministic seeded group bursts');
 console.log('PASS B1: real next-step birth forecast, recipe replay, mutation locks, live controls and honest GIF settling');
}finally{
 await Promise.all(mods.map(([,f])=>unlink(resolve(f)).catch(()=>{})));
}
