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
import {isF6Skin} from './f6-math-skins';
import {isF6BSkin} from './f6b-math-skins';
import {sampleF6EEquation} from './f6e-micro-equations';
import type {ExtendedMicroSkin} from './f6e-micro-equations';
import {adaptiveMicroSamples,inkEdgeCoverage,tileBandVariation} from './f6f-quality';
import {prepareMicroLocalRotation,microEquationGeneration,microInkBandShift} from './f6g-micro-motion';
import {mutateMicroDomain,validateMicroDomainMode} from './f6h-domain-mutation';
import {microGraphPhaseOffsets,validateMicroPhaseMode} from './f6i-graph-phase';
const TAU=2*Math.PI,PI=Math.PI,clamp=(n:number)=>Math.max(0,Math.min(1,n));
const wrap=(n:number,max:number)=>((n%max)+max)%max;
/** One bounded workspace per destination context. Weak keys allow retired
 * canvases to be collected; scratch never scales with final output pixels. */
interface MicroWorkspace{
 canvas:HTMLCanvasElement;
 bandTile:Float32Array;
 valueTile:Float32Array;
 images:Map<number,ImageData>;
}
const scratch=new WeakMap<CanvasRenderingContext2D,MicroWorkspace>();
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
 occupancy:Float32Array;gx:Float32Array;gy:Float32Array;laplace:Float32Array
}{
 const {width:w,height:h,cells}=world,n=cells.length;
 const occupancy=new Float32Array(n),gx=new Float32Array(n),gy=new Float32Array(n),laplace=new Float32Array(n);
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
  let dx=0,dy=0,lap=0,degree=0;
  const accept=(q:number,ox:number,oy:number)=>{
   const delta=occupancy[q]-occupancy[i],r2=Math.max(.06,ox*ox+oy*oy);
   dx+=ox*delta/r2;dy+=oy*delta/r2;lap+=delta;degree++;
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
  laplace[i]=degree?lap/degree:0;
 }
 return {occupancy,gx,gy,laplace};
}
export function sampleMicroEquation(
 skin:'gyroid'|'inversion'|'cusp'|ExtendedMicroSkin,
 u:number,v:number,localX:number,localY:number,
 height:number,dx:number,dy:number,
 a:Appearance,generation:number,lap=0
):number{
 if(isF6Skin(skin)||isF6BSkin(skin)){
  return sampleF6EEquation(skin,u,v,localX,localY,height,dx,dy,a,generation,lap);
 }
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
 if(!isF6CSkin(a.skin)&&!isF6Skin(a.skin)&&!isF6BSkin(a.skin))return;
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
 const {occupancy,gx,gy,laplace}=fieldGradients(world);
 // Synchronous circular neighbor coupling is computed once per rendered frame,
 // not once per microscopic pigment sample. Off bypasses it entirely.
 const neighborPhase=microGraphPhaseOffsets(world,occupancy,{
  mode:validateMicroPhaseMode(a.mathMicroPhaseMode),
  strength:a.mathMicroPhaseStrength??.8,
  depth:a.mathMicroPhaseDepth??2
 });
 const palette=(a.palette?.length?a.palette:['#ffffff']).map(s=>{
  const hex=s.replace('#','');
  return /^[0-9a-f]{6}$/i.test(hex)?
   [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]:
   [255,255,255];
 });
 let workspace=scratch.get(ctx);
 if(!workspace){
  workspace={canvas:document.createElement('canvas'),
   bandTile:new Float32Array(0),valueTile:new Float32Array(0),
   images:new Map<number,ImageData>()};
  scratch.set(ctx,workspace);
 }
 const tile=workspace.canvas;
 // Fixed backing tile width PER FRAME, not per face. Only the needed sampled
 // rectangle is drawn, and every ImageData pixel is rewritten every polygon.
 const maxSide=budget.samples;
 if(tile.width!==maxSide)tile.width=maxSide;
 if(tile.height!==maxSide)tile.height=maxSide;
 const tc=tile.getContext('2d',{willReadFrequently:true});
 if(!tc)return;
 // Allocate only if quality requires a larger workspace. Tiles are at most
 // 28×28, and cached ImageData keys are integers 2..28: strictly bounded.
 const capacity=maxSide*maxSide;
 if(workspace.bandTile.length<capacity){
  workspace.bandTile=new Float32Array(capacity);
  workspace.valueTile=new Float32Array(capacity);
 }
 const bandTile=workspace.bandTile;
 const valueTile=workspace.valueTile;
 const images=workspace.images;
 const strengthLevel=Math.max(0,Math.min(3,Math.floor(a.mathMicroDetail??0)));
 const antialias=strengthLevel>=2;
 const globalMix=Math.min(.9,strength*.8);
 const lineMix=clamp(a.mathInk??.65);
 const phase=(world.generation/11)+(a.paletteOffset??0)+microInkBandShift(a.mathMicroBandShift??0);
 const microGen=microEquationGeneration(world.generation,a.mathMicroTimeRate??1);
 const microRotate=prepareMicroLocalRotation(a.mathMicroAngle??0);
 const domain=validateMicroDomainMode(a.mathMicroDomain);
 const domainOrder=a.mathMicroDomainOrder??3;
 const domainCoupling=a.mathMicroDomainCoupling??.8;
 ctx.save();
 ctx.imageSmoothingEnabled=antialias;
 if(antialias)ctx.imageSmoothingQuality='high';
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
  // Larger / rapidly varying physical polygons keep more samples. A face
  // occupying just a few target pixels cannot waste its full budget.
  const dim=adaptiveMicroSamples(maxSide,destW,destH,
   Math.hypot(gx[id],gy[id]),laplace[id],a.mathMicroFrequency??5);
  if(dim<2)continue;
  let pixels=images.get(dim);
  if(!pixels){pixels=tc.createImageData(dim,dim);images.set(dim,pixels);}
  const dst=pixels.data;
  const faceBand=id%3,faceNeighborPhase=neighborPhase?.[id]??0;
  for(let j=0;j<dim;j++)for(let i=0;i<dim;i++){
   const localX=(i+.5)/dim,localY=(j+.5)/dim;
   const px=left+localX*(right-left),py=top+localY*(bottom-top);
   const u=px/extentX,v=py/extentY;
   const [rotX,rotY]=microRotate(localX,localY);
   const [domainX,domainY]=domain==='none'?[rotX,rotY]:
    mutateMicroDomain(rotX,rotY,domain,
     domainOrder,domainCoupling,occupancy[id],gx[id],gy[id],laplace[id]);
   const value=sampleMicroEquation(a.skin,u,v,domainX,domainY,
    occupancy[id],gx[id],gy[id],a,microGen,laplace[id]);
   const phaseBand=a.skin==='gyroid'?(value+1.5)*2.7:
    a.skin==='cusp'?Math.sign(value)*2.2+Math.log1p(Math.abs(value))*5:
    a.skin==='facets'?(value+1)*5.5:
    (value+1)*3.1;
   const at=j*dim+i;
   valueTile[at]=value;
   bandTile[at]=phaseBand+phase+faceBand+faceNeighborPhase;
  }
  for(let j=0;j<dim;j++)for(let i=0;i<dim;i++){
   const at=j*dim+i,pixel=at*4;
   const band=bandTile[at],value=valueTile[at];
   const colorIndex=Math.floor(band);
   const color=palette[wrap(colorIndex,palette.length)];
   // A pixel's true finite-difference band slope estimates how much of a
   // palette edge it covers. Flat interiors do not receive blended pigments.
   const change=antialias?tileBandVariation(bandTile,dim,i,j):0;
   const edge=inkEdgeCoverage(band,change,antialias);
   const neighbor=edge.mix>0?palette[wrap(colorIndex+edge.offset,palette.length)]:color;
   const signal=Math.abs(a.skin==='cusp'?value:Math.sin(value*Math.PI));
   const ridge=(1-clamp(signal*4))*lineMix;
   for(let c=0;c<3;c++){
    const pigment=color[c]*(1-edge.mix)+neighbor[c]*edge.mix;
    dst[pixel+c]=Math.round(pigment*(1-ridge*.7));
   }
   dst[pixel+3]=Math.round(globalMix*255);
  }
  tc.putImageData(pixels,0,0);
  ctx.beginPath();ctx.moveTo(poly[0][0]*sx,poly[0][1]*sy);
  for(let k=1;k<poly.length;k++)ctx.lineTo(poly[k][0]*sx,poly[k][1]*sy);
  ctx.closePath();
  ctx.save();ctx.clip();
  ctx.drawImage(tile,0,0,dim,dim,destX,destY,destW,destH);
  ctx.restore();
  // No lingering clip, palette state or canvas transform across faces.
 }
 ctx.restore();
}
