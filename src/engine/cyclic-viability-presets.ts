/** Calibrated against the actual Cyclic transition engine:
 * NOISE seed, square Moore lattice, widths 48 and 96, two fixed seeds,
 * 120 generations with the final 30 measured.
 * These are observed regimes, NOT promises of indefinite motion or of
 * equivalent behavior on every lattice / seed / aspect ratio.
 */
export interface CyclicWorldPreset {
 id:string;
 label:string;
 description:string;
 states:number;
 threshold:number;
 reach:number;
 density:number;
 drive:number;
 /** Smallest measured fraction of changing phase-difference edges at t91..120. */
 measuredEdgeChange:number;
}
export const CYCLIC_STARTER_PRESETS:readonly CyclicWorldPreset[]=[
 {
  id:'filament-engine',
  label:'FILAMENT ENGINE',
  description:'Pure cellular automaton. Broad connected trails and sustained local reorganization.',
  states:16,threshold:2,reach:1,density:.36,drive:0,measuredEdgeChange:.1055
 },
 {
  id:'slow-spores',
  label:'SLOW SPORES',
  description:'Pure rule, sparser starting matter. Narrower fronts and slower spread.',
  states:12,threshold:2,reach:1,density:.2,drive:0,measuredEdgeChange:.0640
 },
 {
  id:'prismatic-drift',
  label:'PRISMATIC DRIFT',
  description:'Pure rule with a wider chase field and deliberate sluggish state transitions.',
  states:16,threshold:3,reach:3,density:.36,drive:0,measuredEdgeChange:.0144
 },
 {
  id:'seeded-bloom',
  label:'SEEDED BLOOM',
  description:'Sparse deterministic-from-seed excitations keep changing the actual automaton.',
  states:12,threshold:2,reach:1,density:.36,drive:.0005,measuredEdgeChange:.0551
 },
 {
  id:'slow-stimulus',
  label:'SLOW STIMULUS',
  description:'A slightly broader chase and sparse input events, with changing filaments.',
  states:12,threshold:2,reach:2,density:.36,drive:.001,measuredEdgeChange:.0724
 }
];
