/** F6H: mathematical coordinate-domain mutations INSIDE the existing actual
 * physical cell polygon. The clipping polygon and living CA never change.
 * Old recipes use 'none' and are mathematically/pixel-identical to F6G.
 */
export type MicroDomainMode='none'|'power'|'kaleidoscope'|'vortex';
export const MICRO_DOMAIN_MODES:readonly MicroDomainMode[]=['none','power','kaleidoscope','vortex'];
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const finite=(v:number,backup:number)=>Number.isFinite(v)?v:backup;
export function validateMicroDomainMode(value:unknown):MicroDomainMode {
 return MICRO_DOMAIN_MODES.includes(value as MicroDomainMode)?value as MicroDomainMode:'none';
}
/** Power: normalized z^n on the local centered complex disk.
 * Kaleidoscope: reflected N-fold polar angular domain (acos(cos(n*theta))/n).
 * Vortex: analytic radial angular shear, strongest toward the domain center.
 *
 * Cell-gradient coupling uses the original REAL physical neighbor derivatives
 * and remains bounded, deterministic, and visual-only. Caller already pays
 * for those derivatives in F6D; each call is constant-time.
 */
export function mutateMicroDomain(
 x:number,y:number,mode:MicroDomainMode,order:number,coupling:number,
 height:number,gx:number,gy:number,laplace:number
):[number,number] {
 if(mode==='none')return [x,y]; // exact legacy identity independent of knobs
 const n=Math.round(clamp(finite(order,3),2,8));
 const bend=clamp(finite(coupling,.8),0,2);
 const dx=finite(x,.5)-.5,dy=finite(y,.5)-.5;
 const radius=Math.hypot(dx,dy);
 const r=clamp(radius*Math.SQRT2,0,2);
 const theta=Math.atan2(dy,dx);
 let newRadius=radius,newAngle=theta;
 if(mode==='power'){
  // Exact normalized complex monomial: z_norm^n mapped to local radius.
  newRadius=Math.pow(r,n)/Math.SQRT2;
  newAngle=n*theta;
 }else if(mode==='kaleidoscope'){
  // Polar reflection into one N-fold fundamental wedge. Same wedge is
  // mirrored across all sectors; not a canvas image or post-hoc mirror.
  newAngle=Math.acos(clamp(Math.cos(n*theta),-1,1))/n;
 }else if(mode==='vortex'){
  // Continuous finite radial twist: rotation varies by radius.
  newAngle=theta+.55*n*Math.pow(Math.max(0,1-r),2);
 }else return [x,y];
 let ox=Math.cos(newAngle)*newRadius,oy=Math.sin(newAngle)*newRadius;
 if(bend>0){
  // Cells with different actual neighbor gradients advect the local domain
  // differently. Laplacian bends the perpendicular stream component.
  const gX=clamp(finite(gx,0),-2,2),gY=clamp(finite(gy,0),-2,2);
  const l=clamp(finite(laplace,0),-1,1);
  const h=clamp(finite(height,0),0,1);
  const flow=.11*bend*(.5+.5*h);
  ox+=flow*(gX-.45*l*oy);
  oy+=flow*(gY+.45*l*ox);
 }
 // Exact outer polygon clip still determines the composited region. This
 // protects the equation sampler from pathological inputs/numerical blowups.
 return [.5+clamp(ox,-1.25,1.25),.5+clamp(oy,-1.25,1.25)];
}
