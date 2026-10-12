import type {Appearance,ColorBy,World} from './types';
import {computeColorSignal,signalIndex} from './color-signals';
import {palettePhase} from './funhouse';

export type RGB=[number,number,number];
export interface DualColor {
  enabled:boolean;
  sourceA:ColorBy;sourceB:ColorBy;
  blend:number;
  invertA:boolean;invertB:boolean;
  offsetA:number;offsetB:number;
  strengthA:number;strengthB:number;
}
export const COLOR_SOURCES:ReadonlyArray<{id:ColorBy;label:string}>=[
  {id:'state',label:'Cell state'},{id:'age',label:'Cell age'},
  {id:'neighbors',label:'Neighbor count'},{id:'events',label:'Birth / death / change'},
  {id:'radius',label:'Radius rings'},{id:'x',label:'Horizontal bands'},
  {id:'activity',label:'Age + neighbors + events'},
  {id:'entropy',label:'Local entropy'},{id:'boundaries',label:'Cell boundaries'},
  {id:'diversity',label:'Neighbor diversity'},{id:'flow',label:'Directional flow'},
  {id:'birthFlash',label:'Birth flash'},{id:'deathHeat',label:'Death heatmap'},
  {id:'generationWave',label:'Generation interference'},
  {id:'angular',label:'Angular rainbow'},{id:'diagonal',label:'Diagonal interference'},
  {id:'gradient',label:'Neighborhood gradient'}
];
const ids=new Set(COLOR_SOURCES.map(s=>s.id));
export const INITIAL_DUAL_COLOR:DualColor={
  enabled:false,sourceA:'state',sourceB:'entropy',blend:.5,
  invertA:false,invertB:false,offsetA:0,offsetB:0,
  strengthA:1,strengthB:1
};
export function validateDualColor(input:unknown):DualColor{
  if(!input||typeof input!=='object')return {...INITIAL_DUAL_COLOR};
  const o=input as Partial<DualColor>;
  const number=(v:unknown,fallback:number,min:number,max:number)=>{
    return typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  };
  return {
    enabled:o.enabled===true,
    sourceA:ids.has(o.sourceA as ColorBy)?o.sourceA!:INITIAL_DUAL_COLOR.sourceA,
    sourceB:ids.has(o.sourceB as ColorBy)?o.sourceB!:INITIAL_DUAL_COLOR.sourceB,
    blend:number(o.blend,.5,0,1),
    invertA:o.invertA===true,invertB:o.invertB===true,
    offsetA:number(o.offsetA,0,-32,32),offsetB:number(o.offsetB,0,-32,32),
    strengthA:number(o.strengthA,1,0,3),strengthB:number(o.strengthB,1,0,3)
  };
}
export function swapDualColor(d:DualColor):DualColor{
  return {...d,sourceA:d.sourceB,sourceB:d.sourceA,
    invertA:d.invertB,invertB:d.invertA,offsetA:d.offsetB,offsetB:d.offsetA,
    strengthA:d.strengthB,strengthB:d.strengthA,blend:1-d.blend};
}
export function resetDualColor():DualColor{return {...INITIAL_DUAL_COLOR};}
const wrap=(v:number,n:number)=>((v%n)+n)%n;
export function rawColorIndex(world:World,id:ColorBy,i:number,n:number,field:Float32Array|null):number{
  if(field)return signalIndex(field,i,n);
  const w=world.width,h=world.height,x=i%w,y=Math.floor(i/w);
  switch(id){
    case 'state':return world.cells[i];
    case 'age':return Math.log2(world.ages[i]+1);
    case 'neighbors':return world.neighbors[i];
    case 'events':return world.events[i]===1?0:world.events[i]===2?3:world.events[i]===3?4:2;
    case 'radius':return Math.hypot((x-w/2)/w,(y-h/2)/h)*n*1.6;
    case 'x':return x/w*n;
    case 'activity':return world.neighbors[i]*.65+world.ages[i]*.065+world.events[i]*2;
    default:return 0;
  }
}
function paletteColor(palette:RGB[],index:number,a:Appearance,cycle:number):RGB{
  const n=palette.length;
  const phase=wrap((a.paletteReverse?-1:1)*index+cycle,n);
  const first=Math.floor(phase),second=(first+1)%n;
  const t=a.smoothPalette?phase-first:0;
  return [
    palette[first][0]+(palette[second][0]-palette[first][0])*t,
    palette[first][1]+(palette[second][1]-palette[first][1])*t,
    palette[first][2]+(palette[second][2]-palette[first][2])*t
  ];
}
export interface DualSampler {
  color:(i:number)=>RGB;
  sample:(i:number)=>{a:number;b:number;colorA:RGB;colorB:RGB;result:RGB};
}
export function createDualSampler(world:World,a:Appearance,palette:RGB[]):DualSampler{
  const settings=validateDualColor(a.dualColor);
  const n=palette.length;
  const cycle=palettePhase(a,world.generation,n);
  // Cache fields at most once per source per rendered frame.
  const fieldA=computeColorSignal(world,a,settings.sourceA);
  const fieldB=settings.sourceB===settings.sourceA?fieldA:
    computeColorSignal(world,a,settings.sourceB);
  const transform=(source:number,invert:boolean,offset:number,strength:number)=>
    (invert?n-1-source:source)*strength+offset;
  const sample=(i:number)=>{
    const ra=rawColorIndex(world,settings.sourceA,i,n,fieldA);
    const rb=rawColorIndex(world,settings.sourceB,i,n,fieldB);
    const ia=transform(ra,settings.invertA,settings.offsetA,settings.strengthA);
    const ib=transform(rb,settings.invertB,settings.offsetB,settings.strengthB);
    const colorA=paletteColor(palette,ia,a,cycle);
    const colorB=paletteColor(palette,ib,a,cycle);
    const t=settings.blend;
    const result:RGB=[
      colorA[0]*(1-t)+colorB[0]*t,
      colorA[1]*(1-t)+colorB[1]*t,
      colorA[2]*(1-t)+colorB[2]*t
    ];
    return {a:ra/n,b:rb/n,colorA,colorB,result};
  };
  return {color:i=>sample(i).result,sample};
}
export function hasEventColor(a:Appearance,id:'events'|'birthFlash'|'deathHeat'):boolean{
  if(a.dualColor?.enabled){
    // A blend endpoint must be EXACTLY its standalone source, including
    // whether empty cells with birth/death history are drawn at all.
    const settings=validateDualColor(a.dualColor);
    return (settings.blend<1&&settings.sourceA===id)||
      (settings.blend>0&&settings.sourceB===id);
  }
  return a.colorBy===id;
}
