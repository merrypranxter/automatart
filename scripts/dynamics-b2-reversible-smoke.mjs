import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/margolus-rules.ts','scripts/.b2-rules.mjs'],
 ['src/engine/sim.ts','scripts/.b2-sim.mjs'],
 ['src/engine/types.ts','scripts/.b2-types.mjs'],
 ['src/engine/topology.ts','scripts/.b2-topology.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b2-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.b2-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.b2-mutation.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,platform:'node',format:'esm',target:'node22'})));
 const get=async index=>import(pathToFileURL(resolve(jobs[index][1])).href);
 const {MARGOLUS_RULES,marginalTable,applyMargolusMap,validMargolusEpochs,
  activeMargolusRule,recordMargolusEpoch,lastEpochFor}=await get(0);
 const {createWorld,stepWorld,rewindWorld}=await get(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await get(2);
 const {rotateBlocks}=await get(3);
 const {snapshotWorld,restoreWorldSnapshot}=await get(4);
 const {cloneWorld,createCaptureCursor}=await get(5);
 const {mutateAutomatart,requiresWorldRestart}=await get(6);
 assert.equal(MARGOLUS_RULES.length,10,'Ten genuinely different bijective laws');
 assert.equal(new Set(MARGOLUS_RULES.map(x=>x.id)).size,10);
 const patterns=new Set();
 for(const rule of MARGOLUS_RULES){
  const f=marginalTable(rule.id),b=marginalTable(rule.id,true);
  assert.equal(new Set(f).size,16,'Every 2x2 binary block maps to a unique configuration');
  patterns.add([...f].join(','));
  for(let mask=0;mask<16;mask++){
   assert.equal(b[f[mask]],mask,'All sixteen states have a true local inverse');
   const ones=m=>m.toString(2).replaceAll('0','').length;
   assert.equal(ones(mask),ones(f[mask]),'Every rule conserves true occupied cell count');
  }
 }
 assert.equal(patterns.size,MARGOLUS_RULES.length,'Every offered rule is a distinct permutation');

 const base={...INITIAL_SETTINGS,engine:'margolus',lattice:'square',wrap:true,
  cellCount:32,aspect:'portrait',seed:82641,density:.36,
  margolusMode:'single',margolusRuleA:'cw',margolusRuleB:'ccw',margolusPeriod:4};
 for(const rule of MARGOLUS_RULES)for(const aspect of ['square','portrait','landscape']){
  const s={...base,margolusRuleA:rule.id,aspect};
  let a=createWorld(s),b=createWorld(s);
  const original=a.cells.slice(),initial=a.cells.reduce((acc,x)=>acc+x,0);
  for(let i=0;i<80;i++){
   a=stepWorld(a,s);b=stepWorld(b,s);
   assert.deepEqual(a.cells,b.cells,'Seeded originals must replay identically');
   assert.equal(a.cells.reduce((acc,x)=>acc+x,0),initial,'Occupancy conserved every forward step');
  }
  for(let i=0;i<80;i++)a=rewindWorld(a,s);
  assert.equal(a.generation,0);
  assert.deepEqual(a.cells,original,'80 steps of exact reversing on '+aspect+'/'+rule.id);
  assert.deepEqual(a.margolusEpochs,[],'Rewinding to zero removes all future rule epochs');
 }
 const s={...base};
 let legacy=createWorld(s);
 const legacyPattern=legacy.cells.slice();
 for(let i=0;i<15;i++){
  const expected=rotateBlocks(legacy.cells,legacy.width,legacy.height,(i%2),false);
  legacy=stepWorld(legacy,s);
  assert.deepEqual(legacy.cells,expected,'Classic CW must retain exact legacy state evolution');
 }
 for(let i=0;i<15;i++)legacy=rewindWorld(legacy,s);
 assert.deepEqual(legacy.cells,legacyPattern);

 // Deliberate user edits of live rules at random generations, including alternate schedules.
 const switches=[
  {at:0,a:'mirrorH',b:'vortex',mode:'alternate',period:1},
  {at:6,a:'collision',b:'opposite',mode:'alternate',period:3},
  {at:19,a:'diagonal',b:'mirrorV',mode:'alternate',period:8},
  {at:39,a:'braid',b:'ccw',mode:'single',period:11},
  {at:53,a:'half',b:'vortex',mode:'alternate',period:1},
  {at:72,a:'cw',b:'mirrorV',mode:'alternate',period:7}
 ];
 let current={...s},world=createWorld(current);
 const states=[world.cells.slice()];
 for(let i=0;i<105;i++){
  const edit=switches.find(v=>v.at===i);
  if(edit){
   current={...current,margolusRuleA:edit.a,margolusRuleB:edit.b,
    margolusMode:edit.mode,margolusPeriod:edit.period};
  }
  assert(!requiresWorldRestart(s,current),'All rule/schedule changes remain LIVE');
  world=stepWorld(world,current);
  states.push(world.cells.slice());
  const hist=world.margolusEpochs;
  assert(hist&&hist.length>0);
  const last=lastEpochFor(hist,i);
  assert(MARGOLUS_RULES.some(x=>x.id===activeMargolusRule(last,i)));
 }
 assert.equal(world.margolusEpochs.length,switches.length,
  'Live rule switches make compact schedule epochs, not huge copied frames');
 const saved=snapshotWorld(world),restored=restoreWorldSnapshot(saved,current);
 assert.deepEqual(restored.margolusEpochs,world.margolusEpochs);
 assert.deepEqual(stepWorld(restored,current).cells,stepWorld(world,current).cells);
 const captured=cloneWorld(world);
 assert.notEqual(captured.margolusEpochs,world.margolusEpochs,
  'Capture clone owns a separate history, preserving the source of truth');
 for(let t=105;t>0;t--){
  world=rewindWorld(world,current);
  assert.deepEqual(world.cells,states[t-1],
   'Every inverse across live rule changes reconstructs exact historic cell grid at tick '+(t-1));
 }
 assert.equal(world.generation,0);
 assert.deepEqual(world.margolusEpochs,[]);

 // Reverse, change branch of history, move forward, reverse anew.
 current={...s,margolusRuleA:'collision'};
 for(let i=0;i<7;i++)world=stepWorld(world,current);
 for(let i=0;i<3;i++)world=rewindWorld(world,current);
 const changedBranch=world.cells.slice();
 current={...s,margolusMode:'alternate',margolusRuleA:'braid',margolusRuleB:'mirrorH',margolusPeriod:2};
 for(let i=0;i<11;i++)world=stepWorld(world,current);
 for(let i=0;i<11;i++)world=rewindWorld(world,current);
 assert.deepEqual(world.cells,changedBranch,
   'Branch after rewind makes a new exact history with no ghost epochs');

 const oldSnapshot=snapshotWorld(stepWorld(createWorld(base),base));
 delete oldSnapshot.margolusEpochs;
 const migrated=restoreWorldSnapshot(oldSnapshot,{...base,margolusRuleA:'vortex'});
 assert.equal(migrated.margolusEpochs[0].a,'cw','Old recipe history stays CW, not current new rule');
 const originalOld=migrated.cells.slice();
 assert.deepEqual(stepWorld(rewindWorld(migrated,base),base).cells,originalOld);
 for(const bad of [
  [{start:0,mode:'alternate',a:'cw',b:'ccw',period:0}],
  [{start:0,mode:'single',a:'invalid',b:'ccw',period:5}],
  [{start:1,mode:'single',a:'cw',b:'ccw',period:5}],
  [{start:0,mode:'single',a:'cw',b:'ccw',period:5},{start:0,mode:'alternate',a:'cw',b:'ccw',period:5}]
 ])assert.throws(()=>validMargolusEpochs(bad,9),'Reject tampered or non-causal history');
 const record=createCaptureCursor(createWorld(current),current,10,10);
 for(let i=0;i<5;i++)record.advance();
 assert.equal(record.current.margolusEpochs.length,1,'Recorder evolves true reversible rule epochs');
 const locked=mutateAutomatart(current,INITIAL_APPEARANCE,{strength:'wtf',
  locks:{palette:true,rule:true,engine:true,seed:true},allowRestart:false},2345);
 assert.equal(locked.settings.margolusRuleA,current.margolusRuleA);
 assert.equal(locked.settings.margolusMode,current.margolusMode);
 console.log('PASS B2: ten distinct 16-state bijections; EXACT inverse, occupancy conservation and full legacy rotation parity');
 console.log('PASS B2: 80-step reversals across shapes, 105-step mixed-rule epoch history, save/reload and post-rewind fork');
 console.log('PASS B2: old recipes correctly restore original CW history, tampering rejected, capture/mutation isolated');
}finally{
 await Promise.all(jobs.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
