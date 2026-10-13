import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
import {estimateInitialChase} from '../engine/cyclic-dynamics';

interface Props {
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;
 neighborMax:number;
}
const controlPresets=[
 {name:'CLASSIC · PURE CA',threshold:1,reach:1,drive:0,
   hint:'One specific next color must be present. No spontaneous changes.'},
 {name:'WAKE THE DEAD',threshold:1,reach:3,drive:.001,
   hint:'Three forward phases can pull a cell ahead, plus sparse true-state sparks.'},
 {name:'MUTATING STORM',threshold:2,reach:4,drive:.004,
   hint:'Multiple matching neighbors for a chase; seeded spontaneous advances keep it moving.'},
 {name:'SLOW PLAGUE',threshold:2,reach:2,drive:.0012,
   hint:'Narrower pursuit and occasional cells that advance independently.'}
] as const;
export default function CyclicDynamicsControls({settings:s,setSettings,world,neighborMax}:Props){
 const reach=Math.max(1,Math.min(s.cyclicStates-1,s.cyclicReach??1));
 const drive=s.cyclicDrive??0;
 const events=world.engine==='cyclic'?
  world.events.reduce((n,v)=>n+(v===3?1:0),0):0;
 const activity=world.engine==='cyclic'&&world.cells.length>0?
  100*events/world.cells.length:0;
 const predicted=estimateInitialChase(s.cyclicStates,reach,s.cyclicThreshold,
  neighborMax,s.density,drive)*100;
 const change=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
  setSettings(prev=>({...prev,[key]:value}));
 return <section className="cyclic-dynamics-lab" aria-label="Cyclic movement tuning">
  <div className="cyclic-dynamics-heading">
   <strong>🌀 CYCLIC · DYNAMICS LAB</strong>
   <span>REAL CELL TRANSITIONS</span>
  </div>
  <p className="module-note">Every cell is an integer state on a color cycle. It advances exactly one step if enough neighbors are in phases ahead. These settings change the next generation, not just the palette.</p>
  <div className="cyclic-dynamics-meters">
   <div><b>{activity.toFixed(activity<1?2:1)}%</b><span>CELLS CHANGED LAST STEP</span></div>
   <div><b>{s.pattern==='noise'?predicted.toFixed(1)+'%':'—'}</b><span>EST. INITIAL NOISE ACTIVITY</span></div>
  </div>
  {world.engine==='cyclic'&&world.generation>0&&activity===0&&
   <p className="cyclic-dynamics-status" role="status">
    No cells changed in the last step. {drive>0?
    'Seeded sparks can still restart movement later.':
    'This may be a fixed point: lower the chase threshold, widen the chase field, or add sparks.'}
   </p>}
  {s.pattern==='noise'&&predicted<1&&
   <p className="cyclic-dynamics-status">Only {predicted.toFixed(2)}% of cells are predicted to advance on the first NOISE-seeded tick. This is why large thresholds can look dead.</p>}
  <label className="input-label" htmlFor="states">Color species <em>{s.cyclicStates} · restarts the world</em></label>
  <input id="states" type="range" min="3" max="24" step="1" value={s.cyclicStates}
   onChange={e=>setSettings(prev=>{
    const states=Number(e.target.value);
    return {...prev,cyclicStates:states,cyclicReach:Math.min(prev.cyclicReach??1,states-1)};
   })}/>
  <label className="input-label" htmlFor="threshold">Chase threshold <em>{s.cyclicThreshold} / {neighborMax} neighbors</em></label>
  <input id="threshold" type="range" min="1" max={neighborMax}
    step="1" value={Math.min(s.cyclicThreshold,neighborMax)}
    onChange={e=>change('cyclicThreshold',Number(e.target.value))}/>
  <label className="input-label" htmlFor="cyclic-reach">Chase field width <em>{reach} upcoming {reach===1?'phase':'phases'}</em></label>
  <input id="cyclic-reach" type="range" min="1" max={Math.min(6,s.cyclicStates-1)}
    step="1" value={Math.min(6,reach)} onChange={e=>change('cyclicReach',Number(e.target.value))}/>
  <p className="neighborhood-note">Wider pursuit means more real neighbor states qualify to trigger a one-step chase. A small threshold and a wide field make motion easier; a high threshold makes it rarer.</p>
  <label className="input-label" htmlFor="cyclic-drive">Spontaneous excitation <em>{Math.round(drive*10000)} / 10,000 cells per tick</em></label>
  <input id="cyclic-drive" type="range" min="0" max="100" step="1"
    value={Math.round(drive*10000)}
    onChange={e=>change('cyclicDrive',Number(e.target.value)/10000)}/>
  <p className="neighborhood-note">Zero is pure deterministic cyclic CA. Higher values introduce a genuine <em>seeded stochastic CA rule</em>: some cells independently advance one state. Every advance is reproducible from your seed, generation and cell position—this is not visual jitter.</p>
  <span className="input-label">Live behavior presets · no universe reset</span>
  <div className="cyclic-dynamics-presets">
   {controlPresets.map(p=><button type="button" key={p.name}
     title={p.hint} onClick={()=>setSettings(v=>({...v,
      cyclicThreshold:Math.min(p.threshold,neighborMax),
      cyclicReach:Math.min(p.reach,v.cyclicStates-1),cyclicDrive:p.drive}))}>
    {p.name}</button>)}
  </div>
  <p className="neighborhood-note">The estimate describes only the initial independent NOISE seed; it is not a promise of motion forever. You can also change the population density in WORLD and the actual neighborhood shape below. State count and seed density changes restart; pursuit and spontaneous excitation change the existing world live.</p>
 </section>;
}
