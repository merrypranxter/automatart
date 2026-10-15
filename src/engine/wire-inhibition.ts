/** B7 exact canonical inhibition diagnostics. These measurements are taken
 * from a real four-state Wireworld simulation, never synthesized from bits.
 * Heads near the junction are counted using the same Moore neighborhood
 * that the actual production cell transition uses.
 */
import {stepWireworld} from './circuits';
import {wireLogicLayout,type WireLogicBit,type WireLogicKind} from './wire-logic';
type SuppressionKind=Extract<WireLogicKind,'nand'|'not'|'nor'|'nae'>;
export interface InhibitionTrace {
 kind:SuppressionKind;
 radius:number;
 a:WireLogicBit;
 b:WireLogicBit;
 c:WireLogicBit;
 neighborHeads:number[];
 junctionStates:number[];
 outputStates:number[];
 outputHeadTicks:number[];
 trueOutput:boolean;
 /** Expected algebraic bit is context, not used to drive the simulation. */
 expected:boolean;
 exact:boolean;
}
export function inspectWireInhibition(kind:SuppressionKind,radius:number,
 a:WireLogicBit,b:WireLogicBit,c:WireLogicBit=0):InhibitionTrace{
 if(!['nand','not','nor','nae'].includes(kind))throw Error('Only physically verified collision devices are supported');
 const layout=wireLogicLayout({kind,radius,rotation:0,a,b,c});
 const dim=2*radius+18,mid=Math.floor(dim/2);
 const at=(x:number,y:number)=>(mid+y)*dim+(mid+x);
 let cells:Uint8Array=new Uint8Array(dim*dim);
 for(const [x,y] of layout.conductors)cells[at(x,y)]=1;
 for(const [x,y] of layout.heads)cells[at(x,y)]=2;
 for(const [x,y] of layout.tails)cells[at(x,y)]=3;
 const neighborHeads:number[]=[],junctionStates:number[]=[],outputStates:number[]=[],outputHeadTicks:number[]=[];
 const output=layout.ports.outputs[0],outId=at(output[0],output[1]);
 for(let tick=0;tick<2*radius+18;tick++){
  let heads=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
   if((dx!==0||dy!==0)&&cells[at(dx,dy)]===2)heads++;
  neighborHeads.push(heads);
  junctionStates.push(cells[at(0,0)]);
  outputStates.push(cells[outId]);
  if(cells[outId]===2)outputHeadTicks.push(tick);
  cells=stepWireworld(cells,dim,dim,false,1,2);
 }
 const expected=kind==='nand'?!(a&&b):kind==='nor'?!(a||b):kind==='nae'?!(a===b&&b===c):!a;
 const exact=outputHeadTicks.length===(expected?1:0)&&
  (!expected||outputHeadTicks[0]===radius+1);
 return {kind,radius,a,b,c,neighborHeads,junctionStates,outputStates,outputHeadTicks,
  trueOutput:outputHeadTicks.length>0,expected,exact};
}
