import type {World} from './types';
import type {LatticeId} from './types';
import {neighborOffsets,cellCentroid,polygonForCell} from './topology';
import {penrosePatch} from './penrose';
import {voronoiPatch} from './voronoi';

/** Non-destructive geometry inspection. No guesswork from preview pixels,
 * no false grid-neighborhood assumptions on packed polygons. */
export interface InspectedCellGeometry {
 id:number;row:number;column:number;
 lattice:LatticeId;center:readonly [number,number];
 /** Cell polygon area in native physical coordinate units. */
 area:number;
 /** True full-edge / rule-neighborhood IDs (not array-address proximity). */
 neighborIds:readonly number[];
 degree:number;nonzeroNeighbors:number;
 value:number;generation:number;boundary:boolean;
}
function area(points:readonly (readonly [number,number])[]):number{
 let total=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  total+=a[0]*b[1]-a[1]*b[0];
 }
 return Math.abs(total)*.5;
}
export function inspectCell(world:World,x:number,y:number):InspectedCellGeometry|null{
 const {width:w,height:h,cells}=world;
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=w||y>=h)return null;
 const shape=world.lattice??'square',id=y*w+x;
 let center:readonly [number,number],cellArea:number,boundary=false,neighbors:readonly number[];
 if(shape==='penrose'){
  const tile=penrosePatch(w,h).tiles[id];
  center=tile.centroid;cellArea=area(tile.vertices);
  neighbors=tile.neighbors;
  boundary=tile.neighbors.length<4;
 }else if(shape==='voronoi'){
  const tile=voronoiPatch(w,h,world.voronoiSeed??1,world.voronoiJitter??.34).cells[id];
  center=tile.centroid;cellArea=tile.area;
  neighbors=tile.neighbors;boundary=tile.boundary;
 }else{
  center=cellCentroid(shape,x,y,w,h);
  cellArea=area(polygonForCell(shape,x,y,w,h));
  const offsets=neighborOffsets(shape,x,y,world.neighborShape??'moore',world.neighborMask,
    world.customStencilMask,world.customStencilSize);
  const targets=new Set<number>();
  for(const [dx,dy] of offsets){
   let xx=x+dx,yy=y+dy;
   if(world.wrap){
    xx=((xx%w)+w)%w;yy=((yy%h)+h)%h;
   }else if(xx<0||yy<0||xx>=w||yy>=h){boundary=true;continue;}
   targets.add(yy*w+xx);
  }
  neighbors=[...targets].sort((a,b)=>a-b);
 }
 return {id,row:y,column:x,lattice:shape,center,area:cellArea,
  neighborIds:neighbors,degree:neighbors.length,
  nonzeroNeighbors:neighbors.reduce((n,p)=>n+(cells[p]>0?1:0),0),
  value:cells[id],generation:world.generation,boundary};
}
