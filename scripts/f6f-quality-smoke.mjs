import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=[
 ['src/engine/f6f-quality.ts','scripts/.f6f-quality.mjs'],
 ['src/engine/types.ts','scripts/.f6f-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6f-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6f-render.mjs'],
 ['src/engine/f6d-microdetail.ts','scripts/.f6f-micro.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
function digest(canvas){
 const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let hash=2166136261;
 for(let i=0;i<p.length;i+=13)hash=Math.imul(hash^p[i],16777619);
 return hash>>>0;
}
try{
 await Promise.all(modules.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const {adaptiveMicroSamples,inkEdgeCoverage,tileBandVariation}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {renderWorld}=await load(3);
 const {microBudget}=await load(4);
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
 for(const n of [1,512,1024,4096,16384])for(let q=1;q<=3;q++){
  const budget=microBudget(n,q,'export');
  const cap=budget.samples;
  for(const [w,h] of [[1,4],[2,2],[6,14],[32,64],[1080,1920]]){
   const side=adaptiveMicroSamples(cap,w,h,.8,.2,7);
   assert(side>=0&&side<=cap,'Never exceed fixed F6D global budget');
   assert(side*side*n<=Math.max(n*4,budget.maxSamples));
   if(Math.min(w,h)<2)assert.equal(side,0,'Skip invisible microfaces');
  }
  if(n>1){
   const large=adaptiveMicroSamples(cap,120,100,1,.7,11);
   const quiet=adaptiveMicroSamples(cap,120,100,0,0,.5);
   assert(large>=quiet,'Active mathematical faces earn more samples');
  }
 }
 assert.deepEqual(inkEdgeCoverage(3.5,1,true),{offset:0,mix:0},
  'Inside a band, pigment remains pure and flat');
 assert.deepEqual(inkEdgeCoverage(3,1,true),{offset:-1,mix:.5},
  'Band starts receive balanced analytic coverage');
 assert.deepEqual(inkEdgeCoverage(3,1,false),{offset:0,mix:0});
 assert(inkEdgeCoverage(3.95,.5,true).mix>0);
 const variations=new Float32Array([0,1,2,1,2,3,2,3,4]);
 assert(tileBandVariation(variations,3,1,1)>0);
 assert.equal(tileBandVariation(new Float32Array(9).fill(4),3,1,1),0,
  'No unnecessary anti-alias blending for perfectly flat signals');
 for(const lattice of ['square','penrose','voronoi']){
  const settings={...INITIAL_SETTINGS,lattice,wrap:lattice==='square',
   engine:'cyclic',cellCount:32,aspect:'portrait',pattern:'noise',
   seed:96,voronoiJitter:.42,cyclicStates:9,density:.65};
  let world=createWorld(settings);
  for(let g=0;g<3;g++)world=stepWorld(world,settings);
  const previous=world.cells.slice();
  for(const skin of ['gyroid','facets','quasicrystal']){
   const appearance={...INITIAL_APPEARANCE,skin,
    mathMicroDetail:3,mathMicroFrequency:9,mathMicroMix:.8,
    mathFrequency:6,mathWarp:1.2,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   function draw(a=appearance,quality='export'){
    const c=createCanvas(1,1);
    renderWorld(c,world,a,480,undefined,quality);
    return digest(c);
   }
   const original=draw({...appearance,mathMicroDetail:0});
   assert.equal(original,draw({...appearance,mathMicroMix:0}),
    'Opt out returns byte-identical legacy pixels');
   const fine=draw();
   assert.notEqual(fine,original,'F6F keeps genuine micro-equations visible');
   assert.equal(fine,draw(),'New sampling/coverage must remain deterministic');
   assert.notEqual(fine,draw({...appearance,mathMicroDetail:1}),
    'Quality 3 enables improved edge coverage over quality 1');
   assert.notEqual(fine,draw({...appearance,mathMicroFrequency:3}),
    'Subcell mathematical frequency still works');
   assert.deepEqual(world.cells,previous,'No CA physics mutation from F6F rendering');
  }
  console.log('PASS F6F '+lattice+' opt-out, bounded adaptation, edge quality and determinism');
 }
 console.log('PASS F6F: adaptive physical polygon sampling + mathematically bounded color-edge coverage');
}finally{
 await Promise.all(modules.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
