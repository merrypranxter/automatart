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
function MicroMotionControls({a,update}:{a:Appearance;update:(key:keyof Appearance,value:number)=>void}){
 return <>
   <strong>F6G · LIVING MICROSCOPIC INK</strong>
   <Control id="math-micro-angle" label="Micro equation rotation" value={a.mathMicroAngle??0}
     min={-180} max={180} step={5} suffix="°" onChange={v=>update('mathMicroAngle',v)}/>
   <Control id="math-micro-time-rate" label="Micro time speed (negative = reverse, 0 = phase freeze)" value={a.mathMicroTimeRate??1}
     min={-3} max={3} step={.25} onChange={v=>update('mathMicroTimeRate',v)}/>
   <Control id="math-micro-band-shift" label="Micro ink band shift" value={a.mathMicroBandShift??0}
     min={-8} max={8} step={.25} onChange={v=>update('mathMicroBandShift',v)}/>
   <p className="skin-description">Rotate the equations INSIDE real cells, change their mathematical clock, or slide only the micro-ink's flat palette bands. Cellular rules never change. Speed 0 freezes explicit equation phase, not the live world or its outer palette.</p>
 </>;
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
    {(a.skin==='prism'||a.skin==='facets'||a.skin==='spinodal')&&<>
      <Control id="math-frequency" label="Mathematical frequency" value={a.mathFrequency??4.5}
        min={0.5} max={12} step={0.5} onChange={v=>update('mathFrequency',v)}/>
      <Control id="math-warp" label="Cell field deformation" value={a.mathWarp??0.8}
        min={0} max={2} step={0.05} onChange={v=>update('mathWarp',v)}/>
      <Control id="math-ink" label="Hard-edge ink / separation" value={a.mathInk??0.65}
        min={0} max={1} step={0.05} onChange={v=>update('mathInk',v)}/>
      <p className="skin-description">{a.skin==='prism'?
        'Two oblique moving wave phases interfere; living density gradients shear their color fringes. Saturated flat pigments, no required glow.':
        a.skin==='facets'?
        'Hard crystalline color sectors quantized from the actual field-gradient direction and curvature; physical polygons determine the facets.':
        'Sharp chemical-looking bands generated from the discrete Laplacian of the LIVE cellular field. A visual treatment, not simulated reaction-diffusion.'}</p>
    </>}
    {(a.skin==='quasicrystal'||a.skin==='hyperbolic'||a.skin==='lissajous')&&<>
      <Control id="math-frequency" label="Spatial frequency" value={a.mathFrequency??4.5}
        min={0.5} max={12} step={0.5} onChange={v=>update('mathFrequency',v)}/>
      <Control id="math-warp" label="Living field deformation" value={a.mathWarp??.8}
        min={0} max={2} step={.05} onChange={v=>update('mathWarp',v)}/>
      <Control id="math-ink" label="Flat ink separation" value={a.mathInk??.65}
        min={0} max={1} step={.05} onChange={v=>update('mathInk',v)}/>
      <Control id="math-fold" label="Symmetry order" value={a.mathFold??5}
        min={3} max={12} step={1} onChange={v=>update('mathFold',v)}/>
      <Control id="math-twist" label="Phase twist" value={a.mathTwist??.85}
        min={0} max={2} step={.05} onChange={v=>update('mathTwist',v)}/>
      <p className="skin-description">{a.skin==='quasicrystal'?
        'Superposed standing-wave beams at equal angular intervals; default fivefold quasiperiodic star fields are bent by real cell-neighbor gradients.':
        a.skin==='hyperbolic'?
        'A genuine Möbius disk transformation in hyperbolic coordinates, with living cell gradients pushing the disk and angular/radial rings.':
        'Two nonlinear Lissajous stripe families cross; mathematical parity determines which flat-color strand passes over or under.'}</p>
    </>}
    {(a.skin==='prism'||a.skin==='facets'||a.skin==='spinodal'||
      a.skin==='quasicrystal'||a.skin==='hyperbolic'||a.skin==='lissajous')&&
      <div className="skin-effects">
        <strong>F6E · MICROSCOPIC MATHEMATICS INSIDE REAL CELLS</strong>
        <Control id="math-micro-detail" label="Subcell quality (0 = original)" value={a.mathMicroDetail??0}
          min={0} max={3} step={1} onChange={v=>update('mathMicroDetail',v)}/>
        {(a.mathMicroDetail??0)>0&&<>
          <Control id="math-micro-frequency" label="Microscopic equation frequency" value={a.mathMicroFrequency??5}
            min={.5} max={12} step={.5} onChange={v=>update('mathMicroFrequency',v)}/>
          <Control id="math-micro-mix" label="Microscopic flat-ink intensity" value={a.mathMicroMix??.65}
            min={0} max={1} step={.05} onChange={v=>update('mathMicroMix',v)}/>
          <MicroMotionControls a={a} update={update}/>
          <p className="skin-description">True inside-polygon mathematical sampling on all eight lattices. Higher quality uses more work for preview, PNG, GIF and video; quality 0 or intensity 0 preserves the original material exactly. No mandatory glow.</p>
        </>}
      </div>}
    {(a.skin==='gyroid'||a.skin==='inversion'||a.skin==='cusp')&&<>
      <Control id="math-frequency" label="Mathematical frequency" value={a.mathFrequency??4.5}
        min={.5} max={12} step={.5} onChange={v=>update('mathFrequency',v)}/>
      <Control id="math-warp" label="Physical field deformation" value={a.mathWarp??.8}
        min={0} max={2} step={.05} onChange={v=>update('mathWarp',v)}/>
      <Control id="math-ink" label="Flat-ink ridge strength" value={a.mathInk??.65}
        min={0} max={1} step={.05} onChange={v=>update('mathInk',v)}/>
      <Control id="math-fold" label="Symmetry order" value={a.mathFold??5}
        min={3} max={12} step={1} onChange={v=>update('mathFold',v)}/>
      <Control id="math-twist" label="Phase twist" value={a.mathTwist??.85}
        min={0} max={2} step={.05} onChange={v=>update('mathTwist',v)}/>
      <Control id="math-slice" label="Surface slice / catastrophe offset" value={a.mathSlice??0}
        min={-2} max={2} step={.1} onChange={v=>update('mathSlice',v)}/>
      <Control id="math-pole-x" label="Mathematical center X" value={a.mathPoleX??.5}
        min={.05} max={.95} step={.05} onChange={v=>update('mathPoleX',v)}/>
      <Control id="math-pole-y" label="Mathematical center Y" value={a.mathPoleY??.5}
        min={.05} max={.95} step={.05} onChange={v=>update('mathPoleY',v)}/>
      <div className="skin-effects">
        <strong>F6D · ACTUAL DETAIL WITHIN EVERY CELL</strong>
        <Control id="math-micro-detail" label="Subcell quality (0 = original)" value={a.mathMicroDetail??0}
          min={0} max={3} step={1} onChange={v=>update('mathMicroDetail',v)}/>
        {(a.mathMicroDetail??0)>0&&<>
          <Control id="math-micro-frequency" label="Microscopic equation frequency" value={a.mathMicroFrequency??5}
            min={.5} max={12} step={.5} onChange={v=>update('mathMicroFrequency',v)}/>
          <Control id="math-micro-mix" label="Microscopic flat-ink intensity" value={a.mathMicroMix??.65}
            min={0} max={1} step={.05} onChange={v=>update('mathMicroMix',v)}/>
          <MicroMotionControls a={a} update={update}/>
          <p className="skin-description">New mathematically evaluated detail within true cell polygons. Preview uses a lighter sampling budget; export uses more. High levels may slow GIF/video exports. Original cellular rules and output dimensions are unchanged.</p>
        </>}
      </div>
      <p className="skin-description">{a.skin==='gyroid'?
        'True 3D gyroid implicit-surface slice; each living cell deforms the moving cut through the zero-level membrane.':
        a.skin==='inversion'?
        'Exact circle inversion about a movable pole: distances turn inside-out around a real geometric singularity.':
        'Canonical cusp catastrophe discriminant 4u³ + 27v², rotated in fold sectors and distorted by real cell gradients.'}</p>
    </>}
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
      glassLines:0.7,mathFrequency:4.5,mathWarp:0.8,mathInk:0.65,
      mathFold:5,mathTwist:0.85,mathSlice:0,mathPoleX:.5,mathPoleY:.5,
      mathMicroDetail:0,mathMicroFrequency:5,mathMicroMix:.65,
      mathMicroAngle:0,mathMicroTimeRate:1,mathMicroBandShift:0,
      temporalRGB:0,fossilOpacity:0}))}>↺ RESET SKIN LAB</button>
  </section>;
}
