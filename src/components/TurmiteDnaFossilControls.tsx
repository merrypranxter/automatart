import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DEFAULT_TURMITE_DNA_FOSSILS,dnaPoolStats,decodeDnaFragment} from '../engine/turmite-dna-fossils';
import type {TurmiteDnaFossils} from '../engine/turmite-dna-fossils';
import {DEFAULT_TURMITE_EVOLUTION} from '../engine/turmite-genetics';
interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World;selectedAgent:number}
export default function TurmiteDnaFossilControls({settings:s,setSettings,world,selectedAgent}:Props){
 const dna=s.turmiteDnaFossils??DEFAULT_TURMITE_DNA_FOSSILS;
 const ants=world.turmiteAgents??[];
 const pool=world.turmiteDnaCode&&world.turmiteDnaStrength?
  {code:world.turmiteDnaCode,strength:world.turmiteDnaStrength}:null;
 const stats=pool?dnaPoolStats(pool):{sites:0,strength:0,alleles:0};
 const absorbed=ants.reduce((a,x)=>a+(x.uptakeCount??0),0);
 const chosen=ants[selectedAgent];
 const set=(patch:Partial<TurmiteDnaFossils>,enableGenes=false)=>setSettings(old=>({
  ...old,turmiteDnaFossils:{...(old.turmiteDnaFossils??DEFAULT_TURMITE_DNA_FOSSILS),...patch},
  ...(enableGenes?{turmiteEvolution:{...(old.turmiteEvolution??DEFAULT_TURMITE_EVOLUTION),enabled:true}}:{})
 }));
 const sample=chosen&&pool?Array.from({length:25},(_,i)=>{
  const x=chosen.x+i%5-2,y=chosen.y+Math.floor(i/5)-2;
  const xx=s.wrap?(x%world.width+world.width)%world.width:x;
  const yy=s.wrap?(y%world.height+world.height)%world.height:y;
  if(xx<0||yy<0||xx>=world.width||yy>=world.height)return {code:0,strength:0};
  const p=yy*world.width+xx;
  return {code:pool.code[p],strength:pool.strength[p]};
 }):[];
 return <div aria-label="T12 extracellular genetic fossil laboratory">
  <div className="c3-header"><strong>🧬 T12 · DNA FOSSILS</strong>
   <span>THE WORLD REMEMBERS GENES AFTER THE ANTS LEAVE</span></div>
  <p className="module-note">Living Turmites shed pieces of their real mathematical DNA into an independent physical grid. Fragments decay, copy into neighboring cells, and can be absorbed by ants arriving later. A dying ant still sheds its last fragment. A newborn cannot deposit or absorb until its next true step. This changes actual later turning, pigment, hunger and reproduction—not a drawn overlay.</p>
  <label className="toggle"><input id="turmite-dna-enabled" type="checkbox"
   checked={dna.enabled} onChange={e=>set({enabled:e.target.checked},e.target.checked)}/>
   ENABLE EXTRACELLULAR GENETIC FIELD</label>
  <div className="c3-readouts" id="turmite-dna-stats">
   <div><b id="turmite-dna-sites">{stats.sites}</b><span>REAL DNA SITES</span></div>
   <div><b id="turmite-dna-variants">{stats.alleles}</b><span>FRAGMENT VARIETIES</span></div>
   <div><b id="turmite-dna-exposures">{absorbed}</b><span>ANT DNA ENCOUNTERS</span></div>
  </div>
  {([
   ['deposit','DNA concentration deposited per visit',0,255],
   ['decay','Fragment strength lost each microstep',0,32],
   ['spread','Nearest-cell DNA copying strength',0,8],
   ['uptake','Probability of an actual DNA absorption',0,100],
   ['threshold','Minimum old fragment strength for uptake',1,255]
  ] as const).map(([name,label,min,max])=><div key={name}>
   <label className="input-label" htmlFor={'turmite-dna-'+name}>{label}
    <em>{dna[name]}{name==='uptake'?'%':''}</em></label>
   <input id={'turmite-dna-'+name} type="range" min={min} max={max} step="1"
    value={dna[name]} onChange={e=>set({[name]:Number(e.target.value)})}/>
  </div>)}
  <label className="input-label" htmlFor="turmite-dna-locus">DNA fragment shed by passing ants</label>
  <select id="turmite-dna-locus" value={dna.locus}
   onChange={e=>set({locus:e.target.value as TurmiteDnaFossils['locus']})}>
   <option value="all">ANY OF FOUR HERITABLE GENES</option>
   <option value="turn">TURN · PHYSICAL INSTRUCTION DNA</option>
   <option value="write">PIGMENT · RECORDED TRACK COLOR DNA</option>
   <option value="metabolism">METABOLISM · ACTUAL ENERGY COST DNA</option>
   <option value="forage">FORAGE · REAL NUTRIENT DNA</option>
  </select>
  <label className="input-label" htmlFor="turmite-dna-mode">How old DNA rewrites a visiting ant</label>
  <select id="turmite-dna-mode" value={dna.mode}
   onChange={e=>set({mode:e.target.value as TurmiteDnaFossils['mode']})}>
   <option value="copy">ENVIRONMENTAL TRANSFORMATION · COPY THE FRAGMENT</option>
   <option value="blend">GENETIC ABSORPTION · BLEND OLD AND NEW ALLELES</option>
   <option value="mutate">MUTAGENIC SPORE · COPY WITH A ±1 REAL MUTATION</option>
  </select>
  <div className="c3-presets">
   <button id="turmite-dna-fossil-bed" type="button" onClick={()=>set({
    enabled:true,deposit:220,decay:1,spread:1,uptake:70,threshold:20,
    locus:'all',mode:'copy'},true)}>🦴 FOSSIL BED</button>
   <button id="turmite-dna-spore-storm" type="button" onClick={()=>set({
    enabled:true,deposit:240,decay:2,spread:8,uptake:100,threshold:10,
    locus:'write',mode:'mutate'},true)}>🦠 SPORE STORM</button>
   <button id="turmite-dna-ghost-ink" type="button" onClick={()=>set({
    enabled:true,deposit:190,decay:5,spread:4,uptake:90,threshold:20,
    locus:'turn',mode:'blend'},true)}>👻 GHOST PATHS</button>
   <button id="turmite-dna-bone-memory" type="button" onClick={()=>set({
    enabled:true,deposit:255,decay:0,spread:0,uptake:100,threshold:1,
    locus:'metabolism',mode:'copy'},true)}>🧪 IMMORTAL DNA ARCHIVE</button>
   <button id="turmite-dna-off" type="button" onClick={()=>set({enabled:false})}>
    ↺ FREEZE ENVIRONMENTAL DNA · NO ART RESET</button>
  </div>
  <p className="neighborhood-note">Information copying is not mass-conserving chemical diffusion. At each site the strongest attenuated old fragment wins; ties use the lowest source index. No global randomness. T12 OFF freezes the DNA field and preserves it in your recipes. T10 OFF also bypasses its effects. Try more than one ant or let your colony revisit its own abandoned trails.</p>
  <div style={{overflowX:'auto'}}>
   <table id="turmite-dna-matrix" style={{width:'100%',fontSize:'.78rem'}}>
    <thead><tr><th>ANT</th><th>EXPOSURES</th><th>LAST LOCUS</th><th>LAST CELL</th></tr></thead>
    <tbody>{ants.map((ant,i)=><tr key={i} data-dna-ant={i} aria-selected={i===selectedAgent}>
     <th>#{i+1}</th>
     <td data-dna-count={i}>{ant.uptakeCount??0}</td>
     <td data-dna-gene={i}>{ant.uptakeGene??'—'}</td>
     <td data-dna-site={i}>{ant.uptakeSite===undefined?'—':
      '('+(ant.uptakeSite%world.width)+','+Math.floor(ant.uptakeSite/world.width)+')'}</td>
    </tr>)}</tbody>
   </table>
  </div>
  <p className="fineprint">5×5 real fragment microscope centered on ant #{selectedAgent+1}. Each cell shows gene and strength (0 = empty). This is actual saved simulation state, not visualization sampling.</p>
  <div id="turmite-dna-microscope" style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:2}}>
   {sample.map(({code,strength},i)=>{
    const fragment=decodeDnaFragment(code);
    return <span key={i} data-dna-micro={i} title={fragment?
     fragment.locus+' '+fragment.allele+'; strength '+strength:'Empty'}
     style={{fontSize:10,textAlign:'center',padding:'5px 0',
      background:strength?'rgba(224,84,234,.22)':'rgba(255,255,255,.04)',
      color:strength?'#ffb8f3':'#8c809c',borderRadius:3}}>
     {fragment?fragment.locus.charAt(0).toUpperCase()+(fragment.allele>=0?'+':'')+
       fragment.allele:'·'}
     <small style={{display:'block',fontSize:9}}>{strength}</small>
    </span>;
   })}
  </div>
 </div>;
}
