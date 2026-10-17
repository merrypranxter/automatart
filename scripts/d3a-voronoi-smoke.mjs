import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const output=resolve('scripts/.d3a-voronoi.mjs');
const close=(a,b,tol=1e-7)=>Math.abs(a-b)<tol;
function area(poly){
 let n=0;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  n+=a[0]*b[1]-b[0]*a[1];
 }
 return n/2;
}
function inside(poly,p){
 let sign=0;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  const d=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  if(Math.abs(d)<1e-8)continue;
  const next=d>0?1:-1;
  if(sign&&sign!==next)return false;
  sign=next;
 }
 return true;
}
const key=p=>p.map(v=>Math.round(v*1e7)).join(',');
const edgeKey=(p,q)=>[key(p),key(q)].sort().join('|');
/** Independent exhaustive calculation: no 7×7 locality optimization. */
function globalClip(poly,p,q){
 const ax=2*(q[0]-p[0]),ay=2*(q[1]-p[1]);
 const limit=q[0]**2+q[1]**2-p[0]**2-p[1]**2;
 const d=v=>ax*v[0]+ay*v[1]-limit,out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  const da=d(a),db=d(b),ina=da<=1e-10,inb=db<=1e-10;
  if(ina!==inb){
   const t=da/(da-db);
   out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
  }
  if(inb)out.push(b);
 }
 return out;
}
try{
 await build({entryPoints:['src/engine/voronoi.ts'],outfile:output,
  bundle:true,platform:'node',format:'esm',target:'node22'});
 const {voronoiPatch,voronoiNeighbors,voronoiCanWrap}=
  await import(pathToFileURL(output).href);
 assert.equal(voronoiCanWrap(),false,'No fictional toroidal seam');
 for(const [w,h,seed,jitter] of [
  [8,9,0,0],[8,9,17,.42],[8,9,123,.34],
  [32,32,5813,.34],[32,56,7,.34],
  [50,30,183,.34],[64,114,17,.34]
 ]){
  const patch=voronoiPatch(w,h,seed,jitter);
  assert.strictEqual(patch,voronoiPatch(w,h,seed,jitter),'Cached geometry is stable');
  assert.equal(patch.hasPeriodicWrap,false);
  assert.deepEqual([patch.width,patch.height,...patch.extent],[w,h,w,h]);
  assert.equal(patch.cells.length,w*h);
  const degrees=new Set(),edges=new Map();
  let totalArea=0,interior=0;
  for(let id=0;id<w*h;id++){
   const c=patch.cells[id],p=c.polygon;
   assert(p.length>=3&&p.length<=12,'Actual convex Voronoi polygon');
   assert(inside(p,c.site)&&inside(p,c.centroid),'Physical site and weighted centroid inside');
   assert(close(area(p),c.area,1e-8),'Geometric area from true vertices');
   assert(c.area>0&&c.area<3);
   totalArea+=c.area;
   if(!c.boundary)interior++;
   degrees.add(c.neighbors.length);
   assert.deepEqual(c.neighbors,voronoiNeighbors(w,h,seed,id,jitter));
   assert.equal(new Set(c.neighbors).size,c.neighbors.length);
   for(const other of c.neighbors){
    assert(other!==id&&other>=0&&other<w*h);
    assert(patch.cells[other].neighbors.includes(id),'Real shared-edge reciprocity');
   }
   for(let j=0;j<p.length;j++){
    const a=p[j],b=p[(j+1)%p.length];
    assert(a[0]>=-1e-7&&a[0]<=w+1e-7&&a[1]>=-1e-7&&a[1]<=h+1e-7);
    if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8)continue;
    const k=edgeKey(a,b),owners=edges.get(k)||[];
    owners.push(id);edges.set(k,owners);
   }
  }
  assert(close(totalArea,w*h,1e-7),'Polygons cover the WHOLE canvas with no gaps/overlap');
  assert(interior>0,'Genuine interior cells');
  for(const owners of edges.values()){
   assert(owners.length>=1&&owners.length<=2,'No triple-matched manifold edges');
   if(owners.length===2){
    const [a,b]=owners;
    assert(patch.cells[a].neighbors.includes(b),'Graph equals polygon-side geometry');
   }
  }
  if(jitter>0){
   assert(degrees.size>=4,'Irregular polygons genuinely have differing neighbor counts');
   assert([...degrees].some(n=>n>=7)&&[...degrees].some(n=>n<=4));
  }
  // Prove 7x7 search really is exact, independently compare every other
  // generator's bisector for each 8x9 polygon, including MAXIMUM jitter.
  if(w===8&&h===9)for(let id=0;id<w*h;id++){
   let full=[[0,0],[w,0],[w,h],[0,h]];
   for(let other=0;other<w*h;other++)if(id!==other)
    full=globalClip(full,patch.cells[id].site,patch.cells[other].site);
   assert(close(area(full),patch.cells[id].area,1e-8),
    'Local search equals exhaustive global nearest-site Voronoi');
  }
  console.log('PASS D3A '+w+'×'+h+' seed '+seed+
   ' edges '+edges.size+' degrees '+[...degrees].sort((a,b)=>a-b).join('/')+
   ' full artboard area '+totalArea.toFixed(4));
 }
 const a=voronoiPatch(20,20,18),b=voronoiPatch(20,20,19);
 assert.notDeepEqual(a.cells[0].site,b.cells[0].site,'Seed changes physical generators');
 assert.notDeepEqual(a.cells[0].polygon,b.cells[0].polygon,'Seed changes real geometry');
 for(const args of [[2,20,1,.34],[20,2,1,.34],[200,200,1,.34],
  [16,16,-1,.34],[16,16,1,.5],[16,16,1,-.1],[16,16,1,NaN]]){
  assert.throws(()=>voronoiPatch(...args),/Invalid bounded Voronoi/);
 }
 assert.throws(()=>voronoiNeighbors(16,16,1,256),/Invalid Voronoi cell index/);
 console.log('PASS D3A: exact globally equivalent half-planes, real shared-edge graph, reproducible finite physics');
}finally{
 await unlink(output).catch(()=>{});
}
