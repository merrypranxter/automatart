/** Dynamics T9: live metabolic cellular automata for moving Turmites.
 * Living, dormant and newborn ants occupy STABLE registry slots (1–12).
 * Birth happens only by filling a dead slot; nobody gets renumbered.
 * All resource reads use the identical old world for the whole microstep.
 */
import {DEFAULT_TURMITE_EVOLUTION,genomeOf,inheritGenome,validTurmiteEvolution,validGeneticAgent} from './turmite-genetics';
import type {TurmiteEvolution,GeneticAgent} from './turmite-genetics';

export interface TurmiteLife{
 enabled:boolean;
 founders:number;           // 1..12, only applied when creating a NEW world
 initialEnergy:number;      // 1..255, only used for unsaved legacy founders
 metabolism:number;         // 0..16 energy cost per true movement
 pigmentFood:number;        // 0..32 energy from old nonzero track at position
 chemicalFood:number;       // 0..16 max energy from true existing scent A
 lifespan:number;           // 2..4096 true substeps, not video frames
 birthEnergy:number;        // 4..255 threshold for parents
 birthCost:number;          // 1..128 energy spent by parent
 breeding:'off'|'bud'|'split';
}
export interface LifeAgent{
 x:number;y:number;heading:0|1|2|3;
 alive?:boolean;age?:number;energy?:number;
}
export const DEFAULT_TURMITE_LIFE:TurmiteLife={
 enabled:false,founders:2,initialEnergy:96,metabolism:3,
 pigmentFood:12,chemicalFood:8,lifespan:256,
 birthEnergy:125,birthCost:52,breeding:'bud'
};
export function validTurmiteLife(v:TurmiteLife):boolean{
 return !!v&&typeof v.enabled==='boolean'&&
  Number.isInteger(v.founders)&&v.founders>=1&&v.founders<=12&&
  Number.isInteger(v.initialEnergy)&&v.initialEnergy>=1&&v.initialEnergy<=255&&
  Number.isInteger(v.metabolism)&&v.metabolism>=0&&v.metabolism<=16&&
  Number.isInteger(v.pigmentFood)&&v.pigmentFood>=0&&v.pigmentFood<=32&&
  Number.isInteger(v.chemicalFood)&&v.chemicalFood>=0&&v.chemicalFood<=16&&
  Number.isInteger(v.lifespan)&&v.lifespan>=2&&v.lifespan<=4096&&
  Number.isInteger(v.birthEnergy)&&v.birthEnergy>=4&&v.birthEnergy<=255&&
  Number.isInteger(v.birthCost)&&v.birthCost>=1&&v.birthCost<=128&&
  ['off','bud','split'].includes(v.breeding);
}
export const lifeIsActive=(a:LifeAgent):boolean=>a.alive!==false;
export function initializeLifecycle<T extends LifeAgent>(
 agents:readonly T[],settings:TurmiteLife
):T[]{
 if(!validTurmiteLife(settings)||agents.length<1||agents.length>12)
  throw new Error('Invalid T9 lifecycle settings');
 return agents.map((a,i)=>settings.enabled?
   {...a,alive:i<settings.founders,age:0,
     energy:i<settings.founders?settings.initialEnergy:0}:
   {...a});
}
export function validateLifecycleAgent(a:LifeAgent):boolean{
 return (a.alive===undefined||typeof a.alive==='boolean')&&
  (a.age===undefined||(Number.isInteger(a.age)&&a.age>=0&&a.age<=4096))&&
  (a.energy===undefined||(Number.isInteger(a.energy)&&a.energy>=0&&a.energy<=255));
}
export interface LifeStep{
 active:number;births:number;deaths:number;
}
/** Validated inputs are cloned. Existing dead slots stay dead until a living
 * parent buds into one. Agents dying THIS microstep cannot become newborns
 * until the following step (all decisions are based on previous live mask).
 * Resource reads use the pre-movement previous cells, A and B; this makes
 * birth/death independent of stable agent iteration order.
 */
export function stepTurmiteLife<T extends LifeAgent&GeneticAgent>(
 prior:readonly T[],moved:readonly T[],oldCells:Uint8Array,
 oldA:Uint8Array|undefined,oldB:Uint8Array|undefined,
 w:number,h:number,wrap:boolean,r:TurmiteLife,
 evolution:TurmiteEvolution=DEFAULT_TURMITE_EVOLUTION,geneticSeed=0
):{agents:T[];stats:LifeStep}{
 if(!validTurmiteLife(r)||prior.length!==moved.length||
  oldCells.length!==w*h||(oldA&&oldA.length!==w*h)||
  (oldB&&oldB.length!==w*h)||!validTurmiteEvolution(evolution)||
  !Number.isInteger(geneticSeed))throw new Error('Invalid T9/T10 lifecycle lattice');
 if(!r.enabled)return {agents:moved.map(x=>({...x})),stats:{
  active:moved.filter(lifeIsActive).length,births:0,deaths:0}};
 const wasActive=prior.map(lifeIsActive);
 const out=moved.map(a=>({...a}));
 let deaths=0,births=0;
 for(let i=0;i<prior.length;i++){
  const a=prior[i],next=out[i];
  if(!validateLifecycleAgent(a)||!validateLifecycleAgent(next)||
   !validGeneticAgent(a)||!validGeneticAgent(next)||
   !Number.isInteger(a.x)||!Number.isInteger(a.y)||
   a.x<0||a.x>=w||a.y<0||a.y>=h)
   throw new Error('Invalid T9 agent state');
  if(!wasActive[i]){
   next.alive=false;next.energy=a.energy??0;next.age=a.age??0;
   continue;
  }
  const at=a.y*w+a.x;
  // True inherited metabolic genes change actual survival efficiency;
  // all resources are sampled from the same pre-movement physical fields.
  const genes=evolution.enabled?genomeOf(a):null;
  const food=oldCells[at]>0?Math.max(0,r.pigmentFood+(genes?.forage??0)*2):0;
  const chemical=Math.floor((oldA?.[at]??0)*r.chemicalFood/255);
  const metabolicCost=Math.max(0,r.metabolism+(genes?.metabolism??0));
  const energy=Math.min(255,Math.max(0,(a.energy??r.initialEnergy)+food+chemical-metabolicCost));
  const age=(a.age??0)+1;
  next.energy=energy;next.age=age;next.alive=energy>0&&age<r.lifespan;
  if(!next.alive)deaths++;
 }
 if(r.breeding!=='off'){
  // Read dead slots from the OLD population so sequential birth does not
  // overwrite an agent that died during this exact simultaneous microstep.
  const free:number[]=[];
  for(let i=0;i<prior.length;i++)if(!wasActive[i])free.push(i);
  for(let i=0;i<out.length&&free.length>0;i++){
   const p=out[i];
   if(!wasActive[i]||p.alive!==true||p.age!<2||
    p.energy!<r.birthEnergy||p.energy!<=r.birthCost)continue;
   const slot=free.shift()!;
   const born=out[slot],heading=(r.breeding==='split'?
    (p.heading+2)%4:p.heading) as 0|1|2|3;
   const displacement:[[number,number],[number,number],[number,number],[number,number]]=
    [[0,-1],[1,0],[0,1],[-1,0]];
   let x=p.x+displacement[heading][0],y=p.y+displacement[heading][1];
   if(wrap){x=(x+w)%w;y=(y+h)%h;}
   else{x=Math.max(0,Math.min(w-1,x));y=Math.max(0,Math.min(h-1,y));}
   // Inheritance reads the parent's PRE-birth brood counter; increment
   // only on an actual successful birth. Deterministic across speed modes.
   const offspringGenome=evolution.enabled?
    inheritGenome(p,i,slot,geneticSeed,evolution):undefined;
   if(evolution.enabled)p.brood=Math.min(1e9,(p.brood??0)+1);
   p.energy!-=r.birthCost;
   const childEnergy=r.breeding==='split'?Math.max(1,Math.floor(r.birthCost/2)):
    Math.max(1,r.birthCost);
   // Never resurrect a previous occupant's genome or old genealogy.
   // New children are neutral with T10 bypassed; with it enabled they
   // inherit their actual current parent's genome and one mutated allele.
   const child={...born,x,y,heading,alive:true,age:0,energy:childEnergy,
    ...('memory' in born?{memory:0}:{}),
    ...('rhythmPhase' in born?{rhythmPhase:(slot*73)%256}:{})
   } as T;
   delete child.genome;delete child.parentId;delete child.depth;delete child.brood;
   // Old occupant's contact history must not contaminate newborn identity.
   delete (child as T&{transferCount?:number}).transferCount;
   delete (child as T&{transferFrom?:number}).transferFrom;
   delete (child as T&{transferGene?:string}).transferGene;
   // T12: new baby is NOT the former occupant of the genetic fossil site.
   delete (child as T&{uptakeCount?:number}).uptakeCount;
   delete (child as T&{uptakeGene?:string}).uptakeGene;
   delete (child as T&{uptakeSite?:number}).uptakeSite;
   if(evolution.enabled){
    child.genome=offspringGenome!;
    child.parentId=i;child.depth=Math.min(4096,(p.depth??0)+1);child.brood=0;
   }
   out[slot]=child;
   births++;
  }
 }
 return {agents:out,stats:{
  active:out.filter(lifeIsActive).length,births,deaths
 }};
}
