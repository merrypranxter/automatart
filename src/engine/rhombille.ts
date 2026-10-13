/** The rhombille tiling as a genuine edge-sharing diamond graph.
 *
 * Each regular hexagon of an odd-r honeycomb is exactly partitioned into
 * three 60°/120° congruent rhombi. Index x=3*hexColumn+sector (0,1,2);
 * y=hexRow. Each rhombus has four EDGES: two shared with the other
 * diamonds in its hexagon, and two shared with neighboring hexagons.
 *
 * The coordinates are the same regular hex centers used by the renderer.
 * Even row counts give an exact periodic quotient under both axis wraps.
 * This is not an 8-neighbor square grid dressed up as diamonds.
 */
export const RHOMBILLE_SECTORS=3;
export const RHOMBILLE_VERTICAL_SCALE=Math.sqrt(3)/ (3*1.5); // natural aspect calibration
const H=Math.sqrt(3);
export type Point=[number,number];
export function rhombilleExtent(w:number,h:number):[number,number]{
 if(w%3)throw new Error('Rhombille width must contain complete three-diamond hex motifs');
 return [(w/3+.5)*H,(h-1)*1.5+2];
}
export function rhombillePolygon(x:number,y:number):Point[]{
 const sector=x%3,col=Math.floor(x/3);
 const cx=H*(col+0.5*(y&1)+.5),cy=y*1.5+1;
 const vertices:Array<Point>=Array.from({length:6},(_,i)=>{
  const t=(-90+60*i)*Math.PI/180;
  return [cx+Math.cos(t),cy+Math.sin(t)];
 });
 const a=2*sector;
 return [[cx,cy],vertices[a],vertices[(a+1)%6],vertices[(a+2)%6]];
}
/** Four reciprocal edge neighbors: two within the hex; two across hex edges.
 * Returned as dx/dy to integrate with the existing synchronous CA loop.
 */
export function rhombilleOffsets(x:number,y:number):readonly [number,number][]{
 const sector=x%3;
 const right=(y&1)?1:0,left=(y&1)?0:-1;
 if(sector===0)return [[1,0],[2,0],[3*right+1,-1],[5,0]];
 if(sector===1)return [[-1,0],[1,0],[3*right+1,1],[3*left-1,1]];
 return [[-2,0],[-1,0],[-5,0],[3*left-1,-1]];
}
/** Exact lozenge centroid. Also accepts coordinates beyond the finite
 * array, needed for correct physical directions across periodic seams.
 */
export function rhombilleCentroid(x:number,y:number):Point{
 const sector=((x%3)+3)%3,col=(x-sector)/3;
 const cx=H*(col+.5*(y&1)+.5),cy=1.5*y+1;
 const offset=sector===0?[H/4,-.25]:sector===1?[0,.5]:[-H/4,-.25];
 return [cx+offset[0],cy+offset[1]];
}
export function rhombilleArea(poly:readonly Point[]):number{
 let area=0;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  area+=a[0]*b[1]-b[0]*a[1];
 }
 return Math.abs(area)/2;
}
