import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DEFAULT_TURMITE_PHEROMONES,pheromoneStats} from '../engine/turmite-pheromones';
import type {TurmitePheromones} from '../engine/turmite-pheromones';

interface Props {
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;
 selectedAgent:number;
}
export default function TurmiteScentControls({settings:s,setSettings,world,selectedAgent}:Props){
 const chem=s.turmitePheromoneRules??DEFAULT_TURMITE_PHEROMONES;
 const stats=pheromoneStats(world.turmitePheromones);
 const update=(patch:Partial<TurmitePheromones>)=>setSettings(old=>({
  ...old,turmitePheromoneRules:{...(old.turmitePheromoneRules??DEFAULT_TURMITE_PHEROMONES),...patch}
 }));
 const ant=world.turmiteAgents?.[Math.min(selectedAgent,(world.turmiteAgents?.length??1)-1)];
 return <div aria-label="T6 living pheromone gravity laboratory">
  <div className="c3-header"><strong>🧪 T6 · PHEROMONE GRAVITY</strong>
   <span>REAL SECOND FIELD · DIFFUSION · CHEMOTAXIS</span></div>
  <p className="module-note">Every ant deposits real chemical values into an independent grid. Chemicals spread to neighbors and evaporate. Ants sense the gradient and physically turn toward or away from previous visits, including other species' trails. T5 memory and T4 pigment chemistry remain independent. No shaders pretending to be physics.</p>
  <label className="toggle"><input id="turmite-scent-enabled" type="checkbox"
   checked={chem.enabled} onChange={e=>update({enabled:e.target.checked})}/>
   <span>ENABLE REAL PHEROMONE FIELD</span></label>
  <label className="input-label" htmlFor="turmite-scent-steering">How agents navigate this chemical field</label>
  <select id="turmite-scent-steering" value={chem.steering}
   onChange={e=>update({steering:e.target.value as TurmitePheromones['steering']})}>
   <option value="off">DEPOSIT ONLY · NO TURN CHANGE</option>
   <option value="attract">ATTRACT · seek stronger chemicals</option>
   <option value="repel">REPEL · seek weaker chemicals</option>
   <option value="alternating">SPLIT HIVE · alternating species attract / repel</option>
  </select>
  <label className="input-label" htmlFor="turmite-scent-deposit">Deposit per ant per movement <em>{chem.deposit} / 255</em></label>
  <input type="range" id="turmite-scent-deposit" min="0" max="32" step="1"
   value={chem.deposit} onChange={e=>update({deposit:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-scent-diffusion">Real four-neighbor diffusion <em>{chem.diffusion} / 8</em></label>
  <input type="range" id="turmite-scent-diffusion" min="0" max="8" step="1"
   value={chem.diffusion} onChange={e=>update({diffusion:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-scent-evaporation">Evaporation / movement <em>{chem.evaporation}</em></label>
  <input type="range" id="turmite-scent-evaporation" min="0" max="8" step="1"
   value={chem.evaporation} onChange={e=>update({evaporation:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-scent-strength">Steering <em>{['OFF','AT MOST 90°','ALIGN TO FIELD'][chem.strength]}</em></label>
  <input type="range" id="turmite-scent-strength" min="0" max="2" step="1"
   value={chem.strength} onChange={e=>update({strength:Number(e.target.value) as 0|1|2})}/>
  <label className="input-label" htmlFor="turmite-scent-threshold">Minimum positive gradient <em>{chem.threshold}</em></label>
  <input type="range" id="turmite-scent-threshold" min="1" max="32" step="1"
   value={chem.threshold} onChange={e=>update({threshold:Number(e.target.value)})}/>
  <div className="c3-presets">
   <button id="turmite-scent-follow" type="button" onClick={()=>update({
    enabled:true,deposit:27,diffusion:4,evaporation:1,steering:'attract',strength:2,threshold:2
   })}>🧲 TRAIL HUNTERS</button>
   <button id="turmite-scent-flee" type="button" onClick={()=>update({
    enabled:true,deposit:24,diffusion:3,evaporation:1,steering:'repel',strength:2,threshold:1
   })}>💥 TRAIL REPELLERS</button>
   <button id="turmite-scent-split" type="button" onClick={()=>update({
    enabled:true,deposit:29,diffusion:5,evaporation:1,steering:'alternating',strength:2,threshold:1
   })}>☯ SPLIT HIVE</button>
   <button id="turmite-scent-fog" type="button" onClick={()=>update({
    enabled:true,deposit:15,diffusion:8,evaporation:0,steering:'attract',strength:1,threshold:1
   })}>☁ LONG-LIVED SCENT FOG</button>
   <button id="turmite-scent-off" type="button" onClick={()=>update({enabled:false})}>
    ↺ BYPASS T6 · PRESERVE CHEMICAL HISTORY</button>
  </div>
  <div className="c3-readouts" id="turmite-scent-stats">
   <div><b id="turmite-scent-active">{chem.enabled?'ON':'OFF'}</b><span>SCENT EVOLUTION</span></div>
   <div><b id="turmite-scent-cells">{stats.occupied}</b><span>SCENTED SITES</span></div>
   <div><b id="turmite-scent-peak">{stats.peak}</b><span>PEAK INTENSITY</span></div>
  </div>
  <p className="neighborhood-note">Measured 5×5 chemical neighborhood of the selected ant. Pink border marks the ant's current site; numbers are the true 0–255 chemical states, not a decorative color signal.</p>
  <div id="turmite-scent-heatmap" role="img" aria-label="Actual 5 by 5 chemical concentration field"
   style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:3,maxWidth:315}}>
   {Array.from({length:25},(_,i)=>{
    let x=(ant?.x??Math.floor(world.width/2))+(i%5-2);
    let y=(ant?.y??Math.floor(world.height/2))+(Math.floor(i/5)-2);
    if(s.wrap){x=(x+world.width)%world.width;y=(y+world.height)%world.height;}
    const value=x>=0&&x<world.width&&y>=0&&y<world.height?
     (world.turmitePheromones?.[y*world.width+x]??0):0;
    return <div key={i} data-scent-site={i} data-scent-value={value}
     title={'Chemical intensity '+value} style={{
      minHeight:33,border:i===12?'2px solid #ff40ce':'1px solid #777',
      borderRadius:3,display:'grid',placeItems:'center',fontSize:'.75rem',
      background:'rgba(0,220,190,'+(0.07+value/255*.8)+')'
     }}>{value}</div>;
   })}
  </div>
  <p className="neighborhood-note">All T6 settings edit LIVE without resetting art. Turning this OFF freezes (but does not delete) its field. Each physical microstep reads the previous field simultaneously, then updates true chemical deposits, diffusion and evaporation. Recipes and recorders preserve both grids exactly.</p>
 </div>;
}
