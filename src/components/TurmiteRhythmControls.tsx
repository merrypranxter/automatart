import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DEFAULT_TURMITE_RHYTHM,phaseOf,rhythmIndex,rhythmOrderParameter} from '../engine/turmite-rhythm';
import type {TurmiteRhythm} from '../engine/turmite-rhythm';

interface Props{settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World;selectedAgent:number}
export default function TurmiteRhythmControls({settings:s,setSettings,world,selectedAgent}:Props){
 const r=s.turmiteRhythm??DEFAULT_TURMITE_RHYTHM;
 const ants=world.turmiteAgents??[];
 const coherence=rhythmOrderParameter(ants);
 const set=(patch:Partial<TurmiteRhythm>)=>setSettings(old=>({
  ...old,turmiteRhythm:{...(old.turmiteRhythm??DEFAULT_TURMITE_RHYTHM),...patch}
 }));
 return <div aria-label="T8 living Kuramite oscillator laboratory">
  <div className="c3-header"><strong>🎛 T8 · KURAMITES</strong>
   <span>REAL COUPLED PHASE OSCILLATORS · LIVING RHYTHM</span></div>
  <p className="module-note">Every ant has its own genuine 256-step circular oscillator, independent of memory and chemical trails. Its intrinsic frequency, local neighbor coupling and actual A−B chemical potential change the next phase. That phase alters the real turn-rule lookup and actual pigment. Positive coupling draws nearby ant rhythms together; negative coupling pushes their phases apart. NO color cycling or fake animation.</p>
  <label className="toggle"><input id="turmite-rhythm-enabled" type="checkbox"
    checked={r.enabled} onChange={e=>set({enabled:e.target.checked})}/>
   <span>ENABLE LIVE COUPLED ANT RHYTHMS</span></label>
  <label className="input-label" htmlFor="turmite-rhythm-mode">Oscillator feedback mode</label>
  <select id="turmite-rhythm-mode" value={r.mode}
   onChange={e=>set({mode:e.target.value as TurmiteRhythm['mode']})}>
   <option value="phase">EIGHT PHASES · continuously mutate real rule indices</option>
   <option value="pulse">CREST GATE · modify only on one narrow pulse</option>
   <option value="inverse">REVERSE PHASE · reverse oscillator rule indexing</option>
  </select>
  <label className="input-label" htmlFor="turmite-rhythm-frequency">Free-running oscillator speed <em>+{r.frequency} phase units per step</em></label>
  <input id="turmite-rhythm-frequency" type="range" min="0" max="32" step="1"
    value={r.frequency} onChange={e=>set({frequency:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-rhythm-detune">Species frequency detuning <em>+{r.detune} per species index</em></label>
  <input id="turmite-rhythm-detune" type="range" min="0" max="16" step="1"
    value={r.detune} onChange={e=>set({detune:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-rhythm-coupling">Sinusoidal synchronization force <em>{r.coupling>0?'+':''}{r.coupling} · {r.coupling>0?'attraction':r.coupling<0?'phase repulsion':'independent clocks'}</em></label>
  <input id="turmite-rhythm-coupling" type="range" min="-32" max="32" step="1"
    value={r.coupling} onChange={e=>set({coupling:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-rhythm-radius">Real spatial listening radius <em>{r.radius} cells</em></label>
  <input id="turmite-rhythm-radius" type="range" min="1" max="32" step="1"
    value={r.radius} onChange={e=>set({radius:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-rhythm-chemistry">Real A−B chemical field controls clock <em>{r.chemistry>0?'+':''}{r.chemistry} / 255</em></label>
  <input id="turmite-rhythm-chemistry" type="range" min="-16" max="16" step="1"
    value={r.chemistry} onChange={e=>set({chemistry:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-rhythm-turn-bias">Oscillator changes REAL turn-rule index <em>{r.turnBias} × phase sector</em></label>
  <input id="turmite-rhythm-turn-bias" type="range" min="0" max="3" step="1"
    value={r.turnBias} onChange={e=>set({turnBias:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-rhythm-write-bias">Oscillator changes REAL pigment written <em>{r.writeBias>0?'+':''}{r.writeBias} × phase sector</em></label>
  <input id="turmite-rhythm-write-bias" type="range" min="-3" max="3" step="1"
    value={r.writeBias} onChange={e=>set({writeBias:Number(e.target.value)})}/>
  <div className="c3-presets">
   <button id="turmite-rhythm-choir" type="button" onClick={()=>set({
    enabled:true,frequency:9,detune:0,coupling:28,radius:26,chemistry:0,
    mode:'phase',turnBias:2,writeBias:1
   })}>🎶 PHASE CHOIR</button>
   <button id="turmite-rhythm-riot" type="button" onClick={()=>set({
    enabled:true,frequency:14,detune:6,coupling:-30,radius:30,chemistry:0,
    mode:'inverse',turnBias:3,writeBias:-2
   })}>⚡ RHYTHM RIOT</button>
   <button id="turmite-rhythm-pulse" type="button" onClick={()=>set({
    enabled:true,frequency:5,detune:2,coupling:12,radius:12,chemistry:0,
    mode:'pulse',turnBias:3,writeBias:3
   })}>💥 QUANTIZED PULSES</button>
   <button id="turmite-rhythm-chemical" type="button" onClick={()=>set({
    enabled:true,frequency:12,detune:4,coupling:18,radius:16,chemistry:16,
    mode:'phase',turnBias:1,writeBias:-2
   })}>🧪 CHEMICAL METRONOME</button>
   <button id="turmite-rhythm-off" type="button" onClick={()=>set({enabled:false})}>
    ↺ BYPASS T8 · KEEP OSCILLATOR HISTORY</button>
  </div>
  <div className="c3-readouts" id="turmite-rhythm-stats">
   <div><b id="turmite-rhythm-on">{r.enabled?'ON':'OFF'}</b><span>PHASE FEEDBACK</span></div>
   <div><b id="turmite-rhythm-order">{coherence.toFixed(3)}</b><span>LOCAL/GLOBAL ORDER</span></div>
   <div><b id="turmite-rhythm-population">{ants.length}</b><span>REAL CLOCKS</span></div>
  </div>
  <p className="neighborhood-note">
   Kuramoto order R=0 indicates phases distributed around the circle; R=1 indicates perfect synchronization. With only one ant R=1 trivially; two or more ants are needed for true coupling. All clocks evolve on every real Turmite microstep, not on visual frames.
  </p>
  <div style={{overflowX:'auto'}}>
   <table id="turmite-rhythm-matrix" style={{width:'100%',fontSize:'.78rem'}}>
    <thead><tr><th>ANT</th><th>SPECIES</th><th>REAL PHASE</th><th>SECTOR</th><th>PULSE</th></tr></thead>
    <tbody>{ants.map((ant,i)=>{
     const ph=phaseOf(ant,i),sector=rhythmIndex(ph,r.mode);
     return <tr key={i} data-rhythm-agent={i} aria-selected={selectedAgent===i}>
      <th>#{i+1}</th><td>{i%(s.turmiteSpeciesCount||1)+1}</td>
      <td data-rhythm-phase={i}>{ph}/255</td>
      <td data-rhythm-sector={i}>{sector}</td>
      <td>{ph<32?'● CREST':'○'}</td>
     </tr>;
    })}</tbody>
   </table>
  </div>
  <p className="neighborhood-note">The phase table shows actual saved oscillator registers (0–255). Feedback happens after the old T5 memory offset and before T2 heading/species turn selection. T8 OFF preserves original T1–T7 behavior, freezes oscillator registers, and does not reset artwork. Recipe snapshots and video/GIF captures retain exactly these same evolving phases.</p>
 </div>;
}
