/** F6E — genuine fine-position evaluation of the six F6A/F6B equations.
 * One bounded scalar sample per subcell coordinate. No mutation of physical CA,
 * no independent wall-clock, and no pretending index-grid neighbors are
 * Penrose/Voronoi neighbors. The caller supplies actual cellular derivatives.
 */
import type {Appearance} from './types';
import type {F6Skin} from './f6-math-skins';
import type {F6BSkin} from './f6b-math-skins';

export type ExtendedMicroSkin=F6Skin|F6BSkin;
const PI=Math.PI,TAU=PI*2;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const fract=(v:number)=>v-Math.floor(v);

/** Return a mathematically structured [-1,1] pigment signal. A local
 * subcell position is sampled explicitly, instead of enlarging one cell
 * color across the entire polygon. It is deterministic for any generation.
 */
export function sampleF6EEquation(
 skin:ExtendedMicroSkin,
 u:number,v:number,localX:number,localY:number,
 height:number,dx:number,dy:number,
 a:Appearance,generation:number,lap=0
):number{
 const frequency=Math.max(.5,Math.min(12,a.mathFrequency??4.5));
 const micro=Math.max(.5,Math.min(12,a.mathMicroFrequency??5));
 const warp=Math.max(0,Math.min(2,a.mathWarp??.8));
 const twist=Math.max(0,Math.min(2,a.mathTwist??.85));
 const fold=Math.max(3,Math.min(12,Math.round(a.mathFold??5)));
 const time=generation*.019;
 // Bounded extra cycles WITHIN a true polygon, while preserving its
 // global position in the 2D mathematical field.
 const x=u+(localX-.5)*micro*.064;
 const y=v+(localY-.5)*micro*.064;
 if(skin==='prism'){
  const p=frequency*(x*1.73+y*.81+warp*dx*.35)+time;
  const q=frequency*(x*.61-y*1.49+warp*dy*.35)-time*.71;
  return (Math.sin(TAU*p)+Math.sin(TAU*q))*.5;
 }
 if(skin==='facets'){
  // Piecewise constant facet sectors, rather than an accidental gradient
  // blur. Live-field slope displaces the angular partition center.
  const fx=(localX-.5)*micro*.12+dx*warp*.8;
  const fy=(localY-.5)*micro*.12+dy*warp*.8;
  const sector=Math.floor(fract(Math.atan2(fy,fx)/TAU+.5)*fold);
  const band=Math.floor(clamp(height+lap*warp*.42)*5);
  return 2*fract((sector+band*2+Math.floor(generation/8))/Math.max(3,fold)) - 1;
 }
 if(skin==='spinodal'){
  // Laplacian-coupled banding on the live field. This is a visual
  // isoband equation, NOT a reaction-diffusion physics update.
  const phase=frequency*(height+warp*lap*.65)+
    warp*.45*Math.sin(TAU*(x*1.9-y*.8))+
    micro*(localX*.63-localY*.41)+time*.55;
  return Math.sin(TAU*phase);
 }
 if(skin==='quasicrystal'){
  // A genuinely fivefold by default plane-wave superposition. Angular
  // fold order changes the wave vectors themselves, not just palette stops.
  const px=(x-.5)*frequency*TAU+warp*dx*1.8;
  const py=(y-.5)*frequency*TAU+warp*dy*1.8;
  let wave=0,detail=0;
  for(let j=0;j<fold;j++){
   const angle=TAU*j/fold;
   const dot=px*Math.cos(angle)+py*Math.sin(angle)+time*(j%2===0?1:-.7);
   wave+=Math.cos(dot);
   detail+=Math.sin(dot*.5+twist*lap*3);
  }
  return Math.max(-1,Math.min(1,(wave/fold)*.74+(detail/fold)*.26));
 }
 if(skin==='hyperbolic'){
  // The exact unit-disk Möbius automorphism of F6B,
  // (z-a)/(1-conj(a)z), evaluated at new subcell coordinates.
  const zx=(x-.5)*1.34,zy=(y-.5)*1.34;
  const ar=Math.tanh(warp*dx+Math.sin(time)*twist*.3)*.3;
  const ai=Math.tanh(warp*dy+Math.cos(time)*twist*.3)*.3;
  const nr=zx-ar,ni=zy-ai;
  const dr=1-ar*zx-ai*zy,di=ai*zx-ar*zy;
  const denom=Math.max(1e-8,dr*dr+di*di);
  const wr=(nr*dr+ni*di)/denom,wi=(ni*dr-nr*di)/denom;
  const rad=Math.min(.995,Math.hypot(wr,wi));
  const rho=Math.atanh(rad),theta=Math.atan2(wi,wr);
  const radial=rho*frequency*.92+warp*height*.64+time*.24;
  const angular=theta*fold/TAU+twist*lap*.75;
  const parity=(Math.floor(radial*2)+Math.floor(angular*2))&1;
  return Math.sin(TAU*(radial+angular*.27))*(parity?.85:1);
 }
 // Lissajous braid: mathematically distinct nonlinear stripe phases.
 // At crossings, parity chooses which strand is in front; exposed
 // signal remains crisp enough to see individual over/under moves.
 const p=TAU*(frequency*(x+warp*dx*.22)+
   twist*Math.sin(TAU*y*fold)/fold+time*.29);
 const q=TAU*(frequency*(y+warp*dy*.22)+
   twist*Math.sin(TAU*x*(fold+1))/(fold+1)-time*.23);
 const aWave=Math.sin(p),bWave=Math.sin(q);
 const strandA=Math.abs(aWave)<.23;
 const strandB=Math.abs(bWave)<.23;
 const over=((Math.floor(p/PI)+Math.floor(q/PI))&1)===0;
 if(strandA&&strandB)return over?.88:-.88;
 if(strandA)return .65;
 if(strandB)return -.65;
 return Math.sin(p)*Math.sin(q)*.45;
}
