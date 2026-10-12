import {useRef} from 'react';
import type {Dispatch,SetStateAction,PointerEvent as ReactPointerEvent} from 'react';
import type {SimSettings,NeighborShape} from '../engine/types';
import {neighborOffsets} from '../engine/topology';
import {DIRECTIONS,maxNeighborCount,neighborhoodLabel,normalizeActiveVotes} from '../engine/neighborhood';
import {stencilBit,toggleStencil,resizeStencil,rotateStencil,mirrorStencil,
 invertStencil,seededStencil,stencilPreset,STENCIL_CENTER_BIT} from '../engine/stencil';
import type {StencilPreset,StencilSize} from '../engine/stencil';
interface Props {settings:SimSettings;setSettings:Dispatch<SetStateAction<SimSettings>>}
const SAMPLES:readonly {id:NeighborShape;label:string;help:string}[]=[
 {id:'moore',label:'MOORE · 8 CELLS',help:'The eight nearest surrounding cells; classic Moore neighborhood.'},
 {id:'vonNeumann',label:'VON NEUMANN · 4 CELLS',help:'Only the four edge-connected cells vote.'},
 {id:'square2',label:'RADIUS-2 MOORE · 24 CELLS',help:'The full 5×5 square around the center, excluding the center.'},
 {id:'diamond2',label:'RADIUS-2 DIAMOND · 12 CELLS',help:'Every cell at Manhattan distance 1 or 2, no diagonal corners.'},
 {id:'directional',label:'DIRECTIONAL · CHOOSE DIRECTIONS',help:'Your selected nearby compass directions vote; all others are completely ignored.'},
 {id:'custom',label:'CUSTOM · PAINT A 3×3 / 5×5 STENCIL',help:'Draw which actual neighbors get counted by the rule. No pixels are faked.'}
];
export default function NeighborhoodControls({settings:s,setSettings}:Props){
 const entry=SAMPLES.find(x=>x.id===s.neighborShape)??SAMPLES[0];
 const cap=maxNeighborCount(s);
 const roll=useRef(0);
 const drag=useRef<{id:number;on:boolean;last:number}|null>(null);
 const setShape=(shape:NeighborShape)=>setSettings(v=>
   normalizeActiveVotes({...v,neighborShape:shape}));
 const setDirection=(bit:number)=>setSettings(v=>{
  const mask=v.neighborMask^(1<<bit);
  return mask===0?v:normalizeActiveVotes({...v,neighborMask:mask});
 });
 const setMask=(mask:number)=>setSettings(v=>
   normalizeActiveVotes({...v,neighborMask:mask}));
 const changeStencil=(mask:number,size:StencilSize=s.customStencilSize)=>
  setSettings(v=>normalizeActiveVotes({...v,customStencilSize:size,
    customStencilMask:resizeStencil(mask,size)}));
 const paintBit=(bit:number,on:boolean)=>setSettings(v=>{
  const mask=toggleStencil(v.customStencilMask,v.customStencilSize,bit,on);
  return mask===v.customStencilMask?v:
    normalizeActiveVotes({...v,customStencilMask:mask});
 });
 const hit=(e:ReactPointerEvent<HTMLDivElement>):number=>{
  const rect=e.currentTarget.getBoundingClientRect(),size=s.customStencilSize;
  const x=Math.floor((e.clientX-rect.left)/rect.width*size);
  const y=Math.floor((e.clientY-rect.top)/rect.height*size);
  if(x<0||y<0||x>=size||y>=size)return -1;
  return stencilBit(x-(size-1)/2,y-(size-1)/2);
 };
 const pointerDown=(e:ReactPointerEvent<HTMLDivElement>)=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const bit=hit(e);
  if(bit<0||bit===STENCIL_CENTER_BIT)return;
  const on=!(s.customStencilMask&(1<<bit));
  drag.current={id:e.pointerId,on,last:bit};
  e.currentTarget.setPointerCapture(e.pointerId);
  paintBit(bit,on);
  e.preventDefault();
 };
 const pointerMove=(e:ReactPointerEvent<HTMLDivElement>)=>{
  const stroke=drag.current;
  if(!stroke||stroke.id!==e.pointerId)return;
  const bit=hit(e);
  if(bit<0||bit===STENCIL_CENTER_BIT||bit===stroke.last)return;
  stroke.last=bit;paintBit(bit,stroke.on);
 };
 const pointerUp=(e:ReactPointerEvent<HTMLDivElement>)=>{
  if(drag.current?.id===e.pointerId)drag.current=null;
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 };
 const randomStencil=()=>{
  roll.current++;
  setSettings(v=>normalizeActiveVotes({...v,
   customStencilMask:seededStencil((v.seed^Math.imul(roll.current,0x9e3779b1))>>>0,v.customStencilSize)}));
 };
 const offsets=new Set(neighborOffsets('square',2,2,s.neighborShape,s.neighborMask,
  s.customStencilMask,s.customStencilSize).map(([dx,dy])=>dx+','+dy));
 const custom=s.neighborShape==='custom';
 const size=s.customStencilSize;
 return <div className="neighborhood-lab" aria-label="B2 mathematical neighborhood controls">
  <div className="neighborhood-head"><strong>B2 · NEIGHBORHOOD ANARCHY</strong><span>ACTUAL CELL RULES</span></div>
  <label className="input-label" htmlFor="neighbor-shape">Neighborhood geometry</label>
  <select id="neighbor-shape" value={s.neighborShape} onChange={e=>setShape(e.target.value as NeighborShape)}>
   {SAMPLES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
  </select>
  <p className="module-note">{entry.help} The highlighted cells determine the next generation—not a visual effect.</p>
  <div className="neighborhood-display">
   <div className="neighborhood-preview" role="img" aria-label={'Highlighted actual neighborhood '+neighborhoodLabel(s)}>
    {Array.from({length:25},(_,i)=>{
     const dx=i%5-2,dy=Math.floor(i/5)-2,active=offsets.has(dx+','+dy),center=dx===0&&dy===0;
     return <span key={i} className={center?'center':active?'active':''}>{center?'✳':active?'•':''}</span>;
    })}
   </div>
   <div className="neighborhood-count" aria-live="polite"><b>{cap}</b><span>ACTUAL NEIGHBORS</span>
    <small>{s.wrap?'TOROIDAL WRAP':'FINITE EDGES'} · CENTER EXCLUDED</small></div>
  </div>
  {s.neighborShape==='directional'&&<>
   <p className="module-note">Tap compass positions to choose which neighbors vote.</p>
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
    <button type="button" className="chip" onClick={()=>setMask(255)}>ALL 8</button>
    <button type="button" className="chip" onClick={()=>setMask(170)}>CARDINAL 4</button>
    <button type="button" className="chip" onClick={()=>setMask(14)}>NE CORNER</button>
    <button type="button" className="chip" onClick={()=>setMask(224)}>SW CORNER</button>
   </div>
  </>}
  {custom&&<section className="stencil-studio" aria-label="Paint your own local neighborhood">
    <div className="stencil-heading">
     <strong>DRAW THE NEIGHBORHOOD</strong>
     <span>{size}×{size} · {cap} VOTERS</span>
    </div>
    <div className="stencil-size-pick" role="group" aria-label="Stencil dimensions">
     {([3,5] as const).map(n=><button key={n} type="button"
      className={size===n?'selected':''} aria-pressed={size===n}
      onClick={()=>changeStencil(s.customStencilMask,n)}>{n}×{n}</button>)}
    </div>
    <p className="module-note">Tap a cell to toggle it. Drag your finger to paint or erase neighbors. The center ✳ never votes.</p>
    <div className="stencil-grid" data-size={size} role="group"
     aria-label={size+' by '+size+' editable neighbor stencil'}
     onPointerDown={pointerDown} onPointerMove={pointerMove}
     onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      {Array.from({length:size*size},(_,index)=>{
       const x=index%size-(size-1)/2;
       const y=Math.floor(index/size)-(size-1)/2;
       const bit=stencilBit(x,y);
       const center=bit===STENCIL_CENTER_BIT,active=!!(s.customStencilMask&(1<<bit));
       return <button key={bit} type="button"
        data-stencil-bit={bit} aria-label={center?'Center cell excluded':('Neighbor '+x+','+y)}
        aria-pressed={center?false:active} disabled={center}
        className={center?'center':active?'selected':''}
        onClick={e=>{if(e.detail===0&&!center)paintBit(bit,!active);}}>
         {center?'✳':active?'●':'·'}
       </button>;
      })}
    </div>
    <div className="stencil-tools" role="group" aria-label="Stencil transformations">
     <button type="button" onClick={()=>changeStencil(rotateStencil(s.customStencilMask,size))}>↻ ROTATE 90°</button>
     <button type="button" onClick={()=>changeStencil(rotateStencil(s.customStencilMask,size,false))}>↺ ROTATE −90°</button>
     <button type="button" onClick={()=>changeStencil(mirrorStencil(s.customStencilMask,size))}>⇄ MIRROR</button>
     <button type="button" onClick={()=>changeStencil(invertStencil(s.customStencilMask,size))}>◐ INVERT</button>
     <button type="button" onClick={randomStencil}>⚄ SEEDED SURPRISE</button>
    </div>
    <div className="stencil-presets">
     <span>QUICK MUTATIONS</span>
     <div className="chip-row">{(['fan','hook','ring','claw'] as StencilPreset[]).map(p=>
      <button type="button" className="chip" key={p}
       onClick={()=>changeStencil(stencilPreset(p,size))}>{p.toUpperCase()}</button>)}</div>
    </div>
    <p className="neighborhood-note">Live, synchronous local rules. Every selected square counts toward B/S, chase, excitation or species votes; saved recipes and exports use the same stencil.</p>
   </section>}
  <p className="neighborhood-note">Birth/survival preset numbers mean literal neighbor counts. Use CUSTOM B/S for new 0–24 combinations. Only compatible square-grid engines can use painted stencils.</p>
 </div>;
}
