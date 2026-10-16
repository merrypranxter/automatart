import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DEFAULT_TURMITE_EVOLUTION,genomeOf,genomeDiversity} from '../engine/turmite-genetics';
import type {TurmiteEvolution} from '../engine/turmite-genetics';
import {DEFAULT_TURMITE_LIFE} from '../engine/turmite-life';

interface Props{
 settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;selectedAgent:number
}
export default function TurmiteGeneticsControls({settings:s,setSettings,world,selectedAgent}:Props){
 const evo=s.turmiteEvolution??DEFAULT_TURMITE_EVOLUTION;
 const life=s.turmiteLife??DEFAULT_TURMITE_LIFE;
 const ants=world.turmiteAgents??[];
 const diversity=genomeDiversity(ants,life.enabled);
 const actualBorn=ants.filter(a=>a.parentId!==undefined).length;
 const set=(patch:Partial<TurmiteEvolution>,enableLife=false)=>setSettings(old=>({
  ...old,
  turmiteEvolution:{...(old.turmiteEvolution??DEFAULT_TURMITE_EVOLUTION),...patch},
  ...(enableLife?{turmiteLife:{...(old.turmiteLife??DEFAULT_TURMITE_LIFE),
   enabled:true,breeding:(old.turmiteLife?.breeding==='off'?'bud':old.turmiteLife?.breeding??'bud')}}:{})
 }));
 return <div aria-label="T10 genetically evolving mathematical ant colonies">
  <div className="c3-header"><strong>🧬 T10 · GENETIC DRIFT</strong>
   <span>HERITABLE ACTUAL RULES · MUTATION · SURVIVAL SELECTION</span></div>
  <p className="module-note">Your T9 offspring inherit four small, persistent mathematical genes. Genes mutate at true births and change actual turn instructions, recorded pigment, metabolic costs, and painted-track nutrition. Differences in survival determine which genomes can keep reproducing: genuine selection on a deterministic population.</p>
  <label className="toggle">
   <input id="turmite-genetics-enabled" type="checkbox" checked={evo.enabled}
    onChange={e=>set({enabled:e.target.checked},e.target.checked)}/>
   ENABLE GENUINE HERITABLE MUTATION
  </label>
  <div className="c3-readouts" id="turmite-genetics-stats">
   <div><b id="turmite-genetics-diversity">{diversity}</b><span>DISTINCT LIVE GENOMES</span></div>
   <div><b id="turmite-genetics-descendants">{actualBorn}</b><span>REGISTERED DESCENDANTS</span></div>
   <div><b id="turmite-genetics-slots">{ants.length}</b><span>STABLE ANT IDENTITIES</span></div>
  </div>
  <p className="neighborhood-note">With the default 1-ant world or a full 12/12 colony, there are no vacant slots for birth and mutation. Choose 8–12 ant slots and 2 founders, then intentionally start a NEW world to watch lineages diverge. Choosing a preset alone NEVER resets or destroys the current art.</p>
  <p className="neighborhood-note">Mutation happens only after a successful T9 birth into a vacant slot. A parent passes its complete genome to the child, and a seeded event can alter one allele. With T10 OFF, genes stay saved but have zero influence; original T1–T9 math resumes. Founder genomes start neutral: +0 to everything. Enable T9 breeding and leave room for offspring.</p>
  <label className="input-label" htmlFor="turmite-genetics-rate">Birth mutation probability
   <em>{evo.mutationRate}%</em></label>
  <input id="turmite-genetics-rate" type="range" min="0" max="100" step="1"
   value={evo.mutationRate} onChange={e=>set({mutationRate:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-genetics-size">Maximum mutation step
   <em>{evo.mutationSize} gene point(s)</em></label>
  <input id="turmite-genetics-size" type="range" min="1" max="3" step="1"
   value={evo.mutationSize} onChange={e=>set({mutationSize:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-genetics-locus">Mutating gene</label>
  <select id="turmite-genetics-locus" value={evo.locus}
   onChange={e=>set({locus:e.target.value as TurmiteEvolution['locus']})}>
   <option value="all">GENETIC DRIFT · ANY OF FOUR LOCI</option>
   <option value="turn">TURN · ACTUAL MOVEMENT PROGRAM</option>
   <option value="write">PIGMENT · ACTUAL TRACK WRITER</option>
   <option value="metabolism">METABOLISM · ENERGY SPENT TO MOVE</option>
   <option value="forage">FORAGE · ENERGY GAINED FROM OLD PIGMENT</option>
  </select>
  <div className="c3-presets">
   <button type="button" id="turmite-genetics-rainbow" onClick={()=>set({
    enabled:true,mutationRate:100,mutationSize:1,locus:'write'},true)}>🌈 COLOR BLOODLINES</button>
   <button type="button" id="turmite-genetics-maze" onClick={()=>set({
    enabled:true,mutationRate:100,mutationSize:1,locus:'turn'},true)}>🌀 MUTATING MAZES</button>
   <button type="button" id="turmite-genetics-hunger" onClick={()=>set({
    enabled:true,mutationRate:65,mutationSize:1,locus:'all'},true)}>🧫 SURVIVAL OF THE WEIRDEST</button>
   <button type="button" id="turmite-genetics-experiment" onClick={()=>set({
    enabled:true,mutationRate:15,mutationSize:1,locus:'metabolism'},true)}>🔬 SLOW ADAPTATION</button>
   <button type="button" id="turmite-genetics-off" onClick={()=>set({enabled:false})}>
    ↺ BYPASS GENETICS · KEEP THE LINEAGES</button>
  </div>
  <div style={{overflowX:'auto'}}>
   <table id="turmite-genetics-matrix" style={{width:'100%',fontSize:'.78rem'}}>
    <thead><tr><th>ANT</th><th>GEN</th><th>PARENT</th><th>TURN</th><th>INK</th><th>COST</th><th>FOOD</th></tr></thead>
    <tbody>{ants.map((ant,i)=>{
     const g=genomeOf(ant);
     return <tr key={i} data-genetics-agent={i} aria-selected={selectedAgent===i}>
      <th>#{i+1}{life.enabled&&ant.alive===false?' ○':''}</th>
      <td data-genetics-depth={i}>{ant.depth??0}</td>
      <td data-genetics-parent={i}>{ant.parentId===undefined?'FOUNDER':'#'+(ant.parentId+1)}</td>
      <td data-genetics-turn={i}>{g.turn>0?'+':''}{g.turn}</td>
      <td data-genetics-write={i}>{g.write>0?'+':''}{g.write}</td>
      <td data-genetics-metabolism={i}>{g.metabolism>0?'+':''}{g.metabolism}</td>
      <td data-genetics-forage={i}>{g.forage>0?'+':''}{g.forage}</td>
     </tr>;
    })}</tbody>
   </table>
  </div>
  <p className="neighborhood-note" id="turmite-genetics-message">
   {evo.enabled?
    'HERITABLE MATH RUNNING · '+actualBorn+' occupied descent record(s) · '+diversity+' distinct active genomes. New births depend on available dormant slots and the real local food supply.':
    'GENETICS FROZEN · all stored genes remain in recipes, but actual turning, writing, and metabolism revert to T1–T9.'}
  </p>
 </div>;
}
