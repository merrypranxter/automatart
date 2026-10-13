/** HPP (Hardy–Pomeau–de Pazzis) four-velocity square-lattice gas.
 * Bit directions: N=1, E=2, S=4, W=8. At most one particle per
 * directional channel, so each cell contains a 4-bit mask 0..15.
 * Collision: exactly N+S <-> E+W; all other patterns pass through.
 * Streaming is synchronous: particles travel one cell in their direction.
 * Wall/finite-edge impacts are specular reflections onto the source cell,
 * into the opposite velocity. This conserves particle count.
 * This is HPP's anisotropic toy hydrodynamics, NOT full Navier–Stokes.
 */
export const HPP_DIRECTIONS = [
 {bit:1,dx:0,dy:-1,label:'N'},
 {bit:2,dx:1,dy:0,label:'E'},
 {bit:4,dx:0,dy:1,label:'S'},
 {bit:8,dx:-1,dy:0,label:'W'}
] as const;
export type HppMask=number;
const reverse=(bit:number)=>bit===1?4:bit===2?8:bit===4?1:2;
export function hppCount(mask:number):number{
 let n=0;for(const d of HPP_DIRECTIONS)if((mask&d.bit)!==0)n++;
 return n;
}
export function hppParticleCount(cells:Uint8Array):number{
 let n=0;for(const c of cells)n+=hppCount(c);
 return n;
}
export function hppMomentum(cells:Uint8Array):[number,number]{
 let x=0,y=0;
 for(const c of cells){
  x+=(c&2?1:0)-(c&8?1:0);
  y+=(c&4?1:0)-(c&1?1:0);
 }
 return [x,y];
}
export function collideHpp(mask:number):number{
 if(mask===5)return 10; // N+S -> E+W
 if(mask===10)return 5; // E+W -> N+S
 return mask;
}
export function stepHpp(cells:Uint8Array,w:number,h:number,wrap:boolean,
 walls:Uint8Array):Uint8Array{
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||
    cells.length!==w*h||walls.length!==w*h)
  throw new Error('HPP grid dimensions disagree');
 const next=new Uint8Array(cells.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,mask=cells[p];
  if(mask>15||walls[p]>1||(walls[p]&&mask!==0))
   throw new Error('Invalid HPP world: walls and particle masks conflict');
  if(walls[p])continue;
  const outgoing=collideHpp(mask);
  for(const d of HPP_DIRECTIONS){
   if(!(outgoing&d.bit))continue;
   let nx=x+d.dx,ny=y+d.dy;
   let target=-1;
   if(wrap){nx=(nx+w)%w;ny=(ny+h)%h;target=ny*w+nx;}
   else if(nx>=0&&nx<w&&ny>=0&&ny<h)target=ny*w+nx;
   if(target<0||walls[target]){
    // The reflected channel is located at the SOURCE cell.
    next[p]|=reverse(d.bit);
   }else next[target]|=d.bit;
  }
 }
 return next;
}
/** Only for use by a deliberate user brush, never by the HPP stepper. */
export function paintHpp(cells:Uint8Array,walls:Uint8Array,
 indices:readonly number[],tool:'particles'|'walls',
 mask:number,mode:'paint'|'erase'|'invert'):void{
 if(cells.length!==walls.length||!Number.isInteger(mask)||mask<1||mask>15)
  throw new Error('Invalid HPP paint state');
 for(const i of indices){
  if(!Number.isInteger(i)||i<0||i>=cells.length)continue;
  if(tool==='walls'){
   const wall=mode==='paint'?1:mode==='erase'?0:walls[i]^1;
   walls[i]=wall;
   if(wall)cells[i]=0;
  }else{
   if(walls[i])continue; // particles cannot be placed inside solid walls
   cells[i]=mode==='paint'?cells[i]|mask:
    mode==='erase'?cells[i]&(~mask&15):cells[i]^mask;
  }
 }
}
