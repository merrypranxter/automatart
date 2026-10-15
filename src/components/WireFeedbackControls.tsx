import {useMemo,useState} from 'react';
import type {SimSettings,World} from '../engine/types';
import type {WireCascadeOptions,WireCascadeStamp} from '../engine/wire-cascade';
import type {WireLogicBit} from '../engine/wire-logic';
import {measureWireFeedback,sweepWireFeedback,type WireFeedbackScanRow} from '../engine/wire-feedback-lab';
import {forecastWireSignals,type WireSignalForecast} from '../engine/wire-signal-scope';
export interface WireFeedbackMonitor{
 ports:WireCascadeStamp['ports'];
 generation:number;
 guarded:boolean;
 westShift:number;
 diagonalShift:number;
}
type Props={world:World;settings:SimSettings;monitor:WireFeedbackMonitor|null;
 onInstall:(value:WireCascadeOptions)=>void};
const show=(ticks:number[])=>ticks.length?ticks.map(t=>'T'+t).join(', '):'—';
export default function WireFeedbackControls({world,settings,monitor,onInstall}:Props){
 const [enabled,setEnabled]=useState(true);
 const [westShift,setWestShift]=useState(0);
 const [diagonalShift,setDiagonalShift]=useState(0);
 const [outputLength,setOutputLength]=useState(8);
 const [rotation,setRotation]=useState<0|1|2|3>(0);
 const [a,setA]=useState<WireLogicBit>(1);
 const [b,setB]=useState<WireLogicBit>(1);
 const [scan,setScan]=useState<{key:string;rows:WireFeedbackScanRow[]}|null>(null);
 const [probe,setProbe]=useState<WireSignalForecast|null>(null);
 const [probeKey,setProbeKey]=useState('');
 const [error,setError]=useState('');
 const table=useMemo(()=>measureWireFeedback(outputLength,enabled,westShift,diagonalShift),
  [outputLength,enabled,westShift,diagonalShift]);
 const canonical=world.engine==='wireworld'&&world.lattice==='square'&&
  settings.wireDrive==='off'&&settings.wireExciteMin===1&&settings.wireExciteMax===2;
 const scannedKey=[outputLength,westShift].join(':');
 const observed=table.rows[3];
 const opts:WireCascadeOptions={radius:9,outputLength,rotation,a,b,
  feedbackShield:enabled,guardWestShift:westShift,guardDiagonalShift:diagonalShift};
 const monitorKey=monitor?.ports.output.join(':')+':'+monitor?.generation+':'+world.generation;
 const doMeasure=()=>{
  if(!monitor){setError('Install a baseline or guarded physical specimen first.');return;}
  try{
   const {nand,inverter,output,guardPorts}=monitor.ports;
   const selected=[{label:'NAND RETURN PORT',x:nand[0],y:nand[1]},
    {label:'STAGE 2 DETECTOR',x:inverter[0],y:inverter[1]},
    {label:'FINAL AND OUTPUT',x:output[0],y:output[1]},
    ...(guardPorts?.length?[{label:'GUARD 1 CONTACT',x:guardPorts[0][0],y:guardPorts[0][1]}]:[])];
   const res=forecastWireSignals(world,settings,selected,64);
   setProbe(res);setProbeKey(monitorKey);setError('');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 const scanGuards=()=>{
  try{setScan({key:scannedKey,rows:sweepWireFeedback(outputLength,westShift)});setError('');}
  catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 const reset=()=>{setEnabled(true);setWestShift(0);setDiagonalShift(0);setOutputLength(8);};
 return <section className="wave-dynamics-lab wire-feedback-lab"
  aria-label="B11 physically simulated Wireworld return-wave guard lab">
  <div className="wave-dynamics-heading">
   <strong>⤺ B11 · RETURN-WAVE COLLISION LAB</strong>
   <span>REAL ELECTRONS · REAL FEEDBACK · NO MAGIC DIODE</span>
  </div>
  <p className="module-note">Wireworld's electrons can travel BACKWARD. Here a special pair of distant, electrically real guard rails sends timed pulses toward the B9 AND circuit's upstream return corridor. One calibrated pattern blocks the late HEAD at the old NAND output without breaking the final AND. Try mistiming the guards to see when the physics stops cooperating. This is NOT a universal diode.</p>
  <div className="wave-modes">
   <label className="toggle"><input id="wire-feedback-enabled" type="checkbox" checked={enabled}
    onChange={e=>setEnabled(e.target.checked)}/><span>ENABLE TWO PHYSICAL GUARD RAILS</span></label>
  </div>
  <div className="wave-dynamics-meters">
   <div><b id="wire-feedback-fingerprint">{table.truth}</b><span>MEASURED 00 · 01 · 10 · 11</span></div>
   <div><b id="wire-feedback-return">{show(observed.nandPort)}</b><span>ACTUAL NAND PORT HEADS FOR 11</span></div>
   <div><b id="wire-feedback-final">{show(observed.output)}</b><span>ACTUAL FINAL AND HEADS FOR 11</span></div>
  </div>
  <p id="wire-feedback-classification" className="neighborhood-note" role="status">
   {table.classified==='baseline'?'BASELINE B9 · forward AND works, known stage-two return at T12.':
    table.classified==='return-blocked'?
    '✓ VERIFIED LOCAL RETURN SHIELD · AND waveform preserved · no NAND-port HEAD at T12.':
    table.classified==='logic-broken'?
    '⚠ EXPERIMENTAL COLLISION · final AND truth waveform has changed.':
    '◈ EXPERIMENTAL COLLISION · AND intact but the returning electron is still detectable.'}
  </p>
  <label htmlFor="wire-feedback-west" className="input-label">
   Horizontal guard · actual source length adjustment <em>{westShift>0?'+':''}{westShift} cells</em>
  </label>
  <input id="wire-feedback-west" type="range" min="-1" max="1" step="1"
   value={westShift} onChange={e=>setWestShift(Number(e.target.value))} disabled={!enabled}/>
  <label htmlFor="wire-feedback-diagonal" className="input-label">
   Diagonal guard · independently adjusted source length <em>{diagonalShift>0?'+':''}{diagonalShift} cells</em>
  </label>
  <input id="wire-feedback-diagonal" type="range" min="-1" max="1" step="1"
   value={diagonalShift} onChange={e=>setDiagonalShift(Number(e.target.value))} disabled={!enabled}/>
  <p className="neighborhood-note">The guard's two initial HEADS travel along genuine wires. The controls move their physical start positions, not their scheduled times. This layout is calibrated ONLY at radius 9 and with B10's NW/NE bias shifts both zero; other radii are not certified.</p>
  <div className="wave-presets">
   <button id="wire-feedback-reset" type="button" onClick={reset}>↺ RESTORE VERIFIED RETURN SHIELD</button>
   <button id="wire-feedback-scan" type="button" disabled={!enabled} onClick={scanGuards}>
    ⌁ SCAN THREE DIAGONAL GUARD LENGTHS
   </button>
  </div>
  {scan&&<div className="neighborhood-note" id="wire-feedback-scan-results">
   <strong>REAL PHYSICS · HORIZONTAL GUARD FIXED AT {scan.rows[0].westShift}</strong>
   {scan.key!==scannedKey&&<p role="status">⚠ Settings changed since scan. Scan again to update.</p>}
   <table aria-label="Physical guard feedback scan" style={{width:'100%',fontSize:'.76rem'}}>
    <thead><tr><th>DIAG CELLS</th><th>TRUTH</th><th>RETURN PORT FOR 11</th><th>FINAL PORT FOR 11</th><th>BLOCKS RETURN?</th></tr></thead>
    <tbody>{scan.rows.map(row=><tr key={row.diagonalShift}>
     <td>{row.diagonalShift>0?'+':''}{row.diagonalShift}</td>
     <td>{row.truth}</td><td>{show(row.returnTicks)}</td>
     <td>{show(row.finalTicks)}</td><td>{row.blocksKnownReturn?'✓':'—'}</td>
    </tr>)}</tbody>
   </table>
  </div>}
  <div className="wire-feedback-truth" style={{overflowX:'auto'}}>
   <table id="wire-feedback-truth" aria-label="Measured Wireworld guard return AND truth table"
    style={{minWidth:360,width:'100%',fontSize:'.75rem'}}>
    <thead><tr><th>A</th><th>B</th><th>STAGE 2</th><th>NAND PORT</th><th>ONE CELL UPSTREAM</th><th>REMOTE OUTPUT</th></tr></thead>
    <tbody>{table.rows.map(row=><tr key={''+row.a+row.b}>
     <td>{row.a}</td><td>{row.b}</td><td>{show(row.detector)}</td>
     <td>{show(row.nandPort)}</td><td>{show(row.upstreamOne)}</td>
     <td>{show(row.output)}</td>
    </tr>)}</tbody>
   </table>
  </div>
  <p className="neighborhood-note">These are full simulated timelines, not Boolean predictions. A shield can prevent the familiar return at one specific contact while moving electron activity elsewhere. We do NOT claim every backward wave is eliminated or that an arbitrary pulse is blocked from either direction.</p>
  <label htmlFor="wire-feedback-output" className="input-label">
   Final output conductor length <em>{outputLength} cells</em>
  </label>
  <input id="wire-feedback-output" type="range" min="5" max="12" step="1"
   value={outputLength} onChange={e=>setOutputLength(Number(e.target.value))}/>
  <label htmlFor="wire-feedback-rotation" className="input-label">Rotate full physical circuit</label>
  <select id="wire-feedback-rotation" value={rotation}
   onChange={e=>setRotation(Number(e.target.value) as 0|1|2|3)}>
   {[0,1,2,3].map(k=><option key={k} value={k}>{k*90}°</option>)}
  </select>
  <div className="wave-modes">
   <label className="toggle"><input id="wire-feedback-a" type="checkbox" checked={a===1}
    onChange={e=>setA(e.target.checked?1:0)}/><span>SEED A</span></label>
   <label className="toggle"><input id="wire-feedback-b" type="checkbox" checked={b===1}
    onChange={e=>setB(e.target.checked?1:0)}/><span>SEED B</span></label>
  </div>
  <div className="wave-presets">
   <button id="wire-feedback-install" type="button" disabled={!canonical}
    onClick={()=>onInstall(opts)}>⊕ INSTALL REAL FEEDBACK SPECIMEN</button>
  </div>
  {!canonical&&<p role="status" className="neighborhood-note">Choose original square Wireworld 1–2-head ignition and turn external sources OFF. B11 never changes your global physics settings secretly.</p>}
  <p className="neighborhood-note">Installation isolates a bounded region without resetting the universe. A clipped guard wire is rejected atomically. Recipe save keeps the actual conductor and electron states; exporting uses the normal GIF/video pipeline.</p>
  {monitor&&<div className="neighborhood-note" id="wire-feedback-live">
   <strong>LIVE FOUR-STATE RETURN PROBE · STAMPED GEN {monitor.generation}</strong>
   <p>Guard configuration: {monitor.guarded?'two physical rails':'unshielded'}; horizontal {monitor.westShift}; diagonal {monitor.diagonalShift}.</p>
   <div className="wave-presets"><button id="wire-feedback-measure" type="button" onClick={doMeasure}>
    ◉ MEASURE REAL CURRENT-WORLD FEEDBACK · 64 TICKS
   </button></div>
   {error&&<p role="alert">{error}</p>}
   {probe&&<div id="wire-feedback-measurement">
    {probeKey!==monitorKey&&<p role="status">⚠ Canvas generation or installed circuit changed. Re-measure.</p>}
    {probe.traces.map(row=><p key={row.label}>{row.label}: {row.headTicks.length?show(row.headTicks):'NO HEAD'}</p>)}
    <p>The current-stage scan is independent of the isolated lab and never advances your actual canvas.</p>
   </div>}
  </div>}
 </section>;
}
