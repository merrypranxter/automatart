export type EngineId = 'life' | 'brians' | 'cyclic' | 'wolfram';
export type LifeRule = 'conway' | 'highlife' | 'seeds' | 'daynight';
export type PatternId = 'noise' | 'center' | 'rings' | 'stripes';
export type AspectId = 'square' | 'portrait' | 'landscape';
export type ColorBy = 'state' | 'age' | 'neighbors' | 'events';
export type SkinId = 'pixels' | 'soft' | 'glow';

export interface SimSettings {
  engine: EngineId;
  lifeRule: LifeRule;
  cellCount: number;
  aspect: AspectId;
  seed: number;
  density: number;
  wrap: boolean;
  pattern: PatternId;
  cyclicStates: number;
  cyclicThreshold: number;
  wolframRule: number;
}
export interface Appearance {
  palette: string[];
  colorBy: ColorBy;
  skin: SkinId;
  showGrid: boolean;
  trails: boolean;
}
export interface World {
  width: number;
  height: number;
  generation: number;
  cells: Uint8Array;
  ages: Uint16Array;
  neighbors: Uint8Array;
  events: Uint8Array;
  traces: Float32Array;
}
export const INITIAL_SETTINGS: SimSettings = {
  engine: 'cyclic', lifeRule: 'conway', cellCount: 96, aspect: 'square',
  seed: 82641, density: 0.36, wrap: true, pattern: 'noise',
  cyclicStates: 12, cyclicThreshold: 2, wolframRule: 30
};
export const PALETTES: Record<string, string[]> = {
  'RADIOACTIVE CANDY': ['#ff24b9','#fdf428','#13f8d8','#7b30fa','#ff7527','#169dff'],
  'ASTRAL JEWELRY': ['#240b7e','#d8fa24','#ed18dd','#2beefa','#ffffff','#9c3df8'],
  'TECHNICOLOR INFECTION': ['#fa1c53','#ff8e1c','#faf21b','#29ee70','#1689ef','#c026ff'],
  'DEEP ULTRAVIOLET': ['#21104c','#5130c8','#ff32db','#14a9f6','#bb70fa','#ffffff'],
  'VOID & BONE': ['#ffffff','#d9d0ff','#aaa2da','#8573a6','#534774','#f3f0e7']
};
export const INITIAL_APPEARANCE: Appearance = {
  palette: [...PALETTES['RADIOACTIVE CANDY']],
  colorBy: 'state', skin: 'glow', showGrid: false, trails: true
};
export const LIFE_RULES: Record<LifeRule, { birth: number[]; survive: number[]; label: string }> = {
  conway: {birth:[3], survive:[2,3], label:'Conway · B3/S23'},
  highlife: {birth:[3,6], survive:[2,3], label:'HighLife · B36/S23'},
  seeds: {birth:[2], survive:[], label:'Seeds · B2/S'},
  daynight: {birth:[3,6,7,8], survive:[3,4,6,7,8], label:'Day & Night · B3678/S34678'}
};
export function worldDimensions(s: SimSettings): [number, number] {
  const w = s.cellCount;
  const h = s.aspect === 'portrait' ? Math.round(w * 16 / 9)
    : s.aspect === 'landscape' ? Math.round(w * 9 / 16) : w;
  return [w, Math.max(1, h)];
}
