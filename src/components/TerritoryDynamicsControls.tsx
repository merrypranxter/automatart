import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DIRECTIONAL_REGIMES,SPECIES_REGIMES,forecastTerritory} from '../engine/territory-dynamics';

interface Props{
  settings:SimSettings;
  setSettings:Dispatch<SetStateAction<SimSettings>>;
  world:World;
  neighborMax:number;
}
export default function TerritoryDynamicsControls({settings:s,setSettings,world,neighborMax}:Props){
  const species=s.engine==='species';
  const forecast=world.engine===s.engine?forecastTerritory(world,s):null;
  const pct=(n:number)=>forecast&&forecast.sampled?
    (100*n/forecast.sampled).toFixed(n===0?0:2)+'%':'—';
  const count=(n:number)=>forecast?String(n):'—';
  const edits=forecast?forecast.births+forecast.captures+forecast.deaths:0;
  return <section className="cyclic-dynamics-lab territory-dynamics-lab"
    aria-label={species?'Species War territory dynamics':'Directional Life birth dynamics'}>
    <div className="cyclic-dynamics-heading">
      <strong>⚔ A3 · {species?'SPECIES WAR':'DIRECTIONAL LIFE'} LAB</strong>
      <span>TRUE NEXT-GENERATION FORECAST</span>
    </div>
    <p className="module-note">This is an exact local-rule calculation on the real cells in your current universe, not an animation detector. {forecast&&forecast.sampled<forecast.total?
      'For large grids, cells are evenly sampled to keep the phone responsive.':
      'Every cell is checked at this grid size.'}</p>
    <div className="cyclic-dynamics-meters">
      <div><b id="a3-birth-prediction">{forecast?pct(forecast.births):'—'}</b>
        <span>{species?'EMPTY CELLS ABOUT TO BE COLONIZED':'EMPTY CELLS MATCHING BIRTH STENCIL'}</span></div>
      {species?<div><b id="a3-invasion-prediction">{forecast?pct(forecast.captures):'—'}</b>
        <span>OCCUPIED CELLS ABOUT TO CHANGE SPECIES</span></div>:
        <div><b id="a3-survival-prediction">{forecast?pct(forecast.holds):'—'}</b>
          <span>LIVE CELLS EXPECTED TO SURVIVE</span></div>}
      <div><b>{forecast?pct(forecast.deaths):'—'}</b>
        <span>CELLS EXPECTED TO DIE NEXT STEP</span></div>
    </div>
    {forecast&&<p className="neighborhood-note">
      {count(forecast.sampled)} / {count(forecast.total)} cells checked · {species?
        count(forecast.distinctSpecies)+' species present in sample · '+neighborMax+' active neighbor votes':
        '8 directional neighbors · '+(s.orientedMatch==='exact'?'exact':'contains')+' matching'}.
      Numbers forecast the NEXT synchronous generation using the current rule, not a promise of activity after 100 ticks.
    </p>}
    {forecast&&world.generation>0&&edits===0&&
      <p className="cyclic-dynamics-status" id="a3-no-transitions" role="status">
        No births, takeovers or deaths are possible under the current rule in the sampled cells.
        {species?' Try OPEN BORDERS or paint competing species into contact.':
          ' Try CROSSHATCH BLOOM or ONE-EYE PLAGUE. An entirely empty world still needs a new seed or painted cells.'}
        Changing the rule does not secretly reseed the universe.
      </p>}
    <strong className="input-label">REAL RULE PRESETS · APPLY LIVE · NO RESET</strong>
    {species?
      <div className="cyclic-dynamics-presets" role="group" aria-label="Species War live rule regimes">
        {SPECIES_REGIMES.map(p=><button type="button" key={p.id} id={'a3-species-'+p.id}
          title={p.note} onClick={()=>setSettings(old=>({...old,
            speciesBirth:Math.min(neighborMax,p.birth),
            speciesSurvive:Math.min(neighborMax,p.survive),
            speciesAttackBias:Math.min(neighborMax,p.bias)}))}>
          {p.label}</button>)}
      </div>:
      <div className="cyclic-dynamics-presets" role="group" aria-label="Directional Life live rule regimes">
        {DIRECTIONAL_REGIMES.map(p=><button type="button" key={p.id} id={'a3-oriented-'+p.id}
          title={p.note} onClick={()=>setSettings(old=>({...old,
            orientedMask:p.mask,orientedMatch:p.match,orientedSymmetry:p.symmetry,
            orientedSurviveMin:p.lo,orientedSurviveMax:p.hi}))}>
          {p.label}</button>)}
      </div>}
    <p className="neighborhood-note">
      {species?'The invasion, ally-survival and defensive-advantage sliders just above remain the fine-tuning controls. Presets recompute against your current neighbor count, including exotic lattices.':
        'Fine-tune the eight-direction birth stencil, EXACT / CONTAINS match, rotation symmetry and survival limits below in RULES. The presets change all those mathematical conditions together.'}
      {' '}Every preset is a pure, deterministic rule; there is no forced particle injection or cosmetic motion.
      These are exploratory regimes, not certified perpetual animations.
    </p>
    <p className="neighborhood-note">
      If all sites are empty, a non-spontaneous birth rule cannot create life from nothing.
      Initial fill and grid size are in WORLD (restart); rule presets here change running cells on their next step.
    </p>
  </section>;
}
