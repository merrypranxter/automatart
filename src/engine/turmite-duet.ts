/** T7 Chemical Civil War: two independently persistent fields form an
 * antagonistic chemical ecology. The real physical gradient is signed A-B
 * (or its inverse), and separate species deposit A or B. Both fields diffuse,
 * evaporate and react synchronously. All operations are integer and seeded.
 */
import {PHEROMONE_DIRS,stepTurmitePheromones} from './turmite-pheromones';
import type {TurmitePheromones,CardinalHeading} from './turmite-pheromones';
export type DuetReaction='none'|'neutralize'|'convertA'|'convertB';
export type DuetNavigation='off'|'territories'|'inverted';
export interface TurmiteDuet {
 enabled:boolean;
 deposit:number;       // B deposition by odd-numbered species, 0..32
 diffusion:number;     // B diffusion fraction, 0..8
 evaporation:number;   // B evaporation, 0..8
 reaction:DuetReaction;
 reactionRate:number;  // fixed local amount 0..24
 navigation:DuetNavigation;
 threshold:number;     // minimum signed gradient 1..64
 strength:0|1|2;       // full or quarter-turn gradient response
}
export const DEFAULT_TURMITE_DUET:TurmiteDuet={
 enabled:false,deposit:24,diffusion:4,evaporation:1,
 reaction:'neutralize',reactionRate:6,navigation:'territories',threshold:2,strength:2
};
export function validTurmiteDuet(v:TurmiteDuet):boolean{
 return !!v&&typeof v.enabled==='boolean'&&
 Number.isInteger(v.deposit)&&v.deposit>=0&&v.deposit<=32&&
 Number.isInteger(v.diffusion)&&v.diffusion>=0&&v.diffusion<=8&&
 Number.isInteger(v.evaporation)&&v.evaporation>=0&&v.evaporation<=8&&
 ['none','neutralize','convertA','convertB'].includes(v.reaction)&&
 Number.isInteger(v.reactionRate)&&v.reactionRate>=0&&v.reactionRate<=24&&
 ['off','territories','inverted'].includes(v.navigation)&&
 Number.isInteger(v.threshold)&&v.threshold>=1&&v.threshold<=64&&
 Number.isInteger(v.strength)&&v.strength>=0&&v.strength<=2;
}
const indexOf=(x:number,y:number,w:number,h:number,wrap:boolean)=>{
 if(wrap){x=(x+w)%w;y=(y+h)%h;}
 return x<0||x>=w||y<0||y>=h?-1:y*w+x;
};
/** Positive signed local gradient of A-B for even species, B-A for odd.
 * Inverted swaps species' affinities. A neutral location causes NO steering.
 * The ordinary T6 steering is bypassed while T7 navigation is active, so
 * no competing post-hoc rotations silently defeat this transition.
 */
export function duetHeading(
 a:Uint8Array,b:Uint8Array,w:number,h:number,wrap:boolean,
 x:number,y:number,heading:CardinalHeading,species:number,chem:TurmiteDuet
):CardinalHeading{
 if(!validTurmiteDuet(chem)||a.length!==w*h||b.length!==w*h||
  !Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=w||y<0||y>=h||
  !Number.isInteger(heading)||heading<0||heading>3||
  !Number.isInteger(species)||species<0)
  throw Error('Invalid T7 chemical navigation');
 if(!chem.enabled||chem.navigation==='off'||chem.strength===0)return heading;
 const sign=((species%2===0)?1:-1)*(chem.navigation==='inverted'?-1:1);
 const p=y*w+x,center=sign*(a[p]-b[p]);
 let desired=-1,best=chem.threshold-1;
 for(let d=0;d<4;d++){
  const [dx,dy]=PHEROMONE_DIRS[d],n=indexOf(x+dx,y+dy,w,h,wrap);
  if(n<0)continue;
  const gradient=sign*(a[n]-b[n])-center;
  if(gradient>best){best=gradient;desired=d;}
 }
 if(desired<0||desired===heading)return heading;
 if(chem.strength===2)return desired as CardinalHeading;
 const delta=(desired-heading+4)%4;
 return ((heading+(delta===3?-1:1)+4)%4) as CardinalHeading;
}
/** Advance both arrays, then apply a STRICTLY LOCAL reaction. Even and odd
 * species inject into different grids; each field otherwise uses its own
 * T6 fixed-point diffusion/evaporation equation, and reactions never invent
 * concentrations or modify the previous timestep's arrays.
 */
export function stepTurmiteDuet(
 a:Uint8Array,b:Uint8Array,w:number,h:number,wrap:boolean,
 evenOrigins:readonly {x:number;y:number}[],
 oddOrigins:readonly {x:number;y:number}[],
 base:TurmitePheromones,duet:TurmiteDuet
):{a:Uint8Array;b:Uint8Array}{
 if(!validTurmiteDuet(duet)||!duet.enabled||!base.enabled||a.length!==w*h||b.length!==w*h)
  throw Error('Invalid active T7 chemical pair');
 const nextA=stepTurmitePheromones(a,w,h,wrap,evenOrigins,base);
 const nextB=stepTurmitePheromones(b,w,h,wrap,oddOrigins,{
  ...base,deposit:duet.deposit,diffusion:duet.diffusion,evaporation:duet.evaporation
 });
 if(duet.reaction==='none'||duet.reactionRate===0)return {a:nextA,b:nextB};
 for(let p=0;p<nextA.length;p++){
  const va=nextA[p],vb=nextB[p];
  if(duet.reaction==='neutralize'){
   const x=Math.min(va,vb,duet.reactionRate);
   nextA[p]-=x;nextB[p]-=x;
  }else if(duet.reaction==='convertA'){
   const x=Math.min(vb,255-va,duet.reactionRate);
   nextA[p]+=x;nextB[p]-=x;
  }else{
   const x=Math.min(va,255-vb,duet.reactionRate);
   nextA[p]-=x;nextB[p]+=x;
  }
 }
 return {a:nextA,b:nextB};
}
