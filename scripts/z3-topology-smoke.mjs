import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const outSim=resolve('scripts/.z3-sim-test.mjs');
const outTopo=resolve('scripts/.z3-topo-test.mjs');
const settings={
 engine:'life',lifeRule:'conway',cellCount:32,aspect:'portrait',seed:1624,density:.36,wrap:true,
 pattern:'noise',neighborShape:'moore',lattice:'square',
 orientedMask:34,orientedSymmetry:'rotations',orientedMatch:'exact',orientedSurviveMin:2,orientedSurviveMax:3,
 customBirth:[3],customSurvive:[2,3],trailDecay:.89,cyclicStates:12,cyclicThreshold:2,wolframRule:30,
 genStates:8,genBirth:[3],genSurvive:[2,3],exciteStates:8,exciteThreshold:2,
 largeRadius:2,largeBirthMin:6,largeBirthMax:9,largeSurviveMin:5,largeSurviveMax:12,
 speciesCount:3,speciesBirth:2,speciesSurvive:1,speciesAttackBias:1
};
function empty(engine,lattice,w=8,h=6){
 const n=w*h;
 return {engine,lattice,width:w,height:h,generation:0,cells:new Uint8Array(n),
 ages:new Uint16Array(n),neighbors:new Uint8Array(n),events:new Uint8Array(n),
 traces:new Float32Array(n),previousCells:new Uint8Array(n),olderCells:new Uint8Array(n),fossils:new Float32Array(n)};
}
try{
 await Promise.all([
  build({entryPoints:['src/engine/sim.ts'],outfile:outSim,platform:'node',bundle:true,format:'esm',target:'node22'}),
  build({entryPoints:['src/engine/topology.ts'],outfile:outTopo,platform:'node',bundle:true,format:'esm',target:'node22'})
 ]);
 const {createWorld,stepWorld,rewindWorld}=await import(pathToFileURL(outSim).href);
 const {neighborOffsets,orientedMatch,mirrorMask,rotateBlocks,polygonForCell,
        geometryExtent,lookupCell,projectionMap}=await import(pathToFileURL(outTopo).href);
 const modulo=(n,m)=>(n+m)%m;
 for(const [shape,expected] of [['square',8],['hex',6],['triangle',3]]){
   const [w,h]=[8,6];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const offsets=neighborOffsets(shape,x,y,'moore');
     assert.equal(offsets.length,expected,shape+' has correct neighbor count');
     for(const [dx,dy] of offsets){
       const xx=modulo(x+dx,w),yy=modulo(y+dy,h);
       assert(neighborOffsets(shape,xx,yy,'moore').some(([ox,oy])=>
          modulo(xx+ox,w)===x&&modulo(yy+oy,h)===y),
         shape+' torus edges are bidirectional');
     }
   }
   if(shape!=='square'){
     const [wx,hy]=geometryExtent(shape,w,h);
     const map=projectionMap(shape,w,h);
     assert(map.width>0&&map.height>0);
     assert([...map.indices].some(v=>v!==0xffffffff),'Nonempty '+shape+' geometry');
     for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
       const poly=polygonForCell(shape,x,y);
       const center=poly.reduce(([a,b],[cx,cy])=>[a+cx/poly.length,b+cy/poly.length],[0,0]);
       const position=lookupCell(shape,w,h,center[0]/wx,center[1]/hy);
       assert.deepEqual(position,[x,y],shape+' pointer projection should pick the actual cell');
     }
   }
 }
 for(const shape of ['hex','triangle']){
   const world=empty('life',shape);
   const x=4,y=3;
   for(const [dx,dy] of neighborOffsets(shape,x,y,'moore')){
     world.cells[modulo(y+dy,world.height)*world.width+modulo(x+dx,world.width)]=1;
   }
   const result=stepWorld(world,{...settings,lattice:shape});
   assert.equal(result.neighbors[y*world.width+x],shape==='hex'?6:3,shape+' counts actual local topology');
   assert.equal(result.cells[y*world.width+x],shape==='triangle'?1:0,
     shape+' B3/S23 behavior uses 3 or 6 neighbors');
 }
 assert(orientedMatch(34,34,'fixed','exact'),'N/S exact');
 assert(!orientedMatch(136,34,'fixed','exact'),'horizontal differs from vertical');
 assert(orientedMatch(136,34,'rotations','exact'),'quarter-turn symmetry');
 assert(orientedMatch(mirrorMask(4),4,'dihedral','exact'),'reflection equivalence');
 assert(!orientedMatch(34|16,34,'fixed','exact'),'exact rejects extra neighbors');
 assert(orientedMatch(34|16,34,'fixed','contains'),'contains allows extra neighbors');
 const o=empty('oriented','square',8,8);
 o.cells[2*8+3]=1;o.cells[4*8+3]=1;
 let result=stepWorld(o,{...settings,engine:'oriented',lattice:'square'});
 assert.equal(result.cells[3*8+3],1,'Oriented birth exactly N/S');
 const reversibleSettings={...settings,engine:'margolus',lattice:'square',wrap:true,aspect:'portrait'};
 let world=createWorld(reversibleSettings);
 assert.equal(world.width%2,0);assert.equal(world.height%2,0);
 const before=world.cells.slice();
 const history=[world.cells.slice()];
 for(let k=0;k<12;k++){world=stepWorld(world,reversibleSettings);history.push(world.cells.slice());}
 for(let k=11;k>=0;k--){
   world=rewindWorld(world,reversibleSettings);
   assert.deepEqual(world.cells,history[k],'Exact reversible cell states at generation '+k);
 }
 assert.equal(world.generation,0);
 assert.deepEqual(world.cells,before);
 const s=empty('margolus','square',8,6);
 s.cells[0]=1;
 const one=rotateBlocks(s.cells,8,6,0,false);
 assert.deepEqual(rotateBlocks(one,8,6,0,true),s.cells);
 console.log('PASS: hex/triangle symmetric neighbor graphs + geometric picking, oriented pattern symmetry and exactly reversible Margolus over 12 ticks');
}finally{
 await Promise.all([unlink(outSim).catch(()=>{}),unlink(outTopo).catch(()=>{})]);
}
