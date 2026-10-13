import type {Appearance,ColorBy,World} from './types';
import {neighborOffsets} from './topology';

export const NEW_COLOR_SIGNALS:ReadonlyArray<{id:ColorBy;label:string;explanation:string}>= [
  {id:'entropy',label:'Local entropy → mixed-state disorder',explanation:'Normalized Shannon entropy of nearby cell-state frequencies. High where surrounding states are diverse and balanced.'},
  {id:'boundaries',label:'Cell boundaries → unlike-state edges',explanation:'Fraction of adjacent cells in states different from the current cell.'},
  {id:'diversity',label:'Neighbor diversity → different species',explanation:'Number of distinct states among nearby cells, scaled to the state space. Binary rules naturally have less variety.'},
  {id:'flow',label:'Directional flow → moving activity',explanation:'Angle of the weighted local activity change between recent generations; a visual estimate, not simulated velocity.'},
  {id:'birthFlash',label:'Birth flash → newborn lightning',explanation:'Highlights newly born cells, then fades through their first few generations.'},
  {id:'deathHeat',label:'Death heatmap → recent ghosts',explanation:'Recent death/transition deposits in the deterministic fossil history, with adjustable fade sensitivity.'},
  {id:'generationWave',label:'Generation interference → time waves',explanation:'Position and integer generation produce moving sinusoidal color interference; independent of the wall clock.'},
  {id:'angular',label:'Angular rainbow → radial hue',explanation:'Cell angle around your chosen center maps to a chromatic hue circle.'},
  {id:'diagonal',label:'Diagonal interference → stripe collision',explanation:'Crossing diagonal waves combine position and generation into interference bands.'},
  {id:'gradient',label:'Neighborhood gradient → edge energy',explanation:'Magnitude of the spatial change in local occupied-cell density, measured over the actual lattice graph.'}
] as const;
export const NEW_COLOR_IDS=new Set<ColorBy>(NEW_COLOR_SIGNALS.map(v=>v.id));
export function isNewColorSignal(id:ColorBy):boolean{return NEW_COLOR_IDS.has(id);}
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const fract=(v:number)=>((v%1)+1)%1;
export function signalOptions(a:Appearance){
  const frequency=typeof a.signalFrequency==='number'&&Number.isFinite(a.signalFrequency)?clamp(a.signalFrequency!,.2,12):3;
  const phase=typeof a.signalPhase==='number'&&Number.isFinite(a.signalPhase)?clamp(a.signalPhase!,-6.28,6.28):0;
  const centerX=typeof a.signalCenterX==='number'&&Number.isFinite(a.signalCenterX)?clamp(a.signalCenterX!):.5;
  const centerY=typeof a.signalCenterY==='number'&&Number.isFinite(a.signalCenterY)?clamp(a.signalCenterY!):.5;
  const history=typeof a.signalHistory==='number'&&Number.isFinite(a.signalHistory)?clamp(a.signalHistory!,.05,3):1;
  return {frequency,phase,centerX,centerY,history};
}
function maxStates(world:World){
  if(world.engine==='cyclic'||world.engine==='species'||world.engine==='generations'||world.engine==='excitable')return 12;
  if(world.engine==='brians')return 3;
  if(world.engine==='wireworld')return 4;
  if(world.engine==='sandpile')return 256;
  return 2;
}
function at(world:World,x:number,y:number):number{
  const w=world.width,h=world.height;
  if(world.wrap){
    x=((x%w)+w)%w;y=((y%h)+h)%h;
  }else if(x<0||y<0||x>=w||y>=h)return -1;
  return y*w+x;
}
function active(world:World,index:number):number{
  if(index<0)return 0;
  return world.cells[index]!==0?1:0;
}
function neighbors(world:World,x:number,y:number):number[]{
  const offsets=neighborOffsets(world.lattice??'square',x,y,(world.engine==='sandpile'?'vonNeumann':world.neighborShape??'moore'),world.neighborMask??255,
    world.customStencilMask,world.customStencilSize);
  const out:number[]=[];
  for(const [dx,dy] of offsets){
    const index=at(world,x+dx,y+dy);
    if(index>=0)out.push(index);
  }
  return out;
}
export function computeColorSignal(world:World,a:Appearance,id:ColorBy=a.colorBy):Float32Array|null{
  if(!NEW_COLOR_IDS.has(id))return null;
  const {width:w,height:h,cells,events,ages}=world;
  const out=new Float32Array(cells.length);
  const opts=signalOptions(a);
  const gridDependent=id==='entropy'||id==='boundaries'||id==='diversity'||id==='flow'||id==='gradient';
  const densities=id==='gradient'?new Float32Array(cells.length):null;
  if(densities){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const index=y*w+x,nb=neighbors(world,x,y);
      let n=active(world,index);
      for(const p of nb)n+=active(world,p);
      densities[index]=n/(nb.length+1);
    }
  }
  const cardinality=Math.max(2,maxStates(world));
  const flowPrevious=world.previousCells??cells;
  const flowOlder=world.olderCells??flowPrevious;
  const tau=Math.PI*2;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    const u=(x+.5)/w,v=(y+.5)/h;
    let value=0;
    const nb=gridDependent?neighbors(world,x,y):[];
    switch(id){
      case 'entropy':{
        if(!nb.length)break;
        const hist=new Map<number,number>();
        for(const p of nb)hist.set(cells[p],(hist.get(cells[p])??0)+1);
        let entropy=0;
        for(const amount of hist.values()){
          const q=amount/nb.length;
          entropy-=q*Math.log(q);
        }
        value=entropy/Math.log(Math.max(2,Math.min(cardinality,nb.length)));
        break;
      }
      case 'boundaries':{
        let diff=0;
        for(const p of nb)if(cells[p]!==cells[i])diff++;
        value=diff/Math.max(1,nb.length);
        break;
      }
      case 'diversity':{
        const kinds=new Set<number>();
        for(const p of nb)kinds.add(cells[p]);
        value=(kinds.size-1)/Math.max(1,Math.min(cardinality,nb.length)-1);
        break;
      }
      case 'flow':{
        let vx=0,vy=0,energy=0;
        const offsets=neighborOffsets(world.lattice??'square',x,y,(world.engine==='sandpile'?'vonNeumann':world.neighborShape??'moore'),world.neighborMask??255,
    world.customStencilMask,world.customStencilSize);
        for(const [dx,dy] of offsets){
          const p=at(world,x+dx,y+dy);
          if(p<0)continue;
          const change=(cells[p]!==flowPrevious[p]?1:0)+((flowPrevious[p]!==flowOlder[p] ? 0.5*opts.history : 0));
          vx+=dx*change;vy+=dy*change;energy+=change;
        }
        if(energy>0&&Math.hypot(vx,vy)>.001){
          const angle=(Math.atan2(vy,vx)+Math.PI)/tau;
          value=fract(angle+opts.phase/tau);
        }else value=.035;
        break;
      }
      case 'birthFlash':{
        const born=events[i]===1;
        const change=world.engine==='cyclic'&&events[i]===3;
        value=born||change?1:cells[i]>0?Math.exp(-Math.max(0,ages[i]-1)/Math.max(1,opts.history*5)):.02;
        break;
      }
      case 'deathHeat':{
        const fossil=world.fossils?.[i]??0;
        value=clamp((events[i]===2?1:(world.engine==='cyclic'&&events[i]===3?0.75:fossil))*opts.history);
        break;
      }
      case 'generationWave':{
        const t=opts.frequency*(u*1.17+v*.71)+world.generation*.018+opts.phase/tau;
        value=clamp((Math.sin(t*tau)+Math.sin((t*.73+v*.8)*tau)+2)/4);
        break;
      }
      case 'angular':{
        value=fract(Math.atan2(v-opts.centerY,u-opts.centerX)/tau+opts.phase/tau+.5);
        break;
      }
      case 'diagonal':{
        const t=world.generation*.012+opts.phase/tau;
        const d1=Math.sin((u+v)*opts.frequency*tau+t*tau);
        const d2=Math.sin((u-v)*opts.frequency*tau-t*.77*tau);
        value=clamp((d1*d2+1)/2);
        break;
      }
      case 'gradient':{
        let dx=0,dy=0;
        for(const p of nb){
          const ox=p%w-x,oy=Math.floor(p/w)-y;
          // Toroidal edges must use the shortest wrapped displacement.
          const xDir=world.wrap&&Math.abs(ox)>w/2?(ox>0?ox-w:ox+w):ox;
          const yDir=world.wrap&&Math.abs(oy)>h/2?(oy>0?oy-h:oy+h):oy;
          const delta=densities![p]-densities![i];
          dx+=Math.sign(xDir)*delta;dy+=Math.sign(yDir)*delta;
        }
        value=clamp(Math.hypot(dx,dy)*.55);
        break;
      }
    }
    out[i]=clamp(value);
  }
  return out;
}
export function signalIndex(signal:Float32Array|null,i:number,paletteLength:number):number{
  return (signal?.[i]??0)*(Math.max(1,paletteLength)-.02);
}
export function signalSample(world:World,a:Appearance,x:number,y:number){
  const index=y*world.width+x;
  const field=computeColorSignal(world,a,a.colorBy);
  return {x,y,state:world.cells[index],age:world.ages[index],
    event:world.events[index],value:field?.[index]??null};
}
