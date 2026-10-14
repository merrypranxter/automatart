/** B3: genuine conductor geometry (not an SVG overlay or visual effect).
 * Coordinates live directly in the canonical four-state Wireworld lattice.
 * Rectilinear paths are Bresenham-connected; diagonal proximity may couple
 * under Moore-8 Wireworld physics, a property we do NOT claim is insulated.
 */
import type {World} from './types';
export const WIRE_TEMPLATES=[
 {id:'line',label:'SIGNAL RAIL',note:'A straight conductor with optional starting electron.'},
 {id:'elbow',label:'RIGHT-ANGLE TURN',note:'One continuous bent track.'},
 {id:'tee',label:'T BRANCH',note:'Connected three-way T; Moore diagonal interference is real.'},
 {id:'cross',label:'FOUR-WAY JUNCTION',note:'Connected four-way crossing, not an electrically isolated wire crossover.'},
 {id:'loop',label:'SQUARE OSCILLATOR',note:'A closed conductor track with adjacent head and tail.'},
 {id:'double-loop',label:'TWIN ORBITS',note:'Two separated conductor loops; one excitation in each.'},
 {id:'snake',label:'SNAKE MEANDER',note:'A connected serpentine conductor path.'}
] as const;
export type WireTemplate=typeof WIRE_TEMPLATES[number]['id'];
export interface WireStampOptions{
 template:WireTemplate;
 radius:number;
 rotation:0|1|2|3;
 excite:boolean;
 clear:boolean;
}
type Point=[number,number];
function line(out:Point[],a:Point,b:Point){
 let [x,y]=a;
 const dx=Math.abs(b[0]-x),dy=Math.abs(b[1]-y);
 const sx=x<b[0]?1:-1,sy=y<b[1]?1:-1;
 let err=dx-dy;
 for(;;){
  out.push([x,y]);if(x===b[0]&&y===b[1])break;
  const twice=2*err;
  if(twice>-dy){err-=dy;x+=sx;}
  if(twice<dx){err+=dx;y+=sy;}
 }
}
const path=(out:Point[],...vertices:Point[])=>{
 for(let i=1;i<vertices.length;i++)line(out,vertices[i-1],vertices[i]);
};
export function wireTemplateGeometry(template:WireTemplate,radius=9):Point[]{
 if(!Number.isInteger(radius)||radius<4||radius>18)throw Error('Circuit template size must be 4..18');
 const r=radius,pts:Point[]=[];
 switch(template){
  case 'line':path(pts,[-r,0],[r,0]);break;
  case 'elbow':path(pts,[-r,0],[0,0],[0,r]);break;
  case 'tee':path(pts,[-r,-Math.floor(r/2)],[r,-Math.floor(r/2)]);
   path(pts,[0,-Math.floor(r/2)],[0,r]);break;
  case 'cross':path(pts,[-r,0],[r,0]);path(pts,[0,-r],[0,r]);break;
  case 'loop':path(pts,[-r,-r],[r,-r],[r,r],[-r,r],[-r,-r]);break;
  case 'double-loop':{
   const half=Math.max(3,Math.floor(r*.58)),offset=r+half+3;
   for(const x of [-offset,offset])
    path(pts,[x-half,-half],[x+half,-half],[x+half,half],[x-half,half],[x-half,-half]);
   break;
  }
  case 'snake':{
   const a=Math.floor(r/2);
   path(pts,[-r,-r],[r,-r],[r,-a],[-r,-a],[-r,0],[r,0],[r,a],[-r,a],[-r,r],[r,r]);
   break;
  }
  default:throw Error('Invalid Wireworld template');
 }
 const seen=new Set<string>();
 return pts.filter(([x,y])=>{const key=x+','+y;if(seen.has(key))return false;seen.add(key);return true;});
}
function rotate([x,y]:Point,k:0|1|2|3):Point{
 if(k===1)return [-y,x];if(k===2)return [-x,-y];if(k===3)return [y,-x];return [x,y];
}
export function wireStampFootprint(world:World,anchor:Point,opts:WireStampOptions){
 if(world.engine!=='wireworld'||world.lattice!=='square')throw Error('Circuits need Wireworld square lattice');
 if(![0,1,2,3].includes(opts.rotation))throw Error('Invalid circuit orientation');
 const [ax,ay]=anchor,w=world.width,h=world.height;
 const points=wireTemplateGeometry(opts.template,opts.radius);
 const ids:number[]=[];const seen=new Set<number>();
 for(const point of points){
  const [dx,dy]=rotate(point,opts.rotation);
  const x=ax+dx,y=ay+dy;
  if(x<0||y<0||x>=w||y>=h)continue;
  const id=y*w+x;if(!seen.has(id)){seen.add(id);ids.push(id);}
 }
 if(!ids.length)throw Error('Circuit is entirely outside the artboard');
 return ids;
}
/** Atomic canvas update. Optional local clearance removes conflicting random
 * conductor fragments; paint mode preserves everything outside the bounding
 * footprint + one-cell moat, not the entire artwork.
 */
export function stampWireCircuit(world:World,anchor:Point,opts:WireStampOptions):number[]{
 const ids=wireStampFootprint(world,anchor,opts);
 const path=wireTemplateGeometry(opts.template,opts.radius).map(p=>rotate(p,opts.rotation));
 const w=world.width,h=world.height;
 const unique=new Set(ids);
 let affected=[...ids];
 if(opts.clear){
  const box=path.reduce((b,[x,y])=>[
    Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)
  ],[Infinity,Infinity,-Infinity,-Infinity]);
  for(let y=Math.max(0,anchor[1]+box[1]-2);y<=Math.min(h-1,anchor[1]+box[3]+2);y++)
   for(let x=Math.max(0,anchor[0]+box[0]-2);x<=Math.min(w-1,anchor[0]+box[2]+2);x++){
    const p=y*w+x;
    if(!unique.has(p)){world.cells[p]=0;affected.push(p);}
   }
 }
 for(const p of ids)world.cells[p]=1;
 if(opts.excite&&ids.length>=2){
  // A head/tail pair occupies successive real conductor sites in path order.
  // The exact physical path may fan out at junctions under eight-neighbor CA.
  world.cells[ids[0]]=2;world.cells[ids[1]]=3;
  if(opts.template==='double-loop'){
   const halfway=Math.floor(ids.length/2);
   world.cells[ids[halfway]]=2;world.cells[ids[halfway+1]]=3;
  }
 }
 for(const id of affected){
  const v=world.cells[id];
  world.ages[id]=v?1:0;world.traces[id]=v?1:0;
  world.events[id]=0;
  if(world.fossils)world.fossils[id]=0;
  if(world.previousCells)world.previousCells[id]=v;
  if(world.olderCells)world.olderCells[id]=v;
 }
 return affected;
}
