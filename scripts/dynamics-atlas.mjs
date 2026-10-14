/** One-shot / on-demand CA viability sampler, not a universal correctness gate.
 * Usage: node scripts/dynamics-atlas.mjs
 *
 * Tests 17 actual simulation implementations x three seed densities x two
 * fixed seeds over 60 generations on a small square grid. Distinguishes
 * early/tail observed cell-change rates and zero-change tail windows. It does
 * NOT prove long-lived complexity, nor equate zero pixel delta with zero HPP
 * particle motion. All values reproduce exactly with the printed parameters.
 */
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const outfile=resolve('scripts/.dynamics-atlas-temp.mjs');
const engines=[
 'life','brians','cyclic','wolfram','generations','excitable','larger',
 'species','oriented','margolus','wireworld','sandpile','hodgepodge',
 'forestfire','ising','turmites','hpp'
];
const seeds=[82641,184719],densities=[.18,.36,.7],ticks=60;
const pct=(n,total)=>(100*n/total).toFixed(2)+'%';
function different(a,b){
 if(a.length!==b.length)throw Error('State buffers changed size');
 let count=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])count++;
 return count;
}
try{
 await build({entryPoints:['src/engine/sim.ts'],outfile,
  bundle:true,format:'esm',platform:'node',target:'node22'});
 const {createWorld,stepWorld}=await import(pathToFileURL(outfile).href);
 await build({entryPoints:['src/engine/types.ts'],outfile:outfile+'.types.mjs',
  bundle:true,format:'esm',platform:'node',target:'node22'});
 const {INITIAL_SETTINGS}=await import(pathToFileURL(outfile+'.types.mjs').href);
 const results=[];
 for(const engine of engines){
  const examples=[];
  for(const density of densities)for(const seed of seeds){
   const settings={...INITIAL_SETTINGS,engine,seed,density,cellCount:32,
    lattice:'square',aspect:'square',wrap:true,neighborShape:'moore'};
   let world=createWorld(settings),counts=[];
   for(let generation=0;generation<ticks;generation++){
    const next=stepWorld(world,settings);
    const changes=engine==='sandpile'?
      different(next.grains,world.grains):different(next.cells,world.cells);
    counts.push(changes);
    world=next;
   }
   const total=world.cells.length;
   const mean=(a)=>a.reduce((n,v)=>n+v,0)/a.length;
   const initial=mean(counts.slice(0,10));
   const tail=mean(counts.slice(-15));
   const tailZero=counts.slice(-15).filter(n=>n===0).length;
   examples.push({density,seed,initial,tail,tailZero,cells:total,
    last:counts.at(-1)});
  }
  const overallEarly=examples.reduce((s,x)=>s+x.initial/x.cells,0)/examples.length;
  const overallTail=examples.reduce((s,x)=>s+x.tail/x.cells,0)/examples.length;
  const idle=examples.filter(x=>x.tailZero===15).length;
  const line={
   engine,observedFirst10:pct(overallEarly,1),observedLast15:pct(overallTail,1),
   noCellChangesInFinal15:idle+'/'+examples.length,
   rangeLast15:[Math.min(...examples.map(x=>x.tail/x.cells)),
    Math.max(...examples.map(x=>x.tail/x.cells))].map(n=>pct(n,1)),
   note:engine==='hpp'?'Cell mask stability does not measure particle flux':
    ['forestfire','ising'].includes(engine)?'Seeded random future possible after quiet stretch':
    'Fixed sample only; not proof of permanent death or guaranteed future motion'
  };
  results.push(line);
  console.log('ATLAS '+JSON.stringify(line));
 }
 if(results.length!==17||new Set(results.map(x=>x.engine)).size!==17)
  throw Error('Atlas did not inspect all 17 engines');
 console.log('PASS: all 17 engine samples completed without altering parameters or main world.');
 console.log('NOTE: compare signal and physics invariants separately; this is a lightweight observation window.');
}finally{
 await unlink(outfile).catch(()=>{});
 await unlink(outfile+'.types.mjs').catch(()=>{});
}
