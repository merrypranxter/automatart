/** Local 5×5 stencil bitset. Bit y*5+x, centered at (2,2); center bit 12
 * is *never* a voter. 3×3 edits the central 3×3 subset of the same bitset. */
export type StencilSize=3|5;
export type StencilPreset='fan'|'hook'|'ring'|'claw';
export const STENCIL_CENTER_BIT=12;
export const DEFAULT_STENCIL_MASK=[6,7,8,11,13,16,17,18]
  .reduce((acc,bit)=>acc|(1<<bit),0);
export function stencilBit(dx:number,dy:number):number{
 if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>2||Math.abs(dy)>2)return -1;
 return (dy+2)*5+(dx+2);
}
export function allowedStencilMask(size:StencilSize):number{
 const radius=size===3?1:2;
 let mask=0;
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  if(dx===0&&dy===0)continue;
  mask|=1<<stencilBit(dx,dy);
 }
 return mask;
}
export function clipStencil(mask:number,size:StencilSize):number{
 return mask&allowedStencilMask(size);
}
export function validStencil(mask:unknown,size:unknown):boolean{
 return (size===3||size===5)&&typeof mask==='number'&&Number.isSafeInteger(mask)
  &&mask>0&&mask<(1<<25)&&(mask&(1<<STENCIL_CENTER_BIT))===0
  &&(mask&~allowedStencilMask(size))===0;
}
export function countStencil(mask:number,size:StencilSize):number{
 let n=clipStencil(mask,size),count=0;
 while(n){n&=n-1;count++}
 return count;
}
const offsetsCache=new Map<number,readonly [number,number][]>();
export function stencilOffsets(mask:number,size:StencilSize):readonly [number,number][]{
 const clean=clipStencil(mask,size);
 const prior=offsetsCache.get(clean);if(prior)return prior;
 const result:[number,number][]=[];
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const bit=stencilBit(dx,dy);
  if(bit!==STENCIL_CENTER_BIT&&(clean&(1<<bit)))result.push([dx,dy]);
 }
 if(offsetsCache.size>=100)offsetsCache.clear();
 offsetsCache.set(clean,result);return result;
}
export function toggleStencil(mask:number,size:StencilSize,bit:number,on:boolean):number{
 if(!Number.isInteger(bit)||bit<0||bit>24||bit===STENCIL_CENTER_BIT)return mask;
 const allowed=allowedStencilMask(size);
 if(!(allowed&(1<<bit)))return mask;
 const next=on?(mask|(1<<bit)):(mask&~(1<<bit));
 return clipStencil(next,size)||mask; // no empty rule that would freeze evolution
}
export function resizeStencil(mask:number,size:StencilSize):number{
 return clipStencil(mask,size)||(size===3?DEFAULT_STENCIL_MASK:1<<7);
}
export function rotateStencil(mask:number,size:StencilSize,clockwise=true):number{
 let next=0;
 for(const [dx,dy] of stencilOffsets(mask,size)){
  const x=clockwise?-dy:dy,y=clockwise?dx:-dx;
  next|=1<<stencilBit(x,y);
 }
 return next;
}
export function mirrorStencil(mask:number,size:StencilSize):number{
 let next=0;
 for(const [dx,dy] of stencilOffsets(mask,size))next|=1<<stencilBit(-dx,dy);
 return next;
}
export function invertStencil(mask:number,size:StencilSize):number{
 const next=allowedStencilMask(size)&~mask;
 return next||mask;
}
export function stencilPreset(name:StencilPreset,size:StencilSize):number{
 const radius=size===3?1:2;
 let mask=0;
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  if(!dx&&!dy)continue;
  const yes=name==='ring'?Math.max(Math.abs(dx),Math.abs(dy))===radius
   :name==='fan'?(dy<0&&Math.abs(dx)<=-dy)||(dy===0&&dx>0)
   :name==='hook'?(dx===-radius&&dy<=0)||(dy===radius&&dx<=0)
   :(dx>=0&&Math.abs(dy)<=Math.max(1,dx))||(dx===-1&&dy===radius);
  if(yes)mask|=1<<stencilBit(dx,dy);
 }
 return resizeStencil(mask,size);
}
/** Deterministic surprise based on the universe seed and local roll number.
 * No Math.random or wall-clock in recorded rule evolution. */
export function seededStencil(seed:number,size:StencilSize,density=0.38):number{
 let state=(seed>>>0)||0x9e3779b9;
 let mask=0;
 for(let bit=0;bit<25;bit++){
  if(!(allowedStencilMask(size)&(1<<bit)))continue;
  state^=state<<13;state^=state>>>17;state^=state<<5;
  if((state>>>0)/4294967296<density)mask|=1<<bit;
 }
 return mask||1<<stencilBit(0,-1);
}
