import type {EngineId,LatticeId,NeighborShape,SimSettings} from './types';
import {countStencil,validStencil} from './stencil';
export const EXTENDED_NEIGHBORHOODS=['square2','diamond2','directional','custom'] as const;
export const NEIGHBORHOOD_ENGINES:readonly EngineId[]=[
 'life','brians','cyclic','generations','excitable','species'];
export const DIRECTIONS=[
 {bit:0,dx:-1,dy:-1,label:'NW'},{bit:1,dx:0,dy:-1,label:'N'},
 {bit:2,dx:1,dy:-1,label:'NE'},{bit:7,dx:-1,dy:0,label:'W'},
 {bit:-1,dx:0,dy:0,label:'CELL'},{bit:3,dx:1,dy:0,label:'E'},
 {bit:6,dx:-1,dy:1,label:'SW'},{bit:5,dx:0,dy:1,label:'S'},
 {bit:4,dx:1,dy:1,label:'SE'}
] as const;
export function supportsNeighborhood(engine:EngineId,lattice:LatticeId){
 return lattice==='square'&&NEIGHBORHOOD_ENGINES.includes(engine);
}
export function maxNeighborCount(s:Pick<SimSettings,'engine'|'lattice'|'neighborShape'|'neighborMask'|'customStencilMask'|'customStencilSize'|'largeRadius'>):number{
 if(s.engine==='ising'||s.engine==='turmites'||s.engine==='hpp')return 4;
 if(s.engine==='hodgepodge')return 8;
 if(s.engine==='forestfire')return 4;
 if(s.engine==='wireworld')return 8;
 if(s.engine==='sandpile')return 4;
 if(s.engine==='wolfram')return 2;
 if(s.engine==='larger')return (2*s.largeRadius+1)**2-1;
 if(s.engine==='margolus')return 3;
 if(s.engine==='oriented')return 8;
 if(s.lattice==='rhombille')return 4;
 if(s.lattice==='hex')return 6;
 if(s.lattice==='triangle')return 3;
 switch(s.neighborShape){
  case 'vonNeumann':return 4;
  case 'square2':return 24;
  case 'diamond2':return 12;
  case 'directional':return bitCount(s.neighborMask??255);
  case 'custom':return countStencil(s.customStencilMask,s.customStencilSize);
  default:return 8;
 }
}
/** Constrain only the ACTIVE rule. Preserve other engines' saved options. */
export function normalizeActiveVotes(s:SimSettings):SimSettings{
 const cap=Math.max(1,maxNeighborCount(s));
 if(s.engine==='cyclic')return {...s,cyclicThreshold:Math.min(s.cyclicThreshold,cap)};
 if(s.engine==='excitable')return {...s,exciteThreshold:Math.min(s.exciteThreshold,cap)};
 if(s.engine==='species')return {...s,speciesBirth:Math.min(s.speciesBirth,cap),
  speciesSurvive:Math.min(s.speciesSurvive,cap),
  speciesAttackBias:Math.min(s.speciesAttackBias,cap)};
 return s;
}
export function bitCount(mask:number):number{
 let v=mask&255,count=0;
 while(v){v&=v-1;count++;}
 return count;
}
export function validNeighborhoodSettings(s:Pick<SimSettings,'engine'|'lattice'|'neighborShape'|'neighborMask'|'customStencilSize'|'customStencilMask'>):boolean{
 const legal=['moore','vonNeumann','square2','diamond2','directional','custom'];
 if(!legal.includes(s.neighborShape))return false;
 if(!Number.isInteger(s.neighborMask)||s.neighborMask<1||s.neighborMask>255)return false;
 if(!validStencil(s.customStencilMask,s.customStencilSize))return false;
 return !EXTENDED_NEIGHBORHOODS.includes(s.neighborShape as typeof EXTENDED_NEIGHBORHOODS[number])||
   supportsNeighborhood(s.engine,s.lattice);
}
export function neighborhoodLabel(s:SimSettings):string{
 return s.lattice==='rhombille'?'RHOMBILLE / FOUR SHARED DIAMOND EDGES':
 s.lattice==='hex'?'HEXAGON / SIX EDGES':
 s.lattice==='triangle'?'TRIANGLE / THREE EDGES':
 s.neighborShape==='square2'?'RADIUS-2 MOORE / 24':
 s.neighborShape==='diamond2'?'RADIUS-2 DIAMOND / 12':
 s.neighborShape==='directional'?'DIRECTIONAL / '+bitCount(s.neighborMask)+' SELECTED':
 s.neighborShape==='custom'?'HAND-PAINTED '+s.customStencilSize+'×'+s.customStencilSize+' / '+countStencil(s.customStencilMask,s.customStencilSize):
 s.neighborShape==='vonNeumann'?'VON NEUMANN / 4':'MOORE / 8';
}
