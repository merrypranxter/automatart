/** Real cyclic cellular dynamics, deliberately separate from visual palette motion.
 *
 * Classic CCA rule: cell k advances to k+1 mod N when at least T neighbors
 * hold that exact next state. Reach R extends eligibility to the R states
 * ahead (but the cell STILL advances exactly one state). Optional seeded
 * spontaneous advances independently kick single cells by one state.
 * At reach=1 and drive=0 this exactly preserves the pre-Dynamics rule.
 */
import {random01} from './reaction-worlds';
export function chaseNeighbor(neighbor:number,old:number,states:number,reach:number):boolean{
 const ahead=(neighbor-old+states)%states;
 return ahead>=1&&ahead<=reach;
}
/** Fraction of spatial phase-difference edges changed between generations.
 * A global +1 of every cell gives exactly ZERO: the image may cycle colors,
 * but its relative local structure has not evolved. Includes right/down edges
 * only, with optional periodic seams. */
export function cyclicStructuralChange(before:Uint8Array,after:Uint8Array,
 width:number,height:number,states:number,wrap:boolean):number{
 if(before.length!==width*height||after.length!==before.length||
 !Number.isInteger(states)||states<2)throw new Error('Invalid cyclic structural comparison');
 let changed=0,edges=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  const visit=(j:number)=>{
   const old=(before[j]-before[i]+states)%states;
   const now=(after[j]-after[i]+states)%states;
   if(old!==now)changed++;
   edges++;
  };
  if(x+1<width)visit(i+1);else if(wrap)visit(y*width);
  if(y+1<height)visit(i+width);else if(wrap)visit(x);
 }
 return edges?changed/edges:0;
}
export function cyclicAdvance(old:number,matches:number,threshold:number,
 drive:number,seed:number,generation:number,index:number,states:number):number{
 if(matches>=threshold || (drive>0&&random01(seed,generation,index,61)<drive))
  return (old+1)%states;
 return old;
}
/** Estimate initial chance that a random NOISE-seeded cell advances.
 * This is explicitly an instantaneous approximation, not a promise of
 * sustained motion. The original noise seed has one abundant zero state,
 * all other N-1 states equally occupied with probability density/(N-1).
 */
export function estimateInitialChase(states:number,reach:number,threshold:number,
 neighbors:number,density:number,drive:number):number{
 if(!Number.isInteger(states)||states<3||states>24||
 !Number.isInteger(reach)||reach<1||reach>=states||
 !Number.isInteger(threshold)||threshold<1||threshold>24||
 !Number.isInteger(neighbors)||neighbors<1||neighbors>24||
 !Number.isFinite(density)||density<0||density>1||
 !Number.isFinite(drive)||drive<0||drive>1)return 0;
 const p0=1-density,paint=density/(states-1);
 const probabilities=Array.from({length:states},(_,i)=>i===0?p0:paint);
 let estimate=0;
 for(let old=0;old<states;old++){
  let match=0;
  for(let other=0;other<states;other++)
   if(chaseNeighbor(other,old,states,reach))match+=probabilities[other];
  let distribution=0;
  for(let hits=0;hits<=neighbors;hits++){
   let comb=1;
   for(let j=1;j<=hits;j++)comb=comb*(neighbors-j+1)/j;
   const likelihood=comb*match**hits*(1-match)**(neighbors-hits);
   if(hits>=threshold)distribution+=likelihood;
  }
  estimate+=probabilities[old]*(distribution+(1-distribution)*drive);
 }
 return Math.max(0,Math.min(1,estimate));
}
