import type {Dispatch,SetStateAction} from 'react';
import type {SimSettings,NeighborShape} from '../engine/types';
import {neighborOffsets} from '../engine/topology';
import {DIRECTIONS,maxNeighborCount,neighborhoodLabel} from '../engine/neighborhood';
interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>}
const SAMPLES:readonly {id:NeighborShape;label:string;help:string}[]=[
 {id:'moore',label:'MOORE · 8 CELLS',help:'The eight nearest surrounding cells; classic Moore neighborhood.'},
 {id:'vonNeumann',label:'VON NEUMANN · 4 CELLS',help:'Only the four edge-connected cells vote.'},
 {id:'square2',label:'RADIUS-2 MOORE · 24 CELLS',help:'The full 5×5 square around the center, excluding the center.'},
 {id:'diamond2',label:'RADIUS-2 DIAMOND · 12 CELLS',help:'Every cell at Manhattan distance 1 or 2, no diagonal corners.'},
 {id:'directional',label:'DIRECTIONAL · CHOOSE DIRECTIONS',help:'Your selected nearby compass directions vote; all others are completely ignored.'}
];
export default function NeighborhoodControls({settings:s,setSettings}:Props){
 const entry=SAMPLES.find(x=>x.id===s.neighborShape)??SAMPLES[0];
 const cap=maxNeighborCount(s);
 const setShape=(shape:NeighborShape)=>setSettings(v=>{
  const next={...v,neighborShape:shape};
  const limit=maxNeighborCount(next);
  return {...next,cyclicThreshold:Math.min(v.cyclicThreshold,Math.max(1,limit)),
    exciteThreshold:Math.min(v.exciteThreshold,Math.max(1,limit)),
    speciesBirth:Math.min(v.speciesBirth,Math.max(1,limit)),
    speciesSurvive:Math.min(v.speciesSurvive,limit),
    speciesAttackBias:Math.min(v.speciesAttackBias,limit)};
 });
 const setDirection=(bit:number)=>setSettings(v=>{
  const next=v.neighborMask^(1<<bit);
  if(next===0)return v; // a selected direction is required
  const updated={...v,neighborMask:next};
  const cap=maxNeighborCount(updated);
  return {...updated,cyclicThreshold:Math.min(v.cyclicThreshold,cap),
   exciteThreshold:Math.min(v.exciteThreshold,cap),
   speciesBirth:Math.min(v.speciesBirth,cap),speciesSurvive:Math.min(v.speciesSurvive,cap),
   speciesAttackBias:Math.min(v.speciesAttackBias,cap)};
 });
 const offsets=new Set(neighborOffsets('square',2,2,s.neighborShape,s.neighborMask).map(([dx,dy])=>dx+','+dy));
 return <div className="neighborhood-lab" aria-label="B1 mathematical neighborhood controls">
  <div className="neighborhood-head"><strong>B1 · NEIGHBORHOOD ANARCHY</strong><span>REAL CA RULE</span></div>
  <label className="input-label" htmlFor="neighbor-shape">Neighborhood geometry</label>
  <select id="neighbor-shape" value={s.neighborShape} onChange={e=>setShape(e.target.value as NeighborShape)}>
   {SAMPLES.map(entry=><option key={entry.id} value={entry.id}>{entry.label}</option>)}
  </select>
  <p className="module-note">{entry.help} The selected cells actually determine the next generation; no cosmetic overlay.</p>
  <div className="neighborhood-display">
   <div className="neighborhood-preview" role="img" aria-label={'Highlighted actual neighborhood '+neighborhoodLabel(s)}>
    {Array.from({length:25},(_,i)=>{
      const dx=i%5-2,dy=Math.floor(i/5)-2,active=offsets.has(dx+','+dy),center=dx===0&&dy===0;
      return <span key={i} className={center?'center':active?'active':''}>{center?'✳':active?'•':''}</span>;
    })}
   </div>
   <div className="neighborhood-count"><b>{cap}</b><span>ACTUAL NEIGHBORS</span><small>{s.wrap?'TOROIDAL WRAP':'FINITE EDGES'} · CENTER EXCLUDED</small></div>
  </div>
  {s.neighborShape==='directional'&&<>
    <p className="module-note">Tap the compass positions to select the neighbors that vote. This fixed stencil is a legitimate local rule, not a visual rotation.</p>
    <div className="direction-grid neighborhood-directions">
      {DIRECTIONS.map(dir=>dir.bit===-1?
       <span className="direction-center" key="center">✳</span>:
       <button key={dir.bit} type="button" aria-label={'Neighborhood '+dir.label}
        aria-pressed={!!(s.neighborMask&(1<<dir.bit))}
        className={(s.neighborMask&(1<<dir.bit))?'selected':''}
        disabled={s.neighborMask===(1<<dir.bit)}
        onClick={()=>setDirection(dir.bit)}>{dir.label}</button>)}
    </div>
    <div className="chip-row">
      <button type="button" className="chip" onClick={()=>setSettings(v=>({...v,neighborMask:255}))}>ALL 8</button>
      <button type="button" className="chip" onClick={()=>setSettings(v=>({...v,neighborMask:170}))}>CARDINAL 4</button>
      <button type="button" className="chip" onClick={()=>setSettings(v=>({...v,neighborMask:14}))}>NE CORNER</button>
      <button type="button" className="chip" onClick={()=>setSettings(v=>({...v,neighborMask:224}))}>SW CORNER</button>
    </div>
  </>}
  <p className="neighborhood-note">The rule stays synchronous. Standard Life B/S preset numbers remain literal counts; use CUSTOM B/S for birth or survival counts beyond eight. B2 will add a freehand 5×5 stencil editor.</p>
 </div>;
}
