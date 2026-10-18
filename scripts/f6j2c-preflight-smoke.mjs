import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/f6j2c-device-preflight.ts','scripts/.f6j2c-probe.mjs'],
 ['src/engine/types.ts','scripts/.f6j2c-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6j2c-sim.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6j2c-snapshot.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
const near=(x,y)=>Math.abs(x-y)<1e-6;
try{
 await Promise.all(modules.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const {preflightStats,measureCapturePreflight}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {snapshotWorld}=await load(3);
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
 const renderSamples=[25,40,35,30,38],stepSamples=[3,4,5,4,2];
 const easy=preflightStats(renderSamples,stepSamples,10,'native-video',360,360);
 assert.equal(easy.signal,'under-budget');
 assert.equal(easy.samples,5);
 assert.equal(easy.medianMs,35);
 assert.equal(easy.p90Ms,40);
 assert.equal(easy.maximumMs,40);
 assert(near(easy.meanMs,33.6));
 assert(near(easy.stepMeanMs,3.6));
 assert.equal(preflightStats([60,69,72,65,63],stepSamples,10,'native-video',360,360).signal,'near-budget');
 assert.equal(preflightStats([90,105,115,100,98],stepSamples,10,'native-video',360,360).signal,'over-budget');
 assert.equal(preflightStats([900,900], [100,100],10,'offline-webm',720,1280).signal,'frame-indexed',
  'Offline video can render slower than playback without timeline skips');
 assert.equal(preflightStats([900,900],[100,100],10,'gif-worker',720,1280).signal,'frame-indexed');
 assert.equal(preflightStats([12],[3],10,'video-unavailable',720,1280).signal,'unavailable');
 assert.throws(()=>preflightStats([],[],10,'native-video',360,360),/Invalid/);
 assert.throws(()=>preflightStats([5],[0,2],10,'native-video',360,360),/Invalid/);
 assert.throws(()=>preflightStats([NaN],[0],10,'native-video',360,360),/Invalid/);
 const opts={format:'gif',mode:'fixed',seconds:10,fps:10,resolution:360,
  frameAspect:'square',frameFit:'contain',restart:false,stepsPerSecond:18};
 let cases=0;
 for(const lattice of ['square','penrose','voronoi']){
  const settings={...INITIAL_SETTINGS,engine:'cyclic',lattice,seed:337,
   voronoiJitter:.34,cellCount:22,wrap:lattice==='square',pattern:'noise',
   density:.61,cyclicStates:9,aspect:'square'};
  let world=createWorld(settings);
  for(let j=0;j<4;j++)world=stepWorld(world,settings);
  const save=snapshotWorld(world);
  const appearance={...INITIAL_APPEARANCE,skin:'gyroid',
   mathMicroDetail:1,mathMicroMix:.75,mathMicroFrequency:6,
   mathMicroPhaseMode:'attract',mathMicroPhaseStrength:.8,mathMicroPhaseDepth:2,
   print:{...INITIAL_APPEARANCE.print,enabled:false}};
  const progress=[];
  const report=await measureCapturePreflight(world,settings,appearance,{
   ...opts,frameAspect:lattice==='square'?'square':'portrait',
   restart:lattice==='voronoi'
  },new AbortController().signal,(done,total)=>progress.push([done,total]));
  assert.equal(report.route,'gif-worker');
  assert.equal(report.samples,5);
  assert.equal(report.fps,10);
  assert.equal(report.width,360);
  assert.equal(report.height,lattice==='square'?360:640);
  assert(report.meanMs>=0&&Number.isFinite(report.p90Ms));
  assert(report.stepMeanMs>=0&&report.stepMeanMs<=report.maximumMs+10);
  assert.deepEqual(progress,[1,2,3,4,5,6].map(i=>[i,6]));
  assert.deepEqual(snapshotWorld(world),save,'Opt-in probe must not mutate ANY original CA state');
  cases++;
  console.log('PASS F6J2C '+lattice+': true-size '+report.width+'×'+report.height+
   ' sampled pixels, 6 simulated frames, immutable real live world');
 }
 const settings={...INITIAL_SETTINGS,lattice:'square',cellCount:20,seed:401};
 const source=createWorld(settings),save=snapshotWorld(source),controller=new AbortController();
 let visited=0;
 await assert.rejects(measureCapturePreflight(source,settings,INITIAL_APPEARANCE,opts,
  controller.signal,(done)=>{visited=done;if(done===1)controller.abort();}),error=>
  error.name==='CaptureCancelled');
 assert.equal(visited,1);
 assert.deepEqual(snapshotWorld(source),save);
 assert.equal(cases,3);
 console.log('PASS F6J2C: three true render layouts, real stepping, frame statistics, unchanged live world and abort');
}finally{
 await Promise.all(modules.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
