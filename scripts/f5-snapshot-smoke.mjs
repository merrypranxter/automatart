import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const paths=[
 ['src/engine/snapshot.ts','scripts/.f5-snapshot.mjs'],
 ['src/engine/types.ts','scripts/.f5-types.mjs'],
 ['src/engine/sim.ts','scripts/.f5-sim.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f5-world.mjs'],
 ['src/engine/printshop.ts','scripts/.f5-print.mjs']
];
try{
 await Promise.all(paths.map(([src,outfile])=>
  build({entryPoints:[src],outfile,bundle:true,platform:'node',format:'esm',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(paths[i][1])).href);
 const {snapshotLayout,snapshotFilename,renderSnapshot,snapshotPng}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {snapshotWorld,restoreWorldSnapshot}=await load(3);
 const {INITIAL_PRINT_SHOP,validatePrintShop}=await load(4);
 globalThis.document={createElement(kind){assert.equal(kind,'canvas');return createCanvas(1,1);}};
 const settings={...INITIAL_SETTINGS,engine:'cyclic',cellCount:48,aspect:'square',seed:4551};
 let world=createWorld(settings);
 for(let i=0;i<9;i++)world=stepWorld(world,settings);
 const before=world.cells.slice(),gen=world.generation;
 const a={...INITIAL_APPEARANCE,skin:'glass',print:validatePrintShop({
    ...INITIAL_PRINT_SHOP,enabled:true,effects:[
     {id:'posterize',enabled:true,amount:1},
     {id:'duotone',enabled:true,amount:.8}]
 })};
 const exact=[
   ['current',1080,1080,1080,false],
   ['square',1080,1080,1080,false],
   ['portrait',1080,1080,1920,true],
   ['landscape',1080,1920,1080,true],
   ['portrait',720,720,1280,true],
   ['landscape',720,1280,720,true],
   ['portrait',2160,2160,3840,true]
 ];
 for(const [aspect,shortSide,width,height,matte] of exact){
   const l=snapshotLayout(settings,{aspect,shortSide});
   assert.deepEqual([l.width,l.height,l.letterboxed],[width,height,matte],
     aspect+' x '+shortSide+' expected accurate aspect / letterbox');
   assert(l.image.x>=0&&l.image.y>=0,'Always inside the output frame');
   assert(l.image.width<=l.width&&l.image.height<=l.height,'No cropping');
 }
 for(const aspect of ['square','portrait','landscape']){
   const opts={aspect,shortSide:720};
   const canvas=createCanvas(1,1);
   const layout=renderSnapshot(canvas,world,settings,a,opts);
   const png=await snapshotPng(canvas);
   const bytes=new Uint8Array(await png.arrayBuffer());
   assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10],'Genuine PNG header');
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   assert.equal(view.getUint32(16),layout.width,'Width present in encoded PNG header');
   assert.equal(view.getUint32(20),layout.height,'Height present in encoded PNG header');
   assert(png.size>10000,'Actually contains distinct cell art, not a blank PNG');
   const filename=snapshotFilename(settings,world,layout);
   assert(filename.includes(layout.width+'x'+layout.height)&&filename.includes('gen9'));
   const context=canvas.getContext('2d');
   const top=context.getImageData(0,0,1,1).data;
   if(layout.letterboxed&&layout.image.y>0)assert.deepEqual(Array.from(top.slice(0,3)),[9,6,23],
     'Dark matte is not a stretched copy');
 }
 assert.deepEqual(world.cells,before,'Snapshot processing must NEVER advance or change CA cells');
 assert.equal(world.generation,gen,'Snapshot saves the CURRENT generation');
 // V1 current-world recipe -> identical world / appearance, older snapshots
 // and settings-only recipes continue to be valid migrations.
 const packed=snapshotWorld(world);
 const restored=restoreWorldSnapshot(packed,settings);
 assert.deepEqual(restored.cells,world.cells);
 assert.equal(restored.generation,world.generation);
 assert.equal(validatePrintShop(undefined).enabled,false,'Old recipe has no active printing');
 assert.equal(validatePrintShop({enabled:true,mix:999}).mix,1,'Old or corrupted values are bounded');
 const malformed=structuredClone(packed);malformed.arrays.cells='AQ==';
 assert.throws(()=>restoreWorldSnapshot(malformed,settings),/length|Invalid/);
 const unsupported=structuredClone(packed);unsupported.kind='future';
 assert.throws(()=>restoreWorldSnapshot(unsupported,settings),/incompatible/);
 console.log('PASS: current, square, 9:16 and 16:9 true PNG sizes, no stretch/crop, 4K resolution, print rendering');
 console.log('PASS: old/modern recipe compatibility and invalid snapshot rejection; generation/cells unchanged');
}finally{await Promise.all(paths.map(x=>unlink(resolve(x[1])).catch(()=>{})));}
