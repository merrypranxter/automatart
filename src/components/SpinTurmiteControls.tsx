import {useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {isingEnergy,isingMagnetization,validTurmiteRule} from '../engine/spins-turmites';
interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World}
const RULES=[
 {rule:'RL',label:"LANGTON'S ANT"},
 {rule:'LLRR',label:'SYMMETRIC CHAOS'},
 {rule:'RLLR',label:'MAZE WALKER'},
 {rule:'LRRRRRLLR',label:'MULTICOLOR HIGHWAY'}
] as const;
export default function SpinTurmiteControls({settings:s,setSettings,world}:Props){
 const [typed,setTyped]=useState(s.turmiteRule);
 const change=<K extends keyof SimSettings>(k:K,v:SimSettings[K])=>
   setSettings(old=>({...old,[k]:v}));
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
   <p className="neighborhood-note">Both spin orientations are rendered, not just the UP spins. Changing T/J/H is live. Altering the universe seed restarts from a reproducible initial pattern. Wrapped grids are kept even-by-even so checkerboard updates remain mathematically valid.</p>
  </section>;
 }
 if(s.engine==='turmites')return <section className="c3-lab" aria-label="Langton ant and Turmite controls">
  <div className="c3-header"><strong>🐜 C3 · TURMITE FACTORY</strong><span>MOBILE CELL-WRITING AGENTS</span></div>
  <p className="module-note">Actual Langton-style ants: read cell color, turn left or right according to your rule string, advance that cell's color, then walk one step. Different ants share the same track in deterministic agent order.</p>
  <div className="c3-readouts">
   <div><b>{world.turmiteAgents?.length??s.turmiteCount}</b><span>ACTIVE ANTS</span></div>
   <div><b>{s.turmiteRule.length}</b><span>TRACK COLORS</span></div>
  </div>
  <label className="input-label" htmlFor="turmite-count">Agent population <em>{s.turmiteCount} · restarts</em></label>
  <input id="turmite-count" type="range" min="1" max="12" step="1" value={s.turmiteCount}
   onChange={e=>change('turmiteCount',Number(e.target.value))}/>
  <span className="input-label">Turning rule presets · change resets world</span>
  <div className="c3-presets">
   {RULES.map(p=><button key={p.rule} type="button" onClick={()=>{
     setTyped(p.rule);
     setSettings(old=>({...old,turmiteRule:p.rule,turmiteBrush:Math.min(old.turmiteBrush,p.rule.length-1)}));
    }}>{p.label}</button>)}
  </div>
  <label className="input-label" htmlFor="turmite-rule">Custom turn sequence · L and R, 2–12 letters</label>
  <div className="c3-custom">
   <input id="turmite-rule" type="text" autoCapitalize="characters" value={typed}
    maxLength={12} onChange={e=>setTyped(e.target.value.toUpperCase().replace(/[^LR]/g,''))}/>
   <button type="button" disabled={!validTurmiteRule(typed)} onClick={()=>
      setSettings(old=>({...old,turmiteRule:typed,turmiteBrush:Math.min(old.turmiteBrush,typed.length-1)}))}>
     USE RULE
   </button>
  </div>
  <label className="input-label" htmlFor="turmite-brush">Paint track color <em>{s.turmiteBrush} / {s.turmiteRule.length-1}</em></label>
  <input id="turmite-brush" type="range" min="0" max={s.turmiteRule.length-1}
   value={s.turmiteBrush} step="1" onChange={e=>change('turmiteBrush',Number(e.target.value))}/>
  <p className="neighborhood-note">Ants are marked in bright yellow with their headings, above the psychedelic skin. Brush paints the underlying track, not a decorative overlay. Every ant's position/direction is saved into recipe JSON and restored for GIF/video. Finite edges reflect ants inward; wrapped edges connect.</p>
 </section>;
 return null;
}
