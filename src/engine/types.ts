import paletteLibrary from '../palettes/astral-trash-palettes.json';
import {INITIAL_PRINT_SHOP,structuredClonePrint} from './printshop';
import type {PrintShop} from './printshop';
import type {DualColor} from './dual-color';
import {DEFAULT_STENCIL_MASK} from './stencil';
import {RHOMBILLE_VERTICAL_SCALE} from './rhombille';
import type {TurmiteAgent,TurmiteAlchemy,TurmiteMemory} from './spins-turmites';

export type EngineId = 'life' | 'brians' | 'cyclic' | 'wolfram' | 'generations' | 'excitable' | 'larger' | 'species' | 'oriented' | 'margolus' | 'wireworld' | 'sandpile' | 'hodgepodge' | 'forestfire' | 'ising' | 'turmites' | 'hpp';
export type LifeRule = 'conway' | 'highlife' | 'seeds' | 'daynight' | 'maze' | 'mazectric' | 'replicator' | 'diamoeba' | 'coral' | 'amoeba' | 'custom';
export type PatternId = 'noise' | 'center' | 'rings' | 'stripes' | 'checker' | 'spiral' | 'web';
export type AspectId = 'square' | 'portrait' | 'landscape' | 'portrait34' | 'landscape43' | 'portrait45' | 'landscape54' | 'portrait23' | 'landscape32';
export type ColorBy = 'state' | 'age' | 'neighbors' | 'events' | 'radius' | 'x' | 'activity' | 'entropy' | 'boundaries' | 'diversity' | 'flow' | 'birthFlash' | 'deathHeat' | 'generationWave' | 'angular' | 'diagonal' | 'gradient';
export type SkinId = 'pixels' | 'soft' | 'glow' | 'contours' | 'mercury' | 'relief' | 'glass';
export type NeighborShape = 'moore' | 'vonNeumann' | 'square2' | 'diamond2' | 'directional' | 'custom';
export type LatticeId = 'square' | 'hex' | 'triangle' | 'rhombille';
export type OrientedSymmetry = 'fixed' | 'rotations' | 'dihedral';
export type OrientedMatch = 'exact' | 'contains';
import type {MargolusEpoch,MargolusRule,MargolusMode} from './margolus-rules';

export interface SimSettings {
  engine: EngineId;
  lifeRule: LifeRule;
  cellCount: number;
  aspect: AspectId;
  seed: number;
  density: number;
  wrap: boolean;
  pattern: PatternId;
  neighborShape: NeighborShape;
  /** Clockwise NW N NE E SE S SW W selection for directional neighborhoods. */
  neighborMask: number;
  /** Custom 25-bit stencil; the center bit is always excluded. */
  customStencilMask: number;
  customStencilSize: 3|5;
  lattice: LatticeId;
  orientedMask: number;
  orientedSymmetry: OrientedSymmetry;
  orientedMatch: OrientedMatch;
  orientedSurviveMin: number;
  orientedSurviveMax: number;
  customBirth: number[];
  customSurvive: number[];
  trailDecay: number;
  cyclicStates: number;
  cyclicThreshold: number;
  /** Count 1..N−1 upcoming phases eligible to cause a real chase. */
  cyclicReach:number;
  /** Seeded per-site per-generation independent advance probability, 0..1%. */
  cyclicDrive:number;
  wolframRule: number;
  genStates: number;
  genBirth: number[];
  genSurvive: number[];
  exciteStates: number;
  exciteThreshold: number;
  /** B1 Brain-only live rule (defaults preserve canonical exactly-two rule). */
  brainBirthCount:number;
  brainBirthMatch:'exact'|'atLeast';
  brainStimulus:'off'|'clock'|'sparks';
  brainClockSource:'center'|'quad'|'ring';
  brainClockPeriod:number;
  brainSparkRate:number;
  /** External forcing; off retains original autonomous B/S/C or excitable CA. */
  waveStimulus:'off'|'sparks'|'clock';
  waveSparkRate:number;
  waveClockPeriod:number;
  waveClockSource:'center'|'quad'|'ring';
  /** B2 reversible block rule schedule, recording changes in canonical world history. */
  margolusMode:MargolusMode;
  margolusRuleA:MargolusRule;
  margolusRuleB:MargolusRule;
  margolusPeriod:number;
  largeRadius: number;
  largeBirthMin: number;
  largeBirthMax: number;
  largeSurviveMin: number;
  largeSurviveMax: number;
  speciesCount: number;
  speciesBirth: number;
  speciesSurvive: number;
  speciesAttackBias: number;
  wireBrush:1|2|3;
  /** B3 Wireworld canonical range 1..2 and optional genuine-state external driver. */
  wireExciteMin:number;
  wireExciteMax:number;
  wireDrive:'off'|'clock'|'sparks';
  wirePeriod:number;
  wireSource:'center'|'quad';
  wireSparkRate:number;
  sandFeed:number;
  sandRounds:number;
  sandSource:'center'|'random';
  sandBrush:number;
  /** Gerhardt-Schuster variant: 0 healthy, 1..N-1 sick, N ill. */
  hodgeStates:number;
  hodgeK1:number;
  hodgeK2:number;
  hodgeGrowth:number;
  hodgeBrush:number;
  /** Drossel–Schwabl-style: per-site per-generation probabilities. */
  forestGrowth:number;
  forestLightning:number;
  forestBrush:1|2;
  isingTemperature:number;
  isingCoupling:number;
  isingField:number;
  isingSweeps:number;
  isingBrush:0|1;
  turmiteRule:string;
  /** T3: true independent write rules; change live without destroying track. */
  turmiteWriteMode:'next'|'stride'|'erase'|'table';
  turmiteWriteStride:number;
  turmiteWriteTable:number[];
  /** T4 species-indexed finite-state writers and authentic same-site reaction. */
  turmiteAlchemy:TurmiteAlchemy;
  /** T5: per-ant finite-state memory alters real paths and track writes. */
  turmiteMemory:TurmiteMemory;
  /** T1: actual 1..8 complete ordered agent substeps per displayed generation. */
  turmiteSteps:number;
  /** T2: N distinct deterministic transition programs, assigned by agent ID. */
  turmiteSpeciesCount:number;
  turmiteSpeciesStride:number;
  turmiteSpeciesMirror:boolean;
  turmiteHeadingShear:number;
  turmiteContact:'shared'|'repel';
  turmiteFormation:'orbit'|'stack'|'cross';
  turmiteCount:number;
  turmiteBrush:number;
  hppBrush:number;
  hppTool:'particles'|'walls';
}
export interface Appearance {
  print?: PrintShop;
  dualColor?:DualColor;
  palette: string[];
  colorBy: ColorBy;
  // VISUAL-ONLY signal controls, deterministic by World.generation.
  signalFrequency?:number;
  signalPhase?:number;
  signalCenterX?:number;
  signalCenterY?:number;
  signalHistory?:number;
  skin: SkinId;
  showGrid: boolean;
  trails: boolean;
  paletteOffset: number;
  paletteCycle: number;
  paletteMotion: 'forward' | 'pingpong';
  paletteReverse: boolean;
  smoothPalette: boolean;
  saturation: number;
  contrast: number;
  brightness: number;
  glowStrength: number;
  skinThreshold: number;
  contourLines: number;
  contourWidth: number;
  chromeStrength: number;
  glassLines: number;
  temporalRGB: number;
  fossilOpacity: number;
}
export interface World {
  engine: EngineId;
  width: number;
  height: number;
  generation: number;
  /** True changed-cell count from the most recent simulation step (not painting). */
  stepChanged?:number;
  /** True number of external ignitions during the most recent step. */
  waveStimulusCount?:number;
  /** Fraction of actual Cyclic rule-neighbor relationships changing relative phase. */
  stepStructural?:number;
  lattice?: LatticeId;
  wrap?:boolean;
  neighborShape?:NeighborShape;
  neighborMask?:number;
  customStencilMask?:number;
  customStencilSize?:3|5;
  cells: Uint8Array;
  /** Canonical 32-bit heights, never conflated with display pixels. */
  grains?:Uint32Array;
  /** Persistent solid obstacles separate from 4-bit particle channels. */
  hppWalls?:Uint8Array;
  /** Compact active reversible schedule history; recorded rule edits survive JSON. */
  margolusEpochs?:MargolusEpoch[];
  /** Maximum Hodgepodge severity stage (8..64) for exact skin scaling. */
  hodgeStates?:number;
  /** Saved agent coordinates and headings are part of the Turmite world. */
  turmiteAgents?:TurmiteAgent[];
  turmiteRule?:string;
  ages: Uint16Array;
  neighbors: Uint8Array;
  events: Uint8Array;
  traces: Float32Array;
  // Stored for visualization only; these never influence next cell states.
  previousCells?: Uint8Array;
  olderCells?: Uint8Array;
  fossils?: Float32Array;
}

export const PALETTE_LIBRARY = paletteLibrary.palettes;
export const PALETTES: Record<string,string[]> = Object.fromEntries(
  PALETTE_LIBRARY.map(p=>[p.name.toUpperCase(),p.colors])
);
export const MOIRE_PALETTE_NAMES = PALETTE_LIBRARY.filter(p=>p.source==='itsamoire').map(p=>p.name.toUpperCase());
export const AUTOMATART_PALETTE_NAMES = PALETTE_LIBRARY.filter(p=>p.source==='automatart').map(p=>p.name.toUpperCase());

export const INITIAL_SETTINGS: SimSettings = {
  engine: 'cyclic', lifeRule:'conway', cellCount:96, aspect:'square',
  seed:82641, density:0.36, wrap:true, pattern:'noise',
  neighborShape:'moore',neighborMask:255,customStencilMask:DEFAULT_STENCIL_MASK,
  customStencilSize:5,lattice:'square',
  orientedMask:34,orientedSymmetry:'rotations',orientedMatch:'exact',
  orientedSurviveMin:2,orientedSurviveMax:3,
  customBirth:[3],customSurvive:[2,3],trailDecay:0.89,
  cyclicStates:16,cyclicThreshold:2,cyclicReach:1,cyclicDrive:0,
  wolframRule:30,
  genStates:8,genBirth:[3],genSurvive:[2,3],exciteStates:8,exciteThreshold:2,
  brainBirthCount:2,brainBirthMatch:'exact',brainStimulus:'off',
  brainClockSource:'center',brainClockPeriod:12,brainSparkRate:.001,
  waveStimulus:'off',waveSparkRate:.001,waveClockPeriod:12,waveClockSource:'center',
  margolusMode:'single',margolusRuleA:'cw',margolusRuleB:'ccw',margolusPeriod:4,
  largeRadius:2,largeBirthMin:6,largeBirthMax:9,largeSurviveMin:5,largeSurviveMax:12,
  speciesCount:3,speciesBirth:2,speciesSurvive:1,speciesAttackBias:1,
  wireBrush:1,wireExciteMin:1,wireExciteMax:2,wireDrive:'off',
  wirePeriod:12,wireSource:'center',wireSparkRate:.0002,sandFeed:6,sandRounds:3,sandSource:'center',sandBrush:8,
  hodgeStates:48,hodgeK1:2,hodgeK2:3,hodgeGrowth:12,hodgeBrush:28,
  forestGrowth:0.012,forestLightning:0.0005,forestBrush:2,
  isingTemperature:2.25,isingCoupling:1,isingField:0,isingSweeps:1,isingBrush:1,
  turmiteRule:'RL',turmiteWriteMode:'next',turmiteWriteStride:1,
  turmiteWriteTable:Array.from({length:24},(_,i)=>(i+1)%24),
  turmiteAlchemy:{enabled:false,collision:'none',species:[
    {mode:'next',stride:1,table:Array.from({length:24},(_,i)=>(i+1)%24)},
    {mode:'stride',stride:-3,table:Array.from({length:24},(_,i)=>(i+1)%24)},
    {mode:'erase',stride:1,table:Array.from({length:24},(_,i)=>(i+1)%24)},
    {mode:'table',stride:1,table:Array.from({length:24},(_,i)=>23-i)}
  ]},turmiteMemory:{enabled:false,states:8,mode:'read',turnBias:1,writeBias:0},
   turmiteSteps:1,turmiteSpeciesCount:1,turmiteSpeciesStride:0,turmiteSpeciesMirror:false,turmiteHeadingShear:0,turmiteContact:'shared',turmiteFormation:'orbit',turmiteCount:1,turmiteBrush:1,
  hppBrush:15,hppTool:'particles'
};
export const INITIAL_APPEARANCE: Appearance = {
  print:structuredClonePrint(INITIAL_PRINT_SHOP),
  // Dual patchbay is OFF until explicitly enabled.
  dualColor:{enabled:false,sourceA:'state',sourceB:'entropy',blend:.5,
    invertA:false,invertB:false,offsetA:0,offsetB:0,strengthA:1,strengthB:1},
  palette:[...PALETTES['RADIOACTIVE CANDY']],
  colorBy:'state',
  signalFrequency:3,signalPhase:0,signalCenterX:.5,
  signalCenterY:.5,signalHistory:1,skin:'glow',showGrid:false,trails:true,
  paletteOffset:0,paletteCycle:0,paletteMotion:'forward',paletteReverse:false,smoothPalette:false,
  saturation:1,contrast:1,brightness:1,glowStrength:0.8,
  skinThreshold:0.42,contourLines:5,contourWidth:1.5,
  chromeStrength:0.8,glassLines:0.7,temporalRGB:0,fossilOpacity:0
};
export const LIFE_RULES: Record<LifeRule,{birth:number[];survive:number[];label:string}> = {
  conway:{birth:[3],survive:[2,3],label:'Conway · B3/S23'},
  highlife:{birth:[3,6],survive:[2,3],label:'HighLife · B36/S23'},
  seeds:{birth:[2],survive:[],label:'Seeds · B2/S'},
  daynight:{birth:[3,6,7,8],survive:[3,4,6,7,8],label:'Day & Night · B3678/S34678'},
  maze:{birth:[3],survive:[1,2,3,4,5],label:'Maze · B3/S12345'},
  mazectric:{birth:[3],survive:[1,2,3,4],label:'Mazectric · B3/S1234'},
  replicator:{birth:[1,3,5,7],survive:[1,3,5,7],label:'Replicator · B1357/S1357'},
  diamoeba:{birth:[3,5,6,7,8],survive:[5,6,7,8],label:'Diamoeba · B35678/S5678'},
  coral:{birth:[3],survive:[4,5,6,7,8],label:'Coral · B3/S45678'},
  amoeba:{birth:[3,5,7],survive:[1,3,5,8],label:'Amoeba · B357/S1358'},
  custom:{birth:[],survive:[],label:'MY OWN B/S RULE'}
};
export function worldDimensions(s:SimSettings):[number,number] {
  // Three rhombi per underlying hexagonal motif. Keep complete hexes and
  // even offset rows so the periodic rhombille graph remains reciprocal.
  const w=s.lattice==='rhombille'?Math.ceil(s.cellCount/3)*3:s.cellCount;
  const scale=s.lattice==='rhombille'?RHOMBILLE_VERTICAL_SCALE:1;
  const aspectRatio:Record<AspectId,number>={square:1,portrait:16/9,landscape:9/16,portrait34:4/3,landscape43:3/4,portrait45:5/4,landscape54:4/5,portrait23:3/2,landscape32:2/3};
  let h=Math.round(w*aspectRatio[s.aspect]*scale);
  // Both offset-row hex wrap and staggered triangle geometry require even
  // height for undirected toroidal edge adjacency. Margolus requires even
  // dimensions too; cellCount is already even in the UI.
  if((s.lattice==='hex'||s.lattice==='triangle'||s.lattice==='rhombille'||s.engine==='margolus'||s.engine==='ising')&&h%2!==0)h++;
  return [w,Math.max(2,h)];
}
