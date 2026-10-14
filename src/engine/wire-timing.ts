/** B6: Certified single-shot Wireworld routing and timing.
 * Every conductor, HEAD and TAIL lives in the same canonical cellular grid.
 * No Boolean shortcut or special-case future step exists.
 */
import {stepWireworld} from './circuits';
import type {World} from './types';
import type {LogicPoint,WireLogicBit} from './wire-logic';

export type WireTimingKind='delay'|'lanes'|'train';
export interface WireTimingOptions{
 kind:WireTimingKind;
 radius:number; // 7..12
 offset:number; // extra conductor cells or pulse gap, 0..12; train >=3
 rotation:0|1|2|3;
 a:WireLogicBit;
 b:WireLogicBit;
}
export interface WireTimingLayout{
 conductors:LogicPoint[];
 heads:LogicPoint[];
 tails:LogicPoint[];
 inputs:LogicPoint[];
 outputs:LogicPoint[];
}
export interface WireTimingCase{
 a:WireLogicBit;
 b:WireLogicBit;
 actualTicks:number[][];
 expectedTicks:number[][];
 pass:boolean;
}
export interface WireTimingBench{
 kind:WireTimingKind;
 radius:number;
 offset:number;
 cases:WireTimingCase[];
 allPass:boolean;
 canonical:true;
}
export interface WireTimingStamp{
 touched:number[];
 outputs:LogicPoint[];
 inputs:LogicPoint[];
}
const isBit=(n:unknown):n is WireLogicBit=>n===0||n===1;
const rot=([x,y]:LogicPoint,k:0|1|2|3):LogicPoint=>
 k===1?[-y,x]:k===2?[-x,-y]:k===3?[y,-x]:[x,y];
const translated=([x,y]:LogicPoint,[ox,oy]:LogicPoint):LogicPoint=>[x+ox,y+oy];
function rail(out:LogicPoint[],y:number,start:number,end:number){
 for(let x=start;x<=end;x++)out.push([x,y]);
}
export function validTimingOptions(v:WireTimingOptions):boolean{
 return ['delay','lanes','train'].includes(v.kind)&&Number.isInteger(v.radius)&&
  v.radius>=7&&v.radius<=12&&Number.isInteger(v.offset)&&v.offset>=0&&
  v.offset<=12&&(v.kind!=='train'||v.offset>=3)&&
  [0,1,2,3].includes(v.rotation)&&isBit(v.a)&&isBit(v.b);
}
export function wireTimingLayout(opts:WireTimingOptions):WireTimingLayout{
 if(!validTimingOptions(opts))throw Error('Invalid canonical timing circuit');
 const {kind,radius:r,offset:d,rotation:k,a,b}=opts;
 const conductor:LogicPoint[]=[],heads:LogicPoint[]=[],tails:LogicPoint[]=[];
 const inputs:LogicPoint[]=[],outputs:LogicPoint[]=[];
 const pulse=(y:number,head:number,bit:WireLogicBit)=>{
  inputs.push([head,y]);
  if(bit){heads.push([head,y]);tails.push([head-1,y]);}
 };
 if(kind==='delay'){
  rail(conductor,0,-r-d,r);
  pulse(0,-r-d+1,a);
  outputs.push([r,0]);
 }else if(kind==='lanes'){
  // Two independent rails separated by TEN lattice cells, well outside
  // Moore-8 coupling. Extra physical wire extends lane B to the left.
  rail(conductor,-5,-r,r);
  rail(conductor,5,-r-d,r);
  pulse(-5,-r+1,a);
  pulse(5,-r-d+1,b);
  outputs.push([r,-5],[r,5]);
 }else{
  // A late + B early = two actual pulses separated by d real generations.
  // The branch has no external source and no synthetic frame delay.
  rail(conductor,0,-r-d,r);
  pulse(0,-r-d+1,a);
  pulse(0,-r+1,b);
  outputs.push([r,0]);
 }
 const seen=new Set<string>();
 const unique=conductor.filter(([x,y])=>{
  const id=x+','+y;if(seen.has(id))return false;seen.add(id);return true;
 });
 return {conductors:unique.map(p=>rot(p,k)),
  heads:heads.map(p=>rot(p,k)),tails:tails.map(p=>rot(p,k)),
  inputs:inputs.map(p=>rot(p,k)),outputs:outputs.map(p=>rot(p,k))};
}
export function expectedTimingTicks(kind:WireTimingKind,radius:number,offset:number,
 a:WireLogicBit,b:WireLogicBit):number[][]{
 const standard=2*radius-1,late=standard+offset;
 if(kind==='delay')return [a?[late]:[]];
 if(kind==='lanes')return [a?[standard]:[],b?[late]:[]];
 return [[...(b?[standard]:[]),...(a?[late]:[])].sort((x,y)=>x-y)];
}
/** Independently simulate the WHOLE grid, not a countdown masquerading
 * as an electron pulse. The expectedTicks formula merely asserts physics
 * and is never used to generate the observed actualTicks.
 */
export function runWireTimingBench(kind:WireTimingKind,radius:number,offset:number):WireTimingBench{
 const options={kind,radius,offset,rotation:0 as const,a:0 as const,b:0 as const};
 if(!validTimingOptions(options))throw Error('Invalid timing bench dimensions');
 const samples:WireLogicBit[][]=kind==='delay'?[[0,0],[1,0]]:
  [[0,0],[0,1],[1,0],[1,1]];
 const cases:WireTimingCase[]=[];
 const dim=2*(radius+offset)+22,center=Math.floor(dim/2);
 for(const [a,b] of samples){
  const layout=wireTimingLayout({...options,a,b});
  let cells:Uint8Array=new Uint8Array(dim*dim);
  const ix=([x,y]:LogicPoint)=>(y+center)*dim+x+center;
  for(const p of layout.conductors)cells[ix(p)]=1;
  for(const p of layout.heads)cells[ix(p)]=2;
  for(const p of layout.tails)cells[ix(p)]=3;
  const actualTicks=layout.outputs.map(()=>[] as number[]);
  const length=2*radius+offset+5;
  for(let tick=0;tick<length;tick++){
   for(let j=0;j<layout.outputs.length;j++)
    if(cells[ix(layout.outputs[j])]===2)actualTicks[j].push(tick);
   cells=stepWireworld(cells,dim,dim,false,1,2);
  }
  const expectedTicks=expectedTimingTicks(kind,radius,offset,a,b);
  cases.push({a,b,actualTicks,expectedTicks,
   pass:JSON.stringify(actualTicks)===JSON.stringify(expectedTicks)});
 }
 return {kind,radius,offset,cases,allPass:cases.every(c=>c.pass),canonical:true};
}
export function wireTimingFootprint(world:World,anchor:LogicPoint,
 opts:WireTimingOptions):number[]{
 if(world.engine!=='wireworld'||(world.lattice??'square')!=='square')
  throw Error('Routing laboratory requires square Wireworld');
 const layout=wireTimingLayout(opts),all=[...layout.conductors,...layout.heads,...layout.tails];
 const ids:number[]=[],seen=new Set<number>();
 for(const pt of all){
  const [x,y]=translated(pt,anchor);
  if(x<3||y<3||x>=world.width-3||y>=world.height-3)
   throw Error('Timing circuit would be clipped by artboard edge. Reduce radius/skew or move it.');
  const i=y*world.width+x;if(!seen.has(i)){seen.add(i);ids.push(i);}
 }
 return ids;
}
export function stampWireTiming(world:World,anchor:LogicPoint,
 opts:WireTimingOptions):WireTimingStamp{
 // Validate FULL geometry before modifying ANY cell.
 wireTimingFootprint(world,anchor,opts);
 const layout=wireTimingLayout(opts),w=world.width,h=world.height;
 const xs=layout.conductors.map(p=>p[0]),ys=layout.conductors.map(p=>p[1]);
 const xmin=Math.max(0,anchor[0]+Math.min(...xs)-2),xmax=Math.min(w-1,anchor[0]+Math.max(...xs)+2);
 const ymin=Math.max(0,anchor[1]+Math.min(...ys)-2),ymax=Math.min(h-1,anchor[1]+Math.max(...ys)+2);
 const touched:number[]=[];
 for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
  const i=y*w+x;world.cells[i]=0;touched.push(i);
 }
 for(const p of layout.conductors){
  const [x,y]=translated(p,anchor);world.cells[y*w+x]=1;
 }
 for(const p of layout.heads){
  const [x,y]=translated(p,anchor);world.cells[y*w+x]=2;
 }
 for(const p of layout.tails){
  const [x,y]=translated(p,anchor);world.cells[y*w+x]=3;
 }
 for(const i of touched){
  const state=world.cells[i];
  world.ages[i]=state?1:0;world.traces[i]=state?1:0;world.events[i]=0;
  if(world.fossils)world.fossils[i]=0;
  if(world.previousCells)world.previousCells[i]=state;
  if(world.olderCells)world.olderCells[i]=state;
 }
 return {touched,
  inputs:layout.inputs.map(p=>translated(p,anchor)),
  outputs:layout.outputs.map(p=>translated(p,anchor))};
}
