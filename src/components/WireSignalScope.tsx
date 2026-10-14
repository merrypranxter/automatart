import {useState} from 'react';
import type {SimSettings,World} from '../engine/types';
import {forecastWireSignals,type WireSignalForecast,type WireSignalProbe} from '../engine/wire-signal-scope';
import type {WireLogicMonitor} from './WireLogicControls';

const NAMES=['VOID','WIRE','HEAD','TAIL'];
const COLORS=['#0b1420','#527485','#fae854','#ff477c'];

interface Props{
 world:World;
 settings:SimSettings;
 monitor:WireLogicMonitor|null;
 inspectedCell:[number,number]|null;
}
export default function WireSignalScope({world,settings,monitor,inspectedCell}:Props){
 const [horizon,setHorizon]=useState(32);
 const [report,setReport]=useState<WireSignalForecast|null>(null);
 const [revision,setRevision]=useState('');
 const [error,setError]=useState('');
 const inputs:WireSignalProbe[]=[
  ...(monitor?.ports.outputs??[]).map(([x,y],i)=>({label:'OUTPUT '+(i+1),x,y})),
  ...(inspectedCell?[{label:'INSPECTED',x:inspectedCell[0],y:inspectedCell[1]}]:[])
 ].filter((p,i,list)=>i===list.findIndex(q=>q.x===p.x&&q.y===p.y)).slice(0,4);
 const token=[
  world.generation,world.width,world.height,world.engine,
  settings.seed,settings.wrap,settings.wireExciteMin,settings.wireExciteMax,
  settings.wireDrive,settings.wirePeriod,settings.wireSource,settings.wireSparkRate,
  horizon,inputs.map(p=>p.x+':'+p.y).join(';')
 ].join('|');
 const stale=report!==null&&revision!==token;
 const scan=()=>{
  try{
   if(!inputs.length)throw Error('Install a gate or tap a cell on the artwork first.');
   const result=forecastWireSignals(world,settings,inputs,horizon);
   setReport(result);setRevision(token);setError('');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 return <section className="wave-dynamics-lab" aria-label="Wireworld B5 true state electrical scope">
  <div className="wave-dynamics-heading">
   <strong>◉ B5 · LIVE UNIVERSE SIGNAL SCOPE</strong>
   <span>SIMULATED FROM YOUR ACTUAL CURRENT CANVAS</span>
  </div>
  <p className="module-note">This instrument scans true four-state signal evolution from your CURRENT artwork, not the isolated ideal-gate demonstration. It reads installed output ports plus the cell you last tapped. It uses your current rules, seed, clock and other sources, but evolves a private copy—the original stage does NOT move.</p>
  <div className="wave-modes" role="group" aria-label="Signal scope future horizon">
   {[16,32,64].map(n=><button type="button" key={n} id={'wire-scope-horizon-'+n}
    aria-pressed={horizon===n} className={horizon===n?'selected':''}
    onClick={()=>setHorizon(n)}>{n} GENERATIONS</button>)}
  </div>
  <div className="wave-presets">
   <button id="wire-scope-scan" type="button" onClick={scan}>
    ⌁ MEASURE REAL SIGNALS
   </button>
  </div>
  {inputs.length===0&&<p className="neighborhood-note">To add a probe, install a verified logic circuit above, or tap any cell on the stage. The canvas always stays visible.</p>}
  {error&&<p role="alert" className="cyclic-dynamics-status">{error}</p>}
  {report&&<div id="wire-scope-result">
   <p className="neighborhood-note" role="status">
    {stale?'⚠ The artwork, rules, probe site or horizon may have changed. Run the scan again.':
     '✓ Exact snapshot at generation '+report.fromGeneration+' · '+report.horizon+' ticks · '+report.traces.length+' actual probe sites.'}
    {report.driven?' Optional external sources ARE included in this measured projection.':' Canonical unforced Wireworld source mode.'}
   </p>
   <div style={{display:'flex',flexWrap:'wrap',gap:10,fontSize:'.72rem',marginBottom:8}}>
    {NAMES.map((label,i)=><span key={label}><span style={{display:'inline-block',width:10,height:10,background:COLORS[i],marginRight:4}}/>{i} {label}</span>)}
   </div>
   {report.traces.map(trace=><div key={trace.label+trace.x+','+trace.y} style={{marginBottom:12}}>
    <strong style={{fontSize:'.83rem'}}>{trace.label} · ({trace.x},{trace.y})</strong>
    <span style={{display:'block',fontSize:'.72rem',margin:'4px 0'}}>
     {trace.headTicks.length?'HEAD on tick(s) '+trace.headTicks.join(', '):'No electron HEAD reached this site within the measured horizon.'}
    </span>
    <div role="img" aria-label={trace.label+' exact four-state history across '+report.horizon+' generations'}
     style={{display:'flex',gap:1,height:21,width:'100%'}}>
     {trace.states.map((state,tick)=><span key={tick} title={'GEN '+(report.fromGeneration+tick)+': '+NAMES[state]}
       style={{flex:1,minWidth:1,background:COLORS[state]??'#000'}}/>)}
    </div>
   </div>)}
   <p className="neighborhood-note">Every stripe represents ONE genuine full simulation generation. HEAD and TAIL are different states. The scan is a finite future projection, not a promise after you edit the artwork; re-run after any changes. Live playback, saved recipes, and exports are unaffected.</p>
  </div>}
 </section>;
}
