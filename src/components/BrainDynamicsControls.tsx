import type {Dispatch,SetStateAction} from 'react';
import type {NeighborShape,SimSettings,World} from '../engine/types';
import {brainBirthForecast} from '../engine/brain-dynamics';
import {normalizeActiveVotes} from '../engine/neighborhood';
interface Props{
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;
 neighborMax:number;
}
const SHAPES=[
 {id:'vonNeumann',label:'4 · CARDINAL',note:'Sparse graph; exact-two births often extinguish.'},
 {id:'moore',label:'8 · CLASSIC',note:'Eight Moore neighbors, original Brian topology.'},
 {id:'diamond2',label:'12 · DIAMOND',note:'Two steps in cardinal distance, increases voter access.'},
 {id:'square2',label:'24 · WIDE FIELD',note:'Five-by-five square minus center; often sustains activity.'}
] as const;
const SOURCES=[
 {id:'center',label:'ONE ELECTRODE'},
 {id:'quad',label:'FOUR ELECTRODES'},
 {id:'ring',label:'RING OF TWELVE'}
] as const;
const BEHAVIORS=[
 {id:'classic',name:'CLASSIC BRAIN',shape:'moore',count:2,match:'exact',drive:'off',source:'center',period:12,rate:0,
   hint:'The untouched, unforced original Brain rule.'},
 {id:'cardinal',name:'CARDINAL FLASH',shape:'vonNeumann',count:1,match:'exact',drive:'clock',source:'quad',period:9,rate:0,
   hint:'Explicit one-vote Brain variant with four periodic 2×2 electrodes.'},
 {id:'electric',name:'ELECTRIC BLOOM',shape:'moore',count:2,match:'exact',drive:'clock',source:'quad',period:7,rate:0,
   hint:'Original two-vote rule, opt-in real-state pulses from four electrode clusters.'},
 {id:'filament',name:'FILAMENT WEB',shape:'diamond2',count:2,match:'exact',drive:'sparks',source:'center',period:11,rate:.001,
   hint:'Twelve voting neighbors and grouped seeded firing bursts.'},
 {id:'storm',name:'BRAIN STORM',shape:'square2',count:3,match:'atLeast',drive:'sparks',source:'center',period:12,rate:.004,
   hint:'Wide neighborhood and generalized threshold with stronger grouped sparks.'}
] as const;

export default function BrainDynamicsControls({settings:s,setSettings,world,neighborMax}:Props){
 const forecast=world.engine==='brians'?brainBirthForecast(world,s):null;
 const changed=forecast&&typeof world.stepChanged==='number'?
   (100*world.stepChanged/Math.max(1,world.cells.length)).toFixed(2)+'%':'—';
 const projected=forecast?(100*forecast.naturalBirths/Math.max(1,forecast.examined)).toFixed(2)+'%':'—';
 const injected=forecast?world.waveStimulusCount??0:0;
 const set=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
   setSettings(old=>({...old,[key]:value}));
 const changeGraph=(shape:NeighborShape)=>setSettings(old=>
   normalizeActiveVotes({...old,neighborShape:shape}));
 return <section className="wave-dynamics-lab brain-dynamics-lab"
   aria-label="B1 Brian's Brain mathematical electricity laboratory">
  <div className="wave-dynamics-heading">
   <strong>⚡ B1 · BRIAN'S BRAIN ELECTRIC LAB</strong>
   <span>REAL FIRING / REAL REFRACTORY CELLS</span>
  </div>
  <p className="module-note">Three genuine cellular states: REST (0) → FIRING (1) → REFRACTORY (2) → REST. Only FIRING neighbors vote. The original rule needs exactly TWO neighbors. Change your voters, change the birth test, or drive resting cells with real grouped electrical impulses.</p>
  <div className="wave-dynamics-meters">
   <div><b id="brain-activity">{changed}</b><span>CELLS CHANGED LAST STEP</span></div>
   <div><b id="brain-forecast">{projected}</b><span>NATURAL BIRTHS NEXT STEP · SAMPLED</span></div>
   <div><b id="brain-external">{injected}</b><span>EXTERNAL FIRES LAST STEP</span></div>
  </div>
  {forecast&&<p className="neighborhood-note">{forecast.examined} of {forecast.total} real sites inspected · {forecast.firing} firing and {forecast.resting} resting in sample. Birth prediction uses the exact current rule and graph, without counting any artificial stimulation.</p>}
  {forecast&&world.generation>0&&forecast.naturalBirths===0&&<p className="cyclic-dynamics-status" role="status">
    No natural births are predicted among sampled sites. A pure Brain may go quiet; try 24 neighbors, a one-neighbor variant, or opt-in electrodes. Once the whole grid is resting, only a true external ignition or painting can revive it.
  </p>}
  <label className="input-label">TRUE VOTING NEIGHBORHOOD · LIVE</label>
  {s.lattice==='square'?<div className="wave-sources" role="group" aria-label="Brian neighbor geometry">
   {SHAPES.map(v=><button key={v.id} type="button" id={'brain-neighbors-'+v.id}
     title={v.note} aria-pressed={s.neighborShape===v.id}
     className={s.neighborShape===v.id?'selected':''}
     onClick={()=>changeGraph(v.id)}>{v.label}</button>)}
  </div>:<p className="neighborhood-note">The {s.lattice.toUpperCase()} lattice has its own genuine neighbor graph ({neighborMax} neighbors). Switch to square in WORLD if you want 4/8/12/24, which restarts because the lattice physically changes.</p>}
  {s.lattice==='square'&&s.neighborShape==='custom'&&
    <p className="neighborhood-note">CUSTOM stencil remains active: {neighborMax} true voters. Edit it in NEIGHBORHOOD ANARCHY below.</p>}
  <label className="input-label" htmlFor="brain-birth-count">Firing neighbors to ignite a resting cell <em>{s.brainBirthCount??2} of {neighborMax}</em></label>
  <input id="brain-birth-count" type="range" min="1" max={Math.max(1,neighborMax)}
    value={Math.min(neighborMax,s.brainBirthCount??2)}
    onChange={e=>set('brainBirthCount',Number(e.target.value))}/>
  <div className="wave-modes" role="group" aria-label="Brian's Brain birth comparator">
   <button type="button" id="brain-match-exact" aria-pressed={(s.brainBirthMatch??'exact')==='exact'}
    className={(s.brainBirthMatch??'exact')==='exact'?'selected':''}
    onClick={()=>set('brainBirthMatch','exact')}>EXACT COUNT</button>
   <button type="button" id="brain-match-at-least" aria-pressed={s.brainBirthMatch==='atLeast'}
    className={s.brainBirthMatch==='atLeast'?'selected':''}
    onClick={()=>set('brainBirthMatch','atLeast')}>AT LEAST</button>
  </div>
  <p className="neighborhood-note">Exact TWO is canonical Brian's Brain. Any other threshold or AT LEAST creates an explicitly generalized Brain variant; the same three-state recovery physics is preserved. These changes affect the next simulation tick without clearing your canvas.</p>
  <label className="input-label">OPTIONAL DRIVEN BRAIN · REAL-STATE STIMULUS</label>
  <div className="wave-modes" role="group" aria-label="Brian's Brain electrical source mode">
   {(['off','clock','sparks'] as const).map(mode=><button type="button" key={mode}
    id={'brain-stimulus-'+mode} aria-pressed={(s.brainStimulus??'off')===mode}
    className={(s.brainStimulus??'off')===mode?'selected':''}
    onClick={()=>set('brainStimulus',mode)}>
    {mode==='off'?'PURE / OFF':mode==='clock'?'ELECTRODES':'SEEDED BURSTS'}</button>)}
  </div>
  {s.brainStimulus==='clock'&&<>
   <label className="input-label" htmlFor="brain-clock-period">Electrode firing interval <em>{s.brainClockPeriod} generations</em></label>
   <input id="brain-clock-period" type="range" min="1" max="120" step="1"
    value={s.brainClockPeriod} onChange={e=>set('brainClockPeriod',Number(e.target.value))}/>
   <div className="wave-sources" role="group" aria-label="Brain electrode geometry">
    {SOURCES.map(v=><button key={v.id} type="button" id={'brain-source-'+v.id}
     aria-pressed={s.brainClockSource===v.id} className={s.brainClockSource===v.id?'selected':''}
     onClick={()=>set('brainClockSource',v.id)}>{v.label}</button>)}
   </div>
   <p className="neighborhood-note">Every electrode is a true 2×2 cluster of state-1 cells, so an isolated dot doesn't just blink uselessly. Only resting sites can fire, and propagation still follows the chosen birth rule. A pulse does not guarantee traveling waves.</p>
  </>}
  {s.brainStimulus==='sparks'&&<>
   <label className="input-label" htmlFor="brain-spark-rate">Grouped bursts <em>{Math.round(s.brainSparkRate*10000)} / 10,000 2×2 tiles per tick</em></label>
   <input id="brain-spark-rate" type="range" min="0" max="100" step="1"
    value={Math.round(s.brainSparkRate*10000)}
    onChange={e=>set('brainSparkRate',Number(e.target.value)/10000)}/>
   <p className="neighborhood-note">Random ignition is grouped in 2×2 tiles, deterministically keyed by the seed, generation, and tile. This creates correlated true-state impulses, not flickering paint.</p>
  </>}
  <label className="input-label">ONE-TOUCH LIVE BEHAVIORS</label>
  <div className="wave-presets" role="group" aria-label="Brain rule and stimulus presets">
   {BEHAVIORS.map(p=><button type="button" key={p.id}
    id={'brain-preset-'+p.id} title={p.hint} disabled={s.lattice!=='square'}
    onClick={()=>setSettings(old=>({...old,neighborShape:p.shape,
     brainBirthCount:p.count,brainBirthMatch:p.match,
     brainStimulus:p.drive,brainClockSource:p.source,
     brainClockPeriod:p.period,brainSparkRate:p.rate}))}>
    {p.name}</button>)}
  </div>
  <p className="neighborhood-note">Preset changes preserve this living canvas. Original pure rule: CLASSIC BRAIN. Electrodes, seeded bursts and generalized birth conditions are opt-in mathematical variants. GIF/video and JSON replay use the same real cell evolution. Starting density, seed, and physical lattice changes in WORLD restart the universe.</p>
 </section>;
}
