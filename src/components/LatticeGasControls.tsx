import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {hppCount,hppParticleCount,hppMomentum} from '../engine/lattice-gas';
interface Props{settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World}
const masks=[
 {mask:1,label:'↑ NORTH'}, {mask:2,label:'→ EAST'},
 {mask:4,label:'↓ SOUTH'}, {mask:8,label:'← WEST'},
 {mask:5,label:'↕ N + S'}, {mask:10,label:'↔ E + W'},
 {mask:15,label:'✳ ALL FOUR'}
];
export default function LatticeGasControls({settings:s,setSettings,world}:Props){
 const set=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
  setSettings(old=>({...old,[key]:value}));
 const physical=world.engine==='hpp'&&world.hppWalls;
 const particles=physical?hppParticleCount(world.cells):0;
 const walls=physical?world.hppWalls!.reduce((sum,v)=>sum+v,0):0;
 const [px,py]=physical?hppMomentum(world.cells):[0,0];
 const x=Math.abs(px)<100000?px.toLocaleString('en-US'):String(px);
 const y=Math.abs(py)<100000?py.toLocaleString('en-US'):String(py);
 const average=physical?(particles/world.cells.length).toFixed(3):'0';
 return <section className="c4-lab" aria-label="HPP lattice gas controls">
  <div className="c4-heading"><strong>💨 C4 · HPP LATTICE GAS</strong><span>ACTUAL CONSERVATION LAW</span></div>
  <p className="module-note">Four velocity bits per cell: N/E/S/W. Exactly opposite head-on pairs collide and turn 90°. Every resulting particle streams one cell. Solid barriers and finite edges reflect them. A pure simulation step never creates or destroys a particle.</p>
  <div className="c4-readouts">
   <div><b>{particles.toLocaleString('en-US')}</b><span>PARTICLES</span></div>
   <div><b>{walls.toLocaleString('en-US')}</b><span>SOLID WALL CELLS</span></div>
   <div><b>{average}</b><span>PARTICLES / CELL</span></div>
   <div><b>{x}, {y}</b><span>MOMENTUM X, Y</span></div>
  </div>
  <div className="c4-modes" role="group" aria-label="Lattice gas paint material">
   <button type="button" id="hpp-tool-particles" aria-pressed={s.hppTool==='particles'}
    className={s.hppTool==='particles'?'selected':''} onClick={()=>set('hppTool','particles')}>➠ PARTICLES</button>
   <button type="button" id="hpp-tool-walls" aria-pressed={s.hppTool==='walls'}
    className={s.hppTool==='walls'?'selected':''} onClick={()=>set('hppTool','walls')}>▩ SOLID WALLS</button>
  </div>
  {s.hppTool==='particles'?<>
   <span className="input-label">Paint velocity channels <em>{hppCount(s.hppBrush)} / 4</em></span>
   <div className="c4-masks" role="group" aria-label="Particle velocity mask">
    {masks.map(m=><button type="button" key={m.mask} id={'hpp-mask-'+m.mask}
     className={s.hppBrush===m.mask?'selected':''} aria-pressed={s.hppBrush===m.mask}
     onClick={()=>set('hppBrush',m.mask)}>{m.label}</button>)}
   </div>
   <p className="neighborhood-note">Paint adds those velocity channels, erase removes the selected channels, invert XOR-toggles them. No particles can be painted inside a solid wall. Each channel holds at most one particle per site.</p>
  </>:<p className="neighborhood-note">PAINT = put up a reflecting wall and clear any particles there. ERASE = remove wall. INVERT = toggle wall. Painting or erasing is external intervention, so it may change total particle count; evolution itself conserves it.</p>}
  <p className="neighborhood-note">Periodic edges conserve both particle count and total momentum. Reflecting walls or finite edges conserve particle count but can exchange momentum with the barriers. HPP has square-lattice anisotropy; it is not Navier–Stokes fluid dynamics.</p>
 </section>;
}
