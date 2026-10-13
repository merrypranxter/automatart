import type { Appearance, World } from './types';
import { renderSpecialSkin } from './skins';
import { projectionMap } from './topology';
import { palettePhase } from './funhouse';
import {sandStateColorIndex} from './circuits';
import { applyPrintShop } from './printshop';
import {computeColorSignal,isNewColorSignal,signalIndex} from './color-signals';
import {createDualSampler,hasEventColor} from './dual-color';

const bg:[number,number,number]=[9,6,23];
const backBuffers=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
function rgb(hex:string):[number,number,number]{
  const h=hex.replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(h))return [255,255,255];
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function bufferFor(canvas:HTMLCanvasElement,w:number,h:number):HTMLCanvasElement{
  let b=backBuffers.get(canvas);
  if(!b){b=document.createElement('canvas');backBuffers.set(canvas,b);}
  if(b.width!==w)b.width=w;
  if(b.height!==h)b.height=h;
  return b;
}
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const wrap=(value:number,n:number)=>((value%n)+n)%n;
function renderSquareWorld(canvas:HTMLCanvasElement,world:World,a:Appearance,outputWidth=900,outputHeight?:number):void{
  const w=world.width,h=world.height;
  const outW=outputWidth,outH=outputHeight??Math.round(outputWidth*h/w);
  if(canvas.width!==outW)canvas.width=outW;
  if(canvas.height!==outH)canvas.height=outH;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return;
  const low=bufferFor(canvas,w,h),lc=low.getContext('2d');
  if(!lc)return;
  const d=lc.createImageData(w,h);
  const pixels=d.data;
  // Exact 12-stop It's a Moiré palettes are used unmodified; interpolation
  // only changes the way the renderer samples these original stops.
  const palette=(a.palette.length?a.palette:['#ffffff']).map(rgb);
  const n=palette.length;
  const direction=a.paletteReverse?-1:1;
  const cycle=palettePhase(a,world.generation,n);
  const smooth=a.smoothPalette??false;
  const mappedSignal=a.dualColor?.enabled?null:computeColorSignal(world,a);
  const dual=a.dualColor?.enabled?createDualSampler(world,a,palette):null;
  const saturation=clamp(a.saturation??1,0,3);
  const contrast=clamp(a.contrast??1,0.2,3);
  const brightness=clamp(a.brightness??1,0.15,2.5);
  for(let i=0;i<world.cells.length;i++){
    const state=world.cells[i],trace=world.traces[i],k=i*4;
    const fossil=world.fossils?.[i]??0;
    const visible=world.engine==='cyclic'||state!==0||
      ((a.trails&&trace>0.025)||
        ((hasEventColor(a,'events')||hasEventColor(a,'birthFlash'))&&world.events[i]!==0)||
        (hasEventColor(a,'deathHeat')&&(world.events[i]===2||fossil>0.005))||
      ((a.fossilOpacity??0)>0&&fossil>0.02));
    if(!visible){pixels[k]=bg[0];pixels[k+1]=bg[1];pixels[k+2]=bg[2];pixels[k+3]=255;continue;}
    const x=i%w,y=Math.floor(i/w);
    let index=0;
    switch(a.colorBy){
      case 'state':index=world.engine==='sandpile'?sandStateColorIndex(world.grains?.[i]??state):state;break;
      case 'age':index=Math.log2(world.ages[i]+1);break;
      case 'neighbors':index=world.neighbors[i];break;
      case 'events':index=world.events[i]===1?0:world.events[i]===2?3:world.events[i]===3?4:2;break;
      case 'radius':index=Math.hypot((x-w/2)/w,(y-h/2)/h)*n*1.6;break;
      case 'x':index=(x/w)*n;break;
      case 'activity':index=(world.neighbors[i]*0.65+world.ages[i]*0.065+world.events[i]*2);break;
    }
    if(mappedSignal&&isNewColorSignal(a.colorBy))index=signalIndex(mappedSignal,i,n);
    const phase=wrap(direction*index+cycle,n);
    const first=Math.floor(phase);
    const second=(first+1)%n;
    const mix=smooth?phase-first:0;
    const c0=palette[first],c1=palette[second];
    const intensity=world.engine==='cyclic'||state>0?1:
      (hasEventColor(a,'deathHeat')?Math.min(1,Math.max(fossil,world.events[i]===2?1:0)*1.1):
        a.trails?Math.min(0.92,trace):world.events[i]===2?0.38:0);
    const raw=dual?dual.color(i):[
      c0[0]+(c1[0]-c0[0])*mix,
      c0[1]+(c1[1]-c0[1])*mix,
      c0[2]+(c1[2]-c0[2])*mix
    ];
    const gray=0.2126*raw[0]+0.7152*raw[1]+0.0722*raw[2];
    for(let j=0;j<3;j++){
      const vivid=gray+(raw[j]-gray)*saturation;
      const processed=((vivid-127.5)*contrast+127.5)*brightness;
      let value=clamp(bg[j]+(processed-bg[j])*intensity,0,255);
      // History deposits tint into empty places only; never participates in
      // the automaton's transition rules.
      if((a.fossilOpacity??0)>0&&fossil>0.02){
        const fossilColor=palette[(Math.floor(i/w+i%w+world.generation/9)+palette.length*100)%palette.length];
        const alpha=Math.min(0.84,(a.fossilOpacity??0)*fossil)*0.9;
        value=value*(1-alpha)+fossilColor[j]*alpha;
      }
      if((a.temporalRGB??0)>0){
        const current=world.engine==='cyclic'?((state%7)+1)/8:(state>0?1:0);
        const previous=world.previousCells?.[i]??state;
        const older=world.olderCells?.[i]??previous;
        const signal=(v:number)=>world.engine==='cyclic'?((v%7)+1)/8:(v>0?1:0);
        const channel=j===0?current:j===1?signal(previous):signal(older);
        const alpha=clamp(a.temporalRGB??0,0,1);
        value=value*(1-alpha)+(15+240*channel)*alpha;
      }
      pixels[k+j]=Math.round(clamp(value,0,255));
    }
    pixels[k+3]=255;
  }
  lc.putImageData(d,0,0);
  ctx.fillStyle='#090617';ctx.fillRect(0,0,outW,outH);
  ctx.imageSmoothingEnabled=a.skin!=='pixels';
  ctx.imageSmoothingQuality='high';
  if(!renderSpecialSkin(ctx,low,world,a,palette,outW,outH)){
    ctx.drawImage(low,0,0,outW,outH);
    // The bloom must be composited AFTER the opaque base frame; otherwise the
    // second base draw hides the blur completely.
    if(a.skin==='glow'&&(a.glowStrength??0.8)>0){
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.globalAlpha=clamp(a.glowStrength??0.8,0,1)*0.75;
      ctx.filter='blur('+Math.round(6+15*(a.glowStrength??0.8))+'px) saturate(1.75)';
      ctx.drawImage(low,0,0,outW,outH);
      ctx.restore();
    }
  }
  if(a.showGrid){
    const dx=outW/w,dy=outH/h,stride=Math.ceil(Math.max(w,h)/175);
    ctx.save();ctx.strokeStyle='rgba(255,255,255,0.16)';
    ctx.lineWidth=1;ctx.beginPath();
    for(let x=0;x<=w;x+=stride){const xx=Math.round(x*dx)+0.5;ctx.moveTo(xx,0);ctx.lineTo(xx,outH);}
    for(let y=0;y<=h;y+=stride){const yy=Math.round(y*dy)+0.5;ctx.moveTo(0,yy);ctx.lineTo(outW,yy);}
    ctx.stroke();ctx.restore();
  }
}

const latticeSources=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
/** Project the actual state grid to geometric tiles, AFTER the same visual
 * renderer used for squares. Both PDF/PNG and frame exporters call here.
 * Geometry changes neighborhood edges in sim.ts; this step renders them.
 */
export function renderWorld(canvas:HTMLCanvasElement,world:World,a:Appearance,outputWidth=900,outputHeight?:number):void{
  if(!world.lattice||world.lattice==='square'){
    renderSquareWorld(canvas,world,a,outputWidth,outputHeight);
    applyPrintShop(canvas,a,world);
    return;
  }
  const w=world.width,h=world.height;
  const outW=outputWidth,outH=outputHeight??Math.round(outputWidth*h/w);
  if(canvas.width!==outW)canvas.width=outW;
  if(canvas.height!==outH)canvas.height=outH;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return;
  let source=latticeSources.get(canvas);
  if(!source){source=document.createElement('canvas');latticeSources.set(canvas,source);}
  const sw=w*2,sh=h*2;
  renderSquareWorld(source,world,{...a,showGrid:false},sw,sh);
  const sc=source.getContext('2d');
  if(!sc)return;
  const sourcePixels=sc.getImageData(0,0,sw,sh).data;
  const map=projectionMap(world.lattice,w,h);
  const projected=bufferFor(canvas,map.width,map.height);
  const pc=projected.getContext('2d',{alpha:false});
  if(!pc)return;
  const frame=pc.createImageData(map.width,map.height),result=frame.data;
  const {indices,samples,width:pw,height:ph}=map;
  for(let i=0;i<indices.length;i++){
    const k=i*4,cell=indices[i];
    if(cell===0xffffffff){
      result[k]=9;result[k+1]=6;result[k+2]=23;result[k+3]=255;
      continue;
    }
    const sourceAt=samples[i]*4;
    let factor=1;
    if(a.showGrid){
      const x=i%pw,y=(i/pw)|0;
      if((x>0&&indices[i-1]!==cell)||(y>0&&indices[i-pw]!==cell))factor=.34;
    }
    result[k]=Math.round(sourcePixels[sourceAt]*factor);
    result[k+1]=Math.round(sourcePixels[sourceAt+1]*factor);
    result[k+2]=Math.round(sourcePixels[sourceAt+2]*factor);
    result[k+3]=255;
  }
  pc.putImageData(frame,0,0);
  ctx.fillStyle='#090617';ctx.fillRect(0,0,outW,outH);
  ctx.imageSmoothingEnabled=a.skin!=='pixels'&&a.skin!=='glass';
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(projected,0,0,outW,outH);
  applyPrintShop(canvas,a,world);
}
