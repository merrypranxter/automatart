/** T11 GENE SPILL: physical, synchronous horizontal exchange of T10 alleles.
 *  ALL contacts are selected from the same old physical positions/genes,
 *  independent of the order in which ants paint or advance.
 */
import {genomeOf,validTurmiteGenome} from './turmite-genetics';
import type {GeneticLocus,GeneticAgent,TurmiteGenome} from './turmite-genetics';

export interface TurmiteGeneSpill {
 enabled:boolean;
 radius:number;                 // 0..8 Manhattan cell-site distance
 probability:number;            // 0..100 percent per qualifying encounter
 locus:'all'|GeneticLocus;
 mode:'copy'|'blend'|'mutate'; // last mode: donor allele + one actual mutation
 gate:'any'|'pigment'|'scent';
 threshold:number;              // 0..255, meaningful only with scent gate
}
export interface ExchangeAgent extends GeneticAgent {
 x:number;y:number;alive?:boolean;
 transferCount?:number;          // counts actual opportunities, even failed ones
 transferFrom?:number;           // last donor stable registry ID
 transferGene?:GeneticLocus;     // last changed/received locus
}
export const DEFAULT_TURMITE_GENE_SPILL:TurmiteGeneSpill={
 enabled:false,radius:1,probability:70,locus:'all',
 mode:'copy',gate:'any',threshold:32
};
const GENES:readonly GeneticLocus[]=['turn','write','metabolism','forage'];
const clamp=(v:number)=>Math.max(-3,Math.min(3,v));
const mix=(x:number):number=>{
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return (x^(x>>>16))>>>0;
};
export function validTurmiteGeneSpill(v:TurmiteGeneSpill):boolean{
 return !!v&&typeof v.enabled==='boolean'&&
  Number.isInteger(v.radius)&&v.radius>=0&&v.radius<=8&&
  Number.isInteger(v.probability)&&v.probability>=0&&v.probability<=100&&
  ['all',...GENES].includes(v.locus)&&
  ['copy','blend','mutate'].includes(v.mode)&&
  ['any','pigment','scent'].includes(v.gate)&&
  Number.isInteger(v.threshold)&&v.threshold>=0&&v.threshold<=255;
}
export function validTransferAgent(a:ExchangeAgent,capacity=12):boolean{
 return !!a&&
  (a.transferCount===undefined||(Number.isInteger(a.transferCount)&&
   a.transferCount>=0&&a.transferCount<=1e9))&&
  (a.transferFrom===undefined||(Number.isInteger(a.transferFrom)&&
   a.transferFrom>=0&&a.transferFrom<capacity))&&
  (a.transferGene===undefined||GENES.includes(a.transferGene));
}
function distance(a:ExchangeAgent,b:ExchangeAgent,w:number,h:number,wrap:boolean):number{
 const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
 return (wrap?Math.min(dx,w-dx):dx)+(wrap?Math.min(dy,h-dy):dy);
}
export interface GeneSpillOutcome<T>{agents:T[];contacts:number;transfers:number}
/** A donor cannot see a recipient's newly acquired allele until the NEXT
 * microstep. Births and deaths were already computed, but only individuals
 * actually living at the start AND surviving this step are recipients.
 *
 * The nearest qualifying donor is selected by real Manhattan distance then
 * stable ID. If the donor dies in this same microstep its old genome is still
 * valid evidence for the physical contact that already occurred.
 */
export function stepGeneSpill<T extends ExchangeAgent>(
 before:readonly T[],after:readonly T[],
 oldCells:Uint8Array,oldA:Uint8Array|undefined,
 w:number,h:number,wrap:boolean,lifeEnabled:boolean,
 geneticEnabled:boolean,settings:TurmiteGeneSpill,seed:number
):GeneSpillOutcome<T>{
 if(!validTurmiteGeneSpill(settings)||!Number.isInteger(seed)||
  !Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||
  before.length!==after.length||before.length<1||before.length>12||
  oldCells.length!==w*h||(oldA&&oldA.length!==w*h))
  throw new Error('Invalid T11 contact system');
 if(!settings.enabled||!geneticEnabled)return {
  agents:after.map(a=>({...a,genome:a.genome?{...a.genome}:undefined} as T)),
  contacts:0,transfers:0
 };
 const out=after.map(a=>({...a,genome:a.genome?{...a.genome}:undefined} as T));
 let contacts=0,transfers=0;
 for(let i=0;i<before.length;i++){
  const recipient=before[i],next=out[i];
  if(!validTransferAgent(recipient,before.length)||
   !validTransferAgent(next,before.length)||
   !Number.isInteger(recipient.x)||recipient.x<0||recipient.x>=w||
   !Number.isInteger(recipient.y)||recipient.y<0||recipient.y>=h)
   throw new Error('Invalid T11 contact agent state');
  if((lifeEnabled&&(recipient.alive===false||next.alive===false))||
   // A newborn from a formerly vacant slot cannot take part in its birth
   // microstep, even when placed adjacent to the parent.
   (recipient.alive===false&&next.alive===true))continue;
  const p=recipient.y*w+recipient.x;
  if(settings.gate==='pigment'&&oldCells[p]===0)continue;
  if(settings.gate==='scent'&&(!oldA||oldA[p]<settings.threshold))continue;
  let donorId=-1,bestDistance=Infinity;
  for(let j=0;j<before.length;j++){
   if(i===j||(lifeEnabled&&before[j].alive===false))continue;
   const partner=before[j];
   const d=distance(recipient,partner,w,h,wrap);
   if(d<=settings.radius&&d<bestDistance){
    bestDistance=d;donorId=j;
   }
  }
  if(donorId<0)continue;
  // Every eligible contact increments its own persistent local encounter
  // counter; no global timestep/rng means exact batch/serial reproducibility.
  const contact=(recipient.transferCount??0)+1;
  if(contact>1e9)throw new Error('T11 encounter counter overflow');
  next.transferCount=contact;
  contacts++;
  const event=mix((seed>>>0)^Math.imul(i+1,0x9e3779b1)^
   Math.imul(donorId+1,0x85ebca6b)^Math.imul(contact,0xc2b2ae35)^
   Math.imul(p+1,0x27d4eb2d));
  if(event%100>=settings.probability)continue;
  const locus=settings.locus==='all'?GENES[mix(event^0xa73a2c91)%4]:settings.locus;
  // Donor and recipient BOTH read old genes (before[]), so simultaneous
  // encounters do not propagate alleles instantly across an entire stack.
  const source=genomeOf(before[donorId])[locus];
  const target=genomeOf(recipient)[locus];
  let value:number;
  if(settings.mode==='copy')value=source;
  else if(settings.mode==='blend')value=source+target>=0?
    Math.floor((source+target+1)/2):Math.ceil((source+target-1)/2);
  else{
   const direction=source===3?-1:source===-3?1:
    (mix(event^0x19dc45fa)&1)?1:-1;
   value=clamp(source+direction);
  }
  const genome:TurmiteGenome={...genomeOf(next),[locus]:value};
  if(!validTurmiteGenome(genome))throw new Error('T11 invalid inherited genome');
  next.genome=genome;
  next.transferFrom=donorId;
  next.transferGene=locus;
  transfers++;
 }
 return {agents:out,contacts,transfers};
}
