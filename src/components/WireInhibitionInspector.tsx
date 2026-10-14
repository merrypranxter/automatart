import {useMemo} from 'react';
import {inspectWireInhibition} from '../engine/wire-inhibition';
import type {WireLogicBit} from '../engine/wire-logic';

interface Props{
 kind:'nand'|'not';
 radius:number;
}
const names=['VOID','CONDUCTOR','HEAD','TAIL'];
export default function WireInhibitionInspector({kind,radius}:Props){
 const cases=useMemo(()=>{
  const bits:WireLogicBit[][]=kind==='nand'?[[0,0],[0,1],[1,0],[1,1]]:[[0,0],[1,0]];
  return bits.map(([a,b])=>inspectWireInhibition(kind,radius,a,b));
 },[kind,radius]);
 return <section className="wire-inhibition-inspector" aria-label="B7 actual physical Wireworld inhibition microscope">
  <strong className="input-label">B7 · COLLISION MICROSCOPE · ACTUAL NEIGHBOR CENSUS</strong>
  <p className="neighborhood-note">The center conductor ignites only when 1–2 of its eight neighbors are HEADS. NAND has one fixed HEAD plus A and B; NOT has two fixed HEADS plus A. Three HEADS suppress ignition. These numbers and states are sampled from the actual stepper, not calculated from a fake Boolean gate.</p>
  <table aria-label="Four-state NAND and NOT real Moore-neighbor physics" style={{width:'100%',fontSize:'.8rem'}}>
   <thead><tr><th>A</th>{kind==='nand'&&<th>B</th>}<th>HEADS AT T0</th><th>CENTER AT T1</th><th>OUTPUT ARRIVAL</th><th>PASS</th></tr></thead>
   <tbody>{cases.map(item=><tr key={item.a+':'+item.b}>
    <td>{item.a}</td>{kind==='nand'&&<td>{item.b}</td>}
    <td>{item.neighborHeads[0]}</td>
    <td>{names[item.junctionStates[1]]}</td>
    <td>{item.outputHeadTicks.length?item.outputHeadTicks.map(t=>'T'+t).join(', '):'NONE'}</td>
    <td>{item.exact?'✓':'✕'}</td>
   </tr>)}</tbody>
  </table>
  <div className="wave-dynamics-meters">
   <div><b id="wire-inhibition-rule">{kind==='nand'?'1 + A + B':'2 + A'}</b><span>REAL INITIAL HEAD CONTACTS</span></div>
   <div><b id="wire-inhibition-certified">{cases.every(x=>x.exact)?'PASS':'FAIL'}</b><span>ALL REMOTE OUTPUT WAVES VERIFIED</span></div>
  </div>
  <p className="neighborhood-note">Every predicted output is a true electron HEAD at the far end of a diagonal conductor. A FALSE result means no HEAD arrives during the full measured window, not merely that a pixel is dim at one chosen instant. Every enabled TRUE case produces exactly one HEAD at generation {radius+1}.</p>
 </section>;
}
