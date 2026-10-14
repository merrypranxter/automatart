import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/cyclic-dynamics.ts','scripts/.dynamics-cyclic.mjs'],
 ['src/engine/sim.ts','scripts/.dynamics-sim.mjs'],
 ['src/engine/types.ts','scripts/.dynamics-types.mjs'],
 ['src/engine/capture.ts','scripts/.dynamics-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.dynamics-mutate.mjs'],
 ['src/engine/alien-paint.ts','scripts/.dynamics-paint.mjs']
];
try{
 await Promise.all(modules.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(modules[i][1])).href);
 const {chaseNeighbor,cyclicAdvance,estimateInitialChase}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(2);
 const {createCaptureCursor}=await load(3);
 const {mutateAutomatart,requiresWorldRestart}=await load(4);
 const {applyAlienStamp,INITIAL_ALIEN_BRUSH}=await load(5);
 assert.equal(INITIAL_SETTINGS.cyclicThreshold,1,'Default threshold is inside an active range');
 assert(INITIAL_SETTINGS.cyclicStates<=8,'Default state count leaves reachable chase matches');
 assert.equal(INITIAL_SETTINGS.cyclicDrive,0,'Pure classic CA remains the startup default');
 assert.equal(chaseNeighbor(1,0,12,1),true);
 assert.equal(chaseNeighbor(2,0,12,1),false);
 assert.equal(chaseNeighbor(2,0,12,2),true);
 assert.equal(chaseNeighbor(0,11,12,1),true,'Forward phase wraps 11->0');
 assert.equal(chaseNeighbor(11,0,12,2),false,'Backward phase cannot masquerade as forward chase');
 assert.equal(cyclicAdvance(11,1,1,0,7,0,0,12),0);
 assert.equal(cyclicAdvance(4,0,1,0,7,0,0,12),4);
 assert.equal(cyclicAdvance(4,0,1,1,7,0,0,12),5,'Spontaneous drive is real state advancement');
 const base={...INITIAL_SETTINGS,engine:'cyclic',cellCount:32,seed:4712,
  density:.36,pattern:'noise',cyclicStates:12,cyclicThreshold:2,cyclicReach:1,
  cyclicDrive:0,neighborShape:'moore',lattice:'square'};
 const initial=createWorld(base);
 const classic=stepWorld(initial,base);
 const w=initial.width,h=initial.height;
 // Exact pre-P1 rule as a standalone reference, checked across the ENTIRE grid.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,old=initial.cells[p],next=(old+1)%base.cyclicStates;
  let matches=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(dx===0&&dy===0)continue;
   if(initial.cells[((y+dy+h)%h)*w+(x+dx+w)%w]===next)matches++;
  }
  assert.equal(classic.cells[p],matches>=base.cyclicThreshold?next:old,
   'Original classic next-state CCA reproduced bit-exactly at reach=1,drive=0');
 }
 const ones=stepWorld(initial,{...base,cyclicThreshold:1});
 const wide=stepWorld(initial,{...base,cyclicReach:4});
 const kick=stepWorld(initial,{...base,cyclicDrive:.01});
 const count=(w)=>w.events.reduce((n,v)=>n+(v===3?1:0),0);
 assert.equal(ones.stepChanged,count(ones),'True last-step changes match source engine');
 assert(count(ones)>=count(classic),
  'Lower chase threshold cannot reduce the number of cell transitions');
 assert(count(wide)>=count(classic),
  'Wider genuine chase field increases or preserves transitions');
 assert(count(kick)>=count(classic),
  'Seeded independent excitation adds to, never blocks, classical transitions');
 assert(count(wide)>count(classic),'Chase field substantially wakes up a stalled default');
 const countBeforePaint=ones.stepChanged;
 applyAlienStamp(ones,{...base,cyclicThreshold:1},[7,7],
  {...INITIAL_ALIEN_BRUSH,stamp:'brush',size:0,mode:'invert'},331);
 assert.equal(ones.stepChanged,countBeforePaint,
  'Finger painting cannot be counted as a change in the last simulation step');
 const seedWorld={...base,cyclicReach:3,cyclicDrive:.004};
 let a=createWorld(seedWorld),b=createWorld(seedWorld),changed=0;
 for(let n=0;n<50;n++){
  a=stepWorld(a,seedWorld);b=stepWorld(b,seedWorld);
  assert.deepEqual(a.cells,b.cells,'Entire stochastic cellular evolution replays from seed');
  changed+=count(a);
 }
 assert(changed>100,'Driven mode is actually making many physical state transitions');
 const finite={...base,wrap:false,cyclicStates:5,cyclicReach:2,cyclicThreshold:1};
 const edgeWorld=createWorld(finite);edgeWorld.cells.fill(1);
 edgeWorld.cells[0]=3; // targets 4 and 0, but absent cells aren't real zero-state neighbors
 assert.equal(stepWorld(edgeWorld,finite).cells[0],3,
  'Finite corners never chase nonexistent zero-valued neighbors');
 const allStill=createWorld(base);allStill.cells.fill(0);
 const quietRule={...base,cyclicThreshold:8,cyclicReach:1,cyclicDrive:0};
 const staticCursor=createCaptureCursor(allStill,quietRule,10,10);
 for(let i=0;i<2;i++)assert.equal(staticCursor.advance().settled,false);
 assert.equal(staticCursor.advance().settled,true,'Pure stagnant CCA can settle');
 const drivenCursor=createCaptureCursor(allStill,{...quietRule,cyclicDrive:.0001},10,10);
 for(let i=0;i<5;i++)assert.equal(drivenCursor.advance().settled,false,
  'Seeded-drive CCA must not falsely settle even during a quiet interval');
 const pSlow=estimateInitialChase(12,1,2,8,.36,0);
 const pFast=estimateInitialChase(12,3,2,8,.36,0);
 const pEasy=estimateInitialChase(12,1,1,8,.36,0);
 assert(pEasy>pSlow*2,'Initial activation estimate detects narrow effective threshold');
 assert(pFast>pSlow,'Wider chase field yields a higher initial activation estimate');
 for(const p of [pSlow,pFast,pEasy]){
  assert(p>=0&&p<=1);
 }
 assert(!requiresWorldRestart(base,{...base,cyclicReach:3,cyclicDrive:.001}),
  'Live chase and excitation controls never discard the running world');
 assert(requiresWorldRestart(base,{...base,cyclicStates:6}),
  'Number of phases changes the seeding universe, so it restarts');
 const locked=mutateAutomatart(base,INITIAL_APPEARANCE,{
  strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},allowRestart:false
 },411);
 assert.equal(locked.settings.cyclicReach,1);
 assert.equal(locked.settings.cyclicDrive,0);
 const phaseShrink={...base,cyclicReach:6,cyclicStates:10};
 for(let i=1;i<=30;i++){
  const next=mutateAutomatart(phaseShrink,INITIAL_APPEARANCE,{
   strength:'wtf',locks:{palette:true,rule:false,engine:true,seed:true},allowRestart:true
  },i);
  assert(next.settings.cyclicReach>=1);
  assert(next.settings.cyclicReach<=Math.min(6,next.settings.cyclicStates-1),
   'Multi-action mutation cannot hide an invalid chase-window rule');
 }
 console.log('PASS: default moves, classic CCA bit-exact compatibility, wrap, chase field and true seeded impulses');
 console.log('PASS: 50-generation seeded stochastic replay, actual growth in transitions, non-settled recorder');
 console.log('PASS: live controls do not restart, legacy mathematical rule and rule locks retained');
 console.log('AUDIT: baseline 12-phase threshold2 initial activation '+(100*pSlow).toFixed(2)+'%');
 console.log('AUDIT: threshold1 initial activation '+(100*pEasy).toFixed(2)+'%');
 console.log('AUDIT: threshold2 reach3 initial activation '+(100*pFast).toFixed(2)+'%');
}finally{
 await Promise.all(modules.map(([,f])=>unlink(resolve(f)).catch(()=>{})));
}
