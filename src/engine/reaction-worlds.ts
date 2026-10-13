/** C2: two mathematically distinct synchronous cellular systems.
 * Hodgepodge is the eight-neighbor Gerhardt-Schuster-style variant specified below.
 * Forest fire is a seeded Drossel–Schwabl-style three-state, FOUR-neighbor process.
 * All random draws are keyed by seed/generation/cell/channel; no hidden RNG cursor. */
export interface HodgeRule {states:number;k1:number;k2:number;growth:number}
export interface FireRule {growth:number;lightning:number;seed:number;generation:number}
const MOORE:[number,number][]=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const CARDINAL:[number,number][]=[[0,-1],[1,0],[0,1],[-1,0]];
function locate(x:number,y:number,w:number,h:number,wrap:boolean):number{
 if(wrap){x=(x+w)%w;y=(y+h)%h;}
 else if(x<0||y<0||x>=w||y>=h)return -1;
 return y*w+x;
}
export function random01(seed:number,generation:number,index:number,channel:number):number{
 let v=(seed>>>0)^Math.imul((generation+1)>>>0,0x9e3779b1)^
  Math.imul((index+1)>>>0,0x85ebca6b)^Math.imul(channel+1,0xc2b2ae35);
 v^=v>>>16;v=Math.imul(v,0x7feb352d);v^=v>>>15;
 v=Math.imul(v,0x846ca68b);v^=v>>>16;
 return (v>>>0)/4294967296;
}
export function stepHodgepodge(src:Uint8Array,w:number,h:number,wrap:boolean,r:HodgeRule):Uint8Array{
 if(src.length!==w*h)throw new Error('Hodgepodge dimensions disagree');
 if(!Number.isInteger(r.states)||r.states<8||r.states>64||
    !Number.isInteger(r.k1)||r.k1<1||r.k1>8||
    !Number.isInteger(r.k2)||r.k2<1||r.k2>8||
    !Number.isInteger(r.growth)||r.growth<1||r.growth>40)
   throw new Error('Invalid Hodgepodge rule');
 const dst=new Uint8Array(src.length),top=r.states;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,old=src[p];
  if(old>top)throw new Error('Invalid Hodgepodge cell state');
  if(old===top){dst[p]=0;continue;}
  let sick=0,ill=0,sum=old,neighborCount=0;
  for(const [dx,dy] of MOORE){
   const q=locate(x+dx,y+dy,w,h,wrap);
   if(q<0)continue;
   const state=src[q];
   if(state>top)throw new Error('Invalid Hodgepodge neighbor');
   neighborCount++;sum+=state;
   if(state===top)ill++;
   else if(state>0)sick++;
  }
  // Healthy cells get infected by the distinct sick and ill pressures.
  // Sick cells advance by neighborhood-average severity + progression growth.
  const candidate=old===0?Math.floor(sick/r.k2)+Math.floor(ill/r.k1):
    Math.floor(sum/(neighborCount+1))+r.growth;
  dst[p]=Math.min(top,candidate);
 }
 return dst;
}
export function stepForestFire(src:Uint8Array,w:number,h:number,wrap:boolean,r:FireRule):Uint8Array{
 if(src.length!==w*h)throw new Error('Forest-fire dimensions disagree');
 if(!Number.isFinite(r.growth)||r.growth<0||r.growth>1||
   !Number.isFinite(r.lightning)||r.lightning<0||r.lightning>1||
   !Number.isSafeInteger(r.generation)||r.generation<0||
   !Number.isFinite(r.seed))throw new Error('Invalid forest-fire rule');
 const dst=new Uint8Array(src.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,state=src[p];
  if(state>2)throw new Error('Invalid forest-fire state');
  if(state===2){dst[p]=0;continue;} // burn ends after precisely one step
  if(state===0){
   dst[p]=random01(r.seed,r.generation,p,0)<r.growth?1:0;
   continue;
  }
  // Tree ignition is certain next step if an adjacent cardinal cell burns.
  // Lightning is independent only if the tree is not already igniting.
  let burning=false;
  for(const [dx,dy] of CARDINAL){
   const q=locate(x+dx,y+dy,w,h,wrap);
   if(q>=0&&src[q]===2){burning=true;break;}
  }
  dst[p]=burning||random01(r.seed,r.generation,p,1)<r.lightning?2:1;
 }
 return dst;
}
