import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/spins-turmites.ts','scripts/.c3-core.mjs'],
 ['src/engine/sim.ts','scripts/.c3-sim.mjs'],
 ['src/engine/types.ts','scripts/.c3-types.mjs'],
 ['src/engine/capture.ts','scripts/.c3-capture.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.c3-snapshot.mjs'],
 ['src/engine/alien-paint.ts','scripts/.c3-paint.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.c3-mutate.mjs'],
 ['src/engine/color-signals.ts','scripts/.c3-color.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const mod=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {stepIsing,isingMagnetization,isingEnergy,stepTurmites,seedTurmites,
  validTurmiteRule}=await mod(0);
 const {createWorld,stepWorld}=await mod(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE,worldDimensions}=await mod(2);
 const {cloneWorld,createCaptureCursor}=await mod(3);
 const {snapshotWorld,restoreWorldSnapshot}=await mod(4);
 const {applyAlienStamp,INITIAL_ALIEN_BRUSH}=await mod(5);
 const {mutateAutomatart,requiresWorldRestart}=await mod(6);
 const {computeColorSignal}=await mod(7);
 const idx=(x,y,w)=>y*w+x;
 assert(validTurmiteRule('RL'));
 assert(validTurmiteRule('LRRRRRLLR'));
 assert(!validTurmiteRule('R'));
 assert(!validTurmiteRule('LRX'));
 assert(!validTurmiteRule('LR'.repeat(7)));
 const ants=seedTurmites(32,32,12,818);
 assert.equal(ants.length,12);
 assert.deepEqual(seedTurmites(32,32,12,818),ants,'Agent placement is seed-stable');
 assert(ants.every(a=>a.x>=0&&a.y>=0&&a.x<32&&a.y<32&&a.heading>=0&&a.heading<4));
 const tracks=new Uint8Array(25);
 const ant0=[{x:2,y:2,heading:0}];
 const ant1=stepTurmites(tracks,5,5,true,'RL',ant0);
 assert.equal(ant1.cells[idx(2,2,5)],1,'State zero turns right and increments');
 assert.deepEqual(ant1.agents,[{x:3,y:2,heading:1}]);
 assert.deepEqual(ant0,[{x:2,y:2,heading:0}],'Turmite transition never mutates source agents');
 const ant2=stepTurmites(ant1.cells,5,5,true,'RL',ant1.agents);
 assert.deepEqual(ant2.agents,[{x:3,y:3,heading:2}]);
 assert.equal(ant2.cells[idx(3,2,5)],1);
 const edge=stepTurmites(new Uint8Array(25),5,5,false,'LR',[{x:0,y:0,heading:0}]);
 assert.deepEqual(edge.agents,[{x:1,y:0,heading:1}],
  'Reflect turn back into finite world and preserve inward heading');
 const wrapped=stepTurmites(new Uint8Array(25),5,5,true,'LR',[{x:0,y:0,heading:0}]);
 assert.deepEqual(wrapped.agents,[{x:4,y:0,heading:3}]);
 const collide=stepTurmites(new Uint8Array(25),5,5,true,'RL',
   [{x:2,y:2,heading:0},{x:2,y:2,heading:0}]);
 assert.equal(collide.cells[idx(2,2,5)],0,
   'Two agents read/write sequentially in documented stable ID order');
 assert.deepEqual(collide.agents,[{x:3,y:2,heading:1},{x:1,y:2,heading:3}]);
 assert.throws(()=>stepTurmites(new Uint8Array(25),5,5,true,'RL',
  [{x:-1,y:2,heading:0}]),/Invalid Turmite position/);
 const baseIsing={temperature:0,coupling:1,field:0,sweeps:1,seed:42,generation:0};
 const checker=new Uint8Array(16);
 for(let y=0;y<4;y++)for(let x=0;x<4;x++)checker[idx(x,y,4)]=(x+y)%2;
 const ordered=stepIsing(checker,4,4,true,baseIsing);
 assert(ordered.every(x=>x===1||x===0));
 assert.equal(Math.abs(isingMagnetization(ordered)),1,
   'At zero temperature a staggered ferromagnetic seed orders after one sweep');
 assert(isingEnergy(ordered,4,4,true,1,0)<=isingEnergy(checker,4,4,true,1,0));
 let annealed=checker;
 for(let i=0;i<12;i++){
  const next=stepIsing(annealed,4,4,true,{...baseIsing,generation:i});
  assert(isingEnergy(next,4,4,true,1,0)<=isingEnergy(annealed,4,4,true,1,0),
   'Zero-temperature dynamics never accepts energy-increasing flips');
  annealed=next;
 }
 const thermal=stepIsing(ordered,4,4,true,{...baseIsing,temperature:5,generation:4});
 assert.deepEqual(thermal,stepIsing(ordered,4,4,true,{...baseIsing,temperature:5,generation:4}),
  'Metropolis temperature uses counter-based deterministic random decisions');
 const anti=stepIsing(checker,4,4,true,{...baseIsing,coupling:-1});
 assert(isingEnergy(anti,4,4,true,-1,0)<=isingEnergy(checker,4,4,true,-1,0));
 assert.equal(isingEnergy(checker,4,4,true,-1,0),-32,
  'Antiferromagnetic checkerboard on 4x4 torus is ground state');
 const fieldStart=new Uint8Array(16).fill(0);
 assert(stepIsing(fieldStart,4,4,true,{...baseIsing,coupling:0,field:1}).every(x=>x===1),
  'Positive field aligns all down spins at T=0');
 assert.throws(()=>stepIsing(checker,5,4,true,baseIsing),/even-by-even/);
 const is={...INITIAL_SETTINGS,engine:'ising',cellCount:32,aspect:'portrait',
   seed:847,isingTemperature:1.5,isingCoupling:1,isingField:.2,isingSweeps:1};
 const [iw,ih]=worldDimensions(is);
 assert.equal(iw%2,0);assert.equal(ih%2,0);
 const w0=createWorld(is),w1=stepWorld(w0,is);
 assert(w1.cells.every(v=>v<=1));
 assert.equal(w1.neighborShape,'vonNeumann','Ising inspector uses actual four-neighbor graph');
 assert.deepEqual(w1.cells,stepWorld(createWorld(is),is).cells);
 const brush={...INITIAL_ALIEN_BRUSH,size:0,mode:'paint',stamp:'brush'};
 const down={...is,isingBrush:0};
 const isWorld=createWorld(down);
 const marked=applyAlienStamp(isWorld,down,[6,6],brush,91);
 assert(marked.length>0);
 for(const id of marked)assert.equal(isWorld.cells[id],0,'Finger brush can paint DOWN as 0');
 const snapshotIs=snapshotWorld(isWorld);
 assert.deepEqual(restoreWorldSnapshot(snapshotIs,down).cells,isWorld.cells);
 const faultyIs=structuredClone(snapshotIs);
 const bin=Uint8Array.from(atob(faultyIs.arrays.cells),c=>c.charCodeAt(0));
 bin[0]=3;faultyIs.arrays.cells=btoa(String.fromCharCode(...bin));
 assert.throws(()=>restoreWorldSnapshot(faultyIs,down),/Invalid Ising spin/);
 const t={...INITIAL_SETTINGS,engine:'turmites',cellCount:32,density:0.25,
  turmiteRule:'RLLR',turmiteCount:4,turmiteBrush:2,seed:3300};
 let world=createWorld(t);
 assert(world.cells.every(v=>v===0),'Turmite canvas starts as a clean track');
 assert.equal(world.turmiteAgents?.length,4);
 const stamped=applyAlienStamp(world,t,[10,10],brush,182);
 for(const id of stamped)assert.equal(world.cells[id],2);
 let other=cloneWorld(world);
 assert.notEqual(other.turmiteAgents,world.turmiteAgents,'Clone deep-copies agents');
 for(let i=0;i<40;i++){
  world=stepWorld(world,t);other=stepWorld(other,t);
  assert.deepEqual(world.cells,other.cells);
  assert.deepEqual(world.turmiteAgents,other.turmiteAgents);
 }
 const exported=snapshotWorld(world);
 assert.equal(exported.turmiteAgents?.length,4);
 const resumed=restoreWorldSnapshot(exported,t);
 assert.deepEqual(resumed.turmiteAgents,world.turmiteAgents);
 assert.deepEqual(resumed.cells,world.cells);
 assert.deepEqual(stepWorld(resumed,t).turmiteAgents,stepWorld(world,t).turmiteAgents,
  'Saved Turmite positions and headings resume with no reset');
 const cursor=createCaptureCursor(world,t,10,10);
 assert.deepEqual(cursor.current.turmiteAgents,world.turmiteAgents);
 cursor.current.turmiteAgents[0].x=0;
 assert.notEqual(world.turmiteAgents[0].x,0,'Recording never aliases source agent objects');
 const gone=structuredClone(exported);delete gone.turmiteAgents;
 assert.throws(()=>restoreWorldSnapshot(gone,t),/Turmite agent count/);
 const bogus=structuredClone(exported);bogus.turmiteAgents[0].x=999;
 assert.throws(()=>restoreWorldSnapshot(bogus,t),/Turmite coordinate/);
 const badTrack=structuredClone(exported);
 const bytes=Uint8Array.from(atob(badTrack.arrays.cells),c=>c.charCodeAt(0));
 bytes[12]=255;badTrack.arrays.cells=btoa(String.fromCharCode(...bytes));
 assert.throws(()=>restoreWorldSnapshot(badTrack,t),/Turmite track/);
 assert(requiresWorldRestart(t,{...t,turmiteRule:'RL'}));
 assert(requiresWorldRestart(t,{...t,turmiteCount:2}));
 assert(!requiresWorldRestart(is,{...is,isingTemperature:4.7}));
 const frozen=mutateAutomatart(is,INITIAL_APPEARANCE,
  {strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},
    allowRestart:false},919);
 assert.equal(frozen.settings.isingTemperature,is.isingTemperature);
 assert.equal(frozen.settings.isingCoupling,is.isingCoupling);
 assert.equal(frozen.settings.isingField,is.isingField);
 const color=computeColorSignal(w1,{...INITIAL_APPEARANCE,colorBy:'entropy'},'entropy');
 assert(color.every(v=>Number.isFinite(v)&&v>=0&&v<=1.00001));
 console.log('PASS: Ising checkerboard Metropolis, T=0, ferro/antiferro, energy, field and seed replay');
 console.log('PASS: Turmite Langton RL, multi-agent collisions, wrapping/reflection and persistent agents');
 console.log('PASS: brush, strict snapshot validation, immutable capture clone and mutation locks');
}finally{
 await Promise.all(jobs.map(([,file])=>unlink(resolve(file)).catch(()=>{})));
}
