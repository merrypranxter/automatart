/** F6B: three deterministic ink materials formed from real CA geometry.
 * Read-only: no writes to World. Animation uses integer generation only.
 * No glow/bloom required. Thin structures remain cell-source-resolution.
 */
import type {Appearance,World} from './types';
import {physicalGraph} from './physical-graph';
import {neighborOffsets} from './topology';
import {palettePhase} from './funhouse';

type RGB=readonly [number,number,number];
export type F6BSkin='quasicrystal'|'hyperbolic'|'lissajous';
export const isF6BSkin=(s:string):s is F6BSkin=>
 s==='quasicrystal'||s==='hyperbolic'||s==='lissajous';
const PI=Math.PI,TAU=2*PI;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const fract=(v:number)=>v-Math.floor(v);
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
function paletteInk(p:readonly RGB[],index:number,base:Uint8ClampedArray,k:number,interpolate:boolean):RGB{
 const i=Math.floor(index),v=fract(index);
 const c=p[((i%p.length)+p.length)%p.length]??[255,255,255];
 const d=p[(((i+1)%p.length)+p.length)%p.length]??c;
 const t=interpolate?v:0;
 // Keep artist's existing mapped/dual-color source visible, but preserve
 // new mathematical material's recognizable palette and sharp ink edges.
 return [
  lerp(lerp(c[0],d[0],t),base[k],.16),
  lerp(lerp(c[1],d[1],t),base[k+1],.16),
  lerp(lerp(c[2],d[2],t),base[k+2],.16)
 ];
}
export function drawF6BSkin(
 ctx:CanvasRenderingContext2D,low:HTMLCanvasElement,
 world:World,a:Appearance,palette:RGB[],outW:number,outH:number,
 kind:F6BSkin
):void{
 const {width:w,height:h,cells}=world,n=cells.length;
 const lc=low.getContext('2d');if(!lc)return;
 const source=lc.getImageData(0,0,w,h).data;
 const output=lc.createImageData(w,h),pixels=output.data;
 const field=new Float32Array(n),gx=new Float32Array(n),gy=new Float32Array(n),
  laplace=new Float32Array(n),uCoord=new Float32Array(n),vCoord=new Float32Array(n);
 const graph=physicalGraph(world.lattice??'square',w,h,world.voronoiSeed,world.voronoiJitter);
 const freq=Math.max(.5,Math.min(12,a.mathFrequency??4.5));
 const warp=Math.max(0,Math.min(2,a.mathWarp??.8));
 const ink=Math.max(0,Math.min(1,a.mathInk??.65));
 const fold=Math.max(3,Math.min(12,Math.round(a.mathFold??5)));
 const twist=Math.max(0,Math.min(2,a.mathTwist??.85));
 const seedPhase=((world.voronoiSeed??world.width*137+world.height*11)%997)*0.0001;
 const gen=world.generation;
 const phaseTime=gen*.019+seedPhase;
 const paletteCycle=palettePhase(a,gen,palette.length);
 let maxState=1;
 if(world.engine==='cyclic'||world.engine==='species')
  for(const value of cells)maxState=Math.max(maxState,value);
 for(let i=0;i<n;i++){
  const state=cells[i],trace=world.traces[i]??0;
  field[i]=clamp(
   world.engine==='sandpile'?Math.log2(1+(world.grains?.[i]??state))/6:
   world.engine==='hpp'?world.hppWalls?.[i]===1?1:state?0.7:0:
   world.engine==='forestfire'?state===2?1:state===1?.55:0:
   world.engine==='ising'?state===1?1:0:
   world.engine==='hodgepodge'?state/Math.max(1,world.hodgeStates??48):
   world.engine==='cyclic'||world.engine==='species'?state/maxState:
   state===1?1:state>1?.66:Math.max(0,trace)*.18);
  uCoord[i]=graph?graph.centerX[i]/graph.extent[0]:(i%w+.5)/w;
  vCoord[i]=graph?graph.centerY[i]/graph.extent[1]:(Math.floor(i/w)+.5)/h;
 }
 // A discrete differential on ACTUAL legal neighbor edges; two distorted
 // physical polygons only exchange information if their full edge is shared.
 for(let i=0;i<n;i++){
  let dx=0,dy=0,lap=0,count=0;
  const visit=(q:number,vx:number,vy:number)=>{
   const d=Math.max(.05,vx*vx+vy*vy),delta=field[q]-field[i];
   dx+=delta*vx/d;dy+=delta*vy/d;lap+=delta;count++;
  };
  if(graph){
   for(let k=graph.starts[i];k<graph.starts[i+1];k++){
    const q=graph.edgeIds[k];
    visit(q,graph.centerX[q]-graph.centerX[i],graph.centerY[q]-graph.centerY[i]);
   }
  }else{
   const x=i%w,y=Math.floor(i/w);
   const offsets=neighborOffsets(world.lattice??'square',x,y,
    world.neighborShape??'moore',world.neighborMask??255,
    world.customStencilMask,world.customStencilSize);
   for(const [ox,oy] of offsets){
    let xx=x+ox,yy=y+oy;
    if(world.wrap){xx=(xx+w)%w;yy=(yy+h)%h;}
    else if(xx<0||xx>=w||yy<0||yy>=h)continue;
    visit(yy*w+xx,ox,oy);
   }
  }
  gx[i]=count?dx/Math.sqrt(count):0;
  gy[i]=count?dy/Math.sqrt(count):0;
  laplace[i]=count?lap/count:0;
 }
 for(let i=0;i<n;i++){
  const u=uCoord[i],v=vCoord[i],k=i*4;
  const dx=gx[i],dy=gy[i],lap=laplace[i],state=field[i];
  let colorIndex=0,light=1,dark=0,mask=1;
  if(kind==='quasicrystal'){
   // Sum of independent plane waves whose wave vectors lie on a regular
   // fold-gon. Fivefold is the default nonperiodic/quasicrystal-like case.
   const px=(u-.5)*freq*TAU+warp*dx*1.8;
   const py=(v-.5)*freq*TAU+warp*dy*1.8;
   let wave=0,detail=0;
   for(let j=0;j<fold;j++){
    const angle=TAU*j/fold;
    const dot=px*Math.cos(angle)+py*Math.sin(angle)+phaseTime*(j%2===0?1:-.7);
    wave+=Math.cos(dot);detail+=Math.sin(dot*.5+twist*lap*3);
   }
   wave/=fold;detail/=fold;
   const band=clamp(.5+.43*wave+.2*detail+twist*lap*.18);
   const quant=Math.floor(band*palette.length*2.9);
   colorIndex=quant+Math.floor(paletteCycle+gen/12);
   light=.75+.25*clamp(.5+.5*detail);
   dark=ink*(Math.abs(fract(band*palette.length*2.9)-.5)<.11?.58:.05);
   mask=.65+.35*clamp(state+.2+Math.abs(lap)*1.8);
  }else if(kind==='hyperbolic'){
   // A genuine Möbius automorphism of the Poincaré disk:
   // w=(z-a)/(1-conj(a)z), with |a|<1 and |z|<1.
   // Then rho=atanh(|w|) is hyperbolic radial distance (scale factor 2
   // omitted because frequency already adjusts its radial wavelength).
   const zx=(u-.5)*1.34,zy=(v-.5)*1.34;
   const ar=Math.tanh(warp*dx+Math.sin(phaseTime)*twist*.3)*.3;
   const ai=Math.tanh(warp*dy+Math.cos(phaseTime)*twist*.3)*.3;
   const nr=zx-ar,ni=zy-ai;
   const dr=1-ar*zx-ai*zy,di=ai*zx-ar*zy;
   const norm=Math.max(1e-8,dr*dr+di*di);
   const wr=(nr*dr+ni*di)/norm,wi=(ni*dr-nr*di)/norm;
   const rad=Math.min(.995,Math.hypot(wr,wi));
   const rho=Math.atanh(rad),theta=Math.atan2(wi,wr);
   const angular=theta*fold/TAU+twist*lap*.75;
   const radial=rho*freq*.92+warp*state*.64+phaseTime*.24;
   const sectors=Math.floor(angular*2);
   const circles=Math.floor(radial*2);
   const checker=(sectors+circles)&1;
   colorIndex=circles*2+sectors+checker*3+Math.floor(paletteCycle);
   dark=ink*(Math.abs(fract(radial*2)-.5)<.095?.85:
     Math.abs(fract(angular*2)-.5)<.095?.66:0);
   light=.76+.24*checker;
   mask=.77+.23*clamp(state*.75+Math.abs(lap));
  }else{
   // Lissajous phase pair and over/under crossover parity:
   // ribbon A and B are independent sinusoids. At their intersections,
   // a deterministic parity bit selects which strand stays on top.
   const p=TAU*(freq*(u+warp*dx*.22)+twist*Math.sin(TAU*v*fold)/fold+phaseTime*.29);
   const q=TAU*(freq*(v+warp*dy*.22)+twist*Math.sin(TAU*u*(fold+1))/(fold+1)-phaseTime*.23);
   const aWave=Math.sin(p),bWave=Math.sin(q);
   const thickness=.20+.09*ink;
   const strandA=Math.abs(aWave)<thickness;
   const strandB=Math.abs(bWave)<thickness;
   const crossover=((Math.floor(p/PI)+Math.floor(q/PI))&1)===0;
   const top=strandA&&strandB?(crossover?0:1):strandA?0:strandB?1:2;
   const crossings=Math.floor((aWave*bWave+1)*palette.length*.5);
   colorIndex=top===2?crossings+Math.floor(paletteCycle):
     top===0?fold+Math.floor(paletteCycle+gen/10):
     fold*2+Math.floor(paletteCycle-gen/11);
   dark=ink*(top===2?.78:strandA&&strandB?.12:.03);
   light=top===2?.58:(top===0?1:.89);
   mask=.74+.26*clamp(state+.25+Math.abs(lap));
  }
  const c=paletteInk(palette,colorIndex,source,k,false);
  for(let j=0;j<3;j++){
   const background=[9,6,23][j];
   pixels[k+j]=Math.round(clamp((background*(1-mask)+c[j]*mask*light*(1-dark))/255)*255);
  }
  pixels[k+3]=255;
 }
 lc.putImageData(output,0,0);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(low,0,0,outW,outH);ctx.restore();
}
