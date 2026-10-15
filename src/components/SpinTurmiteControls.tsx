import {useEffect,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {isingEnergy,isingMagnetization,validTurmiteRule,turmiteTurnAt,turmiteWriteAt,
 turmiteAlchemyWriteAt,DEFAULT_TURMITE_WRITE_PROGRAM,DEFAULT_TURMITE_ALCHEMY,DEFAULT_TURMITE_MEMORY}
 from '../engine/spins-turmites';
import type {TurmiteWriteProgram,TurmiteAlchemy,TurmiteMemory} from '../engine/spins-turmites';
export interface TurmitePlacement{agentId:number;heading:0|1|2|3}
interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;resetNumber:number;onReseed:()=>void;placement:TurmitePlacement|null;
 onPlacementChange:Dispatch<SetStateAction<TurmitePlacement|null>>}
const RULES=[
 {rule:'RL',label:"LANGTON'S ANT · 2"},
 {rule:'LLRR',label:'LLRR · 4'},
 {rule:'RLLR',label:'RLLR · 4'},
 {rule:'LRRRRRLLR',label:'9-STATE ANT'},
 {rule:'RSUL',label:'ALL FOUR TURNS'},
 {rule:'RSLUULSR',label:'8-STATE TURN MIX'},
 {rule:'RRSULLSUSLRU',label:'12-STATE CHIMERA'},
 {rule:'RSLURRUSLLSRUULSRRLUSLRU',label:'24-STATE GENOME'}
] as const;
const COMMANDS:Record<string,string>={R:'↻ RIGHT',L:'↺ LEFT',S:'↑ STRAIGHT',U:'↩ REVERSE'};
const mirror=(rule:string)=>[...rule].map(t=>t==='L'?'R':t==='R'?'L':t).join('');
export default function SpinTurmiteControls({settings:s,setSettings,world,resetNumber,
 placement,onPlacementChange,onReseed}:Props){
 const [selectedAgent,setSelectedAgent]=useState(0);
 const [alchemySpecies,setAlchemySpecies]=useState(0);
 const [selectedHeading,setSelectedHeading]=useState<0|1|2|3>(0);
 const writeProgram={mode:s.turmiteWriteMode??'next',stride:s.turmiteWriteStride??1,
  table:s.turmiteWriteTable??DEFAULT_TURMITE_WRITE_PROGRAM.table};
 const alchemy=s.turmiteAlchemy??DEFAULT_TURMITE_ALCHEMY;
 const speciesWrite=alchemy.species[alchemySpecies];
 const memory=s.turmiteMemory??DEFAULT_TURMITE_MEMORY;
 const updateAlchemy=(patch:Partial<TurmiteAlchemy>)=>setSettings(old=>({
  ...old,turmiteAlchemy:{...(old.turmiteAlchemy??DEFAULT_TURMITE_ALCHEMY),...patch}
 }));
 const updateSpecies=(patch:Partial<TurmiteWriteProgram>)=>setSettings(old=>{
  const oldAlchemy=old.turmiteAlchemy??DEFAULT_TURMITE_ALCHEMY;
  return {...old,turmiteAlchemy:{...oldAlchemy,species:oldAlchemy.species.map((v,i)=>
   i===alchemySpecies?{...v,...patch}:v)}};
 });
 const updateMemory=(patch:Partial<TurmiteMemory>)=>setSettings(old=>({
  ...old,turmiteMemory:{...(old.turmiteMemory??DEFAULT_TURMITE_MEMORY),...patch}
 }));
 const [typed,setTyped]=useState(s.turmiteRule);
 // Recipes may replace the committed rule while the editor stays mounted.
 // Don't let a stale draft overwrite the freshly restored world.
 useEffect(()=>setTyped(s.turmiteRule),[s.turmiteRule,s.engine,resetNumber]);
 const change=<K extends keyof SimSettings>(k:K,v:SimSettings[K])=>
   setSettings(old=>({...old,[k]:v}));
 const commitRule=(rule:string)=>{
  if(!validTurmiteRule(rule))return;
  setTyped(rule);
  setSettings(old=>({...old,turmiteRule:rule,
   turmiteBrush:Math.min(old.turmiteBrush,rule.length-1)}));
 };
 if(s.engine==='ising'){
  const spins=world.engine==='ising'?world.cells:null;
  const magnetization=spins?isingMagnetization(spins):0;
  const energy=spins?isingEnergy(spins,world.width,world.height,s.wrap,s.isingCoupling,s.isingField)/spins.length:0;
  return <section className="c3-lab" aria-label="Ising magnetic physics controls">
   <div className="c3-header"><strong>🧲 C3 · ISING SPIN REACTOR</strong><span>CHECKERBOARD METROPOLIS</span></div>
   <p className="module-note">Real two-dimensional nearest-neighbor Ising spins. Every cell is +1 or −1. Temperature controls uphill flip probabilities, coupling favors alignment or alternating antiferromagnetic order, and the field biases spins.</p>
   <div className="c3-readouts">
    <div><b>{magnetization.toFixed(3)}</b><span>MAGNETIZATION −1…+1</span></div>
    <div><b>{energy.toFixed(3)}</b><span>ENERGY PER SITE</span></div>
   </div>
   <label className="input-label" htmlFor="ising-temp">Temperature T <em>{s.isingTemperature.toFixed(2)}</em></label>
   <input id="ising-temp" type="range" min="0" max="500" step="5" value={Math.round(s.isingTemperature*100)}
    onChange={e=>change('isingTemperature',Number(e.target.value)/100)}/>
   <label className="input-label" htmlFor="ising-coupling">Coupling J <em>{s.isingCoupling.toFixed(2)}</em></label>
   <input id="ising-coupling" type="range" min="-200" max="200" step="10" value={Math.round(s.isingCoupling*100)}
    onChange={e=>change('isingCoupling',Number(e.target.value)/100)}/>
   <label className="input-label" htmlFor="ising-field">External magnetic field H <em>{s.isingField.toFixed(2)}</em></label>
   <input id="ising-field" type="range" min="-200" max="200" step="10" value={Math.round(s.isingField*100)}
    onChange={e=>change('isingField',Number(e.target.value)/100)}/>
   <label className="input-label" htmlFor="ising-sweeps">Metropolis sweeps per frame <em>{s.isingSweeps}</em></label>
   <input id="ising-sweeps" type="range" min="1" max="4" step="1" value={s.isingSweeps}
    onChange={e=>change('isingSweeps',Number(e.target.value))}/>
   <div className="c3-presets">
    <button type="button" onClick={()=>setSettings(v=>({...v,isingTemperature:1,isingCoupling:1,isingField:0}))}>FERROMAGNETIC</button>
    <button type="button" onClick={()=>setSettings(v=>({...v,isingTemperature:.7,isingCoupling:-1,isingField:0}))}>ANTIFERRO</button>
    <button type="button" onClick={()=>setSettings(v=>({...v,isingTemperature:4.2,isingCoupling:1,isingField:0}))}>THERMAL MELTDOWN</button>
   </div>
   <div className="c3-brush" role="group" aria-label="Spin paint material">
    <button type="button" id="ising-brush-down" className={s.isingBrush===0?'selected':''}
     aria-pressed={s.isingBrush===0} onClick={()=>change('isingBrush',0)}>↓ DOWN (−1)</button>
    <button type="button" id="ising-brush-up" className={s.isingBrush===1?'selected':''}
     aria-pressed={s.isingBrush===1} onClick={()=>change('isingBrush',1)}>↑ UP (+1)</button>
   </div>
   <p className="neighborhood-note">Both spin orientations are visible across material skins, not just the UP spins. Changing T/J/H is live. Altering the universe seed restarts from a reproducible initial pattern. Wrapped grids are kept even-by-even so checkerboard updates remain mathematically valid.</p>
  </section>;
 }
 if(s.engine==='turmites')return <section className="c3-lab" aria-label="Advanced Turmite rule genome controls">
  <div className="c3-header">
   <strong>🐜 T1/T2 · MUTANT TURMITE FACTORY</strong>
   <span>FOUR TRUE TURNS · MULTI-SPECIES · DIRECTIONAL GENOMES</span>
  </div>
  <p className="module-note">The ants READ their current cell's track state, TURN by the corresponding L/R/S/U command, increment that cell modulo the number of colors, and MOVE to their next cell. Agents act sequentially, so their paths can interact through actual shared pigment. These are genuine automaton instructions, not cosmetic direction arrows.</p>
  <div className="c3-readouts">
   <div><b id="turmite-agent-readout">{world.turmiteAgents?.length??s.turmiteCount}</b><span>LIVE AGENTS</span></div>
   <div><b id="turmite-color-count">{s.turmiteRule.length}</b><span>TRUE TRACK STATES</span></div>
   <div><b id="turmite-visits-per-generation">{s.turmiteCount*(s.turmiteSteps??1)}</b><span>AGENT ACTIONS / GENERATION</span></div>
  </div>
  <label className="input-label" htmlFor="turmite-count">
   Ant population <em>{s.turmiteCount} · changes restart the world</em>
  </label>
  <input id="turmite-count" type="range" min="1" max="12" step="1" value={s.turmiteCount}
   onChange={e=>change('turmiteCount',Number(e.target.value))}/>
  <label className="input-label" htmlFor="turmite-steps">
   True moves and paints per generation <em>{s.turmiteSteps??1} · adjustable LIVE</em>
  </label>
  <input id="turmite-steps" type="range" min="1" max="8" step="1"
   value={s.turmiteSteps??1} onChange={e=>change('turmiteSteps',Number(e.target.value))}/>
  <p className="neighborhood-note">One generation contains {(s.turmiteSteps??1)} complete ordered agent rounds. More steps physically accelerate track construction; it never merely duplicates exported animation frames. Use 1 for the original Langton behavior. Changing the move count preserves your living artwork and ant positions.</p>
  <span className="input-label">True rule genomes · installing a new genome restarts the universe</span>
  <div className="c3-presets">
   {RULES.map(p=><button key={p.rule} type="button"
    className={s.turmiteRule===p.rule?'selected':''} aria-pressed={s.turmiteRule===p.rule}
    onClick={()=>commitRule(p.rule)}>{p.label}</button>)}
  </div>
  <label className="input-label" htmlFor="turmite-rule">
   Editable DNA · 2–24 track states · letters L R S U
  </label>
  <div className="c3-custom">
   <input id="turmite-rule" type="text" autoCapitalize="characters" spellCheck={false}
    value={typed} maxLength={24}
    onChange={e=>setTyped(e.target.value.toUpperCase().replace(/[^LRSU]/g,''))}/>
   <button id="turmite-use-rule" type="button" disabled={!validTurmiteRule(typed)}
    onClick={()=>commitRule(typed)}>USE RULE</button>
  </div>
  <div className="c3-presets" role="group" aria-label="Edit Turmite rule mathematically">
   <button id="turmite-mirror-rule" type="button"
    onClick={()=>commitRule(mirror(s.turmiteRule))}>↔ MIRROR L/R</button>
   <button id="turmite-rotate-rule" type="button"
    onClick={()=>commitRule(s.turmiteRule.slice(1)+s.turmiteRule[0])}>↻ SHIFT COLOR INDEX</button>
   <button id="turmite-reverse-rule" type="button"
    onClick={()=>commitRule([...s.turmiteRule].reverse().join(''))}>⇄ REVERSE DNA</button>
   <button id="turmite-grow-rule" type="button" disabled={s.turmiteRule.length>=24}
    onClick={()=>commitRule(s.turmiteRule+'LRSU'[s.turmiteRule.length%4])}>+ ADD TRACK STATE</button>
   <button id="turmite-trim-rule" type="button" disabled={s.turmiteRule.length<=2}
    onClick={()=>commitRule(s.turmiteRule.slice(0,-1))}>− REMOVE TRACK STATE</button>
  </div>
  <div className="c3-readouts" aria-label="Current Turmite true turn command histogram">
   {(['L','R','S','U'] as const).map(turn=><div key={turn}>
    <b id={'turmite-count-'+turn.toLowerCase()}>{[...s.turmiteRule].filter(v=>v===turn).length}</b>
    <span>{COMMANDS[turn]}</span>
   </div>)}
  </div>
  <p className="neighborhood-note">L = left 90° · R = right 90° · S = straight (no turn) · U = reverse 180°. The grid below is your actual state-to-turn program. Its order matters: track states increment to the next instruction after each visit.</p>
  <div className="turmite-genome-strip" id="turmite-genome-strip"
   aria-label="State-indexed Turmite instructions" style={{display:'flex',gap:4,flexWrap:'wrap'}}>
   {[...s.turmiteRule].map((instruction,index)=><div key={index}
    style={{minWidth:37,textAlign:'center',border:'1px solid currentColor',borderRadius:5,
     padding:'4px 5px',opacity:index===s.turmiteBrush?1:.72}}
    title={'Track color '+index+' · '+COMMANDS[instruction]}>
    <div style={{fontSize:'.65rem'}}>#{index}</div>
    <strong>{instruction}</strong>
   </div>)}
  </div>
  <label className="input-label" htmlFor="turmite-brush">
   Paint true track pigment <em>{s.turmiteBrush} / {s.turmiteRule.length-1}
    {' · '+COMMANDS[s.turmiteRule[s.turmiteBrush]]}</em>
  </label>
  <input id="turmite-brush" type="range" min="0" max={s.turmiteRule.length-1}
   value={s.turmiteBrush} step="1" onChange={e=>change('turmiteBrush',Number(e.target.value))}/>
  <div className="c3-header"><strong>🧬 T2 · SPECIES & HEADING MUTATION</strong>
   <span>REAL TRANSITION RULES, NOT COLOR EFFECTS</span></div>
  <p className="module-note">Each agent has a stable identity number. Species = agent number modulo the selected species count. The command it reads comes from track pigment + (heading × heading shear) + (species × genome offset), modulo genome length. Optionally reverse L/R for odd-numbered species. These operations choose different REAL turns and change the generated trails.</p>
  <label className="input-label" htmlFor="turmite-species-count">
   Distinct ant species <em>{s.turmiteSpeciesCount??1} · live</em>
  </label>
  <input id="turmite-species-count" type="range" min="1" max="4" step="1"
   value={s.turmiteSpeciesCount??1}
   onChange={e=>change('turmiteSpeciesCount',Number(e.target.value))}/>
  <label className="input-label" htmlFor="turmite-species-stride">
   Species genome phase shift <em>{s.turmiteSpeciesStride??0} pigments per species · live</em>
  </label>
  <input id="turmite-species-stride" type="range" min="0" max="5" step="1"
   value={s.turmiteSpeciesStride??0}
   onChange={e=>change('turmiteSpeciesStride',Number(e.target.value))}/>
  <label className="input-label" htmlFor="turmite-heading-shear">
   Heading-sensitive rule shear <em>{s.turmiteHeadingShear??0} pigment slots / quarter turn · live</em>
  </label>
  <input id="turmite-heading-shear" type="range" min="0" max="3" step="1"
   value={s.turmiteHeadingShear??0}
   onChange={e=>change('turmiteHeadingShear',Number(e.target.value))}/>
  <label className="toggle">
   <input id="turmite-species-mirror" type="checkbox" checked={s.turmiteSpeciesMirror??false}
    onChange={e=>change('turmiteSpeciesMirror',e.target.checked)}/>
   <span>MIRROR LEFT/RIGHT FOR ODD SPECIES</span>
  </label>
  <p className="neighborhood-note">Rule sampler below shows exactly what each species would do **on the current brush pigment**, at all four headings. Select a different track pigment to inspect that state's real transition program.</p>
  <div id="turmite-species-matrix" role="region" aria-label="Actual Turmite species and heading rule lookup"
   style={{overflowX:'auto'}}>
   <table style={{width:'100%',fontSize:'.78rem',minWidth:260}}>
    <thead><tr><th>HEADING</th>
     {Array.from({length:s.turmiteSpeciesCount??1},(_,i)=><th key={i}>SPECIES {i+1}</th>)}
    </tr></thead>
    <tbody>{(['N','E','S','W'] as const).map((name,h)=><tr key={name}><th>{name}</th>
     {Array.from({length:s.turmiteSpeciesCount??1},(_,species)=><td key={species}
      data-heading={h} data-species={species}>
      {turmiteTurnAt(s.turmiteRule,s.turmiteBrush,h,species,{
       speciesCount:s.turmiteSpeciesCount??1,
       speciesStride:s.turmiteSpeciesStride??0,
       speciesMirror:s.turmiteSpeciesMirror??false,
       headingShear:s.turmiteHeadingShear??0,
       contact:s.turmiteContact??'shared'
      })}
     </td>)}</tr>)}</tbody>
   </table>
  </div>
  <label className="input-label" htmlFor="turmite-contact">
   Real same-cell encounter rule <em>live</em>
  </label>
  <select id="turmite-contact" value={s.turmiteContact??'shared'}
   onChange={e=>change('turmiteContact',e.target.value as 'shared'|'repel')}>
   <option value="shared">SHARED INK · sequential painting only (classic)</option>
   <option value="repel">REPEL · co-located ants reverse headings BEFORE reading DNA</option>
  </select>
  <label className="input-label" htmlFor="turmite-formation">
   Initial placement formation <em>changes restart world</em>
  </label>
  <select id="turmite-formation" value={s.turmiteFormation??'orbit'}
   onChange={e=>change('turmiteFormation',e.target.value as 'orbit'|'stack'|'cross')}>
   <option value="orbit">ORBIT · T1 seeded spread (classic)</option>
   <option value="stack">PILEUP · all ants on the same center cell</option>
   <option value="cross">CROSS · inward headings, cardinal arms</option>
  </select>
  <p className="neighborhood-note">REPEL is an actual co-location event: all ants sharing one site reverse their headings simultaneously, then read/paint/move in stable identity order. PILEUP starts them together for an immediate collision. CROSS points ants inward for later encounters. Formation changes restart; species, direction, mirror and collision modes are LIVE and preserve the existing track.</p>
  <div className="c3-presets">
   <button id="turmite-t2-classic" type="button" onClick={()=>setSettings(old=>({
    ...old,turmiteSpeciesCount:1,turmiteSpeciesStride:0,turmiteSpeciesMirror:false,
    turmiteHeadingShear:0,turmiteContact:'shared',turmiteFormation:'orbit'
   }))}>↺ CLASSIC GENOME PHYSICS</button>
   <button id="turmite-t2-mutate" type="button" onClick={()=>setSettings(old=>({
    ...old,turmiteSpeciesCount:4,turmiteSpeciesStride:1,turmiteSpeciesMirror:true,
    turmiteHeadingShear:1,turmiteContact:'repel',turmiteFormation:'stack'
   }))}>✹ MUTANT SPECIES PILEUP</button>
  </div>
  <div className="c3-header"><strong>🧬 T3 · INDEPENDENT TRACK-WRITER LAB</strong>
   <span>TURN PROGRAM ≠ WRITE PROGRAM</span></div>
  <p className="module-note">Every ant still READS its actual current pigment and chooses its real turn using T1/T2. But what it WRITES afterward is now independently programmable. Skip color states, erase cells, or make an explicit substitution table. These controls change the true mathematical lattice, not a shader effect.</p>
  <label className="input-label" htmlFor="turmite-write-mode">What should every ant WRITE? <em>changes LIVE</em></label>
  <select id="turmite-write-mode" value={s.turmiteWriteMode??'next'}
   onChange={e=>change('turmiteWriteMode',e.target.value as SimSettings['turmiteWriteMode'])}>
   <option value="next">NEXT PIGMENT · original (c + 1) mod N</option>
   <option value="stride">COLOR JUMP · (c + stride) mod N</option>
   <option value="erase">ERASE · write true state 0</option>
   <option value="table">SUBSTITUTE · use my 24-slot absolute state map</option>
  </select>
  {(s.turmiteWriteMode??'next')==='stride'&&<>
   <label className="input-label" htmlFor="turmite-write-stride">
    Actual color-cycle jump <em>{s.turmiteWriteStride??1} · negative values run backwards</em>
   </label>
   <input id="turmite-write-stride" type="range" min="-12" max="12" step="1"
    value={s.turmiteWriteStride??1} onChange={e=>change('turmiteWriteStride',Number(e.target.value))}/>
  </>}
  {(s.turmiteWriteMode??'next')==='table'&&<>
   <p className="neighborhood-note">A 24-slot write DNA table: each current track pigment gets an explicit absolute replacement pigment. Outputs wrap modulo the current genome length. Unlike the turn genome, editing this table does NOT reset the artwork.</p>
   <div id="turmite-write-table" role="group" aria-label="Independent track-state write substitutions"
    style={{display:'flex',gap:7,flexWrap:'wrap'}}>
    {Array.from({length:s.turmiteRule.length},(_,state)=><label key={state}
     style={{display:'flex',flexDirection:'column',minWidth:60,fontSize:'.78rem'}}>
     <span>#{state} →</span>
     <select data-write-source={state} aria-label={'Write track pigment when reading state '+state}
      value={(writeProgram.table[state]??0)%s.turmiteRule.length}
      onChange={e=>setSettings(old=>({
       ...old,turmiteWriteTable:Array.from({length:24},(_,i)=>
        i===state?Number(e.target.value):(old.turmiteWriteTable?.[i]??(i+1)%24))
      }))}>
      {Array.from({length:s.turmiteRule.length},(_,target)=>
       <option key={target} value={target}>#{target}</option>)}
     </select>
    </label>)}
   </div>
   <button id="turmite-write-reset-table" type="button"
    onClick={()=>change('turmiteWriteTable',Array.from({length:24},(_,i)=>(i+1)%24))}>
    ↺ RESET TABLE TO NEXT PIGMENT
   </button>
  </>}
  <p className="neighborhood-note" id="turmite-write-observation" role="status">
   Selected pigment #{s.turmiteBrush}: the current writing rule produces
   ** #{turmiteWriteAt(s.turmiteBrush,s.turmiteRule.length,writeProgram)}**.
   {alchemy.enabled?' T4 SPECIES CHEMISTRY OVERRIDES this global writer. Disable it to use these T3 settings.':' Every species uses this global write rule until T4 alchemy is enabled.'}
  </p>
  <div className="c3-presets">
   <button id="turmite-write-classic" type="button" onClick={()=>setSettings(old=>({
    ...old,turmiteWriteMode:'next',turmiteWriteStride:1
   }))}>↺ ORIGINAL INCREMENT WRITER</button>
   <button id="turmite-write-chaos" type="button" onClick={()=>setSettings(old=>({
    ...old,turmiteWriteMode:'stride',turmiteWriteStride:5
   }))}>✹ SKIP FIVE TRACK STATES</button>
  </div>
  <div className="c3-header"><strong>⚗ T4 · COLLISION ALCHEMY</strong>
   <span>FOUR WRITERS · ONE SHARED PHYSICAL TRACK</span></div>
  <p className="module-note">Each species can WRITE a different real track pigment when reading the same cell. A collision happens only when two or more actual ant bodies start a movement round on that EXACT cell. You can turn collisions into erasures, pigment inversions or species-dependent modular fusion. The T2 REPEL option still controls TURNING; these reactions independently control PAINTING.</p>
  <label className="toggle"><input id="turmite-alchemy-enabled" type="checkbox"
   checked={alchemy.enabled} onChange={e=>updateAlchemy({enabled:e.target.checked})}/>
   <span>ENABLE INDIVIDUAL SPECIES CHEMISTRY</span>
  </label>
  <p className="neighborhood-note">OFF = exact T3 shared writer. ON = each ant uses its own program, indexed by its existing stable T2 species identity. Editing these knobs is LIVE and doesn't clear the canvas or reset generations.</p>
  <label className="input-label" htmlFor="turmite-alchemy-species">Edit writer for species</label>
  <select id="turmite-alchemy-species" value={alchemySpecies}
   onChange={e=>setAlchemySpecies(Number(e.target.value))}>
   {Array.from({length:4},(_,i)=><option key={i} value={i}>SPECIES {i+1}{i>=(s.turmiteSpeciesCount??1)?' · inactive at current species count':''}</option>)}
  </select>
  <label className="input-label" htmlFor="turmite-alchemy-mode">Species {alchemySpecies+1}: real pigment-writing rule</label>
  <select id="turmite-alchemy-mode" value={speciesWrite.mode}
   onChange={e=>updateSpecies({mode:e.target.value as TurmiteWriteProgram['mode']})}>
   <option value="next">NEXT COLOR · original +1</option>
   <option value="stride">STRIDE · modular jump / freeze</option>
   <option value="erase">ERASE · physically write state zero</option>
   <option value="table">DNA TABLE · each input pigment has a replacement</option>
  </select>
  {speciesWrite.mode==='stride'&&<>
   <label className="input-label" htmlFor="turmite-alchemy-stride">
    Species pigment jump <em>{speciesWrite.stride>0?'+':''}{speciesWrite.stride} / ±12</em>
   </label>
   <input id="turmite-alchemy-stride" type="range" min="-12" max="12" step="1"
    value={speciesWrite.stride} onChange={e=>updateSpecies({stride:Number(e.target.value)})}/>
  </>}
  {speciesWrite.mode==='table'&&<div id="turmite-alchemy-table" role="group"
   aria-label="Genuine per-species 24-slot track substitution table"
   style={{display:'flex',flexWrap:'wrap',gap:7}}>
   {Array.from({length:s.turmiteRule.length},(_,state)=><label key={state}
    style={{display:'flex',flexDirection:'column',minWidth:60,fontSize:'.78rem'}}>
    <span>#{state} →</span>
    <select data-alchemy-source={state} aria-label={'Species '+(alchemySpecies+1)+' replacement of track pigment '+state}
     value={speciesWrite.table[state]%s.turmiteRule.length}
     onChange={e=>updateSpecies({table:Array.from({length:24},(_,i)=>
      i===state?Number(e.target.value):speciesWrite.table[i])})}>
     {Array.from({length:s.turmiteRule.length},(_,target)=><option key={target} value={target}>#{target}</option>)}
    </select>
   </label>)}
  </div>}
  <label className="input-label" htmlFor="turmite-alchemy-collision">
   Same-site chemical reaction <em>requires ≥2 real co-located ants</em>
  </label>
  <select id="turmite-alchemy-collision" value={alchemy.collision}
   onChange={e=>updateAlchemy({collision:e.target.value as TurmiteAlchemy['collision']})}>
   <option value="none">NO REACTION · use species's normal output</option>
   <option value="erase">DISSOLVE · write true state zero</option>
   <option value="invert">INVERT · (N - 1) - produced pigment</option>
   <option value="fuse">FUSE · (produced + occupants + species + 1) mod N</option>
  </select>
  <div className="neighborhood-note" id="turmite-alchemy-output" role="status">
   {alchemy.enabled?'ACTIVE MULTI-SPECIES WRITERS':'BYPASSED · ORIGINAL GLOBAL WRITER'} ·
   Sample: reading track pigment #{s.turmiteBrush}.
   <div id="turmite-alchemy-matrix" style={{overflowX:'auto'}}>
    <table style={{width:'100%',fontSize:'.79rem',minWidth:260}}
     aria-label="Measured mathematical pigment products by species and actual occupancy">
     <thead><tr><th>REAL SPECIES</th><th>ALONE</th><th>AT 2-BODY COLLISION</th></tr></thead>
     <tbody>{Array.from({length:s.turmiteSpeciesCount??1},(_,i)=><tr key={i}>
      <th>SPECIES {i+1}</th>
      <td data-alchemy-species={i} data-alchemy-occupancy="1">
       #{turmiteAlchemyWriteAt(s.turmiteBrush,s.turmiteRule.length,i,1,writeProgram,alchemy)}
      </td>
      <td data-alchemy-species={i} data-alchemy-occupancy="2">
       #{turmiteAlchemyWriteAt(s.turmiteBrush,s.turmiteRule.length,i,2,writeProgram,alchemy)}
      </td>
     </tr>)}</tbody>
    </table>
   </div>
   Actual two-body output changes only when the agents truly overlap. The table shows exact transition results, not simulations painted onto the preview.
  </div>
  <div className="c3-presets">
   <button id="turmite-alchemy-reset" type="button" onClick={()=>updateAlchemy({enabled:false,collision:'none'})}>
    ↺ RESTORE T3 CLASSIC WRITERS
   </button>
   <button id="turmite-alchemy-preset" type="button" onClick={()=>{
    setSettings(old=>({
     ...old,turmiteCount:Math.max(old.turmiteCount,4),turmiteSpeciesCount:4,
     turmiteFormation:'stack',turmiteSteps:Math.max(2,old.turmiteSteps),
     turmiteAlchemy:{...structuredClone(DEFAULT_TURMITE_ALCHEMY),enabled:true,collision:'fuse'}
    }));
    // T4 means a FRESH collision experiment on EVERY press, even when the
    // old formation/count were already "stack" and 4. Never silently
    // leave ants scattered across the current artwork.
    onReseed();
   }}>⚗ FOUR-SPECIES FUSION PILEUP</button>
  </div>
  <p className="neighborhood-note">Four-species fusion starts a pileup so you can see actual chemistry right away. Changing the physical starting formation or number of ants intentionally restarts the world. Switching writers and collision reactions during play does NOT restart it. Original recipes still work with alchemy disabled.</p>
  <div className="c3-header"><strong>🧠 T5 · MEMORY ANTS</strong>
   <span>AN INTERNAL FINITE-STATE REGISTER FOR EVERY ANT</span></div>
  <p className="module-note">These ants remember. Every agent carries its own mathematical phase, which changes the ACTUAL turning-rule index and/or outgoing track pigment. The register updates after each genuine physical move according to the cell it read, the pigment it wrote, the passage of time, or a real same-cell collision. This is history-dependent ant behavior, not a color overlay.</p>
  <label className="toggle"><input id="turmite-memory-enabled" type="checkbox"
   checked={memory.enabled} onChange={e=>updateMemory({enabled:e.target.checked})}/>
   <span>ENABLE PER-ANT MEMORY FEEDBACK</span></label>
  <label className="input-label" htmlFor="turmite-memory-mode">How does each ant update its memory?</label>
  <select id="turmite-memory-mode" value={memory.mode}
   onChange={e=>updateMemory({mode:e.target.value as TurmiteMemory['mode']})}>
   <option value="tick">CLOCK · +1 every move</option>
   <option value="read">PIGMENT ECHO · +(track color read + 1)</option>
   <option value="write">INK ECHO · +(actual pigment written + 1)</option>
   <option value="collision">CONTACT SCARS · +occupants only at same-cell meetings</option>
  </select>
  <label className="input-label" htmlFor="turmite-memory-states">Internal memory cycle <em>{memory.states} genuine register states</em></label>
  <input id="turmite-memory-states" type="range" min="2" max="24" step="1"
   value={memory.states} onChange={e=>updateMemory({states:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-memory-turn-bias">
   History changes real turn-rule lookup <em>+{memory.turnBias} × memory phase</em></label>
  <input id="turmite-memory-turn-bias" type="range" min="0" max="3" step="1"
   value={memory.turnBias} onChange={e=>updateMemory({turnBias:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-memory-write-bias">
   History changes actual pigment write <em>{memory.writeBias>0?'+':''}{memory.writeBias} × memory phase (modulo track colors)</em></label>
  <input id="turmite-memory-write-bias" type="range" min="-3" max="3" step="1"
   value={memory.writeBias} onChange={e=>updateMemory({writeBias:Number(e.target.value)})}/>
  <div className="c3-presets">
   <button id="turmite-memory-echo" type="button" onClick={()=>updateMemory({
    enabled:true,states:8,mode:'read',turnBias:1,writeBias:1
   })}>🧠 PIGMENT ECHO</button>
   <button id="turmite-memory-clock" type="button" onClick={()=>updateMemory({
    enabled:true,states:12,mode:'tick',turnBias:1,writeBias:-1
   })}>⌛ CLOCKWORK ANT</button>
   <button id="turmite-memory-scar" type="button" onClick={()=>updateMemory({
    enabled:true,states:7,mode:'collision',turnBias:2,writeBias:1
   })}>⚡ COLLISION SCARS</button>
   <button id="turmite-memory-off" type="button" onClick={()=>updateMemory({enabled:false})}>
    ↺ BYPASS MEMORY · ORIGINAL T4 MATH</button>
  </div>
  <div id="turmite-memory-readout" className="neighborhood-note" role="status">
   {memory.enabled?'REAL FEEDBACK ACTIVE':'MEMORY BYPASSED · T4 TRAJECTORIES EXACTLY PRESERVED'} ·
   These registers are independent for each ant, not for each species.
   <div style={{overflowX:'auto'}}>
    <table id="turmite-memory-matrix" style={{width:'100%',minWidth:270,fontSize:'.78rem'}}>
     <thead><tr><th>ANT</th><th>SPECIES</th><th>SAVED MEMORY</th><th>TRACK NOW</th><th>NEXT TURN INDEX*</th></tr></thead>
     <tbody>{(world.turmiteAgents??[]).map((ant,id)=>{
      const state=world.cells[ant.y*world.width+ant.x]??0;
      const phase=(ant.memory??0)%memory.states;
      const species=id%(s.turmiteSpeciesCount??1);
      const index=memory.enabled?(state+phase*memory.turnBias)%s.turmiteRule.length:state;
      return <tr key={id}>
       <th>#{id+1}</th><td>{species+1}</td><td data-memory-agent={id}>{phase}</td>
       <td>#{state}</td><td data-memory-lookup={id}>#{index}</td>
      </tr>;
     })}</tbody>
    </table>
   </div>
   *Memory-adjusted pigment index before existing T2 heading/species offsets and any REPEL turn.
  </div>
  <p className="neighborhood-note">LIVE editing never clears artwork, moves ants, or resets time. Turning memory OFF bypasses the feedback without forgetting saved registers; turning it ON resumes those registers. Changing the number of register states maps each stored phase modulo the selected cycle. Restarting the universe starts fresh, and recipes/recordings retain the actual registers.</p>
  <div className="c3-header"><strong>⌖ T3 · PUT AN ANT WHERE YOU WANT IT</strong>
   <span>ONE TAP · NO BRUSH MARKS · NO RESET</span></div>
  <p className="module-note">Choose a real existing ant identity and its new heading. Arm one placement, tap the stage once, and that ant moves onto the selected grid cell without erasing the path or changing the generation. Other ants stay where they are. Cancel to return to painting.</p>
  <label className="input-label" htmlFor="turmite-place-agent">Which real ant do we relocate?</label>
  <select id="turmite-place-agent" value={Math.min(selectedAgent,(world.turmiteAgents?.length??s.turmiteCount)-1)}
   onChange={e=>setSelectedAgent(Number(e.target.value))}>
   {Array.from({length:world.turmiteAgents?.length??s.turmiteCount},(_,id)=>{
    const ant=world.turmiteAgents?.[id];
    return <option value={id} key={id}>ANT #{id+1} · species #{id%(s.turmiteSpeciesCount??1)+1}
     {ant?' · ('+ant.x+','+ant.y+')':''}</option>;
   })}
  </select>
  <label className="input-label" htmlFor="turmite-place-heading">Actual heading of relocated ant</label>
  <select id="turmite-place-heading" value={selectedHeading}
   onChange={e=>setSelectedHeading(Number(e.target.value) as 0|1|2|3)}>
   <option value={0}>↑ NORTH</option><option value={1}>→ EAST</option>
   <option value={2}>↓ SOUTH</option><option value={3}>← WEST</option>
  </select>
  <div className="c3-presets">
   <button id="turmite-place-arm" type="button" aria-pressed={!!placement}
    onClick={()=>onPlacementChange(placement?null:{agentId:Math.min(selectedAgent,(world.turmiteAgents?.length??s.turmiteCount)-1),heading:selectedHeading})}>
    {placement?'✕ CANCEL ANT PLACEMENT':'⌖ ARM ONE-TAP ANT PLACEMENT'}
   </button>
  </div>
  {placement&&<p id="turmite-place-status" className="neighborhood-note" role="status">
   ⌖ READY · tap the canvas to reposition ant #{placement.agentId+1}. The next tap does NOT paint.
  </p>}
  <p className="neighborhood-note">Species identity comes from each saved agent's stable list position, so old recipe positions and headings remain valid without a new hidden agent schema. Same-cell pigment writing still occurs sequentially; only the explicit REPEL setting changes initial headings during a real contact.</p>
  <p className="neighborhood-note">The selected brush paints actual indexed track data, not a decorative layer. Agents and track states are preserved by recipe JSON, GIF/video capture and deterministic replay. Old L/R rules and old saves remain fully supported. Finite edges reflect ants inward; wrapped edges connect.</p>
 </section>;
 return null;
}
