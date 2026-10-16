/** T8 KURAMITES: discrete spatially coupled phase oscillators.
 * Each ant carries a persistent 0..255 circular phase, independent of its
 * T5 history register and independent of the two T6/T7 scent lattices.
 * It is a true discretized Kuramoto-type transition, not color cycling.
 */
export interface TurmiteRhythm{
 enabled:boolean;
 frequency:number;       // 0..32 base phase ticks per microstep
 detune:number;          // 0..16 extra ticks per stable species index
 coupling:number;        // -32..32: attractive vs repulsive sinusoidal sync
 radius:number;          // 1..32 physical agent-neighbor coupling distance
 chemistry:number;       // -16..16: signed A-B shifts oscillator frequency
 mode:'phase'|'pulse'|'inverse';
 turnBias:number;        // 0..3: alter actual rule lookup
 writeBias:number;       // -3..3: alter actual outgoing paint
}
export const DEFAULT_TURMITE_RHYTHM:TurmiteRhythm={
 enabled:false,frequency:12,detune:2,coupling:16,radius:12,
 chemistry:0,mode:'phase',turnBias:1,writeBias:1
};
export function validTurmiteRhythm(v:TurmiteRhythm):boolean{
 return !!v&&typeof v.enabled==='boolean'&&
  Number.isInteger(v.frequency)&&v.frequency>=0&&v.frequency<=32&&
  Number.isInteger(v.detune)&&v.detune>=0&&v.detune<=16&&
  Number.isInteger(v.coupling)&&v.coupling>=-32&&v.coupling<=32&&
  Number.isInteger(v.radius)&&v.radius>=1&&v.radius<=32&&
  Number.isInteger(v.chemistry)&&v.chemistry>=-16&&v.chemistry<=16&&
  ['phase','pulse','inverse'].includes(v.mode)&&
  Number.isInteger(v.turnBias)&&v.turnBias>=0&&v.turnBias<=3&&
  Number.isInteger(v.writeBias)&&v.writeBias>=-3&&v.writeBias<=3;
}
export interface PhaseAgent{
 x:number;y:number;rhythmPhase?:number;alive?:boolean;
}
export function initialRhythmPhase(id:number):number{
 if(!Number.isInteger(id)||id<0||id>=12)throw new Error('Invalid T8 identity');
 return (id*73)%256; // zero for lone ants, spread phases for multi-ant start
}
export function phaseOf(agent:PhaseAgent,id:number):number{
 const phase=agent.rhythmPhase??initialRhythmPhase(id);
 if(!Number.isInteger(phase)||phase<0||phase>255)
  throw new Error('Invalid T8 stored oscillator phase');
 return phase;
}
/** Eight sectors of the genuine 256-state phase ring, before moving.
 * Pulse gates open for one of eight sectors; inverse runs backward around
 * the ring. All are rule/pigment feedback and do not edit visual colors.
 */
export function rhythmIndex(phase:number,mode:TurmiteRhythm['mode']):number{
 if(!Number.isInteger(phase)||phase<0||phase>255)
  throw new Error('Invalid T8 oscillator phase');
 const sector=Math.floor(phase/32);
 return mode==='pulse'?(sector===0?1:0):mode==='inverse'?(8-sector)%8:sector;
}
const SIN_Q=Array.from({length:256},(_,i)=>
 Math.round(1024*Math.sin(2*Math.PI*i/256)));
/** JavaScript Math.round(-x.5) rounds toward +infinity, creating a false
 * one-tick net drift in two-agent symmetric couplings. Quantize the signed
 * Kuramoto force symmetrically, including exact negative half-ties.
 */
const roundSigned=(n:number):number=>n<0?-Math.round(-n):Math.round(n);
function torusDistance(a:number,b:number,extent:number,wrap:boolean):number{
 const d=Math.abs(a-b);
 return wrap?Math.min(d,extent-d):d;
}
/** All phases advance SYNCHRONOUSLY using the same pre-step positions,
 * real prior phases and prior chemical concentrations. The local Kuramoto
 * coupling is K * SUM(w_ij sin(theta_j-theta_i)) / SUM(w_ij), with linear
 * spatial kernel w_ij=max(0,R-dist). Positive K tends to synchronize
 * neighbors; negative K frustrates/inverts their alignment.
 *
 * Integer fixed-point sine lookup means deterministic exact replay.
 * Rounding and modulo 256 make this a discrete approximation rather than
 * an exact continuous-time Kuramoto solution.
 */
export function stepRhythmPhases(
 agents:readonly PhaseAgent[],speciesCount:number,
 w:number,h:number,wrap:boolean,
 settings:TurmiteRhythm,a?:Uint8Array,b?:Uint8Array
):number[]{
 if(!validTurmiteRhythm(settings)||agents.length<1||agents.length>12||
  !Number.isInteger(speciesCount)||speciesCount<1||speciesCount>4||
  !Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||
  (a!==undefined&&a.length!==w*h)||(b!==undefined&&b.length!==w*h))
  throw new Error('Invalid T8 rhythm field');
 const phases=agents.map((v,i)=>phaseOf(v,i));
 for(const agent of agents)if(!Number.isInteger(agent.x)||!Number.isInteger(agent.y)||
  agent.x<0||agent.y<0||agent.x>=w||agent.y>=h)
  throw new Error('Invalid T8 agent coordinate');
 if(!settings.enabled)return phases;
 return agents.map((ant,i)=>{
  if(ant.alive===false)return phases[i]; // Dormant clocks do not run.
  const p=ant.y*w+ant.x,phase=phases[i],r=settings.radius;
  let sum=0,totalWeight=0;
  for(let j=0;j<agents.length;j++){
   if(j===i||agents[j].alive===false)continue;
   const other=agents[j];
   const dx=torusDistance(ant.x,other.x,w,wrap);
   const dy=torusDistance(ant.y,other.y,h,wrap);
   const distance=Math.hypot(dx,dy);
   if(distance>=r)continue;
   const weight=r-distance;
   sum+=weight*SIN_Q[(phases[j]-phase+256)%256];
   totalWeight+=weight;
  }
  const coupling=totalWeight>0?
    roundSigned(settings.coupling*sum/(1024*totalWeight)):0;
  const chemicalPotential=(a?.[p]??0)-(b?.[p]??0);
  const chemistry=Math.round(settings.chemistry*chemicalPotential/255);
  const next=phase+settings.frequency+(i%speciesCount)*settings.detune+
   coupling+chemistry;
  return ((next%256)+256)%256;
 });
}
export function rhythmOrderParameter(agents:readonly PhaseAgent[]):number{
 const living=agents.map((a,i)=>({a,i})).filter(x=>x.a.alive!==false);
 if(living.length===0)return 0;
 let cosine=0,sine=0;
 for(const {a:agent,i} of living){
  const theta=phaseOf(agent,i)*2*Math.PI/256;
  cosine+=Math.cos(theta);sine+=Math.sin(theta);
 }
 return Math.sqrt(cosine*cosine+sine*sine)/living.length;
}
