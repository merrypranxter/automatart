/** B3: pure canonical Wireworld unless explicitly opted into a driven or
 * generalized conductor-birth variant. The source changes TRUE cell state:
 * electron head=2; its NEXT canonical state becomes tail=3.
 */
import type {SimSettings,World} from './types';
import {random01} from './reaction-worlds';

export function wireNaturalBirth(heads:number,s:Pick<SimSettings,'wireExciteMin'|'wireExciteMax'>){
 return heads>=(s.wireExciteMin??1)&&heads<=(s.wireExciteMax??2);
}
export function wireCircuitCensus(world:World,s:SimSettings,limit=4096){
 const {cells,width:w,height:h}=world;
 const stride=Math.max(1,Math.ceil(cells.length/Math.max(1,limit)));
 let checked=0,conductors=0,heads=0,tails=0,naturalBirths=0;
 for(let p=0;p<cells.length;p+=stride){
  checked++;
  const v=cells[p];if(v===2){heads++;continue;}
  if(v===3){tails++;continue;}
  if(v!==1)continue;conductors++;
  let near=0,x=p%w,y=Math.floor(p/w);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;
   let xx=x+dx,yy=y+dy;
   if(s.wrap){xx=(xx+w)%w;yy=(yy+h)%h;}
   else if(xx<0||yy<0||xx>=w||yy>=h)continue;
   if(cells[yy*w+xx]===2)near++;
  }
  if(wireNaturalBirth(near,s))naturalBirths++;
 }
 return {checked,total:cells.length,conductors,heads,tails,naturalBirths};
}
export type WireDrive='off'|'clock'|'sparks';
export type WireSource='center'|'quad';
/** Only conductors unexcited by the normal rule can be directly pulsed.
 * Positive clock intervals permit long quiet periods: capture must not
 * truncate the movie at a transient apparent standstill.
 */
export function injectWireSignals(before:Uint8Array,next:Uint8Array,w:number,h:number,
 settings:Pick<SimSettings,'wireDrive'|'wirePeriod'|'wireSource'|'wireSparkRate'|'seed'>,
 generation:number):number{
 const mode=settings.wireDrive??'off';
 if(mode==='off')return 0;
 if(mode==='sparks'){
  const rate=settings.wireSparkRate??0;
  if(rate<=0)return 0;
  let count=0;
  for(let p=0;p<before.length;p++){
   if(before[p]===1&&next[p]===1&&
      random01(settings.seed,generation,p,211)<rate){next[p]=2;count++;}
  }
  return count;
 }
 if(mode!=='clock')throw Error('Unknown circuit driving mode');
 const period=settings.wirePeriod??12;
 if(!Number.isInteger(period)||period<1||period>120)throw Error('Invalid wire clock period');
 if((generation+1)%period!==0)return 0;
 const targets:readonly (readonly [number,number])[]=
  settings.wireSource==='quad'?
   [[Math.floor(w*.25),Math.floor(h*.25)],[Math.floor(w*.75),Math.floor(h*.25)],
    [Math.floor(w*.25),Math.floor(h*.75)],[Math.floor(w*.75),Math.floor(h*.75)]]:
   [[Math.floor(w/2),Math.floor(h/2)]];
 let fired=0;
 // Search only a small fixed region, never teleport a pulse across the
 // entire world to an unrelated wire. The source needs nearby conductor.
 const radius=18;
 for(const [cx,cy] of targets){
  let found=-1,best=Infinity;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=w||y>=h)continue;
   const p=y*w+x,d2=dx*dx+dy*dy;
   if(d2>=best||before[p]!==1||next[p]!==1)continue;
   best=d2;found=p;
  }
  if(found>=0){next[found]=2;fired++;}
 }
 return fired;
}
