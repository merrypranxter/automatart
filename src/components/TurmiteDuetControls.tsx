import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import type {TurmiteDuet} from '../engine/turmite-duet';
import {DEFAULT_TURMITE_DUET} from '../engine/turmite-duet';
import {DEFAULT_TURMITE_PHEROMONES,pheromoneStats} from '../engine/turmite-pheromones';

interface Props{
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;
 selectedAgent:number;
}
export default function TurmiteDuetControls({settings:s,setSettings,world,selectedAgent}:Props){
 const d=s.turmiteDuet??DEFAULT_TURMITE_DUET;
 const chem=s.turmitePheromoneRules??DEFAULT_TURMITE_PHEROMONES;
 const statsA=pheromoneStats(world.turmitePheromones);
 const statsB=pheromoneStats(world.turmiteRivalPheromones);
 const set=(patch:Partial<TurmiteDuet>,activate=false)=>setSettings(old=>({
  ...old,turmiteDuet:{...(old.turmiteDuet??DEFAULT_TURMITE_DUET),...patch},
  ...(activate?{
   turmitePheromoneRules:{...(old.turmitePheromoneRules??DEFAULT_TURMITE_PHEROMONES),enabled:true},
   turmiteSpeciesCount:Math.max(2,old.turmiteSpeciesCount)
  }:{})
 }));
 const setMode=(patch:Partial<TurmiteDuet>)=>set(patch);
 const ant=world.turmiteAgents?.[Math.min(selectedAgent,(world.turmiteAgents?.length??1)-1)];
 const active=d.enabled&&chem.enabled;
 const [a,b]=[world.turmitePheromones,world.turmiteRivalPheromones];
 return <div aria-label="T7 real competing chemical fields">
  <div className="c3-header"><strong>☣ T7 · CHEMICAL CIVIL WAR</strong>
   <span>ANTAGONISTIC FIELDS · REACTION · SPLIT SPECIES</span></div>
  <p className="module-note">Two real 0–255 chemical lattices now compete. Even-numbered ant species deposit A; odd-numbered species deposit B. Each can diffuse and decay differently. Wherever both arrive, they can annihilate or convert each other. Ants physically steer according to the signed gradient of A − B, or its inverse. It's a genuine coupled dynamical system.</p>
  <label className="toggle"><input id="turmite-duet-enabled" type="checkbox"
   checked={d.enabled} onChange={e=>set({enabled:e.target.checked},e.target.checked)}/>
   <span>ENABLE DUAL CHEMICAL ECOLOGY</span></label>
  <p className="neighborhood-note" id="turmite-duet-status" role="status">
   {active?'TWO CHEMICAL FIELDS ACTIVE':d.enabled?'DUET PAUSED · enable T6 chemistry to evolve':'DUAL FIELD BYPASSED · EXACT T6 BEHAVIOR'}
   {' · '}T7 requires T6 active and at least two different species to deposit both chemicals. Enabling T7 selects two species without moving ants or restarting the artwork.
  </p>
  <label className="input-label" htmlFor="turmite-duet-navigation">Navigation by combined chemical gradient</label>
  <select id="turmite-duet-navigation" value={d.navigation}
   onChange={e=>setMode({navigation:e.target.value as TurmiteDuet['navigation']})}>
   <option value="territories">TERRITORIES · even seek A−B, odd seek B−A</option>
   <option value="inverted">REVERSED ALLEGIANCE · switch both affinities</option>
   <option value="off">T6 NAVIGATION ONLY · still run competing chemistry</option>
  </select>
  <label className="input-label" htmlFor="turmite-duet-reaction">Real same-site chemical reaction</label>
  <select id="turmite-duet-reaction" value={d.reaction}
   onChange={e=>setMode({reaction:e.target.value as TurmiteDuet['reaction']})}>
   <option value="none">NO REACTION · both species coexist</option>
   <option value="neutralize">ANNIHILATE · subtract equal amounts of A and B</option>
   <option value="convertA">A EATS B · convert B into A</option>
   <option value="convertB">B EATS A · convert A into B</option>
  </select>
  <label className="input-label" htmlFor="turmite-duet-reaction-rate">Chemical reaction strength <em>{d.reactionRate} units per site and step</em></label>
  <input id="turmite-duet-reaction-rate" type="range" min="0" max="24" step="1"
   value={d.reactionRate} onChange={e=>setMode({reactionRate:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-duet-deposit">B deposition per ant <em>{d.deposit} / 255</em></label>
  <input id="turmite-duet-deposit" type="range" min="0" max="32" step="1"
   value={d.deposit} onChange={e=>setMode({deposit:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-duet-diffusion">B diffusion <em>{d.diffusion} / 8</em></label>
  <input id="turmite-duet-diffusion" type="range" min="0" max="8" step="1"
   value={d.diffusion} onChange={e=>setMode({diffusion:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-duet-evaporation">B evaporation <em>{d.evaporation}</em></label>
  <input id="turmite-duet-evaporation" type="range" min="0" max="8" step="1"
   value={d.evaporation} onChange={e=>setMode({evaporation:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-duet-strength">Signed gradient steering <em>{['OFF','UP TO 90°','FULL ALIGNMENT'][d.strength]}</em></label>
  <input id="turmite-duet-strength" type="range" min="0" max="2" step="1"
   value={d.strength} onChange={e=>setMode({strength:Number(e.target.value) as 0|1|2})}/>
  <label className="input-label" htmlFor="turmite-duet-threshold">Minimum signed gradient <em>{d.threshold}</em></label>
  <input id="turmite-duet-threshold" type="range" min="1" max="64" step="1"
   value={d.threshold} onChange={e=>setMode({threshold:Number(e.target.value)})}/>
  <div className="c3-presets">
   <button id="turmite-duet-war" type="button" onClick={()=>set({
    enabled:true,navigation:'territories',reaction:'neutralize',reactionRate:10,
    deposit:28,diffusion:4,evaporation:1,strength:2,threshold:1
   },true)}>☣ CHEMICAL FRONT LINES</button>
   <button id="turmite-duet-parasite" type="button" onClick={()=>set({
    enabled:true,navigation:'inverted',reaction:'convertB',reactionRate:16,
    deposit:30,diffusion:6,evaporation:0,strength:2,threshold:1
   },true)}>🦠 B EATS A</button>
   <button id="turmite-duet-bloom" type="button" onClick={()=>set({
    enabled:true,navigation:'territories',reaction:'convertA',reactionRate:12,
    deposit:25,diffusion:8,evaporation:0,strength:1,threshold:2
   },true)}>🧬 A BLOOM</button>
   <button id="turmite-duet-ceasefire" type="button" onClick={()=>set({
    enabled:true,navigation:'off',reaction:'none',reactionRate:0,
    deposit:18,diffusion:4,evaporation:1,strength:0,threshold:1
   },true)}>☮ CHEMICAL CEASEFIRE</button>
   <button id="turmite-duet-off" type="button" onClick={()=>set({enabled:false})}>
    ↺ BYPASS T7 · PRESERVE BOTH FIELDS</button>
  </div>
  <div className="c3-readouts" id="turmite-duet-stats">
   <div><b id="turmite-duet-a-sites">{statsA.occupied}</b><span>A OCCUPIED</span></div>
   <div><b id="turmite-duet-b-sites">{statsB.occupied}</b><span>B OCCUPIED</span></div>
   <div><b id="turmite-duet-a-peak">{statsA.peak}</b><span>PEAK A</span></div>
   <div><b id="turmite-duet-b-peak">{statsB.peak}</b><span>PEAK B</span></div>
  </div>
  <p className="neighborhood-note">Live 5×5 chemical conflict microscope at the selected ant (center highlighted). Each square shows measured A / B concentrations; the difference is what steers the ants.</p>
  <div id="turmite-duet-field" role="img" aria-label="Measured A and B dual pheromone field"
   style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:3,maxWidth:365}}>
   {Array.from({length:25},(_,i)=>{
    let x=(ant?.x??Math.floor(world.width/2))+(i%5-2);
    let y=(ant?.y??Math.floor(world.height/2))+(Math.floor(i/5)-2);
    if(s.wrap){x=(x+world.width)%world.width;y=(y+world.height)%world.height;}
    const p=x>=0&&x<world.width&&y>=0&&y<world.height?y*world.width+x:-1;
    const A=p<0?0:a?.[p]??0,B=p<0?0:b?.[p]??0;
    return <div key={i} data-duet-site={i} data-duet-a={A} data-duet-b={B}
     title={'A '+A+' / B '+B+' / gradient potential '+(A-B)}
     style={{padding:'3px 2px',minHeight:36,borderRadius:4,textAlign:'center',
      border:i===12?'2px solid #ff40ce':'1px solid #777',
      background:'rgba(160,80,220,'+(0.04+(A+B)/510*.65)+')',fontSize:'.7rem'}}>
      {A}<span style={{opacity:.7}}> / </span>{B}
     </div>;
   })}
  </div>
  <p className="neighborhood-note">T7 reaction and steering settings update LIVE without clearing your artwork. If you turn T7 off, the B field stays frozen for later. When active, each chemical substep is simultaneous, saturating, deterministic, saved in recipes, and used by the real GIF/video recorder.</p>
 </div>;
}
