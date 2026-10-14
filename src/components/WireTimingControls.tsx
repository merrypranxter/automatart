import {useMemo,useState} from 'react';
import type {World,SimSettings} from '../engine/types';
import {runWireTimingBench,expectedTimingTicks,type WireTimingOptions,type WireTimingKind} from '../engine/wire-timing';
import {forecastWireSignals,type WireSignalForecast} from '../engine/wire-signal-scope';
import type {WireLogicBit} from '../engine/wire-logic';

export interface WireTimingMonitor{
 kind:WireTimingKind;
 radius:number;
 offset:number;
 a:WireLogicBit;
 b:WireLogicBit;
 installedAt:number;
 outputs:(readonly [number,number])[];
 inputs:(readonly [number,number])[];
}
type Props={
 world:World;
 settings:SimSettings;
 monitor:WireTimingMonitor|null;
 onInstall:(v:WireTimingOptions)=>void;
};
const kinds=[
 {id:'delay',name:'PHYSICAL DELAY RAIL',hint:'One conductor, extra wire length delays a single input pulse'},
 {id:'lanes',name:'ISOLATED A/B ROUTING',hint:'Two rails separated by ten cells; extend B physically to add delay'},
 {id:'train',name:'TWO-PULSE TRAIN',hint:'Encode two independent input pulses on the same rail, separated in real time'}
] as const;
export default function WireTimingControls({world,settings,monitor,onInstall}:Props){
 const [kind,setKind]=useState<WireTimingKind>('lanes');
 const [radius,setRadius]=useState(9);
 const [offset,setOffset]=useState(6);
 const [rotation,setRotation]=useState<0|1|2|3>(0);
 const [a,setA]=useState<WireLogicBit>(1);
 const [b,setB]=useState<WireLogicBit>(1);
 const [verification,setVerification]=useState<WireSignalForecast|null>(null);
 const [checkError,setCheckError]=useState('');
 const bench=useMemo(()=>runWireTimingBench(kind,radius,offset),[kind,radius,offset]);
 const pure=settings.wireDrive==='off'&&settings.wireExciteMin===1&&settings.wireExciteMax===2;
 const options:WireTimingOptions={kind,radius,offset,rotation,a,b};
 const wireNames=['VOID','WIRE','HEAD','TAIL'];
 const actual=monitor?.outputs.map(([x,y])=>world.cells[y*world.width+x])??[];
 const stale=verification&&monitor&&verification.fromGeneration!==world.generation;
 const check=()=>{
  if(!monitor){setCheckError('Install a routing circuit first.');return;}
  try{
   const data=forecastWireSignals(world,settings,monitor.outputs.map(([x,y],i)=>({
    label:'LANE '+(i+1),x,y
   })),64);
   setVerification(data);setCheckError('');
  }catch(e){setCheckError(e instanceof Error?e.message:String(e));}
 };
 return <section className="wave-dynamics-lab" aria-label="Wireworld B6 certified routing and timing instrument">
  <div className="wave-dynamics-heading">
   <strong>⇢ B6 · SIGNAL ROUTING + TIMING</strong><span>REAL CONDUCTOR LENGTH · REAL PROPAGATION</span>
  </div>
  <p className="module-note">These are physically built Wireworld rails. More conductor cells means a pulse genuinely takes more generations to travel. Two separated lanes do not interfere; a two-pulse train transports two timed electron heads on ONE rail. Every timing claim is checked by running the canonical four-state simulation.</p>
  <label className="input-label" htmlFor="wire-route-kind">VERIFIED ROUTING DEVICE</label>
  <select id="wire-route-kind" value={kind}
   onChange={e=>{const value=e.target.value as WireTimingKind;setKind(value);
    if(value==='train'&&offset<3)setOffset(3);}}>
   {kinds.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
  </select>
  <p className="neighborhood-note">{kinds.find(v=>v.id===kind)?.hint}</p>
  <label className="input-label" htmlFor="wire-route-radius">Base conductor half-length <em>{radius} cells</em></label>
  <input id="wire-route-radius" type="range" min="7" max="12" step="1"
   value={radius} onChange={e=>setRadius(Number(e.target.value))}/>
  <label className="input-label" htmlFor="wire-route-offset">
   {kind==='train'?'Pulse separation':kind==='lanes'?'Lane B extra conductor length':'Extra conductor length'}
   <em>{offset} {offset===1?'cell':'cells'}</em>
  </label>
  <input id="wire-route-offset" type="range" min={kind==='train'?3:0}
   max="12" step="1" value={offset} onChange={e=>setOffset(Number(e.target.value))}/>
  <label className="input-label" htmlFor="wire-route-rotation">Route orientation</label>
  <select id="wire-route-rotation" value={rotation}
   onChange={e=>setRotation(Number(e.target.value) as 0|1|2|3)}>
   {[0,1,2,3].map(n=><option key={n} value={n}>{n*90}°</option>)}
  </select>
  <div className="wave-modes">
   <label className="toggle"><input id="wire-route-a" type="checkbox" checked={a===1}
    onChange={e=>setA(e.target.checked?1:0)}/><span>Signal A pulse</span></label>
   {kind!=='delay'&&<label className="toggle"><input id="wire-route-b" type="checkbox"
    checked={b===1} onChange={e=>setB(e.target.checked?1:0)}/><span>Signal B pulse</span></label>}
  </div>
  <strong className="input-label">PHYSICAL ARRIVAL-TIME BENCH</strong>
  <div className="wire-logic-truth-table">
   <table style={{width:'100%',fontSize:'.83rem'}} aria-label="Wireworld simulated A/B pulse arrival timing table">
    <thead><tr><th>A</th>{kind!=='delay'&&<th>B</th>}<th>{kind==='lanes'?'LANE A / LANE B HEAD TICKS':'OUTPUT HEAD TICKS'}</th><th>TEST</th></tr></thead>
    <tbody>{bench.cases.map(row=><tr key={''+row.a+row.b}>
     <td>{row.a}</td>{kind!=='delay'&&<td>{row.b}</td>}
     <td>{row.actualTicks.map(ticks=>ticks.length?ticks.map(t=>'T'+t).join(', '):'—').join(' / ')}</td>
     <td>{row.pass?'✓':'✕'}</td>
    </tr>)}</tbody>
   </table>
  </div>
  <p id="wire-route-certification" className="neighborhood-note" role="status">
   {bench.allPass?'✓ ALL ROUTE TIMINGS VERIFIED: real observed electron HEAD arrivals match conductor-length predictions.':
    '✕ Route failed physical timing tests and is NOT certified.'}
  </p>
  {kind==='lanes'&&<p className="neighborhood-note">Signal B travels {offset} more real conductor cells than A. If both are injected together, B reaches its remote output exactly {offset} generations later; the isolated rails remain ten lattice rows apart to prevent Moore-neighbor coupling.</p>}
  {kind==='train'&&<p className="neighborhood-note">Two asserted inputs make TWO actual output HEAD events, separated by {offset} full generations. This is pulse timing, not a Boolean gate: 11 intentionally produces both pulses, not a single 'true' flash.</p>}
  <div className="wave-presets">
   <button type="button" id="wire-route-install"
    disabled={!bench.allPass||world.engine!=='wireworld'||!pure}
    onClick={()=>onInstall(options)}>⊕ INSTALL VERIFIED ROUTE AT CENTER</button>
  </div>
  {!pure&&<p role="status" className="neighborhood-note">To install a CERTIFIED routing device, select original Wireworld 1–2 HEAD rule and PURE/OFF electrodes in B3 above. Altered physics are intentionally not certified, and B6 will not change those settings silently.</p>}
  <p className="neighborhood-note">Installation pauses the simulation, writes the actual conductor and optional head/tail states and clears only a local two-cell interference margin. The universe is not reset. It refuses clipped paths rather than claiming a broken route still works.</p>
  {monitor&&<div id="wire-route-live" className="neighborhood-note">
   <strong>INSTALLED ROUTE · {monitor.kind.toUpperCase()} · GENERATION {monitor.installedAt}</strong>
   <div>{monitor.outputs.map(([x,y],i)=><span key={i} style={{display:'inline-block',marginRight:12}}>
    OUT {i+1} ({x},{y}) · {wireNames[actual[i]]??'?'}
   </span>)}</div>
   <p>The live probe shows the true current head/conductor/tail state, which can differ from the isolated timing bench after painting or changing the rules.</p>
   <div className="wave-presets">
    <button type="button" id="wire-route-measure" onClick={check}>⌁ MEASURE THIS ROUTE · NEXT 64 TICKS</button>
   </div>
   {checkError&&<p role="alert">{checkError}</p>}
   {verification&&<div id="wire-route-measurement">
    <p>{stale?'⚠ This measurement is from an earlier world generation. Re-run to refresh.':
     'Measured from generation '+verification.fromGeneration+' using the actual current world.'}</p>
    {verification.traces.map((trace,i)=><p key={i}>OUTPUT {i+1}: {trace.headTicks.length?
     trace.headTicks.map(t=>'T'+t).join(', '):'NO HEAD within 64 ticks'}</p>)}
    <p>{verification.driven?'External sources are included.':
     'No external source. The current conductor geometry and physics determine this result.'}</p>
   </div>}
  </div>}
  <p className="neighborhood-note">Timing comparison is an ANALYSIS of measured signals, not a physically implemented AND gate. AND/NAND and isolated crossings remain uncertified. No additional Boolean truth functions were invented for this phase.</p>
 </section>;
}
