import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings} from '../engine/types';
import {grainSum} from '../engine/circuits';
interface Props{
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 grains?:Uint32Array;
 inspectedCell:[number,number]|null;
 width:number;
}
export default function CircuitControls({settings:s,setSettings,grains,inspectedCell,width}:Props){
 const change=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
  setSettings(prev=>({...prev,[key]:value}));
 if(s.engine==='wireworld')return <section className="c1-lab" aria-label="Wireworld circuit controls">
  <div className="c1-head"><strong>⚡ C1 · WIREWORLD</strong><span>FOUR-STATE CA</span></div>
  <p className="module-note">A conductor turns into an electron head only if exactly one or two of its eight Moore neighbors are heads. Heads become tails, tails become conductors, and empty cells remain empty.</p>
  <span className="input-label">PAINT ELECTRIC STATE</span>
  <div className="c1-materials" role="group" aria-label="Wireworld paint material">
   {([
    {n:1,label:'CONDUCTOR',symbol:'─'},
    {n:2,label:'ELECTRON HEAD',symbol:'●'},
    {n:3,label:'ELECTRON TAIL',symbol:'◌'}
   ] as const).map(item=><button type="button" key={item.n} id={'wire-brush-'+item.n}
    className={s.wireBrush===item.n?'selected':''} aria-pressed={s.wireBrush===item.n}
    onClick={()=>change('wireBrush',item.n)}>
    <b>{item.symbol}</b>{item.label}</button>)}
  </div>
  <p className="neighborhood-note">Draw conductor paths with your existing Alien Paintbrush. Add a HEAD touching a conductor, optionally a TAIL behind it, then run. Erase mode removes circuit material. This is an eight-neighbor square-grid automaton, independent of the hand-painted B2 neighbor stencil.</p>
 </section>;
 if(s.engine==='sandpile'){
  const total=grains?grainSum(grains):0;
  return <section className="c1-lab" aria-label="Abelian sandpile controls">
   <div className="c1-head"><strong>⚡ C1 · ABELIAN SANDPILE</strong><span>INTEGER GRAIN CA</span></div>
   <p className="module-note">Every pile with at least four grains topples once per parallel round, giving one grain to each N/E/S/W neighbor. With finite edges grains fall off into the sink; with wrapping, total grain mass is conserved unless you feed or paint.</p>
   <div className="c1-grain-count"><b>{total.toLocaleString('en-US')}</b><span>ACTUAL GRAINS (32-BIT)</span></div>
   {inspectedCell&&grains&&<p className="neighborhood-note" aria-label="Selected exact grain height">CELL ({inspectedCell[0]},{inspectedCell[1]}) · <strong>{grains[inspectedCell[1]*width+inspectedCell[0]].toLocaleString('en-US')} GRAINS</strong></p>
   <label className="input-label" htmlFor="sand-feed">Grains added each generation <em>{s.sandFeed}</em></label>
   <input id="sand-feed" type="range" min="0" max="64" step="1" value={s.sandFeed}
    onChange={e=>change('sandFeed',Number(e.target.value))}/>
   <label className="input-label" htmlFor="sand-rounds">Parallel toppling rounds per generation <em>{s.sandRounds}</em></label>
   <input id="sand-rounds" type="range" min="1" max="8" step="1" value={s.sandRounds}
    onChange={e=>change('sandRounds',Number(e.target.value))}/>
   <label className="input-label" htmlFor="sand-source">Grain feeder position</label>
   <select id="sand-source" value={s.sandSource}
    onChange={e=>change('sandSource',e.target.value as SimSettings['sandSource'])}>
    <option value="center">CENTER · PILE UP</option>
    <option value="random">SEEDED RANDOM · RAIN</option>
   </select>
   <label className="input-label" htmlFor="sand-brush">Add grains per painted cell <em>+{s.sandBrush}</em></label>
   <input id="sand-brush" type="range" min="1" max="64" step="1" value={s.sandBrush}
    onChange={e=>change('sandBrush',Number(e.target.value))}/>
   <p className="neighborhood-note">Paint adds exactly that many grains to every affected cell; erase clears the pile. The visible cell color uses logarithmic grain-height mapping; saved JSON preserves full integers. Parallel toppling is not a full-instant stabilization: without continued feeding, finite-boundary grids eventually reach the same stable sandpile as legal sequential toppling.</p>
   {s.wrap&&<p className="neighborhood-note"><strong>PERIODIC BOUNDARIES:</strong> No sink. A grain-rich torus may never settle; that's mathematically expected, not a broken animation.</p>}
  </section>;
 }
 return null;
}
