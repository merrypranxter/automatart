/** B11: actual four-state Wireworld reverse-wave microscope and calibrated
 * returning-electron collision shield. This is a SINGLE-SHOT experimental
 * specimen, not a diode; guard rails may create new early HEAD events.
 */
import {stepWireworld} from './circuits';
import {wireCascadeLayout,type WireCascadeOptions} from './wire-cascade';
import type {LogicPoint,WireLogicBit} from './wire-logic';
export interface WireFeedbackRow{
 a:WireLogicBit;b:WireLogicBit;
 nandPort:number[];
 upstreamOne:number[];
 upstreamTwo:number[];
 detector:number[];
 output:number[];
 guards:number[][];
 /** TRUE only when this input's remote port matches B9's complete waveform. */
 andCorrect:boolean;
}
export interface WireFeedbackBench{
 enabled:boolean;westShift:number;diagonalShift:number;outputLength:number;
 rows:WireFeedbackRow[];
 truth:string;
 preservesAND:boolean;
 blocksKnownReturn:boolean;
 classified:'baseline'|'return-blocked'|'logic-broken'|'reverse-still-visible';
}
export function measureWireFeedback(outputLength:number,enabled:boolean,
 westShift=0,diagonalShift=0):WireFeedbackBench{
 const radius=9;
 const base:WireCascadeOptions={radius,outputLength,rotation:0,
  a:0,b:0,feedbackShield:enabled,guardWestShift:westShift,
  guardDiagonalShift:diagonalShift};
 wireCascadeLayout(base); // validate the whole physical geometry
 const dim=100,mid=dim/2;
 const index=([x,y]:LogicPoint)=>(mid+y)*dim+(mid+x);
 const rows:WireFeedbackRow[]=[];
 const horizon=2*radius+outputLength+32;
 for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]] as const){
  const geo=wireCascadeLayout({...base,a,b});
  let cells:Uint8Array=new Uint8Array(dim*dim);
  for(const p of geo.conductors)cells[index(p)]=1;
  for(const p of geo.heads)cells[index(p)]=2;
  const where=[
   geo.stages.nandPort,
   [radius-1,-radius+1] as LogicPoint,
   [radius-2,-radius+2] as LogicPoint,
   geo.stages.inverter,
   geo.stages.output,
   ...(geo.stages.guardPorts??[])
  ].map(index);
  const readings=where.map(()=>[] as number[]);
  for(let tick=0;tick<horizon;tick++){
   where.forEach((site,i)=>{if(cells[site]===2)readings[i].push(tick);});
   cells=stepWireworld(cells,dim,dim,false,1,2);
  }
  const expected=a&&b?[radius+2+outputLength]:[];
  rows.push({a,b,nandPort:readings[0],upstreamOne:readings[1],
   upstreamTwo:readings[2],detector:readings[3],output:readings[4],
   guards:readings.slice(5),
   andCorrect:JSON.stringify(readings[4])===JSON.stringify(expected)});
 }
 const preservesAND=rows.every(row=>row.andCorrect);
 // Probe the RETURN after it ought to have appeared at t=r+3=12.
 // Gate calibration additionally ensures forward NAND arrives at t=10
 // for every other input, and the actual two-stage output is still AND.
 const blocksKnownReturn=enabled&&preservesAND&&
  // The calibrated shield makes the NAND port COMPLETELY silent for 11;
  // a premature unintended HEAD is not allowed to earn certification.
  rows[3].nandPort.length===0&&
  rows.slice(0,3).every(row=>JSON.stringify(row.nandPort)==='[10]');
 return {enabled,westShift,diagonalShift,outputLength,rows,
  truth:rows.map(row=>row.output.length?'1':'0').join(''),
  preservesAND,blocksKnownReturn,
  classified:!enabled?'baseline':!preservesAND?'logic-broken':
   blocksKnownReturn?'return-blocked':'reverse-still-visible'};
}
export interface WireFeedbackScanRow{
 westShift:number;diagonalShift:number;
 truth:string;preservesAND:boolean;blocksKnownReturn:boolean;
 returnTicks:number[];finalTicks:number[];
}
export function sweepWireFeedback(outputLength:number,westShift:number):WireFeedbackScanRow[]{
 if(!Number.isInteger(westShift)||Math.abs(westShift)>1)
  throw Error('Guard pulse adjustment outside supported lattice range');
 return [-1,0,1].map(diagonalShift=>{
  const result=measureWireFeedback(outputLength,true,westShift,diagonalShift);
  return {westShift,diagonalShift,truth:result.truth,
   preservesAND:result.preservesAND,blocksKnownReturn:result.blocksKnownReturn,
   returnTicks:result.rows[3].nandPort,
   finalTicks:result.rows[3].output};
 });
}
