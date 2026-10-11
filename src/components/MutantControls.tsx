import type { Dispatch, SetStateAction } from 'react';
import type { SimSettings } from '../engine/types';

interface Props {
  settings: SimSettings;
  setSettings: Dispatch<SetStateAction<SimSettings>>;
  paintSpecies: number;
  setPaintSpecies: Dispatch<SetStateAction<number>>;
}
function Range({id,label,value,min,max,onChange,warning}:{id:string;label:string;value:number;min:number;max:number;onChange:(n:number)=>void;warning?:string}){
  return <div className="mutant-range">
    <label className="input-label" htmlFor={id}>{label} <em>{value}</em></label>
    <input id={id} type="range" min={min} max={max} step="1" value={Math.min(max,Math.max(min,value))}
      onChange={e=>onChange(Number(e.target.value))}/>
    {warning&&<span className="range-hint">{warning}</span>}
  </div>;
}
export default function MutantControls({settings:s,setSettings,paintSpecies,setPaintSpecies}:Props){
  const setNumber=(key:keyof SimSettings,n:number)=>setSettings(prev=>({...prev,[key]:n}));
  const toggle=(key:'genBirth'|'genSurvive',n:number)=>
    setSettings(prev=>({...prev,[key]:prev[key].includes(n)?
      prev[key].filter(v=>v!==n):[...prev[key],n].sort((a,b)=>a-b)}));
  if(s.engine==='generations')return <div className="mutant-controls">
    <p className="module-note">PURE CA · AFTERLIFE B/S/C — State 1 is alive. Death becomes a visible refractory sequence (2…C−1), then returns to empty. Only living neighbors count toward birth and survival.</p>
    <Range id="gen-states" label="TOTAL STATES / REFRACTORY STAGES" value={s.genStates} min={3} max={24}
      onChange={n=>setNumber('genStates',n)}/>
    {(['genBirth','genSurvive'] as const).map(key=><div className="custom-rule-editor" key={key}>
      <b>{key==='genBirth'?'BIRTH B':'SURVIVAL S'}{s[key].join('')}</b>
      <div className="rule-bits">{Array.from({length:9},(_,i)=><button type="button" key={i}
        aria-pressed={s[key].includes(i)} className={s[key].includes(i)?'active':''}
        onClick={()=>toggle(key,i)}>{i}</button>)}</div>
    </div>)}
  </div>;
  if(s.engine==='excitable')return <div className="mutant-controls">
    <p className="module-note">PURE CA · EXCITABLE FLESH — Resting cells become excited when enough neighbors are firing. Excited cells march through refractory stages; only state 1 can trigger new excitation.</p>
    <Range id="excite-states" label="EXCITATION + RECOVERY STATES" value={s.exciteStates} min={3} max={24}
      onChange={n=>setNumber('exciteStates',n)}/>
    <Range id="excite-threshold" label="EXCITATION THRESHOLD" value={s.exciteThreshold} min={1} max={s.neighborShape==='vonNeumann'?4:8}
      onChange={n=>setNumber('exciteThreshold',n)}/>
  </div>;
  if(s.engine==='larger'){
    const maxNeighbors=(2*s.largeRadius+1)**2-1;
    return <div className="mutant-controls">
      <p className="module-note">PURE CA · LARGER THAN LIFE-INSPIRED — Binary states, a square neighborhood of adjustable radius, and integer birth/survival intervals. The center cell is excluded from neighbor counts.</p>
      <Range id="large-radius" label="NEIGHBORHOOD RADIUS" value={s.largeRadius} min={1} max={5}
        warning={maxNeighbors+' possible neighbors. Radius 4–5 can be slow on phones.'}
        onChange={radius=>setSettings(prev=>{
          const cap=(2*radius+1)**2-1;
          return {...prev,largeRadius:radius,
            largeBirthMin:Math.min(prev.largeBirthMin,cap),
            largeBirthMax:Math.min(prev.largeBirthMax,cap),
            largeSurviveMin:Math.min(prev.largeSurviveMin,cap),
            largeSurviveMax:Math.min(prev.largeSurviveMax,cap)};
        })}/>
      {(['largeBirthMin','largeBirthMax','largeSurviveMin','largeSurviveMax'] as const).map(key=>{
        const isBirth=key.startsWith('largeBirth');
        const minKey=isBirth?'largeBirthMin':'largeSurviveMin';
        const maxKey=isBirth?'largeBirthMax':'largeSurviveMax';
        const min=key.endsWith('Max')?s[minKey]:0;
        const max=key.endsWith('Min')?s[maxKey]:maxNeighbors;
        return <Range key={key} id={key} label={key.replace('large','').replace(/([A-Z])/g,' $1').toUpperCase()}
          value={s[key]} min={min} max={max} onChange={n=>setNumber(key,n)}/>;
      })}
    </div>;
  }
  if(s.engine==='species')return <div className="mutant-controls">
    <p className="module-note">PURE LOCAL CA · SPECIES WAR — Automatart's own deterministic competition rule. Empty cells adopt the largest qualifying nearby species; occupied cells hold if defended or get taken by locally stronger invaders. Equal counts favor lower species ID.</p>
    <Range id="species-count" label="COMPETING SPECIES" value={s.speciesCount} min={2} max={8}
      onChange={n=>{setNumber('speciesCount',n);setPaintSpecies(x=>Math.min(n,x));}}/>
    <Range id="species-birth" label="INVASION / BIRTH THRESHOLD" value={s.speciesBirth} min={1}
      max={s.neighborShape==='vonNeumann'?4:8} onChange={n=>setNumber('speciesBirth',n)}/>
    <Range id="species-survive" label="ALLIES TO SURVIVE" value={s.speciesSurvive} min={0} max={8}
      onChange={n=>setNumber('speciesSurvive',n)}/>
    <Range id="species-bias" label="DEFENSIVE ADVANTAGE" value={s.speciesAttackBias} min={0} max={8}
      onChange={n=>setNumber('speciesAttackBias',n)}/>
    <label className="input-label" htmlFor="species-brush">PAINT YOUR CHOSEN SPECIES</label>
    <select id="species-brush" value={Math.min(paintSpecies,s.speciesCount)}
      onChange={e=>setPaintSpecies(Number(e.target.value))}>
      {Array.from({length:s.speciesCount},(_,i)=><option key={i+1} value={i+1}>SPECIES {i+1}</option>)}
    </select>
  </div>;
  return null;
}
