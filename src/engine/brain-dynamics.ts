/** Brian's Brain B1: optional real-state driving and generalized birth rule.
 *
 * Original autonomous Brian's Brain: 0 rests, 1 fires, 2 becomes refractory;
 * resting sites fire with EXACTLY TWO firing (state 1) neighbors.
 *
 * Opt-in "driven Brain" electrodes and seeded grouped sparks excite only
 * resting sites; never overwrite firing or refractory states. All events
 * are keyed to generation, seed and spatial address: replay has no RNG cursor.
 */
import {random01} from './reaction-worlds';
import {neighborOffsets} from './topology';
import type {SimSettings,World} from './types';

export type BrainStimulus='off'|'clock'|'sparks';
export type BrainSource='center'|'quad'|'ring';
export type BrainMatch='exact'|'atLeast';
export interface BrainParams {
 mode:BrainStimulus;
 source:BrainSource;
 rate:number;
 period:number;
 seed:number;
 generation:number;
}
export function validBrainParams(p:BrainParams):boolean{
 return ['off','clock','sparks'].includes(p.mode)&&
  ['center','quad','ring'].includes(p.source)&&
  Number.isFinite(p.rate)&&p.rate>=0&&p.rate<=.01&&
  Number.isInteger(p.period)&&p.period>=1&&p.period<=120&&
  Number.isInteger(p.generation)&&Number.isFinite(p.seed);
}
export function brainNaturalBirth(count:number,s:Pick<SimSettings,'brainBirthCount'|'brainBirthMatch'>):boolean{
 const threshold=s.brainBirthCount??2;
 return (s.brainBirthMatch??'exact')==='atLeast'?count>=threshold:count===threshold;
}
/** All electrode clusters are true 2×2 blocks, not decorative icons.
 * Centers of blocks are quantized to even-grid blocks to prevent duplicates.
 * Ring centers are sampled on an ellipse inside the world.
 */
export function brainElectrodeBlock(bx:number,by:number,w:number,h:number,source:BrainSource):boolean{
 const bw=Math.ceil(w/2),bh=Math.ceil(h/2);
 if(source==='center')return bx===Math.floor(bw/2)&&by===Math.floor(bh/2);
 if(source==='quad')
  return [Math.floor(bw/4),Math.floor(3*bw/4)].includes(bx)&&
    [Math.floor(bh/4),Math.floor(3*bh/4)].includes(by);
 const cx=(bw-1)/2,cy=(bh-1)/2;
 const rx=Math.max(1,Math.round(bw*.28)),ry=Math.max(1,Math.round(bh*.28));
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  if(bx===Math.round(cx+rx*Math.cos(a))&&
     by===Math.round(cy+ry*Math.sin(a)))return true;
 }
 return false;
}
/** Each 2×2 tile fires together on a clock or on a seeded stochastic impulse.
 * This spatially correlated stimulus is intentionally NOT the same as A2's
 * independent single-cell sparks. Spacing determines real brain propagation.
 */
export function brainStimulusAt(old:number,x:number,y:number,w:number,h:number,p:BrainParams):boolean{
 if(old!==0||p.mode==='off')return false;
 const bx=Math.floor(x/2),by=Math.floor(y/2);
 if(p.mode==='clock')return (p.generation+1)%p.period===0&&
    brainElectrodeBlock(bx,by,w,h,p.source);
 return p.rate>0&&random01(p.seed,p.generation,by*Math.ceil(w/2)+bx,97)<p.rate;
}
function cellAt(cells:Uint8Array,w:number,h:number,x:number,y:number,wrap:boolean):number{
 if(wrap){x=(x+w)%w;y=(y+h)%h;}
 else if(x<0||x>=w||y<0||y>=h)return 0;
 return cells[y*w+x];
}
/** Forecast natural births under the active Brain rule and graph.
 * No external sparks are predicted: those are reported after true generation.
 */
export function brainBirthForecast(world:World,s:SimSettings,limit=4096){
 const n=world.cells.length,stride=Math.max(1,Math.ceil(n/Math.max(1,limit)));
 let examined=0,resting=0,naturalBirths=0,firing=0;
 for(let p=0;p<n;p+=stride){
  examined++;
  const state=world.cells[p];if(state===1)firing++;
  if(state!==0)continue;
  resting++;
  const x=p%world.width,y=Math.floor(p/world.width);
  let count=0;
  for(const [dx,dy] of neighborOffsets(s.lattice,x,y,s.neighborShape,s.neighborMask,
    s.customStencilMask,s.customStencilSize))
   if(cellAt(world.cells,world.width,world.height,x+dx,y+dy,s.wrap)===1)count++;
  if(brainNaturalBirth(count,s))naturalBirths++;
 }
 return {examined,total:n,resting,naturalBirths,firing};
}
