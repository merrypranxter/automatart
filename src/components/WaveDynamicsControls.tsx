import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,World} from '../engine/types';
interface Props{
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 world:World;
 neighborMax:number;
}
const MODES=[
 {value:'off',label:'PURE CA'},
 {value:'clock',label:'PACEMAKER'},
 {value:'sparks',label:'SEEDED SPARKS'}
] as const;
const SOURCES=[
 {value:'center',label:'ONE HEART'},
 {value:'quad',label:'FOUR HEARTS'},
 {value:'ring',label:'RING OF TWELVE'}
] as const;
export default function WaveDynamicsControls({settings:s,setSettings,world,neighborMax}:Props){
 const set=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
  setSettings(v=>({...v,[key]:value}));
 const generations=s.engine==='generations';
 const active=world.engine===s.engine;
 const injected=active?world.waveStimulusCount:undefined;
 const changed=active?world.stepChanged:undefined;
 const pixels=active?world.cells.length:0;
 const modes=[
  {name:'PURE / UNFORCED',mode:'off',source:'center',period:12,rate:0},
  {name:'SINGLE HEARTBEAT',mode:'clock',source:'center',period:9,rate:0},
  {name:'FOUR PACEMAKERS',mode:'clock',source:'quad',period:7,rate:0},
  {name:'RING OSCILLATOR',mode:'clock',source:'ring',period:12,rate:0},
  {name:'SPARSE NOISE',mode:'sparks',source:'center',period:12,rate:.0005},
  {name:'SEED STORM',mode:'sparks',source:'center',period:12,rate:.005}
 ] as const;
 return <section className="wave-dynamics-lab" aria-label="Mathematical wave and pacemaker dynamics">
  <div className="wave-dynamics-heading">
   <strong>〰 A2 · {generations?'AFTERLIFE':'EXCITABLE FLESH'} DYNAMICS</strong>
   <span>REAL CELL-STATE FORCING</span>
  </div>
  <p className="module-note">
   {generations?
    'Alive → refractory → rest. Your B/S/C birth and survival counts still determine natural evolution. Only genuinely resting cells can receive new external life.':
    'Excited cells advance through real refractory stages. The neighborhood threshold still controls wave propagation; external sources can excite resting cells when no local neighbor would.'}
  </p>
  <div className="wave-dynamics-meters">
   <div><b>{changed===undefined?'—':(100*changed/Math.max(1,pixels)).toFixed(2)+'%'}</b><span>CELLS CHANGED LAST STEP</span></div>
   <div><b>{injected===undefined?'—':injected}</b><span>EXTERNALLY IGNITED LAST STEP</span></div>
  </div>
  <p className="neighborhood-note">The {generations?'birth/survival':'excitation'} controls above and your {neighborMax}-neighbor graph still matter. External sources never overwrite a live or refractory cell and never merely alter its color.</p>
  <label className="input-label">Mathematical evolution variant</label>
  <div className="wave-modes" role="group" aria-label="Wave excitation mode">
   {MODES.map(v=><button key={v.value} type="button"
    id={'wave-mode-'+v.value} className={(s.waveStimulus??'off')===v.value?'selected':''}
    aria-pressed={(s.waveStimulus??'off')===v.value}
    onClick={()=>set('waveStimulus',v.value)}>{v.label}</button>)}
  </div>
  {(s.waveStimulus??'off')==='clock'&&<>
   <label className="input-label" htmlFor="wave-period">Pulse interval <em>every {s.waveClockPeriod} {s.waveClockPeriod===1?'generation':'generations'}</em></label>
   <input id="wave-period" type="range" min="1" max="120" step="1"
    value={s.waveClockPeriod} onChange={e=>set('waveClockPeriod',Number(e.target.value))}/>
   <span className="input-label">Actual injection sites</span>
   <div className="wave-sources" role="group" aria-label="Periodic wave sources">
    {SOURCES.map(src=><button key={src.value} type="button"
     id={'wave-source-'+src.value} className={s.waveClockSource===src.value?'selected':''}
     aria-pressed={s.waveClockSource===src.value} onClick={()=>set('waveClockSource',src.value)}>
     {src.label}</button>)}
   </div>
   <p className="neighborhood-note">Clock events happen on exact generation boundaries and only ignite available resting sites. Four hearts and ring are separate source locations; they are not painted graphics.</p>
  </>}
  {(s.waveStimulus??'off')==='sparks'&&<>
   <label className="input-label" htmlFor="wave-spark-rate">Seeded ignition probability <em>{Math.round(s.waveSparkRate*10000)} / 10,000 resting cells per tick</em></label>
   <input id="wave-spark-rate" type="range" min="0" max="100" step="1"
    value={Math.round(s.waveSparkRate*10000)}
    onChange={e=>set('waveSparkRate',Number(e.target.value)/10000)}/>
   <p className="neighborhood-note">Each resting cell may ignite independently. Every decision is reproducible from the universe seed, cell position and generation; this is not visual glitter.</p>
  </>}
  <span className="input-label">Live wave behaviors · preserve current world</span>
  <div className="wave-presets">
   {modes.map(p=><button type="button" key={p.name}
    id={'wave-preset-'+p.name.toLowerCase().replaceAll(/[^a-z]+/g,'-')}
    onClick={()=>setSettings(old=>({...old,waveStimulus:p.mode,
      waveClockSource:p.source,waveClockPeriod:p.period,waveSparkRate:p.rate}))}>
    {p.name}</button>)}
  </div>
  <p className="neighborhood-note"><strong>PURE / UNFORCED</strong> is the exact original mathematics. Pacemakers and sparks are opt-in driven variants. Changing a stimulus or threshold is live; changing recovery-state count resets because the meaning of existing cell states changes. Seed, source parameters and all real cells are saved in recipe JSON.</p>
 </section>;
}
