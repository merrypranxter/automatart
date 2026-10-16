import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DEFAULT_TURMITE_GENE_SPILL} from '../engine/turmite-gene-spill';
import type {TurmiteGeneSpill} from '../engine/turmite-gene-spill';
import {DEFAULT_TURMITE_EVOLUTION} from '../engine/turmite-genetics';
import {DEFAULT_TURMITE_PHEROMONES} from '../engine/turmite-pheromones';
interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World;selectedAgent:number}
export default function TurmiteGeneSpillControls({settings:s,setSettings,world,selectedAgent}:Props){
 const spill=s.turmiteGeneSpill??DEFAULT_TURMITE_GENE_SPILL;
 const ants=world.turmiteAgents??[];
 const passed=ants.reduce((n,a)=>n+(a.transferCount??0),0);
 const changed=ants.filter(a=>a.transferFrom!==undefined).length;
 const set=(patch:Partial<TurmiteGeneSpill>,needsGenes=false,needsScent=false)=>setSettings(old=>({
  ...old,turmiteGeneSpill:{...(old.turmiteGeneSpill??DEFAULT_TURMITE_GENE_SPILL),...patch},
  ...(needsGenes?{turmiteEvolution:{
    ...(old.turmiteEvolution??DEFAULT_TURMITE_EVOLUTION),enabled:true
  }}:{}),
  ...(needsScent?{turmitePheromoneRules:{
    ...(old.turmitePheromoneRules??DEFAULT_TURMITE_PHEROMONES),enabled:true
  }}:{})
 }));
 return <div aria-label="T11 spatial genetic contagion laboratory">
  <div className="c3-header"><strong>🦠 T11 · GENE SPILL</strong><span>TRUE CONTACTS · SHARED ALLELES · SPATIAL EPIDEMICS</span></div>
  <p className="module-note">Ants can now exchange actual mathematical DNA when they physically meet on the same site or within a real Manhattan neighborhood. Contact events are computed synchronously from old grid positions. A successful exchange changes true turning, painting, or resource math on the next step—not a color overlay.</p>
  <label className="toggle"><input id="turmite-spill-enabled" type="checkbox"
   checked={spill.enabled} onChange={e=>set({enabled:e.target.checked},e.target.checked)}/>
   ENABLE PHYSICAL GENE TRANSFER</label>
  <div className="c3-readouts" id="turmite-spill-stats">
   <div><b id="turmite-spill-contacts">{passed}</b><span>CONTACT OPPORTUNITIES</span></div>
   <div><b id="turmite-spill-carriers">{changed}</b><span>WITH DONOR HISTORY</span></div>
   <div><b id="turmite-spill-registry">{ants.length}</b><span>REAL ANTS</span></div>
  </div>
  <label className="input-label" htmlFor="turmite-spill-radius">Physical contact distance <em>{spill.radius} lattice cells</em></label>
  <input id="turmite-spill-radius" type="range" min="0" max="8" step="1"
   value={spill.radius} onChange={e=>set({radius:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-spill-probability">Transmission probability <em>{spill.probability}%</em></label>
  <input id="turmite-spill-probability" type="range" min="0" max="100" step="1"
   value={spill.probability} onChange={e=>set({probability:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="turmite-spill-locus">Gene passed between physical neighbors</label>
  <select id="turmite-spill-locus" value={spill.locus}
   onChange={e=>set({locus:e.target.value as TurmiteGeneSpill['locus']})}>
   <option value="all">ANY OF FOUR GENES · CONTACT-SEEDED</option>
   <option value="turn">TURN · ACTUAL PATH PROGRAM</option>
   <option value="write">PIGMENT · REAL TRACK WRITER</option>
   <option value="metabolism">METABOLISM · LIVING ENERGY COST</option>
   <option value="forage">FORAGE · ACTUAL FOOD EXTRACTION</option>
  </select>
  <label className="input-label" htmlFor="turmite-spill-mode">Gene-exchange mathematics</label>
  <select id="turmite-spill-mode" value={spill.mode}
   onChange={e=>set({mode:e.target.value as TurmiteGeneSpill['mode']})}>
   <option value="copy">PLASMID COPY · REPLACE ONE ALLELE FROM DONOR</option>
   <option value="blend">GENETIC BLEND · ROUND AVERAGE OF TWO ALLELES</option>
   <option value="mutate">CONTACT MUTAGEN · DONOR ALLELE ±1 POINT</option>
  </select>
  <label className="input-label" htmlFor="turmite-spill-gate">Environmental condition for contact</label>
  <select id="turmite-spill-gate" value={spill.gate}
   onChange={e=>set({gate:e.target.value as TurmiteGeneSpill['gate']},false,e.target.value==='scent')}>
   <option value="any">ANY PLACE · PHYSICAL NEIGHBORHOOD ALONE</option>
   <option value="pigment">ONLY ON OLD PHYSICALLY PAINTED TRACK</option>
   <option value="scent">ONLY WHEN REAL CHEMICAL A IS STRONG ENOUGH</option>
  </select>
  {spill.gate==='scent'&&<div>
   <label className="input-label" htmlFor="turmite-spill-threshold">Real chemical intensity threshold <em>{spill.threshold}/255</em></label>
   <input id="turmite-spill-threshold" type="range" min="0" max="255" step="1"
    value={spill.threshold} onChange={e=>set({threshold:Number(e.target.value)})}/>
  </div>}
  <div className="c3-presets">
   <button type="button" id="turmite-spill-plasmids" onClick={()=>set({
    enabled:true,radius:1,probability:100,mode:'copy',locus:'all',gate:'any'},true)}>🧬 PLASMID PARTY</button>
   <button type="button" id="turmite-spill-mutation" onClick={()=>set({
    enabled:true,radius:2,probability:100,mode:'mutate',locus:'write',gate:'any'},true)}>🦠 INK EPIDEMIC</button>
   <button type="button" id="turmite-spill-track" onClick={()=>set({
    enabled:true,radius:1,probability:75,mode:'blend',locus:'turn',gate:'pigment'},true)}>🌀 TRACK-LIMITED CROSSOVER</button>
   <button type="button" id="turmite-spill-chemical" onClick={()=>set({
    enabled:true,radius:3,probability:85,mode:'copy',locus:'metabolism',
    gate:'scent',threshold:32},true,true)}>🧪 CHEMICAL VECTORS</button>
   <button type="button" id="turmite-spill-off" onClick={()=>set({enabled:false})}>
    ↺ BYPASS T11 · RETAIN ALL TRANSFER HISTORY</button>
  </div>
  <p className="neighborhood-note">With only one ant, no contact is possible. For a busy colony use several ants and their T3 formation options. The nearest donor wins (ties resolved by stable ant ID). Same-site encounters work at radius 0, and wrapped worlds use wrapped distances. Existing sketches are never restarted when these controls change.</p>
  <div style={{overflowX:'auto'}}>
   <table id="turmite-spill-matrix" style={{width:'100%',fontSize:'.78rem'}}>
    <thead><tr><th>ANT</th><th>CONTACTS</th><th>LAST DONOR</th><th>LAST GENE</th><th>NOW CARRIES</th></tr></thead>
    <tbody>{ants.map((a,i)=>{
     const last=a.transferGene;
     const value=last?a.genome?.[last]??0:null;
     return <tr key={i} data-spill-agent={i} aria-selected={i===selectedAgent}>
      <th>#{i+1}</th><td data-spill-count={i}>{a.transferCount??0}</td>
      <td data-spill-donor={i}>{a.transferFrom===undefined?'—':'#'+(a.transferFrom+1)}</td>
      <td data-spill-gene={i}>{last??'—'}</td>
      <td>{value===null?'—':value>0?'+'+value:String(value)}</td>
     </tr>;
    })}</tbody>
   </table>
  </div>
 </div>;
}
