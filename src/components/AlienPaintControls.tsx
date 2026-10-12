import type {AlienBrush,BrushSymmetry,StampId,StampMode} from '../engine/alien-paint';
import {STAMPS,isGliderCompatible} from '../engine/alien-paint';
import type {SimSettings} from '../engine/types';
interface Props {
  brush:AlienBrush;
  onChange:(next:AlienBrush)=>void;
  settings:SimSettings;
  randomize:()=>void;
  randomSymmetry:()=>void;
}
export default function AlienPaintControls({brush,onChange,settings,randomize,randomSymmetry}:Props){
  const change=<K extends keyof AlienBrush>(key:K,value:AlienBrush[K])=>onChange({...brush,[key]:value});
  const compat=isGliderCompatible(settings);
  return <section className="alien-paint-lab" aria-label="F3 Alien paintbrush controls">
    <div className="alien-paint-header"><strong>F3 · ALIEN PAINTBRUSH</strong><span>REAL CELL SEEDS</span></div>
    <p className="skin-description">Tap or drag directly on the live universe to plant actual cells. The automaton decides what they grow into. Symmetry applies to all painted cells—even asymmetric stamps.</p>
    <label className="input-label" htmlFor="alien-symmetry">Paint symmetry</label>
    <select id="alien-symmetry" value={brush.symmetry} onChange={e=>change('symmetry',e.target.value as BrushSymmetry)}>
      <option value="single">SINGLE · FREE</option>
      <option value="mirror">MIRROR · LEFT/RIGHT</option>
      <option value="quad">QUAD · BOTH MIRRORS</option>
      <option value="radial8">EIGHTFOLD · 45° ORBITS</option>
    </select>
    <button type="button" className="alien-surprise" onClick={randomSymmetry}>✳ RANDOM SYMMETRY</button>
    <label className="input-label" htmlFor="alien-stamp">Seed stamp</label>
    <select id="alien-stamp" value={brush.stamp} onChange={e=>change('stamp',e.target.value as StampId)}>
      {(Object.entries(STAMPS) as [StampId,string][]).map(([id,label])=><option key={id} value={id}
        disabled={id==='glider'&&!compat}>{label}{id==='glider'?' · CONWAY ONLY':''}</option>)}
    </select>
    {!compat&&<p className="skin-description">The standard Conway glider requires square-grid Conway Life with Moore neighbors; all other stamps work on every engine.</p>}
    <div className="alien-button-row">
      <button type="button" onClick={randomize}>🎲 RANDOM STAMP</button>
      <button type="button" onClick={()=>change('rotation',(brush.rotation+45)%360)}>↻ ROTATE 45°</button>
    </div>
    <label className="input-label" htmlFor="alien-size">Stamp radius <em>{brush.size} cells</em></label>
    <input id="alien-size" type="range" min="0" max="18" value={brush.size} onChange={e=>change('size',Number(e.target.value))}/>
    <label className="input-label" htmlFor="alien-rotation">Stamp angle <em>{brush.rotation}°</em></label>
    <input id="alien-rotation" type="range" min="0" max="315" step="45" value={brush.rotation} onChange={e=>change('rotation',Number(e.target.value))}/>
    <label className="input-label" htmlFor="alien-density">Stamp density <em>{Math.round(brush.density*100)}%</em></label>
    <input id="alien-density" type="range" min="10" max="100" step="5" value={Math.round(brush.density*100)}
      onChange={e=>change('density',Number(e.target.value)/100)}/>
    <label className="input-label" htmlFor="alien-scatter">Scatter families <em>{brush.scatter}</em></label>
    <input id="alien-scatter" type="range" min="1" max="8" value={brush.scatter}
      onChange={e=>change('scatter',Number(e.target.value))}/>
    <span className="input-label">Planting mode</span>
    <div className="alien-button-row" role="group" aria-label="Stamp mode">
      {(['paint','erase','invert'] as StampMode[]).map(mode=><button type="button" key={mode}
        className={brush.mode===mode?'selected':''} aria-pressed={brush.mode===mode}
        onClick={()=>change('mode',mode)}>{mode==='paint'?'✎ PAINT':mode==='erase'?'⌫ ERASE':'◉ INVERT'}</button>)}
    </div>
    <p className="skin-description">Seed randomness is recorded in each stroke, so a saved specimen can be recreated. Inverse toggles existing cells; erasing or painting applies the same symmetrical footprint. On hex/triangle grids, symmetry is visual-artwork symmetry, not a claim of a lattice automorphism.</p>
  </section>;
}
