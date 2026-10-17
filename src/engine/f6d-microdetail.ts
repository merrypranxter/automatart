/** F6D: bounded subcell sampling of the ACTUAL F6C mathematical equations.
 *
 * No large output-resolution framebuffer is allocated, and no fake square
 * masks are used for aperiodic/irregular faces. Tiny reusable RGBA tiles are
 * independently sampled inside each real physical polygon and composited
 * through its exact clipping path. This is opt-in; default old pixels remain
 * bit-for-bit unchanged.
 */
import type {World,Appearance} from './types';
import {geometryExtent,polygonForCell,neighborOffsets} from './topology';
import {physicalGraph} from './physical-graph';
import {penrosePatch} from './penrose';
import {voronoiPatch} from './voronoi';
import {gyroidLevel,circleInversion,cuspDiscriminant,isF6CSkin} from './f6c-math-skins';
const TAU=2*Math.PI,PI=Math.PI,clamp=(n:number)=>Math.max(0,Math.min(1,n));
const wrap=(n:number,max:number)=>((n%max)+max)%max;
const scratch=new WeakMap<CanvasRenderingContext2D,HTMLCanvasElement>();
export interface MicroBudget {
 enabled:boolean;
 samples:number;
 estimatedSamples:number;
 maxSamples:number;
}
/** Samples per polygon side are restricted by a GLOBAL finite work budget.
 * Preview runs at 80k/120k/180k samples; exported frames at
 * 100k/240k/420k. The quality knob cannot blow up to 8K pixels * cells.
 */
export function microBudget(cellCount:number,level:number,quality:'preview'|'export'):MicroBudget{
 const l=Number.isFinite(level)?Math.max(0,Math.min(3,Math.floor(level))):0;
 if(!l||!Number.isInteger(cellCount)||cellCount<1)
  return {enabled:false,samples:0,estimatedSamples:0,maxSamples:0};
 const limits=quality==='export'?[0,100000,240000,420000]:[0,80000,120000,180000];
 const maxSamples=limits[l];
 const samples=Math.max(2,Math.min(l===1?12:l===2?20:28,
   Math.floor(Math.sqrt(maxSamples/cellCount))));
 return {enabled:true,samples,estimatedSamples:samples*samples*cellCount,maxSamples};
}
/** Local physical field gradient (not packed-array spatial approximations).
 * With exact shared polygon edges in Penrose/Voronoi, and established rule
 * offsets in six other lattice types. */
function fieldGradients(world:World):{
 occupancy:Float32Array;gx:Float32Array;gy:Float32Array
}{
 const {width:w,height:h,cells}=world,n=cells.length;
 const occupancy=new Float32Array(n),gx=new Float32Array(n),gy=new Float32Array(n);
 let states=1;
 if(world.engine==='cyclic'||world.engine==='species')
  for(const state of cells)states=Math.max(states,state);
 for(let i=0;i<n;i++){
  const state=cells[i];
  occupancy[i]=clamp(world.engine==='sandpile'?
   Math.log2(1+(world.grains?.[i]??state))/6:
   world.engine==='hpp'?world.hppWalls?.[i]===1?1:state>0?.7:0:
   world.engine==='forestfire'?state===2?1:state===1?.55:0:
   world.engine==='ising'?state===1?1:0:
   world.engine==='hodgepodge'?state/Math.max(1,world.hodgeStates??48):
   world.engine==='cyclic'||world.engine==='species'?state/states:
   state===1?1:state>1?.65:Math.max(0,world.traces[i]??0)*.18);
 }
 const graph=physicalGraph(world.lattice??'square',w,h,world.voronoiSeed,world.voronoiJitter);
 for(let i=0;i<n;i++){
  let dx=0,dy=0,degree=0;
  const accept=(q:number,ox:number,oy:number)=>{
   const delta=occupancy[q]-occupancy[i],r2=Math.max(.06,ox*ox+oy*oy);
   dx+=ox*delta/r2;dy+=oy*delta/r2;degree++;
  };
  if(graph){
   for(let k=graph.starts[i];k<graph.starts[i+1];k++){
    const q=graph.edgeIds[k];
    accept(q,graph.centerX[q]-graph.centerX[i],graph.centerY[q]-graph.centerY[i]);
   }
  }else{
   // Use the real engine-selected legal stencil on all six other tilings.
   const x=i%w,y=Math.floor(i/w);
   const offsets=neighborOffsets(world.lattice??'square',x,y,
    world.neighborShape??'moore',world.neighborMask??255,
    world.customStencilMask,world.customStencilSize);
   for(const [ox,oy] of offsets){
    let xx=x+ox,yy=y+oy;
    if(world.wrap){xx=wrap(xx,w);yy=wrap(yy,h);}
    else if(xx<0||yy<0||xx>=w||yy>=h)continue;
    accept(yy*w+xx,ox,oy);
   }
  }
  gx[i]=degree?dx/Math.sqrt(degree):0;
  gy[i]=degree?dy/Math.sqrt(degree):0;
 }
 return {occupancy,gx,gy};
}
export function sampleMicroEquation(
 skin:'gyroid'|'inversion'|'cusp',
 u:number,v:number,localX:number,localY:number,
 height:number,dx:number,dy:number,
 a:Appearance,generation:number
):number{
 const frequency=Math.max(.5,Math.min(12,a.mathFrequency??4.5));
 const micro=Math.max(.5,Math.min(12,a.mathMicroFrequency??5));
 const warp=Math.max(0,Math.min(2,a.mathWarp??.8));
 const twist=Math.max(0,Math.min(2,a.mathTwist??.85));
 const fold=Math.max(3,Math.min(12,Math.round(a.mathFold??5)));
 const cx=Math.max(.05,Math.min(.95,a.mathPoleX??.5));
 const cy=Math.max(.05,Math.min(.95,a.mathPoleY??.5));
 const slice=Math.max(-2,Math.min(2,a.mathSlice??0));
 const time=generation*.021;
 // Fine coordinate changes explicitly evaluate the mathematical function
 // at multiple distinct positions WITHIN the same original source cell.
 const lx=(localX-.5)*TAU*micro,ly=(localY-.5)*TAU*micro;
 if(skin==='gyroid'){
  const x=TAU*frequency*(u-cx)*.45+lx+warp*dx*.65;
  const y=TAU*frequency*(v-cy)*.45+ly+warp*dy*.65;
  const z=PI*slice+twist*height*TAU*.58+time*.62;
  return gyroidLevel(x,y,z);
 }
 if(skin==='inversion'){
  const x=(u-.5)*2+warp*dx*.23+lx*.15;
  const y=(v-.5)*2+warp*dy*.23+ly*.15;
  const px=(cx-.5)*1.65,py=(cy-.5)*1.65;
  const inverse=circleInversion(x,y,px,py,.26+fold*.047);
  if(!inverse)return 0; // exact pole has no finite inverse
  const [ix,iy]=inverse;
  const r=Math.hypot(ix,iy),theta=Math.atan2(iy,ix);
  return Math.sin(TAU*(r*frequency*.82+theta*fold/TAU+
    twist*height*.45+slice*.5+time*.45));
 }
 const xx=(u-cx)*2.2+lx*.15+warp*dx*.2;
 const yy=(v-cy)*2.2+ly*.15+warp*dy*.2+slice*.24;
 const sector=Math.floor(((Math.atan2(yy,xx)+PI)/TAU)*fold);
 const angle=TAU*sector/fold+twist*.35;
 const co=Math.cos(angle),si=Math.sin(angle);
 const U=(xx*co+yy*si)*1.14-.37+height*warp*.24;
 const V=(-xx*si+yy*co)*.72;
 const d=cuspDiscriminant(U,V);
 // Monotonic arctangent compression retains true small differences even
 // in large signed-cusp regimes; tanh can numerically saturate to ±1.
 return Math.atan(d*.45)/(PI/2);
}
/** Draw high-frequency RGBA as a *single reusable small tile* per physical
 * polygon. An actual polygon clips it; there are no stale colors across
 * generations, no giant RGBA buffer, and no changes to simulation state.
 */
export function applyF6DMicrodetail(
 ctx:CanvasRenderingContext2D,world:World,a:Appearance,
 outputWidth:number,outputHeight:number,quality:'preview'|'export'
):void{
 if(!isF6CSkin(a.skin))return;
 const {width:w,height:h}=world,n=w*h;
 const budget=microBudget(n,a.mathMicroDetail??0,quality);
 if(!budget.enabled)return;
 const strength=clamp(a.mathMicroMix??.65);
 if(strength<=0)return;
 const shape=world.lattice??'square';
 const [extentX,extentY]=geometryExtent(shape,w,h);
 const sx=outputWidth/extentX,sy=outputHeight/extentY;
 const patch=shape==='penrose'?penrosePatch(w,h):null;
 const vor=shape==='voronoi'?voronoiPatch(w,h,world.voronoiSeed??1,world.voronoiJitter??.34):null;
 const {occupancy,gx,gy}=fieldGradients(world);
 const palette=(a.palette?.length?a.palette:['#ffffff']).map(s=>{
  const hex=s.replace('#','');
  return /^[0-9a-f]{6}$/i.test(hex)?
   [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]:
   [255,255,255];
 });
 let tile=scratch.get(ctx);
 if(!tile){tile=document.createElement('canvas');scratch.set(ctx,tile);}
 const dim=budget.samples;
 if(tile.width!==dim)tile.width=dim;
 if(tile.height!==dim)tile.height=dim;
 const tc=tile.getContext('2d',{willReadFrequently:true});
 if(!tc)return;
 const pixels=tc.createImageData(dim,dim),dst=pixels.data;
 const globalMix=Math.min(.9,strength*.8);
 const lineMix=clamp(a.mathInk??.65);
 const phase=(world.generation/11)+(a.paletteOffset??0);
 ctx.save();
 ctx.imageSmoothingEnabled=quality==='preview';
 for(let id=0;id<n;id++){
  const poly=patch?patch.tiles[id].vertices:vor?vor.cells[id].polygon:
   polygonForCell(shape,id%w,Math.floor(id/w),w,h);
  if(poly.length<3)continue;
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const [x,y] of poly){
   left=Math.min(left,x);right=Math.max(right,x);
   top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(!Number.isFinite(left)||right-left<=1e-9||bottom-top<=1e-9)continue;
  const destX=left*sx,destY=top*sy,destW=(right-left)*sx,destH=(bottom-top)*sy;
  if(destW<2||destH<2)continue;
  for(let j=0;j<dim;j++)for(let i=0;i<dim;i++){
   const localX=(i+.5)/dim,localY=(j+.5)/dim;
   const px=left+localX*(right-left),py=top+localY*(bottom-top);
   const u=px/extentX,v=py/extentY;
   const value=sampleMicroEquation(a.skin,u,v,localX,localY,
    occupancy[id],gx[id],gy[id],a,world.generation);
   const phaseBand=a.skin==='gyroid'?(value+1.5)*2.7:
    a.skin==='cusp'?Math.sign(value)*2.2+Math.log1p(Math.abs(value))*5:
    (value+1)*3.1;
   const colorIndex=Math.floor(phaseBand+phase+id%3);
   const color=palette[wrap(colorIndex,palette.length)];
   const signal=Math.abs(a.skin==='cusp'?value:Math.sin(value*Math.PI));
   const ridge=(1-clamp(signal*4))*lineMix;
   const pixel=(j*dim+i)*4;
   for(let c=0;c<3;c++)dst[pixel+c]=Math.round(color[c]*(1-ridge*.7));
   dst[pixel+3]=Math.round(globalMix*255);
  }
  tc.putImageData(pixels,0,0);
  ctx.beginPath();ctx.moveTo(poly[0][0]*sx,poly[0][1]*sy);
  for(let k=1;k<poly.length;k++)ctx.lineTo(poly[k][0]*sx,poly[k][1]*sy);
  ctx.closePath();
  ctx.save();ctx.clip();
  ctx.drawImage(tile,destX,destY,destW,destH);
  ctx.restore();
  // No lingering clip or canvas state across cell draws.
 }
 ctx.restore();
}
