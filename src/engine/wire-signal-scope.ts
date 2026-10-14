/** B5: exact finite-horizon electrical scope for *real* artwork states.
 * No alternate display physics. Step the production engine on a private
 * deep clone; the live canvas and recording timeline are never touched.
 */
import {stepWorld} from './sim';
import {cloneWorld} from './capture';
import type {SimSettings,World} from './types';
export interface WireSignalProbe {
 label:string;
 x:number;
 y:number;
}
export interface WireSignalTrace {
 label:string;
 x:number;
 y:number;
 states:number[];
 headTicks:number[];
 firstHead:number|null;
}
export interface WireSignalForecast{
 fromGeneration:number;
 horizon:number;
 traces:WireSignalTrace[];
 driven:boolean;
}
export function forecastWireSignals(world:World,settings:SimSettings,
 probes:readonly WireSignalProbe[],horizon:number):WireSignalForecast{
 if(world.engine!=='wireworld'||settings.engine!=='wireworld')
  throw Error('Electrical scope requires Wireworld');
 if(!Number.isInteger(horizon)||horizon<1||horizon>64)
  throw Error('Probe horizon must be 1 to 64 generations');
 if(probes.length<1||probes.length>4)
  throw Error('Select between one and four output probes');
 for(const p of probes){
  if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||
   p.x>=world.width||p.y>=world.height||typeof p.label!=='string'||p.label.length>100)
   throw Error('Invalid real-world cell probe');
 }
 const isolated=cloneWorld(world);
 const traces=probes.map(p=>({...p,states:[] as number[],headTicks:[] as number[],
  firstHead:null as number|null}));
 let copy=isolated;
 for(let tick=0;tick<horizon;tick++){
  for(const trace of traces){
   const v=copy.cells[trace.y*copy.width+trace.x];
   trace.states.push(v);
   if(v===2){
    trace.headTicks.push(tick);
    if(trace.firstHead===null)trace.firstHead=tick;
   }
  }
  copy=stepWorld(copy,settings);
 }
 return {fromGeneration:world.generation,horizon,traces,
  driven:settings.wireDrive!=='off'};
}
