import { LIFE_RULES, worldDimensions } from './types';
import type { SimSettings, World } from './types';
import { neighborOffsets, orientedMatch, ORIENTED_DIRECTIONS, rotateBlocks } from './topology';
import {stepWireworld,stepSandpile,sandVisualState} from './circuits';
import {stepHodgepodge,stepForestFire} from './reaction-worlds';
import {stepIsing,stepTurmites,seedTurmites} from './spins-turmites';
import {stepHpp,paintHpp,hppCount} from './lattice-gas';
import {chaseNeighbor,cyclicAdvance,cyclicStructuralChange} from './cyclic-dynamics';
import {waveStimulusAt} from './wave-dynamics';
import {applyMargolusMap,recordMargolusEpoch,lastEpochFor,activeMargolusRule} from './margolus-rules';
import type {MargolusEpoch} from './margolus-rules';

function seededRandom(seed:number):()=>number{
  let a=seed>>>0;
  return ()=>{
    a=(a+0x6D2B79F5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
export function createWorld(s:SimSettings):World{
  const [width,height]=worldDimensions(s);
  const n=width*height;
  const cells=new Uint8Array(n),ages=new Uint16Array(n),traces=new Float32Array(n);
  const grains=s.engine==='sandpile'?new Uint32Array(n):undefined;
  const hppWalls=s.engine==='hpp'?new Uint8Array(n):undefined;
  const rand=seededRandom(s.seed),cx=(width-1)/2,cy=(height-1)/2;
  const minSide=Math.min(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=y*width+x,dx=(x-cx)/minSide,dy=(y-cy)/minSide,r=Math.hypot(dx,dy);
    let chance=s.density;
    if(s.pattern==='center')chance=r<0.16?s.density*1.7:0;
    if(s.pattern==='rings')chance=Math.sin(r*85)>0.55?s.density*1.8:s.density*0.05;
    if(s.pattern==='stripes')chance=((x+y*0.19)%17)<7?s.density*1.7:s.density*0.04;
    if(s.pattern==='checker')chance=((Math.floor(x/5)+Math.floor(y/5))%2===0)?s.density*1.9:s.density*0.08;
    if(s.pattern==='spiral')chance=Math.sin(r*62+Math.atan2(dy,dx)*8)>0.4?s.density*2:s.density*0.05;
    if(s.pattern==='web')chance=Math.sin((x-cx)*0.36)*Math.sin((y-cy)*0.36)>0.25?s.density*1.9:s.density*0.08;
    if(s.engine==='wolfram'){
      if(y!==height-1)continue;
      cells[p]=s.pattern==='center'?(x===Math.floor(cx)?1:0):(rand()<chance?1:0);
    }else if(s.engine==='wireworld'){
      if(rand()<chance){const q=rand();cells[p]=q<.055?2:q<.085?3:1;}
    }else if(s.engine==='sandpile'){
      const height=rand()<chance?1+Math.floor(rand()*20):0;
      grains![p]=height;cells[p]=sandVisualState(height);
    }else if(s.engine==='hpp'){
      let mask=0;for(const bit of [1,2,4,8])if(rand()<Math.min(1,chance))mask|=bit;
      cells[p]=mask;
    }else if(s.engine==='ising'){
      cells[p]=rand()<chance?1:0;
    }else if(s.engine==='turmites'){
      cells[p]=0;
    }else if(s.engine==='hodgepodge'){
      cells[p]=rand()<chance?1+Math.floor(rand()*s.hodgeStates):0;
    }else if(s.engine==='forestfire'){
      if(rand()<chance)cells[p]=rand()<.015?2:1;
    }else if(s.engine==='cyclic'){
      cells[p]=rand()<chance?1+Math.floor(rand()*(s.cyclicStates-1)):0;
    }else if(s.engine==='brians'){
      cells[p]=rand()<chance?(rand()<0.22?2:1):0;
    }else if(s.engine==='species'){
      cells[p]=rand()<chance?1+Math.floor(rand()*s.speciesCount):0;
    }else if(s.engine==='generations'||s.engine==='excitable'){
      // Some seeding into refractory phases creates moving wave boundaries.
      const nstates=s.engine==='generations'?s.genStates:s.exciteStates;
      cells[p]=rand()<chance?(rand()<0.76?1:2+Math.floor(rand()*(nstates-2))):0;
    }else cells[p]=rand()<chance?1:0;
    if(cells[p]>0||s.engine==='cyclic'){ages[p]=1;traces[p]=1;}
  }
  const turmiteAgents=s.engine==='turmites'?seedTurmites(width,height,s.turmiteCount,s.seed):undefined;
  return {engine:s.engine,lattice:s.lattice,wrap:s.wrap,neighborShape:s.engine==='sandpile'||s.engine==='forestfire'||s.engine==='ising'||s.engine==='turmites'||s.engine==='hpp'?'vonNeumann':
      s.engine==='hodgepodge'?'moore':s.neighborShape,neighborMask:s.neighborMask,
    customStencilMask:s.customStencilMask,customStencilSize:s.customStencilSize,width,height,generation:0,cells,grains,hppWalls,turmiteAgents,
    turmiteRule:s.engine==='turmites'?s.turmiteRule:undefined,hodgeStates:s.engine==='hodgepodge'?s.hodgeStates:undefined,ages,
    neighbors:new Uint8Array(n),events:new Uint8Array(n),traces,
    previousCells:cells.slice(),olderCells:cells.slice(),fossils:new Float32Array(n),
    margolusEpochs:s.engine==='margolus'?[]:undefined};
}

function valueAt(cells:Uint8Array|Uint32Array,w:number,h:number,x:number,y:number,wrap:boolean):number{
  if(wrap){x=(x+w)%w;y=(y+h)%h;}
  else if(x<0||x>=w||y<0||y>=h)return 0;
  return cells[y*w+x];
}

export function stepWorld(prev:World,s:SimSettings):World{
  const {width:w,height:h,cells,ages,traces}=prev,n=w*h;
  const next=new Uint8Array(n),nextAges=new Uint16Array(n);
  let nextGrains:Uint32Array|undefined;
  const neighbors=new Uint8Array(n),events=new Uint8Array(n),nextTraces=new Float32Array(n);
  const nextFossils=new Float32Array(n);
  let nextAgents=prev.turmiteAgents;
  let waveStimulusCount=0;
  let margolusEpochs:MargolusEpoch[]|undefined=prev.margolusEpochs;
  const waveParams={mode:s.waveStimulus??'off',source:s.waveClockSource??'center',
    rate:s.waveSparkRate??0,period:s.waveClockPeriod??12,
    seed:s.seed,generation:prev.generation};
  if(s.engine==='hpp'){
    if(!prev.hppWalls)throw new Error('Missing canonical HPP obstacle array');
    next.set(stepHpp(cells,w,h,s.wrap,prev.hppWalls));
    const cardinal=neighborOffsets('square',0,0,'vonNeumann');
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      for(const [dx,dy] of cardinal)
        if(hppCount(valueAt(cells,w,h,x+dx,y+dy,s.wrap))>0)neighbors[p]++;
    }
  }else if(s.engine==='ising'){
    next.set(stepIsing(cells,w,h,s.wrap,{temperature:s.isingTemperature,
      coupling:s.isingCoupling,field:s.isingField,sweeps:s.isingSweeps,
      seed:s.seed,generation:prev.generation}));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      for(const [dx,dy] of neighborOffsets('square',x,y,'vonNeumann'))
        if(valueAt(cells,w,h,x+dx,y+dy,s.wrap)===1)neighbors[p]++;
    }
  }else if(s.engine==='turmites'){
    if(!prev.turmiteAgents)throw new Error('Missing Turmite agents');
    const result=stepTurmites(cells,w,h,s.wrap,s.turmiteRule,prev.turmiteAgents);
    next.set(result.cells);nextAgents=result.agents;
    const cardinal=neighborOffsets('square',0,0,'vonNeumann');
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      for(const [dx,dy] of cardinal)
        if(valueAt(cells,w,h,x+dx,y+dy,s.wrap)>0)neighbors[p]++;
    }
  }else if(s.engine==='hodgepodge'){
    next.set(stepHodgepodge(cells,w,h,s.wrap,{states:s.hodgeStates,
      k1:s.hodgeK1,k2:s.hodgeK2,growth:s.hodgeGrowth}));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      for(const [dx,dy] of neighborOffsets('square',x,y,'moore'))
        if(valueAt(cells,w,h,x+dx,y+dy,s.wrap)>0)neighbors[p]++;
    }
  }else if(s.engine==='forestfire'){
    next.set(stepForestFire(cells,w,h,s.wrap,{seed:s.seed,generation:prev.generation,
      growth:s.forestGrowth,lightning:s.forestLightning}));
    const dirs=neighborOffsets('square',0,0,'vonNeumann');
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      for(const [dx,dy] of dirs)
        if(valueAt(cells,w,h,x+dx,y+dy,s.wrap)===2)neighbors[p]++;
    }
  }else if(s.engine==='wireworld'){
    next.set(stepWireworld(cells,w,h,s.wrap));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      for(const [dx,dy] of neighborOffsets('square',x,y,'moore')){
        if(valueAt(cells,w,h,x+dx,y+dy,s.wrap)===2)neighbors[p]++;
      }
    }
  }else if(s.engine==='sandpile'){
    if(!prev.grains)throw new Error('Missing canonical sandpile grain array');
    const result=stepSandpile(prev.grains,w,h,s.wrap,s.sandFeed,s.sandRounds,
      s.seed,prev.generation,s.sandSource);
    nextGrains=result.grains;
    const cardinal=neighborOffsets('square',0,0,'vonNeumann');
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      next[p]=sandVisualState(nextGrains[p]);
      // This field means contributing neighboring piles, not the site's
      // own toppling count. The latter belongs to a separate future mapping.
      for(const [dx,dy] of cardinal)
        if(valueAt(prev.grains,w,h,x+dx,y+dy,s.wrap)>0)neighbors[p]++;
    }
  }else if(s.engine==='margolus'){
    // Exactly reversible local 2x2 binary permutations; the full transition
    // schedule is logged as compact epochs, so live knob edits rewind truly.
    margolusEpochs=recordMargolusEpoch(prev.margolusEpochs,prev.generation,s);
    const epoch=margolusEpochs[margolusEpochs.length-1];
    next.set(applyMargolusMap(cells,w,h,(prev.generation%2) as 0|1,
      activeMargolusRule(epoch,prev.generation)));
  }else if(s.engine==='wolfram'){
    // History scrolls one row upward. New state comes from the previous bottom row.
    next.set(cells.subarray(w),0);
    const row=(h-1)*w;
    for(let x=0;x<w;x++){
      const l=!s.wrap&&x===0?0:cells[row+(x+w-1)%w];
      const c=cells[row+x];
      const r=!s.wrap&&x===w-1?0:cells[row+(x+1)%w];
      const bit=((l>0?1:0)<<2)|((c>0?1:0)<<1)|(r>0?1:0);
      next[row+x]=(s.wolframRule>>bit)&1;
    }
  }else{
    const life=s.lifeRule==='custom'
      ?{birth:s.customBirth??[3],survive:s.customSurvive??[2,3]}:LIFE_RULES[s.lifeRule];
    const radius=s.engine==='larger'?Math.max(1,Math.min(5,s.largeRadius)):1;
    const speciesCounts=new Uint8Array(9); // 1..8 species, zero means empty.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x,old=cells[p];
      let count=0;
      if(s.engine==='species')speciesCounts.fill(0);
      let orientedBits=0;
      if(s.engine==='oriented'){
        for(let d=0;d<ORIENTED_DIRECTIONS.length;d++){
          const [ox,oy]=ORIENTED_DIRECTIONS[d];
          const value=valueAt(cells,w,h,x+ox,y+oy,s.wrap);
          if(value>0){orientedBits|=1<<d;count++;}
        }
      }else{
        const offsets=s.engine==='larger'?null:neighborOffsets(s.lattice,x,y,s.neighborShape,s.neighborMask,s.customStencilMask,s.customStencilSize);
        if(offsets){
          for(const [ox,oy] of offsets){
            if(s.engine==='cyclic'&&!s.wrap&&
               (x+ox<0||x+ox>=w||y+oy<0||y+oy>=h))continue;
            const value=valueAt(cells,w,h,x+ox,y+oy,s.wrap);
            if(s.engine==='species'){
              if(value>0&&value<=s.speciesCount){speciesCounts[value]++;count++;}
            }else if(s.engine==='cyclic'?
               chaseNeighbor(value,old,s.cyclicStates,s.cyclicReach??1):value===1)count++;
          }
        }else{
          for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
            if(ox===0&&oy===0)continue;
            const value=valueAt(cells,w,h,x+ox,y+oy,s.wrap);
            if(value===1)count++;
          }
        }
      }
      neighbors[p]=Math.min(255,count);
      switch(s.engine){
        case 'life':
          next[p]=old?(life.survive.includes(count)?1:0):(life.birth.includes(count)?1:0);
          break;
        case 'oriented':
          next[p]=old
            ?(count>=s.orientedSurviveMin&&count<=s.orientedSurviveMax?1:0)
            :(orientedMatch(orientedBits,s.orientedMask,s.orientedSymmetry,s.orientedMatch)?1:0);
          break;
        case 'brians':
          next[p]=old===1?2:old===2?0:count===2?1:0;
          break;
        case 'cyclic':
          next[p]=cyclicAdvance(old,count,s.cyclicThreshold,s.cyclicDrive??0,
            s.seed,prev.generation,p,s.cyclicStates);
          break;
        case 'generations':{
          // Exact B/S/C when waveStimulus='off'. External sources can only
          // inject life into genuinely resting sites that did not naturally birth.
          if(old===0){
            const birth=s.genBirth.includes(count);
            const inject=!birth&&waveStimulusAt(old,x,y,w,h,waveParams);
            if(inject)waveStimulusCount++;
            next[p]=birth||inject?1:0;
          }else next[p]=old===1?(s.genSurvive.includes(count)?1:2)
            :(old+1>=s.genStates?0:old+1);
          break;
        }
        case 'excitable':{
          // Original Greenberg–Hastings recovery stays exact. Any optional
          // seeded/clocked stimulus fires a state-0 CELL, not its color layer.
          if(old===0){
            const naturally=count>=s.exciteThreshold;
            const inject=!naturally&&waveStimulusAt(old,x,y,w,h,waveParams);
            if(inject)waveStimulusCount++;
            next[p]=naturally||inject?1:0;
          }else next[p]=old+1>=s.exciteStates?0:old+1;
          break;
        }
        case 'larger':
          next[p]=old?(count>=s.largeSurviveMin&&count<=s.largeSurviveMax?1:0)
            :(count>=s.largeBirthMin&&count<=s.largeBirthMax?1:0);
          break;
        case 'species':{
          // Deterministic local competition: each species only sees its 8/4
          // neighbors. Equal enemy counts break to lower species ID.
          let leader=0,best=0;
          for(let id=1;id<=s.speciesCount;id++){
            const number=speciesCounts[id];
            if(number>best){best=number;leader=id;}
          }
          const own=old>0?speciesCounts[old]:0;
          if(old===0){
            next[p]=best>=s.speciesBirth?leader:0;
          }else if(leader!==0&&leader!==old
            &&best>=s.speciesBirth&&best>=own+s.speciesAttackBias){
            next[p]=leader;
          }else next[p]=own>=s.speciesSurvive?old:0;
          break;
        }
      }
    }
  }
  let stepChanged=0;
  for(let i=0;i<n;i++){
    const old=cells[i],now=next[i];
    if(old!==now)stepChanged++;
    nextAges[i]=(now===0&&s.engine!=='cyclic')?0:
      (old===now?Math.min(65535,ages[i]+1):1);
    if(s.engine==='cyclic'){
      if(old!==now)events[i]=3;
    }else if(s.engine==='sandpile'){
      const before=prev.grains![i],after=nextGrains![i];
      if(before===0&&after>0)events[i]=1;
      else if(before>0&&after===0)events[i]=2;
      else if(before!==after)events[i]=3;
    }else if(old===0&&now!==0)events[i]=1;
    else if(old!==0&&now===0)events[i]=2;
    else if(old!==now)events[i]=3;
    nextTraces[i]=s.engine==='cyclic'?1:Math.max(now>0?1:0,traces[i]*(s.trailDecay??0.89));
    // Rendering archive: death (or cyclic state transition) leaves a fading
    // fossil. This information never enters the cellular transition rules.
    const deposit=s.engine==='cyclic'?(old!==now?0.8:0)
      :(old!==0&&now===0?1:old!==now?0.12:0);
    nextFossils[i]=Math.max(deposit,(prev.fossils?.[i]??0)*0.986);
  }
  const stepStructural=s.engine==='cyclic'?cyclicStructuralChange(
    cells,next,w,h,s.cyclicStates,s.wrap,s):undefined;
  return {engine:s.engine,lattice:s.lattice,wrap:s.wrap,neighborShape:s.engine==='sandpile'||s.engine==='forestfire'||s.engine==='ising'||s.engine==='turmites'||s.engine==='hpp'?'vonNeumann':
      s.engine==='hodgepodge'?'moore':s.neighborShape,neighborMask:s.neighborMask,
    customStencilMask:s.customStencilMask,customStencilSize:s.customStencilSize,width:w,height:h,generation:prev.generation+1,stepChanged,stepStructural,waveStimulusCount,margolusEpochs,
    cells:next,grains:nextGrains,hppWalls:prev.hppWalls?.slice(),turmiteAgents:nextAgents?.map(a=>({...a})),
    turmiteRule:s.engine==='turmites'?s.turmiteRule:undefined,hodgeStates:s.engine==='hodgepodge'?s.hodgeStates:undefined,
    ages:nextAges,neighbors,events,traces:nextTraces,
    previousCells:cells.slice(),
    olderCells:prev.previousCells?.slice()??cells.slice(),
    fossils:nextFossils};
}
/** Exact inverse of Margolus CELL STATES. Ages/fossils are visual history,
 * not reversible state; we reset them to avoid falsely claiming their inverse.
 */
export function rewindWorld(prev:World,s:SimSettings):World{
  if(s.engine!=='margolus')throw new Error('Rewind is only valid for Margolus');
  if(prev.generation===0)return prev;
  const {width:w,height:h,cells}=prev;
  const tick=prev.generation-1,phase=(tick%2) as 0|1;
  const history=prev.margolusEpochs??[{start:0,mode:'single' as const,a:'cw' as const,
    b:'cw' as const,period:1}];
  const epoch=lastEpochFor(history,tick);
  const earlier=applyMargolusMap(cells,w,h,phase,activeMargolusRule(epoch,tick),true);
  // Undo the final transition and prune branches of future rule history.
  // Existing earlier epochs remain exact even if the live current rule changed.
  const margolusEpochs=history.filter(record=>record.start<tick);
  const n=w*h,ages=new Uint16Array(n),traces=new Float32Array(n);
  const events=new Uint8Array(n);
  for(let i=0;i<n;i++){
    ages[i]=earlier[i]?1:0;traces[i]=earlier[i]?1:0;
    if(!cells[i]&&earlier[i])events[i]=1;
    else if(cells[i]&&!earlier[i])events[i]=2;
    else if(cells[i]!==earlier[i])events[i]=3;
  }
  return {engine:'margolus',lattice:'square',wrap:s.wrap,neighborShape:s.neighborShape,neighborMask:s.neighborMask,
    customStencilMask:s.customStencilMask,customStencilSize:s.customStencilSize,width:w,height:h,
    generation:prev.generation-1,cells:earlier,ages,traces,events,margolusEpochs,
    neighbors:new Uint8Array(n),previousCells:earlier.slice(),
    olderCells:earlier.slice(),fossils:new Float32Array(n)};
}
export function paintWorld(world:World,s:SimSettings,x:number,y:number,radius:number,erase=false,species=1):void{
  if(s.engine==='sandpile'&&world.grains&&!erase){
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(dx*dx+dy*dy>radius*radius)continue;
      const xx=x+dx,yy=y+dy;
      if(xx<0||yy<0||xx>=world.width||yy>=world.height)continue;
      if(world.grains[yy*world.width+xx]>0xffffffff-s.sandBrush)
        throw new RangeError('Cannot paint: 32-bit grain count overflow');
    }
  }
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    if(dx*dx+dy*dy>radius*radius)continue;
    const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=world.width||yy>=world.height)continue;
    const p=yy*world.width+xx;
    if(s.engine==='hpp'&&world.hppWalls){
      paintHpp(world.cells,world.hppWalls,[p],s.hppTool,s.hppBrush,erase?'erase':'paint');
    }else if(s.engine==='sandpile'&&world.grains){
      const before=world.grains[p];
      const height=erase?0:before+s.sandBrush;
      world.grains[p]=height;world.cells[p]=sandVisualState(height);
    }else world.cells[p]=erase?0:s.engine==='ising'?s.isingBrush:
      s.engine==='turmites'?s.turmiteBrush:s.engine==='hodgepodge'?s.hodgeBrush:
      s.engine==='forestfire'?s.forestBrush:s.engine==='wireworld'?s.wireBrush:s.engine==='cyclic'?Math.max(1,Math.floor(s.cyclicStates/2))
      :s.engine==='species'?Math.min(s.speciesCount,Math.max(1,species)):1;
    world.ages[p]=erase?0:1;
    world.traces[p]=erase?0:1;
    world.events[p]=erase?2:1;
    if(world.fossils)world.fossils[p]=erase?1:0;
  }
}
