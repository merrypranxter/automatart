import paletteLibrary from '../palettes/astral-trash-palettes.json';

export type EngineId = 'life' | 'brians' | 'cyclic' | 'wolfram' | 'generations' | 'excitable' | 'larger' | 'species' | 'oriented' | 'margolus';
export type LifeRule = 'conway' | 'highlife' | 'seeds' | 'daynight' | 'custom';
export type PatternId = 'noise' | 'center' | 'rings' | 'stripes' | 'checker' | 'spiral' | 'web';
export type AspectId = 'square' | 'portrait' | 'landscape';
export type ColorBy = 'state' | 'age' | 'neighbors' | 'events' | 'radius' | 'x' | 'activity';
export type SkinId = 'pixels' | 'soft' | 'glow' | 'contours' | 'mercury' | 'relief' | 'glass';
export type NeighborShape = 'moore' | 'vonNeumann';
export type LatticeId = 'square' | 'hex' | 'triangle';
export type OrientedSymmetry = 'fixed' | 'rotations' | 'dihedral';
export type OrientedMatch = 'exact' | 'contains';

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
  wolframRule: number;
  genStates: number;
  genBirth: number[];
  genSurvive: number[];
  exciteStates: number;
  exciteThreshold: number;
  largeRadius: number;
  largeBirthMin: number;
  largeBirthMax: number;
  largeSurviveMin: number;
  largeSurviveMax: number;
  speciesCount: number;
  speciesBirth: number;
  speciesSurvive: number;
  speciesAttackBias: number;
}
export interface Appearance {
  palette: string[];
  colorBy: ColorBy;
  skin: SkinId;
  showGrid: boolean;
  trails: boolean;
  paletteOffset: number;
  paletteCycle: number;
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
  lattice?: LatticeId;
  cells: Uint8Array;
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
  neighborShape:'moore',lattice:'square',
  orientedMask:17,orientedSymmetry:'rotations',orientedMatch:'exact',
  orientedSurviveMin:2,orientedSurviveMax:3,
  customBirth:[3],customSurvive:[2,3],trailDecay:0.89,
  cyclicStates:12,cyclicThreshold:2,wolframRule:30,
  genStates:8,genBirth:[3],genSurvive:[2,3],exciteStates:8,exciteThreshold:2,
  largeRadius:2,largeBirthMin:6,largeBirthMax:9,largeSurviveMin:5,largeSurviveMax:12,
  speciesCount:3,speciesBirth:2,speciesSurvive:1,speciesAttackBias:1
};
export const INITIAL_APPEARANCE: Appearance = {
  palette:[...PALETTES['RADIOACTIVE CANDY']],
  colorBy:'state',skin:'glow',showGrid:false,trails:true,
  paletteOffset:0,paletteCycle:0,paletteReverse:false,smoothPalette:false,
  saturation:1,contrast:1,brightness:1,glowStrength:0.8,
  skinThreshold:0.42,contourLines:5,contourWidth:1.5,
  chromeStrength:0.8,glassLines:0.7,temporalRGB:0,fossilOpacity:0
};
export const LIFE_RULES: Record<LifeRule,{birth:number[];survive:number[];label:string}> = {
  conway:{birth:[3],survive:[2,3],label:'Conway · B3/S23'},
  highlife:{birth:[3,6],survive:[2,3],label:'HighLife · B36/S23'},
  seeds:{birth:[2],survive:[],label:'Seeds · B2/S'},
  daynight:{birth:[3,6,7,8],survive:[3,4,6,7,8],label:'Day & Night · B3678/S34678'},
  custom:{birth:[],survive:[],label:'MY OWN B/S RULE'}
};
export function worldDimensions(s:SimSettings):[number,number] {
  const w=s.cellCount;
  let h=s.aspect==='portrait'?Math.round(w*16/9):
    s.aspect==='landscape'?Math.round(w*9/16):w;
  // Both offset-row hex wrap and staggered triangle geometry require even
  // height for undirected toroidal edge adjacency. Margolus requires even
  // dimensions too; cellCount is already even in the UI.
  if((s.lattice==='hex'||s.lattice==='triangle'||s.engine==='margolus')&&h%2!==0)h++;
  return [w,Math.max(2,h)];
}
