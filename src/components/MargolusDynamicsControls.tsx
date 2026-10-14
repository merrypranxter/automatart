import type {Dispatch,SetStateAction} from 'react';
import type {MargolusRule} from '../engine/margolus-rules';
import {MARGOLUS_RULES,activeMargolusRule,lastEpochFor,margolusSpec} from '../engine/margolus-rules';
import type {SimSettings,World} from '../engine/types';

type Props={
 settings:SimSettings;
 setSettings:Dispatch<SetStateAction<SimSettings>>;
 world?:World;
 generation:number;
 direction?:1|-1;
 onRewind:(count?:number)=>void;
 onPlayDirection?:(direction:1|-1)=>void;
};
const PRESETS=[
 {id:'original',label:'ORIGINAL ROTATION',a:'cw',b:'cw',mode:'single',period:1,tip:'Original bit-exact clockwise blocks.'},
 {id:'reverse',label:'REVERSE VORTEX',a:'ccw',b:'ccw',mode:'single',period:1,tip:'Counterclockwise, reversible.'},
 {id:'collision',label:'PARTICLE COLLIDER',a:'collision',b:'opposite',mode:'alternate',period:3,tip:'Switch two distinct occupancy-preserving collision laws every three ticks.'},
 {id:'braid',label:'PARITY BRAID',a:'braid',b:'vortex',mode:'alternate',period:6,tip:'Switch two occupancy-sensitive reversible local maps.'},
 {id:'mirrors',label:'MIRROR MAZE',a:'mirrorH',b:'diagonal',mode:'alternate',period:3,tip:'Inverting reflections rearrange blocks without erasing cell data.'},
 {id:'strobe',label:'ORBIT REVERSAL',a:'cw',b:'ccw',mode:'alternate',period:1,tip:'Change rotational handedness every generation.'}
] as const;
export default function MargolusDynamicsControls({settings:s,setSettings,world,generation,
 direction=1,onRewind,onPlayDirection}:Props){
 const set=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
  setSettings(prev=>({...prev,[key]:value}));
 const history=world?.engine==='margolus'?world.margolusEpochs:undefined;
 const current=world?.engine==='margolus'&&generation>0?
  lastEpochFor(history,generation-1):null;
 const lastRule=current?activeMargolusRule(current,generation-1):null;
 const changed=world?.engine==='margolus'&&world.stepChanged!==undefined?
  (100*world.stepChanged/world.cells.length).toFixed(2)+'%':'—';
 return <section className="cyclic-dynamics-lab margolus-dynamics-lab" aria-label="Margolus reversible block mathematics">
  <div className="cyclic-dynamics-heading"><strong>↶ B2 · REVERSE UNIVERSE</strong><span>TRUE BIJECTIVE BLOCK LAWS</span></div>
  <p className="module-note">Every block is a real 2×2 binary configuration. Each rule permutes all 16 possible configurations one-to-one. The checkerboard partition shifts by one cell every generation, and EVERY move has an exact inverse. No random gaps, lossy transitions or cosmetic reverse video.</p>
  <div className="cyclic-dynamics-meters">
   <div><b id="margolus-activity">{changed}</b><span>ACTUAL CELLS CHANGED · LAST STEP</span></div>
   <div><b id="margolus-history-count">{history?.length??(generation>0?1:0)}</b><span>RULE HISTORY EPOCHS</span></div>
   <div><b id="margolus-active-rule">{lastRule??s.margolusRuleA}</b><span>MOST RECENT BLOCK LAW</span></div>
  </div>
  <label className="input-label" htmlFor="margolus-a">BLOCK LAW A · LIVE RULE</label>
  <select id="margolus-a" value={s.margolusRuleA} onChange={e=>set('margolusRuleA',e.target.value as MargolusRule)}>
   {MARGOLUS_RULES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
  </select>
  <div className="wave-modes" role="group" aria-label="Reversible rule schedule">
   <button id="margolus-mode-single" aria-pressed={s.margolusMode==='single'}
    className={s.margolusMode==='single'?'selected':''} onClick={()=>set('margolusMode','single')}>ONE LAW</button>
   <button id="margolus-mode-alternate" aria-pressed={s.margolusMode==='alternate'}
    className={s.margolusMode==='alternate'?'selected':''} onClick={()=>set('margolusMode','alternate')}>ALTERNATE A ⇄ B</button>
  </div>
  {s.margolusMode==='alternate'&&<>
   <label className="input-label" htmlFor="margolus-b">BLOCK LAW B</label>
   <select id="margolus-b" value={s.margolusRuleB} onChange={e=>set('margolusRuleB',e.target.value as MargolusRule)}>
    {MARGOLUS_RULES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
   </select>
   <label className="input-label" htmlFor="margolus-period">Swap schedule <em>every {s.margolusPeriod} {s.margolusPeriod===1?'tick':'ticks'}</em></label>
   <input id="margolus-period" type="range" min="1" max="120" step="1"
    value={s.margolusPeriod} onChange={e=>set('margolusPeriod',Number(e.target.value))}/>
  </>}
  <label className="input-label">REVERSIBLE RULE COMBINATIONS · LIVE / NO RESEED</label>
  <div className="wave-presets" role="group" aria-label="Reversible block regimes">
   {PRESETS.map(p=><button type="button" key={p.id} id={'margolus-preset-'+p.id}
    title={p.tip} onClick={()=>setSettings(v=>({...v,
     margolusRuleA:p.a,margolusRuleB:p.b,margolusMode:p.mode,margolusPeriod:p.period}))}>
    {p.label}</button>)}
  </div>
  <div className="group">
   <h3 className="group-head">TRAVEL BACKWARD THROUGH THE REAL MATH</h3>
   <div className="chip-row">
    <button type="button" className="rewind-button" id="margolus-back-one"
     disabled={generation===0} onClick={()=>onRewind(1)}>↶ BACK 1</button>
    <button type="button" className="rewind-button" id="margolus-back-ten"
     disabled={generation===0} onClick={()=>onRewind(10)}>↶ BACK 10</button>
   </div>
   <div className="wave-modes" role="group" aria-label="Reversible playback direction">
    <button type="button" id="margolus-play-backward" disabled={generation===0}
     aria-pressed={direction===-1} className={direction===-1?'selected':''}
     onClick={()=>onPlayDirection?.(-1)}>◀ PLAY BACKWARD</button>
    <button type="button" id="margolus-play-forward"
     aria-pressed={direction===1} className={direction===1?'selected':''}
     onClick={()=>onPlayDirection?.(1)}>PLAY FORWARD ▶</button>
   </div>
   <p className="neighborhood-note">A/B rule changes are remembered as compact generation-stamped epochs. Backward playback uses the exact inverse rule that acted at that generation, even across live edits. Binary cell states are exact; age trails and fossils are visual history and reset while rewinding. Finger-paint edits are outside the reversible time evolution.</p>
  </div>
  <p className="neighborhood-note">Reversible Margolus requires an even-dimensional wrapped square lattice. All ten block laws conserve the number of occupied cells. No invented particles or smoothing. Saved recipes include the active law and actual rule-change history. Normal GIF/video recording runs the forward evolution from its selected starting world.</p>
 </section>;
}
