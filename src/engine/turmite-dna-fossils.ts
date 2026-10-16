/** T12 DNA FOSSILS: an actual two-layer extracellular genetic information field.
 * One 8-bit gene-fragment lattice + one 8-bit strength lattice. Their state
 * is independent of rendered pixels, T6 pheromones and ant DNA.
 *
 * Like DNA released by dead cells or environmental transformation in
 * microbes, the field is an explicitly stylized INFORMATION pool, not a
 * conservation-of-chemical-mass simulator.
 */
import {genomeOf,validTurmiteGenome} from './turmite-genetics';
import type {GeneticAgent,GeneticLocus,TurmiteGenome} from './turmite-genetics';

export interface TurmiteDnaFossils {
 enabled:boolean;
 deposit:number;       // 0..255 physical field strength per living visitor
 decay:number;         // 0..32 strength erased per true microstep
 spread:number;        // 0..8 nearest-neighbor informational copying
 uptake:number;        // 0..100 successful uptake chance on exposure
 threshold:number;     // 1..255 minimum pre-step field strength
 locus:'all'|GeneticLocus;
 mode:'copy'|'blend'|'mutate';
}
export interface DnaFossilAgent extends GeneticAgent {
 x:number;y:number;alive?:boolean;
 uptakeCount?:number;      // persisted number of real environmental exposures
 uptakeGene?:GeneticLocus; // most recently absorbed locus
 uptakeSite?:number;       // saved true site index, never fake donor ID
}
export interface DnaPool {code:Uint8Array;strength:Uint8Array}
export interface DnaFossilStep<T> {agents:T[];pool:DnaPool;exposures:number;uptakes:number}
export const DEFAULT_TURMITE_DNA_FOSSILS:TurmiteDnaFossils={
 enabled:false,deposit:160,decay:3,spread:3,uptake:65,
 threshold:24,locus:'all',mode:'copy'
};
const GENES:readonly GeneticLocus[]=['turn','write','metabolism','forage'];
const hash=(x:number):number=>{
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return (x^(x>>>16))>>>0;
};
const bound=(v:number)=>Math.max(-3,Math.min(3,v));
export function validDnaFossilSettings(s:TurmiteDnaFossils):boolean{
 return !!s&&typeof s.enabled==='boolean'&&
 Number.isInteger(s.deposit)&&s.deposit>=0&&s.deposit<=255&&
 Number.isInteger(s.decay)&&s.decay>=0&&s.decay<=32&&
 Number.isInteger(s.spread)&&s.spread>=0&&s.spread<=8&&
 Number.isInteger(s.uptake)&&s.uptake>=0&&s.uptake<=100&&
 Number.isInteger(s.threshold)&&s.threshold>=1&&s.threshold<=255&&
 ['all',...GENES].includes(s.locus)&&
 ['copy','blend','mutate'].includes(s.mode);
}
export function validDnaFossilAgent(a:DnaFossilAgent,n:number):boolean{
 return (a.uptakeCount===undefined||
  Number.isInteger(a.uptakeCount)&&a.uptakeCount>=0&&a.uptakeCount<=1e9)&&
 (a.uptakeGene===undefined||GENES.includes(a.uptakeGene))&&
 (a.uptakeSite===undefined||Number.isInteger(a.uptakeSite)&&
  a.uptakeSite>=0&&a.uptakeSite<n);
}
/** 0 denotes no fragment; 1..28 means four genes × seven possible alleles.
 * Encoded fragments always distinguish neutral allele 0 from empty space.
 */
export function encodeDnaFragment(locus:GeneticLocus,allele:number):number{
 const at=GENES.indexOf(locus);
 if(at<0||!Number.isInteger(allele)||allele< -3||allele>3)
  throw new Error('Invalid extracellular DNA');
 return 1+at*7+allele+3;
}
export function decodeDnaFragment(code:number):{locus:GeneticLocus;allele:number}|null{
 if(!Number.isInteger(code)||code<0||code>28)
  throw new Error('Invalid extracellular DNA');
 if(code===0)return null;
 const id=code-1;
 return {locus:GENES[Math.floor(id/7)],allele:id%7-3};
}
export function validDnaPool(pool:DnaPool,n:number):boolean{
 if(!pool||!(pool.code instanceof Uint8Array)||
  !(pool.strength instanceof Uint8Array)||
  pool.code.length!==n||pool.strength.length!==n)return false;
 for(let i=0;i<n;i++)
  if(pool.code[i]>28||Boolean(pool.code[i])!==Boolean(pool.strength[i]))return false;
 return true;
}
export function dnaPoolStats(pool:DnaPool):{sites:number;strength:number;alleles:number}{
 let sites=0,strength=0;
 const variants=new Set<number>();
 for(let i=0;i<pool.code.length;i++){
  if(pool.strength[i]>0){
   sites++;strength+=pool.strength[i];variants.add(pool.code[i]);
  }
 }
 return {sites,strength,alleles:variants.size};
}
const axis=(v:number,max:number,wrap:boolean)=>wrap?(v+max)%max:
 (v<0||v>=max?-1:v);
/** The entire physical update uses old fields & old agent positions.
 * 1. Each surviving, previous-step organism may absorb OLD environmental DNA.
 * 2. The old field erodes, copying fragments to immediate neighbors with a
 *    deterministic winner (largest strength; on ties, lowest source index).
 * 3. OLD living organisms deposit their OLD alleles on OLD positions,
 *    including individuals that die during this same step. Newborns cannot
 *    deposit or absorb until a subsequent real substep.
 * All output changes take effect in the NEXT substep.
 */
export function stepDnaFossils<T extends DnaFossilAgent>(
 before:readonly T[],after:readonly T[],old:DnaPool|undefined,
 oldCells:Uint8Array,w:number,h:number,wrap:boolean,
 lifeEnabled:boolean,geneticEnabled:boolean,s:TurmiteDnaFossils,
 seed:number
):DnaFossilStep<T>{
 const n=w*h;
 if(!validDnaFossilSettings(s)||!Number.isInteger(w)||!Number.isInteger(h)||
  w<1||h<1||!Number.isInteger(seed)||before.length!==after.length||
  before.length<1||before.length>12||oldCells.length!==n||
  (old!==undefined&&!validDnaPool(old,n)))
  throw new Error('Invalid T12 extracellular world');
 const source=old??{code:new Uint8Array(n),strength:new Uint8Array(n)};
 const out=after.map(a=>({...a,genome:a.genome?{...a.genome}:undefined} as T));
 if(!s.enabled||!geneticEnabled)
  return {agents:out,pool:{code:source.code.slice(),strength:source.strength.slice()},
   exposures:0,uptakes:0};
 let exposures=0,uptakes=0;
 for(let i=0;i<before.length;i++){
  const prev=before[i],next=out[i];
  if(!validDnaFossilAgent(prev,n)||!validDnaFossilAgent(next,n)||
   !Number.isInteger(prev.x)||!Number.isInteger(prev.y)||
   prev.x<0||prev.x>=w||prev.y<0||prev.y>=h)
   throw new Error('Invalid T12 uptake recipient');
  if(lifeEnabled&&(prev.alive===false||next.alive===false))continue;
  const at=prev.y*w+prev.x,fragment=source.code[at];
  if(fragment===0||source.strength[at]<s.threshold)continue;
  const exposure=(prev.uptakeCount??0)+1;
  if(exposure>1e9)throw new Error('T12 exposure counter overflow');
  next.uptakeCount=exposure;exposures++;
  const event=hash((seed>>>0)^Math.imul(i+1,0x9e3779b1)^
   Math.imul(exposure,0x85ebca6b)^Math.imul(at+1,0xc2b2ae35)^
   Math.imul(fragment,0x27d4eb2d));
  if(event%100>=s.uptake)continue;
  const {locus,allele}=decodeDnaFragment(fragment)!;
  const original=genomeOf(prev)[locus];
  let replacement=allele;
  if(s.mode==='blend'){
   const sum=original+allele;
   replacement=sum>=0?Math.floor((sum+1)/2):Math.ceil((sum-1)/2);
  }else if(s.mode==='mutate'){
   const direction=allele===3?-1:allele===-3?1:
    (hash(event^0x19437caa)&1)?1:-1;
   replacement=bound(allele+direction);
  }
  const genes:TurmiteGenome={...genomeOf(next),[locus]:replacement};
  if(!validTurmiteGenome(genes))throw new Error('Invalid T12 transformed genome');
  next.genome=genes;next.uptakeGene=locus;next.uptakeSite=at;uptakes++;
 }
 // Information propagation is NOT mass-conserving chemical diffusion:
 // neighbors can copy a sequence at attenuated strength, but old fields
 // determine all decisions. This also avoids order-dependent propagation.
 const code=new Uint8Array(n),strength=new Uint8Array(n);
 const links:[[number,number],[number,number],[number,number],[number,number]]=
  [[-1,0],[1,0],[0,-1],[0,1]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;
  let best=Math.max(0,source.strength[i]-s.decay);
  let selected=best>0?source.code[i]:0;
  let bestOrigin=best>0?i:n;
  if(s.spread>0)for(const [dx,dy] of links){
   const nx=axis(x+dx,w,wrap),ny=axis(y+dy,h,wrap);
   if(nx<0||ny<0)continue;
   const j=ny*w+nx,oldStr=source.strength[j];
   const candidate=Math.floor(oldStr*s.spread/8);
   const value=Math.max(0,candidate-s.decay);
   if(value>best||value===best&&value>0&&j<bestOrigin){
    best=value;selected=source.code[j];bestOrigin=j;
   }
  }
  if(best>0){code[i]=selected;strength[i]=best;}
 }
 // Donor selection is synchronous. For overlapping deposits, the
 // greatest offered strength wins; identical strengths use lower registry ID.
 const depositedBy=new Int16Array(n).fill(32767);
 if(s.deposit>0)for(let id=0;id<before.length;id++){
  const ant=before[id];
  if(lifeEnabled&&ant.alive===false)continue;
  const p=ant.y*w+ant.x;
  if(!Number.isInteger(p)||p<0||p>=n)throw new Error('Invalid T12 donor location');
  const event=hash((seed>>>0)^Math.imul(id+1,0x9e3779b1)^
   Math.imul((ant.uptakeCount??0)+1,0x85ebca6b)^Math.imul(p+1,0x27d4eb2d));
  const locus=s.locus==='all'?GENES[event%4]:s.locus;
  const encoded=encodeDnaFragment(locus,genomeOf(ant)[locus]);
  if(s.deposit>strength[p]||s.deposit===strength[p]&&id<depositedBy[p]){
   strength[p]=s.deposit;code[p]=encoded;depositedBy[p]=id;
  }
 }
 return {agents:out,pool:{code,strength},exposures,uptakes};
}
