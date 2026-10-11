// Typed signal vocabulary: future Rule Patchbay mappings will reference these
// identifiers rather than evaluating user-provided JavaScript.
import type { World } from './types';

export type SignalId = 'state' | 'age' | 'neighbors' | 'birth' | 'death' | 'change' | 'density' | 'generation';
export type TargetId = 'hue' | 'opacity' | 'brightness' | 'size' | 'glow' | 'trail' | 'rule-threshold';
export interface PatchCable {
  id: string;
  source: SignalId;
  target: TargetId;
  amount: number;
  enabled: boolean;
}
export const SIGNAL_LABELS: Record<SignalId, string> = {
  state:'Cell state',age:'Cell age',neighbors:'Living neighbors',
  birth:'Birth event',death:'Death event',change:'State changed',
  density:'Local density',generation:'Generation clock'
};
export function readSignal(world: World, index: number, source: SignalId): number {
  switch (source) {
    case 'state': return world.cells[index];
    case 'age': return world.ages[index];
    case 'neighbors': return world.neighbors[index];
    case 'birth': return world.events[index] === 1 ? 1 : 0;
    case 'death': return world.events[index] === 2 ? 1 : 0;
    case 'change': return world.events[index] !== 0 ? 1 : 0;
    case 'density': return world.neighbors[index] / 8;
    case 'generation': return world.generation;
  }
}
