import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const output=resolve('scripts/.f6j2-cadence.mjs');
try{
 await build({entryPoints:['src/engine/f6j2-capture-cadence.ts'],
  outfile:output,bundle:true,format:'esm',platform:'node',target:'node22'});
 const {
  fixedVideoFrameTime,offlineYieldDue,captureProgressDue
 }=await import(pathToFileURL(output).href);
 for(const fps of [5,10,12,15,24,30]){
  const times=[];
  for(let frame=0;frame<fps*60;frame++){
   const point=fixedVideoFrameTime(frame,fps);
   assert.equal(point.timestamp,Math.round(frame*1e6/fps),
    'Video time ONLY depends on integer frame index');
   assert.equal(point.duration,Math.round(1e6/fps));
   if(frame>0)assert(point.timestamp>times.at(-1),'Strictly monotonic timestamps');
   times.push(point.timestamp);
  }
  assert(Math.abs(times.at(-1)/1e6-(60-1/fps))<1e-5);
 }
 assert.deepEqual(fixedVideoFrameTime(7,10),fixedVideoFrameTime(7,10));
 assert.deepEqual(fixedVideoFrameTime(7,10),{timestamp:700000,duration:100000});
 assert.equal(offlineYieldDue(523,500),false);
 assert.equal(offlineYieldDue(524,500),true);
 assert.equal(offlineYieldDue(600,550),true);
 assert.equal(offlineYieldDue(600,NaN),false);
 assert.equal(captureProgressDue('Encoding',0,300,100,100,'Encoding'),true);
 assert.equal(captureProgressDue('Encoding',300,300,100,100,'Encoding'),true);
 assert.equal(captureProgressDue('Finalizing',57,300,100,100,'Encoding'),true);
 assert.equal(captureProgressDue('Encoding',57,300,199,100,'Encoding'),false);
 assert.equal(captureProgressDue('Encoding',57,300,200,100,'Encoding'),true);
 assert.equal(captureProgressDue('Encoding',57,300,50,-Infinity,'Encoding'),true);
 const capture=await readFile(resolve('src/engine/capture.ts'),'utf8');
 const offline=capture.split('// Preferred video path:')[1]?.split('// Fallback for browsers')[0];
 assert(offline,'Offline WebCodecs block must exist');
 assert(!offline.includes('await nextPaint()'),
  'Offline encoding must NOT wait for a compositor rAF per encoded frame');
 assert(offline.includes('fixedVideoFrameTime(i,opt.fps)'));
 assert(offline.includes('offlineYieldDue(now,lastYieldAt)'));
 assert(offline.includes('encodeQueueSize>3'),
  'Browser encoder backpressure must remain bounded');
 const fallback=capture.split('// Fallback for browsers')[1];
 assert(fallback?.includes('await nextPaint()')&&fallback.includes('canvas.captureStream(opt.fps)'),
  'Real-time Safari fallback still paints to a visible captureStream canvas');
 assert(capture.includes('captureProgressDue('),
  'GIF Worker progress updates should not require React rendering every output frame');
 console.log('PASS F6J2: 60 sec fixed FPS timelines at 5/10/12/15/24/30, zero offline rAF, encoder backpressure, GIF UI throttle and fallback integrity');
}finally{
 await unlink(output).catch(()=>{});
}
