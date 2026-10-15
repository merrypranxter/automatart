import {useEffect,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {isingEnergy,isingMagnetization,validTurmiteRule} from '../engine/spins-turmites';
interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World;resetNumber:number}
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
export default function SpinTurmiteControls({settings:s,setSettings,world,resetNumber}:Props){
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
   <strong>🐜 T1 · TURMITE GENOME LAB</strong>
   <span>FOUR TRUE TURNS · REAL MULTI-STEP AGENTS</span>
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
  <p className="neighborhood-note">The selected brush paints actual indexed track data, not a decorative layer. Agents and track states are preserved by recipe JSON, GIF/video capture and deterministic replay. Old L/R rules and old saves remain fully supported. Finite edges reflect ants inward; wrapped edges connect.</p>
 </section>;
 return null;
}
