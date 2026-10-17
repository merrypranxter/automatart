import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const modules=[
 ['src/engine/penrose.ts','scripts/.d2c-penrose.mjs'],
 ['src/engine/topology.ts','scripts/.d2c-topology.mjs'],
 ['src/engine/types.ts','scripts/.d2c-types.mjs'],
 ['src/engine/sim.ts','scripts/.d2c-sim.mjs'],
 ['src/engine/export-frame.ts','scripts/.d2c-frame.mjs'],
 ['src/engine/render.ts','scripts/.d2c-render.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.d2c-snapshot.mjs'],
 ['src/engine/capture.ts','scripts/.d2c-capture.mjs']
];
const load=async i=>import(pathToFileURL(resolve(modules[i][1])).href);
try{
 await Promise.all(modules.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,platform:'node',format:'esm',target:'node22'})));
 const {penrosePatch,penroseHitTest}=await load(0);
 const {lookupCell,projectionMap}=await load(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {exportFrameLayout,renderExportFrame}=await load(4);
 const {renderWorld}=await load(5);
 const {snapshotWorld,restoreWorldSnapshot}=await load(6);
 const {createCaptureCursor}=await load(7);
 globalThis.document={createElement(type){assert.equal(type,'canvas');return createCanvas(1,1);}};
 const scenarios=[
  {aspect:'square',cellCount:32},
  {aspect:'portrait',cellCount:64},
  {aspect:'landscape',cellCount:48}
 ];
 for(const cfg of scenarios){
  const settings={...INITIAL_SETTINGS,...cfg,lattice:'penrose',engine:'life',
   lifeRule:'custom',customBirth:[1,2,3],wrap:false,density:0,seed:2581};
  const [w,h]=worldDimensions(settings),patch=penrosePatch(w,h);
  let i=0;
  for(const tile of patch.tiles){
   const [cx,cy]=tile.centroid;
   const u=cx/patch.extent[0],v=cy/patch.extent[1];
   const answer=penroseHitTest(w,h,u,v);
   assert.equal(answer,i,'Exact tile center on '+w+'x'+h+' selects its true rhomb');
   assert.deepEqual(lookupCell('penrose',w,h,u,v),[i%w,Math.floor(i/w)]);
   // Every point 30% from the polygon boundary towards its center
   // is strictly INSIDE this same face, including thin rhomb tips.
   for(const vertex of tile.vertices){
    const x=(vertex[0]*.7+cx*.3)/patch.extent[0];
    const y=(vertex[1]*.7+cy*.3)/patch.extent[1];
    assert.equal(penroseHitTest(w,h,x,y),i,'Fine rhomb vertex selection');
   }
   i++;
  }
  assert.equal(penroseHitTest(w,h,NaN,.2),null);
  assert.equal(penroseHitTest(w,h,-.02,.2),null);
  assert.equal(penroseHitTest(w,h,1,.2),null);
  if(cfg.aspect==='portrait'){
   const preview=projectionMap('penrose',w,h);
   const tiny=patch.tiles.findIndex(t=>{
    const v=t.centroid;
    const px=Math.floor(v[0]/patch.extent[0]*preview.width);
    const py=Math.floor(v[1]/patch.extent[1]*preview.height);
    return preview.indices[py*preview.width+px]!==patch.tiles.indexOf(t);
   });
   // A downsampled preview map may miss tiny cells, but exact picking
   // must still select all of their genuine interior points.
   if(tiny>=0){
    const t=patch.tiles[tiny],u=t.centroid[0]/patch.extent[0],v=t.centroid[1]/patch.extent[1];
    assert.equal(penroseHitTest(w,h,u,v),tiny);
   }
  }
  console.log('PASS exact Penrose hit testing: '+w+' × '+h+', '+patch.tiles.length+' real rhombs');
 }
 const s={...INITIAL_SETTINGS,lattice:'penrose',engine:'life',lifeRule:'custom',
  customBirth:[1],customSurvive:[1,2],density:0,wrap:false,
  cellCount:32,aspect:'square',seed:8115};
 const [w,h]=worldDimensions(s),patch=penrosePatch(w,h);
 const a={...INITIAL_APPEARANCE,skin:'pixels',palette:['#090617','#fff000'],
  colorBy:'state',showGrid:false,trails:false,glowStrength:0,
  print:{...INITIAL_APPEARANCE.print,enabled:false}};
 const centerId=patch.tiles.findIndex(t=>t.neighbors.length===4);
 assert(centerId>=0);
 const world=createWorld(s);
 world.cells.fill(0);world.cells[centerId]=1;
 const frozen=snapshotWorld(world);
 const artPixel=(canvas,x,y)=>{
  const c=canvas.getContext('2d');
  return [...c.getImageData(Math.max(0,Math.min(canvas.width-1,Math.round(x))),
    Math.max(0,Math.min(canvas.height-1,Math.round(y))),1,1).data];
 };
 for(const [aspect,short] of [['square',720],['square',1080],['square',2160],['portrait',1080]]){
  const layout=exportFrameLayout(s,short,aspect,'contain');
  const target=createCanvas(1,1),scratch=createCanvas(1,1);
  renderExportFrame(target,scratch,world,a,layout);
  assert.deepEqual([target.width,target.height],[layout.width,layout.height]);
  const t=patch.tiles[centerId],cx=t.centroid[0],cy=t.centroid[1];
  const sx=layout.image.width/patch.extent[0],sy=layout.image.height/patch.extent[1];
  const pixel=artPixel(target,layout.image.x+cx*sx,layout.image.y+cy*sy);
  assert(pixel[0]>170&&pixel[1]>140&&pixel[2]<100,'Bright seeded rhomb at true centroid');
  // Native path quality check: pixels two px INSIDE a real physical
  // polygon edge remain vibrant while two px OUTSIDE stay dark.
  const [p0,p1]=t.vertices;
  const midpoint=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2];
  let nx=(cx-midpoint[0])*sx,ny=(cy-midpoint[1])*sy;
  const mag=Math.hypot(nx,ny);nx/=mag;ny/=mag;
  const centerScreen=[layout.image.x+midpoint[0]*sx,layout.image.y+midpoint[1]*sy];
  const inside=artPixel(target,centerScreen[0]+nx*2.3,centerScreen[1]+ny*2.3);
  const outside=artPixel(target,centerScreen[0]-nx*2.3,centerScreen[1]-ny*2.3);
  assert(inside[0]>155&&inside[1]>120,'Native-resolution rhomb edge stays bright');
  assert(outside[0]<80&&outside[1]<80,'No blurred low-res color crossing genuine rhomb edge');
  const png=target.toBuffer('image/png');
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(new DataView(png.buffer,png.byteOffset,png.byteLength).getUint32(16),layout.width);
  assert.equal(new DataView(png.buffer,png.byteOffset,png.byteLength).getUint32(20),layout.height);
  console.log('PASS native Penrose PNG '+aspect+' '+target.width+'×'+target.height+' / '+png.byteLength+' bytes');
 }
 for(const aspect of ['current','square','portrait','landscape','portrait34','landscape43','portrait45','landscape54','portrait23','landscape32']){
  const frame=exportFrameLayout(s,2160,aspect,'contain');
  assert(frame.width>=2160||frame.height>=2160);
  assert(frame.image.width<=frame.width&&frame.image.height<=frame.height);
  assert(!frame.cropped);
 }
 const portrait=exportFrameLayout(s,1080,'portrait','contain');
 assert.deepEqual([portrait.width,portrait.height],[1080,1920]);
 assert.equal(portrait.image.width,1080);
 assert(Math.abs(portrait.image.height-1080)<=12,
  'A true finite Penrose patch is nearly square but must not be geometrically stretched');
 const cursor=createCaptureCursor(world,s,10,10);
 cursor.advance();
 assert.deepEqual(cursor.current.cells,stepWorld(world,s).cells);
 assert.deepEqual(restoreWorldSnapshot(frozen,s).cells,world.cells);
 assert.equal(world.generation,0);
 assert.deepEqual(snapshotWorld(world),frozen,'Rendering cannot mutate true CA state/history');
 const previewCanvas=createCanvas(1,1);
 renderWorld(previewCanvas,world,a,900);
 assert(previewCanvas.width===900&&previewCanvas.height>0);
 console.log('PASS D2C: 9:16 and 1:1 framing, actual 2160p output, unchanged recording/replay');
}finally{
 await Promise.all(modules.map(([,out])=>unlink(resolve(out)).catch(()=>{})));
}
