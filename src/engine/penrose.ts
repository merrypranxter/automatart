/**
 * D2A: DE BRUIJN PENTAGRID / PENROSE P3 RHOMB TILING.
 *
 * Unlike previous lattices, Penrose cannot be addressed by fixed row/column
 * neighbor offsets. Here each face is constructed from the intersections of
 * FIVE incommensurate line families, then exact full-edge face contacts give
 * the graph. A rhomb has four possible edge-neighbors; bounded patches have
 * fewer where cells were cropped. There is NO periodic wrapping.
 *
 * Grid: n_j . p + gamma_j = k, j=0...4, n_j=(cos(2*pi*j/5),sin(...)).
 * For an intersection of grid families (i,j), its four dual vertices are
 * the five-integer floor-vector K, K+e_i, K+e_i+e_j and K+e_j, projected by
 * sum(K_j*n_j). This constructs mathematically real unit-edge thin/fat rhombs.
 * The gamma shifts sum to zero; they are deliberately non-singular.
 *
 * This isolated mathematical foundation is intentionally NOT a UI feature:
 * D2B must integrate physical topology, genuine laws, selection, painting,
 * color measurements and mobile/export geometry before exposing Penrose.
 */
export type PenrosePoint=readonly [number,number];
export type PenroseKind='thin'|'thick';
export interface PenroseTile {
 readonly kind:PenroseKind;
 readonly vertices:readonly PenrosePoint[];
 readonly vertexKeys:readonly string[];
 readonly centroid:PenrosePoint;
 readonly neighbors:readonly number[];
}
export interface PenrosePatch {
 readonly width:number;
 readonly height:number;
 readonly tiles:readonly PenroseTile[];
 readonly extent:readonly [number,number];
 /** Integer range searched in each independent grid family. */
 readonly sourceRadius:number;
 /** Tile population before finite-patch cropping, for QA/perf diagnostics. */
 readonly candidateCount:number;
 readonly hasPeriodicWrap:false;
}
const NORMALS:readonly PenrosePoint[]=Array.from({length:5},
 (_,j)=>[Math.cos(2*Math.PI*j/5),Math.sin(2*Math.PI*j/5)]);
const SHIFTS=[.123,.279,-.381,.164,-.185] as const;
const MAX_PATCH_CELLS=18000;
type Fifth=[number,number,number,number,number];
type Candidate={
 key:string;
 rawVertices:PenrosePoint[];
 vertexKeys:string[];
 centroid:PenrosePoint;
 kind:PenroseKind;
 metric?:number;
 neighbors:number[];
};
const cache=new Map<string,PenrosePatch>();
const vertexKey=(k:readonly number[])=>k.join(',');
function step(k:Fifth,j:number):Fifth{
 return k.map((v,i)=>v+(i===j?1:0)) as Fifth;
}
function projection(k:Fifth):PenrosePoint{
 let x=0,y=0;
 for(let j=0;j<5;j++){x+=k[j]*NORMALS[j][0];y+=k[j]*NORMALS[j][1];}
 return [x,y];
}
function compare(a:Candidate,b:Candidate):number{
 return a.centroid[1]-b.centroid[1]||a.centroid[0]-b.centroid[0]||
  a.key.localeCompare(b.key);
}
/** Returns a deterministic, bounded finite patch of a true nonperiodic tiling.
 * w,h are only PACKED STORAGE dimensions (w*h face cells), not Cartesian axes.
 * The selection window respects w/h to provide square, landscape and portrait
 * compositions, but individual polygons retain their actual physical shape.
 */
export function penrosePatch(w:number,h:number):PenrosePatch{
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w*h>MAX_PATCH_CELLS)
  throw new Error('Invalid Penrose patch size (4×4 through 18,000 cells)');
 const key=w+':'+h,cached=cache.get(key);
 if(cached)return cached;
 const count=w*h,ratio=w/h;
 // The average area lies between sin(36°) and sin(72°), ~0.78.
 const desiredW=Math.sqrt(count*.78*ratio);
 const desiredH=Math.sqrt(count*.78/ratio);
 let radius=Math.ceil(Math.max(desiredW,desiredH)*.4+8);
 let pool:Candidate[]=[];
 for(let attempt=0;attempt<4;attempt++,radius=Math.ceil(radius*1.35)){
  const found=new Map<string,Candidate>();
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
   const a=NORMALS[i],b=NORMALS[j];
   const det=a[0]*b[1]-a[1]*b[0];
   for(let ki=-radius;ki<=radius;ki++)for(let kj=-radius;kj<=radius;kj++){
    const px=((ki-SHIFTS[i])*b[1]-(kj-SHIFTS[j])*a[1])/det;
    const py=((kj-SHIFTS[j])*a[0]-(ki-SHIFTS[i])*b[0])/det;
    if(Math.max(Math.abs(px),Math.abs(py))>radius*.84)continue;
    const k=NORMALS.map(([nx,ny],z)=>
     Math.floor(nx*px+ny*py+SHIFTS[z]+1e-10)) as Fifth;
    k[i]=ki-1;k[j]=kj-1;
    const a0=k,a1=step(k,i),a3=step(k,j),a2=step(a1,j);
    const fifth=[a0,a1,a2,a3];
    const vertexKeys=fifth.map(vertexKey);
    const id=[...vertexKeys].sort().join('|');
    if(found.has(id))continue;
    const rawVertices=fifth.map(projection);
    const cx=rawVertices.reduce((sum,p)=>sum+p[0],0)/4;
    const cy=rawVertices.reduce((sum,p)=>sum+p[1],0)/4;
    // Side lengths are all 1; sin(72°) identifies the thick rhomb,
    // sin(36°) the thin rhomb.
    found.set(id,{key:id,rawVertices,vertexKeys,centroid:[cx,cy],
      kind:Math.abs(det)>.8?'thick':'thin',neighbors:[]});
   }
  }
  pool=[...found.values()];
  if(pool.length>=count)break;
 }
 if(pool.length<count)throw new Error('Penrose pentagrid could not cover requested patch');
 // A centered RECTANGULAR crop (unlike nearest-radius crops) respects the
 // selected artwork aspect, with an honestly jagged finite boundary.
 for(const face of pool)
  face.metric=Math.max(Math.abs(face.centroid[0])/desiredW,
   Math.abs(face.centroid[1])/desiredH);
 pool.sort((a,b)=>(a.metric??0)-(b.metric??0)||compare(a,b));
 const chosen=pool.slice(0,count).sort(compare);
 // Graph adjacency is reconstructed from full 5D INTEGER EDGE IDENTITIES,
 // not from nearest-centroid heuristics or floating-point line proximity.
 const edges=new Map<string,number>();
 for(let id=0;id<chosen.length;id++){
  const face=chosen[id];
  for(let side=0;side<4;side++){
   const edge=[face.vertexKeys[side],face.vertexKeys[(side+1)%4]].sort().join('|');
   const other=edges.get(edge);
   if(other===undefined){edges.set(edge,id);continue;}
   if(chosen[other].neighbors.includes(id))
    throw new Error('Non-manifold Penrose edge: three or more touching rhombs');
   face.neighbors.push(other);chosen[other].neighbors.push(id);
  }
 }
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const face of chosen)for(const [x,y] of face.rawVertices){
  minX=Math.min(minX,x);minY=Math.min(minY,y);
  maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
 }
 const tiles=chosen.map(face=>({
  kind:face.kind,vertexKeys:face.vertexKeys,
  vertices:face.rawVertices.map(([x,y]):PenrosePoint=>[x-minX,y-minY]),
  centroid:[face.centroid[0]-minX,face.centroid[1]-minY] as PenrosePoint,
  neighbors:[...face.neighbors].sort((a,b)=>a-b)
 }));
 const result:PenrosePatch={
  width:w,height:h,tiles,extent:[maxX-minX,maxY-minY],
  sourceRadius:radius,candidateCount:pool.length,hasPeriodicWrap:false
 };
 if(cache.size>=3)cache.clear();
 cache.set(key,result);
 return result;
}
/** Face graph neighbors by PACKED linear index; no inferred toroidal seams. */
export function penroseNeighbors(w:number,h:number,index:number):readonly number[]{
 const patch=penrosePatch(w,h);
 if(!Number.isInteger(index)||index<0||index>=w*h)throw new Error('Invalid Penrose face index');
 return patch.tiles[index].neighbors;
}
/** Nonperiodic geometry does not admit a faithful repeat seam. */
export function penroseCanWrap():false{return false;}

/** Physical geometric hit test. A 200–640px live preview is too coarse
 * to identify many of the small, thin rhombs in 9:16 patches.
 * Cache lightweight spatial bins keyed by each actual immutable patch. */
const penroseHitBins=new WeakMap<PenrosePatch,{
 cols:number;binSize:number;buckets:Map<number,number[]>
}>();
const HIT_BIN_SIZE=1.5;
function containsRhomb(vertices:readonly PenrosePoint[],x:number,y:number):boolean{
 let sign=0;
 for(let j=0;j<4;j++){
  const a=vertices[j],b=vertices[(j+1)%4];
  const cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
  if(Math.abs(cross)<1e-10)continue;
  const current=cross>0?1:-1;
  if(sign&&sign!==current)return false;
  sign=current;
 }
 return true;
}
function getHitBins(patch:PenrosePatch){
 const old=penroseHitBins.get(patch);
 if(old)return old;
 const binSize=HIT_BIN_SIZE,cols=Math.max(1,Math.ceil(patch.extent[0]/binSize));
 const buckets=new Map<number,number[]>();
 for(let id=0;id<patch.tiles.length;id++){
  const p=patch.tiles[id].vertices;
  const minX=Math.min(...p.map(v=>v[0])),maxX=Math.max(...p.map(v=>v[0]));
  const minY=Math.min(...p.map(v=>v[1])),maxY=Math.max(...p.map(v=>v[1]));
  for(let by=Math.max(0,Math.floor(minY/binSize));by<=Math.floor(maxY/binSize);by++)
   for(let bx=Math.max(0,Math.floor(minX/binSize));bx<=Math.floor(maxX/binSize);bx++){
    const k=by*cols+bx,found=buckets.get(k);
    if(found)found.push(id);else buckets.set(k,[id]);
   }
 }
 const next={cols,binSize,buckets};
 penroseHitBins.set(patch,next);return next;
}
/** Exact finite-patch point -> tile index, never preview-pixel approximation. */
export function penroseHitTest(w:number,h:number,u:number,v:number):number|null{
 if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>=1||v<0||v>=1)return null;
 const patch=penrosePatch(w,h),bins=getHitBins(patch);
 const x=u*patch.extent[0],y=v*patch.extent[1];
 const k=Math.floor(y/bins.binSize)*bins.cols+Math.floor(x/bins.binSize);
 for(const id of bins.buckets.get(k)??[]){
  if(containsRhomb(patch.tiles[id].vertices,x,y))return id;
 }
 return null;
}
