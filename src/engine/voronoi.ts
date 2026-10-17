/** D3A: actual bounded seeded Voronoi cells, never a polygon skin on squares.
 * Sites are jittered inside underlying unit bins, with jitter <= .42.
 * For a point in a cell's region, distance to that cell's site is at most
 * sqrt(2)*(.5+.42)=1.302. A contributing site must lie <=2.604 away.
 * A generator >=4 bins away lies >=4-2*.42=3.16 away, so clipping
 * against +/-3 bins (7x7) is EXACT, not a nearest-site approximation.
 * Edge contacts are obtained from shared full polygon segments, NOT bins.
 */
export type VoronoiPoint=readonly [number,number];
export interface VoronoiCell{
 readonly site:VoronoiPoint;
 readonly polygon:readonly VoronoiPoint[];
 readonly centroid:VoronoiPoint;
 readonly area:number;
 readonly neighbors:readonly number[];
 readonly boundary:boolean;
}
export interface VoronoiPatch{
 readonly width:number;readonly height:number;
 readonly seed:number;readonly jitter:number;
 readonly extent:readonly [number,number];
 readonly cells:readonly VoronoiCell[];
 readonly hasPeriodicWrap:false;
}
const MAX_CELLS=18000,MAX_JITTER=.42,SEARCH_RADIUS=3,EPS=1e-10;
const cache=new Map<string,VoronoiPatch>();
function uniform(n:number):number{
 n=(n+0x6d2b79f5)|0;n=Math.imul(n^(n>>>15),n|1);
 n^=n+Math.imul(n^(n>>>7),n|61);
 return ((n^(n>>>14))>>>0)/4294967296;
}
function siteAt(x:number,y:number,seed:number,jitter:number):VoronoiPoint{
 const hash=(seed^Math.imul(x+11,0x9e3779b1)^Math.imul(y+23,0x85ebca6b))|0;
 return [x+.5+(2*uniform(hash^0x29304a51)-1)*jitter,
         y+.5+(2*uniform(hash^0x719a2512)-1)*jitter];
}
function clip(poly:readonly VoronoiPoint[],p:VoronoiPoint,q:VoronoiPoint):VoronoiPoint[]{
 const ax=2*(q[0]-p[0]),ay=2*(q[1]-p[1]);
 const bound=q[0]*q[0]+q[1]*q[1]-p[0]*p[0]-p[1]*p[1];
 const d=(v:VoronoiPoint)=>ax*v[0]+ay*v[1]-bound;
 const out:VoronoiPoint[]=[];
 for(let k=0;k<poly.length;k++){
  const a=poly[k],b=poly[(k+1)%poly.length];
  const da=d(a),db=d(b),inside=da<=EPS,next=db<=EPS;
  if(inside!==next){
   const t=da/(da-db);
   out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
  }
  if(next)out.push(b);
 }
 const result:VoronoiPoint[]=[];
 for(const p of out){
  const last=result[result.length-1];
  if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>1e-9)result.push(p);
 }
 if(result.length>1&&Math.hypot(result[0][0]-result[result.length-1][0],
  result[0][1]-result[result.length-1][1])<1e-9)result.pop();
 return result;
}
function measures(poly:readonly VoronoiPoint[]):{area:number;centroid:VoronoiPoint}{
 let twice=0,cx=0,cy=0;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  const cross=a[0]*b[1]-b[0]*a[1];
  twice+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross;
 }
 if(twice<=1e-10)throw new Error('Invalid Voronoi cell polygon');
 return {area:twice/2,centroid:[cx/(3*twice),cy/(3*twice)]};
}
const quantize=(n:number)=>Math.round(n*1e7);
function segment(a:VoronoiPoint,b:VoronoiPoint):string{
 const v=quantize(a[0])+','+quantize(a[1]);
 const z=quantize(b[0])+','+quantize(b[1]);
 return v<z?v+'|'+z:z+'|'+v;
}
/** Generate deterministic finite polygons, true face contacts and centroids.
 * Array addresses index cells only; they do NOT define cellular adjacency.
 */
export function voronoiPatch(w:number,h:number,seed=1,jitter=.34):VoronoiPatch{
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<4||h<4||w*h>MAX_CELLS||
  !Number.isSafeInteger(seed)||seed<0||seed>4294967295||
  !Number.isFinite(jitter)||jitter<0||jitter>MAX_JITTER)
  throw new Error('Invalid bounded Voronoi patch size, seed or jitter');
 const key=w+':'+h+':'+seed+':'+jitter,existing=cache.get(key);
 if(existing)return existing;
 const n=w*h;
 const sites:VoronoiPoint[]=Array.from({length:n},(_,i)=>siteAt(i%w,Math.floor(i/w),seed,jitter));
 const polygons:VoronoiPoint[][]=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const site=sites[y*w+x];
  let polygon:VoronoiPoint[]=[[0,0],[w,0],[w,h],[0,h]];
  for(let dy=-SEARCH_RADIUS;dy<=SEARCH_RADIUS;dy++)
   for(let dx=-SEARCH_RADIUS;dx<=SEARCH_RADIUS;dx++){
    if(!dx&&!dy)continue;
    const xx=x+dx,yy=y+dy;
    if(xx<0||xx>=w||yy<0||yy>=h)continue;
    polygon=clip(polygon,site,sites[yy*w+xx]);
    if(polygon.length<3)throw new Error('Voronoi site lost own cell');
   }
  polygons.push(polygon);
 }
 const adjacency:Array<Set<number>>=Array.from({length:n},()=>new Set());
 const firstOwner=new Map<string,number>(),unmatched=new Set<string>();
 for(let id=0;id<n;id++){
  const poly=polygons[id];
  for(let j=0;j<poly.length;j++){
   const a=poly[j],b=poly[(j+1)%poly.length];
   if(Math.hypot(b[0]-a[0],b[1]-a[1])<1e-8)continue;
   const edge=segment(a,b),first=firstOwner.get(edge);
   if(first===undefined){firstOwner.set(edge,id);unmatched.add(edge);}
   else{
    if(first===id||adjacency[first].has(id))
     throw new Error('Non-manifold Voronoi edge');
    adjacency[id].add(first);adjacency[first].add(id);unmatched.delete(edge);
   }
  }
 }
 for(const k of unmatched){
  const [a,b]=k.split('|').map(s=>s.split(',').map(v=>Number(v)/1e7));
  const outer=(axis:number,value:number)=>
   Math.abs(a[axis]-value)<2e-7&&Math.abs(b[axis]-value)<2e-7;
  if(!outer(0,0)&&!outer(0,w)&&!outer(1,0)&&!outer(1,h))
   throw new Error('Voronoi polygon has unmatched interior edge');
 }
 const cells:VoronoiCell[]=polygons.map((polygon,id)=>{
  const {area,centroid}=measures(polygon);
  return {site:sites[id],polygon,centroid,area,
   neighbors:[...adjacency[id]].sort((a,b)=>a-b),
   boundary:polygon.some(p=>p[0]<EPS||p[1]<EPS||w-p[0]<EPS||h-p[1]<EPS)};
 });
 const result:VoronoiPatch={width:w,height:h,seed,jitter,
  extent:[w,h],cells,hasPeriodicWrap:false};
 if(cache.size>=3)cache.clear();
 cache.set(key,result);return result;
}
export function voronoiNeighbors(w:number,h:number,seed:number,id:number,jitter=.34):readonly number[]{
 const patch=voronoiPatch(w,h,seed,jitter);
 if(!Number.isInteger(id)||id<0||id>=w*h)throw new Error('Invalid Voronoi cell index');
 return patch.cells[id].neighbors;
}
/** A finite clipped Voronoi patch does not have a fictional toroidal seam. */
export function voronoiCanWrap():false{return false;}
