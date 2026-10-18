/** F6I: graph-coupled circular pigment phases, VISUAL ONLY.
 * Uses physical neighbors, not packed-index proximity. Instantaneous
 * bounded Jacobi phase relaxation, not time-integrated Kuramoto dynamics.
 */
import type {World} from './types';
import {physicalGraph} from './physical-graph';
import {neighborOffsets} from './topology';

export type MicroPhaseMode='off'|'attract'|'repel';
export const MICRO_PHASE_MODES:readonly MicroPhaseMode[]=['off','attract','repel'];
export const validateMicroPhaseMode=(v:unknown):MicroPhaseMode=>
 MICRO_PHASE_MODES.includes(v as MicroPhaseMode)?v as MicroPhaseMode:'off';
const TAU=2*Math.PI;
const finite=(x:number,fallback:number)=>Number.isFinite(x)?x:fallback;
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const wrap=(x:number,n:number)=>((x%n)+n)%n;

export interface MicroPhaseAdjacency{
 readonly starts:Uint32Array;
 readonly edges:Uint32Array;
 readonly centerX:Float64Array;
 readonly centerY:Float64Array;
 readonly extentX:number;
 readonly extentY:number;
}
/** Irregular Penrose/Voronoi use exact physical full-shared-edge graph.
 * Other tilings use the established legal neighbor stencil.
 */
const regularCache=new Map<string,MicroPhaseAdjacency>();
export function microPhaseAdjacency(world:World):MicroPhaseAdjacency{
 const lattice=world.lattice??'square',w=world.width,h=world.height,n=w*h;
 const graph=physicalGraph(lattice,w,h,world.voronoiSeed,world.voronoiJitter);
 if(graph)return {starts:graph.starts,edges:graph.edgeIds,centerX:graph.centerX,
  centerY:graph.centerY,extentX:graph.extent[0],extentY:graph.extent[1]};
 const key=[lattice,w,h,world.wrap?1:0,world.neighborShape??'moore',
   world.neighborMask??255,world.customStencilMask??0,
   world.customStencilSize??3].join(':');
 const cached=regularCache.get(key);
 if(cached)return cached;
 const starts=new Uint32Array(n+1);
 const edges:number[]=[];
 const centerX=new Float64Array(n),centerY=new Float64Array(n);
 for(let i=0;i<n;i++){
  const x=i%w,y=Math.floor(i/w);
  centerX[i]=x+.5;centerY[i]=y+.5;
  const offsets=neighborOffsets(lattice,x,y,world.neighborShape??'moore',
    world.neighborMask??255,world.customStencilMask,world.customStencilSize);
  const seen=new Set<number>();
  for(const [ox,oy] of offsets){
   let xx=x+ox,yy=y+oy;
   if(world.wrap){xx=wrap(xx,w);yy=wrap(yy,h);}
   else if(xx<0||yy<0||xx>=w||yy>=h)continue;
   const q=yy*w+xx;
   if(q!==i&&!seen.has(q)){seen.add(q);edges.push(q);}
  }
  starts[i+1]=edges.length;
 }
 const adjacency={starts,edges:Uint32Array.from(edges),centerX,centerY,
  extentX:w,extentY:h};
 // Bounded cache avoids rebuilding stable regular graphs each generation.
 if(n<=16384){
  if(regularCache.size>=6)regularCache.delete(regularCache.keys().next().value!);
  regularCache.set(key,adjacency);
 }
 return adjacency;
}
export interface MicroPhaseSettings{mode:MicroPhaseMode;strength:number;depth:number;}
/** Per-cell palette band shift or null for EXACT legacy art at Off/zero.
 * Synchronous iterations use the preceding phase field (Jacobi).
 * Attract = neighbor circular mean, Repel = antiphase target.
 */
export function microGraphPhaseOffsets(
 world:World,occupancy:Float32Array,settings:MicroPhaseSettings
):Float32Array|null{
 const mode=validateMicroPhaseMode(settings.mode);
 const strength=clamp(finite(settings.strength,0),0,2);
 if(mode==='off'||strength<=0)return null;
 const n=world.width*world.height;
 if(occupancy.length!==n)throw new Error('F6I phase source must match world cells');
 const depth=Math.round(clamp(finite(settings.depth,2),1,5));
 const neighbors=microPhaseAdjacency(world);
 const base=new Float64Array(n),working=new Float64Array(n);
 const generation=finite(world.generation,0);
 for(let i=0;i<n;i++){
  const u=neighbors.centerX[i]/neighbors.extentX;
  const v=neighbors.centerY[i]/neighbors.extentY;
  const o=clamp(finite(occupancy[i],0),0,1);
  const theta=TAU*(o*.83+u*.37+v*.29)+
   .85*Math.sin(u*11+v*7+generation*.031)+
   .6*Math.cos(u*5-v*10-generation*.017);
  base[i]=theta;working[i]=theta;
 }
 let next=new Float64Array(n);
 const sin=new Float64Array(n),cos=new Float64Array(n);
 const weight=strength/(1+strength);
 const sign=mode==='repel'?-1:1;
 for(let sweep=0;sweep<depth;sweep++){
  for(let i=0;i<n;i++){sin[i]=Math.sin(working[i]);cos[i]=Math.cos(working[i]);}
  for(let i=0;i<n;i++){
   let sumSin=0,sumCos=0;
   const lo=neighbors.starts[i],hi=neighbors.starts[i+1],degree=hi-lo;
   if(degree===0){next[i]=base[i];continue;}
   for(let k=lo;k<hi;k++){
    const j=neighbors.edges[k];sumSin+=sin[j];sumCos+=cos[j];
   }
   const sx=Math.sin(base[i])+sign*weight*sumSin/degree;
   const cx=Math.cos(base[i])+sign*weight*sumCos/degree;
   next[i]=Math.atan2(sx,cx);
  }
  const temp=next;next=working;working=temp;
 }
 const out=new Float32Array(n);
 for(let i=0;i<n;i++){
  const delta=working[i]-base[i];
  out[i]=clamp(Math.atan2(Math.sin(delta),Math.cos(delta))/TAU*4,-2,2);
 }
 return out;
}
