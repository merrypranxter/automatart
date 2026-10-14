/** B2: bijective 2x2 Margolus block maps with reversible rule epochs.
 * Corner order is A=top-left, B=top-right, C=bottom-right, D=bottom-left.
 * Four bits encode one block, ALL 16 states map one-to-one per rule.
 * No probability, postprocessing, or approximate inverse exists here.
 */
import type {SimSettings} from './types';

export const MARGOLUS_RULES=[
 {id:'cw',label:'CLOCKWISE VORTEX',hint:'Original four-corner clockwise rotation. Perfect legacy parity.'},
 {id:'ccw',label:'COUNTERCLOCKWISE',hint:'Reverse the rotation direction while retaining staggered 2×2 tiling.'},
 {id:'half',label:'HALF-TURN',hint:'180-degree swaps across each block; exact self-inverse.'},
 {id:'mirrorH',label:'MIRROR HORIZON',hint:'Left and right corners exchange in each block.'},
 {id:'mirrorV',label:'MIRROR VERTICAL',hint:'Upper and lower corners exchange in each block.'},
 {id:'diagonal',label:'DIAGONAL REFLECTION',hint:'Reflect each block across its northwest-to-southeast diagonal.'},
 {id:'collision',label:'PAIR COLLIDER',hint:'Swap adjacent pairs with their opposite pairs; empty and diagonal pairs remain.'},
 {id:'opposite',label:'OPPOSITE EXCHANGE',hint:'Swap diagonal two-particle pairs, leaving other arrangements untouched.'},
 {id:'vortex',label:'POPULATION VORTEX',hint:'Single sites go clockwise, 2-particle states turn half, triple states go backward.'},
 {id:'braid',label:'PARITY BRAID',hint:'Odd-occupied blocks turn clockwise; even-occupied blocks turn counterclockwise.'}
] as const;
export type MargolusRule=typeof MARGOLUS_RULES[number]['id'];
export type MargolusMode='single'|'alternate';
export interface MargolusEpoch {
 /** First GENERATION transition governed by this combination. */
 start:number;
 mode:MargolusMode;
 a:MargolusRule;
 b:MargolusRule;
 period:number;
}
const ids=MARGOLUS_RULES.map(x=>x.id);
export function validMargolusRule(value:unknown):value is MargolusRule{
 return typeof value==='string'&&ids.some(x=>x===value);
}
const popcount=(m:number)=>{let n=0;while(m){n+=m&1;m>>=1;}return n;};
const rotation=(m:number,steps:number)=>{
 let out=0;
 for(let i=0;i<4;i++)if(m&(1<<i))out|=1<<((i+steps)%4);
 return out;
};
const relabel=(m:number,origin:readonly number[])=>
 origin.reduce((out,src,dst)=>out|(((m>>src)&1)<<dst),0);
function imageFor(rule:MargolusRule,m:number):number{
 switch(rule){
  case 'cw':return rotation(m,1);
  case 'ccw':return rotation(m,3);
  case 'half':return rotation(m,2);
  case 'mirrorH':return relabel(m,[1,0,3,2]);
  case 'mirrorV':return relabel(m,[3,2,1,0]);
  case 'diagonal':return relabel(m,[0,3,2,1]);
  case 'collision':return m===3?12:m===12?3:m===6?9:m===9?6:m;
  case 'opposite':return m===5?10:m===10?5:m;
  case 'vortex':{
   const n=popcount(m);
   return rotation(m,n===1?1:n===2?2:n===3?3:0);
  }
  case 'braid':return rotation(m,popcount(m)%2===1?1:3);
 }
}
interface Tables{forward:Uint8Array;inverse:Uint8Array}
const TABLES=Object.fromEntries(MARGOLUS_RULES.map(rule=>{
 const forward=Uint8Array.from({length:16},(_,m)=>imageFor(rule.id,m));
 const inverse=new Uint8Array(16),seen=new Set<number>();
 for(let i=0;i<16;i++){
  const target=forward[i];
  if(target>15||seen.has(target)||popcount(target)!==popcount(i))
   throw new Error('Non-bijective or non-conserving Margolus rule: '+rule.id);
  seen.add(target);inverse[target]=i;
 }
 return [rule.id,{forward,inverse}];
})) as Record<MargolusRule,Tables>;
export function marginalTable(rule:MargolusRule,reverse=false):Uint8Array{
 return (reverse?TABLES[rule].inverse:TABLES[rule].forward).slice();
}
export function applyMargolusMap(cells:Uint8Array,w:number,h:number,phase:0|1,rule:MargolusRule,reverse=false):Uint8Array{
 if(w%2||h%2||w<2||h<2)throw new Error('Reversible Margolus requires even square-lattice dimensions');
 if(!TABLES[rule])throw new Error('Unknown reversible block map');
 const out=cells.slice(),table=reverse?TABLES[rule].inverse:TABLES[rule].forward;
 for(let by=0;by<h;by+=2)for(let bx=0;bx<w;bx+=2){
  const x=(bx+phase)%w,y=(by+phase)%h,x1=(x+1)%w,y1=(y+1)%h;
  const a=y*w+x,b=y*w+x1,c=y1*w+x1,d=y1*w+x;
  const mask=(cells[a]&1)|((cells[b]&1)<<1)|((cells[c]&1)<<2)|((cells[d]&1)<<3);
  const value=table[mask];
  out[a]=value&1;out[b]=(value>>1)&1;out[c]=(value>>2)&1;out[d]=(value>>3)&1;
 }
 return out;
}
export const LEGACY_MARGOLUS:Omit<MargolusEpoch,'start'>={
 mode:'single',a:'cw',b:'cw',period:1
};
export function margolusSpec(s:Pick<SimSettings,'margolusMode'|'margolusRuleA'|'margolusRuleB'|'margolusPeriod'>):Omit<MargolusEpoch,'start'>{
 return {mode:s.margolusMode??'single',a:s.margolusRuleA??'cw',b:s.margolusRuleB??'ccw',period:s.margolusPeriod??4};
}
export function validMargolusEpochs(value:unknown,generation:number):MargolusEpoch[]{
 // Legacy snapshots have no history: until this feature they ONLY used CW.
 if(value===undefined)return generation>0?[{start:0,...LEGACY_MARGOLUS}]:[];
 if(!Array.isArray(value)||value.length>8192)throw new Error('Invalid reversible rule history');
 if(generation>0&&value.length===0)throw new Error('Missing reversible history for evolved world');
 if(generation===0&&value.length>0)throw new Error('Reversible history past initial world');
 let previous=-1;
 return value.map(item=>{
  if(!item||!Number.isSafeInteger(item.start)||item.start<=previous||
    item.start<0||item.start>=generation||
    !['single','alternate'].includes(item.mode)||
    !validMargolusRule(item.a)||!validMargolusRule(item.b)||
    !Number.isInteger(item.period)||item.period<1||item.period>120)
   throw new Error('Invalid reversible rule-history epoch');
  if(previous===-1&&item.start!==0)throw new Error('Reversible history must start at generation 0');
  previous=item.start;
  return {start:item.start,mode:item.mode,a:item.a,b:item.b,period:item.period};
 });
}
function equalSpec(a:Omit<MargolusEpoch,'start'>,b:Omit<MargolusEpoch,'start'>):boolean{
 return a.mode===b.mode&&a.a===b.a&&a.b===b.b&&a.period===b.period;
}
export function recordMargolusEpoch(
 existing:MargolusEpoch[]|undefined,generation:number,s:SimSettings):MargolusEpoch[]{
 const history=existing??validMargolusEpochs(undefined,generation);
 const spec=margolusSpec(s),last=history[history.length-1];
 if(last&&equalSpec(last,spec))return history;
 return [...history,{start:generation,...spec}];
}
/** Epoch-relative clock permits live A/B edits, all of which are recorded. */
export function activeMargolusRule(epoch:MargolusEpoch,generation:number):MargolusRule{
 return epoch.mode==='alternate'&&Math.floor((generation-epoch.start)/epoch.period)%2===1?
  epoch.b:epoch.a;
}
export function lastEpochFor(history:MargolusEpoch[]|undefined,generation:number):MargolusEpoch{
 const h=history??validMargolusEpochs(undefined,generation+1);
 for(let i=h.length-1;i>=0;i--)if(h[i].start<=generation)return h[i];
 return {start:0,...LEGACY_MARGOLUS};
}
