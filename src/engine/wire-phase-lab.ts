/** B10: genuine mathematical phase distortion of a physical NAND→NOT cascade.
 * The only timing change is adding/removing WHOLE CONDUCTOR CELLS in two
 * upstream bias rails. Real electron heads propagate over the actual grid.
 * Original B9 cascade is exactly recovered when both shifts are zero.
 */
import {stepWireworld} from './circuits';
import {wireCascadeLayout,type WireCascadeOptions} from './wire-cascade';
import type {WireLogicBit,LogicPoint} from './wire-logic';
export interface WirePhaseTrace {
 a:WireLogicBit;b:WireLogicBit;
 nandTicks:number[];
 stage2Ticks:number[];
 biasNWTicks:number[];
 biasNETicks:number[];
 outputTicks:number[];
}
export interface WirePhaseBench {
 radius:number;
 outputLength:number;
 biasNWShift:number;
 biasNEShift:number;
 truth:string;
 /** True only when output contains exactly one HEAD for 11 and none otherwise. */
 observedAND:boolean;
 synchronized:boolean;
 rows:WirePhaseTrace[];
}
export interface WirePhaseScanRow {
 nwShift:number;
 neShift:number;
 truth:string;
 observedAND:boolean;
 final11Ticks:number[];
}
export function measureWirePhase(radius:number,outputLength:number,
 biasNWShift:number,biasNEShift:number):WirePhaseBench{
 const probe:WireCascadeOptions={radius,outputLength,rotation:0,a:0,b:0,
  biasNWShift,biasNEShift};
 // layout validation rejects non-integral shifts or out-of-range geometry.
 wireCascadeLayout(probe);
 const dim=2*(2*radius+Math.max(0,biasNWShift,biasNEShift)+12);
 const mid=Math.floor(dim/2);
 const index=([x,y]:LogicPoint)=>(y+mid)*dim+x+mid;
 const horizon=2*radius+outputLength+32; // full return-wave horizon
 const rows:WirePhaseTrace[]=[];
 for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]] as const){
  const layout=wireCascadeLayout({...probe,a,b});
  let cells:Uint8Array=new Uint8Array(dim*dim);
  for(const point of layout.conductors)cells[index(point)]=1;
  for(const point of layout.heads)cells[index(point)]=2;
  const nand=index(layout.stages.nandPort);
  const stage2=index(layout.stages.inverter);
  const nw=index(layout.stages.biasPorts[0]);
  const ne=index(layout.stages.biasPorts[1]);
  const output=index(layout.stages.output);
  const nandTicks:number[]=[],stage2Ticks:number[]=[],biasNWTicks:number[]=[],
   biasNETicks:number[]=[],outputTicks:number[]=[];
  for(let t=0;t<horizon;t++){
   if(cells[nand]===2)nandTicks.push(t);
   if(cells[stage2]===2)stage2Ticks.push(t);
   if(cells[nw]===2)biasNWTicks.push(t);
   if(cells[ne]===2)biasNETicks.push(t);
   if(cells[output]===2)outputTicks.push(t);
   cells=stepWireworld(cells,dim,dim,false,1,2);
  }
  rows.push({a,b,nandTicks,stage2Ticks,biasNWTicks,biasNETicks,outputTicks});
 }
 const truth=rows.map(row=>row.outputTicks.length?'1':'0').join('');
 const observedAND=rows.every(row=>{
  const expected=row.a&&row.b?[radius+2+outputLength]:[];
  return JSON.stringify(row.outputTicks)===JSON.stringify(expected);
 });
 return {radius,outputLength,biasNWShift,biasNEShift,truth,observedAND,
  synchronized:biasNWShift===0&&biasNEShift===0,rows};
}
export function sweepWirePhaseNW(radius:number,outputLength:number,
 biasNEShift:number):WirePhaseScanRow[]{
 if(!Number.isInteger(biasNEShift)||Math.abs(biasNEShift)>3)
  throw Error('Invalid independent east-bias phase');
 // Deliberately ON DEMAND; five full-input configurations of the actual
 // CA are expensive and should not recompute on every iPhone redraw.
 return [-2,-1,0,1,2].map(nwShift=>{
  const measured=measureWirePhase(radius,outputLength,nwShift,biasNEShift);
  return {nwShift,neShift:biasNEShift,truth:measured.truth,
   observedAND:measured.observedAND,
   final11Ticks:measured.rows[3].outputTicks};
 });
}
