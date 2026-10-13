/** C3: square lattice Ising checkerboard Metropolis + multi-agent Turmites.
 * Both are discrete, seeded deterministic mathematical engines.
 * Ising s_i=+1 for byte 1 and -1 for byte 0.
 * H=-J Σ_<ij> s_i s_j -h Σ_i s_i (each edge counted once).
 * Two color checkerboard Metropolis passes per sweep, at all even dimensions
 * (including both periodic axes), give valid conditional Gibbs transitions.
 */
import {random01} from './reaction-worlds';

const CARDINAL:readonly (readonly [number,number])[]=[[0,-1],[1,0],[0,1],[-1,0]];
export interface IsingRule{
 temperature:number; coupling:number; field:number;sweeps:number;
 seed:number;generation:number;
}
export interface TurmiteAgent {x:number;y:number;heading:0|1|2|3}
export interface TurmiteResult{cells:Uint8Array;agents:TurmiteAgent[]}
const indexAt=(x:number,y:number,w:number,h:number,wrap:boolean):number=>{
 if(wrap){x=(x+w)%w;y=(y+h)%h;}
 else if(x<0||y<0||x>=w||y>=h)return -1;
 return y*w+x;
};
export function stepIsing(cells:Uint8Array,w:number,h:number,wrap:boolean,r:IsingRule):Uint8Array{
 if(cells.length!==w*h||w<2||h<2||w%2||h%2)
  throw new Error('Ising requires an even-by-even square grid');
 if(!Number.isFinite(r.temperature)||r.temperature<0||r.temperature>5||
    !Number.isFinite(r.coupling)||r.coupling< -2||r.coupling>2||
    !Number.isFinite(r.field)||r.field< -2||r.field>2||
    !Number.isInteger(r.sweeps)||r.sweeps<1||r.sweeps>4||
    !Number.isSafeInteger(r.generation)||r.generation<0||!Number.isFinite(r.seed))
  throw new Error('Invalid Ising controls');
 const result=cells.slice();
 for(const v of result)if(v>1)throw new Error('Invalid Ising spin');
 for(let sweep=0;sweep<r.sweeps;sweep++)for(let parity=0;parity<2;parity++){
  // Same-parity cells share no cardinal edges on an even torus or finite
  // boundary, so updates within this pass are conditionally independent.
  for(let y=0;y<h;y++)for(let x=(parity^(y&1));x<w;x+=2){
   const p=y*w+x,spin=result[p]===1?1:-1;
   let around=0;
   for(const [dx,dy] of CARDINAL){
    const q=indexAt(x+dx,y+dy,w,h,wrap);
    if(q>=0)around+=result[q]===1?1:-1;
   }
   const deltaE=2*spin*(r.coupling*around+r.field);
   // At T=0, energetically neutral spin flips are legal.
   if(deltaE<=0||(r.temperature>0&&
       random01(r.seed,r.generation,p,sweep*2+parity)<Math.exp(-deltaE/r.temperature)))
     result[p]^=1;
  }
 }
 return result;
}
export function isingMagnetization(cells:Uint8Array):number{
 let up=0;
 for(const v of cells)up+=v===1?1:0;
 return cells.length?2*up/cells.length-1:0;
}
export function isingEnergy(cells:Uint8Array,w:number,h:number,wrap:boolean,
 coupling:number,field:number):number{
 if(cells.length!==w*h)throw new Error('Ising energy dimensions disagree');
 let bonds=0,mag=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,spin=cells[p]?1:-1;mag+=spin;
  // Each horizontal/vertical bond appears exactly once.
  for(const [dx,dy] of [[1,0],[0,1]]){
   const q=indexAt(x+dx,y+dy,w,h,wrap);
   if(q>=0)bonds+=spin*(cells[q]?1:-1);
  }
 }
 return -coupling*bonds-field*mag;
}
/** Classic Langton's ant is RL: on an empty cell turn R, write state 1,
 * then on state 1 turn L, write state 0. Rule strings are clockwise R/L
 * turns indexed by the cell's current color (2..12 colors).
 * Agents are advanced in stable array order when paths collide.
 */
export function validTurmiteRule(value:unknown):value is string{
 return typeof value==='string'&&/^[LR]{2,12}$/.test(value);
}
export function seedTurmites(w:number,h:number,count:number,seed:number):TurmiteAgent[]{
 if(!Number.isInteger(count)||count<1||count>12||w<2||h<2)
  throw new Error('Invalid Turmite agent count');
 const cx=Math.floor(w/2),cy=Math.floor(h/2);
 return Array.from({length:count},(_,i)=>{
  if(count===1)return {x:cx,y:cy,heading:0 as const};
  const angle=(2*Math.PI*i/count)+random01(seed,0,i,8)*0.25;
  const rx=Math.min(Math.floor(w/5),Math.max(2,Math.floor(w/8))),
    ry=Math.min(Math.floor(h/5),Math.max(2,Math.floor(h/8)));
  return {x:Math.min(w-1,Math.max(0,cx+Math.round(Math.cos(angle)*rx))),
    y:Math.min(h-1,Math.max(0,cy+Math.round(Math.sin(angle)*ry))),
    heading:(i%4) as 0|1|2|3};
 });
}
export function stepTurmites(cells:Uint8Array,w:number,h:number,wrap:boolean,
 rule:string,agents:readonly TurmiteAgent[]):TurmiteResult{
 if(!validTurmiteRule(rule)||cells.length!==w*h||!agents.length||agents.length>12)
  throw new Error('Invalid Turmite world or rule');
 const next=cells.slice(),moved:TurmiteAgent[]=[];
 const vectors:readonly (readonly [number,number])[]=[[0,-1],[1,0],[0,1],[-1,0]];
 for(const a of agents){
  if(!Number.isInteger(a.x)||!Number.isInteger(a.y)||a.x<0||a.x>=w||
    a.y<0||a.y>=h||!Number.isInteger(a.heading)||a.heading<0||a.heading>3)
    throw new Error('Invalid Turmite position or heading');
  const p=a.y*w+a.x,state=next[p];
  if(state>=rule.length)throw new Error('Invalid Turmite track state');
  const direction=rule[state]==='R'?1:3;
  let heading=((a.heading+direction)%4) as 0|1|2|3;
  next[p]=(state+1)%rule.length;
  let x=a.x+vectors[heading][0],y=a.y+vectors[heading][1];
  if(wrap){x=(x+w)%w;y=(y+h)%h;}
  else if(x<0||x>=w||y<0||y>=h){
   heading=((heading+2)%4) as 0|1|2|3;
   x=a.x+vectors[heading][0];y=a.y+vectors[heading][1];
  }
  moved.push({x,y,heading});
 }
 return {cells:next,agents:moved};
}
