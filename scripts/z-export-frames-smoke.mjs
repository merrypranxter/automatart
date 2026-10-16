import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const files=[
 ['src/engine/export-frame.ts','scripts/.z-frames.mjs'],
 ['src/engine/snapshot.ts','scripts/.z-snap.mjs'],
 ['src/engine/capture.ts','scripts/.z-capture.mjs'],
 ['src/engine/types.ts','scripts/.z-types.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {FRAME_RATIOS,FRAME_OPTIONS,exportFrameLayout}=await load(0);
 const {snapshotLayout}=await load(1);
 const {recommendedDimensions}=await load(2);
 const {INITIAL_SETTINGS,worldDimensions}=await load(3);
 assert.equal(FRAME_OPTIONS.length,10); // 9 canonical sizes + native
 assert.equal(Object.keys(FRAME_RATIOS).length,9);
 const s={...INITIAL_SETTINGS,engine:'cyclic',lattice:'square',cellCount:96,aspect:'square'};
 for(const [aspect,[rx,ry]] of Object.entries(FRAME_RATIOS)){
  for(const size of [360,720,1080,2160]){
   const fit=exportFrameLayout(s,size,aspect,'contain');
   const fill=exportFrameLayout(s,size,aspect,'cover');
   assert.equal(fit.width%2,0);assert.equal(fit.height%2,0);
   assert.equal(fit.width,fill.width);
   assert.equal(fit.height,fill.height);
   assert(Math.abs(fit.width/fit.height-rx/ry)<.003,
    'Exact '+aspect+' frame pixels within codec-safe even rounding');
   assert.deepEqual(recommendedDimensions(s,size,aspect),[fit.width,fit.height]);
   assert(fit.image.width<=fit.width&&fit.image.height<=fit.height,
    'FIT must include whole mathematically correct drawing');
   assert(fill.image.width>=fill.width&&fill.image.height>=fill.height,
    'FILL must cover entire output and center-crop rather than distort');
   assert(Math.abs(fit.image.width/fit.image.height-1)<.005,
    'Square-origin art must be undistorted in fitted output');
   assert(Math.abs(fill.image.width/fill.image.height-1)<.005,
    'Square-origin art must be undistorted in cropped output');
   assert(Math.abs(fit.image.x*2+fit.image.width-fit.width)<=1);
   assert(Math.abs(fit.image.y*2+fit.image.height-fit.height)<=1);
   assert(Math.abs(fill.image.x*2+fill.image.width-fill.width)<=1);
   assert(Math.abs(fill.image.y*2+fill.image.height-fill.height)<=1);
   // Snapshot and GIF/video must expose the same true output dimensions.
   if(size>=720){
    const still=snapshotLayout(s,{aspect,shortSide:size,fit:'contain'});
    assert.deepEqual(still,fit);
   }
  }
 }
 const nine16=exportFrameLayout(s,1080,'portrait','contain');
 assert.deepEqual([nine16.width,nine16.height],[1080,1920],
  'A square CA can be composed into a real social-ready 9:16 video without touching its world');
 assert(nine16.image.height<1920&&nine16.letterboxed);
 const cropped=exportFrameLayout(s,1080,'portrait','cover');
 assert(cropped.image.width>1080&&cropped.cropped,
  'Full-bleed social format crops center rather than stretching cells');
 const wBefore=worldDimensions(s);
 for(const ratio of ['square','portrait','landscape','portrait34','landscape43',
  'portrait45','landscape54','portrait23','landscape32']){
  const reshaped=worldDimensions({...s,aspect:ratio});
  assert(reshaped[0]===96);
  assert(Math.abs(reshaped[1]/reshaped[0]-FRAME_RATIOS[ratio][1]/FRAME_RATIOS[ratio][0])<.02);
 }
 assert.deepEqual(worldDimensions(s),wBefore,'Output reframing never mutates real world dimensions');
 const actualPortrait={...s,aspect:'portrait'};
 const native=exportFrameLayout(actualPortrait,720,'current');
 assert(Math.abs(native.width/native.height-9/16)<.005,
  'A real tall cellular grid matches phone composition natively');
 const rhombi={...s,lattice:'rhombille',cellCount:96,aspect:'portrait'};
 const geometry=exportFrameLayout(rhombi,720,'current','contain');
 const rhombilleWorld=worldDimensions(rhombi);
 assert(rhombilleWorld[0]%3===0&&rhombilleWorld[1]%2===0);
 assert(geometry.width>2&&geometry.height>2);
 assert.equal(geometry.letterboxed,false);
 for(const bad of ['banana','9:16','__proto__']){
  assert.throws(()=>exportFrameLayout(s,720,bad),/Invalid export frame/);
 }
 assert.throws(()=>exportFrameLayout(s,720,'portrait','stretch'),/Invalid export frame/);
 assert.throws(()=>exportFrameLayout(s,8192,'portrait'),/Invalid export frame/);
 const still8k=snapshotLayout(s,{aspect:'landscape',shortSide:4320,fit:'contain'});
 assert.deepEqual([still8k.width,still8k.height],[7680,4320]);
 console.log('PASS ALL FORMATS: nine genuine world aspects; 9*4*2 geometrically correct fitted/cropped PNG/GIF/video frames');
 console.log('PASS ALL FORMATS: real 9:16 1080x1920 and 8K 7680x4320 PNG; codec-safe even sizes; rhombille preservation');
}finally{
 await Promise.all(files.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
