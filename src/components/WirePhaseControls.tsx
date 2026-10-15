import {useMemo,useState} from 'react';
import type {World,SimSettings} from '../engine/types';
import type {WireCascadeOptions,WireCascadeStamp} from '../engine/wire-cascade';
import type {WireLogicBit} from '../engine/wire-logic';
import {measureWirePhase,sweepWirePhaseNW,type WirePhaseScanRow} from '../engine/wire-phase-lab';
import {forecastWireSignals,type WireSignalForecast} from '../engine/wire-signal-scope';

export interface WirePhaseMonitor{
 ports:WireCascadeStamp['ports'];
 installedAt:number;
 biasNWShift:number;
 biasNEShift:number;
}
type Props={world:World;settings:SimSettings;monitor:WirePhaseMonitor|null;
 onInstall:(v:WireCascadeOptions)=>void};
const pulses=(ticks:number[])=>ticks.length?ticks.map(t=>'T'+t).join(', '):'—';
const cells=['VOID','CONDUCTOR','HEAD','TAIL'];
export default function WirePhaseControls({world,settings,monitor,onInstall}:Props){
 const [radius,setRadius]=useState(9);
 const [outputLength,setOutputLength]=useState(8);
 const [biasNWShift,setBiasNWShift]=useState(0);
 const [biasNEShift,setBiasNEShift]=useState(0);
 const [rotation,setRotation]=useState<0|1|2|3>(0);
 const [a,setA]=useState<WireLogicBit>(1);
 const [b,setB]=useState<WireLogicBit>(1);
 const [scan,setScan]=useState<{key:string;rows:WirePhaseScanRow[]}|null>(null);
 const [measurement,setMeasurement]=useState<WireSignalForecast|null>(null);
 const [measuredMonitor,setMeasuredMonitor]=useState<WirePhaseMonitor|null>(null);
 const [error,setError]=useState('');
 const phase=useMemo(()=>measureWirePhase(radius,outputLength,biasNWShift,biasNEShift),
  [radius,outputLength,biasNWShift,biasNEShift]);
 const pure=world.engine==='wireworld'&&world.lattice==='square'&&
  settings.wireExciteMin===1&&settings.wireExciteMax===2&&settings.wireDrive==='off';
 const args:WireCascadeOptions={radius,outputLength,rotation,a,b,biasNWShift,biasNEShift};
 const scanKey=[radius,outputLength,biasNEShift].join('/');
 const scanStale=scan!==null&&scan.key!==scanKey;
 const measurementStale=measurement!==null&&(monitor!==measuredMonitor||
  measurement.fromGeneration!==world.generation);
 const runScan=()=>{
  try{
   const rows=sweepWirePhaseNW(radius,outputLength,biasNEShift);
   setScan({key:scanKey,rows});setError('');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 const measure=()=>{
  if(!monitor){setError('Install the experimental physical phase circuit first.');return;}
  try{
   const {inverter,biases,output}=monitor.ports;
   const report=forecastWireSignals(world,settings,[
    {label:'NW BIAS',x:biases[0][0],y:biases[0][1]},
    {label:'NE BIAS',x:biases[1][0],y:biases[1][1]},
    {label:'DETECTOR',x:inverter[0],y:inverter[1]},
    {label:'FINAL OUTPUT',x:output[0],y:output[1]}
   ],64);
   setMeasurement(report);setMeasuredMonitor(monitor);setError('');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 const sample=(p:readonly [number,number])=>cells[world.cells[p[1]*world.width+p[0]]]??'?';
 return <section className="wave-dynamics-lab wire-phase-lab" aria-label="B10 real Wireworld physical phase-delay laboratory">
  <div className="wave-dynamics-heading">
   <strong>◴ B10 · PHASE MUTATION LAB</strong>
   <span>DIFFERENT WIRE LENGTHS · DIFFERENT MATHEMATICS</span>
  </div>
  <p className="module-note">Take the real B9 NAND → NOT cascade and make its TWO independent bias signals early or late by shortening or lengthening their physical conducting rails. The original rules stay untouched. A shift is measured in WHOLE CONDUCTOR CELLS, not animation frames. Discover whether a gate still behaves like AND—or starts transmitting surprising extra pulses.</p>
  <label className="input-label" htmlFor="wire-phase-nw">
   NW bias rail · physical timing shift <em>{biasNWShift>0?'+':''}{biasNWShift} {biasNWShift===1?'cell':'cells'}</em>
  </label>
  <input id="wire-phase-nw" type="range" min="-3" max="3" step="1" value={biasNWShift}
   onChange={e=>setBiasNWShift(Number(e.target.value))}/>
  <label className="input-label" htmlFor="wire-phase-ne">
   NE bias rail · independent timing shift <em>{biasNEShift>0?'+':''}{biasNEShift} {biasNEShift===1?'cell':'cells'}</em>
  </label>
  <input id="wire-phase-ne" type="range" min="-3" max="3" step="1" value={biasNEShift}
   onChange={e=>setBiasNEShift(Number(e.target.value))}/>
  <div className="wave-dynamics-meters">
   <div><b id="wire-phase-nw-time">T{radius+1+biasNWShift}</b><span>NW SOURCE ARRIVAL PREDICTION</span></div>
   <div><b id="wire-phase-ne-time">T{radius+1+biasNEShift}</b><span>NE SOURCE ARRIVAL PREDICTION</span></div>
   <div><b id="wire-phase-bits">{phase.truth}</b><span>PHYSICALLY MEASURED OUTPUT FINGERPRINT</span></div>
  </div>
  <p id="wire-phase-certification" className="neighborhood-note" role="status">
   {phase.synchronized&&phase.observedAND?
    '✓ EXACT B9 CERTIFIED AND · both bias waves synchronize at the NAND decision.':
    '◈ EXPERIMENTAL PHASE SPECIMEN · measured from original Wireworld. This is NOT a certified reusable AND gate.'}
  </p>
  <div style={{overflowX:'auto'}} className="wire-phase-table">
   <table id="wire-phase-truth" aria-label="Physical four-state altered-phase truth table"
    style={{width:'100%',minWidth:320,fontSize:'.78rem'}}>
    <thead><tr><th>A</th><th>B</th><th>NAND PORT</th><th>NW BIAS</th><th>NE BIAS</th><th>SECOND DETECTOR</th><th>FINAL HEADS</th></tr></thead>
    <tbody>{phase.rows.map(row=><tr key={''+row.a+row.b}>
     <td>{row.a}</td><td>{row.b}</td><td>{pulses(row.nandTicks)}</td>
     <td>{pulses(row.biasNWTicks)}</td><td>{pulses(row.biasNETicks)}</td>
     <td>{pulses(row.stage2Ticks)}</td><td>{pulses(row.outputTicks)}</td>
    </tr>)}</tbody>
   </table>
  </div>
  <p className="neighborhood-note">Every entry above is an actual HEAD tick sampled from a full four-state simulation. Output fingerprint order is 00 · 01 · 10 · 11. A zero may indicate total silence; multiple HEAD ticks are shown explicitly, never simplified away.</p>
  <div className="wave-presets">
   <button id="wire-phase-reset" type="button" onClick={()=>{setBiasNWShift(0);setBiasNEShift(0);}}>
    ↺ RESTORE PERFECT SYNCHRONIZATION
   </button>
   <button id="wire-phase-scan" type="button" onClick={runScan}>⌁ SCAN 5 PHYSICAL NW PHASES</button>
  </div>
  {scan&&<div id="wire-phase-scan-results" className="neighborhood-note">
   <strong>EXPERIMENTAL PHASE SPECTRUM · NE FIXED AT {scan.rows[0].neShift} CELLS</strong>
   {scanStale&&<p role="status">⚠ Scan uses earlier path settings. Scan again for the current geometry.</p>}
   <table aria-label="Five genuinely evolved physical NW phase fingerprints" style={{width:'100%',fontSize:'.82rem'}}>
    <thead><tr><th>NW CELLS</th><th>TRUE OUTPUT BITS</th><th>ACTUAL HEADS FOR 11</th><th>IDEAL AND?</th></tr></thead>
    <tbody>{scan.rows.map(v=><tr key={v.nwShift}>
     <td>{v.nwShift>0?'+':''}{v.nwShift}</td>
     <td>{v.truth}</td><td>{pulses(v.final11Ticks)}</td><td>{v.observedAND?'✓':'—'}</td>
    </tr>)}</tbody>
   </table>
   <p>This scan is explicitly triggered to avoid continuously resimulating five full universes on your phone. It never modifies the live artwork.</p>
  </div>}
  <label htmlFor="wire-phase-radius" className="input-label">Cascade span <em>{radius} cells</em></label>
  <input id="wire-phase-radius" type="range" min="7" max="12" step="1" value={radius}
   onChange={e=>setRadius(Number(e.target.value))}/>
  <label htmlFor="wire-phase-output-length" className="input-label">Output rail <em>{outputLength} cells</em></label>
  <input id="wire-phase-output-length" type="range" min="5" max="12" step="1"
   value={outputLength} onChange={e=>setOutputLength(Number(e.target.value))}/>
  <label htmlFor="wire-phase-rotation" className="input-label">Full specimen orientation</label>
  <select id="wire-phase-rotation" value={rotation}
   onChange={e=>setRotation(Number(e.target.value) as 0|1|2|3)}>
   {[0,1,2,3].map(n=><option key={n} value={n}>{n*90}°</option>)}
  </select>
  <div className="wave-modes">
   <label className="toggle"><input id="wire-phase-a" type="checkbox" checked={a===1}
    onChange={e=>setA(e.target.checked?1:0)}/><span>Seed input A</span></label>
   <label className="toggle"><input id="wire-phase-b" type="checkbox" checked={b===1}
    onChange={e=>setB(e.target.checked?1:0)}/><span>Seed input B</span></label>
  </div>
  <div className="wave-presets">
   <button id="wire-phase-install" type="button" disabled={!pure} onClick={()=>onInstall(args)}>
    ⊕ INSTALL PHASE-MUTATED REAL CIRCUIT AT CENTER
   </button>
  </div>
  {!pure&&<p className="neighborhood-note">Installation needs square-lattice Wireworld with the original 1–2-head law and external sources OFF. We won't secretly change your settings. Later edits or rule mutations can create different behavior, which you can measure.</p>}
  <p className="neighborhood-note">Installation edits only a bounded isolated region of the current canvas, preserves its generation, and rejects clipped geometry atomically. Saving a recipe preserves the TRUE physical cells, not merely the slider settings. Other artwork remains outside the local clearance.</p>
  {monitor&&<div id="wire-phase-live" className="neighborhood-note">
   <strong>YOUR ACTUAL INSTALLED PHASE SPECIMEN · GENERATION {monitor.installedAt}</strong>
   <p>NW bias: {sample(monitor.ports.biases[0])} · NE bias: {sample(monitor.ports.biases[1])} · second detector: {sample(monitor.ports.inverter)} · final output: {sample(monitor.ports.output)}.</p>
   <div className="wave-presets"><button id="wire-phase-measure" type="button" onClick={measure}>
    ◉ MEASURE REAL STAGE · NEXT 64 TICKS
   </button></div>
   {error&&<p role="alert">{error}</p>}
   {measurement&&<div id="wire-phase-measurement">
    {measurementStale&&<p role="status">⚠ Circuit or generation changed since this scan; re-measure.</p>}
    {measurement.traces.map(row=><p key={row.label}>{row.label}: {row.headTicks.length?pulses(row.headTicks):'NO HEAD in 64 ticks'}</p>)}
    <p>This is a read-only simulation of a copy of your CURRENT artwork, using current physics and any active sources. It doesn't advance the real universe.</p>
   </div>}
  </div>}
 </section>;
}
