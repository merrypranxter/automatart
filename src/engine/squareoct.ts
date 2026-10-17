/** D1C: actual 4.8.8 (truncated-square) full edge-sharing face automaton.
 *
 * Truncate a side-(1+sqrt(2)) square grid at a=1/sqrt(2).
 * Every old grid face becomes a regular octagon (8 actual shared sides),
 * every original grid vertex becomes a rotated square (4 shared sides).
 * One octagon and one vertex square per periodic unit: x=2*column+sector
 * (sector 0 octagon, 1 square), y=row.
 *
 * Coordinates are physical, NOT equivalent to packed array x/y addresses.
 * The chosen +a origin gives fully contained finite polygons at x/y>=0.
 * Unit-cell area = (1+sqrt(2))² = octagon area + square area.
 */
export type SquareOctPoint=[number,number];
export const SQO_CORNER=1/Math.sqrt(2);
export const SQO_PERIOD=1+Math.sqrt(2);
export const SQUAREOCT_VERTICAL_SCALE=.5;
export function squareOctExtent(w:number,h:number):[number,number]{
 if(!Number.isInteger(w)||w<2||w%2!==0)
  throw new Error('Square–octagon width must contain complete two-tile motifs');
 if(!Number.isInteger(h)||h<1)throw new Error('Invalid square–octagon row count');
 return [(w/2)*SQO_PERIOD+SQO_CORNER,h*SQO_PERIOD+SQO_CORNER];
}
export function squareOctPolygon(x:number,y:number):SquareOctPoint[]{
 const sector=((x%2)+2)%2,col=(x-sector)/2;
 const left=col*SQO_PERIOD+SQO_CORNER,top=y*SQO_PERIOD+SQO_CORNER;
 const a=SQO_CORNER,L=SQO_PERIOD;
 if(sector===1)return [[left-a,top],[left,top-a],[left+a,top],[left,top+a]];
 return [[left+a,top],[left+L-a,top],[left+L,top+a],[left+L,top+L-a],
  [left+L-a,top+L],[left+a,top+L],[left,top+L-a],[left,top+a]];
}
/** Physical shared-edge neighbors. The octagon touches 4 octagons on
 * straight edges and 4 squares on diagonals. Every vertex-square
 * touches 4 octagons and NO squares. Periodic wrapping is reciprocal for
 * complete two-tile motifs at any positive row count.
 */
export function squareOctOffsets(x:number,_y:number):readonly [number,number][]{
 const sector=((x%2)+2)%2;
 if(sector===1)return [[-1,0],[-3,0],[-3,-1],[-1,-1]];
 return [[-2,0],[0,-1],[2,0],[0,1],[1,0],[3,0],[3,1],[1,1]];
}
