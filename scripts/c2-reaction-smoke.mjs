import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/reaction-worlds.ts','scripts/.c2-reactions.mjs'],
 ['src/engine/sim.ts','scripts/.c2-sim.mjs'],
 ['src/engine/types.ts','scripts/.c2-types.mjs'],
 ['src/engine/capture.ts','scripts/.c2-capture.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.c2-snap.mjs'],
 ['src/engine/alien-paint.ts','scripts/.c2-paint.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.c2-mutate.mjs'],
 ['src/engine/color-signals.ts','scripts/.c2-signals.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const get=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {random01,stepHodgepodge,stepForestFire}=await get(0);
 const {createWorld,stepWorld}=await get(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await get(2);
 const {cloneWorld,createCaptureCursor}=await get(3);
 const {snapshotWorld,restoreWorldSnapshot}=await get(4);
 const {applyAlienStamp,INITIAL_ALIEN_BRUSH}=await get(5);
 const {mutateAutomatart,requiresWorldRestart}=await get(6);
 const {computeColorSignal}=await get(7);
 const p=(x,y,w)=>y*w+x;
 const hRule={states:20,k1:2,k2:3,growth:5};
 const h=new Uint8Array(25);
 h[p(2,1,5)]=20;h[p(1,2,5)]=20;
 h[p(2,3,5)]=7;h[p(3,2,5)]=8;h[p(1,1,5)]=9;
 const hv=stepHodgepodge(h,5,5,false,hRule);
 assert.equal(hv[12],2,'Healthy picks up floor(2/2)+floor(3/3)=2');
 assert.equal(hv[p(2,1,5)],0,'Terminal ill recovers immediately');
 assert.equal(hv[p(2,3,5)],Math.min(20,Math.floor((7+20+8)/9)+5),
  'Active cells advance by live Moore average and G');
 assert.notDeepEqual(h,stepHodgepodge(h,5,5,false,{...hRule,growth:18}),
  'Changing growth changes actual cell states');
 const one=new Uint8Array(25);one[p(4,4,5)]=20;
 const torus=stepHodgepodge(one,5,5,true,{...hRule,k1:1});
 assert.equal(torus[0],1,'Hodgepodge Moore corner wraps diagonally');
 assert.equal(stepHodgepodge(one,5,5,false,{...hRule,k1:1})[0],0,
  'Open border ignores distant diagonal');
 assert.throws(()=>stepHodgepodge(h,5,5,false,{...hRule,k1:0}),/Invalid/);
 // Forest fire: cardinal spread, lightning and growth independently controlled.
 const fire=new Uint8Array(25);
 fire[p(2,2,5)]=2;
 for(const [x,y] of [[2,1],[3,2],[2,3],[1,2],[1,1]])fire[p(x,y,5)]=1;
 const ar={growth:0,lightning:0,seed:112, generation:0};
 const burning=stepForestFire(fire,5,5,false,ar);
 assert.equal(burning[12],0,'Fire burns to empty in exactly one update');
 for(const [x,y] of [[2,1],[3,2],[2,3],[1,2]])
  assert.equal(burning[p(x,y,5)],2,'Cardinal tree catches neighboring fire');
 assert.equal(burning[p(1,1,5)],1,'Diagonal neighbor does not ignite');
 assert.equal(stepForestFire(new Uint8Array(9),3,3,false,{...ar,growth:1}).every(x=>x===1),true,
  'All empty sites regrow with probability one');
 const trees=new Uint8Array(9).fill(1);
 assert.equal(stepForestFire(trees,3,3,false,{...ar,lightning:1}).every(x=>x===2),true,
  'All trees ignite under certain lightning');
 const edge=new Uint8Array(25);edge[p(0,0,5)]=1;edge[p(4,0,5)]=2;
 assert.equal(stepForestFire(edge,5,5,true,ar)[0],2,'Cardinal wrap across side seam');
 assert.equal(stepForestFire(edge,5,5,false,ar)[0],1,'Open boundary excludes seam');
 assert.equal(random01(42,17,11,0),random01(42,17,11,0));
 assert.notEqual(random01(42,17,11,0),random01(42,18,11,0));
 assert.notEqual(random01(42,17,11,0),random01(42,17,11,1));
 assert.throws(()=>stepForestFire(trees,3,3,false,{...ar,growth:2}),/Invalid/);
 const brush={...INITIAL_ALIEN_BRUSH,stamp:'brush',size:0,mode:'paint'};
 const hSettings={...INITIAL_SETTINGS,engine:'hodgepodge',cellCount:32,
  density:.15,seed:291,hodgeStates:30,hodgeGrowth:12,hodgeBrush:24};
 const hWorld=createWorld(hSettings), hStroke=applyAlienStamp(hWorld,hSettings,[7,9],brush,1);
 assert(hStroke.length>0);
 for(const id of hStroke)assert.equal(hWorld.cells[id],24,'Hodgepodge brush paints genuine infection state');
 const wave=stepWorld(hWorld,hSettings);
 assert(wave.cells.some(x=>x>0)&&wave.cells.every(x=>x<=30),'Hodgepodge evolves multistate infection');
 assert.equal(wave.neighborShape,'moore');
 const forest={...INITIAL_SETTINGS,engine:'forestfire',cellCount:32,seed:472,
  density:.24,forestGrowth:.03,forestLightning:.004,forestBrush:2};
 let fw=createWorld(forest);
 const burnBrush=applyAlienStamp(fw,forest,[8,8],brush,4);
 assert(burnBrush.length>0);
 for(const i of burnBrush)assert.equal(fw.cells[i],2,'Forest brush paints real burning state');
 assert.equal(stepWorld(fw,forest).neighborShape,'vonNeumann');
 let replay=cloneWorld(fw);
 for(let generation=0;generation<22;generation++){
  fw=stepWorld(fw,forest);replay=stepWorld(replay,forest);
  assert.deepEqual(fw.cells,replay.cells,'Exact per-generation random replay');
 }
 const snap=snapshotWorld(fw);
 const restored=restoreWorldSnapshot(snap,forest);
 assert.deepEqual(restored.cells,fw.cells,'Saved forest fire states preserved');
 assert.equal(restored.generation,fw.generation,'Random generation counter saved');
 assert.deepEqual(stepWorld(restored,forest).cells,stepWorld(fw,forest).cells,
  'Random lightning after snapshot resumes exactly');
 assert.equal(cloneWorld(fw).generation,fw.generation);
 const capture=createCaptureCursor(fw,forest,10,10);
 assert.deepEqual(capture.current.cells,fw.cells,'Recorder clones exact source');
 const forestSignals=computeColorSignal(fw,{...INITIAL_APPEARANCE,colorBy:'entropy'},'entropy');
 assert(forestSignals.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
 const bad=structuredClone(snap);
 const raw=Uint8Array.from(atob(bad.arrays.cells),c=>c.charCodeAt(0));
 raw[12]=5;bad.arrays.cells=btoa(String.fromCharCode(...raw));
 assert.throws(()=>restoreWorldSnapshot(bad,forest),/Forest.fire|Forest fire|invalid forest/i,
  'Invalid forest snapshots rejected immediately');
 const hSnap=snapshotWorld(hWorld),hReload=restoreWorldSnapshot(hSnap,hSettings);
 assert.deepEqual(hReload.cells,hWorld.cells);
 const hBad=structuredClone(hSnap),raw2=Uint8Array.from(atob(hBad.arrays.cells),c=>c.charCodeAt(0));
 raw2[14]=31;hBad.arrays.cells=btoa(String.fromCharCode(...raw2));
 assert.throws(()=>restoreWorldSnapshot(hBad,hSettings),/Hodgepodge|invalid/i);
 assert(!requiresWorldRestart(forest,{...forest,forestGrowth:.1,forestLightning:.01}),
  'Changing climate never resets living world');
 assert(requiresWorldRestart(hSettings,{...hSettings,hodgeStates:25}),
  'State cardinality resets worlds to avoid impossible stages');
 const locked=mutateAutomatart(forest,INITIAL_APPEARANCE,
  {strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},
   allowRestart:false},219);
 assert.equal(locked.settings.forestGrowth,forest.forestGrowth);
 assert.equal(locked.settings.forestLightning,forest.forestLightning);
 assert.equal(locked.willRestart,false);
 const unlocked={strength:'weird',locks:{palette:true,rule:false,engine:true,seed:true},
  allowRestart:false};
 const a=mutateAutomatart(forest,INITIAL_APPEARANCE,unlocked,223);
 const b=mutateAutomatart(forest,INITIAL_APPEARANCE,unlocked,223);
 assert.deepEqual(a.settings,b.settings);
 assert.equal(a.willRestart,false);
 console.log('PASS: exact multistate Hodgepodge rule, severity/cure, Moore wrap, rule variation');
 console.log('PASS: 3-state seeded forest fires, cardinal spread, independent climate RNG, wrap');
 console.log('PASS: brush, exact saved/reloaded lightning, capture, state validation, mutation locks');
}finally{
 await Promise.all(jobs.map(([,file])=>unlink(resolve(file)).catch(()=>{})));
}
