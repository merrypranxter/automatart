/** F6C: implicit gyroid, exact plane circle inversion and cusp discriminant.
 * These are deterministic render-only pigments of REAL living CA geometry.
 * Each source cell maps to one material sample; polygon exporters still clip
 * at full resolution, but this does not invent extra source-cell detail.
 */
import type {Appearance,World} from './types';
import {physicalGraph} from './physical-graph';
import {neighborOffsets} from './topology';
import {palettePhase} from './funhouse';

export type F6CSkin='gyroid'|'inversion'|'cusp';
export const isF6CSkin=(value:string):value is F6CSkin=>
 value==='gyroid'||value==='inversion'||value==='cusp';
type RGB=readonly [number,number,number];
const TAU=2*Math.PI,PI=Math.PI;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const fraction=(v:number)=>v-Math.floor(v);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
/** Exact signed gyroid implicit equation (zero-level surface). */
export function gyroidLevel(x:number,y:number,z:number):number{
 return Math.sin(x)*Math.cos(y)+Math.sin(y)*Math.cos(z)+Math.sin(z)*Math.cos(x);
}
/** Exact Euclidean circle inversion about center (cx,cy).
 * The inversion pole itself is not a finite point; it is intentionally
 * represented as null and assigned a distinct colored singularity pixel. */
export function circleInversion(
 x:number,y:number,cx:number,cy:number,radius:number
):readonly [number,number]|null{
 const dx=x-cx,dy=y-cy,d2=dx*dx+dy*dy;
 if(d2<1e-14)return null;
 const factor=radius*radius/d2;
 return [cx+factor*dx,cy+factor*dy];
}
/** The true canonical cusp catastrophe discriminant:
 * cubic stationary points of V(t)=t^4/4+u*t²/2+v*t
 * collide exactly where 4u³+27v²=0. */
export function cuspDiscriminant(u:number,v:number):number{
 return 4*u*u*u+27*v*v;
}
function paletteColor(
 p:readonly RGB[],index:number,source:Uint8ClampedArray,k:number
):RGB{
 const i=((Math.floor(index)%p.length)+p.length)%p.length;
 const col=p[i]??[255,255,255];
 const fractionFromOriginal=.14;
 return [mix(col[0],source[k],fractionFromOriginal),
         mix(col[1],source[k+1],fractionFromOriginal),
         mix(col[2],source[k+2],fractionFromOriginal)];
}
export function drawF6CSkin(
 ctx:CanvasRenderingContext2D,low:HTMLCanvasElement,world:World,
 appearance:Appearance,palette:RGB[],outW:number,outH:number,kind:F6CSkin
):void{
 const {width:w,height:h,cells}=world,n=cells.length;
 const lc=low.getContext('2d');if(!lc||palette.length===0)return;
 const original=lc.getImageData(0,0,w,h).data;
 const result=lc.createImageData(w,h),data=result.data;
 const heights=new Float32Array(n),gx=new Float32Array(n),
  gy=new Float32Array(n),laplace=new Float32Array(n),
  us=new Float32Array(n),vs=new Float32Array(n);
 const graph=physicalGraph(world.lattice??'square',w,h,world.voronoiSeed,world.voronoiJitter);
 const frequency=Math.max(.5,Math.min(12,appearance.mathFrequency??4.5));
 const warp=Math.max(0,Math.min(2,appearance.mathWarp??.8));
 const ink=Math.max(0,Math.min(1,appearance.mathInk??.65));
 const fold=Math.max(3,Math.min(12,Math.round(appearance.mathFold??5)));
 const twist=Math.max(0,Math.min(2,appearance.mathTwist??.85));
 const slice=Math.max(-2,Math.min(2,appearance.mathSlice??0));
 const centerX=Math.max(.05,Math.min(.95,appearance.mathPoleX??.5));
 const centerY=Math.max(.05,Math.min(.95,appearance.mathPoleY??.5));
 const generation=world.generation;
 const phase=palettePhase(appearance,generation,palette.length);
 const time=generation*.021;
 let maxState=1;
 if(world.engine==='cyclic'||world.engine==='species'){
  for(const cell of cells)maxState=Math.max(maxState,cell);
 }
 for(let id=0;id<n;id++){
  const state=cells[id],trace=world.traces[id]??0;
  heights[id]=clamp(
   world.engine==='sandpile'?Math.log2(1+(world.grains?.[id]??state))/6:
   world.engine==='hpp'?world.hppWalls?.[id]===1?1:state>0?.7:0:
   world.engine==='forestfire'?state===2?1:state===1?.55:0:
   world.engine==='ising'?state===1?1:0:
   world.engine==='hodgepodge'?state/Math.max(1,world.hodgeStates??48):
   world.engine==='cyclic'||world.engine==='species'?state/maxState:
   state===1?1:state>1?.65:Math.max(0,trace)*.18);
  // Real polygon centroid positioning, not packed-array Euclidean location.
  us[id]=graph?graph.centerX[id]/graph.extent[0]:((id%w)+.5)/w;
  vs[id]=graph?graph.centerY[id]/graph.extent[1]:(Math.floor(id/w)+.5)/h;
 }
 // True physical shared-edge differences, with graph-native centroid
 // lengths in aperiodic worlds; legal rule offsets on regular tilings.
 for(let id=0;id<n;id++){
  let dx=0,dy=0,lap=0,degree=0;
  const visit=(q:number,ux:number,uy:number)=>{
   const dist=Math.max(.06,ux*ux+uy*uy);
   const difference=heights[q]-heights[id];
   dx+=difference*ux/dist;dy+=difference*uy/dist;
   lap+=difference;degree++;
  };
  if(graph){
   for(let j=graph.starts[id];j<graph.starts[id+1];j++){
    const q=graph.edgeIds[j];
    visit(q,graph.centerX[q]-graph.centerX[id],graph.centerY[q]-graph.centerY[id]);
   }
  }else{
   const x=id%w,y=Math.floor(id/w);
   const offsets=neighborOffsets(world.lattice??'square',x,y,
     world.neighborShape??'moore',world.neighborMask??255,
     world.customStencilMask,world.customStencilSize);
   for(const [ox,oy] of offsets){
    let xx=x+ox,yy=y+oy;
    if(world.wrap){xx=(xx%w+w)%w;yy=(yy%h+h)%h;}
    else if(xx<0||xx>=w||yy<0||yy>=h)continue;
    visit(yy*w+xx,ox,oy);
   }
  }
  gx[id]=degree?dx/Math.sqrt(degree):0;
  gy[id]=degree?dy/Math.sqrt(degree):0;
  laplace[id]=degree?lap/degree:0;
 }
 for(let id=0;id<n;id++){
  const k=id*4,cell=heights[id],dx=gx[id],dy=gy[id],lap=laplace[id];
  const u=us[id],v=vs[id];
  let band=0,shade=1,outline=0,coverage=1;
  if(kind==='gyroid'){
   // A true slice z=z0+field(x,y,t) through a 3D triply periodic
   // gyroid implicit surface. XY are shifted by REAL live CA gradients.
   const x=TAU*frequency*(u-centerX)*.45+warp*dx*.65;
   const y=TAU*frequency*(v-centerY)*.45+warp*dy*.65;
   const z=PI*slice+twist*cell*TAU*.58+time*.62;
   const level=gyroidLevel(x,y,z);
   // Signed isosurface sectors and narrow |level| zero crossings.
   band=Math.floor((level+1.5)*fold*1.4)+Math.floor(phase);
   const distance=Math.abs(level);
   const zeroRidge=clamp((.21-distance)*5);
   outline=ink*(.06+.84*zeroRidge);
   shade=.77+.23*clamp(.5+level*.35+lap*.25);
   coverage=.78+.22*clamp(cell+Math.abs(lap));
  }else if(kind==='inversion'){
   // Actual involutive circle inversion, NOT inverse-distance noise.
   // The pole can be positioned with independent artist X/Y knobs.
   const x=(u-.5)*2+warp*dx*.23;
   const y=(v-.5)*2+warp*dy*.23;
   const cx=(centerX-.5)*1.65,cy=(centerY-.5)*1.65;
   const radius=.26+fold*.047;
   const inverse=circleInversion(x,y,cx,cy,radius);
   if(inverse===null){
    band=fold+Math.floor(phase);shade=1;outline=0;coverage=1;
   }else{
    const [xx,yy]=inverse;
    const r=Math.hypot(xx,yy),angle=Math.atan2(yy,xx);
    const radial=frequency*r*.82+slice*.5+time*.45+
      twist*lap*.35;
    const angular=angle*fold/TAU+cell*twist*.45;
    band=Math.floor(radial*2.3)+Math.floor(angular*2)+Math.floor(phase);
    const ring=Math.min(fraction(radial*2.3),1-fraction(radial*2.3));
    outline=ink*(ring<.11?.8:.03);
    shade=.78+.22*clamp(.5+.5*Math.sin(angle*fold+time+cell*twist));
    coverage=.74+.26*clamp(cell+.2+Math.abs(lap)*2);
   }
  }else{
   // Cusp catastrophe's true 4u³ + 27v² discriminant, repeated across
   // rotated sectors of the plane. The living field deforms u and v.
   const rx=(u-centerX)*2.2,ry=(v-centerY)*2.2;
   const ang=Math.atan2(ry,rx)+twist*.35+time*.12;
   const sector=Math.floor((ang+PI)/TAU*fold);
   const direction=TAU*sector/fold+twist*.35;
   const co=Math.cos(direction),si=Math.sin(direction);
   const xx=rx*co+ry*si+warp*dx*.22;
   const yy=-rx*si+ry*co+warp*dy*.22+slice*.24;
   const uu=xx*1.14-0.37+cell*warp*.24;
   const vv=yy*.72+lap*warp*.15;
   const discriminant=cuspDiscriminant(uu,vv);
   // Signed regime separates one-vs-three real stationary points,
   // while logarithmic bands reveal the fold surface near the cusp.
   const signed=discriminant<0?-1:1;
   const compress=Math.log1p(Math.abs(discriminant));
   band=Math.floor(compress*frequency*.85)+
     (signed<0?fold:0)+Math.floor(phase);
   const edge=1-clamp(Math.abs(discriminant)*1.65);
   outline=ink*(edge*.85+.02);
   shade=.72+.28*clamp(.55+signed*.25+cell*.25);
   coverage=.76+.24*clamp(cell+.2+Math.abs(lap));
  }
  const pigment=paletteColor(palette,band,original,k);
  for(let channel=0;channel<3;channel++){
   const bg=[9,6,23][channel];
   data[k+channel]=Math.round(clamp(
     (bg*(1-coverage)+pigment[channel]*coverage*shade*(1-outline))/255
   )*255);
  }
  data[k+3]=255;
 }
 lc.putImageData(result,0,0);
 ctx.save();
 ctx.imageSmoothingEnabled=false; // saturated hard-ink art, not obligatory blur.
 ctx.drawImage(low,0,0,outW,outH);
 ctx.restore();
}
