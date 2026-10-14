import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mods=[
 ['src/engine/cyclic-viability-presets.ts','scripts/.a1-presets.mjs'],
 ['src/engine/cyclic-dynamics.ts','scripts/.a1-math.mjs'],
 ['src/engine/sim.ts','scripts/.a1-sim.mjs'],
 ['src/engine/types.ts','scripts/.a1-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.a1-world.mjs']
];
try{
 await Promise.all(mods.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,format:'esm',platform:'node',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(mods[i][1])).href);
 const {CYCLIC_STARTER_PRESETS:profiles}=await load(0);
 const {cyclicStructuralChange}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {INITIAL_SETTINGS}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 assert.equal(INITIAL_SETTINGS.cyclicStates,16);
 assert.equal(INITIAL_SETTINGS.cyclicThreshold,2);
 assert.equal(INITIAL_SETTINGS.cyclicReach,1);
 assert.equal(INITIAL_SETTINGS.cyclicDrive,0);
 assert(profiles.length>=4);
 assert.equal(new Set(profiles.map(p=>p.id)).size,profiles.length);
 assert(profiles.filter(p=>p.drive===0).length>=3,
  'Three mathematically pure profiles available without forced excitation');
 const old=new Uint8Array([0,1,2,3,4,5,6,7,8]);
 const globalCycle=old.map(v=>(v+1)%9);
 assert(old.every((v,i)=>globalCycle[i]!==v),
  'Every cell really changes state in a global phase cycle');
 assert.equal(cyclicStructuralChange(old,globalCycle,3,3,9,true),0,
  'Uniform whole-universe phase advance must score ZERO spatial reorganization');
 const localChange=globalCycle.slice();localChange[4]=(localChange[4]+1)%9;
 assert(cyclicStructuralChange(old,localChange,3,3,9,true)>0,
  'Local phase changes register as real evolving neighbor relationships');
 assert.equal(cyclicStructuralChange(old,globalCycle,3,3,9,false),0);
 for(const p of profiles){
  assert(p.states>=3&&p.states<=24);
  assert(p.threshold>=1&&p.threshold<=8);
  assert(p.reach>=1&&p.reach<=Math.min(6,p.states-1));
  assert(p.drive>=0&&p.drive<=.01);
  assert(p.density>0&&p.density<1);
  assert(p.measuredEdgeChange>.003);
  const s={...INITIAL_SETTINGS,engine:'cyclic',pattern:'noise',lattice:'square',
   neighborShape:'moore',cellCount:32,aspect:'square',wrap:true,seed:82641,
   density:p.density,cyclicStates:p.states,cyclicThreshold:p.threshold,
   cyclicReach:p.reach,cyclicDrive:p.drive};
  let one=createWorld(s),two=createWorld(s);
  assert.deepEqual(one.cells,two.cells,'Same preset and seed create exactly the same world');
  let sawStructure=false;
  for(let i=0;i<35;i++){
   const previous=one;
   one=stepWorld(one,s);two=stepWorld(two,s);
   assert.deepEqual(one.cells,two.cells,'All stochastic/pure profiles replay exactly by generation');
   assert.equal(one.stepStructural,cyclicStructuralChange(previous.cells,one.cells,
    one.width,one.height,p.states,true),
    'Real-time activity meter matches the physical phase-difference graph');
   if(one.stepStructural>0)sawStructure=true;
  }
  const saved=snapshotWorld(one);
  const restored=restoreWorldSnapshot(saved,s);
  assert.deepEqual(restored.cells,one.cells);
  assert.deepEqual(stepWorld(restored,s).cells,stepWorld(one,s).cells,
    'The exported preset is an actual reproducible cellular state');
  assert(sawStructure,'Chosen preset must reorganize at least some neighbor relations');
 }
 console.log('PASS A1: every calibrated Cyclic starter has exact seed replay and valid rule bounds');
 console.log('PASS A1: all-state phase cycling scores zero but genuine local reorganization is measured');
 console.log('PASS A1: every chosen world snapshot reloads and resumes bit-exactly');
}finally{
 await Promise.all(mods.map(([,f])=>unlink(resolve(f)).catch(()=>{})));
}
