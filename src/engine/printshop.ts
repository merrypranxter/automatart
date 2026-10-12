import type {Appearance,World} from './types';

export type PrintEffectId='posterize'|'halftone'|'solarize'|'xray'|'stipple'|'duotone';
export interface PrintEffect {id:PrintEffectId;enabled:boolean;amount:number}
export interface PrintShop {
  enabled:boolean;
  mix:number;
  effects:PrintEffect[];
  posterLevels:number;
  halftoneSize:number;
  halftoneAngle:number;
  solarThreshold:number;
  xraySensitivity:number;
  stippleDensity:number;
  stippleGrain:number;
  duoMode:2|3;
  inkA:number;
  inkB:number;
  inkC:number;
}
export const PRINT_EFFECTS:ReadonlyArray<{id:PrintEffectId;name:string;description:string}>=[
  {id:'posterize',name:'POSTERIZE',description:'Hard graphic color bands'},
  {id:'halftone',name:'HALFTONE',description:'Rotated glowing print dots'},
  {id:'solarize',name:'SOLARIZE',description:'Chemically wrong photographic inversion'},
  {id:'xray',name:'NEON X-RAY',description:'Edge-sensitive fluorescent skeleton'},
  {id:'stipple',name:'STIPPLE',description:'Deterministic ink-grain constellation'},
  {id:'duotone',name:'DUOTONE / TRITONE',description:'Two or three inks from your live palette'}
];
export const INITIAL_PRINT_SHOP:PrintShop={
  enabled:false,mix:1,
  effects:PRINT_EFFECTS.map(v=>({id:v.id,enabled:false,amount:1})),
  posterLevels:4,halftoneSize:7,halftoneAngle:45,solarThreshold:.5,
  xraySensitivity:.4,stippleDensity:.5,stippleGrain:2,
  duoMode:2,inkA:0,inkB:2,inkC:4
};
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const num=(v:unknown,fallback:number,min:number,max:number)=>{
  const n=Number(v);return Number.isFinite(n)?clamp(n,min,max):fallback;
};
export function validatePrintShop(raw:unknown):PrintShop{
  if(!raw||typeof raw!=='object')return structuredClonePrint(INITIAL_PRINT_SHOP);
  const p=raw as Partial<PrintShop>;
  const effectEntries=Array.isArray(p.effects)?p.effects:[];
  const seen=new Set<PrintEffectId>();
  const effects:PrintEffect[]=[];
  for(const entry of effectEntries){
    if(!entry||!PRINT_EFFECTS.some(v=>v.id===entry.id)||seen.has(entry.id))continue;
    seen.add(entry.id);
    effects.push({id:entry.id,enabled:entry.enabled===true,amount:num(entry.amount,1,0,1)});
  }
  for(const id of PRINT_EFFECTS.map(v=>v.id))if(!seen.has(id))effects.push({id,enabled:false,amount:1});
  return {
    enabled:p.enabled===true,
    mix:num(p.mix,1,0,1),effects,
    posterLevels:Math.round(num(p.posterLevels,4,2,12)),
    halftoneSize:Math.round(num(p.halftoneSize,7,3,24)),
    halftoneAngle:Math.round(num(p.halftoneAngle,45,0,180)),
    solarThreshold:num(p.solarThreshold,.5,.02,.98),
    xraySensitivity:num(p.xraySensitivity,.4,.05,1),
    stippleDensity:num(p.stippleDensity,.5,.02,1),
    stippleGrain:Math.round(num(p.stippleGrain,2,1,8)),
    duoMode:p.duoMode===3?3:2,
    inkA:Math.round(num(p.inkA,0,0,31)),inkB:Math.round(num(p.inkB,2,0,31)),
    inkC:Math.round(num(p.inkC,4,0,31))
  };
}
export function structuredClonePrint(p:PrintShop):PrintShop{
  return {...p,effects:p.effects.map(e=>({...e}))};
}
export function reorderEffect(p:PrintShop,id:PrintEffectId,offset:-1|1):PrintShop{
  const next=structuredClonePrint(p),i=next.effects.findIndex(e=>e.id===id);
  const j=i+offset;if(i<0||j<0||j>=next.effects.length)return next;
  [next.effects[i],next.effects[j]]=[next.effects[j],next.effects[i]];
  return next;
}
export function randomizePrintShop(source:PrintShop,random:()=>number=Math.random):PrintShop{
  const p=structuredClonePrint(source);
  p.enabled=true;
  let active=0;
  for(const e of p.effects){
    e.enabled=random()<.42;
    e.amount=Number((.4+random()*.6).toFixed(2));
    if(e.enabled)active++;
  }
  if(!active)p.effects[Math.floor(random()*p.effects.length)].enabled=true;
  p.mix=Number((.5+random()*.5).toFixed(2));
  p.posterLevels=2+Math.floor(random()*10);
  p.halftoneSize=3+Math.floor(random()*18);
  p.halftoneAngle=Math.floor(random()*180);
  p.solarThreshold=.2+random()*.6;
  p.xraySensitivity=.15+random()*.8;
  p.stippleDensity=.2+random()*.75;
  p.stippleGrain=1+Math.floor(random()*6);
  p.duoMode=random()<.5?2:3;
  return validatePrintShop(p);
}
type RGB=[number,number,number];
const rgb=(v:string):RGB=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)||0) as RGB;
const luma=(r:number,g:number,b:number)=>.2126*r+.7152*g+.0722*b;
const blend=(source:Uint8ClampedArray,transformed:Uint8ClampedArray,strength:number)=>{
  const a=clamp(strength);
  for(let i=0;i<source.length;i+=4)for(let c=0;c<3;c++)
    source[i+c]=source[i+c]*(1-a)+transformed[i+c]*a;
};
function transform(
  source:Uint8ClampedArray,result:Uint8ClampedArray,
  id:PrintEffectId,width:number,height:number,p:PrintShop,
  appearance:Appearance,generation:number
){
  const levels=p.posterLevels;
  const angle=p.halftoneAngle*Math.PI/180;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const dot=p.halftoneSize;
  const palette=appearance.palette.length?appearance.palette:['#ffffff'];
  const ink=(n:number):RGB=>rgb(palette[((n%palette.length)+palette.length)%palette.length]);
  const a=ink(p.inkA),b=ink(p.inkB),c=ink(p.inkC);
  const edgeLum=(x:number,y:number)=>{
    const index=(Math.max(0,Math.min(height-1,y))*width+
      Math.max(0,Math.min(width-1,x)))*4;
    return luma(source[index],source[index+1],source[index+2]);
  };
  const grain=Math.max(1,p.stippleGrain);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const r=source[i],g=source[i+1],blue=source[i+2];
    const light=luma(r,g,blue)/255;
    let R=r,G=g,B=blue;
    switch(id){
      case 'posterize':{
        const q=(v:number)=>Math.round(v/255*(levels-1))*255/(levels-1);
        R=q(r);G=q(g);B=q(blue);
        break;
      }
      case 'halftone':{
        const u=x*cos+y*sin,v=-x*sin+y*cos;
        const ox=((u/dot)-Math.floor(u/dot)-.5)*dot;
        const oy=((v/dot)-Math.floor(v/dot)-.5)*dot;
        const radius=Math.max(.15,Math.sqrt(light)*dot*.56);
        const on=ox*ox+oy*oy<=radius*radius;
        if(on){R=r;G=g;B=blue;}
        else{R=9;G=6;B=23;}
        break;
      }
      case 'solarize':{
        if(light>=p.solarThreshold){R=255-r;G=255-g;B=255-blue;}
        break;
      }
      case 'xray':{
        const dx=(edgeLum(x+1,y)-edgeLum(x-1,y))/255;
        const dy=(edgeLum(x,y+1)-edgeLum(x,y-1))/255;
        const edge=clamp(Math.hypot(dx,dy)*(1.25/p.xraySensitivity));
        // Retain a faint source image under fluorescent mathematical edges.
        const hot=clamp(edge*.98);
        R=r*.13+hot*255;G=g*.16+hot*105;B=blue*.18+hot*240;
        break;
      }
      case 'stipple':{
        const gx=Math.floor(x/grain),gy=Math.floor(y/grain);
        let hash=(Math.imul(gx+17,374761393)^Math.imul(gy+67,668265263)^
          Math.imul(generation+1,1442695041))>>>0;
        hash=Math.imul(hash^(hash>>>13),1274126177)>>>0;
        const random=((hash^(hash>>>16))>>>0)/4294967296;
        if(random<light*p.stippleDensity){
          R=Math.min(255,r*1.25+20);G=Math.min(255,g*1.25+20);B=Math.min(255,blue*1.25+20);
        }else{R=r*.11;G=g*.11;B=blue*.11;}
        break;
      }
      case 'duotone':{
        if(p.duoMode===2){
          R=a[0]+(b[0]-a[0])*light;
          G=a[1]+(b[1]-a[1])*light;
          B=a[2]+(b[2]-a[2])*light;
        }else{
          const t=light<.5?light*2:(light-.5)*2;
          const low=light<.5?a:b,high=light<.5?b:c;
          R=low[0]+(high[0]-low[0])*t;
          G=low[1]+(high[1]-low[1])*t;
          B=low[2]+(high[2]-low[2])*t;
        }
        break;
      }
    }
    result[i]=R;result[i+1]=G;result[i+2]=B;result[i+3]=255;
  }
}
const printBuffers=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
export function applyPrintShop(canvas:HTMLCanvasElement,appearance:Appearance,world:World):void{
  const p=appearance.print;
  if(!p?.enabled||p.mix<=0||!p.effects.some(e=>e.enabled&&e.amount>0))return;
  const w=canvas.width,h=canvas.height;
  if(w<1||h<1)return;
  // Deliberate bounded work buffer: high-resolution iPhone exports cannot
  // allocate/loop through unbounded full-HD pixels for every effect.
  // The same renderer/effect order is used for preview, PNG, GIF, and video.
  const scale=Math.min(1,720/Math.max(w,h));
  const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
  let low=printBuffers.get(canvas);
  if(!low){low=document.createElement('canvas');printBuffers.set(canvas,low);}
  if(low.width!==width)low.width=width;
  if(low.height!==height)low.height=height;
  const lctx=low.getContext('2d',{willReadFrequently:true});
  const ctx=canvas.getContext('2d');
  if(!lctx||!ctx)return;
  lctx.clearRect(0,0,width,height);
  lctx.drawImage(canvas,0,0,width,height);
  const img=lctx.getImageData(0,0,width,height);
  const original=new Uint8ClampedArray(img.data);
  const work=img.data;
  const scratch=new Uint8ClampedArray(work.length);
  for(const effect of p.effects){
    if(!effect.enabled||effect.amount<=0)continue;
    transform(work,scratch,effect.id,width,height,p,appearance,world.generation);
    blend(work,scratch,effect.amount);
  }
  blend(original,work,p.mix);
  img.data.set(original);lctx.putImageData(img,0,0);
  ctx.save();ctx.imageSmoothingEnabled=true;
  ctx.drawImage(low,0,0,w,h);ctx.restore();
}
