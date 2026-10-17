import type {Appearance,World} from './types';
import {drawF6Skin,isF6Skin} from './f6-math-skins';
import {drawF6BSkin,isF6BSkin} from './f6b-math-skins';
import {drawF6CSkin,isF6CSkin} from './f6c-math-skins';
import { palettePhase } from './funhouse';
import {computeColorSignal,signalIndex} from './color-signals';
import {createDualSampler} from './dual-color';

type RGB=[number,number,number];
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
function density(world:World):Float32Array{
  const {width:w,height:h,cells}=world;
  const result=new Float32Array(cells.length);
  let highest=1;
  if(world.engine==='cyclic'||world.engine==='species'){
    for(let i=0;i<cells.length;i++)highest=Math.max(highest,cells[i]);
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,v=cells[i];
    let strength=world.engine==='sandpile'?Math.min(1,Math.log2((world.grains?.[i]??v)+1)/5):
      world.engine==='hpp'?(world.hppWalls?.[i]?1:Math.min(1,v===0?0:(v.toString(2).replace(/0/g,'').length)/3)):
      world.engine==='ising'?v===1?1:.48:
      world.engine==='turmites'?v?Math.min(1,.35+.65*v/Math.max(1,(world.turmiteRule?.length??2)-1)):0:
      world.engine==='hodgepodge'?Math.min(1,v/(world.hodgeStates??48)):
      world.engine==='forestfire'?v===2?1:v===1?.55:0:
      world.engine==='wireworld'?v===2?1:v===3?.7:v===1?.3:0:
      world.engine==='cyclic'||world.engine==='species'?v/highest:
      v===1?1:v>1?0.66:0;
    strength=Math.max(strength,(world.traces[i]??0)*0.18);
    result[i]=strength;
  }
  const smoothed=new Float32Array(result.length);
  // Five-tap blur of a genuine cell-state field; a VISUAL layer, not a CA.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,up=(y>0?i-w:i),down=(y<h-1?i+w:i);
    const left=x>0?i-1:i,right=x<w-1?i+1:i;
    smoothed[i]=(result[i]*4+result[up]+result[down]+result[left]+result[right])/8;
  }
  return smoothed;
}
const smoothstep=(min:number,max:number,x:number)=>{
  const t=clamp((x-min)/Math.max(0.00001,max-min));
  return t*t*(3-2*t);
};
const color=(palette:RGB[],i:number):RGB=>palette[((i%palette.length)+palette.length)%palette.length];

function drawFieldSkin(
  ctx:CanvasRenderingContext2D, low:HTMLCanvasElement,
  world:World,a:Appearance,palette:RGB[],outW:number,outH:number,kind:'mercury'|'relief'
){
  const w=world.width,h=world.height,field=density(world);
  const lctx=low.getContext('2d');
  if(!lctx)return;
  const img=lctx.createImageData(w,h),pixels=img.data;
  const threshold=a.skinThreshold??0.42;
  const chrome=a.chromeStrength??0.8;
  const coloredSignal=a.dualColor?.enabled?null:computeColorSignal(world,a);
  const dual=a.dualColor?.enabled?createDualSampler(world,a,palette):null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,k=i*4,height=field[i];
    const xL=field[x>0?i-1:i],xR=field[x<w-1?i+1:i];
    const yU=field[y>0?i-w:i],yD=field[y<h-1?i+w:i];
    const nx=(xL-xR)*2.4,ny=(yU-yD)*2.4;
    const specular=Math.pow(Math.max(0,0.26+nx*0.7-ny*0.88),4)*chrome;
    const diffuse=clamp(0.34+height*0.72+nx*0.55-ny*0.46,0,1.8);
    const presence=kind==='mercury'?smoothstep(threshold-0.14,threshold+0.14,height):
      Math.min(1,height*1.8+0.06);
    const cycle=palettePhase(a,world.generation,palette.length);
    const index=coloredSignal?signalIndex(coloredSignal,i,palette.length):world.cells[i];
    const phase=((index*(a.paletteReverse?-1:1)+cycle)%palette.length+palette.length)%palette.length;
    const c0=color(palette,Math.floor(phase)),c1=color(palette,Math.floor(phase)+1);
    const part=a.smoothPalette?phase-Math.floor(phase):0;
    const source:RGB=dual?dual.color(i):[
      c0[0]+(c1[0]-c0[0])*part,
      c0[1]+(c1[1]-c0[1])*part,
      c0[2]+(c1[2]-c0[2])*part
    ];
    for(let j=0;j<3;j++){
      // Metal-like material appearance comes from real density gradients.
      const metal=source[j]*(0.12+diffuse*(kind==='mercury'?0.8:0.9))
        +(kind==='mercury'?220:245)*specular
        +((j===0?4:j===1?22:27)*Math.max(0,-nx-ny))*chrome;
      const base=[9,6,23][j];
      pixels[k+j]=Math.round(clamp(base+(metal-base)*presence,0,255));
    }
    pixels[k+3]=255;
  }
  lctx.putImageData(img,0,0);
  const strength=clamp(a.glowStrength??0.8);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(low,0,0,outW,outH);
  if(strength>0){
    ctx.save();
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=strength*0.45;
    ctx.filter='blur(15px) saturate(1.4)';
    ctx.drawImage(low,0,0,outW,outH);ctx.restore();
  }
}

function drawContours(
  ctx:CanvasRenderingContext2D,low:HTMLCanvasElement,
  world:World,a:Appearance,palette:RGB[],outW:number,outH:number
){
  const w=world.width,h=world.height,f=density(world);
  // We deliberately use a bounded subset of the simulation grid for contour
  // drawing. This keeps large mobile recordings responsive.
  const stride=Math.max(1,Math.ceil(Math.max(w,h)/190));
  const count=Math.max(2,Math.min(9,Math.floor(a.contourLines??5)));
  ctx.save();
  ctx.globalAlpha=0.19;ctx.imageSmoothingEnabled=true;
  ctx.drawImage(low,0,0,outW,outH);ctx.restore();
  const sx=outW/w,sy=outH/h;
  const interpolate=(v0:number,v1:number,t:number)=>clamp((t-v0)/((v1-v0)||0.00001));
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.lineWidth=Math.max(0.55,a.contourWidth??1.5);
  for(let level=0;level<count;level++){
    const threshold=clamp((a.skinThreshold??0.42)+(level-(count-1)/2)*0.115,0.035,0.96);
    const c=color(palette,level+Math.floor(palettePhase(a,world.generation,palette.length)));
    ctx.strokeStyle='rgb('+c.join(',')+')';
    ctx.shadowColor=ctx.strokeStyle;
    ctx.shadowBlur=2.5*(a.glowStrength??0.8);
    ctx.beginPath();
    for(let y=0;y<h-stride;y+=stride)for(let x=0;x<w-stride;x+=stride){
      const p=y*w+x,q=p+stride,r=(y+stride)*w+x,u=r+stride;
      const a0=f[p],b=f[q],c0=f[u],d=f[r];
      const edge: [number,number][]=[];
      if((a0>=threshold)!==(b>=threshold)){
        const t=interpolate(a0,b,threshold);edge.push([(x+t*stride)*sx,y*sy]);
      }
      if((b>=threshold)!==(c0>=threshold)){
        const t=interpolate(b,c0,threshold);edge.push([(x+stride)*sx,(y+t*stride)*sy]);
      }
      if((c0>=threshold)!==(d>=threshold)){
        const t=interpolate(c0,d,threshold);edge.push([(x+(1-t)*stride)*sx,(y+stride)*sy]);
      }
      if((d>=threshold)!==(a0>=threshold)){
        const t=interpolate(d,a0,threshold);edge.push([x*sx,(y+(1-t)*stride)*sy]);
      }
      for(let j=0;j+1<edge.length;j+=2){
        ctx.moveTo(edge[j][0],edge[j][1]);ctx.lineTo(edge[j+1][0],edge[j+1][1]);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawStainedGlass(
  ctx:CanvasRenderingContext2D,low:HTMLCanvasElement,
  world:World,a:Appearance,palette:RGB[],outW:number,outH:number
){
  const w=world.width,h=world.height;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(low,0,0,outW,outH);
  const sx=outW/w,sy=outH/h;
  ctx.globalAlpha=clamp(a.glassLines??0.7);
  ctx.lineWidth=Math.max(1,Math.min(3,(sx+sy)/3));
  ctx.strokeStyle='#090512';
  ctx.shadowColor='#e6bbff';ctx.shadowBlur=2*(a.glowStrength??0.8);
  ctx.beginPath();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=y*w+x,state=world.cells[p];
    if(x<w-1&&state!==world.cells[p+1]){
      const xx=(x+1)*sx;ctx.moveTo(xx,y*sy);ctx.lineTo(xx,(y+1)*sy);
    }
    if(y<h-1&&state!==world.cells[p+w]){
      const yy=(y+1)*sy;ctx.moveTo(x*sx,yy);ctx.lineTo((x+1)*sx,yy);
    }
  }
  ctx.stroke();ctx.restore();
  // A few state-dependent jewel specks give panes variation without injecting
  // data into the underlying CA.
  ctx.save();ctx.globalAlpha=0.32*(a.glassLines??0.7);
  const skip=Math.max(2,Math.ceil(Math.max(w,h)/110));
  for(let y=1;y<h-1;y+=skip)for(let x=1;x<w-1;x+=skip){
    const p=y*w+x;
    if(!world.cells[p])continue;
    const c=color(palette,world.cells[p]+3+Math.floor(palettePhase(a,world.generation,palette.length)));
    ctx.fillStyle='rgb('+c.join(',')+')';
    ctx.fillRect((x+0.3)*sx,(y+0.3)*sy,Math.max(1,sx*0.2),Math.max(1,sy*0.2));
  }
  ctx.restore();
}
export function renderSpecialSkin(
  ctx:CanvasRenderingContext2D,low:HTMLCanvasElement,world:World,
  appearance:Appearance,palette:RGB[],outW:number,outH:number
):boolean{
  if(isF6CSkin(appearance.skin)){
    drawF6CSkin(ctx,low,world,appearance,palette,outW,outH,appearance.skin);
    return true;
  }
  if(isF6BSkin(appearance.skin)){
    drawF6BSkin(ctx,low,world,appearance,palette,outW,outH,appearance.skin);
    return true;
  }
  if(isF6Skin(appearance.skin)){
    drawF6Skin(ctx,low,world,appearance,palette,outW,outH,appearance.skin);
    return true;
  }
  switch(appearance.skin){
    case 'contours':drawContours(ctx,low,world,appearance,palette,outW,outH);return true;
    case 'mercury':case 'relief':
      drawFieldSkin(ctx,low,world,appearance,palette,outW,outH,appearance.skin);return true;
    case 'glass':drawStainedGlass(ctx,low,world,appearance,palette,outW,outH);return true;
    default:return false;
  }
}
