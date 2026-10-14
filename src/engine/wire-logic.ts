/** B4: verifiable physical signal devices constructed from canonical Wireworld.
 * No per-cell exceptions, no fake gates, no state outside 0/1/2/3.
 * The Boolean values are encoded ONLY in initial head/tail pairs. All future
 * states come from the existing production stepWireworld() function.
 */
import {stepWireworld} from './circuits';
import type {World} from './types';
export type WireLogicKind='or'|'fanout'|'xor'|'nand'|'not';
export type WireLogicBit=0|1;
export type LogicPoint=readonly [number,number];
export interface WireLogicOptions {
 kind:WireLogicKind;
 radius:number;
 rotation:0|1|2|3;
 a:WireLogicBit;
 b:WireLogicBit;
}
export interface WireLogicPorts {
 inputA:LogicPoint;
 inputB?:LogicPoint;
 outputs:LogicPoint[];
}
export interface WireLogicLayout {
 conductors:LogicPoint[];
 heads:LogicPoint[];
 tails:LogicPoint[];
 ports:WireLogicPorts;
}
const rot=([x,y]:LogicPoint,k:0|1|2|3):LogicPoint=>
 k===1?[-y,x]:k===2?[-x,-y]:k===3?[y,-x]:[x,y];
const offset=([x,y]:LogicPoint,[dx,dy]:LogicPoint):LogicPoint=>[x+dx,y+dy];
function horizontal(y:number,from:number,to:number,pts:LogicPoint[]){
 for(let x=from;x<=to;x++)pts.push([x,y]);
}
function vertical(x:number,from:number,to:number,pts:LogicPoint[]){
 for(let y=from;y<=to;y++)pts.push([x,y]);
}
export function wireLogicLayout(opts:WireLogicOptions):WireLogicLayout{
 const {kind,radius:r,rotation:k,a,b}=opts;
 if(!['or','fanout','xor','nand','not'].includes(kind)||!Number.isInteger(r)||r<7||r>12||
    ![0,1,2,3].includes(k)||![0,1].includes(a)||![0,1].includes(b))
  throw Error('Invalid verified wire logic configuration');
 const conductors:LogicPoint[]=[];
 if(kind==='nand'||kind==='not'){
  // Canonical inhibition gates. A central conductor sees a permanently
  // initialized bias of 1 HEAD (NAND) or 2 HEADS (NOT). Optional input
  // HEAD contacts increase the Moore neighbor count. Exactly 1 or 2 heads
  // trigger; 3 suppress. The diagonal output starts two cells from ALL
  // emitter positions so heads cannot skip the central detector.
  for(let i=0;i<=r;i++)conductors.push([i,-i]);
  conductors.push([-1,0],[-1,1],[0,1]);
 }else if(kind==='xor'){
  // Certified XOR: two simultaneous contact heads per asserted Boolean bit.
  // The central conductor sees 2 neighboring HEADS for either input alone,
  // but 4 heads for A+B, suppressing ignition under the canonical 1..2 rule.
  // The first diagonally-outbound cell avoids direct emitter adjacency.
  for(let i=0;i<=r;i++)conductors.push([i,-i]);
  conductors.push([-1,0],[-1,1],[0,1],[1,1]);
 }else{
  horizontal(0,-r,r,conductors);
  if(kind==='or')vertical(0,0,r,conductors);
  else vertical(0,-r,0,conductors);
 }
 const seen=new Set<string>();
 const unique=conductors.filter(([x,y])=>{
  const key=x+','+y;if(seen.has(key))return false;seen.add(key);return true;
 });
 const heads:LogicPoint[]=[],tails:LogicPoint[]=[];
 const outputPoints:LogicPoint[]=(kind==='xor'||kind==='nand'||kind==='not')?[[r,-r]]:kind==='or'?[[r,0]]:[[r,0],[0,-r]];
 if(kind==='nand'||kind==='not'){
  heads.push([-1,0]); // NAND always has 1 real seed HEAD; NOT has 2.
  if(kind==='not')heads.push([-1,1]);
  if(a)heads.push(kind==='nand'?[-1,1]:[0,1]);
  if(kind==='nand'&&b)heads.push([0,1]);
 }else if(kind==='xor'){
  // Dual-contact pulse encoding: each asserted Boolean bit writes two real
  // electron HEAD states. No hidden Boolean exception in the CA stepper.
  if(a)heads.push([-1,0],[-1,1]);
  if(b)heads.push([0,1],[1,1]);
 }else{
  if(a){heads.push([-r+1,0]);tails.push([-r,0]);}
  if(kind==='or'&&b){heads.push([0,r-1]);tails.push([0,r]);}
 }
 return {
  conductors:unique.map(p=>rot(p,k)),
  heads:heads.map(p=>rot(p,k)),
  tails:tails.map(p=>rot(p,k)),
  ports:{
   inputA:rot(kind==='nand'?[-1,1]:kind==='not'?[0,1]:kind==='xor'?[-1,0]:[-r+1,0],k),
   ...((kind==='or'||kind==='xor'||kind==='nand')?
    {inputB:rot(kind==='xor'||kind==='nand'?[0,1]:[0,r-1],k)}:{}),
   outputs:outputPoints.map(p=>rot(p,k))
  }
 };
}
export interface LogicWave {
 a:WireLogicBit;
 b:WireLogicBit;
 hits:boolean[];
 firstTick:(number|null)[];
 waveforms:boolean[][];
 pass:boolean;
}
export interface LogicBench {
 kind:WireLogicKind;
 radius:number;
 canonical:true;
 cases:LogicWave[];
 allPass:boolean;
}
/** Full four-state simulation for every relevant Boolean input combination.
 * Each output is a real conductor port at the END of a wire. Nothing short-
 * circuits these outputs in JS. 40 generations are evaluated to capture
 * actual propagation; only presence of HEAD at a specified output is counted.
 */
export function runWireLogicBench(kind:WireLogicKind,radius:number):LogicBench{
 const cases:LogicWave[]=[];
 const choices:WireLogicBit[][]=(kind==='fanout'||kind==='not')?[[0,0],[1,0]]:[[0,0],[0,1],[1,0],[1,1]];
 for(const [a,b] of choices){
  const layout=wireLogicLayout({kind,radius,rotation:0,a,b});
  const dim=2*radius+18,center=Math.floor(dim/2);
  const index=([x,y]:LogicPoint)=>(center+y)*dim+center+x;
  let cells:Uint8Array=new Uint8Array(dim*dim);
  for(const pt of layout.conductors)cells[index(pt)]=1;
  for(const pt of layout.heads)cells[index(pt)]=2;
  for(const pt of layout.tails)cells[index(pt)]=3;
  const waveforms=layout.ports.outputs.map(()=>[] as boolean[]);
  const steps=2*radius+18;
  for(let tick=0;tick<steps;tick++){
   layout.ports.outputs.forEach((port,i)=>waveforms[i].push(cells[index(port)]===2));
   cells=stepWireworld(cells,dim,dim,false,1,2);
  }
  const firstTick=waveforms.map(w=>{const at=w.indexOf(true);return at<0?null:at;});
  const hits=firstTick.map(v=>v!==null);
  const expected=kind==='or'?Boolean(a||b):kind==='xor'?Boolean(a!==b):kind==='nand'?!(a&&b):kind==='not'?!a:Boolean(a);
  const pass=hits.every(v=>v===expected);
  cases.push({a,b,hits,firstTick,waveforms,pass});
 }
 return {kind,radius,canonical:true,cases,allPass:cases.every(c=>c.pass)};
}
export function wireLogicFootprint(world:World,anchor:LogicPoint,opts:WireLogicOptions):number[]{
 if(world.engine!=='wireworld'||world.lattice!=='square')throw Error('Verified logic requires square Wireworld');
 const layout=wireLogicLayout(opts),w=world.width,h=world.height;
 const pts=[...layout.conductors,...layout.heads,...layout.tails];
 const ids:number[]=[],seen=new Set<number>();
 for(const pt of pts){
  const [x,y]=offset(anchor,pt);
  // Refuse clipped logic devices: partial circuits have no valid truth table.
  if(x<3||y<3||x>=w-3||y>=h-3)
   throw Error('Device too close to the artboard edge. Pick a smaller radius or move inward.');
  const id=y*w+x;if(!seen.has(id)){seen.add(id);ids.push(id);}
 }
 return ids;
}
export interface WireLogicStamp {
 touched:number[];
 ports:WireLogicPorts;
}
export function stampWireLogic(world:World,anchor:LogicPoint,opts:WireLogicOptions):WireLogicStamp{
 wireLogicFootprint(world,anchor,opts);
 const layout=wireLogicLayout(opts);
 const w=world.width,h=world.height;
 const xx=layout.conductors.map(p=>p[0]),yy=layout.conductors.map(p=>p[1]);
 const x0=Math.max(0,anchor[0]+Math.min(...xx)-2),x1=Math.min(w-1,anchor[0]+Math.max(...xx)+2);
 const y0=Math.max(0,anchor[1]+Math.min(...yy)-2),y1=Math.min(h-1,anchor[1]+Math.max(...yy)+2);
 const touched:number[]=[];
 // Intentionally clear nearby pre-existing random circuitry to keep the
 // certified device isolated. This is an explicit geometry edit, not a step.
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const p=y*w+x;world.cells[p]=0;touched.push(p);
 }
 for(const pt of layout.conductors){const [x,y]=offset(anchor,pt);world.cells[y*w+x]=1;}
 for(const pt of layout.heads){const [x,y]=offset(anchor,pt);world.cells[y*w+x]=2;}
 for(const pt of layout.tails){const [x,y]=offset(anchor,pt);world.cells[y*w+x]=3;}
 for(const p of touched){
  const value=world.cells[p];
  world.ages[p]=value?1:0;world.traces[p]=value?1:0;world.events[p]=0;
  if(world.fossils)world.fossils[p]=0;
  if(world.previousCells)world.previousCells[p]=value;
  if(world.olderCells)world.olderCells[p]=value;
 }
 const ports:WireLogicPorts={
  inputA:offset(anchor,layout.ports.inputA),
  ...(layout.ports.inputB?{inputB:offset(anchor,layout.ports.inputB)}:{}),
  outputs:layout.ports.outputs.map(p=>offset(anchor,p))
 };
 return {touched,ports};
}
