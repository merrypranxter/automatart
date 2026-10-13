import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings} from '../engine/types';
interface Props{settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>}
export default function ReactionControls({settings:s,setSettings}:Props){
 const change=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
  setSettings(prev=>({...prev,[key]:value}));
 if(s.engine==='hodgepodge')return <section className="c2-lab" aria-label="Hodgepodge reaction wave controls">
  <div className="c2-heading"><strong>🦠 C2 · HODGEPODGE MACHINE</strong><span>REAL REACTION WAVES</span></div>
  <p className="module-note">Gerhardt–Schuster-style synchronous variant. 0 = healthy; 1…N−1 = sick; N = ill. Healthy cells catch illness from sick/ill neighbors. Sick ones advance through a neighborhood-average severity plus growth; terminal illness returns to zero.</p>
  <label className="input-label" htmlFor="hodge-states">Severity states <em>{s.hodgeStates} · restarts universe</em></label>
  <input id="hodge-states" type="range" min="8" max="64" step="1" value={s.hodgeStates}
   onChange={e=>setSettings(v=>({...v,hodgeStates:Number(e.target.value),hodgeBrush:Math.min(v.hodgeBrush,Number(e.target.value))}))}/>
  <label className="input-label" htmlFor="hodge-k1">Ill-neighbor divisor K₁ <em>{s.hodgeK1}</em></label>
  <input id="hodge-k1" type="range" min="1" max="8" value={s.hodgeK1}
   onChange={e=>change('hodgeK1',Number(e.target.value))}/>
  <label className="input-label" htmlFor="hodge-k2">Sick-neighbor divisor K₂ <em>{s.hodgeK2}</em></label>
  <input id="hodge-k2" type="range" min="1" max="8" value={s.hodgeK2}
   onChange={e=>change('hodgeK2',Number(e.target.value))}/>
  <label className="input-label" htmlFor="hodge-growth">Severity progression G <em>+{s.hodgeGrowth}</em></label>
  <input id="hodge-growth" type="range" min="1" max="40" value={s.hodgeGrowth}
   onChange={e=>change('hodgeGrowth',Number(e.target.value))}/>
  <label className="input-label" htmlFor="hodge-brush">Paint infection stage <em>{s.hodgeBrush} / {s.hodgeStates}</em></label>
  <input id="hodge-brush" type="range" min="1" max={s.hodgeStates} value={s.hodgeBrush}
   onChange={e=>change('hodgeBrush',Number(e.target.value))}/>
  <div className="c2-presets" role="group" aria-label="Hodgepodge presets">
   <button type="button" onClick={()=>setSettings(v=>({...v,hodgeK1:2,hodgeK2:3,hodgeGrowth:12}))}>RADIANT PLAGUE</button>
   <button type="button" onClick={()=>setSettings(v=>({...v,hodgeK1:1,hodgeK2:6,hodgeGrowth:6}))}>CORAL FEVER</button>
   <button type="button" onClick={()=>setSettings(v=>({...v,hodgeK1:5,hodgeK2:2,hodgeGrowth:23}))}>FAST ROT</button>
  </div>
  <p className="neighborhood-note">Paint illness onto the existing universe with Alien Paintbrush. Changes to K₁, K₂ or G apply live without erasing the world. This engine always uses 8 actual Moore neighbors, not a B2 custom stencil.</p>
 </section>;
 if(s.engine==='forestfire')return <section className="c2-lab" aria-label="Forest fire controls">
  <div className="c2-heading"><strong>🔥 C2 · FOREST FIRE</strong><span>SEEDED DISCRETE CHAOS</span></div>
  <p className="module-note">0 empty, 1 tree, 2 burning. A fire burns out next generation; trees catch fire from burning N/E/S/W neighbors or seeded lightning; empty cells may grow trees. Both probabilities are per cell, per generation.</p>
  <label className="input-label" htmlFor="forest-growth">Tree growth probability <em>{(s.forestGrowth*100).toFixed(1)}%</em></label>
  <input id="forest-growth" type="range" min="0" max="200" step="1" value={Math.round(s.forestGrowth*1000)}
   onChange={e=>change('forestGrowth',Number(e.target.value)/1000)}/>
  <label className="input-label" htmlFor="forest-lightning">Lightning probability <em>{Math.round(s.forestLightning*10000)} per 10,000</em></label>
  <input id="forest-lightning" type="range" min="0" max="250" step="1" value={Math.round(s.forestLightning*10000)}
   onChange={e=>change('forestLightning',Number(e.target.value)/10000)}/>
  <span className="input-label">Paint material</span>
  <div className="c2-materials" role="group" aria-label="Forest paint state">
   <button type="button" id="forest-brush-1" aria-pressed={s.forestBrush===1}
    className={s.forestBrush===1?'selected':''} onClick={()=>change('forestBrush',1)}>
    <b>✳</b>TREE</button>
   <button type="button" id="forest-brush-2" aria-pressed={s.forestBrush===2}
    className={s.forestBrush===2?'selected':''} onClick={()=>change('forestBrush',2)}>
    <b>🔥</b>FIRE</button>
  </div>
  <div className="c2-presets" role="group" aria-label="Forest climate presets">
   <button type="button" onClick={()=>setSettings(v=>({...v,forestGrowth:.008,forestLightning:.0001}))}>SLOW EMBERS</button>
   <button type="button" onClick={()=>setSettings(v=>({...v,forestGrowth:.035,forestLightning:.004}))}>INFERNO</button>
   <button type="button" onClick={()=>setSettings(v=>({...v,forestGrowth:.12,forestLightning:.0005}))}>JUNGLE REGROWTH</button>
  </div>
  <p className="neighborhood-note">No trees are rendered literally: all skins and psychedelic color maps still work. The weather is deterministic from your universe seed and generation. With wrapping on, flames may jump across world edges. Changing the seed generates a new universe.</p>
 </section>;
 return null;
}
