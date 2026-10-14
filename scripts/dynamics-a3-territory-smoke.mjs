import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const jobs=[
  ['src/engine/sim.ts','scripts/.a3-sim.mjs'],
  ['src/engine/types.ts','scripts/.a3-types.mjs'],
  ['src/engine/territory-dynamics.ts','scripts/.a3-forecast.mjs'],
  ['src/engine/mutation-automatart.ts','scripts/.a3-mutation.mjs'],
  ['src/engine/world-snapshot.ts','scripts/.a3-snapshot.mjs']
];
try{
  await Promise.all(jobs.map(([entry,outfile])=>
    build({entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'})));
  const mod=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
  const {createWorld,stepWorld}=await mod(0);
  const {INITIAL_SETTINGS}=await mod(1);
  const {predictTerritoryCell,forecastTerritory,SPECIES_REGIMES,DIRECTIONAL_REGIMES}=await mod(2);
  const {requiresWorldRestart}=await mod(3);
  const {snapshotWorld,restoreWorldSnapshot}=await mod(4);
  assert.equal(SPECIES_REGIMES.length,5);
  assert.equal(DIRECTIONAL_REGIMES.length,5);
  assert.equal(new Set(SPECIES_REGIMES.map(p=>p.id)).size,SPECIES_REGIMES.length);
  assert.equal(new Set(DIRECTIONAL_REGIMES.map(p=>p.id)).size,DIRECTIONAL_REGIMES.length);
  let scenarios=0;
  for(const engine of ['species','oriented']){
    const regimes=engine==='species'?SPECIES_REGIMES:DIRECTIONAL_REGIMES;
    const cases=engine==='species'?
      [{lattice:'square',neighborShape:'moore'},
       {lattice:'square',neighborShape:'vonNeumann'},
       {lattice:'square',neighborShape:'square2'},
       {lattice:'square',neighborShape:'diamond2'},
       {lattice:'square',neighborShape:'directional',neighborMask:0b10101010},
       {lattice:'square',neighborShape:'custom'},
       {lattice:'hex',neighborShape:'moore'},
       {lattice:'triangle',neighborShape:'moore'},
       {lattice:'rhombille',neighborShape:'moore'}]:
      [{lattice:'square',neighborShape:'moore'}];
    for(const geo of cases)for(const preset of regimes)for(const wrap of [true,false]){
      const s={...INITIAL_SETTINGS,engine,cellCount:32,seed:82641,density:.36,
        aspect:'square',pattern:'noise',wrap,...geo,
        ...(engine==='species'?{
          speciesBirth:preset.birth,
          speciesSurvive:preset.survive,
          speciesAttackBias:preset.bias,
          speciesCount:4
        }:{
          orientedMask:preset.mask,orientedMatch:preset.match,
          orientedSymmetry:preset.symmetry,
          orientedSurviveMin:preset.lo,orientedSurviveMax:preset.hi
        })};
      if(engine==='species'&&geo.lattice!=='square'){
        assert(!requiresWorldRestart(s,{...s,speciesAttackBias:0}));
      }
      assert(!requiresWorldRestart(s,engine==='species'?
        {...s,speciesBirth:1,speciesSurvive:0,speciesAttackBias:0}:
        {...s,orientedMatch:'contains',orientedMask:2}));
      let world=createWorld(s);
      for(let tick=0;tick<5;tick++){
        const cellsBefore=world.cells.slice();
        const f=forecastTerritory(world,s);
        assert.equal(f.sampled,world.cells.length,'A 32-wide board gets an exact, unsampled forecast');
        const next=stepWorld(world,s);
        let births=0,captures=0,deaths=0,holds=0,empty=0;
        for(let p=0;p<cellsBefore.length;p++){
          const predicted=predictTerritoryCell(world,s,p);
          assert.equal(predicted,next.cells[p],
            'Territorial forecast MUST match the real production transition, even at wrapped edges');
          const old=cellsBefore[p],now=next.cells[p];
          if(!old&&now)births++;
          else if(old&&now&&old!==now)captures++;
          else if(old&&!now)deaths++;
          else if(old&&now)holds++;
          else empty++;
        }
        assert.equal(f.births,births);
        assert.equal(f.captures,captures);
        assert.equal(f.deaths,deaths);
        assert.equal(f.holds,holds);
        assert.equal(f.unchangedEmpty,empty);
        assert.deepEqual(world.cells,cellsBefore,'Inspector must not mutate live source cells');
        world=next;
      }
      const snapshot=snapshotWorld(world);
      const restored=restoreWorldSnapshot(snapshot,s);
      assert.deepEqual(restored.cells,world.cells,'Recipe state survives before/after forecast');
      assert.deepEqual(stepWorld(restored,s).cells,stepWorld(world,s).cells,
        'Saving does not change autonomous deterministic evolution');
      const small=forecastTerritory(world,s,100);
      assert(small.sampled<=100&&small.sampled>0,
        'Phone-safe preview limits observations on large universes');
      assert.equal(small.total,world.cells.length);
      scenarios++;
    }
  }
  // A dead territory isn't animated by prediction or a preset.
  const s={...INITIAL_SETTINGS,engine:'species',cellCount:32};
  let dead=createWorld(s);dead.cells.fill(0);
  assert.equal(forecastTerritory(dead,s).births,0);
  for(const p of SPECIES_REGIMES){
    const altered={...s,speciesBirth:p.birth,speciesSurvive:p.survive,
      speciesAttackBias:p.bias};
    assert(stepWorld(dead,altered).cells.every(v=>v===0));
  }
  assert.throws(()=>predictTerritoryCell(dead,s,-1),RangeError);
  console.log('PASS A3: '+scenarios+' presets/geometries/boundaries accurately forecast every production cell transition');
  console.log('PASS A3: no fabricated motion, source cells unchanged, deterministic recipe resume and capped phone preview');
}finally{
  await Promise.all(jobs.map(([,f])=>unlink(resolve(f)).catch(()=>{})));
}
