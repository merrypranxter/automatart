import type {Dispatch,SetStateAction} from 'react';
import type {Appearance} from '../engine/types';
import {
  INITIAL_PRINT_SHOP,PRINT_EFFECTS,randomizePrintShop,reorderEffect,
  structuredClonePrint
} from '../engine/printshop';
import type {PrintEffectId,PrintShop} from '../engine/printshop';
interface Props {appearance:Appearance;setAppearance:Dispatch<SetStateAction<Appearance>>}
const LABEL:Record<PrintEffectId,string>=Object.fromEntries(PRINT_EFFECTS.map(e=>[e.id,e.name])) as Record<PrintEffectId,string>;
export default function PrintShopControls({appearance,setAppearance}:Props){
  const p=appearance.print??INITIAL_PRINT_SHOP;
  const update=(transform:(print:PrintShop)=>PrintShop)=>setAppearance(a=>({
    ...a,print:transform(structuredClonePrint(a.print??INITIAL_PRINT_SHOP))
  }));
  const set=<K extends keyof PrintShop>(key:K,value:PrintShop[K])=>update(p=>({...p,[key]:value}));
  const changeEffect=(id:PrintEffectId,patch:{enabled?:boolean;amount?:number})=>
    update(p=>({...p,effects:p.effects.map(e=>e.id===id?{...e,...patch}:e)}));
  const reset=()=>setAppearance(a=>({...a,print:structuredClonePrint(INITIAL_PRINT_SHOP)}));
  const preset=(names:PrintEffectId[])=>update(p=>({...p,enabled:true,effects:
    p.effects.map(e=>({...e,enabled:names.includes(e.id),amount:1}))}));
  const chooseInk=(value:number,key:'inkA'|'inkB'|'inkC')=>set(key,value);
  const slider=(id:string,label:string,value:number,min:number,max:number,step:number,change:(n:number)=>void,suffix='')=>
    <label className="print-slider" htmlFor={id}><span>{label} <em>{Number(value.toFixed(2))}{suffix}</em></span>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e=>change(Number(e.target.value))}/></label>;
  const active=p.effects.filter(e=>e.enabled).length;
  return <section className="print-shop" aria-label="Psychedelic Print Shop">
    <div className="print-shop-header"><strong>F4 · PSYCHEDELIC PRINT SHOP</strong>
      <span>VISUAL ONLY · MATH UNCHANGED</span></div>
    <label className="print-main-toggle">
      <input type="checkbox" id="print-master" checked={p.enabled}
        onChange={e=>set('enabled',e.target.checked)}/>
      <span>{p.enabled?'PRINT SHOP ON':'ENABLE PRINT SHOP'}</span>
      <span>{active} layers</span>
    </label>
    <p className="print-help">Not another mathematical skin. These are printable post-process treatments layered over whatever skin you choose. Layer order matters; PNG, GIF and video use the same effects.</p>
    <div className="print-presets">
      <button type="button" onClick={()=>preset(['posterize','halftone'])}>POP PRINT</button>
      <button type="button" onClick={()=>preset(['solarize','xray'])}>RADIOACTIVE</button>
      <button type="button" onClick={()=>preset(['stipple','duotone'])}>ALIEN ZINE</button>
    </div>
    <div className="print-presets">
      <button type="button" id="print-surprise" onClick={()=>update(randomizePrintShop)}>🎲 RANDOM PRINT</button>
      <button type="button" id="print-reset" onClick={reset}>↶ RESET PRINT</button>
    </div>
    {slider('print-mix','MASTER PRINT BLEND',p.mix,0,1,.05,n=>set('mix',n),'×')}
    <div className="print-layers">
      {p.effects.map((effect,index)=>{
        const item=PRINT_EFFECTS.find(v=>v.id===effect.id)!;
        return <div className={'print-effect '+(effect.enabled?'active':'')} key={effect.id}>
          <div className="print-effect-line">
            <label htmlFor={'print-'+effect.id}>
              <input id={'print-'+effect.id} type="checkbox" checked={effect.enabled}
                onChange={e=>changeEffect(effect.id,{enabled:e.target.checked})}/>
              <strong>{LABEL[effect.id]}</strong>
            </label>
            <div className="print-effect-arrows">
              <button type="button" title={'Move '+item.name+' earlier'} aria-label={'Move '+item.name+' earlier'}
                disabled={index===0} onClick={()=>update(p=>reorderEffect(p,effect.id,-1))}>↑</button>
              <button type="button" title={'Move '+item.name+' later'} aria-label={'Move '+item.name+' later'}
                disabled={index===p.effects.length-1} onClick={()=>update(p=>reorderEffect(p,effect.id,1))}>↓</button>
            </div>
          </div>
          <p>{item.description}</p>
          {effect.enabled&&slider('print-'+effect.id+'-amount','Layer amount',effect.amount,0,1,.05,
            n=>changeEffect(effect.id,{amount:n}))}
        </div>;
      })}
    </div>
    <details className="print-advanced" open={p.enabled&&active>0}>
      <summary>PRINT PARAMETERS · DOTS / INKS / THRESHOLDS</summary>
      {slider('print-poster-levels','Poster color bands',p.posterLevels,2,12,1,n=>set('posterLevels',n))}
      {slider('print-halftone-size','Halftone dot spacing',p.halftoneSize,3,24,1,n=>set('halftoneSize',n),'px')}
      {slider('print-halftone-angle','Halftone angle',p.halftoneAngle,0,180,5,n=>set('halftoneAngle',n),'°')}
      {slider('print-solar-threshold','Solarization threshold',p.solarThreshold,.02,.98,.02,n=>set('solarThreshold',n))}
      {slider('print-xray-sensitivity','X-ray edge sensitivity',p.xraySensitivity,.05,1,.05,n=>set('xraySensitivity',n))}
      {slider('print-stipple-density','Stipple density',p.stippleDensity,.02,1,.02,n=>set('stippleDensity',n))}
      {slider('print-stipple-grain','Stipple grain size',p.stippleGrain,1,8,1,n=>set('stippleGrain',n),'px')}
      <label className="input-label" htmlFor="print-ink-mode">Ink mapping</label>
      <select id="print-ink-mode" value={p.duoMode} onChange={e=>set('duoMode',Number(e.target.value)===3?3:2)}>
        <option value="2">DUOTONE · 2 INKS</option><option value="3">TRITONE · 3 INKS</option>
      </select>
      <div className="print-ink-controls">
        {(['inkA','inkB',...(p.duoMode===3?['inkC']:[])] as ('inkA'|'inkB'|'inkC')[]).map((key,i)=>
          <label key={key}>INK {i+1}<select aria-label={'Print ink '+(i+1)+' palette stop'}
            value={Math.min(p[key],appearance.palette.length-1)}
            onChange={e=>chooseInk(Number(e.target.value),key)}>
              {appearance.palette.map((hex,n)=><option key={n} value={n}>STOP {n+1} · {hex.toUpperCase()}</option>)}
            </select></label>)}
      </div>
    </details>
    <p className="print-help">All layers use existing palette colors unless you explicitly change an ink stop. The original math, skins and 31 palette presets remain untouched. At HD sizes processing uses a bounded buffer to protect mobile recording performance.</p>
  </section>;
}
