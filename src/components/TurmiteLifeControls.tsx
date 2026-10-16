import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DEFAULT_TURMITE_LIFE,lifeIsActive} from '../engine/turmite-life';
import type {TurmiteLife} from '../engine/turmite-life';
interface Props{settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World;selectedAgent:number}
export default function TurmiteLifeControls({settings:s,setSettings,world,selectedAgent}:Props){
 const l=s.turmiteLife??DEFAULT_TURMITE_LIFE;
 const agents=world.turmiteAgents??[];
 const living=l.enabled?agents.filter(lifeIsActive).length:agents.length;
 const dormant=agents.length-living;
 const set=(patch:Partial<TurmiteLife>)=>setSettings(old=>({
  ...old,turmiteLife:{...(old.turmiteLife??DEFAULT_TURMITE_LIFE),...patch}
 }));
 return <div aria-label="T9 live ecological swarm laboratory">
  <div className="c3-header"><strong>🧫 T9 · SWARM LIFE</strong>
    <span>METABOLISM · RESOURCES · AGING · DORMANCY · BIRTH</span></div>
  <p className="module-note">These are real organisms in the mathematical lattice, not drawn sprites. Ants expend energy for every actual movement, eat existing pigmented cells and measured chemical A, age, and die into dormant registry slots. Surviving ants can bud into those vacancies. Their real paint, trail, memory and oscillator biology continue working together.</p>
  <label className="toggle"><input id="turmite-life-enabled" type="checkbox" checked={l.enabled}
   onChange={e=>set({enabled:e.target.checked})}/> ENABLE LIVING SWARM ECOLOGY</label>
  <div className="c3-readouts" id="turmite-life-stats">
   <div><b id="turmite-life-living">{living}</b><span>LIVING ANTS</span></div>
   <div><b id="turmite-life-dormant">{dormant}</b><span>DORMANT SLOTS</span></div>
   <div><b id="turmite-life-capacity">{agents.length}</b><span>REGISTRY CAPACITY</span></div>
  </div>
  <p className="neighborhood-note">A dormant slot doesn't move, write, deposit scent or influence oscillator coupling. Birth fills a dormant slot on the NEXT microstep; existing ant IDs never change. A colony can go extinct. Turning T9 OFF freezes life registers and resumes classic ant movement; turning it back ON resumes its stored biology.</p>
  <label className="input-label" htmlFor="turmite-life-breeding">Reproduction mathematics</label>
  <select id="turmite-life-breeding" value={l.breeding}
    onChange={e=>set({breeding:e.target.value as TurmiteLife['breeding']})}>
   <option value="off">NO BIRTH · population can only shrink</option>
   <option value="bud">BUD · offspring next to parent, heading inherited</option>
   <option value="split">SPLIT · offspring opposite heading, partial resources</option>
  </select>
  {([
   ['metabolism','Energy spent per actual step',0,16],
   ['pigmentFood','Energy from old occupied track cell',0,32],
   ['chemicalFood','Maximum energy from old real chemical A',0,16],
   ['lifespan','Maximum true ant age',2,4096],
   ['birthEnergy','Birth energy threshold',4,255],
   ['birthCost','Parent reproduction cost',1,128],
   ['initialEnergy','Legacy/fresh ant starting energy',1,255]
  ] as const).map(([key,label,min,max])=><div key={key}>
   <label className="input-label" htmlFor={'turmite-life-'+key}>{label}
    <em>{l[key]}</em></label>
   <input id={'turmite-life-'+key} type="range" min={min} max={max}
    step={1} value={l[key]}
    onChange={e=>set({[key]:Number(e.target.value)})}/>
  </div>)}
  <label className="input-label" htmlFor="turmite-life-founders">Founders in NEXT freshly created world
   <em>{Math.min(l.founders,s.turmiteCount)} / {s.turmiteCount}</em></label>
  <input id="turmite-life-founders" type="range" min="1" max={s.turmiteCount}
   value={Math.min(l.founders,s.turmiteCount)} onChange={e=>set({founders:Number(e.target.value)})}/>
  <p className="fineprint">Founder count is applied only when you explicitly start a NEW world; changing this slider does not erase the current art. Use Ant Population in T1 to set registry capacity (that existing structural change restarts the world). For visible births, use a few founders and more slots.</p>
  <div className="c3-presets">
   <button type="button" id="turmite-life-garden" onClick={()=>set({
    enabled:true,breeding:'bud',metabolism:2,pigmentFood:18,chemicalFood:6,
    birthEnergy:110,birthCost:44,lifespan:512})}>🌿 FERTILE GARDEN</button>
   <button type="button" id="turmite-life-famine" onClick={()=>set({
    enabled:true,breeding:'off',metabolism:9,pigmentFood:2,chemicalFood:0,
    birthEnergy:220,birthCost:90,lifespan:96})}>☠️ FAMINE / EXTINCTION</button>
   <button type="button" id="turmite-life-parasites" onClick={()=>set({
    enabled:true,breeding:'split',metabolism:2,pigmentFood:24,chemicalFood:14,
    birthEnergy:85,birthCost:36,lifespan:128})}>🪱 FAST SPLITTING</button>
   <button type="button" id="turmite-life-fossils" onClick={()=>set({
    enabled:true,breeding:'off',metabolism:0,pigmentFood:0,chemicalFood:0,
    birthEnergy:255,birthCost:128,lifespan:4096})}>🦴 LONG-LIVED FOSSILS</button>
   <button type="button" id="turmite-life-off" onClick={()=>set({enabled:false})}>
    ↺ BYPASS T9 · FREEZE LIFE HISTORY</button>
  </div>
  <div style={{overflowX:'auto'}}>
   <table id="turmite-life-matrix" style={{width:'100%',fontSize:'.78rem'}}>
    <thead><tr><th>ANT</th><th>STATUS</th><th>ENERGY</th><th>AGE</th><th>SPECIES</th></tr></thead>
    <tbody>{agents.map((agent,i)=><tr key={i} data-life-agent={i}
     aria-selected={selectedAgent===i}>
      <th>#{i+1}</th>
      <td data-life-status={i}>{!l.enabled||lifeIsActive(agent)?'● ACTIVE':'○ DORMANT'}</td>
      <td data-life-energy={i}>{agent.energy??l.initialEnergy} / 255</td>
      <td data-life-age={i}>{agent.age??0} / {l.lifespan}</td>
      <td>{i%s.turmiteSpeciesCount+1}</td>
     </tr>)}</tbody>
   </table>
  </div>
  <p className="neighborhood-note" id="turmite-life-message">
   {living===0&&l.enabled?'COLONY EXTINCT. Change founder settings, then explicitly start a new world to seed another colony.':
    l.enabled?'Live ecosystem: '+living+' organism(s), '+dormant+' vacant/dormant slot(s).':'T9 ecology bypassed; original T1–T8 ant trajectories remain available.'}
  </p>
 </div>;
}
