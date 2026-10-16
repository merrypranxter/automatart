/** T13 GENETIC NICHES: heritable fitness landscape created by real T12 DNA.
 *
 * The environmental "niche" is NOT a decoration or a second simulation.
 * Only the prior physical DNA code/strength arrays are read. Each organism
 * evaluates sites using its own real four-gene genotype. This changes real
 * steering, metabolism and offspring placement at the next CA step.
 */
import {decodeDnaFragment} from './turmite-dna-fossils';
import {genomeOf} from './turmite-genetics';
import type {GeneticAgent} from './turmite-genetics';
import type {DnaPool} from './turmite-dna-fossils';
export interface TurmiteNiches {
 enabled:boolean;
 policy:'kin'|'novelty'|'avoid-foreign';
 tolerance:number;     // 0..3 allowed allelic distance for genetic match
 threshold:number;     // 1..255 minimum real fragment strength
 steering:number;      // 0..8 how strongly old landscape may redirect paths
 nutrient:number;      // 0..32 units food per old matching fragment
 hazard:number;        // 0..32 additional cost per old differing fragment
 nursery:boolean;      // parents use real local old habitat for birth placement
}
export const DEFAULT_TURMITE_NICHES:TurmiteNiches={
 enabled:false,policy:'kin',tolerance:0,threshold:32,
 steering:4,nutrient:12,hazard:6,nursery:false
};
export function validTurmiteNiches(n:TurmiteNiches):boolean{
 return !!n&&typeof n.enabled==='boolean'&&
  ['kin','novelty','avoid-foreign'].includes(n.policy)&&
  Number.isInteger(n.tolerance)&&n.tolerance>=0&&n.tolerance<=3&&
  Number.isInteger(n.threshold)&&n.threshold>=1&&n.threshold<=255&&
  Number.isInteger(n.steering)&&n.steering>=0&&n.steering<=8&&
  Number.isInteger(n.nutrient)&&n.nutrient>=0&&n.nutrient<=32&&
  Number.isInteger(n.hazard)&&n.hazard>=0&&n.hazard<=32&&
  typeof n.nursery==='boolean';
}
const VECTORS:readonly (readonly [number,number])[]=[[0,-1],[1,0],[0,1],[-1,0]];
const pos=(x:number,y:number,w:number,h:number,wrap:boolean):number=>{
 if(wrap){x=(x+w)%w;y=(y+h)%h;}
 else if(x<0||x>=w||y<0||y>=h)return -1;
 return y*w+x;
};
export interface NicheSite {code:number;strength:number;matching:boolean;fitness:number}
/** The real local genotype-environment fitness for a site, no future reads. */
export function siteNicheFitness(
 a:GeneticAgent,code:Uint8Array|undefined,
 strength:Uint8Array|undefined,p:number,n:TurmiteNiches
):NicheSite{
 const fragment=code&&p>=0?decodeDnaFragment(code[p]):null;
 const value=strength&&p>=0?strength[p]:0;
 if(!fragment)return {code:0,strength:value,matching:false,fitness:0};
 // Genetic compatibility is a FACT of the stored allele, even when
 // ecological physics is bypassed or the fragment is below threshold.
 const own=genomeOf(a)[fragment.locus];
 const matching=Math.abs(own-fragment.allele)<=n.tolerance;
 if(!n.enabled||value<n.threshold)
  return {code:code![p],strength:value,matching,fitness:0};
 let fitness=0;
 if(n.policy==='kin')fitness=matching?value:0;
 else if(n.policy==='novelty')fitness=matching?0:value;
 else fitness=matching?0:-value;
 return {code:code![p],strength:value,matching,fitness};
}
/** Deterministic TRUE physical direction decision.
 * The existing heading is preferred for ties. A dead end with no better
 * ecological score leaves all old Turmite motion completely untouched.
 */
export function nicheSteerHeading(
 a:GeneticAgent,x:number,y:number,heading:0|1|2|3,w:number,h:number,
 wrap:boolean,code:Uint8Array|undefined,strength:Uint8Array|undefined,
 n:TurmiteNiches
):0|1|2|3{
 if(!n.enabled||n.steering===0||!code||!strength)return heading;
 // At a finite boundary the actual physics REFLECTS a heading off-grid.
 // Score that reflected REAL destination, never fictitious off-grid zero
 // (which would incorrectly attract 'avoid foreign' ants into obstacles).
 const at=(dir:number)=>{
  const result=pos(x+VECTORS[dir][0],y+VECTORS[dir][1],w,h,wrap);
  return result>=0?result:pos(x-VECTORS[dir][0],y-VECTORS[dir][1],w,h,false);
 };
 const old=siteNicheFitness(a,code,strength,at(heading),n).fitness;
 let best=old,chosen=heading;
 for(let k=1;k<4;k++){
  const candidate=((heading+k)%4) as 0|1|2|3;
  const score=siteNicheFitness(a,code,strength,at(candidate),n).fitness;
  if(score>best){best=score;chosen=candidate;}
 }
 // Quantized strict gain with a strength control; does not summon a field
 // where no true DNA is present. At setting 8, ANY positive gain wins.
 if(chosen===heading||(best-old)*n.steering<8)return heading;
 return chosen;
}
/** Actual old cell DNA changes T9 energy and thus who survives and breeds.
 * Return signed ENERGY, not a visual marker; negative values cause death.
 */
export function nicheEnergyAt(
 a:GeneticAgent,p:number,code:Uint8Array|undefined,
 strength:Uint8Array|undefined,n:TurmiteNiches
):number{
 if(!n.enabled||!code||!strength)return 0;
 const cell=siteNicheFitness(a,code,strength,p,n);
 if(cell.strength<n.threshold||cell.code===0)return 0;
 return cell.matching?Math.floor(cell.strength*n.nutrient/255):
  -Math.floor(cell.strength*n.hazard/255);
}
/** Place a genuine newborn at the most favorable adjacent OLD DNA site.
 * Retain its parents' actual heading and T9 split/bud semantics when the
 * neighborhood contains no advantage. A child still moves only NEXT step.
 */
export function nicheNurseryHeading(
 a:GeneticAgent,x:number,y:number,heading:0|1|2|3,w:number,h:number,
 wrap:boolean,code:Uint8Array|undefined,strength:Uint8Array|undefined,
 n:TurmiteNiches
):0|1|2|3{
 if(!n.enabled||!n.nursery||!code||!strength)return heading;
 const at=(dir:number)=>pos(x+VECTORS[dir][0],y+VECTORS[dir][1],w,h,wrap);
 let best=nicheEnergyAt(a,at(heading),code,strength,n);
 let selected=heading;
 for(let k=1;k<4;k++){
  const candidate=((heading+k)%4) as 0|1|2|3;
  const energy=nicheEnergyAt(a,at(candidate),code,strength,n);
  if(energy>best){best=energy;selected=candidate;}
 }
 return selected;
}
