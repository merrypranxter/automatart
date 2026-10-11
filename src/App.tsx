import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent } from 'react';
import { createWorld, paintWorld, stepWorld } from './engine/sim';
import { renderWorld } from './engine/render';
import {
  captureAnimation, chooseVideoMime, recommendedDimensions, CaptureCancelled
} from './engine/capture';
import type {
  CaptureFormat, CaptureProgress, DurationMode, ExportResolution
} from './engine/capture';
import {
  INITIAL_APPEARANCE, INITIAL_SETTINGS, LIFE_RULES, PALETTES, MOIRE_PALETTE_NAMES, AUTOMATART_PALETTE_NAMES
} from './engine/types';
import type {
  Appearance, AspectId, ColorBy, EngineId, LifeRule, NeighborShape, PatternId, SimSettings, SkinId, World
} from './engine/types';

const ENGINES: {id:EngineId;name:string;hint:string}[] = [
  {id:'life',name:'LIFE-LIKE',hint:'Birth / survival rules'},
  {id:'brians',name:"BRIAN'S BRAIN",hint:'Electric decay and firing'},
  {id:'cyclic',name:'CYCLIC',hint:'Rainbow species chase'},
  {id:'wolfram',name:'WOLFRAM',hint:'One-dimensional rule history'}
];
const ASPECTS: {value:AspectId;name:string}[]=[
  {value:'square',name:'1:1 SQUARE'},
  {value:'portrait',name:'9:16 VERTICAL'},
  {value:'landscape',name:'16:9 WIDE'}
];
const PATTERNS: {value:PatternId;name:string}[]=[
  {value:'noise',name:'Random soup'},
  {value:'center',name:'Center infection'},
  {value:'rings',name:'Concentric rings'},
  {value:'stripes',name:'Diagonal stripes'},
  {value:'checker',name:'Checkerboard spores'},
  {value:'spiral',name:'Spiral arms'},
  {value:'web',name:'Alien lattice web'}
];

function download(name:string, content:Blob | string):void{
  const url=typeof content==='string'?content:URL.createObjectURL(content);
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  if(typeof content!=='string')window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function stat(world:World):number{
  let living=0;for(let i=0;i<world.cells.length;i++)if(world.cells[i]!==0)living++;
  return living;
}

export default function App(){
  const [settings,setSettings]=useState<SimSettings>(INITIAL_SETTINGS);
  const [appearance,setAppearance]=useState<Appearance>(INITIAL_APPEARANCE);
  const [playing,setPlaying]=useState(true);
  const [speed,setSpeed]=useState(18);
  const [brush,setBrush]=useState(2);
  const [erase,setErase]=useState(false);
  const [generation,setGeneration]=useState(0);
  const [population,setPopulation]=useState(0);
  const [resetNumber,setResetNumber]=useState(0);
  const [message,setMessage]=useState('Paint the canvas, scramble the rules, and watch the mathematics get weird.');
  const [captureFormat,setCaptureFormat]=useState<CaptureFormat>('gif');
  const [durationMode,setDurationMode]=useState<DurationMode>('fixed');
  const [durationPreset,setDurationPreset]=useState('10');
  const [customSeconds,setCustomSeconds]=useState(45);
  const [resolution,setResolution]=useState<ExportResolution>(360);
  const [exportFps,setExportFps]=useState(10);
  const [restartCapture,setRestartCapture]=useState(true);
  const [capturing,setCapturing]=useState(false);
  const [lastExport,setLastExport]=useState<{name:string;blob:Blob;url:string;frames:number;distinctFrames:number;elapsed:number;extension:string}|null>(null);
  const [captureProgress,setCaptureProgress]=useState<CaptureProgress|null>(null);
  const [captureError,setCaptureError]=useState<string|null>(null);
  const controllerRef=useRef<AbortController|null>(null);
  const recordingRef=useRef(false);
  useEffect(()=>()=>{if(lastExport)URL.revokeObjectURL(lastExport.url);},[lastExport]);
  const worldRef=useRef<World>(createWorld(INITIAL_SETTINGS));
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const loadRef=useRef<HTMLInputElement>(null);
  const recorderRef=useRef<HTMLDivElement>(null);
  const jumpToRecorder=()=>recorderRef.current?.scrollIntoView({behavior:'smooth',block:'center'});
  const updateSetting=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
    setSettings(s=>({...s,[key]:value}));
  const updateAppearance=<K extends keyof Appearance>(key:K,value:Appearance[K])=>
    setAppearance(a=>({...a,[key]:value}));
  const toggleCustomRule=(kind:'customBirth'|'customSurvive',number:number)=>{
    setSettings(s=>({...s,lifeRule:'custom',
      [kind]:s[kind].includes(number)?s[kind].filter(v=>v!==number):[...s[kind],number].sort((a,b)=>a-b)}));
  };
  const mutateColors=()=>{
    const names=Object.keys(PALETTES);
    const pick=PALETTES[names[Math.floor(Math.random()*names.length)]];
    setAppearance(a=>({...a,palette:[...pick],paletteOffset:Math.floor(Math.random()*pick.length),
      paletteCycle:Math.random()<0.6?0:(Math.random()*0.35+0.03),
      paletteReverse:Math.random()<0.5}));
  };
  const draw=useCallback(()=>{
    if(canvasRef.current)renderWorld(canvasRef.current,worldRef.current,appearance,900);
  },[appearance]);

  // Recreate only when initial-world geometry/seed changes.
  // Rule, color and trail adjustments now affect the running simulation.
  useEffect(()=>{
    worldRef.current=createWorld(settings);
    setGeneration(0);
    setPopulation(stat(worldRef.current));
  },[settings.engine,settings.cellCount,settings.aspect,settings.seed,
      settings.pattern,settings.density,settings.cyclicStates,resetNumber]);
  useEffect(()=>{draw();},[draw,settings,resetNumber]);

  useEffect(()=>{
    if(!playing)return;
    let frame=0,previous=0,accumulator=0;
    const tick=(time:number)=>{
      if(!previous)previous=time;
      accumulator+=Math.min(120,time-previous);previous=time;
      const stepMilliseconds=1000/speed;
      let steps=0;
      while(accumulator>=stepMilliseconds&&steps<4){
        worldRef.current=stepWorld(worldRef.current,settings);
        accumulator-=stepMilliseconds;
        steps++;
      }
      if(steps){
        setGeneration(worldRef.current.generation);
        setPopulation(stat(worldRef.current));
        draw();
      }
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[playing,speed,settings,draw]);

  function oneStep(){
    setPlaying(false);
    worldRef.current=stepWorld(worldRef.current,settings);
    setGeneration(worldRef.current.generation);
    setPopulation(stat(worldRef.current));
    draw();
  }
  function restart(){
    setResetNumber(n=>n+1);
    setMessage('Universe restarted from its exact seed.');
  }
  function randomize(){
    updateSetting('seed',Math.floor(Math.random()*4294967295));
    setMessage('New seeded universe generated. Keep the seed if you like it.');
  }
  function paint(e:PointerEvent<HTMLCanvasElement>){
    const canvas=canvasRef.current;if(!canvas)return;
    const r=canvas.getBoundingClientRect();
    const world=worldRef.current;
    const x=Math.floor((e.clientX-r.left)*world.width/r.width);
    const y=Math.floor((e.clientY-r.top)*world.height/r.height);
    if(x<0||x>=world.width||y<0||y>=world.height)return;
    paintWorld(world,settings,x,y,brush,erase);
    setPopulation(stat(world));
    draw();
  }
  function onPointerDown(e:PointerEvent<HTMLCanvasElement>){
    e.currentTarget.setPointerCapture(e.pointerId);
    paint(e);
  }
  function onPointerMove(e:PointerEvent<HTMLCanvasElement>){
    if(e.buttons!==0)paint(e);
  }
  function savePng(){
    const c=document.createElement('canvas');
    renderWorld(c,worldRef.current,appearance,1400);
    download('automatart-'+settings.engine+'-gen'+generation+'.png',c.toDataURL('image/png'));
    setMessage('Still frame saved as PNG. GIF/video animation recording is in the Animation Recorder below.');
  }
  function saveRecipe(){
    const recipe={kind:'automatart-recipe-v1',settings,appearance};
    download('automatart-recipe-'+settings.seed+'.json',
      new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}));
    setMessage('Saved this setup as a JSON recipe. Paint strokes and elapsed generations are not part of recipes yet.');
  }
  async function loadRecipe(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value='';
    if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(data.kind!=='automatart-recipe-v1'||!data.settings||!data.appearance)throw new Error('Not an Automatart recipe');
      const s:SimSettings={...INITIAL_SETTINGS,...data.settings};
      if(!ENGINES.some(v=>v.id===s.engine))throw new Error('Unknown engine');
      if(!['square','portrait','landscape'].includes(s.aspect))throw new Error('Invalid aspect');
      if(!['noise','center','rings','stripes','checker','spiral','web'].includes(s.pattern))throw new Error('Invalid seed pattern');
      if(!Object.hasOwn(LIFE_RULES,s.lifeRule))throw new Error('Invalid life rule');
      if(!Number.isInteger(s.cellCount)||s.cellCount<32||s.cellCount>256)throw new Error('Invalid grid size');
      if(!Number.isFinite(s.density)||s.density<0||s.density>1)throw new Error('Invalid density');
      if(!Number.isFinite(s.seed))throw new Error('Invalid seed');
      s.seed=s.seed>>>0;s.cyclicStates=Math.max(3,Math.min(24,Math.floor(s.cyclicStates)||12));
      s.cyclicThreshold=Math.max(1,Math.min(8,Math.floor(s.cyclicThreshold)||2));
      s.wolframRule=Math.max(0,Math.min(255,Math.floor(s.wolframRule)||30));
      if(!['moore','vonNeumann'].includes(s.neighborShape))s.neighborShape='moore';
      for(const k of ['customBirth','customSurvive'] as const){
        if(!Array.isArray(s[k]))s[k]=k==='customBirth'?[3]:[2,3];
        s[k]=[...new Set(s[k].filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=8))].sort((a,b)=>a-b);
      }
      s.trailDecay=Math.min(0.99,Math.max(0.65,Number(s.trailDecay)||0.89));
      const a:Appearance={...INITIAL_APPEARANCE,...data.appearance};
      if(!Array.isArray(a.palette)||a.palette.length<2||a.palette.length>32||a.palette.some(v=>typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v)))throw new Error('Invalid palette');
      if(!['state','age','neighbors','events','radius','x','activity'].includes(a.colorBy))throw new Error('Invalid color mapping');
      if(!['pixels','soft','glow'].includes(a.skin))throw new Error('Invalid skin');
      a.paletteOffset=Math.min(31,Math.max(-31,Number(a.paletteOffset)||0));
      a.paletteCycle=Math.min(1,Math.max(-1,Number(a.paletteCycle)||0));
      a.saturation=Math.min(3,Math.max(0,Number(a.saturation)??1));
      a.contrast=Math.min(3,Math.max(0.2,Number(a.contrast)||1));
      a.brightness=Math.min(2.5,Math.max(0.15,Number(a.brightness)||1));
      a.glowStrength=Math.min(1,Math.max(0,Number(a.glowStrength)??0.8));
      a.paletteReverse=!!a.paletteReverse;
      a.smoothPalette=!!a.smoothPalette;
      setSettings(s);setAppearance(a);setResetNumber(n=>n+1);
      setMessage('Recipe loaded. Exact seed restored.');
    }catch(err){
      setMessage('Could not load recipe: '+(err instanceof Error?err.message:'Unknown error'));
    }
  }
  function dismissExport(){
    setLastExport(null);
    setCaptureError(null);
  }
  async function saveLastExport(){
    if(!lastExport)return;
    const file=new File([lastExport.blob],lastExport.name,{type:lastExport.blob.type});
    if(typeof navigator.share==='function'&&typeof navigator.canShare==='function'
      &&navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file],title:'Automatart animation'});
        return;
      }catch(error){
        if(error instanceof DOMException&&error.name==='AbortError')return;
      }
    }
    download(lastExport.name,lastExport.blob);
  }
  async function startCapture(){
    if(recordingRef.current)return;
    setLastExport(null);
    setCaptureError(null);
    recordingRef.current=true;
    const controller=new AbortController();
    controllerRef.current=controller;
    setPlaying(false);
    setCapturing(true);
    setCaptureProgress({phase:'Preparing recorder',frames:0,seconds:0,fraction:0});
    const seconds=durationMode==='settled'?600:durationPreset==='custom'?customSeconds:Number(durationPreset);
    const safeSeconds=Math.min(600,Math.max(1,Math.floor(seconds)||30));
    const startedAt=worldRef.current;
    try{
      // Give React two paint turns to show the sticky progress panel and attach
      // the recorder canvas before CPU-heavy work starts, especially on iOS.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>
        requestAnimationFrame(()=>resolve())));
      if(controller.signal.aborted)throw new CaptureCancelled();
      const result=await captureAnimation(startedAt,settings,appearance,{
        format:captureFormat,mode:durationMode,seconds:safeSeconds,
        fps:exportFps,resolution,restart:restartCapture,stepsPerSecond:speed
      },setCaptureProgress,controller.signal);
      const label=result.ended==='settled'?'settled naturally':
        result.ended==='limit'?'reached the 10-minute safety limit':'complete';
      const name='automatart-'+settings.engine+'-'+(restartCapture?'seed'+settings.seed:'gen'+generation)+'-'+Math.round(result.elapsed)+'s.'+result.extension;
      setLastExport({name,blob:result.blob,url:URL.createObjectURL(result.blob),frames:result.frames,distinctFrames:result.distinctFrames,elapsed:result.elapsed,extension:result.extension});
      if(!/iPad|iPhone|iPod/i.test(navigator.userAgent))download(name,result.blob);
      setMessage('GIF/video export '+label+'. '+result.frames+' frames created. Preview, save and share below.');
    }catch(error){
      if(error instanceof CaptureCancelled||controller.signal.aborted){
        setMessage('Recording cancelled. Your live universe is unharmed.');
      }else{
        const detail=error instanceof Error?error.message:'Unknown recording error';
        setCaptureError(detail);
        setMessage('Export failed: '+detail);
      }
    }finally{
      controllerRef.current=null;
      recordingRef.current=false;
      setCapturing(false);
      setCaptureProgress(null);
    }
  }
  const activeEngine=ENGINES.find(e=>e.id===settings.engine);
  const outputSize=recommendedDimensions(settings,resolution);
  const videoSupported=typeof window!=='undefined'&&chooseVideoMime()!==null;
  const predictedFrames=(durationMode==='settled'?600:durationPreset==='custom'?customSeconds:Number(durationPreset))*exportFps;
  const densityLabel=Math.round(settings.density*100)+'%';
  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="brand-top"><span className="signal-dot" /> EXPERIMENTAL GENERATIVE INSTRUMENT · V0.1</div>
        <h1>AUTOMAT<span>ART</span><span className="h1-spark">✳</span></h1>
        <p>Mathematical mutation studio. Make the cells misbehave.</p>
      </header>
      <main className="studio">
        <section className="stage" aria-label="Live automaton preview">
          <div className="stage-header">
            <div><b className="eyebrow">LIVE UNIVERSE</b><span className="stage-engine">{activeEngine?.name}</span></div>
            <span className={'live-label '+(playing?'':'is-paused')}>{capturing?'● EXPORTING':playing?'● LIVE':'Ⅱ PAUSED'}</span>
          </div>
          <div className="canvas-wrap">
            <canvas ref={canvasRef} aria-label="Interactive cellular automata canvas. Drag to paint cells." onPointerDown={onPointerDown} onPointerMove={onPointerMove} />
            <span className="canvas-corner tl">A / {String(generation).padStart(6,'0')}</span>
            <span className="canvas-corner tr">{settings.cellCount} GRID</span>
            <span className="canvas-corner bl">{erase?'ERASE':'PAINT'} MODE</span>
          </div>
          <div className="transport">
            <button className="primary" onClick={()=>setPlaying(v=>!v)} aria-label={playing?'Pause simulation':'Play simulation'}>{playing?'Ⅱ PAUSE':'▶ PLAY'}</button>
            <button onClick={oneStep} title="Advance one generation">STEP +1</button>
            <button onClick={restart} title="Restart from same seed">↺ RESET</button>
            <button className="surprise" onClick={randomize}>✳ NEW SEED</button>
          </div>
          <div className="readouts">
            <span><b>{generation.toLocaleString()}</b> GEN</span>
            <span><b>{population.toLocaleString()}</b> NONZERO CELLS</span>
            <span><b>{worldRef.current.width}×{worldRef.current.height}</b> GRID</span>
          </div>
          {capturing&&<div className="stage-capture-state" role="status" aria-live="polite">
            <div className="stage-capture-head">
              <b>● RECORDING {captureFormat.toUpperCase()}</b>
              <span>{captureProgress?.frames||0} frames / {Math.round((captureProgress?.fraction||0)*100)}%</span>
            </div>
            <progress max="1" value={captureProgress?.fraction||0}/>
            <div className="stage-capture-foot">
              <span>{captureProgress?.phase||'Preparing…'} · Live playback paused for export</span>
              <button onClick={()=>controllerRef.current?.abort()}>CANCEL</button>
            </div>
          </div>}
          {!capturing&&captureError&&<div className="stage-capture-error" role="alert">
            <b>EXPORT FAILED</b>
            <span>{captureError}</span>
            <button onClick={jumpToRecorder}>BACK TO RECORDER ↓</button>
          </div>}
          {!capturing&&lastExport&&<div className="stage-capture-success" role="status">
            <div className="stage-success-top"><b>✓ ANIMATION READY</b><span>{lastExport.frames} frames · {lastExport.elapsed.toFixed(1)} sec</span>
              <button type="button" className="dismiss-export" aria-label="Dismiss animation ready banner" title="Close this notification" onClick={dismissExport}>×</button>
            </div>
            <div className="stage-capture-buttons">
              <button onClick={saveLastExport}>SAVE / SHARE</button>
              <button onClick={jumpToRecorder}>PLAY PREVIEW ↓</button>
            </div>
          </div>}
        </section>
        <section className="rack" aria-label="Simulation controls">
          <div className="rack-intro"><span>01—04 / INSTRUMENT RACK</span><span>CHROMA LAB / PHASE 2</span></div>
          <section className="module">
            <div className="module-heading"><span className="module-num">01</span><h2>WORLD MACHINE</h2><span className="module-symbol">◎</span></div>
            <label className="input-label" htmlFor="aspect">Canvas geometry</label>
            <select id="aspect" value={settings.aspect} onChange={e=>updateSetting('aspect',e.target.value as AspectId)}>
              {ASPECTS.map(a=><option value={a.value} key={a.value}>{a.name}</option>)}
            </select>
            <label className="input-label" htmlFor="resolution">Simulation grid <em>{settings.cellCount} cells across</em></label>
            <input id="resolution" type="range" min="32" max="256" step="16" value={settings.cellCount} onChange={e=>updateSetting('cellCount',Number(e.target.value))}/>
            <label className="input-label" htmlFor="seed-pattern">Starting pattern</label>
            <select id="seed-pattern" value={settings.pattern} onChange={e=>updateSetting('pattern',e.target.value as PatternId)}>
              {PATTERNS.map(p=><option value={p.value} key={p.value}>{p.name}</option>)}
            </select>
            <label className="input-label" htmlFor="density">Initial fill <em>{densityLabel}</em></label>
            <input id="density" type="range" min="1" max="95" step="1" value={Math.round(settings.density*100)} onChange={e=>updateSetting('density',Number(e.target.value)/100)}/>
            <label className="input-label" htmlFor="seed">Universe seed</label>
            <input id="seed" type="number" min="0" max="4294967295" value={settings.seed} onChange={e=>updateSetting('seed',Number(e.target.value)>>>0)}/>
            <label className="toggle"><input type="checkbox" checked={settings.wrap} onChange={e=>updateSetting('wrap',e.target.checked)}/><span>Wrap world edges</span></label>
          </section>
          <section className="module">
            <div className="module-heading"><span className="module-num">02</span><h2>RULE REACTOR</h2><span className="module-symbol">⌘</span></div>
            <label className="input-label" htmlFor="engine">Automaton species</label>
            <select id="engine" value={settings.engine} onChange={e=>updateSetting('engine',e.target.value as EngineId)}>
              {ENGINES.map(x=><option key={x.id} value={x.id}>{x.name} — {x.hint}</option>)}
            </select>
            {settings.engine!=='wolfram'&&<>
              <label className="input-label" htmlFor="neighbor-shape">Neighborhood geometry</label>
              <select id="neighbor-shape" value={settings.neighborShape}
                onChange={e=>updateSetting('neighborShape',e.target.value as NeighborShape)}>
                <option value="moore">Moore / 8 surrounding cells</option>
                <option value="vonNeumann">Von Neumann / 4 orthogonal cells</option>
              </select>
            </>}
            {settings.engine==='life'&&<>
              <label className="input-label" htmlFor="life">Birth / survival</label>
              <select id="life" value={settings.lifeRule} onChange={e=>updateSetting('lifeRule',e.target.value as LifeRule)}>
                {Object.entries(LIFE_RULES).map(([id,r])=><option key={id} value={id}>{r.label}</option>)}
              </select>
              {settings.lifeRule==='custom'&&<div className="custom-rule-editor">
                <p>Choose how many neighbors cause birth or survival. Changes apply live.</p>
                {(['customBirth','customSurvive'] as const).map(kind=><div key={kind}>
                  <b>{kind==='customBirth'?'BIRTH · B':'SURVIVE · S'}{settings[kind].join('')}</b>
                  <div className="rule-bits">{Array.from({length:9},(_,i)=><button type="button" key={i}
                    aria-pressed={settings[kind].includes(i)} className={settings[kind].includes(i)?'active':''}
                    onClick={()=>toggleCustomRule(kind,i)}>{i}</button>)}</div>
                </div>)}
                <span>B/S rules use the neighborhood geometry selected above.</span>
              </div>}
            </>}
            {settings.engine==='brians'&&<p className="module-note">Three-state Brain: OFF → FIRING → REFRACTORY → OFF. Exactly two firing neighbors cause ignition.</p>}
            {settings.engine==='cyclic'&&<>
              <label className="input-label" htmlFor="states">Color species <em>{settings.cyclicStates}</em></label>
              <input id="states" type="range" min="3" max="24" value={settings.cyclicStates} onChange={e=>updateSetting('cyclicStates',Number(e.target.value))}/>
              <label className="input-label" htmlFor="threshold">Chase threshold <em>{settings.cyclicThreshold} neighbors</em></label>
              <input id="threshold" type="range" min="1" max="8" value={settings.cyclicThreshold} onChange={e=>updateSetting('cyclicThreshold',Number(e.target.value))}/>
            </>}
            {settings.engine==='wolfram'&&<>
              <label className="input-label" htmlFor="rule">Wolfram rule number (0–255)</label>
              <input id="rule" type="number" min="0" max="255" value={settings.wolframRule} onChange={e=>updateSetting('wolframRule',Math.max(0,Math.min(255,Number(e.target.value)||0)))}/>
              <div className="chip-row">{[30,90,110,184].map(n=><button className="chip" key={n} onClick={()=>updateSetting('wolframRule',n)}>R{n}</button>)}</div>
            </>}
            <label className="input-label" htmlFor="speed">Evolution speed <em>{speed} gen/sec</em></label>
            <input id="speed" type="range" min="1" max="40" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/>
            <div className="paint-tools">
              <span className="input-label">Touch / mouse tools</span>
              <div className="chip-row">
                <button className={'chip '+(!erase?'selected':'')} onClick={()=>setErase(false)}>✎ PAINT</button>
                <button className={'chip '+(erase?'selected':'')} onClick={()=>setErase(true)}>⌫ ERASE</button>
              </div>
              <label className="input-label" htmlFor="brush">Brush radius <em>{brush}</em></label>
              <input id="brush" type="range" min="0" max="8" value={brush} onChange={e=>setBrush(Number(e.target.value))}/>
            </div>
          </section>
          <section className="module">
            <div className="module-heading"><span className="module-num">03</span><h2>CHROMA PATCHBAY</h2><span className="module-symbol">✺</span></div>
            <div className="patch-visual"><span>SIGNAL</span><strong>→</strong><span>COLOR</span></div>
            <label className="input-label" htmlFor="source">What controls the colors?</label>
            <select id="source" value={appearance.colorBy} onChange={e=>updateAppearance('colorBy',e.target.value as ColorBy)}>
              <option value="state">Cell state → palette</option>
              <option value="age">Cell age → palette</option>
              <option value="neighbors">Neighbor count → palette</option>
              <option value="events">Birth / death / change → palette</option>
              <option value="radius">Distance from center → rainbow rings</option>
              <option value="x">Horizontal position → chromatic bands</option>
              <option value="activity">Age + neighbors + events → mixed signal</option>
            </select>
            <label className="input-label" htmlFor="palette">Load a color universe</label>
            <select id="palette" value={Object.keys(PALETTES).find(k=>PALETTES[k].length===appearance.palette.length&&PALETTES[k].every((c,i)=>c.toLowerCase()===appearance.palette[i]?.toLowerCase()))||'CUSTOM'}
              onChange={e=>{if(PALETTES[e.target.value])updateAppearance('palette',[...PALETTES[e.target.value]]);}}>
              <optgroup label="IT'S A MOIRÉ · 26 ORIGINAL 12-COLOR PALETTES">
                {MOIRE_PALETTE_NAMES.map(k=><option key={k} value={k}>{k}</option>)}
              </optgroup>
              <optgroup label="AUTOMATART · 5 ORIGINAL PALETTES">
                {AUTOMATART_PALETTE_NAMES.map(k=><option key={k} value={k}>{k}</option>)}
              </optgroup>
              <option value="CUSTOM">CUSTOM MIX</option>
            </select>
            <div className="palette-summary">
              <span>{MOIRE_PALETTE_NAMES.length+AUTOMATART_PALETTE_NAMES.length} PALETTES · {appearance.palette.length} COLOR STOPS</span>
              <button type="button" onClick={mutateColors}>✳ RANDOM PALETTE</button>
            </div>
            <div className="color-wells">
              {appearance.palette.map((c,i)=><label key={i} title={'Edit color '+(i+1)}>
                <input aria-label={'Edit palette color '+(i+1)} type="color" value={c}
                  onChange={e=>updateAppearance('palette',appearance.palette.map((x,j)=>j===i?e.target.value:x))}/>
                <span>{String(i+1).padStart(2,'0')}</span>
              </label>)}
            </div>
            <div className="advanced-color-controls">
              <h3>CHROMATIC MISBEHAVIOR</h3>
              <label className="input-label" htmlFor="palette-offset">Palette offset <em>{appearance.paletteOffset.toFixed(1)}</em></label>
              <input id="palette-offset" type="range" min="-12" max="12" step=".25" value={appearance.paletteOffset}
                onChange={e=>updateAppearance('paletteOffset',Number(e.target.value))}/>
              <label className="input-label" htmlFor="palette-cycle">Palette cycling per generation <em>{appearance.paletteCycle.toFixed(2)} stops</em></label>
              <input id="palette-cycle" type="range" min="-1" max="1" step=".02" value={appearance.paletteCycle}
                onChange={e=>updateAppearance('paletteCycle',Number(e.target.value))}/>
              <label className="toggle"><input type="checkbox" checked={appearance.paletteReverse}
                onChange={e=>updateAppearance('paletteReverse',e.target.checked)}/><span>Reverse color direction</span></label>
              <label className="toggle"><input type="checkbox" checked={appearance.smoothPalette}
                onChange={e=>updateAppearance('smoothPalette',e.target.checked)}/><span>Smoothly blend color stops</span></label>
              <label className="input-label" htmlFor="color-saturation">Saturation <em>{Math.round(appearance.saturation*100)}%</em></label>
              <input id="color-saturation" type="range" min="0" max="3" step=".05" value={appearance.saturation}
                onChange={e=>updateAppearance('saturation',Number(e.target.value))}/>
              <label className="input-label" htmlFor="color-contrast">Contrast <em>{appearance.contrast.toFixed(2)}×</em></label>
              <input id="color-contrast" type="range" min=".2" max="3" step=".05" value={appearance.contrast}
                onChange={e=>updateAppearance('contrast',Number(e.target.value))}/>
              <label className="input-label" htmlFor="color-brightness">Brightness <em>{appearance.brightness.toFixed(2)}×</em></label>
              <input id="color-brightness" type="range" min=".15" max="2.5" step=".05" value={appearance.brightness}
                onChange={e=>updateAppearance('brightness',Number(e.target.value))}/>
              <button className="reset-color" onClick={()=>setAppearance(a=>({...a,paletteOffset:0,paletteCycle:0,paletteReverse:false,smoothPalette:false,saturation:1,contrast:1,brightness:1}))}>↺ RESET COLOR MODIFIERS</button>
            </div>
            <p className="module-note">All 26 original It's a Moiré 12-stop palettes are intact. Cycle colors through generations, reverse their order, or route cell activity and position into the same color system. These controls apply to GIF and video exports too.</p>
          </section>
          <section className="module">
            <div className="module-heading"><span className="module-num">04</span><h2>SKIN + HARVEST</h2><span className="module-symbol">◈</span></div>
            <label className="input-label" htmlFor="skin">Rendering skin</label>
            <select id="skin" value={appearance.skin} onChange={e=>updateAppearance('skin',e.target.value as SkinId)}>
              <option value="pixels">CRISP / PIXELATED</option>
              <option value="soft">SOFT / LIQUID</option>
              <option value="glow">PHOSPHOR / GLOW</option>
            </select>
            {appearance.skin==='glow'&&<>
              <label className="input-label" htmlFor="glow-strength">Fluorescent bloom <em>{Math.round(appearance.glowStrength*100)}%</em></label>
              <input id="glow-strength" type="range" min="0" max="1" step=".05" value={appearance.glowStrength}
                onChange={e=>updateAppearance('glowStrength',Number(e.target.value))}/>
            </>}
            {settings.engine!=='cyclic'&&<>
              <label className="input-label" htmlFor="trail-persistence">Cell afterimage persistence <em>{Math.round(settings.trailDecay*100)}%</em></label>
              <input id="trail-persistence" type="range" min=".65" max=".99" step=".01" value={settings.trailDecay}
                onChange={e=>updateSetting('trailDecay',Number(e.target.value))}/>
            </>}
            <label className="toggle"><input type="checkbox" checked={appearance.showGrid} onChange={e=>updateAppearance('showGrid',e.target.checked)}/><span>Show mathematical grid</span></label>
            <label className="toggle"><input type="checkbox" checked={appearance.trails} onChange={e=>updateAppearance('trails',e.target.checked)}/><span>Show cell afterimages</span></label>
            <div className="export-grid">
              <button onClick={savePng} className="export">⇩ SAVE PNG</button>
              <button onClick={saveRecipe} className="export">⇩ SAVE RECIPE</button>
              <button onClick={()=>loadRef.current?.click()} className="export">⇧ LOAD RECIPE</button>
              <input className="sr-only" ref={loadRef} type="file" accept=".json,application/json" onChange={loadRecipe}/>
            </div>
            <div className="recorder-panel" ref={recorderRef}>
              <div className="recorder-heading"><span>✹ ANIMATION RECORDER</span><span className="recorder-ready">EXPORT LAB / EARLY PHASE 4</span></div>
              <label className="input-label" htmlFor="export-format">Animation format</label>
              <select id="export-format" value={captureFormat} disabled={capturing}
                onChange={e=>{
                  const format=e.target.value as CaptureFormat;
                  setCaptureFormat(format);
                  setExportFps(format==='gif'?10:30);
                  setResolution(format==='gif'?360:720);
                }}>
                <option value="gif">GIF · LOOPING ANIMATION</option>
                <option value="video">VIDEO · MP4 / WEBM (BROWSER-DEPENDENT)</option>
              </select>
              <label className="input-label" htmlFor="duration-mode">When should recording end?</label>
              <select id="duration-mode" value={durationMode} disabled={capturing}
                onChange={e=>setDurationMode(e.target.value as DurationMode)}>
                <option value="fixed">After a chosen duration</option>
                <option value="settled">When the cells stop changing</option>
              </select>
              {durationMode==='fixed' ? <>
                <label className="input-label" htmlFor="duration-preset">Duration</label>
                <select id="duration-preset" value={durationPreset} disabled={capturing}
                  onChange={e=>setDurationPreset(e.target.value)}>
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                  <option value="custom">Custom duration</option>
                </select>
                {durationPreset==='custom'&&<>
                  <label className="input-label" htmlFor="custom-seconds">Custom length <em>1–600 seconds</em></label>
                  <input id="custom-seconds" type="number" min="1" max="600" step="1" value={customSeconds}
                    disabled={capturing}
                    onChange={e=>setCustomSeconds(Math.max(1,Math.min(600,Number(e.target.value)||1)))}/>
                </>}
              </>:<p className="module-note">
                The recorder checks for 3 unchanged generations in a row and stops automatically.
                Oscillators, moving patterns, and cyclic universes may never settle, so recordings are capped at 10 minutes.
                Videos finish on the last frame; GIFs play once and stay on the final frame where supported.
              </p>}
              <div className="record-settings-grid">
                <div>
                  <label className="input-label" htmlFor="export-resolution">Export quality</label>
                  <select id="export-resolution" value={resolution} disabled={capturing}
                    onChange={e=>setResolution(Number(e.target.value) as ExportResolution)}>
                    <option value={360}>360 · SMALL</option>
                    <option value={480}>480 · LIGHT</option>
                    <option value={720}>720 · HD</option>
                    <option value={1080}>1080 · FULL HD</option>
                    <option value={2160}>2160 · ULTRA HD</option>
                  </select>
                </div>
                <div>
                  <label className="input-label" htmlFor="export-fps">Frames / second</label>
                  <select id="export-fps" value={exportFps} disabled={capturing}
                    onChange={e=>setExportFps(Number(e.target.value))}>
                    {[5,10,15,24,30].map(n=><option value={n} key={n}>{n} FPS</option>)}
                  </select>
                </div>
              </div>
              <div className="capture-specs">
                <b>{outputSize[0]} × {outputSize[1]}</b>
                <span>{captureFormat==='gif'?'GIF / 256 COLORS PER FRAME':'VIDEO / MP4 OR WEBM'} · {exportFps} FPS</span>
              </div>
              <label className="toggle"><input type="checkbox" checked={restartCapture} disabled={capturing}
                onChange={e=>setRestartCapture(e.target.checked)}/>
                <span>Restart from original seed before recording</span>
              </label>
              {captureFormat==='gif'&&predictedFrames>250&&
                <p className="capture-warning">⚠ {Math.ceil(predictedFrames)} frames at this resolution can make a very large GIF. Start with 480p / 10 FPS; especially on iPhone.</p>}
              {captureFormat==='video'&&!videoSupported&&
                <p className="capture-warning">This browser has not reported a supported video encoder. GIF recording should still work.</p>}
              <div id="capture-canvas-mount" className={capturing?'capture-live':'capture-live capture-hidden'} aria-label="Live export preview" />
              {capturing&&captureProgress&&<div className="capture-progress" role="status">
                <div><b>{captureProgress.phase}</b><span>{Math.floor(captureProgress.seconds)}s · {captureProgress.frames} frames</span></div>
                <progress max="1" value={captureProgress.fraction}/>
                <p>Keep this tab open while recording. Video exports run in real time.</p>
              </div>}
              {captureError&&!capturing&&<p className="capture-warning" role="alert">EXPORT FAILED: {captureError}</p>}
              <div className="capture-buttons">
                <button className="record-button" disabled={capturing||(captureFormat==='video'&&!videoSupported)}
                  onClick={startCapture}>{capturing?'● RECORDING':'● RECORD '+captureFormat.toUpperCase()}</button>
                {capturing&&<button className="cancel-button" onClick={()=>controllerRef.current?.abort()}>✕ CANCEL</button>}
              </div>
              {lastExport&&!capturing&&<div className="finished-export" role="status">
                <div className="finished-export-top"><b>✓ EXPORT READY · {lastExport.frames} FRAMES</b>
                  <button type="button" className="dismiss-export" aria-label="Close finished export panel" onClick={dismissExport}>×</button>
                </div>
                <div>
                  <span>{lastExport.name} · {lastExport.elapsed.toFixed(1)} sec · {lastExport.distinctFrames} changing steps</span>
                </div>
                <div className="export-preview">
                  {lastExport.extension==='gif'?
                    <img src={lastExport.url} alt="Preview of exported animated GIF" />:
                    <video src={lastExport.url} controls autoPlay muted loop playsInline preload="metadata" />}
                </div>
                {lastExport.distinctFrames===0&&<p className="capture-warning">
                  The mathematical state didn't change during recording, so every frame shows the same picture.
                  Try NEW SEED, a different automaton, or restart from the original seed.
                </p>}
                <button onClick={saveLastExport}>⇩ SAVE / SHARE TO FILES</button>
              </div>}
              <p className="module-note">
                GIF encoding runs on a separate worker thread so the app can show progress and cancel. For first exports, try 360p at 10 FPS for 10 seconds.
                Video is recorded in real time and may save as MP4 or WebM depending on your browser.
                GIF is rendered frame by frame. Recording copies your current universe without changing the live one.
                Larger/longer recordings need more memory. Video contains no audio.
              </p>
            </div>
          </section>
          <section className="future">
            <div className="future-header">COMING OUT OF THE INCUBATOR</div>
            <div className="future-list">
              <div><b>02 / CHROMA</b><span>More rule-to-art patch cables + animated palettes</span></div>
              <div><b>03 / SKIN</b><span>Particles, contours, glitter, geometry & organic morphs</span></div>
              <div><b>04 / RECORD</b><span>GIF + MP4/WebM recording is here! APNG & loop hunting to come.</span></div>
              <div><b>05 / MUTATION</b><span>Breed rules, batch experiments & a local weirdness generator</span></div>
              <div><b>06–07 / BIOLOGY</b><span>Rule parasites, territory fights, Lenia & strange topology</span></div>
            </div>
          </section>
          <footer className="footer">AUTOMATART / CHAOS WITH A REPRODUCIBLE SEED · <a href="https://github.com/merrypranxter/automatart" target="_blank" rel="noreferrer">GITHUB ↗</a></footer>
        </section>
      </main>
      <div aria-live="polite" className="status-msg">{message}</div>
    </div>
  );
}
