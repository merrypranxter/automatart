import {useMemo} from 'react';
import {inspectWireInhibition} from '../engine/wire-inhibition';
import type {WireLogicBit} from '../engine/wire-logic';
interface Props{kind:'nand'|'not'|'nor'|'nae';radius:number;}
const names=['VOID','CONDUCTOR','HEAD','TAIL'];
export default function WireInhibitionInspector({kind,radius}:Props){
 const cases=useMemo(()=>{
  const bits:WireLogicBit[][]=kind==='nae'?
   [[0,0,0],[0,0,1],[0,1,0],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1]]:
   kind==='not'?[[0,0],[1,0]]:[[0,0],[0,1],[1,0],[1,1]];
  return bits.map(([a,b,c=0])=>inspectWireInhibition(kind,radius,a,b,c));
 },[kind,radius]);
 const formula=kind==='nand'?'1 + A + B':kind==='not'?'2 + A':
  kind==='nor'?'2 + A + B':'A + B + C';
 return <section className="wire-inhibition-inspector" aria-label="Real physical Wireworld collision microscope">
  <strong className="input-label">B7/B8 · COLLISION MICROSCOPE · TRUE NEIGHBOR CENSUS</strong>
  <p className="neighborhood-note">Original Wireworld conducts only with 1–2 real neighboring HEADS. Zero produces no ignition; three or more inhibit it. No custom Boolean cell rule, shader effect or fake waveform.</p>
  <table aria-label="Actual four-state collision head-count microscope" style={{width:'100%',fontSize:'.8rem'}}>
   <thead><tr><th>A</th>{kind!=='not'&&<th>B</th>}{kind==='nae'&&<th>C</th>}
    <th>HEADS AT T0</th><th>CENTER AT T1</th><th>OUTPUT ARRIVAL</th><th>PASS</th></tr></thead>
   <tbody>{cases.map(item=><tr key={item.a+':'+item.b+':'+item.c}>
    <td>{item.a}</td>{kind!=='not'&&<td>{item.b}</td>}{kind==='nae'&&<td>{item.c}</td>}
    <td>{item.neighborHeads[0]}</td>
    <td>{names[item.junctionStates[1]]}</td>
    <td>{item.outputHeadTicks.length?item.outputHeadTicks.map(t=>'T'+t).join(', '):'NONE'}</td>
    <td>{item.exact?'✓':'✕'}</td>
   </tr>)}</tbody>
  </table>
  <div className="wave-dynamics-meters">
   <div><b id="wire-inhibition-rule">{formula}</b><span>PHYSICAL INITIAL HEAD COUNT</span></div>
   <div><b id="wire-inhibition-certified">{cases.every(x=>x.exact)?'PASS':'FAIL'}</b><span>ALL REMOTE OUTPUT WAVES VERIFIED</span></div>
  </div>
  <p className="neighborhood-note">Every TRUE result is exactly one measured HEAD at the distant port at tick {radius+1}; a FALSE result is no HEAD over the full test window. {kind==='nae'?'The eight truth rows include both the empty 000 and oversaturated 111 cases.':''}</p>
 </section>;
}