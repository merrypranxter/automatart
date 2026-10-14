import type {Appearance,EngineId,LifeRule,SimSettings} from './types';
import {LIFE_RULES,PALETTES} from './types';
import {maxNeighborCount,supportsNeighborhood,normalizeActiveVotes} from './neighborhood';
import {rotateStencil,mirrorStencil,seededStencil,toggleStencil,allowedStencilMask,resizeStencil} from './stencil';
import {randomColors,rotatedColors,shuffledColors} from './funhouse';
import {createMutationRng,clampMutation,distinctMutation,jitterMutation} from './mutation-core';

export type MutationStrength='gentle'|'weird'|'wtf';
export interface MutationLocks {palette:boolean;rule:boolean;engine:boolean;seed:boolean}
export interface MutationOptions {
  strength:MutationStrength;
  locks:MutationLocks;
  allowRestart:boolean;
}
export interface MutationResult {
  settings:SimSettings;
  appearance:Appearance;
  mutationSeed:number;
  changes:string[];
  willRestart:boolean;
}
export const INITIAL_MUTATION_LOCKS:MutationLocks={
  palette:false,rule:false,engine:true,seed:true
};
const restartKeys=(s:SimSettings)=>[
  s.engine,s.cellCount,s.aspect,s.seed,
  s.engine==='turmites'?null:s.pattern,
  s.engine==='turmites'?null:s.density,
  s.cyclicStates,s.genStates,s.exciteStates,s.speciesCount,s.hodgeStates,s.turmiteCount,s.turmiteRule,s.lattice
];
export function requiresWorldRestart(before:SimSettings,after:SimSettings):boolean{
  const a=restartKeys(before),b=restartKeys(after);
  return a.some((v,i)=>v!==b[i]);
}
const validEngines:EngineId[]=[
  'life','brians','cyclic','wolfram','generations','excitable',
  'larger','species','oriented','margolus','wireworld','sandpile','hodgepodge','forestfire','ising','turmites','hpp'
];
const squareOnly:EngineId[]=['wolfram','larger','oriented','margolus','wireworld','sandpile','hodgepodge','forestfire','ising','turmites','hpp'];

export function mutateAutomatart(
  sourceSettings:SimSettings,
  sourceAppearance:Appearance,
  opts:MutationOptions,
  mutationSeed:number
):MutationResult{
  const rng=createMutationRng(mutationSeed);
  const s:SimSettings={...sourceSettings,
    customBirth:[...sourceSettings.customBirth],customSurvive:[...sourceSettings.customSurvive],
    genBirth:[...sourceSettings.genBirth],genSurvive:[...sourceSettings.genSurvive]};
  const a:Appearance={...sourceAppearance,palette:[...sourceAppearance.palette]};
  const actions:{label:string;run:()=>void}[]=[];
  const offer=(label:string,run:()=>void)=>actions.push({label,run});
  const choose=<T>(value:T,options:readonly T[]):T=>distinctMutation(rng,options,value);
  const intStep=(value:number,min:number,max:number,extent=2)=>
    Math.max(min,Math.min(max,value+(rng.chance(.5)?-1:1)*rng.int(1,extent)));
  const listMove=(values:number[])=>{
    const current=new Set(values);
    const index=rng.int(0,maxNeighborCount(s));
    if(current.has(index)&&current.size>1)current.delete(index);
    else current.add(index);
    return [...current].sort((x,y)=>x-y);
  };
  const floatStep=(value:number,range:number,min:number,max:number,precision=2)=>
    jitterMutation(rng,value,range,min,max,precision);
  // VISUAL parameters are always safe; these never recreate the universe.
  offer('Color signal',()=>{a.colorBy=choose(a.colorBy,['state','age','neighbors','events','radius','x','activity','entropy','boundaries','diversity','flow','birthFlash','deathHeat','generationWave','angular','diagonal','gradient'] as const)});
  offer('Skin material',()=>{a.skin=choose(a.skin,['pixels','soft','glow','contours','mercury','relief','glass'] as const)});
  offer('Chromatic drift',()=>{a.paletteCycle=floatStep(a.paletteCycle,.18,-1,1)});
  offer('Palette offset',()=>{a.paletteOffset=floatStep(a.paletteOffset,3,-12,12)});
  offer('Palette trajectory',()=>{a.paletteMotion=a.paletteMotion==='forward'?'pingpong':'forward'});
  offer('Color direction',()=>{a.paletteReverse=!a.paletteReverse});
  offer('Smooth color stops',()=>{a.smoothPalette=!a.smoothPalette});
  offer('Saturation',()=>{a.saturation=floatStep(a.saturation,.5,0,3)});
  offer('Contrast',()=>{a.contrast=floatStep(a.contrast,.38,.2,3)});
  offer('Brightness',()=>{a.brightness=floatStep(a.brightness,.32,.15,2.5)});
  offer('Fluorescent bloom',()=>{a.glowStrength=floatStep(a.glowStrength,.24,0,1)});
  offer('Temporal RGB ghosts',()=>{a.temporalRGB=floatStep(a.temporalRGB,.3,0,1)});
  offer('Death fossils',()=>{a.fossilOpacity=floatStep(a.fossilOpacity,.3,0,1)});
  offer('Contour count',()=>{a.contourLines=intStep(a.contourLines,2,9,2)});
  offer('Contour thickness',()=>{a.contourWidth=floatStep(a.contourWidth,.7,.5,6)});
  offer('Material threshold',()=>{a.skinThreshold=floatStep(a.skinThreshold,.17,.05,.95)});
  offer('Mercury reflections',()=>{a.chromeStrength=floatStep(a.chromeStrength,.4,0,1.5)});
  offer('Stained-glass lead',()=>{a.glassLines=floatStep(a.glassLines,.3,0,1)});
  offer('Cell afterimages',()=>{a.trails=!a.trails});
  offer('Grid visibility',()=>{a.showGrid=!a.showGrid});
  if(!opts.locks.palette){
    offer('Load surprise preset',()=>{
      const alternatives=Object.values(PALETTES).filter(c=>
        c.length!==a.palette.length||c.some((color,i)=>color.toLowerCase()!==a.palette[i]?.toLowerCase()));
      if(alternatives.length)a.palette=[...rng.pick(alternatives)];
    });
    offer('Invent RGB palette',()=>{a.palette=randomColors(a.palette.length,rng.float)});
    offer('Scramble color stops',()=>{a.palette=shuffledColors(a.palette,rng.float)});
    offer('Rotate color stops',()=>{a.palette=rotatedColors(a.palette,rng.int(1,a.palette.length-1))});
    offer('Replace one color',()=>{
      const index=rng.int(0,a.palette.length-1);
      a.palette[index]=randomColors(2,rng.float)[0];
    });
  }
  // A RULE lock protects the live mathematical rule, not merely the name
  // in the Life-like dropdown. Every rule candidate is engine compatible.
  if(!opts.locks.rule){
    if(s.engine!=='margolus'&&s.engine!=='wolfram'&&s.engine!=='larger'&&s.engine!=='oriented'&&s.engine!=='wireworld'&&s.engine!=='sandpile'&&s.engine!=='hodgepodge'&&s.engine!=='forestfire'&&s.engine!=='ising'&&s.engine!=='turmites'&&s.engine!=='hpp'){
      if(s.lattice==='square'){
        offer('Neighborhood shape',()=>{
          s.neighborShape=choose(s.neighborShape,['moore','vonNeumann','square2','diamond2','directional','custom'] as const);
        });
        offer('Hand-painted stencil: flip, rotate or surprise',()=>{
          s.neighborShape='custom';
          const action=rng.int(0,3);
          if(action===0)s.customStencilMask=rotateStencil(s.customStencilMask,s.customStencilSize);
          if(action===1)s.customStencilMask=mirrorStencil(s.customStencilMask,s.customStencilSize);
          if(action===2){
            const allowed=allowedStencilMask(s.customStencilSize);
            const bits=Array.from({length:25},(_,i)=>i).filter(i=>(allowed&(1<<i))!==0);
            const bit=rng.pick(bits);
            s.customStencilMask=toggleStencil(s.customStencilMask,s.customStencilSize,bit,
               !(s.customStencilMask&(1<<bit)));
          }
          if(action===3)s.customStencilMask=seededStencil(rng.int(1,0x7fffffff),s.customStencilSize);
        });
        offer('Stencil size 3×3 ↔ 5×5',()=>{
          s.customStencilSize=s.customStencilSize===3?5:3;
          s.customStencilMask=resizeStencil(s.customStencilMask,s.customStencilSize);
          s.neighborShape='custom';
        });
        offer('Directional compass neighbors',()=>{
          if(s.neighborShape!=='directional')s.neighborShape='directional';
          const bit=1<<rng.int(0,7);
          const next=s.neighborMask^bit;
          s.neighborMask=next||s.neighborMask;
        });
      }
    }
    if(s.engine!=='margolus'){
      offer('World edge behavior',()=>{s.wrap=!s.wrap});
    }
    switch(s.engine){
      case 'hpp':
        offer('HPP injection direction',()=>{s.hppBrush=choose(s.hppBrush,[1,2,4,8,5,10,15])});
        offer('Particles / wall brush material',()=>{s.hppTool=s.hppTool==='particles'?'walls':'particles'});
        break;
      case 'ising':
        offer('Temperature chaos',()=>{s.isingTemperature=floatStep(s.isingTemperature,.3,0,5,2)});
        offer('Ferromagnetic/antiferromagnetic coupling',()=>{s.isingCoupling=floatStep(s.isingCoupling,.3,-2,2,2)});
        offer('External magnetic field',()=>{s.isingField=floatStep(s.isingField,.3,-2,2,2)});
        offer('Metropolis sweeps/frame',()=>{s.isingSweeps=intStep(s.isingSweeps,1,4,1)});
        offer('Paint spin orientation',()=>{s.isingBrush=s.isingBrush===1?0:1});
        break;
      case 'turmites':
        offer('Track pigment stage',()=>{s.turmiteBrush=intStep(s.turmiteBrush,0,s.turmiteRule.length-1,1)});
        break;
      case 'hodgepodge':
        offer('Recovery wave velocity',()=>{s.hodgeGrowth=intStep(s.hodgeGrowth,1,40,4)});
        offer('Ill cell infection divisor',()=>{s.hodgeK1=intStep(s.hodgeK1,1,8,2)});
        offer('Sick cell infection divisor',()=>{s.hodgeK2=intStep(s.hodgeK2,1,8,2)});
        offer('Infection brush phase',()=>{s.hodgeBrush=intStep(s.hodgeBrush,1,s.hodgeStates,4)});
        break;
      case 'forestfire':
        offer('Seeded regrowth probability',()=>{s.forestGrowth=floatStep(s.forestGrowth,.016,0,.2,4)});
        offer('Seeded lightning probability',()=>{s.forestLightning=floatStep(s.forestLightning,.003,0,.025,5)});
        offer('Paint trees or fire',()=>{s.forestBrush=s.forestBrush===1?2:1});
        break;
      case 'wireworld':
        offer('Paint circuit material',()=>{s.wireBrush=choose(s.wireBrush,[1,2,3] as const)});
        break;
      case 'sandpile':
        offer('Avalanche feed',()=>{s.sandFeed=intStep(s.sandFeed,0,64,8)});
        offer('Toppling rounds per frame',()=>{s.sandRounds=intStep(s.sandRounds,1,8,2)});
        offer('Grain feed location',()=>{s.sandSource=s.sandSource==='center'?'random':'center'});
        offer('Sand brush grain count',()=>{s.sandBrush=intStep(s.sandBrush,1,64,8)});
        break;
      case 'life':
        offer('Life rule roulette',()=>{s.lifeRule=choose(s.lifeRule,Object.keys(LIFE_RULES) as LifeRule[])});
        offer('Personal birth rule',()=>{
          s.customBirth=listMove(s.lifeRule==='custom'?s.customBirth:LIFE_RULES[s.lifeRule].birth);
          s.customSurvive=[...(s.lifeRule==='custom'?s.customSurvive:LIFE_RULES[s.lifeRule].survive)];
          s.lifeRule='custom';
        });
        offer('Personal survival rule',()=>{
          s.customSurvive=listMove(s.lifeRule==='custom'?s.customSurvive:LIFE_RULES[s.lifeRule].survive);
          s.customBirth=[...(s.lifeRule==='custom'?s.customBirth:LIFE_RULES[s.lifeRule].birth)];
          s.lifeRule='custom';
        });
        break;
      case 'brians':
        offer('Brain firing votes',()=>{s.brainBirthCount=intStep(s.brainBirthCount??2,1,maxNeighborCount(s))});
        offer('Brain firing comparator',()=>{s.brainBirthMatch=s.brainBirthMatch==='exact'?'atLeast':'exact'});
        offer('Paired-electrode stimulus',()=>{s.brainStimulus=choose(s.brainStimulus??'off',['off','clock','sparks'] as const)});
        offer('Brain pulse interval',()=>{s.brainClockPeriod=intStep(s.brainClockPeriod??12,1,120,6)});
        offer('Brain spark frequency',()=>{s.brainSparkRate=floatStep(s.brainSparkRate??0,.001,0,.01,4)});
        break;
      case 'cyclic':
        offer('Chase threshold',()=>{s.cyclicThreshold=intStep(s.cyclicThreshold,1,maxNeighborCount(s))});
        offer('Forward chase field',()=>{s.cyclicReach=intStep(s.cyclicReach??1,1,Math.min(6,s.cyclicStates-1),2)});
        offer('Spontaneous chase sparks',()=>{s.cyclicDrive=floatStep(s.cyclicDrive??0,.0015,0,.01,4)});
        break;
      case 'wolfram':
        offer('Wolfram rule',()=>{s.wolframRule=choose(s.wolframRule,[30,54,73,90,105,110,126,150,184,225,254])});
        break;
      case 'generations':
        offer('Afterlife birth counts',()=>{s.genBirth=listMove(s.genBirth)});
        offer('Afterlife survival counts',()=>{s.genSurvive=listMove(s.genSurvive)});
        offer('Wave clock period',()=>{s.waveClockPeriod=intStep(s.waveClockPeriod??12,1,60,4)});
        offer('External wave source',()=>{s.waveStimulus=choose(s.waveStimulus??'off',['off','clock','sparks'] as const)});
        break;
      case 'excitable':
        offer('Excitation threshold',()=>{s.exciteThreshold=intStep(s.exciteThreshold,1,maxNeighborCount(s))});
        offer('Recovery stages',()=>{s.exciteStates=intStep(s.exciteStates,3,24,2)});
        offer('Wave clock period',()=>{s.waveClockPeriod=intStep(s.waveClockPeriod??12,1,60,4)});
        offer('External wave source',()=>{s.waveStimulus=choose(s.waveStimulus??'off',['off','clock','sparks'] as const)});
        break;
      case 'larger':{
        const max=(2*s.largeRadius+1)**2-1;
        offer('Wide-field birth window',()=>{
          s.largeBirthMin=intStep(s.largeBirthMin,0,s.largeBirthMax,3);
          s.largeBirthMax=intStep(s.largeBirthMax,s.largeBirthMin,max,3);
        });
        offer('Wide-field survival window',()=>{
          s.largeSurviveMin=intStep(s.largeSurviveMin,0,s.largeSurviveMax,3);
          s.largeSurviveMax=intStep(s.largeSurviveMax,s.largeSurviveMin,max,3);
        });
        offer('Neighborhood radius',()=>{
          s.largeRadius=intStep(s.largeRadius,1,5,1);
          const cap=(2*s.largeRadius+1)**2-1;
          s.largeBirthMin=Math.min(s.largeBirthMin,cap);
          s.largeBirthMax=Math.max(s.largeBirthMin,Math.min(s.largeBirthMax,cap));
          s.largeSurviveMin=Math.min(s.largeSurviveMin,cap);
          s.largeSurviveMax=Math.max(s.largeSurviveMin,Math.min(s.largeSurviveMax,cap));
        });
        break;
      }
      case 'species':
        offer('Species invasion pressure',()=>{s.speciesBirth=intStep(s.speciesBirth,1,maxNeighborCount(s))});
        offer('Species survival',()=>{s.speciesSurvive=intStep(s.speciesSurvive,0,maxNeighborCount(s))});
        offer('Species defenses',()=>{s.speciesAttackBias=intStep(s.speciesAttackBias,0,maxNeighborCount(s))});
        break;
      case 'oriented':
        offer('Directional birth stencil',()=>{s.orientedMask=Math.max(1,s.orientedMask^(1<<rng.int(0,7)))});
        offer('Directional symmetry',()=>{s.orientedSymmetry=choose(s.orientedSymmetry,['fixed','rotations','dihedral'] as const)});
        offer('Birth stencil matching',()=>{s.orientedMatch=s.orientedMatch==='exact'?'contains':'exact'});
        offer('Directional survival range',()=>{
          s.orientedSurviveMin=intStep(s.orientedSurviveMin,0,s.orientedSurviveMax);
          s.orientedSurviveMax=intStep(s.orientedSurviveMax,s.orientedSurviveMin,8);
        });
        break;
    }
    if(s.engine!=='cyclic'){
      offer('Afterimage persistence',()=>{s.trailDecay=floatStep(s.trailDecay,.07,.65,.99)});
    }
  }
  if(opts.allowRestart){
    if(!opts.locks.engine&&!opts.locks.rule){
      offer('Change automaton engine',()=>{
        s.engine=choose(s.engine,validEngines);
        if(squareOnly.includes(s.engine))s.lattice='square';
         if(!supportsNeighborhood(s.engine,s.lattice))s.neighborShape='moore';
        if(s.engine==='margolus')s.wrap=true;
      });
    }
    if(!opts.locks.seed){
      offer('Change universe seed',()=>{s.seed=(s.seed+rng.int(1,0x7fffffff))>>>0});
      if(s.engine!=='turmites'){
        offer('Mutate starting pattern',()=>{s.pattern=choose(s.pattern,['noise','center','rings','stripes','checker','spiral','web'] as const)});
        offer('Starting cell density',()=>{s.density=floatStep(s.density,.17,0.02,.95)});
      }
    }
    if(!opts.locks.rule){
      if(s.engine==='cyclic')offer('Cyclic species count',()=>{s.cyclicStates=intStep(s.cyclicStates,3,24,3)});
      if(s.engine==='generations')offer('Afterlife decay states',()=>{s.genStates=intStep(s.genStates,3,24,3)});
      if(s.engine==='excitable')offer('Refractory states',()=>{s.exciteStates=intStep(s.exciteStates,3,24,3)});
      if(s.engine==='hodgepodge')offer('Hodgepodge severity states',()=>{
        s.hodgeStates=intStep(s.hodgeStates,8,64,8);
        s.hodgeBrush=Math.min(s.hodgeBrush,s.hodgeStates);
      });
      if(s.engine==='species')offer('Competing species count',()=>{s.speciesCount=intStep(s.speciesCount,2,8)});
    }
  }
  const count=opts.strength==='gentle'?2:opts.strength==='weird'?5:9;
  const changes:string[]=[];
  const originalS=JSON.stringify(s),originalA=JSON.stringify(a);
  while(actions.length&&changes.length<count){
    const index=rng.int(0,actions.length-1);
    const [candidate]=actions.splice(index,1);
    const before=JSON.stringify(s)+JSON.stringify(a);
    candidate.run();
    if(JSON.stringify(s)+JSON.stringify(a)!==before)changes.push(candidate.label);
  }
  // When a mutation shrinks the number of phases, reconcile the chase field.
  if(s.engine==='cyclic')s.cyclicReach=Math.max(1,
    Math.min(6,s.cyclicStates-1,s.cyclicReach??1));
  // Unless user explicitly allows structural resets, the entire running CA
  // state remains intact (even across visual and local-rule mutations).
  if(!supportsNeighborhood(s.engine,s.lattice)&&!['moore','vonNeumann'].includes(s.neighborShape)){
    s.neighborShape='moore';
    changes.push('Restore engine-compatible Moore neighborhood');
  }
  // Rule locks protect inactive engine settings during visual mutation.
  if(!opts.locks.rule)Object.assign(s,normalizeActiveVotes(s));
  const willRestart=requiresWorldRestart(sourceSettings,s);
  if(willRestart&&!opts.allowRestart)throw Error('Mutation attempted an unapproved world reset');
  if(!changes.length&&(originalS===JSON.stringify(s)&&originalA===JSON.stringify(a)))
    throw Error('No compatible parameters are available for mutation');
  return {settings:s,appearance:a,mutationSeed:mutationSeed>>>0,changes,willRestart};
}
