/** T6: persistent chemotaxis field for genuine square-lattice Turmite physics.
 * Fixed-point deterministic Uint8 math, independent of pigment and visual traces.
 * In each physical microstep all ants read the SAME prior scent field, then
 * all origins deposit, mix and evaporate only AFTER their agent moves.
 */
export type PheromoneSteering='off'|'attract'|'repel'|'alternating';
export type CardinalHeading=0|1|2|3;
export interface TurmitePheromones{
 enabled:boolean;
 deposit:number;       // 0..32 intensity per ant per real microstep
 diffusion:number;     // 0..8 fixed point strength over local stencil
 evaporation:number;   // 0..8 absolute intensity lost per microstep
 steering:PheromoneSteering;
 strength:0|1|2;       // 0 bypass, 1 <=quarter-turn, 2 full gradient turn
 threshold:number;     // 1..32 minimum strictly positive local gradient
}
export const DEFAULT_TURMITE_PHEROMONES:TurmitePheromones={
 enabled:false,deposit:18,diffusion:4,evaporation:1,
 steering:'attract',strength:1,threshold:2
};
export function validTurmitePheromones(v:TurmitePheromones):boolean{
 return !!v&&typeof v.enabled==='boolean'&&
  Number.isInteger(v.deposit)&&v.deposit>=0&&v.deposit<=32&&
  Number.isInteger(v.diffusion)&&v.diffusion>=0&&v.diffusion<=8&&
  Number.isInteger(v.evaporation)&&v.evaporation>=0&&v.evaporation<=8&&
  ['off','attract','repel','alternating'].includes(v.steering)&&
  Number.isInteger(v.strength)&&v.strength>=0&&v.strength<=2&&
  Number.isInteger(v.threshold)&&v.threshold>=1&&v.threshold<=32;
}
export const PHEROMONE_DIRS:readonly (readonly [number,number])[]=
 [[0,-1],[1,0],[0,1],[-1,0]];
function sampleIndex(x:number,y:number,w:number,h:number,wrap:boolean):number{
 if(wrap){x=(x+w)%w;y=(y+h)%h;}
 if(x<0||y<0||x>=w||y>=h)return -1;
 return y*w+x;
}
/** Real physical heading change, not a painted vector or animation overlay.
 * Seek stronger (attract) or weaker (repel) neighboring values relative to
 * the current site. No *positive signed gradient* => preserve legacy turn.
 * Use fixed N/E/S/W tie-breaks for exact deterministic replay.
 */
export function pheromoneSteerHeading(
 field:Uint8Array,w:number,h:number,wrap:boolean,x:number,y:number,
 heading:CardinalHeading,species:number,chem:TurmitePheromones):CardinalHeading{
 if(!validTurmitePheromones(chem)||field.length!==w*h||
    !Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=w||y<0||y>=h||
    !Number.isInteger(heading)||heading<0||heading>3||!Number.isInteger(species)||species<0)
  throw new Error('Invalid T6 pheromone steering');
 if(!chem.enabled||chem.strength===0||chem.steering==='off')return heading;
 const sign=chem.steering==='repel'||(chem.steering==='alternating'&&species%2===1)?-1:1;
 const center=field[y*w+x];
 let best=chem.threshold-1,desired=-1;
 for(let dir=0;dir<4;dir++){
  const [dx,dy]=PHEROMONE_DIRS[dir];
  const q=sampleIndex(x+dx,y+dy,w,h,wrap);
  if(q<0)continue; // no phantom attractor outside the finite world
  const signal=sign*(field[q]-center);
  if(signal>best){best=signal;desired=dir;}
 }
 if(desired<0||desired===heading)return heading;
 if(chem.strength===2)return desired as CardinalHeading;
 // Rotate by at most one quarter-turn toward the measured gradient.
 // A 180-degree tie rotates clockwise, fixed across platforms.
 const delta=(desired-heading+4)%4;
 return ((heading+(delta===3?-1:1)+4)%4) as CardinalHeading;
}
/** Perform a single post-movement synchronous chemical update.
 * Independent agents deposit at their ACTUAL physical origin sites.
 * A multi-agent pileup adds multiple units, saturating at 255.
 * Stencil (4*center+N+E+S+W)/8; missing finite-edge neighbors
 * mirror the center value. All operations integer and synchronous.
 * Diffusion rounds down, so this is dissipative, not mass-conserving.
 */
export function stepTurmitePheromones(
 field:Uint8Array,w:number,h:number,wrap:boolean,
 origins:readonly {x:number;y:number}[],chem:TurmitePheromones):Uint8Array{
 if(!validTurmitePheromones(chem)||!Number.isInteger(w)||!Number.isInteger(h)||
    w<2||h<2||field.length!==w*h)
  throw new Error('Invalid T6 pheromone field');
 if(!chem.enabled)return field.slice();
 const deposited=field.slice();
 for(const a of origins){
  if(!Number.isInteger(a.x)||!Number.isInteger(a.y)||
     a.x<0||a.x>=w||a.y<0||a.y>=h)
   throw new Error('Invalid T6 physical agent origin');
  const p=a.y*w+a.x;
  deposited[p]=Math.min(255,deposited[p]+chem.deposit);
 }
 const out=new Uint8Array(field.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,v=deposited[p];
  let sum=4*v;
  for(const [dx,dy] of PHEROMONE_DIRS){
   const q=sampleIndex(x+dx,y+dy,w,h,wrap);
   sum+=q<0?v:deposited[q];
  }
  const mean=Math.floor(sum/8);
  const blended=Math.floor(((8-chem.diffusion)*v+chem.diffusion*mean)/8);
  out[p]=Math.max(0,blended-chem.evaporation);
 }
 return out;
}
export function pheromoneStats(field:Uint8Array|undefined):{
 occupied:number;total:number;peak:number}{
 if(!field)return {occupied:0,total:0,peak:0};
 let occupied=0,total=0,peak=0;
 for(const val of field){if(val>0)occupied++;total+=val;peak=Math.max(peak,val);}
 return {occupied,total,peak};
}
