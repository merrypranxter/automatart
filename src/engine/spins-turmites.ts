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
export interface TurmiteAgent {x:number;y:number;heading:0|1|2|3;memory?:number}
export type TurmiteFormation='orbit'|'stack'|'cross';
export type TurmiteContact='shared'|'repel';
export interface TurmiteDynamics{
 speciesCount:number;   // 1..4 stable species, indexed by agent ID modulo count
 speciesStride:number;  // 0..5 genuine rule-lookup offset per species
 speciesMirror:boolean; // odd species invert R<->L after rule lookup
 headingShear:number;   // 0..3: heading-dependent track rule index
 contact:TurmiteContact; // real co-location event before each agent round
}
export const DEFAULT_TURMITE_DYNAMICS:TurmiteDynamics={
 speciesCount:1,speciesStride:0,speciesMirror:false,headingShear:0,contact:'shared'
};
export function validTurmiteDynamics(v:TurmiteDynamics):boolean{
 return Number.isInteger(v.speciesCount)&&v.speciesCount>=1&&v.speciesCount<=4&&
  Number.isInteger(v.speciesStride)&&v.speciesStride>=0&&v.speciesStride<=5&&
  Number.isInteger(v.headingShear)&&v.headingShear>=0&&v.headingShear<=3&&
  typeof v.speciesMirror==='boolean'&&['shared','repel'].includes(v.contact);
}
/** The actual command read at this ant's heading, species and track state.
 * This is a transition-rule modification, not a visual material.
 */
export function turmiteTurnAt(rule:string,state:number,heading:number,species:number,
 v:TurmiteDynamics):'L'|'R'|'S'|'U'{
 if(!validTurmiteRule(rule)||!validTurmiteDynamics(v)||!Number.isInteger(state)||
    state<0||state>=rule.length||!Number.isInteger(heading)||heading<0||heading>3||
    !Number.isInteger(species)||species<0||species>=v.speciesCount)
  throw new Error('Invalid T2 Turmite transition input');
 const symbol=rule[(state+heading*v.headingShear+species*v.speciesStride)%rule.length] as 'L'|'R'|'S'|'U';
 return v.speciesMirror&&species%2===1?
  (symbol==='R'?'L':symbol==='L'?'R':symbol):symbol;
}
/** T3 independently selects which REAL indexed track pigment gets written.
 * Unlike the turning genome, this can be changed live without resetting art.
 */
export type TurmiteWriteMode='next'|'stride'|'erase'|'table';
export interface TurmiteWriteProgram{
 mode:TurmiteWriteMode;
 stride:number; // -12..12, true modular pigment jump
 table:readonly number[]; // 24 indexed target pigments, reduced modulo active genome length
}
export const DEFAULT_TURMITE_WRITE_PROGRAM:TurmiteWriteProgram={
 mode:'next',stride:1,table:Array.from({length:24},(_,i)=>(i+1)%24)
};
export function validTurmiteWriteProgram(v:TurmiteWriteProgram):boolean{
 return !!v&&['next','stride','erase','table'].includes(v.mode)&&
  Number.isInteger(v.stride)&&v.stride>=-12&&v.stride<=12&&
  Array.isArray(v.table)&&v.table.length===24&&
  v.table.every(x=>Number.isInteger(x)&&x>=0&&x<=23);
}
export function turmiteWriteAt(state:number,length:number,
 program:TurmiteWriteProgram=DEFAULT_TURMITE_WRITE_PROGRAM):number{
 if(!Number.isInteger(length)||length<2||length>24||
    !Number.isInteger(state)||state<0||state>=length||
    !validTurmiteWriteProgram(program))throw new Error('Invalid T3 Turmite write transition');
 if(program.mode==='erase')return 0;
 if(program.mode==='table')return program.table[state]%length;
 const jump=program.mode==='stride'?program.stride:1;
 return ((state+jump)%length+length)%length;
}
/** T4: real per-species writing programs and same-site reaction chemistry.
 * Species identity remains the T2 stable ant index; no snapshot schema change.
 */
export type TurmiteCollisionWrite='none'|'erase'|'invert'|'fuse';
export interface TurmiteAlchemy{
 enabled:boolean;
 species:readonly TurmiteWriteProgram[]; // exactly four independent programs
 collision:TurmiteCollisionWrite;
}
export const DEFAULT_TURMITE_ALCHEMY:TurmiteAlchemy={
 enabled:false,
 species:[
  DEFAULT_TURMITE_WRITE_PROGRAM,
  {...DEFAULT_TURMITE_WRITE_PROGRAM,mode:'stride',stride:-3},
  {...DEFAULT_TURMITE_WRITE_PROGRAM,mode:'erase'},
  {...DEFAULT_TURMITE_WRITE_PROGRAM,mode:'table',
   table:Array.from({length:24},(_,i)=>23-i)}
 ],
 collision:'none'
};
export function validTurmiteAlchemy(v:TurmiteAlchemy):boolean{
 return !!v&&typeof v.enabled==='boolean'&&
  ['none','erase','invert','fuse'].includes(v.collision)&&
  Array.isArray(v.species)&&v.species.length===4&&
  v.species.every(validTurmiteWriteProgram);
}
/** The returned value is ACTUAL outgoing Uint8 track pigment. A collision
 * happens only if 2+ agents started the current complete substep on THIS
 * site. Painting remains sequential, so a later ant reads earlier writes.
 */
export function turmiteAlchemyWriteAt(state:number,length:number,species:number,
 occupancy:number,global:TurmiteWriteProgram,alchemy:TurmiteAlchemy):number{
 if(!validTurmiteAlchemy(alchemy)||!Number.isInteger(species)||species<0||species>3||
    !Number.isInteger(occupancy)||occupancy<1||occupancy>12)
  throw new Error('Invalid T4 Turmite alchemy inputs');
 const program=alchemy.enabled?alchemy.species[species]:global;
 const product=turmiteWriteAt(state,length,program);
 if(!alchemy.enabled||occupancy<2||alchemy.collision==='none')return product;
 if(alchemy.collision==='erase')return 0;
 if(alchemy.collision==='invert')return length-1-product;
 // Fusion is a true order-sensitive modular chemical reaction: each
 // participant reacts with the current physical track color, the species
 // and the simultaneously counted number of occupants.
 return (product+occupancy+species+1)%length;
}
/** T5: each ant can carry an actual finite-state memory register.
 * It changes both the turn-rule index and the outgoing track pigment. The
 * register advances AFTER the physical write, so each following step really
 * depends on this agent's earlier encounters, not on a decorative overlay.
 */
export type TurmiteMemoryMode='tick'|'read'|'write'|'collision';
export interface TurmiteMemory{
 enabled:boolean;
 states:number;       // 2..24 independently addressable internal states
 mode:TurmiteMemoryMode;
 turnBias:number;     // 0..3 lookup displacement per memory phase
 writeBias:number;    // -3..3 outgoing pigment displacement per phase
}
export const DEFAULT_TURMITE_MEMORY:TurmiteMemory={
 enabled:false,states:8,mode:'read',turnBias:1,writeBias:0
};
export function validTurmiteMemory(v:TurmiteMemory):boolean{
 return !!v&&typeof v.enabled==='boolean'&&Number.isInteger(v.states)&&
  v.states>=2&&v.states<=24&&['tick','read','write','collision'].includes(v.mode)&&
  Number.isInteger(v.turnBias)&&v.turnBias>=0&&v.turnBias<=3&&
  Number.isInteger(v.writeBias)&&v.writeBias>=-3&&v.writeBias<=3;
}
export function turmiteMemoryAdvance(phase:number,read:number,written:number,
 occupancy:number,v:TurmiteMemory):number{
 if(!validTurmiteMemory(v)||!Number.isInteger(phase)||phase<0||phase>=v.states||
    !Number.isInteger(read)||read<0||read>23||
    !Number.isInteger(written)||written<0||written>23||
    !Number.isInteger(occupancy)||occupancy<1||occupancy>12)
  throw new Error('Invalid T5 Turmite memory transition');
 const increment=v.mode==='tick'?1:
  v.mode==='read'?read+1:
  v.mode==='write'?written+1:
  occupancy>1?occupancy:0;
 return (phase+increment)%v.states;
}
/** Shrinking a T5 cycle is a destructive operation on the REGISTER ONLY:
 * once phase 10 is reduced to 3 in a seven-state ring, expanding to 12
 * must never resurrect the old 10. Neither track paint nor positions change.
 * Absent legacy registers remain absent for exact T1–T4 compatibility.
 */
export function normalizeTurmiteAgentMemories(
 agents:readonly TurmiteAgent[],states:number):TurmiteAgent[]{
 if(!Number.isInteger(states)||states<2||states>24)
  throw new Error('Invalid T5 memory cycle size');
 return agents.map(agent=>{
  if(agent.memory===undefined)return {...agent};
  if(!Number.isInteger(agent.memory)||agent.memory<0||agent.memory>23)
   throw new Error('Invalid T5 stored agent memory');
  return {...agent,memory:agent.memory%states};
 });
}
/** Move precisely ONE stable agent identity, retaining every other agent and
 * every painted pixel. Return a new list, never mutate the saved source.
 */
export function relocateTurmiteAgent(agents:readonly TurmiteAgent[],w:number,h:number,
 agentId:number,x:number,y:number,heading:0|1|2|3):TurmiteAgent[]{
 if(!Array.isArray(agents)||!agents.length||agents.length>12||!Number.isInteger(w)||!Number.isInteger(h)||
    w<2||h<2||!Number.isInteger(agentId)||agentId<0||agentId>=agents.length||
    !Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=w||y<0||y>=h||
    !Number.isInteger(heading)||heading<0||heading>3)
  throw new Error('Invalid T3 Turmite placement');
 return agents.map((a,i)=>i===agentId?{...a,x,y,heading}:{...a});
}
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
/** Classic Langton's ant is RL. T1 extends the turn alphabet while
 * retaining every original LR trajectory:
 * R clockwise, L counter-clockwise, S go straight, U make a U-turn.
 * The read state chooses its command; writing increments it modulo
 * the rule length. Each agent reads the PREVIOUS agent's real paint in
 * stable array order. 2..24 track pigments are actual CA states.
 */
export function validTurmiteRule(value:unknown):value is string{
 return typeof value==='string'&&/^[LRSU]{2,24}$/.test(value);
}
export function seedTurmites(w:number,h:number,count:number,seed:number,
 formation:TurmiteFormation='orbit'):TurmiteAgent[]{
 if(!Number.isInteger(count)||count<1||count>12||w<2||h<2||
    !['orbit','stack','cross'].includes(formation))
  throw new Error('Invalid Turmite agent count');
 const cx=Math.floor(w/2),cy=Math.floor(h/2);
 return Array.from({length:count},(_,i)=>{
  if(count===1)return {x:cx,y:cy,heading:0 as const};
  if(formation==='stack')return {x:cx,y:cy,heading:(i%4) as 0|1|2|3};
  if(formation==='cross'){
   const offsets:readonly (readonly [number,number])[]=[[0,-1],[1,0],[0,1],[-1,0]];
   const [dx,dy]=offsets[i%4],distance=1+Math.floor(i/4);
   return {x:Math.min(w-1,Math.max(0,cx+dx*distance)),
    y:Math.min(h-1,Math.max(0,cy+dy*distance)),
    heading:((i+2)%4) as 0|1|2|3};
  }
  const angle=(2*Math.PI*i/count)+random01(seed,0,i,8)*0.25;
  const rx=Math.min(Math.floor(w/5),Math.max(2,Math.floor(w/8))),
    ry=Math.min(Math.floor(h/5),Math.max(2,Math.floor(h/8)));
  return {x:Math.min(w-1,Math.max(0,cx+Math.round(Math.cos(angle)*rx))),
    y:Math.min(h-1,Math.max(0,cy+Math.round(Math.sin(angle)*ry))),
    heading:(i%4) as 0|1|2|3};
 });
}
export function stepTurmites(cells:Uint8Array,w:number,h:number,wrap:boolean,
 rule:string,agents:readonly TurmiteAgent[],steps=1,
 dynamics:TurmiteDynamics=DEFAULT_TURMITE_DYNAMICS,
 write:TurmiteWriteProgram=DEFAULT_TURMITE_WRITE_PROGRAM,
 alchemy:TurmiteAlchemy=DEFAULT_TURMITE_ALCHEMY,
 memory:TurmiteMemory=DEFAULT_TURMITE_MEMORY):TurmiteResult{
 if(!validTurmiteRule(rule)||cells.length!==w*h||!agents.length||agents.length>12||
    !Number.isInteger(steps)||steps<1||steps>8||!validTurmiteDynamics(dynamics)||
    !validTurmiteWriteProgram(write)||!validTurmiteAlchemy(alchemy)||
    !validTurmiteMemory(memory))
  throw new Error('Invalid Turmite world or rule');
 const next=cells.slice();
 let current=agents.map(a=>({...a}));
 const vectors:readonly (readonly [number,number])[]=[[0,-1],[1,0],[0,1],[-1,0]];
 for(let substep=0;substep<steps;substep++){
 const moved:TurmiteAgent[]=[];
 // Read REAL co-location at the start of each round (before any agents
 // move). The decision is simultaneous; sequential paint remains ordered.
 const occupancy=new Map<number,number>();
 if(dynamics.contact==='repel'||(alchemy.enabled&&alchemy.collision!=='none')||
    (memory.enabled&&memory.mode==='collision'))
  for(const a of current){
   const key=a.y*w+a.x;occupancy.set(key,(occupancy.get(key)??0)+1);
  }
 for(const [agentId,a] of current.entries()){
  if(!Number.isInteger(a.x)||!Number.isInteger(a.y)||a.x<0||a.x>=w||
    a.y<0||a.y>=h||!Number.isInteger(a.heading)||a.heading<0||a.heading>3||
    (a.memory!==undefined&&(!Number.isInteger(a.memory)||a.memory<0||a.memory>23)))
    throw new Error('Invalid Turmite position or heading');
  const p=a.y*w+a.x,state=next[p];
  if(state>=rule.length)throw new Error('Invalid Turmite track state');
  const encounter=dynamics.contact==='repel'&&(occupancy.get(p)??0)>1;
  const startingHeading=encounter?((a.heading+2)%4) as 0|1|2|3:a.heading;
  const species=agentId%dynamics.speciesCount;
  const phase=(a.memory??0)%memory.states;
  const lookup=memory.enabled?(state+phase*memory.turnBias)%rule.length:state;
  const turn=turmiteTurnAt(rule,lookup,startingHeading,species,dynamics);
  const direction=turn==='R'?1:turn==='L'?3:turn==='U'?2:0;
  let heading=((startingHeading+direction)%4) as 0|1|2|3;
  const base=turmiteAlchemyWriteAt(state,rule.length,species,occupancy.get(p)??1,write,alchemy);
  const pigment=memory.enabled?
   ((base+phase*memory.writeBias)%rule.length+rule.length)%rule.length:base;
  next[p]=pigment;
  const nextMemory=memory.enabled?
   turmiteMemoryAdvance(phase,state,pigment,occupancy.get(p)??1,memory):a.memory;
  let x=a.x+vectors[heading][0],y=a.y+vectors[heading][1];
  if(wrap){x=(x+w)%w;y=(y+h)%h;}
  else if(x<0||x>=w||y<0||y>=h){
   heading=((heading+2)%4) as 0|1|2|3;
   x=a.x+vectors[heading][0];y=a.y+vectors[heading][1];
  }
  moved.push(nextMemory===undefined?{x,y,heading}:{x,y,heading,memory:nextMemory});
 }
 current=moved;
 }
 return {cells:next,agents:current};
}
