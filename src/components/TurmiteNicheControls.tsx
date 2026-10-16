import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {DEFAULT_TURMITE_NICHES,nicheEnergyAt,siteNicheFitness,nicheDirectionSite} from '../engine/turmite-niches';
import type {TurmiteNiches} from '../engine/turmite-niches';
import {DEFAULT_TURMITE_EVOLUTION} from '../engine/turmite-genetics';
import {DEFAULT_TURMITE_LIFE} from '../engine/turmite-life';
import {DEFAULT_TURMITE_DNA_FOSSILS,decodeDnaFragment} from '../engine/turmite-dna-fossils';

interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>;world:World;selectedAgent:number}
export default function TurmiteNicheControls({settings:s,setSettings,world,selectedAgent}:Props){
 const n=s.turmiteNiches??DEFAULT_TURMITE_NICHES;
 const agents=world.turmiteAgents??[];
 const code=world.turmiteDnaCode,strength=world.turmiteDnaStrength;
 const agent=agents[selectedAgent];
 const valid=!!agent&&!!code&&!!strength;
 const geneticActive=n.enabled&&(s.turmiteEvolution?.enabled??false);
 const energyActive=geneticActive&&(s.turmiteLife?.enabled??false)&&agent?.alive!==false;
 const effectiveNiche={...n,enabled:geneticActive};
 const index=valid?agent!.y*world.width+agent!.x:0;
 const site=valid?siteNicheFitness(agent!,code,strength,index,effectiveNiche):null;
 const currentFragment=valid?decodeDnaFragment(code![index]):null;
 const localGain=valid&&energyActive?nicheEnergyAt(agent!,index,code,strength,effectiveNiche):0;
 const set=(patch:Partial<TurmiteNiches>,activate=false)=>setSettings(old=>({
  ...old,turmiteNiches:{...(old.turmiteNiches??DEFAULT_TURMITE_NICHES),...patch},
  ...(activate?{
   turmiteEvolution:{...(old.turmiteEvolution??DEFAULT_TURMITE_EVOLUTION),enabled:true},
   turmiteLife:{...(old.turmiteLife??DEFAULT_TURMITE_LIFE),enabled:true,
    // A nursery without actual T9 reproduction is scientifically inert.
    // Selecting a nursery preset or enabling it explicitly restores bud
    // ONLY if breeding was off. Existing split reproduction is preserved.
    breeding:patch.nursery===true&&old.turmiteLife?.breeding==='off'?'bud':
     (old.turmiteLife?.breeding??DEFAULT_TURMITE_LIFE.breeding)},
   turmiteDnaFossils:{...(old.turmiteDnaFossils??DEFAULT_TURMITE_DNA_FOSSILS),enabled:true}
  }:{})
 }));
 const directions=agent?['N','E','S','W'] as const:[];
 const neighbors=directions.map((name,i)=>{
  // The visible compass always scores the REAL reflected destination.
  const p=nicheDirectionSite(agent!.x,agent!.y,i as 0|1|2|3,
   world.width,world.height,s.wrap);
  const f=siteNicheFitness(agent!,code,strength,p,effectiveNiche);
  return {name,p,...f};
 });
 return <div aria-label="T13 genuine genetic habitat and ecological niche laboratory">
  <div className="c3-header"><strong>🌱 T13 · GENETIC NICHES</strong>
   <span>EVOLUTIONARY ECOLOGY · HABITATS · SELECTION · REPRODUCTION</span></div>
  <p className="module-note">A gene fragment in the physical T12 lattice is now part of the ecosystem. Every ant compares that fragment to its own real genotype. Genetic compatibility can attract or repel the ant, feed or poison it, and guide where its living offspring are born. This directly changes the painted CA, actual movement, and survival—not a visual filter.</p>
  <label className="toggle"><input id="turmite-niche-enabled" type="checkbox"
   checked={n.enabled} onChange={e=>set({enabled:e.target.checked},e.target.checked)}/>
   ENABLE REAL GENETIC HABITAT FEEDBACK</label>
  <p className="neighborhood-note">When enabled, T13 also enables the existing T9 lifecycle, T10 genes and T12 environmental DNA. It does not reset your sketch. To grow a population rather than use a single ant, set more ant slots in T1 and fewer founders in T9 before intentionally creating a NEW world.</p>
  <label className="input-label" htmlFor="turmite-niche-policy">Environmental attraction rule</label>
  <select id="turmite-niche-policy" value={n.policy}
   onChange={e=>set({policy:e.target.value as TurmiteNiches['policy']})}>
   <option value="kin">KIN SEEKING · TOWARD MATCHING DNA</option>
   <option value="novelty">NOVELTY HUNTING · TOWARD DIFFERENT DNA</option>
   <option value="avoid-foreign">IMMUNE AVOIDANCE · AWAY FROM DIFFERENT DNA</option>
  </select>
  {([
   ['steering','Real DNA steering strength',0,8],
   ['tolerance','Max allele mismatch counted as family',0,3],
   ['threshold','Minimum old fragment concentration',1,255],
   ['nutrient','Energy fed by compatible DNA',0,32],
   ['hazard','Energy lost near incompatible DNA',0,32]
  ] as const).map(([key,label,min,max])=><div key={key}>
   <label className="input-label" htmlFor={'turmite-niche-'+key}>{label}<em>{n[key]}</em></label>
   <input id={'turmite-niche-'+key} type="range" min={min} max={max} step="1"
    value={n[key]} onChange={e=>set({[key]:Number(e.target.value)})}/>
  </div>)}
  <label className="toggle"><input id="turmite-niche-nursery" type="checkbox"
   checked={n.nursery} onChange={e=>set({nursery:e.target.checked},e.target.checked)}/>
   NICHE NURSERIES · PLACE NEW BABIES IN COMPATIBLE NEIGHBORING CELLS</label>
  <div className="c3-presets">
   <button id="turmite-niche-garden" type="button" onClick={()=>set({
    enabled:true,policy:'kin',tolerance:0,threshold:24,
    steering:8,nutrient:24,hazard:4,nursery:true},true)}>🌿 GENETIC GARDEN</button>
   <button id="turmite-niche-invasion" type="button" onClick={()=>set({
    enabled:true,policy:'novelty',tolerance:0,threshold:20,
    steering:8,nutrient:16,hazard:12,nursery:false},true)}>🦠 INVASIVE BLOODLINES</button>
   <button id="turmite-niche-immune" type="button" onClick={()=>set({
    enabled:true,policy:'avoid-foreign',tolerance:1,threshold:32,
    steering:8,nutrient:8,hazard:32,nursery:true},true)}>🛡️ IMMUNE FRONTIERS</button>
   <button id="turmite-niche-cradle" type="button" onClick={()=>set({
    enabled:true,policy:'kin',tolerance:2,threshold:16,
    steering:2,nutrient:32,hazard:0,nursery:true},true)}>🥚 FERTILE CRADLES</button>
   <button id="turmite-niche-off" type="button" onClick={()=>set({enabled:false})}>
    ↺ BYPASS NICHE PHYSICS · PRESERVE ALL GENOMES AND DNA</button>
  </div>
  <div className="c3-readouts" id="turmite-niche-inspector">
   <div><b id="turmite-niche-compat">{!site||!site.code?'—':site.matching?'MATCH':'DIFFERENT'}</b><span>ANT #{selectedAgent+1} · LOCAL DNA</span></div>
   <div><b id="turmite-niche-energy">{energyActive?(localGain>0?'+':'')+localGain:'—'}</b><span>{energyActive?'TRUE ENERGY / STEP':'ENERGY INACTIVE (T9/T10 OFF)'}</span></div>
   <div><b id="turmite-niche-strength">{site?.strength??0}</b><span>OLD DNA STRENGTH</span></div>
  </div>
  <p className="fineprint" id="turmite-niche-fragment">At ant #{selectedAgent+1}: {currentFragment?
   currentFragment.locus.toUpperCase()+' = '+currentFragment.allele:'No DNA fragment present'}.
   {site&&site.code&&(!n.enabled||site.strength<n.threshold)?' This fragment is genetically '+
    (site.matching?'compatible':'different')+' but ecological effects are inactive at this strength.':''}
   Steering reads the four neighboring OLD sites, while energy uses the ant's current OLD site. Genetics affect reproduction via survival and nursery placement.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:4}}
   id="turmite-niche-compass">
   {neighbors.map((d,i)=><div key={i} data-niche-direction={d.name}
    style={{textAlign:'center',padding:6,borderRadius:4,
     background:d.fitness>0?'rgba(100,240,170,.15)':
      d.fitness<0?'rgba(250,80,130,.14)':'rgba(255,255,255,.04)'}}>
    <strong>{d.name}</strong><small style={{display:'block'}}>score {d.fitness}</small>
    <small style={{display:'block'}}>DNA {d.strength}</small>
   </div>)}
  </div>
  <p className="neighborhood-note">T13 reads T12 fossils only; there is no invented habitat array. Same old-field sampling means batched animation, real GIF/video recording and saved recipes reproduce the very same ecological growth. Existing T1–T12 behavior is unchanged when T13 is off.</p>
 </div>;
}
