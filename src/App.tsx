import { useCallback, useEffect, useRef, useState } from 'react';
import { paletteFromColors, automatartColorsFromPortable } from './palettes/portable';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from 'react';
import { createWorld, stepWorld, rewindWorld } from './engine/sim';
import { lookupCell,polygonForCell,geometryExtent } from './engine/topology';
import {applyAlienStamp,alienFootprint,INITIAL_ALIEN_BRUSH,STAMPS,isGliderCompatible,validateAlienBrush} from './engine/alien-paint';
import type {AlienBrush,BrushSymmetry,StampId} from './engine/alien-paint';
import {snapshotWorld,restoreWorldSnapshot} from './engine/world-snapshot';
import AlienPaintControls from './components/AlienPaintControls';
import { renderWorld } from './engine/render';
import {INITIAL_SNAPSHOT_OPTIONS,snapshotLayout,renderSnapshot,snapshotPng,snapshotFilename} from './engine/snapshot';
import type {SnapshotAspect,SnapshotSize} from './engine/snapshot';
import { randomColors, rotatedColors, shuffledColors } from './engine/funhouse';
import MutantControls from './components/MutantControls';
import NeighborhoodControls from './components/NeighborhoodControls';
import {maxNeighborCount,supportsNeighborhood,validNeighborhoodSettings,normalizeActiveVotes} from './engine/neighborhood';
import MutationControls from './components/MutationControls';
import {mutateAutomatart,requiresWorldRestart,INITIAL_MUTATION_LOCKS} from './engine/mutation-automatart';
import type {MutationLocks,MutationStrength} from './engine/mutation-automatart';
import SkinControls from './components/SkinControls';
import PrintShopControls from './components/PrintShopControls';
import ColorSignalControls from './components/ColorSignalControls';
import {NEW_COLOR_SIGNALS,isNewColorSignal,signalOptions} from './engine/color-signals';
import DualColorControls from './components/DualColorControls';
import CircuitControls from './components/CircuitControls';
import ReactionControls from './components/ReactionControls';
import SpinTurmiteControls from './components/SpinTurmiteControls';
import CyclicDynamicsControls from './components/CyclicDynamicsControls';
import WaveDynamicsControls from './components/WaveDynamicsControls';
import LatticeGasControls from './components/LatticeGasControls';
import {validateDualColor} from './engine/dual-color';
import {validatePrintShop} from './engine/printshop';
import StrangeControls, { SQUARE_ONLY_ENGINES } from './components/StrangeControls';
import {
  captureAnimation, chooseVideoMime, recommendedDimensions, CaptureCancelled
} from './engine/capture';
import type {
  CaptureFormat, CaptureProgress, DurationMode, ExportResolution
} from './engine/capture';
import {
  INITIAL_APPEARANCE, INITIAL_SETTINGS, LIFE_RULES, PALETTES, PALETTE_LIBRARY, MOIRE_PALETTE_NAMES, AUTOMATART_PALETTE_NAMES
} from './engine/types';
import type {
  Appearance, AspectId, ColorBy, EngineId, LifeRule,  PatternId, SimSettings, SkinId, World
} from './engine/types';

const ENGINES: {id:EngineId;name:string;hint:string}[] = [
  {id:'life',name:'LIFE-LIKE',hint:'Birth / survival rules'},
  {id:'brians',name:"BRIAN'S BRAIN",hint:'Electric decay and firing'},
  {id:'cyclic',name:'CYCLIC',hint:'Rainbow species chase'},
  {id:'wolfram',name:'WOLFRAM',hint:'One-dimensional rule history'},
  {id:'generations',name:'AFTERLIFE',hint:'B/S/C living fossils'},
  {id:'excitable',name:'EXCITABLE FLESH',hint:'Excitation/recovery waves'},
  {id:'larger',name:'LARGER THAN LIFE',hint:'Wide-neighborhood growth'},
  {id:'species',name:'SPECIES WAR',hint:'Territorial competition'},
  {id:'oriented',name:'DIRECTIONAL LIFE',hint:'Non-totalistic neighbor patterns'},
  {id:'margolus',name:'REVERSE UNIVERSE',hint:'Reversible 2×2 block CA'},
  {id:'wireworld',name:'WIREWORLD',hint:'Four-state living electrical circuits'},
  {id:'sandpile',name:'ABELIAN SANDPILE',hint:'Conservative grain avalanches'},
  {id:'hodgepodge',name:'HODGEPODGE MACHINE',hint:'Gerhardt-Schuster reaction waves'},
  {id:'forestfire',name:'FOREST FIRE',hint:'Seeded growth, spread and lightning'},
  {id:'ising',name:'ISING MODEL',hint:'Temperature-driven magnetic domains'},
  {id:'turmites',name:'TURMITES',hint:'Langton ant agents writing geometry'},
  {id:'hpp',name:'HPP LATTICE GAS',hint:'Conserving particles, collisions and walls'}
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

type TabId='world'|'rules'|'paint'|'mutate'|'color'|'patch'|'skin'|'print'|'export';
// One tab rail, grouped build → look → output. Dividers sit after the last
// tab of each group. Panels stay mounted (hidden) so nothing loses state.
const TABS:{id:TabId;icon:string;label:string;title:string;blurb:string;divider?:boolean}[]=[
  {id:'world',icon:'◎',label:'WORLD',title:'WORLD MACHINE',blurb:'The board itself: canvas shape, grid, lattice, starting cells and seed. Changes here start a fresh universe.'},
  {id:'rules',icon:'⌘',label:'RULES',title:'RULE REACTOR',blurb:'The local law every cell obeys, plus its neighborhood. Edits apply to the running universe.'},
  {id:'paint',icon:'✎',label:'PAINT',title:'ALIEN PAINTBRUSH',blurb:'Tap or drag on the canvas to plant real cells. Quick paint / erase / invert also sit under the canvas.'},
  {id:'mutate',icon:'☣',label:'MUTATE',title:'MUTATION DICE',blurb:'Seeded, rule-safe chaos for this exact universe. Undo restores the previous cells too.',divider:true},
  {id:'color',icon:'🌈',label:'COLOR',title:'COLOR UNIVERSE',blurb:'Palette, color stops and chromatic misbehavior. Shared palette format across the suite.'},
  {id:'patch',icon:'🔌',label:'PATCH',title:'CHROMA PATCHBAY',blurb:'Route real math into color: which signal decides each cell\'s color, alone or mixed A + B.'},
  {id:'skin',icon:'◈',label:'SKIN',title:'SKIN MACHINE',blurb:'How cells are drawn. Visual only — the automaton never changes.'},
  {id:'print',icon:'▦',label:'PRINT',title:'PRINT SHOP',blurb:'Stackable print effects layered on top of the skin. Visual only.',divider:true},
  {id:'export',icon:'↓',label:'EXPORT',title:'EXPORT',blurb:'Record GIF / video, save a full-res PNG, or keep the whole universe as a JSON recipe.'}
];
const TAB_STORAGE_KEY='automatart.activeTab';
function initialTab():TabId{
  try{
    const saved=localStorage.getItem(TAB_STORAGE_KEY);
    if(TABS.some(t=>t.id===saved))return saved as TabId;
  }catch{/* storage unavailable: default tab */}
  return 'world';
}
function PanelHead({id}:{id:TabId}){
  const tab=TABS.find(t=>t.id===id)!;
  return <header className="panel-head"><h2>{tab.title}</h2><p>{tab.blurb}</p></header>;
}

function download(name:string, content:Blob | string):void{
  const url=typeof content==='string'?content:URL.createObjectURL(content);
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  if(typeof content!=='string')window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function cloneWorld(world:World):World{
  return {...world,
    cells:world.cells.slice(),grains:world.grains?.slice(),hppWalls:world.hppWalls?.slice(),
    turmiteAgents:world.turmiteAgents?.map(a=>({...a})),ages:world.ages.slice(),
    neighbors:world.neighbors.slice(),events:world.events.slice(),
    traces:world.traces.slice(),previousCells:world.previousCells?.slice(),
    olderCells:world.olderCells?.slice(),fossils:world.fossils?.slice()};
}
function stat(world:World):number{
  let living=0;for(let i=0;i<world.cells.length;i++)if(world.cells[i]!==0)living++;
  return living;
}

function validatedCyclicReach(v:unknown,states:number):number{
 const n=Number(v);
 return Number.isInteger(n)?Math.max(1,Math.min(6,states-1,n)):1;
}
function validatedCyclicDrive(v:unknown):number{
 const n=Number(v);
 return Number.isFinite(n)?Math.max(0,Math.min(.01,n)):0;
}
export default function App(){
  const [settings,setSettings]=useState<SimSettings>(INITIAL_SETTINGS);
  const [appearance,setAppearance]=useState<Appearance>(INITIAL_APPEARANCE);
  const [playing,setPlaying]=useState(true);
  const [batchProgress,setBatchProgress]=useState<{done:number;total:number}|null>(null);
  const batchTokenRef=useRef(0);
  const [speed,setSpeed]=useState(18);
  const [alienBrush,setAlienBrush]=useState<AlienBrush>({...INITIAL_ALIEN_BRUSH});
  const strokeCounterRef=useRef(0);
  const strokeLogRef=useRef<{x:number;y:number;seed:number;brush:AlienBrush}[]>([]);
  const previewRef=useRef<HTMLCanvasElement>(null);
  const hoveredCellRef=useRef<[number,number]|null>(null);
  const strokeLastCellRef=useRef<string|null>(null);
  const [paintSpecies,setPaintSpecies]=useState(1);
  const [inspectedCell,setInspectedCell]=useState<[number,number]|null>(null);
  const [mutationStrength,setMutationStrength]=useState<MutationStrength>('weird');
  const [mutationLocks,setMutationLocks]=useState<MutationLocks>({...INITIAL_MUTATION_LOCKS});
  const [allowMutationRestart,setAllowMutationRestart]=useState(false);
  const [lastMutation,setLastMutation]=useState<{seed:number;changes:string[];willRestart:boolean}|null>(null);
  const [hasMutationUndo,setHasMutationUndo]=useState(false);
  const [generation,setGeneration]=useState(0);
  const [population,setPopulation]=useState(0);
  const [resetNumber,setResetNumber]=useState(0);
  const [message,setMessage]=useState('');
  const [snapshotAspect,setSnapshotAspect]=useState<SnapshotAspect>(INITIAL_SNAPSHOT_OPTIONS.aspect);
  const [snapshotSize,setSnapshotSize]=useState<SnapshotSize>(INITIAL_SNAPSHOT_OPTIONS.shortSide);
  const [snapshotBusy,setSnapshotBusy]=useState(false);
  const [lastStill,setLastStill]=useState<{
    name:string;blob:Blob;url:string;width:number;height:number
  }|null>(null);
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
  const [hiddenWarnings,setHiddenWarnings]=useState<string[]>([]);
  const [hideStaticWarning,setHideStaticWarning]=useState(false);
  const hideWarning=(key:string)=>setHiddenWarnings(v=>v.includes(key)?v:[...v,key]);
  const dismissFailure=()=>{
    setCaptureError(null);
    setMessage(v=>v.startsWith('Export failed:')?'':v);
  };
  useEffect(()=>{
    if(!message)return;
    const timeout=window.setTimeout(()=>setMessage(''),7000);
    return ()=>window.clearTimeout(timeout);
  },[message]);
  const controllerRef=useRef<AbortController|null>(null);
  const recordingRef=useRef(false);
  useEffect(()=>()=>{if(lastExport)URL.revokeObjectURL(lastExport.url);},[lastExport]);
  useEffect(()=>()=>{if(lastStill)URL.revokeObjectURL(lastStill.url);},[lastStill]);
  const worldRef=useRef<World>(createWorld(INITIAL_SETTINGS));
  const undoMutationRef=useRef<{
    settings:SimSettings;appearance:Appearance;world:World;
    last:{seed:number;changes:string[];willRestart:boolean}|null
  }|null>(null);
  const pendingWorldRestoreRef=useRef<World|null>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stageRef=useRef<HTMLElement>(null);
  const viewerWrapRef=useRef<HTMLDivElement>(null);
  const [viewerFullscreen,setViewerFullscreen]=useState(false);
  const [activeTab,setActiveTab]=useState<TabId>(initialTab);
  const selectTab=(id:TabId)=>{
    setActiveTab(id);
    try{localStorage.setItem(TAB_STORAGE_KEY,id);}catch{/* not persisted */}
  };
  function onTabKey(event:ReactKeyboardEvent<HTMLElement>){
    const keys=['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'];
    if(!keys.includes(event.key))return;
    event.preventDefault();
    const index=TABS.findIndex(t=>t.id===activeTab);
    const next=event.key==='Home'?0:event.key==='End'?TABS.length-1:
      (index+(event.key==='ArrowDown'||event.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length;
    selectTab(TABS[next].id);
    document.getElementById('tab-'+TABS[next].id)?.focus();
  }
  // The simulation paints to a fixed-resolution backing canvas; CSS alone
  // with width:auto never enlarges it for a big desktop monitor. Compute an
  // actual displayed size that covers as much of the stage (or fullscreen
  // frame) as possible, without distorting the cell grid or export pixels.
  useEffect(()=>{
    const wrap=viewerWrapRef.current;
    const canvas=canvasRef.current;
    if(!wrap||!canvas)return;
    const fit=()=>{
      if(!canvas.width||!canvas.height||!wrap.clientWidth||!wrap.clientHeight)return;
      const availableWidth=Math.max(1,wrap.clientWidth-2);
      const availableHeight=Math.max(1,wrap.clientHeight-2);
      const scale=Math.min(availableWidth/canvas.width,availableHeight/canvas.height);
      wrap.style.setProperty('--fullscreen-preview-width',Math.max(1,Math.floor(canvas.width*scale))+'px');
      wrap.style.setProperty('--fullscreen-preview-height',Math.max(1,Math.floor(canvas.height*scale))+'px');
    };
    const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(fit):null;
    resizeObserver?.observe(wrap);
    // renderWorld only changes backing dimensions when the grid/aspect changes.
    // This catches those changes without a resize loop or per-frame layout read.
    const attributeObserver=new MutationObserver(fit);
    attributeObserver.observe(canvas,{attributes:true,attributeFilter:['width','height']});
    window.addEventListener('resize',fit);
    const initialFrame=window.requestAnimationFrame(fit);
    return ()=>{
      resizeObserver?.disconnect();
      attributeObserver.disconnect();
      window.removeEventListener('resize',fit);
      window.cancelAnimationFrame(initialFrame);
      wrap.style.removeProperty('--fullscreen-preview-width');
      wrap.style.removeProperty('--fullscreen-preview-height');
    };
  },[viewerFullscreen]);
  useEffect(()=>{
    document.body.classList.toggle('art-viewer-open',viewerFullscreen);
    return ()=>document.body.classList.remove('art-viewer-open');
  },[viewerFullscreen]);
  useEffect(()=>{
    function onFullscreenChange(){
      if(!document.fullscreenElement)setViewerFullscreen(false);
    }
    function onEscape(event:KeyboardEvent){
      if(event.key==='Escape')setViewerFullscreen(false);
    }
    document.addEventListener('fullscreenchange',onFullscreenChange);
    document.addEventListener('keydown',onEscape);
    return ()=>{
      document.removeEventListener('fullscreenchange',onFullscreenChange);
      document.removeEventListener('keydown',onEscape);
    };
  },[]);
  async function toggleViewerFullscreen(){
    const stage=stageRef.current;
    if(!stage)return;
    if(viewerFullscreen){
      if(document.fullscreenElement===stage){
        try{await document.exitFullscreen();}catch{/* CSS fallback still closes */}
      }
      setViewerFullscreen(false);
    }else{
      // The overlay is also the fallback on iPhone browsers without element fullscreen.
      setViewerFullscreen(true);
      if(typeof stage.requestFullscreen==='function'){
        try{await stage.requestFullscreen();}catch{/* Fixed overlay remains active */}
      }
    }
  }
  const loadRef=useRef<HTMLInputElement>(null);
  const paletteImportRef=useRef<HTMLInputElement>(null);
  const recorderRef=useRef<HTMLDivElement>(null);
  const jumpToRecorder=()=>{
    selectTab('export');
    requestAnimationFrame(()=>recorderRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  const updateSetting=<K extends keyof SimSettings>(key:K,value:SimSettings[K])=>
    setSettings(s=>({...s,[key]:value}));
  const updateAppearance=<K extends keyof Appearance>(key:K,value:Appearance[K])=>
    setAppearance(a=>({...a,[key]:value}));
  const toggleCustomRule=(kind:'customBirth'|'customSurvive',number:number)=>{
    setSettings(s=>({...s,lifeRule:'custom',
      [kind]:s[kind].includes(number)?s[kind].filter(v=>v!==number):[...s[kind],number].sort((a,b)=>a-b)}));
  };
  // Selecting an existing named palette and inventing a completely new RGB
  // palette are different actions. Neither touches math, skins, or print modes.
  const randomPreset=()=>{
    const options=Object.values(PALETTES).filter(colors=>
      colors.length!==appearance.palette.length||
      colors.some((c,i)=>c.toLowerCase()!==appearance.palette[i]?.toLowerCase()));
    if(!options.length)return;
    const colors=options[Math.floor(Math.random()*options.length)];
    setAppearance(a=>({...a,palette:[...colors]}));
    setMessage('Loaded a different existing color palette. All swatches remain editable.');
  };
  const inventPalette=()=>{
    setAppearance(a=>({...a,palette:randomColors(a.palette.length)}));
    setMessage('Invented a completely new random RGB palette. Edit any swatch you like.');
  };
  const shuffleStops=()=>setAppearance(a=>({...a,palette:shuffledColors(a.palette)}));
  const flipStops=()=>setAppearance(a=>({...a,palette:[...a.palette].reverse()}));
  const rotateStops=()=>setAppearance(a=>({...a,palette:rotatedColors(a.palette)}));
  const cancelBatch=()=>{
    batchTokenRef.current++;
    setBatchProgress(null);
  };
  function mutateNow(){
    if(recordingRef.current||batchProgress!==null)return;
    const bytes=new Uint32Array(1);
    if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);
    else bytes[0]=(Math.random()*0xffffffff)>>>0;
    try{
      const result=mutateAutomatart(settings,appearance,{
        strength:mutationStrength,locks:mutationLocks,allowRestart:allowMutationRestart
      },bytes[0]);
      cancelBatch();
      undoMutationRef.current={
        settings:{...settings,customBirth:[...settings.customBirth],
          customSurvive:[...settings.customSurvive],
          genBirth:[...settings.genBirth],genSurvive:[...settings.genSurvive]},
        appearance:{...appearance,palette:[...appearance.palette]},
        world:cloneWorld(worldRef.current),last:lastMutation
      };
      setHasMutationUndo(true);
      const metadata={seed:result.mutationSeed,changes:result.changes,willRestart:result.willRestart};
      setLastMutation(metadata);
      if(result.willRestart)setPlaying(false);
      setSettings(result.settings);
      setAppearance(result.appearance);
      setMessage('Mutation '+result.mutationSeed+': '+result.changes.join(' · ')+
        (result.willRestart?' — NEW UNIVERSE GENERATED':' — LIVE WORLD KEPT'));
    }catch(error){
      setMessage('Mutation blocked: '+(error instanceof Error?error.message:String(error)));
    }
  }
  function undoMutation(){
    const undo=undoMutationRef.current;
    if(!undo||recordingRef.current||batchProgress!==null)return;
    cancelBatch();
    setPlaying(false);
    const restored=cloneWorld(undo.world);
    if(requiresWorldRestart(settings,undo.settings)){
      // The structural settings effect owns world initialization; restore
      // the real previous generations and painted cells there, *after*
      // React applies the previous seed/engine. No misleading pseudo-undo.
      pendingWorldRestoreRef.current=restored;
    }else{
      worldRef.current=restored;
      setGeneration(restored.generation);
      setPopulation(stat(restored));
    }
    setSettings(undo.settings);
    setAppearance(undo.appearance);
    setLastMutation(undo.last);
    undoMutationRef.current=null;
    setHasMutationUndo(false);
    setMessage('Previous rule, colors, seed and exact living cell state restored.');
  }
  function createStrokeSeed(x:number,y:number):number{
    strokeCounterRef.current++;
    return (settings.seed ^ Math.imul(worldRef.current.generation+1,0x9e3779b1) ^
      Math.imul(strokeCounterRef.current,0x85ebca6b) ^ (x<<16) ^ y)>>>0;
  }
  function drawStampPreview(anchor:[number,number]|null){
    hoveredCellRef.current=anchor;
    const overlay=previewRef.current;
    const main=canvasRef.current;
    if(!overlay||!main)return;
    overlay.width=main.width;overlay.height=main.height;
    const ctx=overlay.getContext('2d');
    if(!ctx||!anchor)return;
    const world=worldRef.current;
    const seed= (settings.seed ^ Math.imul(world.generation+1,0x9e3779b1) ^
      Math.imul(strokeCounterRef.current+1,0x85ebca6b) ^ (anchor[0]<<16)^anchor[1])>>>0;
    const affected=alienFootprint(world,anchor,alienBrush,seed);
    const shape=world.lattice??'square';
    const [ex,ey]=geometryExtent(shape,world.width,world.height);
    const sx=overlay.width/ex,sy=overlay.height/ey;
    // Limit preview complexity; planting itself still affects all cells.
    ctx.strokeStyle='#ffff7a';ctx.lineWidth=1.8;ctx.fillStyle='rgba(255,20,192,.23)';
    for(const index of affected.slice(0,2200)){
      const x=index%world.width,y=Math.floor(index/world.width);
      const polygon=polygonForCell(shape,x,y);
      ctx.beginPath();
      for(let i=0;i<polygon.length;i++){
        const [px,py]=polygon[i];
        if(i===0)ctx.moveTo(px*sx,py*sy);else ctx.lineTo(px*sx,py*sy);
      }
      ctx.closePath();ctx.fill();ctx.stroke();
    }
  }
  useEffect(()=>{drawStampPreview(hoveredCellRef.current);},
    [alienBrush,settings.lattice,settings.cellCount,settings.aspect,settings.engine,viewerFullscreen]);
  useEffect(()=>{
    setAlienBrush(prev=>validateAlienBrush(prev,settings));
  },[settings.engine,settings.lattice,settings.lifeRule,settings.neighborShape,settings.speciesCount]);
  const draw=useCallback(()=>{
    if(canvasRef.current)renderWorld(canvasRef.current,worldRef.current,appearance,900);
  },[appearance]);

  // Any rule-setting edit cancels a pending batch before new math is applied.
  useEffect(()=>{batchTokenRef.current++;setBatchProgress(null);},[settings]);

  // Recreate only when initial-world geometry/seed changes.
  // Rule, color and trail adjustments now affect the running simulation.
  useEffect(()=>{
    worldRef.current=pendingWorldRestoreRef.current??createWorld(settings);
    pendingWorldRestoreRef.current=null;
    setGeneration(worldRef.current.generation);
    setPopulation(stat(worldRef.current));
  },[settings.engine,settings.cellCount,settings.aspect,settings.seed,
      settings.pattern,settings.density,settings.cyclicStates,
      settings.genStates,settings.exciteStates,settings.speciesCount,settings.hodgeStates,
      settings.turmiteRule,settings.turmiteCount,
      settings.lattice,resetNumber]);
  useEffect(()=>{
    // Rule-only neighborhood changes preserve living cells and generation,
    // but visual entropy/flow inspectors must use the CURRENT rule graph.
    worldRef.current.neighborShape=settings.engine==='sandpile'||settings.engine==='forestfire'||settings.engine==='ising'||settings.engine==='turmites'||settings.engine==='hpp'?'vonNeumann':
      settings.engine==='hodgepodge'?'moore':settings.neighborShape;
    worldRef.current.neighborMask=settings.neighborMask;
    worldRef.current.customStencilMask=settings.customStencilMask;
    worldRef.current.customStencilSize=settings.customStencilSize;
    worldRef.current.wrap=settings.wrap;
  },[settings.neighborShape,settings.neighborMask,settings.customStencilMask,
    settings.customStencilSize,settings.wrap,settings.engine]);
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
    cancelBatch();
    setPlaying(false);
    worldRef.current=stepWorld(worldRef.current,settings);
    setGeneration(worldRef.current.generation);
    setPopulation(stat(worldRef.current));
    draw();
  }
  async function advanceBatch(total:10|100){
    if(recordingRef.current||batchProgress!==null)return;
    batchTokenRef.current++;
    const token=batchTokenRef.current;
    setPlaying(false);
    setBatchProgress({done:0,total});
    let done=0;
    // Max three generations per animation frame keeps iOS paint/cancel responsive.
    while(done<total&&batchTokenRef.current===token&&!recordingRef.current){
      const chunk=Math.min(3,total-done);
      for(let i=0;i<chunk;i++){
        worldRef.current=stepWorld(worldRef.current,settings);
        done++;
      }
      setGeneration(worldRef.current.generation);
      setPopulation(stat(worldRef.current));
      draw();
      setBatchProgress({done,total});
      if(done<total){
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      }
    }
    if(batchTokenRef.current===token){
      setBatchProgress(null);
      setMessage('Advanced precisely '+done+' generations without changing the universe seed.');
    }
  }
  function rewindStep(){
    cancelBatch();
    if(settings.engine!=='margolus'||worldRef.current.generation===0)return;
    setPlaying(false);
    worldRef.current=rewindWorld(worldRef.current,settings);
    setGeneration(worldRef.current.generation);
    setPopulation(stat(worldRef.current));
    draw();
  }
  function restart(){
    cancelBatch();
    setResetNumber(n=>n+1);
    setMessage('Universe restarted from its exact seed.');
  }
  function randomize(){
    cancelBatch();
    updateSetting('seed',Math.floor(Math.random()*4294967295));
    setMessage('New seeded universe generated. Keep the seed if you like it.');
  }
  function locatePointer(e:PointerEvent<HTMLCanvasElement>):[number,number]|null{
    const canvas=canvasRef.current;if(!canvas)return null;
    const rect=canvas.getBoundingClientRect();
    return lookupCell(worldRef.current.lattice??'square',worldRef.current.width,
      worldRef.current.height,(e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);
  }
  function plantAt(e:PointerEvent<HTMLCanvasElement>){
    if(recordingRef.current)return;
    const point=locatePointer(e);
    if(!point)return;
    const [x,y]=point;
    if(strokeLastCellRef.current===x+','+y)return;
    setInspectedCell([x,y]);
    strokeLastCellRef.current=x+','+y;
    cancelBatch();
    const seed=createStrokeSeed(x,y);
    const brush={...alienBrush,species:paintSpecies};
    try{applyAlienStamp(worldRef.current,settings,[x,y],brush,seed);}
    catch(error){setMessage('Paint rejected: '+(error instanceof Error?error.message:String(error)));return;}
    strokeLogRef.current.push({x,y,seed,brush:{...brush}});
    if(strokeLogRef.current.length>1500)strokeLogRef.current.shift();
    setPopulation(stat(worldRef.current));
    draw();
    drawStampPreview(point);
  }
  function onPointerDown(e:PointerEvent<HTMLCanvasElement>){
    if(recordingRef.current)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    strokeLastCellRef.current=null;
    plantAt(e);
  }
  function onPointerMove(e:PointerEvent<HTMLCanvasElement>){
    const point=locatePointer(e);
    if(!point){drawStampPreview(null);return;}
    if((e.buttons!==0||e.pointerType==='touch')&&alienBrush.stamp==='brush'){
      plantAt(e);
    }else drawStampPreview(point);
  }
  function onPointerUp(){
    strokeLastCellRef.current=null;
    drawStampPreview(null);
  }
  function randomAlienStamp(){
    const all=Object.keys(STAMPS).filter(key=>key!=='brush'&&
      (key!=='glider'||isGliderCompatible(settings))) as StampId[];
    const options=all.filter(id=>id!==alienBrush.stamp);
    const next=options[Math.floor(Math.random()*options.length)]??'spore';
    setAlienBrush(b=>({...b,stamp:next}));
  }
  function randomAlienSymmetry(){
    const options=(['single','mirror','quad','radial8'] as BrushSymmetry[])
      .filter(x=>x!==alienBrush.symmetry);
    const next=options[Math.floor(Math.random()*options.length)]??'mirror';
    setAlienBrush(b=>({...b,symmetry:next}));
  }
  async function savePng(){
    if(snapshotBusy||recordingRef.current)return;
    setSnapshotBusy(true);
    setMessage('Rendering a full-resolution PNG snapshot…');
    try{
      // Snapshot the exact CURRENT world. No seed restart, stepping, or
      // changed cells. Use the same skins, Print Shop and palette as preview.
      const source=cloneWorld(worldRef.current);
      const canvas=document.createElement('canvas');
      const dimensions=renderSnapshot(canvas,source,settings,appearance,{
        aspect:snapshotAspect,shortSide:snapshotSize
      });
      const blob=await snapshotPng(canvas);
      const name=snapshotFilename(settings,source,dimensions);
      setLastStill({blob,name,url:URL.createObjectURL(blob),
        width:dimensions.width,height:dimensions.height});
      if(!/iPad|iPhone|iPod/i.test(navigator.userAgent))download(name,blob);
      setMessage('PNG ready: '+dimensions.width+' × '+dimensions.height+
        '. On iPhone tap SAVE / SHARE to save to Photos or Files.');
    }catch(error){
      setMessage('PNG snapshot failed: '+(error instanceof Error?error.message:'Unknown error'));
    }finally{
      setSnapshotBusy(false);
    }
  }
  async function shareStill(){
    if(!lastStill)return;
    const file=new File([lastStill.blob],lastStill.name,{type:'image/png'});
    if(typeof navigator.share==='function'&&typeof navigator.canShare==='function'
      &&navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file],title:'Automatart PNG snapshot'});
        return;
      }catch(error){
        if(error instanceof DOMException&&error.name==='AbortError')return;
      }
    }
    download(lastStill.name,lastStill.blob);
  }
  function savePortablePalette(){
    try{
      const colors=appearance.palette;
      const known=PALETTE_LIBRARY.find(p=>p.colors.length===colors.length&&p.colors.every((c,i)=>c.toLowerCase()===colors[i]?.toLowerCase()));
      const document=paletteFromColors(colors,known?.id??'automatart/custom',known?.name??'Custom Automatart palette',known?.source??'automatart');
      const blob=new Blob([JSON.stringify(document,null,2)],{type:'application/json'});
      download('automatart-palette-'+(known?.id.replace('/','-')??'custom')+'.json',blob);
      setMessage('Portable palette JSON saved. Import into It\'s a Moiré or Math Art Suite.');
    }catch(error){
      setMessage('Palette export failed: '+(error instanceof Error?error.message:'Unknown error'));
    }
  }
  async function loadPortablePalette(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    try{
      if(file.size>65536)throw new Error('Palette file too large (64 KB max)');
      const document:unknown=JSON.parse(await file.text());
      const colors=automatartColorsFromPortable(document);
      setAppearance(a=>({...a,palette:colors}));
      setMessage('Imported '+colors.length+' exact colors from a portable palette. Automaton rules and world state are unchanged.');
    }catch(error){
      setMessage('Palette import rejected: '+(error instanceof Error?error.message:'Invalid file'));
    }
  }
  function saveRecipe(){
    const recipe={kind:'automatart-recipe-v1',settings,appearance,
      world:snapshotWorld(worldRef.current),
      alien:{brush:alienBrush,strokeCount:strokeCounterRef.current,
        recentStrokes:strokeLogRef.current},
      funhouse:lastMutation?{mutationSeed:lastMutation.seed,
        changes:lastMutation.changes,strength:mutationStrength,
        locks:mutationLocks,allowRestart:allowMutationRestart}:undefined};
    download('automatart-recipe-'+settings.seed+'.json',
      new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}));
    setMessage('Saved recipe including real cell states, generations, your Alien Paintbrush and recent stamp seeds.');
  }
  async function loadRecipe(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value='';
    if(!file)return;
    try{
      if(file.size>8*1024*1024)throw new Error('Recipe exceeds 8 MB size limit');
      const data=JSON.parse(await file.text());
      if(data.kind!=='automatart-recipe-v1'||!data.settings||!data.appearance)throw new Error('Not an Automatart recipe');
      const s:SimSettings={...INITIAL_SETTINGS,...data.settings};
      if(!ENGINES.some(v=>v.id===s.engine))throw new Error('Unknown engine');
      if(!['square','portrait','landscape'].includes(s.aspect))throw new Error('Invalid aspect');
      if(!['noise','center','rings','stripes','checker','spiral','web'].includes(s.pattern))throw new Error('Invalid seed pattern');
      if(!Object.hasOwn(LIFE_RULES,s.lifeRule))throw new Error('Invalid life rule');
      if(!Number.isInteger(s.cellCount)||s.cellCount<32||s.cellCount>256)throw new Error('Invalid grid size');
      // The geometry/partition requires even horizontal dimensions.
      if(s.cellCount%2!==0)s.cellCount=Math.min(256,s.cellCount+1);
      if(!['square','hex','triangle','rhombille'].includes(s.lattice))s.lattice='square';
      if(SQUARE_ONLY_ENGINES.includes(s.engine))s.lattice='square';
      if(s.engine==='margolus')s.wrap=true;
      if(!['moore','vonNeumann','square2','diamond2','directional','custom'].includes(s.neighborShape))
        throw new Error('Invalid neighborhood rule');
      s.neighborMask=Number.isInteger(s.neighborMask)?s.neighborMask:255;
      // Older specimens did not include B2 stencils; the initial default
      // supplies a valid 8-neighbor custom preset without changing their active rule.
      if(!validNeighborhoodSettings(s))throw new Error('Neighborhood and engine/lattice are incompatible');
      // Validate all saved rules against the largest compatible local graph;
      // constrain only the active engine after all presets are loaded.
      const savedRuleCap=24;
      s.orientedMask=Math.max(1,Math.min(255,Math.floor(Number(s.orientedMask)||34)));
      if(!['fixed','rotations','dihedral'].includes(s.orientedSymmetry))s.orientedSymmetry='rotations';
      if(!['exact','contains'].includes(s.orientedMatch))s.orientedMatch='exact';
      const survMin=Number(s.orientedSurviveMin),survMax=Number(s.orientedSurviveMax);
      s.orientedSurviveMin=Number.isFinite(survMin)?Math.max(0,Math.min(8,Math.floor(survMin))):2;
      s.orientedSurviveMax=Number.isFinite(survMax)?Math.max(s.orientedSurviveMin,Math.min(8,Math.floor(survMax))):3;
      if(!Number.isFinite(s.density)||s.density<0||s.density>1)throw new Error('Invalid density');
      if(!Number.isFinite(s.seed))throw new Error('Invalid seed');
      s.seed=s.seed>>>0;s.cyclicStates=Math.max(3,Math.min(24,Math.floor(s.cyclicStates)||12));
      s.cyclicThreshold=Math.max(1,Math.min(savedRuleCap,Math.floor(s.cyclicThreshold)||2));
      // Legacy JSON with no new fields preserves the exact classic CA rule.
      s.cyclicReach=validatedCyclicReach(data.settings.cyclicReach,s.cyclicStates);
      s.cyclicDrive=validatedCyclicDrive(data.settings.cyclicDrive);
      s.wolframRule=Math.max(0,Math.min(255,Math.floor(s.wolframRule)||30));

      for(const k of ['customBirth','customSurvive'] as const){
        if(!Array.isArray(s[k]))s[k]=k==='customBirth'?[3]:[2,3];
        s[k]=[...new Set(s[k].filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=savedRuleCap))].sort((a,b)=>a-b);
      }
      s.trailDecay=Math.min(0.99,Math.max(0.65,Number(s.trailDecay)||0.89));
      const bounded=(v:unknown,min:number,max:number,fallback:number)=>{
        const n=Number(v);
        return Number.isFinite(n)?Math.min(max,Math.max(min,Math.floor(n))):fallback;
      };
      s.genStates=bounded(s.genStates,3,24,8);
      s.exciteStates=bounded(s.exciteStates,3,24,8);
      s.exciteThreshold=bounded(s.exciteThreshold,1,savedRuleCap,2);
      if(!['off','sparks','clock'].includes(s.waveStimulus))throw new Error('Invalid wave stimulus mode');
      if(!['center','quad','ring'].includes(s.waveClockSource))throw new Error('Invalid wave source');
      s.waveClockPeriod=bounded(s.waveClockPeriod,1,120,12);
      const waveRate=Number(s.waveSparkRate);
      if(!Number.isFinite(waveRate))throw new Error('Invalid wave spark probability');
      s.waveSparkRate=Math.min(.01,Math.max(0,waveRate));
      s.largeRadius=bounded(s.largeRadius,1,5,2);
      const maxNear=(2*s.largeRadius+1)**2-1;
      s.largeBirthMin=bounded(s.largeBirthMin,0,maxNear,6);
      s.largeBirthMax=bounded(s.largeBirthMax,s.largeBirthMin,maxNear,9);
      s.largeSurviveMin=bounded(s.largeSurviveMin,0,maxNear,5);
      s.largeSurviveMax=bounded(s.largeSurviveMax,s.largeSurviveMin,maxNear,12);
      s.speciesCount=bounded(s.speciesCount,2,8,3);
      s.speciesBirth=bounded(s.speciesBirth,1,savedRuleCap,2);
      s.speciesSurvive=bounded(s.speciesSurvive,0,savedRuleCap,1);
      s.speciesAttackBias=bounded(s.speciesAttackBias,0,savedRuleCap,1);
      s.wireBrush=bounded(s.wireBrush,1,3,1) as 1|2|3;
      s.sandFeed=bounded(s.sandFeed,0,64,6);
      s.sandRounds=bounded(s.sandRounds,1,8,3);
      s.sandBrush=bounded(s.sandBrush,1,64,8);
      if(!['center','random'].includes(s.sandSource))s.sandSource='center';
      s.hodgeStates=bounded(s.hodgeStates,8,64,48);
      s.hodgeK1=bounded(s.hodgeK1,1,8,2);
      s.hodgeK2=bounded(s.hodgeK2,1,8,3);
      s.hodgeGrowth=bounded(s.hodgeGrowth,1,40,12);
      s.hodgeBrush=bounded(s.hodgeBrush,1,s.hodgeStates,28);
      s.forestGrowth=Math.max(0,Math.min(.2,Number.isFinite(Number(s.forestGrowth))?Number(s.forestGrowth):.012));
      s.forestLightning=Math.max(0,Math.min(.025,Number.isFinite(Number(s.forestLightning))?Number(s.forestLightning):.0005));
      s.forestBrush=bounded(s.forestBrush,1,2,2) as 1|2;
      const finite=(v:unknown,low:number,high:number,fall:number)=>{
        const n=Number(v);return Number.isFinite(n)?Math.max(low,Math.min(high,n)):fall;
      };
      s.isingTemperature=finite(s.isingTemperature,0,5,2.25);
      s.isingCoupling=finite(s.isingCoupling,-2,2,1);
      s.isingField=finite(s.isingField,-2,2,0);
      s.isingSweeps=bounded(s.isingSweeps,1,4,1);
      s.isingBrush=bounded(s.isingBrush,0,1,1) as 0|1;
      if(typeof s.turmiteRule!=="string"||!/^[LR]{2,12}$/.test(s.turmiteRule))
        throw new Error("Invalid Turmite turning rule");
      s.turmiteCount=bounded(s.turmiteCount,1,12,1);
      s.turmiteBrush=bounded(s.turmiteBrush,0,s.turmiteRule.length-1,1);
      s.hppBrush=bounded(s.hppBrush,1,15,15);
      if(!['particles','walls'].includes(s.hppTool))throw new Error('Invalid HPP brush material');
      for(const key of ['genBirth','genSurvive'] as const){
        if(!Array.isArray(s[key]))s[key]=key==='genBirth'?[3]:[2,3];
        s[key]=[...new Set(s[key].filter((v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=savedRuleCap))].sort((a,b)=>a-b);
      }
      Object.assign(s,normalizeActiveVotes(s));
      const a:Appearance={...INITIAL_APPEARANCE,...data.appearance};
      if(!Array.isArray(a.palette)||a.palette.length<2||a.palette.length>32||a.palette.some(v=>typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v)))throw new Error('Invalid palette');
      if(!['state','age','neighbors','events','radius','x','activity',...NEW_COLOR_SIGNALS.map(v=>v.id)].includes(a.colorBy))throw new Error('Invalid color mapping');
      if(!['pixels','soft','glow','contours','mercury','relief','glass'].includes(a.skin))throw new Error('Invalid skin');
      a.paletteOffset=Math.min(31,Math.max(-31,Number(a.paletteOffset)||0));
      a.paletteCycle=Math.min(1,Math.max(-1,Number(a.paletteCycle)||0));
      const controls=signalOptions(a);
      a.signalFrequency=controls.frequency;a.signalPhase=controls.phase;
      a.signalCenterX=controls.centerX;a.signalCenterY=controls.centerY;
      a.signalHistory=controls.history;
      a.saturation=Math.min(3,Math.max(0,Number(a.saturation)??1));
      a.contrast=Math.min(3,Math.max(0.2,Number(a.contrast)||1));
      a.brightness=Math.min(2.5,Math.max(0.15,Number(a.brightness)||1));
      a.glowStrength=Math.min(1,Math.max(0,Number(a.glowStrength)??0.8));
      const numeric=(value:unknown,min:number,max:number,fallback:number)=>{
        const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
      };
      a.skinThreshold=numeric(a.skinThreshold,0.05,0.95,0.42);
      a.contourLines=Math.round(numeric(a.contourLines,2,9,5));
      a.contourWidth=numeric(a.contourWidth,0.5,6,1.5);
      a.chromeStrength=numeric(a.chromeStrength,0,1.5,0.8);
      a.glassLines=numeric(a.glassLines,0,1,0.7);
      a.temporalRGB=numeric(a.temporalRGB,0,1,0);
      a.fossilOpacity=numeric(a.fossilOpacity,0,1,0);
      if(!['forward','pingpong'].includes(a.paletteMotion))a.paletteMotion='forward';
      a.paletteReverse=!!a.paletteReverse;
      a.smoothPalette=!!a.smoothPalette;
      // Older JSON recipes have no Print Shop; they stay visually unchanged.
      // Malformed future print settings are bounded to safe ranges.
      a.print=validatePrintShop(a.print);
      a.dualColor=validateDualColor(a.dualColor);
      const restored=data.world?restoreWorldSnapshot(data.world,s):null;
      const brushLoaded=validateAlienBrush(data.alien?.brush,s);
      const recent=Array.isArray(data.alien?.recentStrokes)?
        data.alien.recentStrokes.filter((entry:unknown)=>{
          if(!entry||typeof entry!=='object')return false;
          const v=entry as {x?:unknown;y?:unknown;seed?:unknown};
          return Number.isInteger(v.x)&&Number.isInteger(v.y)&&
            typeof v.seed==='number'&&Number.isInteger(v.seed);
        }).slice(-1500):[];
      strokeCounterRef.current=Number.isInteger(data.alien?.strokeCount)&&
        data.alien.strokeCount>=0?Math.min(data.alien.strokeCount,1e9):0;
      strokeLogRef.current=recent;
      hoveredCellRef.current=null;
      setAlienBrush(brushLoaded);
      undoMutationRef.current=null;
      pendingWorldRestoreRef.current=restored;
      setHasMutationUndo(false);
      setLastMutation(null);
      setPlaying(false);
      setSettings(s);setAppearance(a);setResetNumber(n=>n+1);
      setMessage(restored?'Full painted universe and generation restored from JSON recipe.':
        'Legacy recipe loaded: seed and rules restored. (Old recipes did not contain painted cells.)');
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
    cancelBatch();
    const resumeAfter=playing;
    setLastExport(null);
    setCaptureError(null);
    setHideStaticWarning(false);
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
        result.ended==='size-limit'?'stopped at the real compressed GIF size limit (partial animation saved)':
        result.ended==='limit'?'reached the duration safety limit':'complete';
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
      // Restore user's play state after completion, cancellation or error.
      setPlaying(resumeAfter);
    }
  }
  const activeEngine=ENGINES.find(e=>e.id===settings.engine);
  const outputSize=recommendedDimensions(settings,resolution);
  const stillLayout=snapshotLayout(settings,{aspect:snapshotAspect,shortSide:snapshotSize});
  const videoSupported=typeof window!=='undefined'&&chooseVideoMime()!==null;
  const predictedFrames=(durationMode==='settled'?600:durationPreset==='custom'?customSeconds:Number(durationPreset))*exportFps;
  const largeGifWarningKey='gif:'+durationMode+':'+durationPreset+':'+customSeconds+':'+resolution+':'+exportFps;
  const largeGif=(captureFormat==='gif'&&(predictedFrames>250||resolution>=720&&predictedFrames>80));
  const densityLabel=Math.round(settings.density*100)+'%';
  const neighborMax=maxNeighborCount(settings);
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="eyebrow"><span className="signal-dot" />MATH ART SUITE <span>· CELLULAR AUTOMATA</span></div>
          <h1>AUTOMAT<span>ART</span><em>✳</em></h1>
        </div>
        <div className="species-pick">
          <label htmlFor="engine">Automaton species</label>
          <select id="engine" value={settings.engine} onChange={e=>{
            const engine=e.target.value as EngineId;
            setSettings(s=>{
              const lattice=SQUARE_ONLY_ENGINES.includes(engine)?'square':s.lattice;
              return normalizeActiveVotes({...s,engine,lattice,
                neighborShape:supportsNeighborhood(engine,lattice)?s.neighborShape:'moore',
                wrap:engine==='margolus'?true:s.wrap});
            });
          }}>
            {ENGINES.map(x=><option key={x.id} value={x.id}>{x.name} — {x.hint}</option>)}
          </select>
        </div>
        <button type="button" className={'export-button'+(capturing?' busy':'')}
          aria-controls="panel-export" onClick={()=>selectTab('export')}>↓ EXPORT</button>
      </header>

      <section ref={stageRef} className={"stage"+(viewerFullscreen?" viewer-fullscreen":"")} aria-label="Live automaton preview">
        <div className="stage-header">
          <div><b className="eyebrow">LIVE UNIVERSE</b><span className="stage-engine">{activeEngine?.name}<small>{activeEngine?.hint}</small></span></div>
          <div className="stage-view-actions">
            <span className={'live-label '+(playing?'':'is-paused')}>{capturing?'● EXPORTING':playing?'● LIVE':'Ⅱ PAUSED'}</span>
            {viewerFullscreen&&<button type="button" className="viewer-pause" onClick={()=>setPlaying(v=>!v)}>{playing?'Ⅱ PAUSE':'▶ PLAY'}</button>}
            <button type="button" className="viewer-toggle" aria-pressed={viewerFullscreen} onClick={()=>void toggleViewerFullscreen()} title="Fullscreen artwork viewer (Esc to exit)">{viewerFullscreen?'✕ EXIT':'⛶ FULLSCREEN'}</button>
          </div>
        </div>
        <div className="canvas-wrap" ref={viewerWrapRef}>
          <div className="art-canvas-layer">
            <canvas ref={canvasRef} aria-label="Interactive cellular automata canvas. Drag to paint cells." onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            onPointerLeave={()=>drawStampPreview(null)} />
            <canvas ref={previewRef} className="alien-brush-preview" aria-hidden="true"/>
          </div>
          <span className="canvas-corner tl">A / {String(generation).padStart(6,'0')}</span>
          <span className="canvas-corner tr">{settings.cellCount} GRID</span>
          <span className="canvas-corner bl">{alienBrush.mode.toUpperCase()} · {alienBrush.stamp.toUpperCase()}</span>
        </div>
        <div className="stage-bar">
          <div className="transport">
            <button className="primary" onClick={()=>{cancelBatch();setPlaying(v=>!v);}} aria-label={playing?'Pause simulation':'Play simulation'}>{playing?'Ⅱ PAUSE':'▶ PLAY'}</button>
            <button onClick={oneStep} disabled={batchProgress!==null||capturing} title="Advance one generation">STEP +1</button>
            <button onClick={restart} title="Restart from same seed">↺ RESET</button>
            <button className="surprise" onClick={randomize} title="Generate a new random universe seed">✳ NEW SEED</button>
          </div>
          <div className="funhouse-time-controls">
            <button type="button" disabled={batchProgress!==null||capturing} onClick={()=>void advanceBatch(10)}>⏭ +10</button>
            <button type="button" disabled={batchProgress!==null||capturing} onClick={()=>void advanceBatch(100)}>⏭ +100</button>
            {batchProgress&&<>
              <span role="status">FAST FORWARD {batchProgress.done}/{batchProgress.total}</span>
              <button type="button" onClick={cancelBatch} aria-label="Cancel fast forward">✕ STOP</button>
            </>}
          </div>
          <div className="speed-pick">
            <label htmlFor="speed">SPEED <em>{speed}/s</em></label>
            <input id="speed" type="range" min="1" max="40" value={speed} aria-label="Evolution speed (generations per second)" onChange={e=>setSpeed(Number(e.target.value))}/>
          </div>
        </div>
        <div className="stage-foot">
          <div className="readouts">
            <span><b>{generation.toLocaleString()}</b> GEN</span>
            <span><b>{population.toLocaleString()}</b> NONZERO CELLS</span>
            <span><b>{worldRef.current.width}×{worldRef.current.height}</b> GRID</span>
          </div>
          <div className="stage-tools">
            <div className="brush-modes" role="group" aria-label="Quick brush mode">
              {(['paint','erase','invert'] as const).map(mode=><button type="button" key={mode}
                aria-pressed={alienBrush.mode===mode} aria-label={'Quick brush mode: '+mode}
                title={mode==='paint'?'Paint cells':mode==='erase'?'Erase cells':'Invert cells'}
                onClick={()=>setAlienBrush(b=>({...b,mode}))}>{mode==='paint'?'✎':mode==='erase'?'⌫':'◉'}</button>)}
            </div>
            <button type="button" className="quick-png" disabled={snapshotBusy||capturing}
              aria-label="Quick PNG snapshot" title="Save a full-resolution PNG of this exact generation"
              onClick={()=>void savePng()}>{snapshotBusy?'◌':'📷'}<span> PNG</span></button>
          </div>
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
        {/* The recording surface lives on the stage so it stays attached and
            painted whatever tab is open (WebKit freezes invisible canvases). */}
        <div id="capture-canvas-mount" className={capturing?'capture-live':'capture-live capture-hidden'} aria-label="Live export preview" />
        {!capturing&&captureError&&<div className="stage-capture-error" role="alert">
          <b>EXPORT FAILED</b>
          <span>{captureError}</span>
          <button onClick={jumpToRecorder}>OPEN RECORDER</button>
          <button type="button" className="dismiss-export" aria-label="Close export failed notification" onClick={dismissFailure}>×</button>
        </div>}
        {!capturing&&lastExport&&<div className="stage-capture-success" role="status">
          <div className="stage-success-top"><b>✓ ANIMATION READY</b><span>{lastExport.frames} frames · {lastExport.elapsed.toFixed(1)} sec</span>
            <button type="button" className="dismiss-export" aria-label="Dismiss animation ready banner" title="Close this notification" onClick={dismissExport}>×</button>
          </div>
          <div className="stage-capture-buttons">
            <button onClick={saveLastExport}>SAVE / SHARE</button>
            <button onClick={jumpToRecorder}>PLAY PREVIEW</button>
          </div>
        </div>}
      </section>

      <nav className="deck-tabs" role="tablist" aria-label="Control sections" aria-orientation="vertical" onKeyDown={onTabKey}>
        {TABS.map(tab=><button type="button" role="tab" key={tab.id} id={'tab-'+tab.id}
          aria-selected={activeTab===tab.id} aria-controls={'panel-'+tab.id}
          tabIndex={activeTab===tab.id?0:-1} className={tab.divider?'tab-divider':undefined}
          onClick={()=>selectTab(tab.id)}><i aria-hidden="true">{tab.icon}</i><span>{tab.label}</span></button>)}
      </nav>

      <div className="deck-panels">
        <section className="panel" id="panel-world" role="tabpanel" aria-labelledby="tab-world" tabIndex={0} hidden={activeTab!=='world'}>
          <PanelHead id="world"/>
          <div className="group">
            <h3 className="group-head">CANVAS <small>restarts the universe</small></h3>
            <label className="input-label" htmlFor="aspect">Canvas geometry</label>
            <select id="aspect" value={settings.aspect} onChange={e=>updateSetting('aspect',e.target.value as AspectId)}>
              {ASPECTS.map(a=><option value={a.value} key={a.value}>{a.name}</option>)}
            </select>
            <label className="input-label" htmlFor="resolution">Simulation grid <em>{settings.lattice==='rhombille'?worldRef.current.width+' diamond columns / '+worldRef.current.height+' rows':settings.cellCount+' cells across'}</em></label>
            <input id="resolution" type="range" min="32" max="256" step="16" value={settings.cellCount} onChange={e=>updateSetting('cellCount',Number(e.target.value))}/>
            <label className="toggle"><input type="checkbox" disabled={settings.engine==='margolus'}
              checked={settings.engine==='margolus'?true:settings.wrap}
              onChange={e=>updateSetting('wrap',e.target.checked)}/><span>Wrap world edges</span></label>
            <StrangeControls part="lattice" settings={settings} setSettings={setSettings} onRewind={rewindStep} generation={generation}/>
          </div>
          <div className="group">
            <h3 className="group-head">STARTING CELLS <small>restarts the universe</small></h3>
            <label className="input-label" htmlFor="seed-pattern">Starting pattern</label>
            <select id="seed-pattern" value={settings.pattern} disabled={settings.engine==='turmites'}
              onChange={e=>updateSetting('pattern',e.target.value as PatternId)}>
              {PATTERNS.map(p=><option value={p.value} key={p.value}>{p.name}</option>)}
            </select>
            <label className="input-label" htmlFor="density">Initial fill <em>{densityLabel}</em></label>
            <input id="density" type="range" min="1" max="95" step="1"
              disabled={settings.engine==='turmites'}
              value={Math.round(settings.density*100)} onChange={e=>updateSetting('density',Number(e.target.value)/100)}/>
            {settings.engine==='turmites'&&<p className="module-note">
              Turmites start from a clean track. Starting pattern and initial fill
              do not apply; the seed places agents reproducibly.
            </p>}
            <label className="input-label" htmlFor="seed">Universe seed</label>
            <div className="seed-row">
              <input id="seed" type="number" min="0" max="4294967295" value={settings.seed} onChange={e=>updateSetting('seed',Number(e.target.value)>>>0)}/>
              <button type="button" className="chip" onClick={randomize} title="Same as ✳ NEW SEED under the canvas">✳ RANDOM</button>
            </div>
          </div>
        </section>

        <section className="panel" id="panel-rules" role="tabpanel" aria-labelledby="tab-rules" tabIndex={0} hidden={activeTab!=='rules'}>
          <PanelHead id="rules"/>
          <div className="engine-card">
            <b>{activeEngine?.name}</b><span>{activeEngine?.hint}</span>
            <small>Change species in the top bar. Rule edits below apply to the running universe.</small>
          </div>
          {settings.engine==='life'&&<div className="group">
            <h3 className="group-head">BIRTH / SURVIVAL</h3>
            <label className="input-label" htmlFor="life">Birth / survival</label>
            <select id="life" value={settings.lifeRule} onChange={e=>updateSetting('lifeRule',e.target.value as LifeRule)}>
              {Object.entries(LIFE_RULES).map(([id,r])=><option key={id} value={id}>{r.label}</option>)}
            </select>
            {settings.lifeRule==='custom'&&<div className="custom-rule-editor">
              <p>Choose how many neighbors cause birth or survival. Changes apply live.</p>
              {(['customBirth','customSurvive'] as const).map(kind=><div key={kind}>
                <b>{kind==='customBirth'?'BIRTH · B':'SURVIVE · S'}{settings[kind].join(',')}</b>
                <div className="rule-bits">{Array.from({length:Math.max(neighborMax,...settings[kind])+1},(_,i)=><button type="button" key={i}
                  aria-pressed={settings[kind].includes(i)} className={settings[kind].includes(i)?'active':''}
                  title={i>neighborMax?'Inactive here; tap to remove':'Toggle B/S count'} onClick={()=>toggleCustomRule(kind,i)}>{i}</button>)}</div>
              </div>)}
              <span>B/S rules use the neighborhood geometry selected below.</span>
            </div>}
          </div>}
          {(settings.engine==='wireworld'||settings.engine==='sandpile')&&
            <CircuitControls settings={settings} setSettings={setSettings}
              grains={worldRef.current.grains} inspectedCell={inspectedCell} width={worldRef.current.width}/>}
          {(settings.engine==='hodgepodge'||settings.engine==='forestfire')&&
            <ReactionControls settings={settings} setSettings={setSettings}/>}
          {settings.engine==='hpp'&&<LatticeGasControls settings={settings}
              setSettings={setSettings} world={worldRef.current}/>}
          {(settings.engine==='ising'||settings.engine==='turmites')&&
            <SpinTurmiteControls settings={settings} setSettings={setSettings}
              world={worldRef.current} resetNumber={resetNumber}/>}
          {settings.engine==='brians'&&<p className="module-note">Three-state Brain: OFF → FIRING → REFRACTORY → OFF. Exactly two firing neighbors cause ignition.</p>}
          {settings.engine==='cyclic'&&
            <CyclicDynamicsControls settings={settings} setSettings={setSettings}
              world={worldRef.current} neighborMax={neighborMax}
              busy={capturing||batchProgress!==null}
              onStartProfile={preset=>{
                cancelBatch();
                setSettings(current=>({...current,pattern:'noise',
                  density:preset.density,cyclicStates:preset.states,
                  cyclicThreshold:preset.threshold,cyclicReach:preset.reach,
                  cyclicDrive:preset.drive}));
                // Force a new world even when the profile matches all settings.
                setResetNumber(n=>n+1);
              }}/>}
          <MutantControls settings={settings} setSettings={setSettings} paintSpecies={paintSpecies} setPaintSpecies={setPaintSpecies}/>
          {(settings.engine==='generations'||settings.engine==='excitable')&&
            <WaveDynamicsControls settings={settings} setSettings={setSettings}
              world={worldRef.current} neighborMax={neighborMax}/>}
          {settings.engine==='wolfram'&&<div className="group">
            <h3 className="group-head">ELEMENTARY RULE</h3>
            <label className="input-label" htmlFor="rule">Wolfram rule number (0–255)</label>
            <input id="rule" type="number" min="0" max="255" value={settings.wolframRule} onChange={e=>updateSetting('wolframRule',Math.max(0,Math.min(255,Number(e.target.value)||0)))}/>
            <div className="chip-row">{[30,90,110,184].map(n=><button className={'chip'+(settings.wolframRule===n?' selected':'')} key={n} onClick={()=>updateSetting('wolframRule',n)}>R{n}</button>)}</div>
          </div>}
          <StrangeControls part="rules" settings={settings} setSettings={setSettings} onRewind={rewindStep} generation={generation}/>
          {supportsNeighborhood(settings.engine,settings.lattice)&&
            <NeighborhoodControls settings={settings} setSettings={setSettings}/>}
          {!supportsNeighborhood(settings.engine,settings.lattice)&&
            <p className="module-note">This lattice or engine has its own specified neighborhood. The B1/B2 square-neighborhood options are disabled here to protect the mathematical rules.</p>}
        </section>

        <section className="panel" id="panel-paint" role="tabpanel" aria-labelledby="tab-paint" tabIndex={0} hidden={activeTab!=='paint'}>
          <PanelHead id="paint"/>
          <AlienPaintControls brush={alienBrush} onChange={setAlienBrush}
            settings={settings} randomize={randomAlienStamp}
            randomSymmetry={randomAlienSymmetry}/>
          {['species','wireworld','sandpile','hodgepodge','forestfire','ising','turmites','hpp'].includes(settings.engine)&&
            <p className="tip">This species also has its own material brush (species, wire, grain, spin, track…). Find it in <button type="button" className="link-button" onClick={()=>selectTab('rules')}>⌘ RULES</button>.</p>}
        </section>

        <section className="panel" id="panel-mutate" role="tabpanel" aria-labelledby="tab-mutate" tabIndex={0} hidden={activeTab!=='mutate'}>
          <PanelHead id="mutate"/>
          <MutationControls strength={mutationStrength} setStrength={setMutationStrength}
            locks={mutationLocks} setLocks={setMutationLocks}
            allowRestart={allowMutationRestart} setAllowRestart={setAllowMutationRestart}
            mutate={mutateNow} undo={undoMutation}
            canUndo={hasMutationUndo} disabled={capturing||batchProgress!==null}
            lastMutation={lastMutation}/>
        </section>

        <section className="panel" id="panel-color" role="tabpanel" aria-labelledby="tab-color" tabIndex={0} hidden={activeTab!=='color'}>
          <PanelHead id="color"/>
          <div className="group">
            <h3 className="group-head">PALETTE <small>{MOIRE_PALETTE_NAMES.length+AUTOMATART_PALETTE_NAMES.length} presets · {appearance.palette.length} stops</small></h3>
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
            <div className="color-wells">
              {appearance.palette.map((c,i)=><label key={i} title={'Edit color '+(i+1)}>
                <input aria-label={'Edit palette color '+(i+1)} type="color" value={c}
                  onChange={e=>updateAppearance('palette',appearance.palette.map((x,j)=>j===i?e.target.value:x))}/>
                <span>{String(i+1).padStart(2,'0')}</span>
              </label>)}
            </div>
            <div className="palette-chaos-buttons">
              <button type="button" id="random-preset" onClick={randomPreset}>✳ RANDOM PALETTE</button>
              <button type="button" id="random-colors" onClick={inventPalette}>🎲 RANDOM COLORS · NEW MIX</button>
            </div>
            <div className="palette-order-tools">
              <button type="button" onClick={shuffleStops}>SHUFFLE STOPS</button>
              <button type="button" onClick={flipStops}>REVERSE STOPS</button>
              <button type="button" onClick={rotateStops}>ROTATE STOPS ↻</button>
            </div>
          </div>
          <div className="group">
            <h3 className="group-head">CHROMATIC MISBEHAVIOR <small>also applies to GIF / video</small></h3>
            <label className="input-label" htmlFor="palette-offset">Palette offset <em>{appearance.paletteOffset.toFixed(1)}</em></label>
            <input id="palette-offset" type="range" min="-12" max="12" step=".25" value={appearance.paletteOffset}
              onChange={e=>updateAppearance('paletteOffset',Number(e.target.value))}/>
            <label className="input-label" htmlFor="palette-cycle">Palette cycling per generation <em>{appearance.paletteCycle.toFixed(2)} stops</em></label>
            <input id="palette-cycle" type="range" min="-1" max="1" step=".02" value={appearance.paletteCycle}
              onChange={e=>updateAppearance('paletteCycle',Number(e.target.value))}/>
            <label className="input-label" htmlFor="palette-motion">Palette travel</label>
            <select id="palette-motion" value={appearance.paletteMotion} onChange={e=>
              updateAppearance('paletteMotion',e.target.value as 'forward'|'pingpong')}>
              <option value="forward">FORWARD / CONTINUOUS WRAP</option>
              <option value="pingpong">PING-PONG / BACK AND FORTH</option>
            </select>
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
            <button className="reset-color" onClick={()=>setAppearance(a=>({...a,paletteOffset:0,paletteCycle:0,paletteMotion:'forward',paletteReverse:false,smoothPalette:false,saturation:1,contrast:1,brightness:1}))}>↺ RESET COLOR MODIFIERS</button>
          </div>
          <div className="group">
            <h3 className="group-head">SHARE ACROSS THE SUITE <small>portable palette JSON</small></h3>
            <div className="export-grid">
              <button type="button" onClick={savePortablePalette} className="export">↓ EXPORT PALETTE JSON</button>
              <button type="button" onClick={()=>paletteImportRef.current?.click()} className="export">↑ IMPORT PALETTE JSON</button>
              <input ref={paletteImportRef} className="sr-only" aria-label="Import portable palette JSON" type="file" accept=".json,application/json" onChange={loadPortablePalette}/>
            </div>
            <p className="fineprint">Same format as It's a Moiré and the Math Art Suite. Importing only changes colors — never rules or cells.</p>
          </div>
        </section>

        <section className="panel" id="panel-patch" role="tabpanel" aria-labelledby="tab-patch" tabIndex={0} hidden={activeTab!=='patch'}>
          <PanelHead id="patch"/>
          <div className="group">
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
              <optgroup label="A1 · MATHEMATICAL COLOR SIGNALS">
                {NEW_COLOR_SIGNALS.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
              </optgroup>
            </select>
            <p className="fineprint">Tip: tap a cell on the canvas to inspect the real signal value under your finger.</p>
          </div>
          {isNewColorSignal(appearance.colorBy)&&
            <ColorSignalControls appearance={appearance} setAppearance={setAppearance}
              inspectedCell={inspectedCell} world={worldRef.current}/>}
          <DualColorControls appearance={appearance} setAppearance={setAppearance}
            inspectedCell={inspectedCell} world={worldRef.current}/>
        </section>

        <section className="panel" id="panel-skin" role="tabpanel" aria-labelledby="tab-skin" tabIndex={0} hidden={activeTab!=='skin'}>
          <PanelHead id="skin"/>
          <div className="group">
            <h3 className="group-head">RENDERING SKIN</h3>
            <label className="input-label" htmlFor="skin">Rendering skin</label>
            <select id="skin" value={appearance.skin} onChange={e=>updateAppearance('skin',e.target.value as SkinId)}>
              <option value="pixels">CRISP / PIXELATED</option>
              <option value="soft">SOFT / LIQUID</option>
              <option value="glow">PHOSPHOR / GLOW</option>
              <optgroup label="Z2 · ADVANCED VISUAL SKINS">
                <option value="contours">TOPOLOGICAL LACE · ISOLINES</option>
                <option value="mercury">MERCURY FLESH · LIQUID MEMBRANE</option>
                <option value="relief">METALLIC RELIEF · CHROME</option>
                <option value="glass">LIVING STAINED GLASS</option>
              </optgroup>
            </select>
            {appearance.skin==='glow'&&<>
              <label className="input-label" htmlFor="glow-strength">Fluorescent bloom <em>{Math.round(appearance.glowStrength*100)}%</em></label>
              <input id="glow-strength" type="range" min="0" max="1" step=".05" value={appearance.glowStrength}
                onChange={e=>updateAppearance('glowStrength',Number(e.target.value))}/>
            </>}
          </div>
          <SkinControls appearance={appearance} setAppearance={setAppearance}/>
          <div className="group">
            <h3 className="group-head">OVERLAYS &amp; AFTERIMAGES</h3>
            <label className="toggle"><input type="checkbox" checked={appearance.showGrid} onChange={e=>updateAppearance('showGrid',e.target.checked)}/><span>Show mathematical grid</span></label>
            <label className="toggle"><input type="checkbox" checked={appearance.trails} onChange={e=>updateAppearance('trails',e.target.checked)}/><span>Show cell afterimages</span></label>
            {settings.engine!=='cyclic'&&<>
              <label className="input-label" htmlFor="trail-persistence">Cell afterimage persistence <em>{Math.round(settings.trailDecay*100)}%</em></label>
              <input id="trail-persistence" type="range" min=".65" max=".99" step=".01" value={settings.trailDecay}
                onChange={e=>updateSetting('trailDecay',Number(e.target.value))}/>
            </>}
          </div>
        </section>

        <section className="panel" id="panel-print" role="tabpanel" aria-labelledby="tab-print" tabIndex={0} hidden={activeTab!=='print'}>
          <PanelHead id="print"/>
          <PrintShopControls appearance={appearance} setAppearance={setAppearance}/>
        </section>

        <section className="panel" id="panel-export" role="tabpanel" aria-labelledby="tab-export" tabIndex={0} hidden={activeTab!=='export'}>
          <PanelHead id="export"/>
          <div className="recorder-panel" ref={recorderRef}>
            <div className="recorder-heading"><span>✹ ANIMATION RECORDER</span><span className="recorder-ready">GIF · MP4 / WEBM</span></div>
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
            {largeGif&&!hiddenWarnings.includes(largeGifWarningKey)&&
              <div className="capture-warning dismissable-notice" role="note">
                <span>⚠ {Math.ceil(predictedFrames)} frames at {outputSize[0]} × {outputSize[1]} may make a large GIF. We'll attempt the export and measure actual compressed bytes; if the file reaches the device safety limit, the finished partial animation will still be saved.</span>
                <button type="button" className="dismiss-export" aria-label="Dismiss large GIF advisory" onClick={()=>hideWarning(largeGifWarningKey)}>×</button>
              </div>}
            {captureFormat==='video'&&!videoSupported&&!hiddenWarnings.includes('video-unsupported')&&
              <div className="capture-warning dismissable-notice" role="note">
                <span>This browser has not reported a supported video encoder. GIF recording should still work.</span>
                <button type="button" className="dismiss-export" aria-label="Dismiss video encoder warning" onClick={()=>hideWarning('video-unsupported')}>×</button>
              </div>}
            {capturing&&captureProgress&&<div className="capture-progress" role="status">
              <div><b>{captureProgress.phase}</b><span>{Math.floor(captureProgress.seconds)}s · {captureProgress.frames} frames</span></div>
              <progress max="1" value={captureProgress.fraction}/>
              <p>Keep this tab open while recording. Video exports run in real time. The live recording preview is under the canvas.</p>
            </div>}
            {captureError&&!capturing&&<div className="capture-warning dismissable-notice" role="alert">
              <span>EXPORT FAILED: {captureError}</span>
              <button type="button" className="dismiss-export" aria-label="Close recorder error" onClick={dismissFailure}>×</button>
            </div>}
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
              {lastExport.distinctFrames===0&&!hideStaticWarning&&<div className="capture-warning dismissable-notice">
                <span>The mathematical state didn't change during recording, so every frame shows the same picture. Try NEW SEED, a different automaton, or restart from the original seed.</span>
                <button type="button" className="dismiss-export" aria-label="Dismiss static animation warning" onClick={()=>setHideStaticWarning(true)}>×</button>
              </div>}
              <button onClick={saveLastExport}>⇩ SAVE / SHARE TO FILES</button>
            </div>}
            <p className="fineprint">
              GIF encoding runs on a separate worker thread with actual compressed-byte size monitoring. Long GIFs are attempted instead of being rejected by a raw-pixel estimate; very large exports may finish early with a clearly labeled partial animation.
              Video is recorded in real time and may save as MP4 or WebM depending on your browser.
              Recording copies your current universe without changing the live one. Video contains no audio.
            </p>
          </div>
          <section className="snapshot-studio" aria-label="High-resolution snapshot studio">
            <div className="snapshot-heading"><b>📷 SNAPSHOT STUDIO</b><span>EXACT PIXELS · CURRENT GENERATION</span></div>
            <div className="snapshot-options">
              <label htmlFor="snapshot-aspect">Canvas frame
                <select id="snapshot-aspect" value={snapshotAspect} disabled={snapshotBusy||capturing}
                  onChange={e=>setSnapshotAspect(e.target.value as SnapshotAspect)}>
                  <option value="current">MATCH UNIVERSE · NO MATTE</option>
                  <option value="square">1:1 · SQUARE</option>
                  <option value="portrait">9:16 · PORTRAIT</option>
                  <option value="landscape">16:9 · LANDSCAPE</option>
                </select>
              </label>
              <label htmlFor="snapshot-size">Short side resolution
                <select id="snapshot-size" value={snapshotSize} disabled={snapshotBusy||capturing}
                  onChange={e=>setSnapshotSize(Number(e.target.value) as SnapshotSize)}>
                  <option value={720}>720 PX</option>
                  <option value={1080}>1080 PX</option>
                  <option value={1440}>1440 PX</option>
                  <option value={2160}>2160 PX · 4K FRAME</option>
                </select>
              </label>
            </div>
            <div className="snapshot-dimensions">
              <b>{stillLayout.width.toLocaleString()} × {stillLayout.height.toLocaleString()} PX</b>
              <span>{stillLayout.letterboxed?'CENTERED / NO STRETCH / DARK MATTE':'NATIVE RATIO / NO CROP'}</span>
            </div>
            {stillLayout.width*stillLayout.height>6_000_000&&
              <p className="snapshot-advice">Large PNG: it can take a moment to process on iPhone. If Safari runs out of memory, use the 1080 or 1440 option.</p>}
            <button type="button" className="snapshot-button" disabled={snapshotBusy||capturing}
              onClick={()=>void savePng()}>{snapshotBusy?'◌ RENDERING PNG…':'⇩ SAVE FULL-RES PNG'}</button>
            {lastStill&&<div className="snapshot-ready" role="status">
              <span>✓ PNG READY · {lastStill.width}×{lastStill.height}</span>
              <button type="button" onClick={()=>void shareStill()}>SAVE / SHARE</button>
              <button type="button" className="dismiss-export" onClick={()=>setLastStill(null)}
                aria-label="Dismiss PNG ready panel">×</button>
            </div>}
            <p className="snapshot-advice">Your live world and generation are preserved. Alternate frame shapes center the original artwork with a dark matte instead of stretching or cropping it. On iPhone use SAVE / SHARE after rendering.</p>
          </section>
          <div className="group">
            <h3 className="group-head">RECIPES <small>JSON · rules, colors, real cells, brush</small></h3>
            <div className="export-grid">
              <button onClick={saveRecipe} className="export">⇩ SAVE RECIPE</button>
              <button onClick={()=>loadRef.current?.click()} className="export">⇧ LOAD RECIPE</button>
              <input className="sr-only" ref={loadRef} type="file" accept=".json,application/json" onChange={loadRecipe}/>
            </div>
            <p className="fineprint">A recipe stores the exact living universe, so loading one brings back these very cells, not just the settings.</p>
          </div>
          <footer className="footer">AUTOMATART / CHAOS WITH A REPRODUCIBLE SEED · <a href="https://github.com/merrypranxter/automatart" target="_blank" rel="noreferrer">GITHUB ↗</a></footer>
        </section>
      </div>
      {message&&<div role="status" aria-live="polite" className="status-msg">
        <span>{message}</span>
        <button type="button" className="dismiss-export" aria-label="Dismiss status message" onClick={()=>setMessage('')}>×</button>
      </div>}
    </div>
  );
}
