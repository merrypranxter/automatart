/** F6G — mathematically meaningful controls of the *subcell pigment* only.
 * Fixed-world deterministic transforms, no wall clock, no CA mutation.
 * Defaults are strict identity so old saved recipes keep their old art.
 */
const finite=(v:number,fallback:number)=>Number.isFinite(v)?v:fallback;
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));

/** Rotate the REAL intra-polygon equation's local 2-D coordinate plane.
 * Sampling remains inside the original genuine clipping polygon; unlike
 * a CSS transform, these coordinates enter the mathematical equations.
 */
export function microLocalRotation(x:number,y:number,degrees:number):[number,number]{
 const angle=clamp(finite(degrees,0),-180,180);
 if(angle===0)return [x,y]; // exact default parity
 const rad=angle*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);
 const dx=x-.5,dy=y-.5;
 return [.5+dx*c-dy*s,.5+dx*s+dy*c];
}

/** Time of the microscopic equations relative to integer CA generations.
 * Zero removes explicit generation phase from the subcell equation, but
 * cellular gradients / live pigment palette may still move with the world.
 */
export function microEquationGeneration(generation:number,rate:number):number{
 return generation*clamp(finite(rate,1),-3,3);
}

/** Shift microscopic *palette bands*, not the base skin nor simulation.
 * Fractional values are meaningful with the F6F narrow ink-edge blending.
 */
export function microInkBandShift(shift:number):number{
 return clamp(finite(shift,0),-8,8);
}

/** F6J: prepare one rotation for an ENTIRE frame, instead of evaluating
 * Math.sin/Math.cos for every microscopic sample. Exact arithmetic matches
 * microLocalRotation for all allowed finite angles, including identity.
 * Deliberately not memoized globally: no recipe or rendering state leaks.
 */
export function prepareMicroLocalRotation(degrees:number):
 (x:number,y:number)=>[number,number]{
 const angle=clamp(finite(degrees,0),-180,180);
 if(angle===0)return (x,y)=>[x,y];
 const rad=angle*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);
 return (x,y)=>{
  const dx=x-.5,dy=y-.5;
  return [.5+dx*c-dy*s,.5+dx*s+dy*c];
 };
}
