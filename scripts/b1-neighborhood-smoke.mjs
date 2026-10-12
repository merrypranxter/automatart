import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/neighborhood.ts','scripts/.b1-neighborhood.mjs'],
 ['src/engine/topology.ts','scripts/.b1-topology.mjs'],
 ['src/engine/types.ts','scripts/.b1-types.mjs'],
 ['src/engine/sim.ts','scripts/.b1-sim.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.b1-mutation.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const mod=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {maxNeighborCount,validNeighborhoodSettings,supportsNeighborhood,bitCount}=await mod(0);
 const {neighborOffsets}=await mod(1);
 const {INITIAL_SETTINGS}=await mod(2);
 const {createWorld,stepWorld}=await mod(3);
 const {mutateAutomatart}=await mod(4);
 const shapeList=[['moore',8],['vonNeumann',4],['square2',24],['diamond2',12]];
 for(const [shape,count] of shapeList){
  const offsets=neighborOffsets('square',10,10,shape,255);
  assert.equal(offsets.length,count,'Actual neighbor count '+shape);
  assert.equal(new Set(offsets.map(o=>o.join(','))).size,count,'No duplicated offset '+shape);
  assert(!offsets.some(o=>o[0]===0&&o[1]===0),'Exclude self '+shape);
  for(const [dx,dy] of offsets)assert(Math.abs(dx)<=2&&Math.abs(dy)<=2);
  assert.equal(maxNeighborCount({...INITIAL_SETTINGS,neighborShape:shape}),count);
 }
 assert.equal(bitCount(170),4,'N/E/S/W mask');
 assert.deepEqual(neighborOffsets('square',12,12,'directional',10),[[0,-1],[1,0]]);
 assert.equal(neighborOffsets('square',0,0,'directional',128).length,1);
 assert.equal(maxNeighborCount({...INITIAL_SETTINGS,neighborShape:'directional',neighborMask:170}),4);
 assert.equal(maxNeighborCount({...INITIAL_SETTINGS,neighborShape:'directional',neighborMask:10}),2);
 assert.equal(maxNeighborCount({...INITIAL_SETTINGS,lattice:'hex',neighborShape:'moore'}),6);
 assert.equal(maxNeighborCount({...INITIAL_SETTINGS,lattice:'triangle',neighborShape:'moore'}),3);
 assert(supportsNeighborhood('cyclic','square'));
 assert(!supportsNeighborhood('wolfram','square'));
 assert(!supportsNeighborhood('life','hex'));
 assert(!validNeighborhoodSettings({...INITIAL_SETTINGS,lattice:'hex',neighborShape:'square2'}));
 assert(!validNeighborhoodSettings({...INITIAL_SETTINGS,engine:'margolus',neighborShape:'directional'}));
 assert(!validNeighborhoodSettings({...INITIAL_SETTINGS,neighborShape:'directional',neighborMask:0}));
 const base={...INITIAL_SETTINGS,engine:'life',lifeRule:'custom',
  customBirth:[10],customSurvive:[],cellCount:32,density:0,pattern:'center',
  lattice:'square',neighborShape:'square2',neighborMask:255,wrap:false};
 const first=createWorld(base);
 first.cells.fill(0);first.ages.fill(0);
 const x=16,y=16,idx=y*32+x;
 // Place ten cells ONLY in the outer ring, so the radius-1 Moore rule sees 0.
 const outer=neighborOffsets('square',x,y,'square2',255).filter(([dx,dy])=>Math.max(Math.abs(dx),Math.abs(dy))===2).slice(0,10);
 assert.equal(outer.length,10);
 for(const [dx,dy] of outer)first.cells[(y+dy)*32+x+dx]=1;
 const born=stepWorld(first,base);
 assert.equal(born.neighbors[idx],10,'Counted ten selected neighbors, not only eight');
 assert.equal(born.cells[idx],1,'B10 causes genuine birth with 24-cell neighborhood');
 const small=stepWorld(first,{...base,neighborShape:'moore'});
 assert.equal(small.neighbors[idx],0,'Eight-neighbor rule ignores outer ring completely');
 assert.equal(small.cells[idx],0,'B10 is never triggered by a radius-1 neighborhood');
 const special={...base,neighborShape:'directional',neighborMask:10,customBirth:[2]};
 const directional=createWorld(special);directional.cells.fill(0);
 directional.cells[(y-1)*32+x]=1;directional.cells[y*32+x+1]=1;
 directional.cells[(y+1)*32+x]=1;
 const directionResult=stepWorld(directional,special);
 assert.equal(directionResult.neighbors[idx],2,'Directional rule sees N and E, ignores S');
 assert.equal(directionResult.cells[idx],1,'Birth triggered by selected directions only');
 assert.equal(stepWorld(directional,{...special,neighborMask:2}).cells[idx],0,
  'Deselecting a compass position changes evolution, not merely UI');
 const edge={...base,neighborShape:'square2',wrap:true,customBirth:[1]};
 const edgeWorld=createWorld(edge);edgeWorld.cells.fill(0);edgeWorld.cells[30*32+30]=1;
 assert.equal(stepWorld(edgeWorld,edge).neighbors[0],1,'Radius-2 toroidal wrapping reaches upper-left');
 assert.equal(stepWorld(edgeWorld,{...edge,wrap:false}).neighbors[0],0,'Finite edges do not wrap');
 for(const shape of ['square2','diamond2','directional']){
  for(const engine of ['life','brians','cyclic','generations','excitable','species']){
   const settings={...INITIAL_SETTINGS,engine,cellCount:32,neighborShape:shape,
    neighborMask:170,seed:9923};
   assert(validNeighborhoodSettings(settings),shape+' compatible '+engine);
   const w=createWorld(settings);
   assert.deepEqual(stepWorld(w,settings).cells,stepWorld(createWorld(settings),settings).cells,
    shape+' '+engine+' deterministic step');
  }
 }
 const initialAppearance={palette:['#ff00ff','#00ffff'],colorBy:'state',skin:'pixels'};
 const opts={strength:'wtf',locks:{palette:true,rule:false,engine:true,seed:true},allowRestart:false};
 for(const seed of [1,2,88,1401]){
  const result=mutateAutomatart(base,initialAppearance,opts,seed);
  assert(validNeighborhoodSettings(result.settings));
  assert.equal(result.settings.engine,base.engine);
  assert.equal(result.willRestart,false);
 }
 console.log('PASS: B1 Moore/diamond 24/12 neighbor counts, directional masks, B10 actual births, toroidal edges');
 console.log('PASS: square/hex compatibility, six compatible engines, deterministic mutation safety');
}finally{
 await Promise.all(files.map(([,p])=>unlink(resolve(p)).catch(()=>{})));
}
