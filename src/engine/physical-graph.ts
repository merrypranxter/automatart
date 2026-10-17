import {penrosePatch} from './penrose';
import type {PenrosePatch} from './penrose';
import {voronoiPatch} from './voronoi';
import type {VoronoiPatch} from './voronoi';
import type {LatticeId} from './types';

/** Immutable, compressed sparse row representation of TRUE shared-edge faces.
 *
 * The engine's index storage is NOT a spatial adjacency. The input geometry
 * already verifies actual shared polygon edges. This builds one compact graph
 * per immutable tiling patch and reuses it across every step, color pass and
 * frame. Neither canvas resolution nor the current cells enter its key.
 */
export interface PhysicalGraph {
  readonly width:number; readonly height:number; readonly length:number;
  /** edges for cell i are edgeIds[starts[i] .. starts[i+1]) */
  readonly starts:Uint32Array;
  readonly edgeIds:Uint32Array;
  readonly centerX:Float64Array;
  readonly centerY:Float64Array;
  readonly extent:readonly [number,number];
  readonly hasPeriodicWrap:false;
}
const penroseGraphs=new WeakMap<PenrosePatch,PhysicalGraph>();
const voronoiGraphs=new WeakMap<VoronoiPatch,PhysicalGraph>();
function graphFrom(
  width:number,height:number,extent:readonly [number,number],
  faces:readonly {readonly neighbors:readonly number[];readonly centroid:readonly [number,number]}[]
):PhysicalGraph{
  const n=width*height;
  if(faces.length!==n)throw new Error('Physical adjacency must match actual cell count');
  const starts=new Uint32Array(n+1);
  for(let i=0;i<n;i++)starts[i+1]=starts[i]+faces[i].neighbors.length;
  const edgeIds=new Uint32Array(starts[n]);
  const centerX=new Float64Array(n),centerY=new Float64Array(n);
  for(let i=0;i<n;i++){
    centerX[i]=faces[i].centroid[0];
    centerY[i]=faces[i].centroid[1];
    if(!Number.isFinite(centerX[i])||!Number.isFinite(centerY[i]))
      throw new Error('Physical graph has invalid centroid');
    for(let k=starts[i];k<starts[i+1];k++){
      const q=faces[i].neighbors[k-starts[i]];
      if(!Number.isInteger(q)||q<0||q>=n||q===i)
        throw new Error('Invalid physical shared-edge neighbor');
      edgeIds[k]=q;
    }
  }
  return {width,height,length:n,starts,edgeIds,centerX,centerY,
    extent,hasPeriodicWrap:false};
}
export function physicalGraph(
 lattice:LatticeId,width:number,height:number,seed=1,jitter=.34
):PhysicalGraph|null{
 if(lattice==='penrose'){
   const patch=penrosePatch(width,height),cached=penroseGraphs.get(patch);
   if(cached)return cached;
   const graph=graphFrom(width,height,patch.extent,patch.tiles);
   penroseGraphs.set(patch,graph);return graph;
 }
 if(lattice==='voronoi'){
   const patch=voronoiPatch(width,height,seed,jitter),cached=voronoiGraphs.get(patch);
   if(cached)return cached;
   const graph=graphFrom(width,height,patch.extent,patch.cells);
   voronoiGraphs.set(patch,graph);return graph;
 }
 return null;
}
