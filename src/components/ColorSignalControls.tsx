import type {Dispatch,SetStateAction} from 'react';
import type {Appearance,World} from '../engine/types';
import {NEW_COLOR_SIGNALS,isNewColorSignal,signalOptions,signalSample} from '../engine/color-signals';
type Props={appearance:Appearance;setAppearance:Dispatch<SetStateAction<Appearance>>;
  world:World;inspectedCell:[number,number]|null};
export default function ColorSignalControls({appearance:a,setAppearance,world,inspectedCell}:Props){
  if(!isNewColorSignal(a.colorBy))return null;
  const descriptor=NEW_COLOR_SIGNALS.find(s=>s.id===a.colorBy)!;
  const o=signalOptions(a);
  const set=(k:keyof Appearance,value:number)=>setAppearance(prev=>({...prev,[k]:value}));
  const slider=(id:string,label:string,key:keyof Appearance,value:number,min:number,max:number,step:number)=>(
    <label className="color-signal-slider" htmlFor={id}>
      <span>{label} <em>{value.toFixed(2)}</em></span>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e=>set(key,Number(e.target.value))}/>
    </label>
  );
  const sample=inspectedCell&&inspectedCell[0]<world.width&&inspectedCell[1]<world.height?
    signalSample(world,a,inspectedCell[0],inspectedCell[1]):null;
  return <section className="color-signal-lab" aria-label="Mathematical color signal inspector">
    <div className="color-signal-head"><b>A1 · COLOR MAPPING GONE WRONG</b><span>VISUAL, NOT A RULE</span></div>
    <p>{descriptor.explanation}</p>
    {(['generationWave','diagonal'] as string[]).includes(a.colorBy)&&
      slider('signal-frequency','Wave frequency','signalFrequency',o.frequency,.2,12,.2)}
    {(['generationWave','diagonal','angular','flow'] as string[]).includes(a.colorBy)&&
      slider('signal-phase','Phase rotation','signalPhase',o.phase,-6.28,6.28,.02)}
    {a.colorBy==='angular'&&<>
      {slider('signal-center-x','Rainbow center X','signalCenterX',o.centerX,0,1,.02)}
      {slider('signal-center-y','Rainbow center Y','signalCenterY',o.centerY,0,1,.02)}
    </>}
    {(['birthFlash','deathHeat','flow'] as string[]).includes(a.colorBy)&&
      slider('signal-history','History sensitivity','signalHistory',o.history,.05,3,.05)}
    <div className="color-signal-readout" role="status">
      {sample?
        <><b>MEASURED CELL [{sample.x}, {sample.y}] · GEN {world.generation}</b>
          <span>STATE {sample.state} · AGE {sample.age} · EVENT {sample.event}</span>
          <strong>SIGNAL {sample.value===null?'N/A':sample.value.toFixed(3)} / 1.000</strong></>:
        <span>PAINT OR TAP THE UNIVERSE TO INSPECT A CELL'S MATH SIGNAL.</span>}
    </div>
    <p className="color-signal-hint">Neighbor signals use the actual square/hex/triangle neighborhood and current wrap setting. Temporal signals use the existing deterministic generation/history buffers. Your mathematical automaton continues unchanged.</p>
  </section>;
}
