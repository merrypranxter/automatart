import type {Dispatch,SetStateAction} from 'react';
import type {LatticeId,OrientedMatch,OrientedSymmetry,SimSettings} from '../engine/types';
import {normalizeActiveVotes} from '../engine/neighborhood';
import type {World} from '../engine/types';
import MargolusDynamicsControls from './MargolusDynamicsControls';

type Props={
  settings:SimSettings;
  setSettings:Dispatch<SetStateAction<SimSettings>>;
  onRewind:(count?:number)=>void;
  world?:World;
  direction?:1|-1;
  onPlayDirection?:(direction:1|-1)=>void;
  generation:number;
  /** Which half to render: the lattice picker (WORLD) or engine rules (RULES). */
  part?:'lattice'|'rules'|'all';
};
const DIRS=[
  {bit:0,label:'NW'},{bit:1,label:'N'},{bit:2,label:'NE'},
  {bit:7,label:'W'},{bit:-1,label:'CELL'},{bit:3,label:'E'},
  {bit:6,label:'SW'},{bit:5,label:'S'},{bit:4,label:'SE'}
];
export const SQUARE_ONLY_ENGINES=['wolfram','larger','oriented','margolus','wireworld','sandpile','hodgepodge','forestfire','ising','turmites','hpp'];
export default function StrangeControls({settings:s,setSettings,onRewind,onPlayDirection,world,direction,generation,part='all'}:Props){
  const squareOnly=SQUARE_ONLY_ENGINES.includes(s.engine);
  const set=(key:keyof SimSettings,value:unknown)=>
    setSettings(prev=>({...prev,[key]:value}));
  const showLattice=part!=='rules',showRules=part!=='lattice';
  return <>
    {showLattice&&<div className="lattice-picker">
      <label className="input-label" htmlFor="lattice">Mathematical lattice</label>
      <select id="lattice" value={squareOnly?'square':s.lattice}
        disabled={squareOnly}
        onChange={e=>setSettings(prev=>normalizeActiveVotes({...prev,lattice:e.target.value as LatticeId,
           neighborShape:e.target.value==='square'?prev.neighborShape:'moore'}))}>
        <option value="square">SQUARE · 4 / 8 / 12 / 24 OR DIRECTIONAL</option>
        <option value="hex">HEXAGON · 6 GENUINE NEIGHBORS</option>
        <option value="triangle">TRIANGLE · 3 EDGE NEIGHBORS</option>
        <option value="rhombille">RHOMBILLE · 4 TRUE DIAMOND EDGES (D1A)</option>
        <option value="kagome">KAGOME · 6 HEX / 3 TRIANGLE EDGES (D1B)</option>
      </select>
      <p className="module-note">{squareOnly?
        'This engine requires the square lattice to preserve its specified neighborhood or reversible block partition.':
        s.lattice==='hex'?'Real odd-row-offset hexagonal adjacency; six surrounding neighbors, not hexagon-shaped square rules.':
        s.lattice==='triangle'?'Real triangle edge adjacency: left, right and one vertical neighbor determined by alternating triangle orientation.':
        s.lattice==='rhombille'?'True 60°/120° lozenges partition every honeycomb hexagon in three. Each diamond shares exactly four full edges. Synchronous evolution uses those four actual graph neighbors; no corner contacts or fake square offsets.':
        s.lattice==='kagome'?'True 3.6.3.6 rectified honeycomb. Real hexagon faces have 6 full edge-neighbors; triangle faces have 3. Synchronous rules use this heterogeneous graph, not square pixels.':
        'Square lattice with Moore, Von Neumann, radius-2 square/diamond or directional neighborhoods.'}</p>
    </div>}
    {showRules&&s.engine==='oriented'&&<div className="strange-rule">
      <h3>DIRECTIONAL BIRTH STENCIL</h3>
      <p className="skin-description">PURE CA · 8-neighbor non-totalistic rule. Birth responds to the actual arrangement of occupied neighbors, not merely how many are alive. Click the directions to create a birth template.</p>
      <div className="direction-grid">
        {DIRS.map(v=>v.bit===-1?
          <div key="center" className="direction-center">✳</div>:
          <button type="button" key={v.bit} aria-pressed={!!(s.orientedMask&(1<<v.bit))}
            className={(s.orientedMask&(1<<v.bit))?'selected':''}
            title={'Toggle '+v.label+' occupied in birth template'}
            onClick={()=>setSettings(prev=>{
              const newMask=prev.orientedMask^(1<<v.bit);
              return {...prev,orientedMask:newMask===0?prev.orientedMask:newMask};
            })}>{v.label}</button>)}
      </div>
      <div className="chip-row">
        <button className="chip" onClick={()=>set('orientedMask',34)}>VERTICAL</button>
        <button className="chip" onClick={()=>set('orientedMask',136)}>HORIZONTAL</button>
        <button className="chip" onClick={()=>set('orientedMask',17)}>DIAGONAL</button>
        <button className="chip" onClick={()=>set('orientedMask',170)}>CARDINAL CROSS</button>
      </div>
      <label className="input-label" htmlFor="oriented-match">Birth template matching</label>
      <select id="oriented-match" value={s.orientedMatch} onChange={e=>set('orientedMatch',e.target.value as OrientedMatch)}>
        <option value="exact">EXACT · All unselected directions empty</option>
        <option value="contains">CONTAINS · Selected directions occupied</option>
      </select>
      <label className="input-label" htmlFor="oriented-symmetry">Symmetry equivalence</label>
      <select id="oriented-symmetry" value={s.orientedSymmetry}
        onChange={e=>set('orientedSymmetry',e.target.value as OrientedSymmetry)}>
        <option value="fixed">FIXED ORIENTATION</option>
        <option value="rotations">90° ROTATIONS ALLOWED</option>
        <option value="dihedral">ROTATIONS + REFLECTIONS ALLOWED</option>
      </select>
      <label className="input-label" htmlFor="oriented-survival-min">Survival neighbors — minimum <em>{s.orientedSurviveMin}</em></label>
      <input type="range" id="oriented-survival-min" min="0" max={s.orientedSurviveMax} value={s.orientedSurviveMin}
        onChange={e=>set('orientedSurviveMin',Number(e.target.value))}/>
      <label className="input-label" htmlFor="oriented-survival-max">Survival neighbors — maximum <em>{s.orientedSurviveMax}</em></label>
      <input type="range" id="oriented-survival-max" min={s.orientedSurviveMin} max="8" value={s.orientedSurviveMax}
        onChange={e=>set('orientedSurviveMax',Number(e.target.value))}/>
      <p className="skin-description">Choose exact for delicate geometric structures or contains for aggressive directional infections. Rule changes apply to the running universe.</p>
    </div>}
    {showRules&&s.engine==='margolus'&&
      <MargolusDynamicsControls settings={s} setSettings={setSettings}
        world={world} generation={generation} direction={direction}
        onRewind={onRewind} onPlayDirection={onPlayDirection}/>}
  </>;
}
