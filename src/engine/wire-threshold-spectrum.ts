/** B8: Same physical conductor and initialized head geometry, different
 * mathematically valid 4-state Wireworld excitation intervals. A spectrum row
 * is a COMPLETE stepWireworld numerical simulation, never Boolean arithmetic.
 */
import {stepWireworld} from './circuits';
import {wireLogicLayout,runWireLogicBench,type WireLogicKind,type WireLogicBit} from './wire-logic';
export interface WireThresholdLaw {id:string;label:string;min:number;max:number;}
export const WIRE_THRESHOLD_LAWS:readonly WireThresholdLaw[]=[
 {id:'single',label:'EXACTLY 1',min:1,max:1},
 {id:'classic',label:'CLASSIC 1–2',min:1,max:2},
 {id:'surge',label:'SURGE 1–3',min:1,max:3},
 {id:'duet',label:'EXACTLY 2',min:2,max:2},
 {id:'saturation',label:'EXACTLY 3',min:3,max:3}
];
export interface WireThresholdRow {
 a:WireLogicBit;b:WireLogicBit;c:WireLogicBit;
 ticks:number[];
 head:boolean;
}
export interface WireThresholdVariant {
 law:WireThresholdLaw;
 rows:WireThresholdRow[];
 fingerprint:string;
}
export function runWireThresholdSpectrum(kind:WireLogicKind,radius:number):WireThresholdVariant[]{
 // Reuse the existing validated row set as input configurations only.
 // Observed output states below always come from NEW, independent simulations.
 const cases=runWireLogicBench(kind,radius).cases;
 const dim=2*radius+18,mid=Math.floor(dim/2);
 const at=(x:number,y:number)=>(mid+y)*dim+mid+x;
 return WIRE_THRESHOLD_LAWS.map(law=>{
  const rows:WireThresholdRow[]=cases.map(({a,b,c})=>{
   const geometry=wireLogicLayout({kind,radius,rotation:0,a,b,c});
   let cells:Uint8Array=new Uint8Array(dim*dim);
   for(const [x,y] of geometry.conductors)cells[at(x,y)]=1;
   for(const [x,y] of geometry.heads)cells[at(x,y)]=2;
   for(const [x,y] of geometry.tails)cells[at(x,y)]=3;
   const [x,y]=geometry.ports.outputs[0],port=at(x,y),ticks:number[]=[];
   for(let t=0;t<2*radius+18;t++){
    if(cells[port]===2)ticks.push(t);
    cells=stepWireworld(cells,dim,dim,false,law.min,law.max);
   }
   return {a,b,c,ticks,head:ticks.length>0};
  });
  return {law,rows,fingerprint:rows.map(row=>row.head?'1':'0').join('')};
 });
}
