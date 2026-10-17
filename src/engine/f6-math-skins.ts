/** F6A — three mathematical pigments, never new simulation rules.
 *
 * Each style derives differential quantities from LIVE cellular states and
 * their actual legal neighbors (including physical Penrose/Voronoi edges).
 * Formulas use only integer generation, seed geometry and appearance: exact
 * reproducibility in live preview, stills and frame-index GIF/video exports.
 */
import type {Appearance,World} from './types';
import {physicalGraph} from './physical-graph';
import {neighborOffsets,cellCentroid} from './topology';
import {palettePhase} from './funhouse';
type RGB=readonly [number,number,number];
export type F6Skin='prism'|'facets'|'spinodal';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const frac=(v:number)=>v-Math.floor(v);
function color(p:readonly RGB[],index:number):RGB{
 return p[((index%p.length)+p.length)%p.length]??[255,255,255];
}
function lerp(a:number,b:number,t:number){return a+(b-a)*t;}
function pigment(
 palette:readonly RGB[],index:number,mix:number,low:Uint8ClampedArray,k:number
):RGB{
 const a=color(palette,Math.floor(index)),b=color(palette,Math.floor(index)+1);
 const t=clamp(mix),base:RGB=[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
 // Respect the existing per-cell dual color mixer and other source processing:
 // if the artist patched two color sources, mix their actual source pigment
 // into the new material instead of disabling the patchbay.
 return [
  lerp(base[0],low[k],.28),
  lerp(base[1],low[k+1],.28),
  lerp(base[2],low[k+2],.28)
 ];
}
export function isF6Skin(s:string):s is F6Skin{
 return s==='prism'||s==='facets'||s==='spinodal';
}
export function drawF6Skin(
 ctx:CanvasRenderingContext2D,low:HTMLCanvasElement,
 world:World,a:Appearance,palette:RGB[],outW:number,outH:number,kind:F6Skin
):void{
 const {width:w,height:h,cells}=world,n=cells.length;
 const lc=low.getContext('2d');if(!lc)return;
 const source=lc.getImageData(0,0,w,h).data;
 const field=new Float32Array(n),gx=new Float32Array(n),gy=new Float32Array(n),
  laplace=new Float32Array(n);
 const graph=physicalGraph(world.lattice??'square',w,h,world.voronoiSeed,world.voronoiJitter);
 const frequency=Math.max(.5,Math.min(12,a.mathFrequency??4.5));
 const warp=Math.max(0,Math.min(2,a.mathWarp??.8));
 const ink=Math.max(0,Math.min(1,a.mathInk??.65));
 let scale=1;
 if(world.engine==='cyclic'||world.engine==='species'){
  for(const v of cells)scale=Math.max(scale,v);
 }
 for(let i=0;i<n;i++){
  const state=cells[i];
  field[i]=clamp(world.engine==='sandpile'?
    Math.log2(1+(world.grains?.[i]??state))/6:
    world.engine==='hpp'?(world.hppWalls?.[i]===1?1:state>0?.65:0):
    world.engine==='forestfire'?(state===2?1:state===1?.5:0):
    world.engine==='ising'?(state===1?1:0):
    world.engine==='cyclic'||world.engine==='species'?state/scale:
    world.engine==='hodgepodge'?state/(world.hodgeStates??48):
    state===0?Math.max(0,world.traces[i]??0)*.15:state===1?1:.68);
 }
 // Discrete derivatives on the actual cell graph; use physical centroids for
 // irregular polygon worlds. This is NOT a square convolution on Penrose.
 for(let i=0;i<n;i++){
  const x=i%w,y=(i/w)|0;
  let sum=0,nx=0,ny=0,degree=0;
  const px=graph?graph.centerX[i]:x+.5;
  const py=graph?graph.centerY[i]:y+.5;
  const visit=(q:number,dx:number,dy:number)=>{
   const dist2=Math.max(.001,dx*dx+dy*dy);
   const diff=field[q]-field[i];
   nx+=diff*dx/dist2;ny+=diff*dy/dist2;
   sum+=diff;degree++;
  };
  if(graph){
   for(let k=graph.starts[i];k<graph.starts[i+1];k++){
    const q=graph.edgeIds[k];visit(q,graph.centerX[q]-px,graph.centerY[q]-py);
   }
  }else{
   const offsets=neighborOffsets(world.lattice??'square',x,y,
     world.neighborShape??'moore',world.neighborMask??255,
     world.customStencilMask,world.customStencilSize);
   for(const [dx,dy] of offsets){
    let xx=x+dx,yy=y+dy;
    if(world.wrap){xx=(xx%w+w)%w;yy=(yy%h+h)%h;}
    else if(xx<0||xx>=w||yy<0||yy>=h)continue;
    // One normalized rule-stencil displacement per real neighbor. Non-square
    // packings still use their genuine engine-defined neighbor offsets.
    visit(yy*w+xx,dx,dy);
   }
  }
  gx[i]=degree?nx/Math.sqrt(degree):0;
  gy[i]=degree?ny/Math.sqrt(degree):0;
  laplace[i]=degree?sum/degree:0;
 }
 const img=lc.createImageData(w,h),data=img.data;
 const cycle=palettePhase(a,world.generation,palette.length);
 const time=world.generation*.015;
 for(let i=0;i<n;i++){
  const x=i%w,y=(i/w)|0,k=i*4;
  const u=(x+.5)/w,v=(y+.5)/h;
  const height=field[i],dx=gx[i],dy=gy[i],curv=laplace[i];
  const gradient=Math.hypot(dx,dy);
  let index=0,brightness=1,mask=1;
  if(kind==='prism'){
   // Chromatic diffraction: two oblique phase fields interfere, displaced
   // by the actual occupied-field slope and the evolving generation phase.
   const p=frequency*(u*1.73+v*.81+warp*dx*.35)+time;
   const q=frequency*(u*.61-v*1.49+warp*dy*.35)-time*.71;
   const signal=(Math.sin(2*Math.PI*p)+Math.sin(2*Math.PI*q))*.25+.5;
   index=signal*(palette.length-.0001)+cycle;
   brightness=.60+.40*Math.abs(Math.sin(Math.PI*(p-q)))*(.7+.3*height);
   mask=.24+.76*clamp(height*.85+gradient*2+Math.abs(curv)*.8);
  }else if(kind==='facets'){
   // Piecewise-constant directional crystalline facet sectors generated
   // from state-gradient orientation and local differential curvature.
   const angle=Math.atan2(dy,dx);
   const sides=Math.max(3,Math.min(16,Math.round(frequency+3)));
   const sector=Math.floor(frac(angle/(2*Math.PI)+.5)*sides);
   const band=Math.floor(clamp(height+curv*warp*.42)*5);
   index=sector+band*2+Math.floor(cycle);
   brightness=.70+.30*clamp((dx-dy)*2+curv*warp+1);
   mask=.14+.86*clamp(height*.82+gradient*1.7);
  }else{
   // Spinodal-looking isobands from the *real discrete Laplacian*
   // of the cellular occupancy field, NOT simulated chemical diffusion.
   const phase=frequency*(height+warp*curv*.65)+
     warp*.45*Math.sin(2*Math.PI*(u*1.9-v*.8))+
     time*.55;
   const band=frac(phase);
   index=Math.floor(phase)+cycle;
   brightness=.72+.28*Math.sin(Math.PI*band);
   mask=.20+.80*clamp(height*.88+Math.abs(curv)*1.8);
  }
  const stripe=kind==='facets'?0:
    kind==='spinodal'?Number(frac(frequency*(height+warp*curv*.65)+time*.55)<.055):
    Number(Math.abs(Math.sin(Math.PI*frequency*(u-v)+time))<.07);
  const border=clamp(gradient*2.8+stripe*.28)*ink;
  const base=pigment(palette,index,kind==='prism'?frac(index):0,source,k);
  for(let channel=0;channel<3;channel++){
   // Deliberately flat vivid ink, NEVER forced glow or a dark metallic wash.
   const bg=[9,6,23][channel];
   data[k+channel]=Math.round(clamp(
     (bg*(1-mask)+base[channel]*mask*brightness*(1-border*.75))/255
   )*255);
  }
  data[k+3]=255;
 }
 lc.putImageData(img,0,0);
 ctx.save();
 ctx.imageSmoothingEnabled=kind==='prism';
 ctx.drawImage(low,0,0,outW,outH);
 ctx.restore();
}
