import {useMemo} from 'react';
import type {WireLogicKind} from '../engine/wire-logic';
import {runWireThresholdSpectrum} from '../engine/wire-threshold-spectrum';
type Props={kind:WireLogicKind;radius:number};
export default function WireThresholdSpectrum({kind,radius}:Props){
 const spectrum=useMemo(()=>runWireThresholdSpectrum(kind,radius),[kind,radius]);
 const keys=spectrum[0].rows.map(r=>kind==='nae'?''+r.a+r.b+r.c:
  kind==='not'||kind==='fanout'?''+r.a:''+r.a+r.b);
 return <section className="wire-threshold-spectrum" aria-label="B8 genuine alternate Wireworld excitation spectrum">
  <strong className="input-label">B8 · THRESHOLD SPECTRUM · FIVE REAL PHYSICS LAWS</strong>
  <p className="neighborhood-note">Same conductor geometry and same seeded input heads, evolved five different ways through the production Wireworld cell transition. Changing the allowed neighboring HEAD count changes the very Boolean operation performed by your artwork. These simulated comparisons do not alter the live canvas or its current settings.</p>
  <div style={{overflowX:'auto',paddingBottom:6}} role="region" aria-label="Scroll to compare all real physical input truth rows">
   <table id="wire-threshold-spectrum" aria-label="Five measured four-state Wireworld truth fingerprints" style={{borderCollapse:'collapse',fontSize:'.73rem',minWidth:kind==='nae'?410:310,width:'100%'}}>
    <thead><tr><th style={{textAlign:'left',minWidth:92}}>IGNITION LAW</th>
     {keys.map((key,i)=><th key={i}>{key}</th>)}
     </tr></thead>
    <tbody>{spectrum.map(({law,rows,fingerprint})=><tr key={law.id} data-law={law.id}>
     <th style={{textAlign:'left',fontWeight:600}}>{law.label}</th>
     {rows.map((entry,i)=><td key={i} title={'INPUT '+keys[i]+' · '+(entry.ticks.length?'HEAD at '+entry.ticks.join(', '):'no HEAD in window')} style={{textAlign:'center',padding:'5px 3px'}}>
      <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:4,fontWeight:700,
       background:entry.head?'#d9ff4b':'#223d52',color:entry.head?'#132027':'#88a9bc'}}>{entry.head?'1':'0'}</span>
     </td>)}
    </tr>)}</tbody>
   </table>
  </div>
  <p id="wire-threshold-fingerprint" className="neighborhood-note">
   Canonical fingerprint: <strong>{spectrum[1].fingerprint}</strong>.
   {kind==='nae'?' The 000 and 111 columns are both silent only under the canonical 1–2-head window.':''}
  </p>
  <p className="neighborhood-note">Truth-table cells mean that an actual electron HEAD reached the measured remote port at least once. Hover a cell for its measured tick(s). This is a finite-horizon physical test, not a Boolean function drawn on top of the art. Modified laws are intentionally <strong>not</strong> certified as classic Wireworld.</p>
 </section>;
}