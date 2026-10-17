/** Exact face-cell 3.6.3.6 trihexagonal tiling by rectifying a honeycomb.
 * Each old regular hex becomes a hex of its six edge midpoints; old hex
 * vertices become equilateral triangles of the three adjoining edge midpoints.
 * One cell is a face, and ONLY full shared edges are neighborhoods.
 * x=3*hexColumn+sector (0 hex, 1 upper triangle, 2 lower triangle),
 * y=odd-r honeycomb row. Full motifs and even rows permit reciprocal tori.
 */
export type Point=[number,number];
const H=Math.sqrt(3);
export const KAGOME_VERTICAL_SCALE=H/(3*1.5);
export function kagomeExtent(w:number,h:number):[number,number]{
 if(w%3)throw new Error('Kagome width requires complete three-tile motifs');
 return [(w/3+.5)*H,(h-1)*1.5+3];
}
export function kagomePolygon(x:number,y:number):Point[]{
 const sector=((x%3)+3)%3,col=(x-sector)/3;
 const cx=H*(col+.5*(y&1)+.5),cy=1.5*y+1.5;
 const v:Point[]=Array.from({length:6},(_,i)=>{
  const t=(-90+60*i)*Math.PI/180;
  return [cx+Math.cos(t),cy+Math.sin(t)];
 });
 const m:Point[]=v.map(([a,b],i)=>{
  const [c,d]=v[(i+1)%6];return [(a+c)/2,(b+d)/2];
 });
 if(sector===0)return m;
 if(sector===1)return [m[5],m[0],[v[0][0],v[0][1]-.5]];
 return [m[2],m[3],[v[3][0],v[3][1]+.5]];
}
/** Analytical full shared-edge offsets, verified against the actual
 * rectified honeycomb polygon segments and reciprocal toroidal mappings.
 * The packed dx coordinate is an address, NOT a Euclidean compass heading.
 */
export function kagomeOffsets(x:number,y:number):readonly [number,number][]{
 const s=((x%3)+3)%3,odd=Boolean(y&1);
 if(s===0)return odd
  ? [[2,-1],[5,-1],[1,0],[2,0],[1,1],[4,1]]
  : [[-1,-1],[2,-1],[1,0],[2,0],[-2,1],[1,1]];
 if(s===1)return odd
  ? [[-1,-1],[2,-1],[-1,0]]
  : [[-4,-1],[-1,-1],[-1,0]];
 return odd
  ? [[-2,0],[-2,1],[1,1]]
  : [[-2,0],[-5,1],[-2,1]];
}
