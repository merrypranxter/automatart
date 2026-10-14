/** Optional EXTERNAL stimulus for Afterlife B/S/C and Excitable Flesh.
 *
 * These are forced variants, not the original autonomous CA rules.
 * A source can ignite ONLY resting (state 0) cells. Once excited/alive,
 * the original algorithm owns the following transitions and recovery.
 * All randomness is keyed by (universe seed, generation, cell, channel).
 */
import {random01} from './reaction-worlds';

export type WaveStimulus='off'|'sparks'|'clock';
export type WaveSource='center'|'quad'|'ring';
export interface WaveParameters{
 mode:WaveStimulus;
 source:WaveSource;
 rate:number;
 period:number;
 seed:number;
 generation:number;
}
export function validWaveParameters(p:WaveParameters):boolean{
 return ['off','sparks','clock'].includes(p.mode)&&
  ['center','quad','ring'].includes(p.source)&&
  Number.isFinite(p.rate)&&p.rate>=0&&p.rate<=.01&&
  Number.isInteger(p.period)&&p.period>=1&&p.period<=120;
}
/** Stateless clock-site geometry. Returns true only on real source cells. */
export function waveClockSite(x:number,y:number,w:number,h:number,source:WaveSource):boolean{
 if(source==='center')return x===Math.floor(w/2)&&y===Math.floor(h/2);
 if(source==='quad'){
  return [Math.floor(w/4),Math.floor(3*w/4)].includes(x)&&
   [Math.floor(h/4),Math.floor(3*h/4)].includes(y);
 }
 // Twelve distributed sources on an elliptical ring, no drawn image overlay.
 const cx=(w-1)/2,cy=(h-1)/2;
 const rx=Math.max(2,Math.round(w*.28)),ry=Math.max(2,Math.round(h*.28));
 for(let i=0;i<12;i++){
  const t=2*Math.PI*i/12;
  if(x===Math.round(cx+rx*Math.cos(t))&&
     y===Math.round(cy+ry*Math.sin(t)))return true;
 }
 return false;
}
export function waveStimulusAt(old:number,x:number,y:number,w:number,h:number,
 p:WaveParameters):boolean{
 if(old!==0||p.mode==='off')return false;
 if(p.mode==='sparks')return p.rate>0&&
  random01(p.seed,p.generation,y*w+x,93)<p.rate;
 return (p.generation+1)%p.period===0&&waveClockSite(x,y,w,h,p.source);
}
