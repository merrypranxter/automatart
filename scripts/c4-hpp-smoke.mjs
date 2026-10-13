import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/lattice-gas.ts','scripts/.c4-hpp.mjs'],
 ['src/engine/sim.ts','scripts/.c4-sim.mjs'],
 ['src/engine/types.ts','scripts/.c4-types.mjs'],
 ['src/engine/capture.ts','scripts/.c4-capture.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.c4-snapshot.mjs'],
 ['src/engine/alien-paint.ts','scripts/.c4-paint.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.c4-mutate.mjs'],
 ['src/engine/color-signals.ts','scripts/.c4-signals.mjs'],
 ['src/engine/neighborhood.ts','scripts/.c4-neighbors.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const mod=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {collideHpp,stepHpp,hppParticleCount,hppMomentum,hppCount,paintHpp}=await mod(0);
 const {createWorld,stepWorld}=await mod(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await mod(2);
 const {cloneWorld,createCaptureCursor}=await mod(3);
 const {snapshotWorld,restoreWorldSnapshot}=await mod(4);
 const {applyAlienStamp,INITIAL_ALIEN_BRUSH}=await mod(5);
 const {mutateAutomatart,requiresWorldRestart}=await mod(6);
 const {computeColorSignal}=await mod(7);
 const {maxNeighborCount,supportsNeighborhood}=await mod(8);
 assert.equal(collideHpp(5),10,'N+S collide into E+W');
 assert.equal(collideHpp(10),5,'E+W collide into N+S');
 for(let mask=0;mask<16;mask++){
  assert.equal(collideHpp(collideHpp(mask)),mask,'Exact HPP collision is involutive');
  assert.equal(hppCount(collideHpp(mask)),hppCount(mask),'Collision conserves particle mass');
  assert.deepEqual(hppMomentum(new Uint8Array([collideHpp(mask)])),
    hppMomentum(new Uint8Array([mask])),'HPP collision conserves local momentum');
 }
 const idx=(x,y,w)=>y*w+x;
 const w=8,h=8,n=w*h;
 const empty=new Uint8Array(n),walls=new Uint8Array(n);
 const justNorth=empty.slice();justNorth[idx(3,4,w)]=1;
 const stepN=stepHpp(justNorth,w,h,true,walls);
 assert.equal(stepN[idx(3,3,w)],1,'North channel streams one cell');
 assert.equal(hppParticleCount(stepN),1);
 const pair=empty.slice();pair[idx(3,4,w)]=5;
 const steppedPair=stepHpp(pair,w,h,true,walls);
 assert.equal(steppedPair[idx(2,4,w)],8,'Vertical collision creates westward ray');
 assert.equal(steppedPair[idx(4,4,w)],2,'Vertical collision creates eastward ray');
 assert.equal(hppParticleCount(steppedPair),2);
 const edge=empty.slice();edge[idx(0,0,w)]=1;
 assert.equal(stepHpp(edge,w,h,false,walls)[0],4,'Finite north edge reflects to south');
 assert.equal(stepHpp(edge,w,h,true,walls)[idx(0,7,w)],1,'Periodic north edge wraps');
 const wallWorld=empty.slice(),barrier=walls.slice();
 wallWorld[idx(2,3,w)]=2;barrier[idx(3,3,w)]=1;
 const wallStep=stepHpp(wallWorld,w,h,false,barrier);
 assert.equal(wallStep[idx(2,3,w)],8,'Particle reflects from solid wall into reverse velocity');
 assert.equal(wallStep[idx(3,3,w)],0,'No particle enters a wall');
 assert.equal(hppParticleCount(wallStep),1);
 const collisionAtWall=empty.slice();collisionAtWall[idx(3,3,w)]=1;
 assert.throws(()=>stepHpp(collisionAtWall,w,h,true,barrier),/Invalid HPP world/);
 // Exhaustive 16-state pair states over a periodic torus at 8x8.
 // Particle NUMBER and vector MOMENTUM are invariants without walls.
 for(let mask=0;mask<16;mask++){
  let state=empty.slice();
  state[idx(3,2,w)]=mask;
  state[idx(5,6,w)]=15-mask;
  const mass=hppParticleCount(state),momentum=hppMomentum(state);
  for(let i=0;i<35;i++){
   state=stepHpp(state,w,h,true,walls);
   assert.equal(hppParticleCount(state),mass,'Mass conserved every generation');
   assert.deepEqual(hppMomentum(state),momentum,'Periodic momentum conserved');
  }
 }
 // Wall/channel brush operations intentionally can change mass.
 const paintCells=empty.slice(),paintWalls=walls.slice();
 paintHpp(paintCells,paintWalls,[4,5],'particles',5,'paint');
 assert.equal(paintCells[4],5);assert.equal(paintCells[5],5);
 paintHpp(paintCells,paintWalls,[4],'particles',1,'erase');
 assert.equal(paintCells[4],4,'Erase only removes selected velocity channels');
 paintHpp(paintCells,paintWalls,[4],'particles',8,'invert');
 assert.equal(paintCells[4],12,'Invert XOR toggles selected channels');
 paintHpp(paintCells,paintWalls,[4],'walls',1,'paint');
 assert.equal(paintCells[4],0);
 assert.equal(paintWalls[4],1);
 paintHpp(paintCells,paintWalls,[4],'particles',15,'paint');
 assert.equal(paintCells[4],0,'Walls block particle brush');
 paintHpp(paintCells,paintWalls,[4],'walls',15,'erase');
 assert.equal(paintWalls[4],0,'Erase removes a wall');
 const s={...INITIAL_SETTINGS,engine:'hpp',cellCount:32,
  seed:8924,pattern:'noise',density:.15,hppBrush:5,hppTool:'particles'};
 let world=createWorld(s);
 assert.equal(world.hppWalls?.length,1024);
 assert.equal(world.neighborShape,'vonNeumann');
 assert.equal(maxNeighborCount(s),4);
 assert.equal(supportsNeighborhood('hpp','square'),false,'HPP cannot use custom neighbor stencil');
 const startingMass=hppParticleCount(world.cells);
 const startingMomentum=hppMomentum(world.cells);
 const next=stepWorld(world,s);
 assert.equal(hppParticleCount(next.cells),startingMass);
 assert.deepEqual(hppMomentum(next.cells),startingMomentum);
 assert.notEqual(next.hppWalls,world.hppWalls,'World generations do not alias wall buffers');
 const brush={...INITIAL_ALIEN_BRUSH,size:0,mode:'paint',stamp:'brush'};
 world.cells.fill(0);world.hppWalls.fill(0);
 const planted=applyAlienStamp(world,s,[7,9],brush,215);
 assert(planted.length>0);
 for(const i of planted)assert.equal(world.cells[i],5);
 const wsettings={...s,hppTool:'walls'};
 const built=applyAlienStamp(world,wsettings,[7,9],brush,215);
 for(const i of built){
  assert.equal(world.hppWalls[i],1,'Real wall mask written by Alien brush');
  assert.equal(world.cells[i],0,'Walls clear any particles at their location');
 }
 const recorded=createCaptureCursor(world,wsettings,10,10);
 recorded.current.hppWalls[planted[0]]=0;
 assert.equal(world.hppWalls[planted[0]],1,'Recording deep-clones canonical solid walls');
 const saved=snapshotWorld(world);
 assert(typeof saved.arrays.hppWalls==='string');
 const reloaded=restoreWorldSnapshot(saved,wsettings);
 assert.deepEqual(reloaded.cells,world.cells);
 assert.deepEqual(reloaded.hppWalls,world.hppWalls);
 assert.deepEqual(stepWorld(reloaded,wsettings).cells,stepWorld(world,wsettings).cells,
  'Loaded HPP world evolves exactly from saved particles and geometry');
 const broken=structuredClone(saved);
 const raw=Uint8Array.from(atob(broken.arrays.hppWalls),x=>x.charCodeAt(0));
 raw[11]=2;broken.arrays.hppWalls=btoa(String.fromCharCode(...raw));
 assert.throws(()=>restoreWorldSnapshot(broken,wsettings),/Invalid HPP snapshot/);
 const broken2=structuredClone(saved);
 const cells=Uint8Array.from(atob(broken2.arrays.cells),x=>x.charCodeAt(0));
 cells[planted[0]]=1;broken2.arrays.cells=btoa(String.fromCharCode(...cells));
 assert.throws(()=>restoreWorldSnapshot(broken2,wsettings),/Invalid HPP snapshot/);
 const missing=structuredClone(saved);delete missing.arrays.hppWalls;
 assert.throws(()=>restoreWorldSnapshot(missing,wsettings),/World snapshot array/);
 const cloned=cloneWorld(world);
 cloned.hppWalls[planted[0]]=0;
 assert.equal(world.hppWalls[planted[0]],1);
 assert(!requiresWorldRestart(wsettings,{...wsettings,hppTool:'particles',hppBrush:15}),
  'Changing HPP injection brush keeps the live universe');
 assert(requiresWorldRestart(s,{...s,engine:'ising'}),'Engine changes reset world safely');
 const locked=mutateAutomatart(wsettings,INITIAL_APPEARANCE,
  {strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},
   allowRestart:false},331);
 assert.equal(locked.settings.hppTool,'walls');
 assert.equal(locked.settings.hppBrush,wsettings.hppBrush);
 const signal=computeColorSignal(next,{...INITIAL_APPEARANCE,colorBy:'entropy'},'entropy');
 assert(signal.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
 console.log('PASS: all 16 HPP states, conserved collision mass and momentum');
 console.log('PASS: 4-direction synchronous streaming, periodic and reflecting edges, solid obstacles');
 console.log('PASS: real particle/channel and wall brushes, exact JSON snapshot and recorder, mutation locks');
}finally{
 await Promise.all(jobs.map(([,file])=>unlink(resolve(file)).catch(()=>{})));
}
