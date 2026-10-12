import {useMemo} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {Appearance,World,ColorBy} from '../engine/types';
import {COLOR_SOURCES,validateDualColor,swapDualColor,resetDualColor,createDualSampler} from '../engine/dual-color';
import type {DualColor} from '../engine/dual-color';
type Props={appearance:Appearance;setAppearance:Dispatch<SetStateAction<Appearance>>;
  inspectedCell:[number,number]|null;world:World};
const groups=[
  {name:'CLASSIC SIGNALS',items:COLOR_SOURCES.slice(0,7)},
  {name:'MATHEMATICAL SIGNALS · A1',items:COLOR_SOURCES.slice(7)}
];
export default function DualColorControls({appearance:a,setAppearance,world,inspectedCell}:Props){
  const d=validateDualColor(a.dualColor);
  const update=(f:(d:DualColor)=>DualColor)=>
    setAppearance(current=>({...current,dualColor:f(validateDualColor(current.dualColor))}));
  const set=<K extends keyof DualColor>(key:K,value:DualColor[K])=>
    update(prev=>({...prev,[key]:value}));
  const colorPalette=useMemo(()=>a.palette.map(v=>[
    parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)
  ] as [number,number,number]),[a.palette]);
  const sample=useMemo(()=>{
    if(!d.enabled||!inspectedCell)return null;
    const [x,y]=inspectedCell;
    if(x<0||y<0||x>=world.width||y>=world.height)return null;
    return createDualSampler(world,a,colorPalette).sample(y*world.width+x);
  },[a,world,inspectedCell,colorPalette,d.enabled]);
  const slider=(id:string,label:string,value:number,min:number,max:number,step:number,change:(n:number)=>void)=>
    <label className="dual-slider" htmlFor={id}><span>{label}<em>{value.toFixed(2)}</em></span>
      <input type="range" id={id} min={min} max={max} step={step} value={value}
        onChange={e=>change(Number(e.target.value))}/></label>;
  const sourceSelector=(kind:'A'|'B')=>{
    const sourceKey=kind==='A'?'sourceA':'sourceB';
    const invertKey=kind==='A'?'invertA':'invertB';
    const offsetKey=kind==='A'?'offsetA':'offsetB';
    const strengthKey=kind==='A'?'strengthA':'strengthB';
    return <div className={'dual-source dual-source-'+kind.toLowerCase()}>
      <label htmlFor={'dual-source-'+kind.toLowerCase()}>SIGNAL {kind} · MATH SOURCE</label>
      <select id={'dual-source-'+kind.toLowerCase()} value={d[sourceKey]}
        onChange={e=>set(sourceKey,e.target.value as ColorBy)}>
        {groups.map(group=><optgroup key={group.name} label={group.name}>
          {group.items.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
        </optgroup>)}
      </select>
      <label className="dual-toggle-small" htmlFor={'dual-invert-'+kind.toLowerCase()}>
        <input type="checkbox" id={'dual-invert-'+kind.toLowerCase()} checked={d[invertKey]}
          onChange={e=>set(invertKey,e.target.checked)}/> INVERT {kind} COLOR ORDER
      </label>
      {slider('dual-offset-'+kind.toLowerCase(),'Palette offset',d[offsetKey],-12,12,1,n=>set(offsetKey,n))}
      {slider('dual-strength-'+kind.toLowerCase(),'Signal scale',d[strengthKey],0,3,.05,n=>set(strengthKey,n))}
    </div>;
  };
  const rgb=(c:number[])=>'rgb('+c.map(n=>Math.round(n)).join(',')+')';
  return <section className="dual-color-lab" aria-label="A2 Dual Color Mapping Patchbay">
    <div className="dual-heading"><b>A2 · DUAL COLOR MAPPING</b><span>TWO SIGNALS · ONE UNIVERSE</span></div>
    <label className="dual-main-switch" htmlFor="dual-enabled">
      <input id="dual-enabled" type="checkbox" checked={d.enabled}
        onChange={e=>update(current=>({...current,enabled:e.target.checked,
          sourceA:current.enabled?current.sourceA:a.colorBy}))}/>
      <span>{d.enabled?'DUAL MAPPING ACTIVE':'ENABLE TWO-SIGNAL COLOR MAPPING'}</span>
    </label>
    <p className="dual-help">Pick two independent mathematical measurements of the same cells, then blend their resulting RGB colors. This modifies the live rendering and every export, never the automaton's evolution. The single Color Mapping dropdown above stays available when Dual is switched off.</p>
    {d.enabled&&<>
      <div className="dual-source-grid">
        {sourceSelector('A')}
        {sourceSelector('B')}
      </div>
      {slider('dual-blend','BLEND · A ← → B',d.blend,0,1,.05,n=>set('blend',n))}
      <div className="dual-blend-meter">
        <span>A · {Math.round((1-d.blend)*100)}%</span>
        <div className="dual-blend-track"><div style={{width:(d.blend*100)+'%'}}/></div>
        <span>B · {Math.round(d.blend*100)}%</span>
      </div>
      <div className="dual-button-row">
        <button id="dual-swap" type="button" onClick={()=>update(swapDualColor)}>⇆ SWAP SIGNALS</button>
        <button id="dual-reset" type="button" onClick={()=>update(()=>resetDualColor())}>↶ RESET DUAL</button>
      </div>
      <div className="dual-button-row dual-presets">
        <button type="button" onClick={()=>update(d=>({...d,sourceA:'age',sourceB:'entropy',blend:.48}))}>AGE × ENTROPY</button>
        <button type="button" onClick={()=>update(d=>({...d,sourceA:'flow',sourceB:'boundaries',blend:.5}))}>FLOW × EDGES</button>
        <button type="button" onClick={()=>update(d=>({...d,sourceA:'angular',sourceB:'deathHeat',blend:.55}))}>ANGLE × GHOSTS</button>
      </div>
      <div className="dual-math-inspector" role="status">
        {sample&&inspectedCell?
          <>
            <b>INSPECTOR · CELL [{inspectedCell[0]}, {inspectedCell[1]}] · GEN {world.generation}</b>
            <div className="dual-swatches">
              <span style={{background:rgb(sample.colorA)}} title="Signal A preview"/>
              <span style={{background:rgb(sample.colorB)}} title="Signal B preview"/>
              <span style={{background:rgb(sample.result)}} title="Blended result"/>
            </div>
            <span>SIGNAL A: {sample.a.toFixed(3)} · SIGNAL B: {sample.b.toFixed(3)}</span>
            <strong>BLENDED RGB {sample.result.map(n=>Math.round(n)).join(' / ')}</strong>
          </>:
          <span>Tap or paint a cell in the universe to inspect A, B and their final blend.</span>}
      </div>
    </>}
    <p className="dual-help">Both sources use your existing editable palette and its frame-by-frame cycling. The palette offsets and invert settings are channel-specific. A=100% and B=100% use exact endpoint colors. Saves with your JSON recipe; older recipes default to OFF.</p>
  </section>;
}
