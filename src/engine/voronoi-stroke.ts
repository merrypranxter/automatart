import {voronoiPatch,voronoiHitTest} from './voronoi';
import type {VoronoiPoint} from './voronoi';

/** Exact intersection of a line segment with a CCW convex Voronoi polygon.
 * Returns entry/exit parameters in [0,1], or null when there is no
 * positive-length interior crossing (point-only tangent contacts do not paint).
 */
export function strokePolygonInterval(
 a:VoronoiPoint,b:VoronoiPoint,polygon:readonly VoronoiPoint[]
):readonly [number,number]|null{
 const dx=b[0]-a[0],dy=b[1]-a[1];
 let lo=0,hi=1;
 for(let j=0;j<polygon.length;j++){
  const p=polygon[j],q=polygon[(j+1)%polygon.length];
  const ex=q[0]-p[0],ey=q[1]-p[1];
  const signed=ex*(a[1]-p[1])-ey*(a[0]-p[0]);
  const slope=ex*dy-ey*dx;
  if(Math.abs(slope)<1e-12){
   if(signed< -1e-9)return null;
  }else{
   const crossing=-signed/slope;
   if(slope>0)lo=Math.max(lo,crossing);
   else hi=Math.min(hi,crossing);
   if(lo>hi+1e-10)return null;
  }
 }
 return hi-lo>1e-9?[Math.max(0,lo),Math.min(1,hi)]:null;
}

/** Traverse precisely the physical cells crossed by a continuous brush swipe.
 *
 * Candidates are bounded by a proof, not an arbitrary pixel step: bounded
 * site jitter (.42) guarantees any covered point is within sqrt(2)*.92 of
 * its site's generator. Samples of the stroke at <=.5 physical distance
 * guarantee a sample <=.25 away, so the corresponding site's bin lies
 * within +/-3 bins of at least one sample. Every such candidate receives
 * an exact convex polygon/segment intersection test. Thin cells CANNOT
 * disappear between sampling points, because sampling discovers CANDIDATES
 * and polygon intersection determines actual crossings.
 */
export function voronoiStrokeCells(
 w:number,h:number,seed:number,jitter:number,
 fromU:number,fromV:number,toU:number,toV:number
):number[]{
 const valid=(v:number)=>Number.isFinite(v)&&v>=0&&v<1;
 if(![fromU,fromV,toU,toV].every(valid))return [];
 const patch=voronoiPatch(w,h,seed,jitter);
 const from:[number,number]=[fromU*w,fromV*h];
 const to:[number,number]=[toU*w,toV*h];
 const length=Math.hypot(to[0]-from[0],to[1]-from[1]);
 if(length<1e-12){
  const id=voronoiHitTest(w,h,seed,jitter,toU,toV);
  return id===null?[]:[id];
 }
 const count=Math.max(1,Math.ceil(length*2));
 const candidates=new Set<number>();
 for(let i=0;i<=count;i++){
  const t=i/count,px=from[0]+(to[0]-from[0])*t,py=from[1]+(to[1]-from[1])*t;
  const x=Math.floor(px),y=Math.floor(py);
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
   const xx=x+dx,yy=y+dy;
   if(xx>=0&&xx<w&&yy>=0&&yy<h)candidates.add(yy*w+xx);
  }
 }
 const crossings:{id:number;entry:number}[]=[];
 for(const id of candidates){
  const interval=strokePolygonInterval(from,to,patch.cells[id].polygon);
  if(interval)crossings.push({id,entry:interval[0]});
 }
 crossings.sort((a,b)=>a.entry-b.entry||a.id-b.id);
 return crossings.map(p=>p.id);
}
