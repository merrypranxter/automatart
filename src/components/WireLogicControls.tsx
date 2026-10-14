import {useMemo,useState} from 'react';
import type {SimSettings,World} from '../engine/types';
import WireSignalScope from './WireSignalScope';
import {runWireLogicBench,type WireLogicKind,type WireLogicOptions,type WireLogicPorts,
 type WireLogicBit} from '../engine/wire-logic';

export interface WireLogicMonitor {
 ports:WireLogicPorts;
 installedAt:number;
 kind:WireLogicKind;
}
interface Props{
 world:World;
 settings:SimSettings;
 inspectedCell:[number,number]|null;
 monitor:WireLogicMonitor|null;
 onInstall:(opts:WireLogicOptions)=>void;
}
export default function WireLogicControls({world,settings,inspectedCell,monitor,onInstall}:Props){
 const [kind,setKind]=useState<WireLogicKind>('or');
 const [radius,setRadius]=useState(9);
 const [rotation,setRotation]=useState<0|1|2|3>(0);
 const [a,setA]=useState<WireLogicBit>(1);
 const [b,setB]=useState<WireLogicBit>(1);
 const bench=useMemo(()=>runWireLogicBench(kind,radius),[kind,radius]);
 const center=[Math.floor(world.width/2),Math.floor(world.height/2)];
 const opts:WireLogicOptions={kind,radius,rotation,a,b};
 const current=monitor?.ports.outputs.map(([x,y])=>world.cells[y*world.width+x])??[];
 const currentNames=['VOID','CONDUCTOR','HEAD','TAIL'];
 return <section className="wave-dynamics-lab wire-logic-lab" aria-label="B4/B5 verified mathematical Wireworld logic bench">
  <div className="wave-dynamics-heading">
   <strong>⊞ B4/B5 · WIREWORLD LOGIC BENCH</strong><span>CANONICAL FOUR-STATE TRUTH TABLES</span>
  </div>
  <p className="module-note">This is a REAL logic test bench. OR and fanout use a head/tail pulse; XOR uses two synchronized initial HEAD contacts per asserted bit. A true output means a HEAD actually reaches the remote output port during the measured time window. Every row is evolved through the exact production Wireworld stepper, without a special gate law, hidden sources, or animation tricks.</p>
  <label htmlFor="logic-device" className="input-label">CERTIFIED CIRCUIT</label>
  <select id="logic-device" value={kind} onChange={e=>setKind(e.target.value as WireLogicKind)}>
   <option value="or">TWO-INPUT OR · A ∨ B</option>
   <option value="xor">DUAL-CONTACT XOR · A ⊕ B</option>
   <option value="fanout">ONE-INPUT FANOUT · A → 2 outputs</option>
  </select>
  <label className="input-label" htmlFor="logic-radius">Signal path length <em>{radius} lattice cells</em></label>
  <input id="logic-radius" type="range" min="7" max="12" step="1" value={radius}
   onChange={e=>setRadius(Number(e.target.value))}/>
  <label className="input-label" htmlFor="logic-rotation">Rotate complete circuit</label>
  <select id="logic-rotation" value={rotation}
   onChange={e=>setRotation(Number(e.target.value) as 0|1|2|3)}>
   {[0,1,2,3].map(k=><option key={k} value={k}>{90*k}°</option>)}
  </select>
  <div className="wire-logic-truth-table">
   <strong className="input-label">MEASURED BOOLEAN TRUTH TABLE</strong>
   <table aria-label="Real Wireworld four-state simulation logic truth table" style={{width:'100%',borderCollapse:'collapse',fontSize:'.85rem'}}>
    <thead><tr><th>A</th>{(kind==='or'||kind==='xor')&&<th>B</th>}<th>{kind==='or'?'OUT · A∨B':kind==='xor'?'OUT · A⊕B':'OUT 1'}</th>{kind==='fanout'&&<th>OUT 2</th>}<th>FIRST HEAD</th><th>TEST</th></tr></thead>
    <tbody>{bench.cases.map(({a:bitA,b:bitB,hits,firstTick,pass})=><tr key={''+bitA+bitB}>
     <td>{bitA}</td>{(kind==='or'||kind==='xor')&&<td>{bitB}</td>}
     {hits.map((hit,i)=><td key={i}>{hit?'1':'0'}</td>)}
     <td>{firstTick.map(t=>t===null?'—':'T'+t).join(' / ')}</td>
     <td>{pass?'✓':'✕'}</td>
    </tr>)}</tbody>
   </table>
   <p id="logic-certification" className="neighborhood-note" role="status">
    {bench.allPass?'✓ ALL CASES VERIFIED with canonical Wireworld 1–2-head physics.':
     '✕ This configuration did not pass its own physical tests. Do not treat it as a verified gate.'}
   </p>
  </div>
  <strong className="input-label">OUTPUT OSCILLOSCOPE · ACTUAL HEAD EVENTS OVER TIME</strong>
  {bench.cases.map(row=><div key={'scope-'+row.a+row.b} style={{marginBottom:8}}>
   <div style={{fontSize:'.78rem',marginBottom:2}}>INPUT {kind==='fanout'?row.a+'0':''+row.a+row.b} · {row.hits.map(v=>v?'PULSE':'QUIET').join(' / ')}</div>
   {row.waveforms.map((values,index)=><div key={index} style={{display:'flex',gap:1,alignItems:'center',marginBottom:3}}>
    <span style={{fontSize:'.65rem',width:39}}>OUT {index+1}</span>
    <div role="img" aria-label={'Output '+(index+1)+' head trace across '+values.length+' true generations'}
     style={{display:'flex',flex:1,gap:1,height:12,minWidth:0}}>
     {values.map((v,tick)=><span key={tick} title={'Tick '+tick+(v?' · ELECTRON HEAD':' · no head')}
       style={{flex:1,minWidth:1,background:v?'#f8eb51':'#34505d',borderRadius:1}}/>)}
    </div>
   </div>)}
  </div>)}
  <p className="neighborhood-note">Each colored pulse is a real HEAD at the remote output cell during that generation. The oscilloscope reruns the source physics on isolated conductor geometry, not a decorative waveform. This is a single-shot truth table, not an eternal clock.</p>
  <strong className="input-label">WIRE IT INTO YOUR LIVE CANVAS</strong>
  <div className="wave-modes">
   <label className="toggle"><input id="logic-input-a" type="checkbox" checked={a===1}
    onChange={e=>setA(e.target.checked?1:0)}/><span>INPUT A pulse</span></label>
   {(kind==='or'||kind==='xor')&&<label className="toggle"><input id="logic-input-b" type="checkbox" checked={b===1}
    onChange={e=>setB(e.target.checked?1:0)}/><span>INPUT B pulse</span></label>}
  </div>
  <div className="wave-presets">
   <button type="button" id="logic-install" disabled={!bench.allPass||world.engine!=='wireworld'}
    onClick={()=>onInstall(opts)}>⊕ INSTALL VERIFIED {kind==='or'?'OR GATE':kind==='xor'?'XOR GATE':'FANOUT'} AT CENTER</button>
  </div>
  {kind==='xor'&&<p className="neighborhood-note">XOR uses TWO real initial electron HEAD contacts for A and TWO for B. One bit alone activates the diagonal conductor; both bits create four adjacent heads at the junction and block ignition via the authentic Wireworld threshold. This is a dual-contact single-shot XOR, not a standard single-rail clocked gate. It requires isolated geometry and canonical 1–2 physics.</p>}
  <p className="neighborhood-note">The installer clears a small local buffer before writing a conductor device and selected input pulses directly into your current universe. Outside that local region your artwork is untouched. The simulation pauses so you can inspect the result; PLAY advances the actual circuit from the current generation.</p>
  {monitor&&<div className="neighborhood-note" id="wire-logic-live-probe">
   <strong>LIVE PROBES · {monitor.kind.toUpperCase()} · INSTALLED AT GENERATION {monitor.installedAt}</strong>
   <div>{monitor.ports.outputs.map(([x,y],i)=><span key={i} style={{display:'inline-block',marginRight:12}}>
    OUT {i+1} ({x},{y}) · {currentNames[current[i]]??'?'}
   </span>)}</div>
   <small>These sample the actual current-world cells. Moving/painting nearby, adding electrodes, or changing the physics can change the output; the certification above applies to isolated canonical Wireworld only.</small>
  </div>}
  <WireSignalScope world={world} settings={settings} monitor={monitor} inspectedCell={inspectedCell}/>
  <p className="neighborhood-note">No AND, NAND or insulated crossing is advertised here. A visually plausible junction is not a verified logic device. Those will enter the library only when each one passes full 00/01/10/11 output tests under the original physics.</p>
 </section>;
}
