/** T10 GENETIC DRIFT: deterministic heritable finite-genome real ant rules.
 *
 * One-parent inheritance is intentionally honest: this is mutation and
 * selection, NOT sexual crossover. Genomes are independent from T5 memory,
 * T8 phase, T9 life history, and the stable species slot index.
 */
export interface TurmiteEvolution {
 enabled:boolean;
 mutationRate:number;     // 0..100% per real T9 birth
 mutationSize:number;     // 1..3 signed gene delta
 locus:'all'|'turn'|'write'|'metabolism'|'forage';
}
export interface TurmiteGenome {
 turn:number;          // -3..3: actual L/R/S/U program offset
 write:number;         // -3..3: actual stored pigment offset
 metabolism:number;    // -3..3: modifies true per-step energy cost
 forage:number;        // -3..3: modifies energy from old painted track
}
export interface GeneticAgent {
 genome?:TurmiteGenome;
 parentId?:number;     // fixed index 0..11, birth's actual parent
 depth?:number;        // true genealogical generation, up to 4096
 brood?:number;        // per-parent successful birth counter, up to 1e9
}
export const NEUTRAL_TURMITE_GENOME:Readonly<TurmiteGenome>=Object.freeze({
 turn:0,write:0,metabolism:0,forage:0
});
export const DEFAULT_TURMITE_EVOLUTION:TurmiteEvolution={
 enabled:false,mutationRate:30,mutationSize:1,locus:'all'
};
export type GeneticLocus=keyof TurmiteGenome;
const LOCI:readonly GeneticLocus[]=['turn','write','metabolism','forage'];
export function validTurmiteEvolution(v:TurmiteEvolution):boolean{
 return !!v&&typeof v.enabled==='boolean'&&
 Number.isInteger(v.mutationRate)&&v.mutationRate>=0&&v.mutationRate<=100&&
 Number.isInteger(v.mutationSize)&&v.mutationSize>=1&&v.mutationSize<=3&&
 ['all',...LOCI].includes(v.locus);
}
export function validTurmiteGenome(g:unknown):g is TurmiteGenome{
 if(!g||typeof g!=='object')return false;
 const v=g as Record<string,unknown>;
 return LOCI.every(k=>Number.isInteger(v[k])&&(v[k] as number)>=-3&&(v[k] as number)<=3);
}
export function validGeneticAgent(a:GeneticAgent):boolean{
 return (a.genome===undefined||validTurmiteGenome(a.genome))&&
  (a.parentId===undefined&&(a.depth===undefined||a.depth===0)||
   (Number.isInteger(a.parentId)&&a.parentId!>=0&&a.parentId!<12))&&
  (a.depth===undefined||(Number.isInteger(a.depth)&&a.depth>=0&&a.depth<=4096))&&
  (a.brood===undefined||(Number.isInteger(a.brood)&&a.brood>=0&&a.brood<=1e9));
}
export function genomeOf(a:GeneticAgent):TurmiteGenome{
 if(a.genome!==undefined&&!validTurmiteGenome(a.genome))
  throw new Error('Invalid T10 stored genome');
 return a.genome??{...NEUTRAL_TURMITE_GENOME};
}
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const mix=(x:number):number=>{
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return (x^(x>>>16))>>>0;
};
/** No Math.random, clock, floating sampling or global mutation sequence.
 * The same parent, brood sequence and child slot always produce the SAME
 * offspring whether the world is stepped 1x or accelerated in batches.
 */
export function inheritGenome(
 parent:GeneticAgent,parentId:number,childSlot:number,
 seed:number,settings:TurmiteEvolution
):TurmiteGenome{
 if(!validTurmiteEvolution(settings)||!Number.isInteger(parentId)||parentId<0||parentId>11||
 !Number.isInteger(childSlot)||childSlot<0||childSlot>11||
 !Number.isInteger(seed)||!Number.isInteger(parent.brood??0))
  throw new Error('Invalid T10 genetic inheritance');
 const genome={...genomeOf(parent)};
 if(!settings.enabled||settings.mutationRate===0)return genome;
 const event=mix((seed>>>0)^Math.imul(parentId+1,0x9e3779b1)^
  Math.imul((parent.brood??0)+1,0x85ebca6b)^Math.imul(childSlot+1,0xc2b2ae35));
 if(event%100>=settings.mutationRate)return genome;
 const locus=settings.locus==='all'?LOCI[mix(event^0xa1b2c3d4)%4]:settings.locus;
 // At a boundary we always choose the inward direction so a "100%"
 // mutation genuinely changes at least one allele rather than clamping.
 const direction=genome[locus]===3?-1:genome[locus]===-3?1:
  mix(event^0x13664cdb)%2===0?1:-1;
 genome[locus]=clamp(genome[locus]+direction*settings.mutationSize,-3,3);
 return genome;
}
export function genomeDiversity(agents:readonly (GeneticAgent&{alive?:boolean})[],
 lifeEnabled:boolean):number{
 const living=agents.filter(a=>!lifeEnabled||a.alive!==false);
 if(living.length<2)return 0;
 const signatures=new Set(living.map(a=>LOCI.map(k=>genomeOf(a)[k]).join(',')));
 return signatures.size;
}
