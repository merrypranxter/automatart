import {useMemo,useState} from 'react';
import type {World,SimSettings} from '../engine/types';
import {runWireCascadeBench,type WireCascadeOptions,type WireCascadeStamp} from '../engine/wire-cascade';
import {forecastWireSignals,type WireSignalForecast} from '../engine/wire-signal-scope';
import type {WireLogicBit} from '../engine/wire-logic';

export interface WireCascadeMonitor {
 ports:WireCascadeStamp['ports'];
 installedAt:number;
 radius:number;outputLength:number;a:WireLogicBit;b:WireLogicBit;
}
type Props={
 world:World;settings:SimSettings;
 monitor:WireCascadeMonitor|null;
 onInstall:(config:WireCascadeOptions)=>void;
};
const STATE=['VOID','CONDUCTOR','HEAD','TAIL'];
export default function WireCascadeControls({world,settings,monitor,onInstall}:Props){
 const [radius,setRadius]=useState(9);
 const [outputLength,setOutputLength]=useState(8);
 const [rotation,setRotation]=useState<0|1|2|3>(0);
 const [a,setA]=useState<WireLogicBit>(1);
 const [b,setB]=useState<WireLogicBit>(1);
 const [measurement,setMeasurement]=useState<WireSignalForecast|null>(null);
 const [error,setError]=useState('');
 const bench=useMemo(()=>runWireCascadeBench(radius,outputLength),[radius,outputLength]);
 const canonical=world.engine==='wireworld'&&world.lattice==='square'&&
  settings.wireDrive==='off'&&settings.wireExciteMin===1&&settings.wireExciteMax===2;
 const config:WireCascadeOptions={radius,outputLength,rotation,a,b};
 const previewTick=radius+2+outputLength;
 const sample=(p:readonly [number,number])=>STATE[world.cells[p[1]*world.width+p[0]]]??'?';
 const doMeasure=()=>{
  if(!monitor){setError('Install a physical cascade first.');return;}
  const {nand,inverter,biases,output}=monitor.ports;
  try{
   const report=forecastWireSignals(world,settings,[
    {label:'STAGE 1 NAND',x:nand[0],y:nand[1]},
    {label:'BIASED STAGE 2',x:inverter[0],y:inverter[1]},
    {label:'BIAS NW',x:biases[0][0],y:biases[0][1]},
    {label:'FINAL AND',x:output[0],y:output[1]}
   ],64);
   setMeasurement(report);setError('');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 return <section className="wave-dynamics-lab wire-cascade-lab" aria-label="B9 two-stage physical Wireworld AND cascade">
  <div className="wave-dynamics-heading">
   <strong>⤳ B9 · TRUE TWO-STAGE LOGIC CASCADE</strong>
   <span>PHYSICAL NAND → TIMED NOT → AND</span>
  </div>
  <p className="module-note">We finally have two separate junctions computing in sequence! The first NAND stage produces (or suppresses) a real electron pulse. That pulse travels to a downstream NOT-like stage, where two independently traveling bias electrons arrive at the exact same moment. The original four-state Wireworld rules alone determine the final AND output—no synthetic Boolean injection.</p>
  <div className="wave-dynamics-meters">
   <div><b id="wire-cascade-first-tick">T{radius+1}</b><span>NAND ELECTRON ARRIVES AT SECOND STAGE'S INPUT</span></div>
   <div><b id="wire-cascade-second-tick">T{radius+2}</b><span>SECOND JUNCTION COMPUTES</span></div>
   <div><b id="wire-cascade-output-tick">T{previewTick}</b><span>FINAL PHYSICAL AND PORT</span></div>
  </div>
  <label className="input-label" htmlFor="wire-cascade-radius">NAND-to-NOT signal distance <em>{radius} conductor segments</em></label>
  <input id="wire-cascade-radius" type="range" min="7" max="12" step="1"
   value={radius} onChange={e=>setRadius(Number(e.target.value))}/>
  <label className="input-label" htmlFor="wire-cascade-output-length">Output conductor length <em>{outputLength} segments</em></label>
  <input id="wire-cascade-output-length" type="range" min="5" max="12" step="1"
   value={outputLength} onChange={e=>setOutputLength(Number(e.target.value))}/>
  <label className="input-label" htmlFor="wire-cascade-rotation">Full physical circuit orientation</label>
  <select id="wire-cascade-rotation" value={rotation}
   onChange={e=>setRotation(Number(e.target.value) as 0|1|2|3)}>
   {[0,1,2,3].map(k=><option key={k} value={k}>{k*90}°</option>)}
  </select>
  <strong className="input-label">ACTUAL FOUR-STATE AND TRUTH TABLE</strong>
  <div className="wire-logic-truth-table" style={{overflowX:'auto'}}>
   <table id="wire-cascade-truth" aria-label="Real two-stage cascaded NAND NOT AND truth table" style={{width:'100%',minWidth:350,fontSize:'.78rem'}}>
    <thead><tr><th>A</th><th>B</th><th>NAND FWD</th><th>PORT HEADS incl. return</th><th>BIAS ×2</th><th>STAGE 2 HEAD</th><th>AND OUT</th><th>PASS</th></tr></thead>
    <tbody>{bench.cases.map(row=><tr key={''+row.a+row.b}>
     <td>{row.a}</td><td>{row.b}</td>
     <td>{row.nandForward?'T'+(radius+1):'—'}</td>
     <td>{row.nandTicks.map(t=>'T'+t).join(', ')||'—'}</td>
     <td>{row.biasTicks.map(w=>w.map(t=>'T'+t).join(', ')).join(' / ')}</td>
     <td>{row.secondStageTicks.map(t=>'T'+t).join(', ')||'—'}</td>
     <td>{row.outputTicks.map(t=>'T'+t).join(', ')||'0'}</td>
     <td>{row.pass?'✓':'✕'}</td>
    </tr>)}</tbody>
   </table>
  </div>
  <p id="wire-cascade-certification" className="neighborhood-note" role="status">
   {bench.allPass?'✓ ALL FOUR INPUT CASES CERTIFIED · real traveling NAND output, two phased bias pulses, complete output trace.':
    '✕ This geometry failed true four-state simulation. Installation is disabled.'}
  </p>
  <strong className="input-label">INSTALL A REAL TWO-STAGE DEVICE INTO YOUR ARTWORK</strong>
  <div className="wave-modes">
   <label className="toggle"><input id="wire-cascade-a" type="checkbox" checked={a===1}
    onChange={e=>setA(e.target.checked?1:0)}/><span>A · input electron</span></label>
   <label className="toggle"><input id="wire-cascade-b" type="checkbox" checked={b===1}
    onChange={e=>setB(e.target.checked?1:0)}/><span>B · input electron</span></label>
  </div>
  <div className="wave-presets">
   <button id="wire-cascade-install" type="button"
    disabled={!canonical||!bench.allPass} onClick={()=>onInstall(config)}>
    ⊕ INSTALL TRUE AND CASCADE AT CENTER
   </button>
  </div>
  {!canonical&&<p className="neighborhood-note" role="status">
   Certified installation requires square Wireworld with the original 1–2 HEAD excitation law and external electrodes OFF. Use B3 controls to choose canonical settings; B9 will never change your physics secretly.
  </p>}
  <p className="neighborhood-note">⚠ Real conductors are bidirectional. On input 11, the successfully ignited second stage sends a RETURN electron wave toward the NAND port at tick {radius+3}. This is not a forward NAND result or an extra AND output. The table includes it instead of concealing physical feedback. These seeded specimens are not reusable asynchronous clocked logic modules.</p>
  <p className="neighborhood-note">The installer makes one localized art edit, with a two-cell clearing moat, and keeps the current generation. A full cascade is taller than a single gate because both bias sources must travel in time; clipped devices are rejected without changing any cells. Save a recipe to preserve exact conductor/head/tail states.</p>
  {monitor&&<div className="neighborhood-note" id="wire-cascade-live">
   <strong>FOUR REAL-WORLD PROBES · INSTALLED AT GENERATION {monitor.installedAt}</strong>
   <div>STAGE 1 NAND PORT ({monitor.ports.nand.join(',')}) · {sample(monitor.ports.nand)} · includes reflected pulses</div>
   <div>STAGE 2 DETECTOR ({monitor.ports.inverter.join(',')}) · {sample(monitor.ports.inverter)}</div>
   <div>BIAS CONTACTS · {monitor.ports.biases.map(sample).join(' + ')}</div>
   <div>FINAL AND ({monitor.ports.output.join(',')}) · {sample(monitor.ports.output)}</div>
   <div className="wave-presets"><button id="wire-cascade-measure" type="button" onClick={doMeasure}>
    ⌁ SCAN ACTUAL CASCADE · NEXT 64 TICKS
   </button></div>
   {error&&<p role="alert">{error}</p>}
   {measurement&&<div id="wire-cascade-measurement">
    <p>Read-only physical forecast from generation {measurement.fromGeneration}. {measurement.fromGeneration!==world.generation?'⚠ The generation changed; re-scan.':''}</p>
    {measurement.traces.map(trace=><div key={trace.label}>
     {trace.label}: {trace.headTicks.length?trace.headTicks.map(t=>'T'+t).join(', '):'NO HEAD in 64 ticks'}
    </div>)}
    <p>The measurement includes any later painting, changed physics and external sources. This is NOT the isolated truth-table certificate.</p>
   </div>}
  </div>}
  <p className="neighborhood-note">This proves a seeded, synchronized two-stage AND *specimen*. It does not yet prove arbitrary independent gate modules can be wired together, reused with asynchronous inputs, or made into an indefinitely clocked computer. Insulated crossovers are still unverified.</p>
 </section>;
}
