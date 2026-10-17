import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const output=resolve('scripts/.d2a-penrose.mjs');
try{
 await build({entryPoints:['src/engine/penrose.ts'],outfile:output,
  bundle:true,format:'esm',platform:'node',target:'node22'});
 const {penrosePatch,penroseNeighbors,penroseCanWrap}=await import(pathToFileURL(output).href);
 assert.equal(penroseCanWrap(),false,'No fictional periodic seam on an aperiodic world');
 for(const [w,h] of [[32,32],[36,20],[32,56],[60,60]]){
  const patch=penrosePatch(w,h);
  assert.strictEqual(patch,penrosePatch(w,h),'Cache preserves immutable topology identity');
  assert.equal(patch.tiles.length,w*h);
  assert.deepEqual([patch.width,patch.height],[w,h]);
  assert.equal(patch.hasPeriodicWrap,false);
  assert(patch.candidateCount>=w*h);
  assert(Math.abs(patch.extent[0]/patch.extent[1]-w/h)<.16,
   'Actual bounded quasicrystal respects target portrait/square/wide composition');
  const areas={thin:0,thick:0},counts={thin:0,thick:0};
  const edgeMap=new Map(),interior=[];
  const round=(p)=>p.map(n=>Math.round(n*1e7)).join(',');
  const sideKey=(a,b)=>[round(a),round(b)].sort().join('|');
  for(let i=0;i<patch.tiles.length;i++){
   const t=patch.tiles[i];
   assert.equal(t.vertices.length,4);
   assert.equal(t.vertexKeys.length,4);
   assert(t.neighbors.length>=1&&t.neighbors.length<=4);
   assert.deepEqual(t.neighbors,penroseNeighbors(w,h,i));
   assert(new Set(t.neighbors).size===t.neighbors.length);
   if(t.neighbors.length===4)interior.push(i);
   for(const j of t.neighbors){
    assert(j>=0&&j<patch.tiles.length&&j!==i);
    assert(patch.tiles[j].neighbors.includes(i),'Reciprocal true shared edge');
   }
   let area=0;
   for(let s=0;s<4;s++){
    const a=t.vertices[s],b=t.vertices[(s+1)%4];
    assert(Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])-1)<1e-8,
     'All four edges must be Euclidean unit segments');
    area+=a[0]*b[1]-b[0]*a[1];
    const k=sideKey(a,b);
    const owners=edgeMap.get(k)??[];
    owners.push(i);edgeMap.set(k,owners);
   }
   area=Math.abs(area)/2;
   const ideal=t.kind==='thin'?Math.sin(Math.PI/5):Math.sin(2*Math.PI/5);
   assert(Math.abs(area-ideal)<1e-7,'True 36/144 or 72/108 rhomb area');
   areas[t.kind]+=area;counts[t.kind]++;
   const centroid=t.vertices.reduce((p,v)=>[p[0]+v[0]/4,p[1]+v[1]/4],[0,0]);
   assert(Math.hypot(centroid[0]-t.centroid[0],centroid[1]-t.centroid[1])<1e-9);
  }
  assert(counts.thin>patch.tiles.length*.2&&counts.thick>patch.tiles.length*.5,
   'Both real Penrose rhomb species actually occur');
  assert(interior.length>patch.tiles.length*.8,
   'Most faces have four real shared-edge neighbors; only crop boundary is incomplete');
  for(const [edge,owners] of edgeMap){
   assert(owners.length===1||owners.length===2,'No manifold violations');
   if(owners.length===2){
    const [a,b]=owners;
    assert(patch.tiles[a].neighbors.includes(b)&&patch.tiles[b].neighbors.includes(a),
     'Graph is exactly the physical shared-side dual graph');
   }
  }
  console.log('PASS D2A '+w+'x'+h+': '+counts.thin+' thin + '+counts.thick+
   ' thick genuine quasicrystal rhombs, '+interior.length+' four-neighbor interiors');
 }
 assert.throws(()=>penrosePatch(2,80),/Invalid Penrose patch size/);
 assert.throws(()=>penrosePatch(150,150),/Invalid Penrose patch size/);
 assert.throws(()=>penroseNeighbors(32,32,-1),/Invalid Penrose face index/);
 console.log('PASS D2A: de Bruijn five-grid cut-and-project rhombs, exact graph, nonperiodic boundaries and aspect-aware deterministic finite patches');
}finally{
 await unlink(output).catch(()=>{});
}
