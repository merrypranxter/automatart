import type {LatticeId,OrientedSymmetry,OrientedMatch,NeighborShape} from './types';
import {DEFAULT_STENCIL_MASK,stencilOffsets} from './stencil';
import {rhombilleOffsets,rhombilleExtent,rhombillePolygon} from './rhombille';
import {kagomeOffsets,kagomeExtent,kagomePolygon} from './kagome';
import {squareOctOffsets,squareOctExtent,squareOctPolygon} from './squareoct';
import {penrosePatch,penroseHitTest} from './penrose';

export const ORIENTED_DIRECTIONS = [
  [-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]
] as const; // NW N NE E SE S SW W, clockwise

const radiusSquare2:[number,number][]=[];
const radiusDiamond2:[number,number][]=[];
for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){
 if(x===0&&y===0)continue;
 radiusSquare2.push([x,y]);
 if(Math.abs(x)+Math.abs(y)<=2)radiusDiamond2.push([x,y]);
}
export function neighborOffsets(lattice:LatticeId,x:number,y:number,shape:NeighborShape,mask=255,customMask=DEFAULT_STENCIL_MASK,customSize:3|5=5):readonly [number,number][]{
  if(lattice==='rhombille')return rhombilleOffsets(x,y);
  if(lattice==='kagome')return kagomeOffsets(x,y);
  if(lattice==='squareoct')return squareOctOffsets(x,y);
  if(lattice==='hex'){
    const shift=y&1;
    return [[-1,0],[1,0],[-1+shift,-1],[shift,-1],[-1+shift,1],[shift,1]];
  }
  if(lattice==='triangle'){
    return [[-1,0],[1,0],[0,((x+y)&1)===0?-1:1]];
  }
  if(shape==='custom')return stencilOffsets(customMask,customSize);
  if(shape==='square2')return radiusSquare2;
  if(shape==='diamond2')return radiusDiamond2;
  if(shape==='directional')return ORIENTED_DIRECTIONS.filter((_,i)=>(mask&(1<<i))!==0).map(([dx,dy])=>[dx,dy] as [number,number]);
  if(shape==='vonNeumann')return [[0,-1],[1,0],[0,1],[-1,0]];
  return [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
}
export function turnMask(mask:number,steps:number):number{
  // ORIENTED_DIRECTIONS increments clockwise in eighth-turns.
  let out=0;
  for(let bit=0;bit<8;bit++)if(mask&(1<<bit))out|=1<<((bit+steps)%8);
  return out;
}
export function mirrorMask(mask:number):number{
  // Mirror across vertical N/S axis: direction index 1 (N), 5 (S).
  let out=0;
  for(let bit=0;bit<8;bit++)if(mask&(1<<bit))out|=1<<((2-bit+8)%8);
  return out;
}
export function orientedMatch(neighbors:number,pattern:number,symmetry:OrientedSymmetry,match:OrientedMatch):boolean{
  const options=[pattern];
  if(symmetry!=='fixed'){
    for(let k=1;k<4;k++)options.push(turnMask(pattern,k*2));
    if(symmetry==='dihedral'){
      const flipped=mirrorMask(pattern);
      for(let k=0;k<4;k++)options.push(turnMask(flipped,k*2));
    }
  }
  return options.some(m=>match==='exact'?neighbors===m:(neighbors&m)===m);
}
export function rotateBlocks(cells:Uint8Array,w:number,h:number,phase:0|1,reverse=false):Uint8Array{
  if(w%2||h%2)throw new Error('Margolus needs even width and height');
  const result=cells.slice();
  for(let by=0;by<h;by+=2)for(let bx=0;bx<w;bx+=2){
    const x0=(bx+phase)%w,y0=(by+phase)%h;
    const x1=(x0+1)%w,y1=(y0+1)%h;
    const a=y0*w+x0,b=y0*w+x1,c=y1*w+x1,d=y1*w+x0;
    if(reverse){
      result[a]=cells[b];result[b]=cells[c];result[c]=cells[d];result[d]=cells[a];
    }else{
      result[a]=cells[d];result[b]=cells[a];result[c]=cells[b];result[d]=cells[c];
    }
  }
  return result;
}
type Point=[number,number];
export interface CellGeometry {points:Point[];bounds:[number,number,number,number]}
const H=Math.sqrt(3)/2;
const R3=Math.sqrt(3);
export function geometryExtent(shape:LatticeId,w:number,h:number):[number,number]{
  if(shape==='hex')return [(w+0.5)*R3,(h-1)*1.5+2];
  if(shape==='rhombille')return rhombilleExtent(w,h);
  if(shape==='kagome')return kagomeExtent(w,h);
  if(shape==='squareoct')return squareOctExtent(w,h);
  if(shape==='penrose')return [...penrosePatch(w,h).extent];
  if(shape==='triangle')return [w/2+0.5,h*H];
  return [w,h];
}
export function polygonForCell(shape:LatticeId,x:number,y:number,w?:number,h?:number):Point[]{
  if(shape==='penrose'){
    if(w===undefined||h===undefined)throw new Error('Penrose polygon needs patch dimensions');
    return penrosePatch(w,h).tiles[y*w+x].vertices.map(v=>[v[0],v[1]]);
  }
  if(shape==='rhombille')return rhombillePolygon(x,y);
  if(shape==='kagome')return kagomePolygon(x,y);
  if(shape==='squareoct')return squareOctPolygon(x,y);
  if(shape==='hex'){
    const cx=R3*(x+0.5*(y&1)+0.5),cy=y*1.5+1;
    const angles=[-90,-30,30,90,150,210];
    return angles.map(deg=>[cx+Math.cos(deg*Math.PI/180),cy+Math.sin(deg*Math.PI/180)]);
  }
  if(shape==='triangle'){
    const k=Math.floor(x/2),y0=y*H,y1=(y+1)*H;
    if((y&1)===0){
      if((x&1)===0)return [[k,y0],[k+1,y0],[k+0.5,y1]];
      return [[k+1,y0],[k+1.5,y1],[k+0.5,y1]];
    }
    if((x&1)===0)return [[k+0.5,y0],[k,y1],[k+1,y1]];
    return [[k+0.5,y0],[k+1.5,y0],[k+1,y1]];
  }
  return [[x,y],[x+1,y],[x+1,y+1],[x,y+1]];
}
/** Actual face centroid, valid for irregular packed motifs. */
export function cellCentroid(shape:LatticeId,x:number,y:number,w?:number,h?:number):Point{
 if(shape==='penrose'){
  if(w===undefined||h===undefined)throw new Error('Penrose centroid needs patch dimensions');
  return [...penrosePatch(w,h).tiles[y*w+x].centroid];
 }
 const p=polygonForCell(shape,x,y);
 return p.reduce(([sx,sy],[px,py])=>[sx+px/p.length,sy+py/p.length],[0,0] as Point);
}
function inside(px:number,py:number,polygon:Point[]):boolean{
  let sign=0;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    const cross=(b[0]-a[0])*(py-a[1])-(b[1]-a[1])*(px-a[0]);
    if(Math.abs(cross)<1e-9)continue;
    const next=cross>0?1:-1;
    if(sign&&sign!==next)return false;
    sign=next;
  }
  return true;
}
const maps=new Map<string,{indices:Uint32Array,samples:Uint32Array,width:number,height:number}>();
export function projectedSize(w:number,h:number):[number,number]{
  const pw=Math.min(640,Math.max(200,Math.round(w*2.45)));
  return [pw,Math.max(1,Math.round(pw*h/w))];
}
export function projectionMap(lattice:LatticeId,w:number,h:number){
  const [pw,normalHeight]=projectedSize(w,h);
  const [extentWidth,extentHeight]=geometryExtent(lattice,w,h);
  const ph=(lattice==='rhombille'||lattice==='kagome'||lattice==='squareoct'||lattice==='penrose')?Math.max(1,Math.round(pw*extentHeight/extentWidth)):normalHeight;
  const key=lattice+':'+w+':'+h+':'+pw+':'+ph;
  const cached=maps.get(key);if(cached)return cached;
  const indices=new Uint32Array(pw*ph),samples=new Uint32Array(pw*ph);
  indices.fill(0xffffffff);
  const [extentX,extentY]=geometryExtent(lattice,w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const polygon=polygonForCell(lattice,x,y,w,h).map(([a,b])=>[a/extentX*pw,b/extentY*ph] as Point);
    const left=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p[0]))));
    const right=Math.min(pw-1,Math.ceil(Math.max(...polygon.map(p=>p[0]))));
    const top=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p[1]))));
    const bottom=Math.min(ph-1,Math.ceil(Math.max(...polygon.map(p=>p[1]))));
    const boxWidth=Math.max(1,right-left+1),boxHeight=Math.max(1,bottom-top+1);
    for(let j=top;j<=bottom;j++)for(let i=left;i<=right;i++){
      if(!inside(i+0.5,j+0.5,polygon))continue;
      const pos=j*pw+i;
      indices[pos]=y*w+x;
      // Geometry is mapped to the source square cell's 2×2 local texture.
      const sx=Math.min(1,Math.max(0,(i-left)/boxWidth));
      const sy=Math.min(1,Math.max(0,(j-top)/boxHeight));
      samples[pos]=(2*y+(sy>0.5?1:0))*(2*w)+(2*x+(sx>0.5?1:0));
    }
  }
  const result={indices,samples,width:pw,height:ph};
  if(maps.size>=10)maps.clear();
  maps.set(key,result);return result;
}
export function lookupCell(lattice:LatticeId,w:number,h:number,u:number,v:number):[number,number]|null{
  if(u<0||u>=1||v<0||v>=1)return null;
  if(lattice==='square')return [Math.floor(u*w),Math.floor(v*h)];
  if(lattice==='penrose'){
    const id=penroseHitTest(w,h,u,v);
    return id===null?null:[id%w,Math.floor(id/w)];
  }
  const map=projectionMap(lattice,w,h);
  const x=Math.min(map.width-1,Math.floor(u*map.width)),y=Math.min(map.height-1,Math.floor(v*map.height));
  const id=map.indices[y*map.width+x];
  return id===0xffffffff?null:[id%w,Math.floor(id/w)];
}
