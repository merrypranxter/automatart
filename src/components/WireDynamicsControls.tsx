import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {WIRE_TEMPLATES,type WireStampOptions} from '../engine/wire-circuit-lab';
import {wireCircuitCensus} from '../engine/wire-electricity';
type Props={
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;
 stamp:WireStampOptions;
 setStamp:Dispatch<SetStateAction<WireStampOptions>>;
 stampArmed:boolean;
 setStampArmed:Dispatch<SetStateAction<boolean>>;
 onCenter:()=>void;
};
const MODES=[
 {id:'canonical',label:'CANONICAL · 1–2',min:1,max:2},
 {id:'sparse',label:'ONE HEAD ONLY',min:1,max:1},
 {id:'paired',label:'PAIR ONLY',min:2,max:2},
 {id:'surge',label:'SURGE · 1–3',min:1,max:3}
] as const;
export default function WireDynamicsControls({settings:s,setSettings,world,stamp,setStamp,stampArmed,setStampArmed,onCenter}:Props){
 const forecast=world.engine==='wireworld'?wireCircuitCensus(world,s):null;
 const set=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
  setSettings(old=>({...old,[key]:value}));
 const edit=(part:Partial<WireStampOptions>)=>setStamp(old=>({...old,...part}));
 const status=forecast?world.waveStimulusCount??0:0;
 return <section className="wave-dynamics-lab wire-dynamics-lab" aria-label="Wireworld B3 circuit mathematics studio">
  <div className="wave-dynamics-heading"><strong>⚡ B3 · CIRCUIT FORGE</strong><span>TRUE FOUR-STATE CIRCUITRY</span></div>
  <p className="module-note">Conductor paths below are written into the actual cellular automaton, not drawn over it. Four states: VOID → (no birth); CONDUCTOR → HEAD on qualifying neighboring heads; HEAD → TAIL → CONDUCTOR. The default one-to-two-head rule is original Wireworld.</p>
  <div className="wave-dynamics-meters">
   <div><b id="wire-forecast">{forecast?forecast.naturalBirths:'—'}</b><span>CONDUCTORS EXPECTED TO IGNITE NEXT TICK · SAMPLED</span></div>
   <div><b id="wire-head-count">{forecast?forecast.heads:'—'}</b><span>ACTIVE ELECTRON HEADS · SAMPLED</span></div>
   <div><b id="wire-drive-count">{status}</b><span>TRUE ELECTRODE IGNITIONS LAST STEP</span></div>
  </div>
  <p className="neighborhood-note">{forecast?forecast.checked+' / '+forecast.total+' sites checked · '+forecast.conductors+' conductor sites in sample.':'Waiting for Wireworld universe.'} Counts are measured in canonical cells; larger grids are evenly sampled, not extrapolated.</p>
  <label className="input-label" htmlFor="wire-template">CONDUCTOR TEMPLATE</label>
  <select id="wire-template" value={stamp.template} onChange={e=>edit({template:e.target.value as WireStampOptions['template']})}>
   {WIRE_TEMPLATES.map(template=><option key={template.id} value={template.id}>{template.label}</option>)}
  </select>
  <label className="input-label" htmlFor="wire-template-radius">Circuit geometry radius <em>{stamp.radius} cells</em></label>
  <input id="wire-template-radius" type="range" min="4" max="18" step="1" value={stamp.radius}
   onChange={e=>edit({radius:Number(e.target.value)})}/>
  <label className="input-label" htmlFor="wire-template-rotation">Rotate geometry</label>
  <select id="wire-template-rotation" value={stamp.rotation}
   onChange={e=>edit({rotation:Number(e.target.value) as 0|1|2|3})}>
   {[0,1,2,3].map(k=><option value={k} key={k}>{90*k}°</option>)}
  </select>
  <div className="wave-modes">
   <label className="toggle"><input id="wire-stamp-excite" type="checkbox" checked={stamp.excite} onChange={e=>edit({excite:e.target.checked})}/><span>Seed genuine HEAD + TAIL pulse</span></label>
   <label className="toggle"><input id="wire-stamp-clear" type="checkbox" checked={stamp.clear} onChange={e=>edit({clear:e.target.checked})}/><span>Clear local interference before placement</span></label>
  </div>
  <div className="wave-presets" role="group" aria-label="Circuit placement">
   <button type="button" id="wire-stamp-center" onClick={onCenter}>⊕ PLACE AT CENTER</button>
   <button type="button" id="wire-stamp-arm" className={stampArmed?'selected':''}
    aria-pressed={stampArmed} onClick={()=>setStampArmed(v=>!v)}>
    {stampArmed?'◉ TAP STAGE TO PLACE':'✥ PLACE WHERE I TAP'}</button>
  </div>
  <p className="neighborhood-note">Arming stage placement shows the exact conductor footprint before you tap. Each tap places ONE circuit and returns to normal paint. Placement pauses the running automaton without resetting the generation; save a recipe to preserve the actual conductor artwork. The option to clear a local footprint deliberately replaces any existing cells inside that region, not the entire world.</p>
  <strong className="input-label">REAL ELECTRON EXCITATION LAW · LIVE</strong>
  <div className="wave-presets" role="group" aria-label="Wireworld excitation rule presets">
   {MODES.map(mode=><button type="button" id={'wire-rule-'+mode.id} key={mode.id}
    aria-pressed={s.wireExciteMin===mode.min&&s.wireExciteMax===mode.max}
    className={s.wireExciteMin===mode.min&&s.wireExciteMax===mode.max?'selected':''}
    onClick={()=>setSettings(old=>({...old,wireExciteMin:mode.min,wireExciteMax:mode.max}))}>
    {mode.label}</button>)}
  </div>
  <label className="input-label" htmlFor="wire-excite-min">Head count minimum <em>{s.wireExciteMin}</em></label>
  <input id="wire-excite-min" type="range" min="1" max={s.wireExciteMax} value={s.wireExciteMin}
   onChange={e=>set('wireExciteMin',Number(e.target.value))}/>
  <label className="input-label" htmlFor="wire-excite-max">Head count maximum <em>{s.wireExciteMax}</em></label>
  <input id="wire-excite-max" type="range" min={s.wireExciteMin} max="8" value={s.wireExciteMax}
   onChange={e=>set('wireExciteMax',Number(e.target.value))}/>
  <p className="neighborhood-note">Only the 1–2 range is classical Wireworld. Other ranges are explicitly generalized four-state variants; heads always become tails, and tails always return to conductor. Changing the rule never restarts the world.</p>
  <strong className="input-label">OPTIONAL ELECTRODES · REAL-STATE DRIVING</strong>
  <div className="wave-modes" role="group" aria-label="Wireworld signal source mode">
   {(['off','clock','sparks'] as const).map(mode=><button type="button" id={'wire-drive-'+mode}
    key={mode} aria-pressed={s.wireDrive===mode} className={s.wireDrive===mode?'selected':''}
    onClick={()=>set('wireDrive',mode)}>
    {mode==='off'?'PURE / OFF':mode==='clock'?'CLOCKED ELECTRODES':'SEEDED SPARKS'}</button>)}
  </div>
  {s.wireDrive==='clock'&&<>
   <label className="input-label" htmlFor="wire-clock-period">Drive pulse every <em>{s.wirePeriod} generations</em></label>
   <input id="wire-clock-period" type="range" min="1" max="120" step="1"
    value={s.wirePeriod} onChange={e=>set('wirePeriod',Number(e.target.value))}/>
   <div className="wave-modes" role="group" aria-label="Electrode source arrangement">
    {(['center','quad'] as const).map(source=><button type="button" key={source}
     id={'wire-source-'+source} aria-pressed={s.wireSource===source}
     className={s.wireSource===source?'selected':''}
     onClick={()=>set('wireSource',source)}>{source==='center'?'CENTER':'FOUR QUADRANTS'}</button>)}
   </div>
   <p className="neighborhood-note">The electrode ignites the nearest available CONDUCTOR within 18 cells of each source. No conductor nearby? No signal. It never creates wire paths or overrides an existing head/tail.</p>
  </>}
  {s.wireDrive==='sparks'&&<>
   <label className="input-label" htmlFor="wire-spark-rate">Conductor spark probability <em>{(s.wireSparkRate*100).toFixed(2)}% per generation</em></label>
   <input id="wire-spark-rate" type="range" min="0" max="100" step="1"
    value={Math.round(s.wireSparkRate*10000)}
    onChange={e=>set('wireSparkRate',Number(e.target.value)/10000)}/>
   <p className="neighborhood-note">Actual conductor-only seeded ignition. All sparks are determined by seed, generation and cell address, so saved recipes and GIF/video progression reproduce them.</p>
  </>}
  <p className="neighborhood-note">A CROSS is a connected junction, not an isolated crossover, and a ring is a conductor loop—not a guaranteed perpetual oscillator. These are genuine Wireworld structures whose behavior depends on their neighbors and excitation.</p>
 </section>;
}
