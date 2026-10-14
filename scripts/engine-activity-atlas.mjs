/**
 * Empirical survey, NOT a test that every CA ought to stay active forever.
 * Fixed points, recurrence and absorbing states are legitimate mathematics.
 *
 * Node-only; no GPU/browser; uses the identical production createWorld/stepWorld.
 * Run: node scripts/engine-activity-atlas.mjs
 */
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const chunks=[
 ['src/engine/sim.ts','scripts/.activity-sim.mjs'],
 ['src/engine/types.ts','scripts/.activity-types.mjs'],
];
try{
 await Promise.all(chunks.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(chunks[i][1])).href);
 const {createWorld,stepWorld}=await load(0);
 const {INITIAL_SETTINGS}=await load(1);
 const engines=['life','brians','cyclic','wolfram','generations','excitable',
  'larger','species','oriented','margolus','wireworld','sandpile','hodgepodge',
  'forestfire','ising','turmites','hpp'];
 const seeds=[82641,12345,989898],generations=80;
 const scenarios=engines.map(engine=>({name:engine+'/default',engine,changes:{}}));
 const extras=[
  ['cyclic','legacy 12 phases / chase 2',{cyclicStates:12,cyclicThreshold:2,cyclicReach:1,cyclicDrive:0}],
  ['cyclic','legacy chase 1',{cyclicStates:12,cyclicThreshold:1,cyclicReach:1,cyclicDrive:0}],
  ['cyclic','legacy chase 2 + reach 3',{cyclicStates:12,cyclicThreshold:2,cyclicReach:3,cyclicDrive:0}],
  ['brians','4-neighbor brain',{neighborShape:'vonNeumann'}],
  ['brians','24-neighbor brain',{neighborShape:'square2'}],
  ['excitable','threshold 1',{exciteThreshold:1}],
  ['excitable','threshold 3',{exciteThreshold:3}],
  ['excitable','fast refractory 3',{exciteStates:3}],
  ['generations','refractory 3',{genStates:3}],
  ['species','birth 3 / survive 2',{speciesBirth:3,speciesSurvive:2}],
  ['larger','radius 3 old absolute bounds',{largeRadius:3}],
  ['larger','radius 3 scaled windows',{largeRadius:3,largeBirthMin:18,largeBirthMax:24,largeSurviveMin:16,largeSurviveMax:28}],
  ['wireworld','very dense conductor',{density:.80}],
  ['sandpile','no feeder',{sandFeed:0}],
  ['forestfire','no growth/lightning',{forestGrowth:0,forestLightning:0}],
  ['forestfire','active fire climate',{forestGrowth:.035,forestLightning:.004}],
  ['ising','absolute zero',{isingTemperature:0}],
  ['ising','thermal disorder',{isingTemperature:4.2}],
  ['wolfram','rule 0',{wolframRule:0}],
  ['wolfram','rule 110',{wolframRule:110}],
 ];
 for(const [engine,variant,changes] of extras)
  scenarios.push({name:engine+'/'+variant,engine,changes});
 const zero=(a)=>a.reduce((n,x)=>n+(x===0?1:0),0);
 function sample(engine,changes,seed){
  const s={...INITIAL_SETTINGS,engine,seed,cellCount:48,aspect:'square',
   lattice:'square',pattern:'noise',density:.36,wrap:true,...changes};
  let world=createWorld(s),states=[...world.cells],change=[],occupancy=[];
  for(let n=0;n<generations;n++){
   const prev=world;
   world=stepWorld(world,s);
   let moves=world.stepChanged;
   if(engine==='sandpile'){
    moves=0;
    for(let i=0;i<world.grains.length;i++)
     if(world.grains[i]!==prev.grains[i])moves++;
   }else if(moves===undefined){
    moves=0;
    for(let i=0;i<world.cells.length;i++)if(world.cells[i]!==prev.cells[i])moves++;
   }
   change.push(moves/world.cells.length);
   occupancy.push(1-zero(world.cells)/world.cells.length);
  }
  return {
   initial:1-zero(states)/states.length,
   first10:change.slice(0,10).reduce((a,b)=>a+b,0)*10,
   last20:change.slice(-20).reduce((a,b)=>a+b,0)*5,
   last10zero:change.slice(-10).every(x=>x===0),
   quiet20:change.slice(-20).filter(x=>x===0).length,
   endOccupancy:occupancy.at(-1),
   activeSteps:change.filter(x=>x>0).length
  };
 }
 const round=x=>(100*x).toFixed(2);
 const out=[];
 for(const scenario of scenarios){
  const metrics=seeds.map(seed=>sample(scenario.engine,scenario.changes,seed));
  const avg=k=>metrics.reduce((n,v)=>n+v[k],0)/metrics.length;
  const row={
   scenario:scenario.name,first:round(avg('first10')),
   last:round(avg('last20')),last10Frozen:metrics.filter(x=>x.last10zero).length,
   zeroTail:avg('quiet20').toFixed(1),occupancy:round(avg('endOccupancy')),
   activeSteps:avg('activeSteps').toFixed(0)
  };
  out.push(row);
 }
 if(out.length<engines.length)throw new Error('Missing engine');
 if(!engines.every(engine=>out.some(x=>x.scenario===engine+'/default')))
  throw new Error('An engine was not audited');
 console.log('ALL 17 ENGINES — identical 48-wide square-grid NOISE density 36%, 3 seeds, 80 generations');
 console.log('Changed-cell rates in first 10 and last 20 generations; *NOT* visual palette motion.');
 console.log('Legacy engines and fixed points are not automatically classified as defects.');
 console.log('| Engine / scenario | first 10 % | last 20 % | frozen seeds (of 3) | zero ticks in tail /20 | occupied % |');
 console.log('|---|---:|---:|---:|---:|---:|');
 for(const r of out)console.log(
  '| '+r.scenario+' | '+r.first+' | '+r.last+' | '+r.last10Frozen+
  ' | '+r.zeroTail+' | '+r.occupancy+' |');
 console.log('AUDIT_JSON='+JSON.stringify(out));
}finally{
 await Promise.all(chunks.map(([,f])=>unlink(resolve(f)).catch(()=>{})));
}
