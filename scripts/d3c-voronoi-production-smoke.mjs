import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const modules=[
 ['src/engine/voronoi.ts','scripts/.d3c-voronoi.mjs'],
 ['src/engine/voronoi-stroke.ts','scripts/.d3c-stroke.mjs'],
 ['src/engine/voronoi-vector.ts','scripts/.d3c-vector.mjs'],
 ['src/engine/types.ts','scripts/.d3c-types.mjs'],
 ['src/engine/sim.ts','scripts/.d3c-sim.mjs'],
 ['src/engine/export-frame.ts','scripts/.d3c-frames.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d3c-snap.mjs'],
 ['src/engine/capture.ts','scripts/.d3c-capture.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
try{
 await Promise.all(modules.map(([entry,outfile])=>
   build({entryPoints:[entry],outfile,bundle:true,format:'esm',
     platform:'node',target:'node22'})));
 const {voronoiPatch,voronoiHitTest}=await load(0);
 const {strokePolygonInterval,voronoiStrokeCells}=await load(1);
 const {voronoiPixelGeometry}=await load(2);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(3);
 const {createWorld,stepWorld}=await load(4);
 const {renderExportFrame,exportFrameLayout}=await load(5);
 const {snapshotWorld}=await load(6);
 const {createCaptureCursor}=await load(7);
 globalThis.document={createElement(kind){assert.equal(kind,'canvas');return createCanvas(1,1);}};
 const cases=[
  {w:32,h:32,seed:17,jitter:0},
  {w:32,h:32,seed:19,jitter:.34},
  {w:64,h:114,seed:9241,jitter:.42}
 ];
 const strokes=[
  [.07,.09,.91,.92],
  [.94,.1,.09,.9],
  [.04,.47,.97,.47],
  [.51,.03,.51,.94],
  [.1,.2,.1002,.2001],
  [.03,.96,.96,.03],
  [.002,.002,.997,.998]
 ];
 for(const {w,h,seed,jitter} of cases){
  const patch=voronoiPatch(w,h,seed,jitter);
  let checked=0,intersected=0;
  for(const [x0,y0,x1,y1] of strokes){
   const a=[x0*w,y0*h],b=[x1*w,y1*h];
   const exhaustive=[];
   for(let id=0;id<patch.cells.length;id++){
    const interval=strokePolygonInterval(a,b,patch.cells[id].polygon);
    if(interval)exhaustive.push({id,entry:interval[0]});
   }
   exhaustive.sort((x,y)=>x.entry-y.entry||x.id-y.id);
   const actual=voronoiStrokeCells(w,h,seed,jitter,x0,y0,x1,y1);
   assert.deepEqual(actual,exhaustive.map(x=>x.id),
    'Continuous stroke covers EVERY actual crossed convex polygon (including thin slivers), in physical order');
   assert(actual.length>0);
   intersected+=actual.length;checked++;
  }
  assert.deepEqual(voronoiStrokeCells(w,h,seed,jitter,-.1,.3,.8,.3),[],
   'Pointer outside canvas cannot wrap or paint phantom cells');
  assert.deepEqual(voronoiStrokeCells(w,h,seed,jitter,.3,.3,.3,.3),
   [voronoiHitTest(w,h,seed,jitter,.3,.3)]);
  const pixels=voronoiPixelGeometry(patch,720,Math.round(720*h/w));
  assert.strictEqual(pixels,voronoiPixelGeometry(patch,720,Math.round(720*h/w)),
   'Rendered physical geometry reused instead of regenerated every animation frame');
  assert.equal(pixels.length,w*h);
  assert(pixels.every(c=>Number.isFinite(c.left)&&Number.isFinite(c.top)&&
    Number.isFinite(c.right)&&Number.isFinite(c.bottom)&&c.right>c.left&&c.bottom>c.top));
  const alternate=voronoiPatch(w,h,seed+1,jitter);
  assert.notStrictEqual(pixels,voronoiPixelGeometry(alternate,720,Math.round(720*h/w)),
   'Different real generators MUST NOT share a stale path cache');
  console.log('PASS D3C '+w+'×'+h+' jitter '+jitter+' / '+
    checked+' exact full-stroke proofs / '+intersected+' intersected real polygon cells');
 }
 const p=voronoiPatch(32,32,17,.34);
 const a0=voronoiPixelGeometry(p,640,640);
 voronoiPixelGeometry(p,720,720);
 voronoiPixelGeometry(p,1080,1080);
 assert.notStrictEqual(a0,voronoiPixelGeometry(p,640,640),
  'Only two pixel-layout cache keys retained per geometry (bounded memory)');
 const s={...INITIAL_SETTINGS,lattice:'voronoi',engine:'life',cellCount:32,
  aspect:'square',seed:17,voronoiJitter:.34,wrap:false,density:0};
 const [w,h]=worldDimensions(s),patch=voronoiPatch(w,h,s.seed,s.voronoiJitter);
 const world=createWorld(s);
 const id=patch.cells.findIndex(c=>c.neighbors.length>=7);
 assert(id>=0,'Test actual polygon with variable coordination');
 world.cells.fill(0);world.cells[id]=1;
 const initial=snapshotWorld(world);
 const appearance={...INITIAL_APPEARANCE,skin:'pixels',
  palette:['#090617','#fff000'],colorBy:'state',showGrid:false,
  glowStrength:0,trails:false,temporalRGB:0,
  print:{...INITIAL_APPEARANCE.print,enabled:false}};
 const {centroid}=patch.cells[id];
 for(const [aspect,size] of [['square',2160],['portrait',1080],['landscape',720]]){
  const layout=exportFrameLayout(s,size,aspect,'contain');
  const canvas=createCanvas(1,1),scratch=createCanvas(1,1);
  renderExportFrame(canvas,scratch,world,appearance,layout);
  const pos=[Math.round(layout.image.x+centroid[0]/w*layout.image.width),
    Math.round(layout.image.y+centroid[1]/h*layout.image.height)];
  const ctx=canvas.getContext('2d');
  const bright=[...ctx.getImageData(...pos,1,1).data];
  assert(bright[0]>160&&bright[1]>140&&bright[2]<100,
   'Physical polygon stays saturated at genuine output dimensions');
  // Export geometry MUST be reusable without retaining the previous
  // generation's material: new pigment, same polygon paths.
  world.cells[id]=0;
  renderExportFrame(canvas,scratch,world,appearance,layout);
  const dark=[...ctx.getImageData(...pos,1,1).data];
  assert(dark[0]<90&&dark[1]<90,'No stale colored polygon from cached frame layout');
  world.cells[id]=1;
  const png=canvas.toBuffer('image/png');
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  console.log('PASS D3C PNG geometry cache + dynamic pigment '+layout.width+'×'+layout.height);
 }
 assert.deepEqual(snapshotWorld(world),initial,'Rendering/geometry never mutates live state');
 const cursor=createCaptureCursor(world,s,20,18);
 cursor.advance();
 assert.deepEqual(cursor.current.cells,stepWorld(world,s).cells,
  'Frame-index capture still reproduces actual polygon physics');
 for(const aspect of ['current','square','portrait','landscape','portrait34',
   'landscape43','portrait45','landscape54','portrait23','landscape32']){
  const layout=exportFrameLayout(s,1080,aspect,'contain');
  assert(!layout.cropped&&layout.width>=2&&layout.height>=2);
 }
 console.log('PASS D3C: mathematical continuous painting, bounded frame cache, hi-res non-stale pigment and replay');
}finally{
 await Promise.all(modules.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
