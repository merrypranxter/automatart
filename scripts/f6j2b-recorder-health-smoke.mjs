import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const filename=resolve('scripts/.f6j2b-health.mjs');
try{
 await build({entryPoints:['src/engine/f6j2b-recorder-health.ts'],outfile:filename,
  bundle:true,platform:'node',format:'esm',target:'node22'});
 const {frameIndexedHealth,realtimeCaptureHealth}=await import(pathToFileURL(filename).href);
 for(const mode of ['gif-offline','webm-offline']){
  const x=frameIndexedHealth(mode,600,30);
  assert.equal(x.mode,mode);
  assert.equal(x.rating,'frame-indexed');
  assert.equal(x.renderedFrames,600);
  assert.equal(x.requestedSeconds,20);
  assert.equal(x.overBudgetFrames,0);
  assert.equal(x.lateStarts,0);
  assert.equal(x.slowestFrameMs,0);
  assert.equal(x.overrunSeconds,0);
 }
 const standard={frames:300,fps:30,overBudgetFrames:0,lateStarts:0,
  slowestFrameMs:27,wallElapsedMs:10100};
 const normal=realtimeCaptureHealth(standard);
 assert.equal(normal.rating,'within-budget');
 assert.equal(normal.requestedSeconds,10);
 assert.equal(normal.overrunSeconds,.1);
 assert.equal(normal.renderedFrames,300);
 assert.equal(normal.mode,'media-recorder-realtime');
 const burden=realtimeCaptureHealth({...standard,overBudgetFrames:47,
  lateStarts:48,slowestFrameMs:440,wallElapsedMs:13500});
 assert.equal(burden.rating,'stutter-risk');
 assert.equal(burden.overBudgetFrames,47);
 assert.equal(burden.lateStarts,48);
 assert.equal(burden.slowestFrameMs,440);
 assert.equal(burden.overrunSeconds,3.5);
 for(const change of [
  {overBudgetFrames:27},{lateStarts:26},{slowestFrameMs:151},
  {wallElapsedMs:11600}
 ])assert.equal(realtimeCaptureHealth({...standard,...change}).rating,'stutter-risk',
  'Each independent observable deadline anomaly must surface risk');
 const healthy=realtimeCaptureHealth({...standard,frames:10,fps:10,
  slowestFrameMs:65,wallElapsedMs:1110});
 assert.equal(healthy.rating,'within-budget');
 const dirty=realtimeCaptureHealth({frames:NaN,fps:Infinity,
  overBudgetFrames:Infinity,lateStarts:NaN,slowestFrameMs:Infinity,
  wallElapsedMs:-Infinity});
 assert(Object.values(dirty).every(x=>typeof x==='string'||Number.isFinite(x)));
 assert.equal(dirty.renderedFrames,0);
 assert.equal(dirty.rating,'within-budget');
 console.log('PASS F6J2B: frame-indexed vs opaque real-time capture, real deadline-budget risk, independent stalls, safe inputs');
}finally{await unlink(filename).catch(()=>{});}
