import type {SimSettings,World,LatticeId} from './types';
import {geometryExtent,lookupCell,polygonForCell} from './topology';
import {createMutationRng} from './mutation-core';
import {sandVisualState} from './circuits';

export type BrushSymmetry='single'|'mirror'|'quad'|'radial8';
export type StampId='brush'|'spore'|'ring'|'checker'|'cluster'|'spiral'|'cross'|'glider'|'bars'|'diamond';
export type StampMode='paint'|'erase'|'invert';
export interface AlienBrush {
  symmetry:BrushSymmetry;
  stamp:StampId;
  size:number;
  rotation:number;
  scatter:number;
  density:number;
  mode:StampMode;
  species:number;
}
export const INITIAL_ALIEN_BRUSH:AlienBrush={
  symmetry:'single',stamp:'brush',size:2,rotation:0,scatter:1,
  density:1,mode:'paint',species:1
};
export const STAMPS:Record<StampId,string>={
  brush:'FREEHAND',spore:'ALIEN SPORE',ring:'CELL RING',checker:'CHECKER BURST',
  cluster:'COSMIC CLUSTER',spiral:'SPIRAL TENDRIL',cross:'SIGNAL CROSS',
  glider:'CONWAY GLIDER',bars:'PARALLEL BARS',diamond:'DIAMOND BURST'
};
export function isGliderCompatible(s:SimSettings):boolean{
  // This named stamp is the standard Conway glider, not a promise it will
  // travel under non-Conway/non-Moore rules or non-square adjacency.
  return s.engine==='life'&&s.lattice==='square'&&s.neighborShape==='moore'&&
    s.lifeRule==='conway';
}
export function validateAlienBrush(v:Partial<AlienBrush>|null|undefined,s:SimSettings):AlienBrush{
  const b={...INITIAL_ALIEN_BRUSH,...v};
  if(!['single','mirror','quad','radial8'].includes(b.symmetry))b.symmetry='single';
  if(!Object.hasOwn(STAMPS,b.stamp))b.stamp='brush';
  if(b.stamp==='glider'&&!isGliderCompatible(s))b.stamp='spore';
  if(!['paint','erase','invert'].includes(b.mode))b.mode='paint';
  b.size=Math.max(0,Math.min(18,Math.floor(Number.isFinite(Number(b.size))?Number(b.size):2)));
  b.rotation=((Math.floor(Number(b.rotation)||0)%360)+360)%360;
  b.scatter=Math.max(1,Math.min(8,Math.floor(Number(b.scatter)||1)));
  b.density=Math.max(0.1,Math.min(1,Number(b.density)||1));
  b.species=Math.max(1,Math.min(s.speciesCount,Math.floor(Number(b.species)||1)));
  return b;
}
function centerNormalized(shape:LatticeId,x:number,y:number,w:number,h:number):[number,number]{
  const polygon=polygonForCell(shape,x,y),[ew,eh]=geometryExtent(shape,w,h);
  let a=0,b=0;
  for(const [px,py] of polygon){a+=px;b+=py;}
  return [a/polygon.length/ew,b/polygon.length/eh];
}
function transforms(sym:BrushSymmetry,u:number,v:number):[number,number][]{
  const x=u-.5,y=v-.5;
  if(sym==='single')return [[u,v]];
  if(sym==='mirror')return [[u,v],[1-u,v]];
  if(sym==='quad')return [[u,v],[1-u,v],[u,1-v],[1-u,1-v]];
  // True 45-degree orbit in normalized artwork coordinates; all transformed
  // points are reprojected to real lattice cells. On non-square/hex/triangle
  // this is intentionally ARTWORK SYMMETRY, not a lattice automorphism.
  return Array.from({length:8},(_,k)=>{
    const t=k*Math.PI/4;return [
      .5+x*Math.cos(t)-y*Math.sin(t),.5+x*Math.sin(t)+y*Math.cos(t)
    ];
  });
}
type Offset=[number,number];
function stampOffsets(id:StampId,size:number,rotation:number,seed:number):Offset[]{
  const rng=createMutationRng(seed);
  if(id==='brush'&&size===0)return [[0,0]];
  let positions:Offset[]=[];
  const radius=Math.max(1,size);
  const visit=(f:(x:number,y:number,r:number,a:number)=>boolean)=>{
    for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
      const r=Math.hypot(x,y),a=Math.atan2(y,x);
      if(f(x,y,r,a))positions.push([x,y]);
    }
  };
  switch(id){
    case 'brush':visit((_x,_y,r)=>r<=radius);break;
    case 'spore':
      visit((x,y,r,a)=>r<=radius&&
        (r<radius*.35||Math.sin(a*7+r*1.8)>0.15||rng.chance(.18)));
      break;
    case 'ring':visit((_x,_y,r)=>Math.abs(r-radius*.75)<=Math.max(.7,radius*.14));break;
    case 'checker':visit((x,y,r)=>r<=radius&&(x+y)%2===0);break;
    case 'cluster':
      visit((_x,_y,r)=>r<=radius&&rng.chance(.72-.5*r/radius));break;
    case 'spiral':
      visit((_x,_y,r,a)=>{
        if(r>radius||r<.55)return r<.55;
        const target=((a*radius/(Math.PI*2)*2)+radius*4)%(radius*.65);
        return Math.abs((r% (radius*.65))-target)<Math.max(.8,radius*.14);
      });
      break;
    case 'cross':visit((x,y,r)=>r<=radius&&(Math.abs(x)<=1||Math.abs(y)<=1));break;
    case 'glider':
      // Standard Conway glider in orientation pointing down/right (5 cells).
      positions=[[0,-1],[1,0],[-1,1],[0,1],[1,1]];break;
    case 'bars':visit((x,y,r)=>r<=radius&&(Math.abs(x%4)===0||Math.abs(x%4)===1));break;
    case 'diamond':visit((x,y)=>Math.abs(x)+Math.abs(y)<=radius);break;
  }
  const turns=((rotation%360)+360)%360;
  if(turns!==0){
    const rad=turns*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);
    positions=positions.map(([x,y])=>[Math.round(x*c-y*s),Math.round(x*s+y*c)]);
  }
  const unique=new Set(positions.map(([x,y])=>x+','+y));
  return [...unique].map(v=>v.split(',').map(Number) as Offset);
}
function footprint(
  world:World,origin:[number,number],brush:AlienBrush,seed:number
):number[]{
  const w=world.width,h=world.height,shape=world.lattice??'square';
  const b=brush;
  const rng=createMutationRng(seed^0x85ebca6b);
  const result=new Set<number>();
  const activeOffsets=stampOffsets(b.stamp,b.size,b.rotation,seed);
  for(let cluster=0;cluster<b.scatter;cluster++){
    const jitter=cluster===0?[0,0]:
      [rng.int(-b.size*3,b.size*3),rng.int(-b.size*3,b.size*3)];
    for(const [dx,dy] of activeOffsets){
      if(b.density<1&&rng.float()>b.density)continue;
      const x=origin[0]+dx+jitter[0],y=origin[1]+dy+jitter[1];
      if(x<0||y<0||x>=w||y>=h)continue;
      // Transform EVERY selected cell, not merely a stamp center. This
      // guarantees symmetry for asymmetric stamps (glider / spiral) too.
      const [u,v]=centerNormalized(shape,x,y,w,h);
      for(const [tu,tv] of transforms(b.symmetry,u,v)){
        const target=lookupCell(shape,w,h,tu,tv);
        if(target)result.add(target[1]*w+target[0]);
      }
    }
  }
  return [...result].sort((a,b)=>a-b);
}
export function alienFootprint(world:World,anchor:[number,number],brush:AlienBrush,seed:number):number[]{
  return footprint(world,anchor,validateAlienBrush(brush,{
    engine:world.engine,lattice:world.lattice??'square',speciesCount:8,
    lifeRule:'conway',neighborShape:'moore'
  } as SimSettings),seed);
}
export function applyAlienStamp(
  world:World,settings:SimSettings,anchor:[number,number],
  rawBrush:AlienBrush,seed:number
):number[]{
  const b=validateAlienBrush(rawBrush,settings);
  const affected=footprint(world,anchor,b,seed);
  // Fail atomically before painting. Saturation would silently destroy mass.
  if(settings.engine==='sandpile'&&world.grains&&b.mode==='paint'){
    for(const id of affected)if(world.grains[id]>0xffffffff-settings.sandBrush)
      throw new RangeError('Cannot paint: 32-bit grain count overflow');
  }
  for(const id of affected){
    const before=world.cells[id];
    if(settings.engine==='sandpile'&&world.grains){
      const oldHeight=world.grains[id];
      const height=b.mode==='erase'?0:b.mode==='invert'?(oldHeight?0:settings.sandBrush):
        oldHeight+settings.sandBrush;
      world.grains[id]=height;
      const next=sandVisualState(height);
      world.cells[id]=next;
      world.ages[id]=height?1:0;world.traces[id]=height?1:0;
      world.events[id]=oldHeight===height?0:height>oldHeight?1:3;
      if(world.fossils)world.fossils[id]=height?0:oldHeight?1:0;
      if(world.previousCells)world.previousCells[id]=next;
      if(world.olderCells)world.olderCells[id]=next;
      continue;
    }
    const value=settings.engine==='ising'?settings.isingBrush:
      settings.engine==='turmites'?settings.turmiteBrush:
      settings.engine==='hodgepodge'?settings.hodgeBrush:
      settings.engine==='forestfire'?settings.forestBrush:
      settings.engine==='wireworld'?settings.wireBrush:settings.engine==='cyclic'?Math.max(1,Math.floor(settings.cyclicStates/2)):
      settings.engine==='species'?Math.max(1,Math.min(settings.speciesCount,b.species)):1;
    const next=b.mode==='erase'?0:b.mode==='invert'?(before?0:value):value;
    world.cells[id]=next;
    world.ages[id]=next?1:0;
    world.traces[id]=next?1:0;
    world.events[id]=next?before===next?0:3:before?2:0;
    if(world.fossils)world.fossils[id]=next?0:before?1:0;
    if(world.previousCells)world.previousCells[id]=next;
    if(world.olderCells)world.olderCells[id]=next;
  }
  return affected;
}
