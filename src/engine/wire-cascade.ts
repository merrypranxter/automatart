/** B9 — First genuinely cascaded two-stage Wireworld Boolean computation.
 * NAND's ACTUAL traveling HEAD collides with two independently traveling
 * time-aligned bias HEADS at a second detector. No state exemptions, Boolean
 * injections, JS gate evaluation, or hidden time shifts are used to evolve it.
 *
 * Source stage: local NAND at (0,0). Traveling output: (i,-i), i=0..r.
 * Second detector: (r+1,-r-1). Its upstream SW neighbor receives NAND HEAD
 * at generation r+1. Bias NW and NE arms, each r+1 real cells from its
 * initial HEAD, reach their detector neighbors at exactly the SAME tick.
 * The second detector ignites at r+2 iff NAND had no arriving HEAD (A=B=1).
 * Its outgoing SE rail yields an actual AND output HEAD at r+2+d.
 */
import {stepWireworld} from './circuits';
import type {World} from './types';
import type {LogicPoint,WireLogicBit} from './wire-logic';

export interface WireCascadeOptions {
 radius:number; // first-stage propagation: 7..12
 outputLength:number; // second-stage output: 5..12
 rotation:0|1|2|3;
 a:WireLogicBit;
 b:WireLogicBit;
}
export interface WireCascadeLayout {
 conductors:LogicPoint[];
 heads:LogicPoint[];
 stages:{nand:LogicPoint; nandPort:LogicPoint; inverter:LogicPoint; biasPorts:LogicPoint[]; output:LogicPoint};
}
export interface WireCascadeCase {
 a:WireLogicBit;b:WireLogicBit;
 nandTicks:number[];secondStageTicks:number[];biasTicks:number[][];outputTicks:number[];
 expectedOutputTicks:number[];
 pass:boolean;
}
export interface WireCascadeBench {
 radius:number;outputLength:number;canonical:true;
 cases:WireCascadeCase[];allPass:boolean;
}
export interface WireCascadeStamp {
 touched:number[];
 ports:{nand:LogicPoint;inverter:LogicPoint;biases:LogicPoint[];output:LogicPoint};
}
const r90=([x,y]:LogicPoint,k:0|1|2|3):LogicPoint=>
 k===1?[-y,x]:k===2?[-x,-y]:k===3?[y,-x]:[x,y];
const translate=([x,y]:LogicPoint,[dx,dy]:LogicPoint):LogicPoint=>[x+dx,y+dy];
export const validWireCascade=(v:WireCascadeOptions):boolean=>
 Number.isInteger(v.radius)&&v.radius>=7&&v.radius<=12&&
 Number.isInteger(v.outputLength)&&v.outputLength>=5&&v.outputLength<=12&&
 [0,1,2,3].includes(v.rotation)&&
 (v.a===0||v.a===1)&&(v.b===0||v.b===1);

export function wireCascadeLayout(v:WireCascadeOptions):WireCascadeLayout{
 if(!validWireCascade(v))throw Error('Invalid certified two-stage AND circuit');
 const {radius:r,outputLength:d,rotation:k,a,b}=v;
 const wires:LogicPoint[]=[],heads:LogicPoint[]=[];
 // Stage one — NAND. Off contacts are actually VOID, not parasitic stubs.
 for(let i=0;i<=r;i++)wires.push([i,-i]);
 wires.push([-1,0]);
 heads.push([-1,0]);
 if(a){wires.push([-1,1]);heads.push([-1,1]);}
 if(b){wires.push([0,1]);heads.push([0,1]);}
 // The second stage is downstream of a REAL traveling NAND pulse.
 const j:LogicPoint=[r+1,-r-1];
 wires.push(j);
 const biasPorts:LogicPoint[]=[];
 for(const slope of [-1,1]){
  const endpoint:LogicPoint=[j[0]+slope,j[1]-1];
  biasPorts.push(endpoint);
  for(let i=0;i<=r+1;i++){
   const point:LogicPoint=[endpoint[0]+slope*i,endpoint[1]-i];
   wires.push(point);
   if(i===r+1)heads.push(point); // physically travels r+1 actual steps
  }
 }
 // The outgoing SE rail is not adjacent to any of the THREE incoming
 // detector HEAD sites, so no emitter can bypass the second computation.
 for(let i=1;i<=d;i++)wires.push([j[0]+i,j[1]+i]);
 const seen=new Set<string>();
 const conductors=wires.filter(([x,y])=>{
  const id=x+','+y;if(seen.has(id))return false;seen.add(id);return true;
 }).map(point=>r90(point,k));
 return {
  conductors,heads:heads.map(p=>r90(p,k)),
  stages:{
   nand:r90([0,0],k),
   nandPort:r90([r,-r],k),
   inverter:r90(j,k),
   biasPorts:biasPorts.map(p=>r90(p,k)),
   output:r90([j[0]+d,j[1]+d],k)
  }
 };
}
export function runWireCascadeBench(radius:number,outputLength:number):WireCascadeBench{
 const base={radius,outputLength,rotation:0 as const,a:0 as const,b:0 as const};
 if(!validWireCascade(base))throw Error('Invalid cascade bench dimensions');
 const dimension=4*(radius+outputLength)+34,mid=Math.floor(dimension/2);
 const index=([x,y]:LogicPoint)=>(mid+y)*dimension+mid+x;
 const cases:WireCascadeCase[]=[];
 for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]] as const){
  const layout=wireCascadeLayout({...base,a,b});
  let cells:Uint8Array=new Uint8Array(dimension*dimension);
  for(const point of layout.conductors)cells[index(point)]=1;
  for(const point of layout.heads)cells[index(point)]=2;
  const nandTicks:number[]=[],secondStageTicks:number[]=[],outputTicks:number[]=[];
  const biasTicks=layout.stages.biasPorts.map(()=>[] as number[]);
  const ticks=2*radius+outputLength+32; // test after expected output
  for(let tick=0;tick<ticks;tick++){
   if(cells[index(layout.stages.nandPort)]===2)nandTicks.push(tick);
   if(cells[index(layout.stages.inverter)]===2)secondStageTicks.push(tick);
   if(cells[index(layout.stages.output)]===2)outputTicks.push(tick);
   layout.stages.biasPorts.forEach((port,i)=>{
    if(cells[index(port)]===2)biasTicks[i].push(tick);
   });
   cells=stepWireworld(cells,dimension,dimension,false,1,2);
  }
  const expectedOutputTicks=a===1&&b===1?[radius+2+outputLength]:[];
  const pass=
   JSON.stringify(nandTicks)===(a&&b?'[]':'['+(radius+1)+']')&&
   JSON.stringify(biasTicks)==='[['+(radius+1)+'],['+(radius+1)+']]'&&
   JSON.stringify(secondStageTicks)===(a&&b?'['+(radius+2)+']':'[]')&&
   JSON.stringify(outputTicks)===JSON.stringify(expectedOutputTicks);
  cases.push({a,b,nandTicks,secondStageTicks,biasTicks,outputTicks,expectedOutputTicks,pass});
 }
 return {radius,outputLength,canonical:true,cases,allPass:cases.every(row=>row.pass)};
}
export function wireCascadeFootprint(world:World,anchor:LogicPoint,v:WireCascadeOptions):number[]{
 if(world.engine!=='wireworld'||world.lattice!=='square')
  throw Error('True cascaded logic requires square-lattice Wireworld');
 const shape=wireCascadeLayout(v);
 const ids:number[]=[],seen=new Set<number>();
 for(const point of [...shape.conductors,...shape.heads]){
  const [x,y]=translate(point,anchor);
  if(x<3||y<3||x>=world.width-3||y>=world.height-3)
   throw Error('Cascade clipped by artboard edge. Choose smaller paths or a larger world.');
  const id=y*world.width+x;
  if(!seen.has(id)){seen.add(id);ids.push(id);}
 }
 return ids;
}
export function stampWireCascade(world:World,anchor:LogicPoint,v:WireCascadeOptions):WireCascadeStamp{
 // Complete preflight before ANY destructive edit.
 wireCascadeFootprint(world,anchor,v);
 const shape=wireCascadeLayout(v),w=world.width,h=world.height;
 const xs=shape.conductors.map(p=>p[0]),ys=shape.conductors.map(p=>p[1]);
 const x0=Math.max(0,anchor[0]+Math.min(...xs)-2),x1=Math.min(w-1,anchor[0]+Math.max(...xs)+2);
 const y0=Math.max(0,anchor[1]+Math.min(...ys)-2),y1=Math.min(h-1,anchor[1]+Math.max(...ys)+2);
 const touched:number[]=[];
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const id=y*w+x;world.cells[id]=0;touched.push(id);
 }
 for(const p of shape.conductors){
  const [x,y]=translate(p,anchor);world.cells[y*w+x]=1;
 }
 for(const p of shape.heads){
  const [x,y]=translate(p,anchor);world.cells[y*w+x]=2;
 }
 for(const id of touched){
  const s=world.cells[id];
  world.ages[id]=s?1:0;world.traces[id]=s?1:0;world.events[id]=0;
  if(world.fossils)world.fossils[id]=0;
  if(world.previousCells)world.previousCells[id]=s;
  if(world.olderCells)world.olderCells[id]=s;
 }
 return {touched,ports:{
  nand:translate(shape.stages.nandPort,anchor),
  inverter:translate(shape.stages.inverter,anchor),
  biases:shape.stages.biasPorts.map(p=>translate(p,anchor)),
  output:translate(shape.stages.output,anchor)
 }};
}
