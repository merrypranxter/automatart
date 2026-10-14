/** A3: truthful next-generation forecasts using the production local rules.
 * Sampling is evenly spaced in the CURRENT cell array (never from a palette).
 * No transitions are applied and no RNG is consumed. At <=4096 cells this
 * calculates the exact whole-world next-step census.
 */
import type {SimSettings,World} from './types';
import {neighborOffsets,orientedMatch,ORIENTED_DIRECTIONS} from './topology';

export interface TerritoryForecast {
  sampled:number;
  total:number;
  occupied:number;
  distinctSpecies:number;
  births:number;
  captures:number;
  deaths:number;
  holds:number;
  unchangedEmpty:number;
}
export const SPECIES_REGIMES=[
  {id:'open-borders',label:'OPEN BORDERS',birth:1,survive:0,bias:0,
    note:'Easy colonization, weak defenses. Live deterministic rule.'},
  {id:'frontier',label:'FRONTIER SKIRMISH',birth:1,survive:1,bias:0,
    note:'Aggressive local takeovers, but isolated cells die.'},
  {id:'kingdoms',label:'WALLED KINGDOMS',birth:2,survive:1,bias:2,
    note:'Reinforced borders with harder invasion.'},
  {id:'erosion',label:'TERRITORY EROSION',birth:2,survive:2,bias:0,
    note:'Dense allied populations survive; exposed edges erode.'},
  {id:'trench',label:'TRENCH WAR',birth:3,survive:2,bias:2,
    note:'Strong local voting is required. Often freezes or goes extinct.'}
] as const;
export const DIRECTIONAL_REGIMES=[
  {id:'axes',label:'STRICT AXES',mask:34,match:'exact',symmetry:'rotations',lo:2,hi:3,
    note:'Exact two-neighbor axes; deliberately sparse births.'},
  {id:'crosshatch',label:'CROSSHATCH BLOOM',mask:34,match:'contains',symmetry:'rotations',lo:1,hi:5,
    note:'Extra neighbors are allowed around a two-cell axis.'},
  {id:'diagonal',label:'DIAGONAL WEAVE',mask:17,match:'contains',symmetry:'rotations',lo:2,hi:4,
    note:'Diagonal pairs seed births through rotations.'},
  {id:'one-eye',label:'ONE-EYE PLAGUE',mask:2,match:'contains',symmetry:'rotations',lo:1,hi:7,
    note:'A single cardinal neighbor can trigger birth. Very aggressive.'},
  {id:'chiral',label:'CHIRAL FRONT',mask:3,match:'contains',symmetry:'fixed',lo:2,hi:5,
    note:'One fixed angled pair creates directional asymmetry.'}
] as const;

function at(cells:Uint8Array,w:number,h:number,x:number,y:number,wrap:boolean):number{
  if(wrap){x=(x+w)%w;y=(y+h)%h;}
  else if(x<0||x>=w||y<0||y>=h)return 0;
  return cells[y*w+x];
}
/** Exact prediction of ONE canonical cell. No cosmetic treatment. */
export function predictTerritoryCell(world:World,s:SimSettings,p:number):number{
  const {width:w,height:h,cells}=world;
  if(s.engine!=='species'&&s.engine!=='oriented')throw new Error('Territory forecast supports species / oriented only');
  if(p<0||p>=cells.length||!Number.isInteger(p))throw new RangeError('Invalid cell');
  const x=p%w,y=Math.floor(p/w),old=cells[p];
  if(s.engine==='oriented'){
    let mask=0,count=0;
    for(let d=0;d<ORIENTED_DIRECTIONS.length;d++){
      const [dx,dy]=ORIENTED_DIRECTIONS[d];
      if(at(cells,w,h,x+dx,y+dy,s.wrap)>0){mask|=1<<d;count++;}
    }
    return old?(count>=s.orientedSurviveMin&&count<=s.orientedSurviveMax?1:0):
      (orientedMatch(mask,s.orientedMask,s.orientedSymmetry,s.orientedMatch)?1:0);
  }
  const counts=new Uint8Array(9);
  const offsets=neighborOffsets(s.lattice,x,y,s.neighborShape,s.neighborMask,s.customStencilMask,s.customStencilSize);
  for(const [dx,dy] of offsets){
    const value=at(cells,w,h,x+dx,y+dy,s.wrap);
    if(value>0&&value<=s.speciesCount)counts[value]++;
  }
  let leader=0,best=0;
  for(let id=1;id<=s.speciesCount;id++)
    if(counts[id]>best){best=counts[id];leader=id;}
  const own=old>0?counts[old]:0;
  if(old===0)return best>=s.speciesBirth?leader:0;
  if(leader!==0&&leader!==old&&best>=s.speciesBirth&&best>=own+s.speciesAttackBias)
    return leader;
  return own>=s.speciesSurvive?old:0;
}
export function forecastTerritory(world:World,s:SimSettings,limit=4096):TerritoryForecast{
  if(world.engine!==s.engine)throw new Error('World / rule mismatch');
  const total=world.cells.length,step=Math.max(1,Math.ceil(total/Math.max(1,limit)));
  const out:TerritoryForecast={sampled:0,total,occupied:0,distinctSpecies:0,
    births:0,captures:0,deaths:0,holds:0,unchangedEmpty:0};
  const seen=new Set<number>();
  for(let p=0;p<total;p+=step){
    const before=world.cells[p],after=predictTerritoryCell(world,s,p);
    out.sampled++;
    if(before){out.occupied++;seen.add(before);}
    if(!before&&after)out.births++;
    else if(before&&after&&before!==after)out.captures++;
    else if(before&&!after)out.deaths++;
    else if(before&&after)out.holds++;
    else out.unchangedEmpty++;
  }
  out.distinctSpecies=seen.size;
  return out;
}
