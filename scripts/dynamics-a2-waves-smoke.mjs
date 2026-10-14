import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/wave-dynamics.ts','scripts/.a2-wave.mjs'],
 ['src/engine/sim.ts','scripts/.a2-sim.mjs'],
 ['src/engine/types.ts','scripts/.a2-types.mjs'],
 ['src/engine/capture.ts','scripts/.a2-capture.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.a2-snapshot.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.a2-mutate.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const mod=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {waveStimulusAt,waveClockSite,validWaveParameters}=await mod(0);
 const {createWorld,stepWorld}=await mod(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await mod(2);
 const {cloneWorld,createCaptureCursor}=await mod(3);
 const {snapshotWorld,restoreWorldSnapshot}=await mod(4);
 const {mutateAutomatart,requiresWorldRestart}=await mod(5);
 const classic={...INITIAL_SETTINGS,engine:'excitable',cellCount:32,
  neighborShape:'vonNeumann',lattice:'square',density:.36,
  exciteStates:8,exciteThreshold:2,seed:208};
 assert.equal(classic.waveStimulus,'off');
 assert(validWaveParameters({mode:'off',source:'center',rate:0,period:12,seed:1,generation:0}));
 assert(!validWaveParameters({mode:'sparks',source:'center',rate:2,period:12,seed:1,generation:0}));
 const w=32,h=32,cx=16,cy=16,p=cx+w*cy;
 assert(waveClockSite(cx,cy,w,h,'center'));
 assert(!waveClockSite(cx+1,cy,w,h,'center'));
 assert(waveClockSite(8,8,w,h,'quad'));
 assert(waveClockSite(24,24,w,h,'quad'));
 const ringSites=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)
  if(waveClockSite(x,y,w,h,'ring'))ringSites.push(y*w+x);
 assert.equal(ringSites.length,12,'Clock ring comprises precisely twelve physical cells');
 const params={mode:'clock',source:'center',rate:0,period:3,seed:208,generation:0};
 assert(!waveStimulusAt(0,cx,cy,w,h,params));
 assert(waveStimulusAt(0,cx,cy,w,h,{...params,generation:2}));
 assert(!waveStimulusAt(1,cx,cy,w,h,{...params,generation:2}),
   'Clock never overwrites living/excited states');
 const none=createWorld({...classic,density:0});none.cells.fill(0);
 const pure=stepWorld(none,classic);
 assert(pure.cells.every(v=>v===0)&&pure.waveStimulusCount===0,
  'Off preserves autonomous absorbing zero state');
 const forced={...classic,waveStimulus:'clock',waveClockPeriod:3,waveClockSource:'center',
  exciteThreshold:1,exciteStates:3};
 let world=createWorld(forced);world.cells.fill(0);
 for(let i=0;i<2;i++){
  world=stepWorld(world,forced);
  assert.equal(world.stepChanged,0,'No injection between clock ticks');
  assert.equal(world.waveStimulusCount,0);
 }
 world=stepWorld(world,forced);
 assert.equal(world.cells[p],1,'Third generation physically fires the center');
 assert.equal(world.waveStimulusCount,1);
 const spread=stepWorld(world,forced);
 assert.equal(spread.cells[p],2,'Pacemaker cell follows real refractory state, no overlay');
 for(const q of [p-1,p+1,p-w,p+w])
  assert.equal(spread.cells[q],1,'Stimulated heart launches a proper cardinal-neighbor wave');
 assert.equal(spread.waveStimulusCount,0);
 assert(!requiresWorldRestart(forced,{...forced,waveClockPeriod:11,waveClockSource:'ring',
  waveStimulus:'sparks'}),'Stimulus edits are live on an existing world');
 assert(requiresWorldRestart(forced,{...forced,exciteStates:7}),
  'Changing the meaning of refractory cell phases restarts the world');
 const quad={...forced,waveClockPeriod:1,waveClockSource:'quad'};
 const qWorld=createWorld(quad);qWorld.cells.fill(0);
 assert.equal(stepWorld(qWorld,quad).waveStimulusCount,4);
 const ring={...quad,waveClockSource:'ring'};
 const rWorld=createWorld(ring);rWorld.cells.fill(0);
 assert.equal(stepWorld(rWorld,ring).waveStimulusCount,12);
 // Afterlife uses its ORIGINAL B/S/C survival/refractory logic. External
 // forcing is applied only to rest sites with no naturally enabled birth.
 const after={...forced,engine:'generations',genBirth:[],genSurvive:[],genStates:4};
 let g=createWorld(after);g.cells.fill(0);
 for(let i=0;i<3;i++)g=stepWorld(g,after);
 assert.equal(g.cells[p],1);assert.equal(g.waveStimulusCount,1);
 g=stepWorld(g,after);assert.equal(g.cells[p],2,'Birth takes canonical refractory step');
 g=stepWorld(g,after);assert.equal(g.cells[p],3);
 g=stepWorld(g,after);assert.equal(g.cells[p],0,'All refractory stages respected');
 const natural={...after,genBirth:[0],genSurvive:[0],waveClockPeriod:1};
 const allBorn=createWorld(natural);allBorn.cells.fill(0);
 const born=stepWorld(allBorn,natural);
 assert(born.cells.every(v=>v===1));
 assert.equal(born.waveStimulusCount,0,
  'A naturally born cell is never incorrectly counted as an external injection');
 for(const engine of ['generations','excitable']){
  const s={...classic,engine,waveStimulus:'sparks',waveSparkRate:.003,
   waveClockPeriod:17,waveClockSource:'ring',seed:4477};
  let a=createWorld(s),b=createWorld(s),sum=0;
  for(let i=0;i<60;i++){
   a=stepWorld(a,s);b=stepWorld(b,s);
   assert.deepEqual(a.cells,b.cells,'Stochastic state evolves exactly from the original seed');
   assert.equal(a.waveStimulusCount,b.waveStimulusCount);
   sum+=a.waveStimulusCount;
  }
  assert(sum>0,'Real independent sparks ignite cells in '+engine);
  const snap=snapshotWorld(a),loaded=restoreWorldSnapshot(snap,s);
  assert.deepEqual(loaded.cells,a.cells,'Stimulation survives exact JSON world-state replay');
  assert.deepEqual(stepWorld(loaded,s).cells,stepWorld(a,s).cells,
   'Recipe replay does not require hidden state or an RNG cursor');
  const cloned=cloneWorld(a);cloned.cells[0]^=1;
  assert.notEqual(cloned.cells[0],a.cells[0],'Capture retains independent cell state');
  const quiet=createWorld(s);quiet.cells.fill(0);
  const delayed={...s,waveStimulus:'clock',waveClockPeriod:120};
  const cursor=createCaptureCursor(quiet,delayed,10,10);
  for(let i=0;i<5;i++)assert.equal(cursor.advance().settled,false,
    'A quiet interval between clocks is not a true fixed point');
  const stochasticCursor=createCaptureCursor(quiet,s,10,10);
  for(let i=0;i<5;i++)assert.equal(stochasticCursor.advance().settled,false,
    'A lull before the next seeded spark is not a true fixed point');
 }
 const disabled=createCaptureCursor(none,{...classic,waveStimulus:'off'},10,10);
 for(let i=0;i<2;i++)assert.equal(disabled.advance().settled,false);
 assert.equal(disabled.advance().settled,true,
  'Original unforced resting system can still be classified as settled');
 const mutation=mutateAutomatart(forced,INITIAL_APPEARANCE,{
  strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},allowRestart:false
 },917);
 assert.equal(mutation.settings.waveStimulus,'clock');
 assert.equal(mutation.settings.waveClockPeriod,3);
 console.log('PASS: pure autonomous rules preserved; clock center/four/ring fires real rest cells');
 console.log('PASS: stimulated excitation propagates through true edges, recovery and Afterlife B/S/C unchanged');
 console.log('PASS: deterministic sparks across 60 generations, saved-state replay, captures and locks');
 console.log('PASS: stochastic/pacemaker recorders stay awake during genuine quiet intervals');
}finally{
 await Promise.all(jobs.map(([,f])=>unlink(resolve(f)).catch(()=>{})));
}
