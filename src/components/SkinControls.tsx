import type {Dispatch,SetStateAction} from 'react';
import type {Appearance} from '../engine/types';

function Control({id,label,value,min,max,step=0.05,suffix='',onChange}:{
  id:string;label:string;value:number;min:number;max:number;step?:number;
  suffix?:string;onChange:(v:number)=>void;
}){
  return <div className="skin-control">
    <label className="input-label" htmlFor={id}>{label}
      <em>{Number(value.toFixed(2))}{suffix}</em>
    </label>
    <input id={id} type="range" min={min} max={max} step={step} value={value}
      onChange={e=>onChange(Number(e.target.value))}/>
  </div>;
}
interface Props {appearance:Appearance;setAppearance:Dispatch<SetStateAction<Appearance>>}
export default function SkinControls({appearance:a,setAppearance}:Props){
  const update=(key:keyof Appearance,value:number)=>
    setAppearance(prev=>({...prev,[key]:value}));
  const isField=a.skin==='mercury'||a.skin==='relief'||a.skin==='contours';
  return <section className="skin-laboratory" aria-label="Advanced mathematical skin laboratory">
    <div className="skin-label">✳ SKIN LABORATORY <span>VISUAL ONLY · CA RULES UNCHANGED</span></div>
    {isField&&<Control id="skin-threshold" label="Density threshold" value={a.skinThreshold} min={0.05} max={0.95}
      onChange={v=>update('skinThreshold',v)}/>}
    {a.skin==='contours'&&<>
      <Control id="contour-lines" label="Isoline count" value={a.contourLines} min={2} max={9} step={1}
        onChange={v=>update('contourLines',v)}/>
      <Control id="contour-width" label="Neon line width" value={a.contourWidth} min={0.5} max={6} step={0.5} suffix="px"
        onChange={v=>update('contourWidth',v)}/>
      <p className="skin-description">Real contour intersections around the smoothed cell-state density field. Different thresholds draw different colored lace-like isolines.</p>
    </>}
    {(a.skin==='mercury'||a.skin==='relief')&&<>
      <Control id="chrome-strength" label="Prismatic metallic highlights" value={a.chromeStrength} min={0} max={1.5}
        onChange={v=>update('chromeStrength',v)}/>
      <p className="skin-description">{a.skin==='mercury'?
        'A soft occupancy threshold turns local cell activity into a reflective liquid membrane.':
        'Surface lighting follows the slope of the genuine cell-density heightfield.'}</p>
    </>}
    {a.skin==='glass'&&<>
      <Control id="glass-lines" label="Stained glass leading" value={a.glassLines} min={0} max={1}
        onChange={v=>update('glassLines',v)}/>
      <p className="skin-description">Leaded pane borders appear where neighboring cellular states differ. The shape is generated from the CA state lattice, not random drawn ornament.</p>
    </>}
    {(a.skin==='mercury'||a.skin==='relief'||a.skin==='contours'||a.skin==='glass')&&
      <Control id="skin-bloom" label="Material glow" value={a.glowStrength} min={0} max={1}
        onChange={v=>update('glowStrength',v)}/>}
    <div className="skin-effects">
      <strong>TIME BENDING</strong>
      <Control id="temporal-rgb" label="Temporal RGB ghosting" value={a.temporalRGB} min={0} max={1}
        onChange={v=>update('temporalRGB',v)}/>
      <Control id="fossil-opacity" label="Chromatic fossils" value={a.fossilOpacity} min={0} max={1}
        onChange={v=>update('fossilOpacity',v)}/>
      <p className="skin-description">RGB channels reveal present / previous / earlier generations. Fossils preserve a fading trace of deaths or cyclic transitions. Both work on ANY engine and every export.</p>
    </div>
    <button type="button" className="reset-color" onClick={()=>setAppearance(prev=>({...prev,
      skinThreshold:0.42,contourLines:5,contourWidth:1.5,chromeStrength:0.8,
      glassLines:0.7,temporalRGB:0,fossilOpacity:0}))}>↺ RESET SKIN LAB</button>
  </section>;
}
