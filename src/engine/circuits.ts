/** C1 real discrete engines. No rendering shortcuts feed back into their rules.
 * Wireworld: states 0 empty, 1 conductor, 2 head, 3 tail.
 * Sandpile: canonical unsigned 32-bit integer grains; Uint8 cells are display ONLY. */
export const WIRE_EMPTY=0, WIRE_CONDUCTOR=1, WIRE_HEAD=2, WIRE_TAIL=3;
export type SandSource='center'|'random';
export interface SandResult{
 grains:Uint32Array;
 /** Number of one-grain topplings per cell during this displayed generation. */
 topplings:Uint8Array;
 added:number;
 lost:number;
}
const CARDINAL_OFFSETS:readonly (readonly [number,number])[]=[[-1,0],[1,0],[0,-1],[0,1]];
function idx(x:number,y:number,w:number,h:number,wrap:boolean):number{
 if(wrap)return ((y+h)%h)*w+(x+w)%w;
 return x<0||x>=w||y<0||y>=h?-1:y*w+x;
}
export function stepWireworld(cells:Uint8Array,w:number,h:number,wrap:boolean):Uint8Array{
 if(cells.length!==w*h)throw Error('Wireworld cell dimensions disagree');
 const next=new Uint8Array(cells.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,state=cells[p];
  if(state===WIRE_EMPTY)continue;
  if(state===WIRE_HEAD){next[p]=WIRE_TAIL;continue;}
  if(state===WIRE_TAIL){next[p]=WIRE_CONDUCTOR;continue;}
  if(state!==WIRE_CONDUCTOR)throw Error('Wireworld state must be 0..3');
  let heads=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;
   const q=idx(x+dx,y+dy,w,h,wrap);
   if(q>=0&&cells[q]===WIRE_HEAD)heads++;
  }
  next[p]=heads===1||heads===2?WIRE_HEAD:WIRE_CONDUCTOR;
 }
 return next;
}
/** Deterministic per-generation random feeder independent of call ordering. */
export function sandFeedIndex(seed:number,generation:number,w:number,h:number):number{
 let a=(seed^Math.imul(generation+1,0x9e3779b1))>>>0;
 a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;
 a=Math.imul(a,0x846ca68b);a^=a>>>16;
 return (a>>>0)%(w*h);
}
/** One displayed generation = grain injection, then 1..8 parallel rounds.
 * Each unstable site topples ONCE per round; simultaneous neighbors use the
 * old round's heights. Finite borders dissipate; periodic borders conserve.
 * With no feeder, finite grids stabilize to the canonical Abelian result,
 * though intermediate parallel states differ from serial toppling.
 */
export function stepSandpile(
 source:Uint32Array,w:number,h:number,wrap:boolean,
 feed:number,rounds:number,seed:number,generation:number,
 sourceMode:SandSource
):SandResult{
 if(source.length!==w*h)throw Error('Sandpile grain dimensions disagree');
 if(!Number.isInteger(feed)||feed<0||feed>64||
    !Number.isInteger(rounds)||rounds<1||rounds>8)throw Error('Invalid sandpile controls');
 let state=source.slice();
 const topplings=new Uint8Array(source.length);
 let lost=0;
 if(feed){
  const at=sourceMode==='center'?Math.floor(h/2)*w+Math.floor(w/2):
   sandFeedIndex(seed,generation,w,h);
  if(state[at]>0xffffffff-feed)throw Error('Sandpile grain count overflow');
  state[at]+=feed;
 }
 for(let pass=0;pass<rounds;pass++){
  const next=state.slice();
  const active:number[]=[];
  // Phase 1: all unstable sites decrement from the SAME old snapshot.
  // Phase 2: distribute their grains. This avoids false overflow errors
  // when a maximum-height site also topples during this round.
  for(let p=0;p<state.length;p++){
   if(state[p]<4)continue;
   next[p]-=4;topplings[p]++;active.push(p);
  }
  if(!active.length)break;
  for(const p of active){
   const x=p%w,y=Math.floor(p/w);
   for(const [dx,dy] of CARDINAL_OFFSETS){
    const q=idx(x+dx,y+dy,w,h,wrap);
    if(q<0){lost++;continue;}
    if(next[q]===0xffffffff)throw Error('Sandpile grain count overflow');
    next[q]++;
   }
  }
  state=next;
 }
 return {grains:state,topplings,added:feed,lost};
}
export function sandVisualState(grain:number):number{
 return Math.min(255,grain);
}
export function grainSum(grains:Uint32Array):number{
 let total=0;
 for(const grain of grains)total+=grain;
 return total;
}
