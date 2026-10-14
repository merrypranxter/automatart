/** Search viable Cyclic CA parameter regimes using the production stepper.
 * This is NOT an assertion that sustained movement is guaranteed forever.
 * Logs independent width/seed results (120 generations) and conservatively
 * ranks candidates by observed late activity and local phase boundaries.
 */
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const tmp=[['src/engine/sim.ts','scripts/.cyclic-viability-sim.mjs'],
 ['src/engine/types.ts','scripts/.cyclic-viability-types.mjs']];
const conf=[
 [8,1,1,.36,0],[8,2,1,.36,0],[8,2,2,.36,0],
 [8,1,2,.36,0],[8,1,3,.36,0],[8,2,3,.36,0],[8,3,3,.36,0],
 [10,1,1,.36,0],[10,2,1,.36,0],[10,2,2,.36,0],
 [12,1,1,.36,0],[12,2,1,.36,0],[12,2,2,.36,0],
 [12,2,3,.36,0],[12,3,1,.36,0],[12,3,2,.36,0],
 [12,3,3,.36,0],[16,2,1,.36,0],[16,3,1,.36,0],
 [16,3,2,.36,0],[16,3,3,.36,0],[16,4,3,.36,0],
 [12,2,1,.2,0],[12,2,1,.55,0],[12,2,1,.75,0],
 [8,1,1,.2,0],[8,1,1,.65,0],
 [12,3,2,.55,0],[12,3,2,.75,0],
 [10,2,1,.55,0],[16,3,2,.55,0],
 [8,1,1,.36,.0005],[8,2,3,.36,.001],
 [12,2,1,.36,.0005],[12,2,2,.36,.001]
];
const widths=[48,96],seeds=[82641,989898],steps=120;
try{
 await Promise.all(tmp.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,platform:'node',format:'esm',target:'node22'})));
 const {createWorld,stepWorld}=await import(pathToFileURL(resolve(tmp[0][1])).href);
 const {INITIAL_SETTINGS}=await import(pathToFileURL(resolve(tmp[1][1])).href);
 const results=[];
 for(const [states,threshold,reach,density,drive] of conf){
  const samples=[];
  for(const width of widths)for(const seed of seeds){
   const s={...INITIAL_SETTINGS,engine:'cyclic',lattice:'square',cellCount:width,
    aspect:'square',seed,pattern:'noise',wrap:true,neighborShape:'moore',
    cyclicStates:states,cyclicThreshold:threshold,cyclicReach:reach,cyclicDrive:drive,density};
   let world=createWorld(s),late=0,lateChanges=0,lateStructure=0,structureSteps=0;
   for(let tick=1;tick<=steps;tick++){
    const previous=world;
    world=stepWorld(world,s);
    if(tick>90){
     late+=world.stepChanged/world.cells.length;
     if(world.stepChanged)lateChanges++;
     // Uniform +1 changes every cell but preserves pairwise phases.
     // Detect actual evolving spatial relations, not color-cycle-like motion.
     const n=world.cells.length,w=world.width,h=world.height;
     let changes=0;
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,right=y*w+(x+1)%w,down=((y+1)%h)*w+x;
      for(const j of [right,down]){
       const before=(previous.cells[j]-previous.cells[i]+states)%states;
       const after=(world.cells[j]-world.cells[i]+states)%states;
       if(before!==after)changes++;
      }
     }
     lateStructure+=changes/(2*n);
     if(changes)structureSteps++;
    }
   }
   let edges=0;
   const w=world.width,h=world.height;
   const frequency=new Uint32Array(states);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,k=world.cells[i];frequency[k]++;
    if(k!==world.cells[y*w+(x+1)%w])edges++;
    if(k!==world.cells[((y+1)%h)*w+x])edges++;
   }
   const present=frequency.reduce((n,v)=>n+(v>0?1:0),0);
   samples.push({width,seed,late:late/30,activeLate:lateChanges,
    structure:lateStructure/30,structureSteps,
    boundary:edges/(2*w*h),present});
  }
  const good=samples.filter(x=>x.late>.005&&x.structure>.003&&x.boundary>.02&&x.present>=3);
  results.push({states,threshold,reach,density,drive,
   alive:good.length,total:samples.length,
   minLate:Math.min(...samples.map(x=>x.late)),
   avgLate:samples.reduce((n,x)=>n+x.late,0)/samples.length,
   minStructural:Math.min(...samples.map(x=>x.structure)),
   avgStructural:samples.reduce((n,x)=>n+x.structure,0)/samples.length,
   minStructuralSteps:Math.min(...samples.map(x=>x.structureSteps)),
   minBoundary:Math.min(...samples.map(x=>x.boundary)),
   avgBoundary:samples.reduce((n,x)=>n+x.boundary,0)/samples.length,
   minimumPhases:Math.min(...samples.map(x=>x.present)),
   lateActiveSteps:Math.min(...samples.map(x=>x.activeLate))
  });
 }
 results.sort((a,b)=>b.alive-a.alive||b.minStructural-a.minStructural||b.minBoundary-a.minBoundary);
 console.log('Cyclic A1 viability sweep. Real cell changes and neighboring phase boundaries after 120 generations.');
 console.log('Test grid: widths 48 & 96; seeds 82641 & 989898; NOISE at stated density; last 30 ticks.');
 console.log('| N | threshold | reach | fill | drive | structurally active/4 | worst late changes | worst edge restructuring | edge-changing steps |');
 console.log('|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
 for(const r of results)console.log(
  '| '+r.states+' | '+r.threshold+' | '+r.reach+' | '+r.density.toFixed(2)+
  ' | '+r.drive.toFixed(4)+' | '+r.alive+'/4 | '+(r.minLate*100).toFixed(2)+
  '% | '+(r.minStructural*100).toFixed(2)+'% | '+r.minStructuralSteps+'/30 |');
 console.log('CYCLIC_SWEEP_JSON='+JSON.stringify(results));
}finally{
 await Promise.all(tmp.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
