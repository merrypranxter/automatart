import type { Appearance, World } from './types';

const bg: [number,number,number] = [9,6,23];
const backBuffers = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function rgb(hex:string): [number,number,number] {
  const h=hex.replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(h))return [255,255,255];
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function getBuffer(canvas: HTMLCanvasElement, w:number,h:number):HTMLCanvasElement{
  let b=backBuffers.get(canvas);
  if(!b){b=document.createElement('canvas');backBuffers.set(canvas,b);}
  if(b.width!==w)b.width=w;
  if(b.height!==h)b.height=h;
  return b;
}
export function renderWorld(canvas:HTMLCanvasElement,world:World,a:Appearance,outputWidth=900):void{
  const w=world.width,h=world.height;
  const outW=outputWidth, outH=Math.round(outputWidth*h/w);
  if(canvas.width!==outW)canvas.width=outW;
  if(canvas.height!==outH)canvas.height=outH;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return;
  const low=getBuffer(canvas,w,h),lc=low.getContext('2d');
  if(!lc)return;
  const frame=lc.createImageData(w,h),d=frame.data;
  const palette=a.palette.map(rgb);
  for(let i=0;i<world.cells.length;i++){
    const state=world.cells[i], trace=world.traces[i];
    const visible=state!==0 || a.trails&&trace>0.025 || (a.colorBy==='events'&&world.events[i]!==0);
    const k=i*4;
    if(!visible && !(world.generation>=0&&state===0&&world.cells.length>0&&false)){
      d[k]=bg[0];d[k+1]=bg[1];d[k+2]=bg[2];d[k+3]=255;continue;
    }
    let index=0;
    if(a.colorBy==='state')index=state;
    if(a.colorBy==='age')index=Math.floor(Math.log2(world.ages[i]+1));
    if(a.colorBy==='neighbors')index=world.neighbors[i];
    if(a.colorBy==='events')index=world.events[i]===1?0:world.events[i]===2?3:world.events[i]===3?4:2;
    const color=palette[(index+palette.length)%palette.length];
    const intensity=state>0?1:(a.trails?Math.min(0.83,trace):world.events[i]===2?0.38:0);
    for(let j=0;j<3;j++)d[k+j]=Math.round(bg[j]+(color[j]-bg[j])*intensity);
    d[k+3]=255;
  }
  lc.putImageData(frame,0,0);
  ctx.fillStyle='#090617';ctx.fillRect(0,0,outW,outH);
  ctx.imageSmoothingEnabled=a.skin!=='pixels';
  ctx.imageSmoothingQuality='high';
  if(a.skin==='glow'){
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=0.8;
    ctx.filter='blur(18px) saturate(1.75)';
    ctx.drawImage(low,0,0,outW,outH);
    ctx.restore();
    ctx.imageSmoothingEnabled=true;
  }
  ctx.drawImage(low,0,0,outW,outH);
  if(a.showGrid){
    const dx=outW/w,dy=outH/h, stride=Math.ceil(Math.max(w,h)/175);
    ctx.save();ctx.strokeStyle='rgba(255,255,255,0.16)';
    ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<=w;x+=stride){let xx=Math.round(x*dx)+0.5;ctx.moveTo(xx,0);ctx.lineTo(xx,outH);}
    for(let y=0;y<=h;y+=stride){let yy=Math.round(y*dy)+0.5;ctx.moveTo(0,yy);ctx.lineTo(outW,yy);}
    ctx.stroke();ctx.restore();
  }
}
