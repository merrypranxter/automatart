import { LIFE_RULES, worldDimensions } from './types';
import type { SimSettings, World } from './types';

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(s: SimSettings): World {
  const [width,height] = worldDimensions(s);
  const n = width * height;
  const cells = new Uint8Array(n);
  const ages = new Uint16Array(n);
  const traces = new Float32Array(n);
  const rand = seededRandom(s.seed);
  const cx=(width-1)/2, cy=(height-1)/2;
  const minSide = Math.min(width,height);
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    const p = y*width+x;
    const dx=(x-cx)/minSide, dy=(y-cy)/minSide;
    const r=Math.hypot(dx,dy);
    let chance=s.density;
    if(s.pattern==='center') chance = r < 0.16 ? s.density*1.7 : 0;
    if(s.pattern==='rings') chance = Math.sin(r*85)>0.55 ? s.density*1.8 : s.density*0.05;
    if(s.pattern==='stripes') chance = ((x+y*0.19)%17)<7 ? s.density*1.7 : s.density*0.04;
    if(s.pattern==='checker') chance = ((Math.floor(x/5)+Math.floor(y/5))%2===0) ? s.density*1.9:s.density*0.08;
    if(s.pattern==='spiral') chance = Math.sin(r*62+Math.atan2(dy,dx)*8)>0.4 ? s.density*2:s.density*0.05;
    if(s.pattern==='web') chance = (Math.sin((x-cx)*0.36)*Math.sin((y-cy)*0.36)>0.25) ? s.density*1.9:s.density*0.08;
    if(s.engine === 'wolfram') {
      if (y !== height-1) continue;
      cells[p]=s.pattern==='center' ? (x===Math.floor(cx)?1:0) : (rand()<chance?1:0);
    } else if(s.engine==='cyclic') {
      cells[p]=rand()<chance ? 1+Math.floor(rand()*(s.cyclicStates-1)) : 0;
    } else if(s.engine==='brians') {
      cells[p]=rand()<chance ? (rand()<0.22 ? 2 : 1) : 0;
    } else {
      cells[p]=rand()<chance ? 1 : 0;
    }
    if(cells[p]>0 || s.engine==='cyclic'){ages[p]=1;traces[p]=1;}
  }
  return {engine:s.engine,width,height,generation:0,cells,ages,
    neighbors:new Uint8Array(n),events:new Uint8Array(n),traces};
}
function valueAt(cells:Uint8Array,w:number,h:number,x:number,y:number,wrap:boolean):number{
  if(wrap){x=(x+w)%w;y=(y+h)%h;}
  else if(x<0||x>=w||y<0||y>=h)return 0;
  return cells[y*w+x];
}
export function stepWorld(prev:World,s:SimSettings):World {
  const {width:w,height:h,cells,ages,traces}=prev;
  const n=w*h, next=new Uint8Array(n);
  const nextAges=new Uint16Array(n), neighbors=new Uint8Array(n);
  const events=new Uint8Array(n), nextTraces=new Float32Array(n);
  if(s.engine==='wolfram') {
    // The history scrolls upward; the last row generates the next one.
    next.set(cells.subarray(w),0);
    for(let x=0;x<w;x++){
      const row=(h-1)*w;
      const l=!s.wrap&&x===0?0:cells[row+(x+w-1)%w];
      const c=cells[row+x];
      const r=!s.wrap&&x===w-1?0:cells[row+(x+1)%w];
      const bit=((l>0?1:0)<<2)|((c>0?1:0)<<1)|(r>0?1:0);
      next[(h-1)*w+x]=(s.wolframRule>>bit)&1;
    }
  } else {
    const life=s.lifeRule==='custom'
      ? {birth:s.customBirth??[3],survive:s.customSurvive??[2,3]}
      : LIFE_RULES[s.lifeRule];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x, old=cells[p];
      let count=0;
      const sought=s.engine==='cyclic' ? (old+1)%s.cyclicStates : 1;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
        if(ox===0&&oy===0)continue;
        if(s.neighborShape==='vonNeumann'&&Math.abs(ox)+Math.abs(oy)!==1)continue;
        const v=valueAt(cells,w,h,x+ox,y+oy,s.wrap);
        if(s.engine==='cyclic' ? v===sought : v===1)count++;
      }
      neighbors[p]=count;
      if(s.engine==='life'){
        next[p]=old ? (life.survive.includes(count)?1:0)
          : (life.birth.includes(count)?1:0);
      }else if(s.engine==='brians'){
        next[p]=old===1?2:old===2?0:count===2?1:0;
      }else{
        next[p]=count>=s.cyclicThreshold ? sought : old;
      }
    }
  }
  for(let i=0;i<n;i++){
    const old=cells[i], now=next[i];
    nextAges[i]=(now===0&&s.engine!=='cyclic')?0:(old===now?Math.min(65535,ages[i]+1):1);
    if(s.engine==='cyclic'){
      if(old!==now)events[i]=3;
    }else if(old===0&&now!==0)events[i]=1;
    else if(old!==0&&now===0)events[i]=2;
    else if(old!==now)events[i]=3;
    nextTraces[i]=s.engine==='cyclic'?1:Math.max(now>0?1:0,traces[i]*(s.trailDecay??0.89));
  }
  return {engine:s.engine,width:w,height:h,generation:prev.generation+1,
    cells:next,ages:nextAges,neighbors,events,traces:nextTraces};
}
export function paintWorld(world:World,s:SimSettings,x:number,y:number,radius:number,erase=false):void{
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    if(dx*dx+dy*dy>radius*radius)continue;
    const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=world.width||yy>=world.height)continue;
    const p=yy*world.width+xx;
    world.cells[p]=erase?0:s.engine==='cyclic'?Math.max(1,Math.floor(s.cyclicStates/2)):1;
    world.ages[p]=erase?0:1;
    world.traces[p]=erase?0:1;
    world.events[p]=erase?2:1;
  }
}
