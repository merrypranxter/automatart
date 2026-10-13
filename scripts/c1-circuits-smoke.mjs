import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/circuits.ts','scripts/.c1-circuits.mjs'],
 ['src/engine/sim.ts','scripts/.c1-sim.mjs'],
 ['src/engine/types.ts','scripts/.c1-types.mjs'],
 ['src/engine/capture.ts','scripts/.c1-capture.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.c1-snapshot.mjs'],
 ['src/engine/alien-paint.ts','scripts/.c1-paint.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.c1-mutate.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const mod=async n=>import(pathToFileURL(resolve(files[n][1])).href);
 const {stepWireworld,stepSandpile,grainSum,sandFeedIndex,stepSandpile:topple,
  sandVisualState}=await mod(0);
 const {createWorld,stepWorld}=await mod(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await mod(2);
 const {cloneWorld,createCaptureCursor,equalGrains}=await mod(3);
 const {snapshotWorld,restoreWorldSnapshot}=await mod(4);
 const {applyAlienStamp,INITIAL_ALIEN_BRUSH}=await mod(5);
 const {mutateAutomatart}=await mod(6);
 const pos=(x,y,w)=>y*w+x;
 const w=5,h=5,cells=new Uint8Array(w*h);
 cells[pos(2,2,w)]=1;cells[pos(1,2,w)]=2;cells[pos(4,4,w)]=3;
 let next=stepWireworld(cells,w,h,false);
 assert.equal(next[pos(2,2,w)],2,'Conductor with one head becomes head');
 assert.equal(next[pos(1,2,w)],3,'Electron head becomes tail');
 assert.equal(next[pos(4,4,w)],1,'Tail becomes conductor');
 assert.equal(next[pos(0,0,w)],0,'Empty stays empty');
 const crowded=cells.slice();
 crowded[pos(2,1,w)]=2;crowded[pos(3,2,w)]=2;
 assert.equal(stepWireworld(crowded,w,h,false)[pos(2,2,w)],1,
  'Three neighboring heads do not excite conductor');
 const edge=new Uint8Array(25);edge[pos(0,0,5)]=1;edge[pos(4,4,5)]=2;
 assert.equal(stepWireworld(edge,5,5,true)[0],2,'Moore torus wraps diagonal heads');
 assert.equal(stepWireworld(edge,5,5,false)[0],1,'Finite edges do not wrap');
 const quad=new Uint32Array(25);quad[pos(2,2,5)]=4;
 const mid=topple(quad,5,5,false,0,1,42,0,'center');
 assert.equal(mid.grains[pos(2,2,5)],0);
 for(const [x,y] of [[1,2],[3,2],[2,1],[2,3]])
  assert.equal(mid.grains[pos(x,y,5)],1,'Each of four cardinal neighbors receives one grain');
 assert.equal(mid.lost,0);assert.equal(grainSum(mid.grains),4);
 const corner=new Uint32Array(25);corner[0]=4;
 const open=stepSandpile(corner,5,5,false,0,1,4,0,'center');
 assert.equal(open.lost,2,'Open corner dissipates two of four grains');
 assert.equal(grainSum(open.grains),2);
 const cyclic=stepSandpile(corner,5,5,true,0,1,4,0,'center');
 assert.equal(cyclic.lost,0);
 assert.equal(grainSum(cyclic.grains),4,'Periodic borders conserve grain mass');
 assert.equal(cyclic.grains[pos(4,0,5)],1);
 assert.equal(cyclic.grains[pos(0,4,5)],1);
 const huge=new Uint32Array(25);huge[12]=70000;
 const high=stepSandpile(huge,5,5,false,0,1,4,0,'center');
 assert.equal(high.grains[12],69996,'Topples retain >255 canonical integer heights');
 assert.equal(sandVisualState(69996),255,'Eight-bit view saturation is presentation only');
 assert.equal(grainSum(high.grains),70000);
 const fed=stepSandpile(corner,5,5,true,17,2,2201,9,'random');
 assert.equal(grainSum(fed.grains),grainSum(corner)+17);
 assert.equal(sandFeedIndex(9,10,5,5),sandFeedIndex(9,10,5,5));
 assert.deepEqual(fed,stepSandpile(corner,5,5,true,17,2,2201,9,'random'));
 // Serial and parallel stabilizations agree on open boundaries without feeding.
 const serial=(source,width,height)=>{
  const a=[...source];
  for(let count=0;count<200000;count++){
   const i=a.findIndex(x=>x>=4);if(i<0)return a;
   a[i]-=4;const x=i%width,y=Math.floor(i/width);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const px=x+dx,py=y+dy;
    if(px>=0&&py>=0&&px<width&&py<height)a[py*width+px]++;
   }
  }
  throw Error('Serial baseline did not stabilize');
 };
 let parallel=new Uint32Array(49);parallel[24]=320;
 for(let i=0;i<10000;i++){
  if([...parallel].every(v=>v<4))break;
  parallel=stepSandpile(parallel,7,7,false,0,8,0,i,'center').grains;
 }
 const serialStart=new Uint32Array(49);serialStart[24]=320;
 assert.deepEqual([...parallel],serial(serialStart,7,7),
  'Finite Abelian stabilization independent of legal toppling order');
 const s={...INITIAL_SETTINGS,engine:'sandpile',lattice:'square',cellCount:32,
  sandFeed:0,sandRounds:4,sandBrush:12,seed:1992,density:.2};
 const initial=createWorld(s),index=16*32+16;
 assert(initial.grains instanceof Uint32Array);
 initial.grains.fill(0);initial.cells.fill(0);
 initial.grains[index]=70000;initial.cells[index]=255;
 const clone=cloneWorld(initial);
 assert.notEqual(clone.grains,initial.grains,'Capture does not alias canonical grains');
 assert.equal(clone.grains[index],70000);
 const captured=createCaptureCursor(initial,s,10,10);
 assert.equal(captured.current.grains[index],70000);
 assert.equal(equalGrains(initial.grains,clone.grains),true);
 assert.equal(stepWorld(initial,s).grains[index],69984,'Four parallel topplings per frame');
 const saved=snapshotWorld(initial);
 assert(saved.arrays.grains,'Recipe includes canonical full-width grain data');
 const restored=restoreWorldSnapshot(saved,s);
 assert.deepEqual(restored.grains,initial.grains,'Exact sandpile snapshot roundtrip');
 assert.deepEqual(restored.cells,initial.cells);
 const corrupt=structuredClone(saved);
 corrupt.arrays.grains='AQ==';
 assert.throws(()=>restoreWorldSnapshot(corrupt,s),'Malformed grain snapshots rejected');
 const altered=structuredClone(saved);delete altered.arrays.grains;
 assert.throws(()=>restoreWorldSnapshot(altered,s),'Missing sandpile grain data rejected');
 const brush={...INITIAL_ALIEN_BRUSH,size:0,mode:'paint',stamp:'brush'};
 const planted=applyAlienStamp(restored,s,[5,5],brush,1234);
 assert(planted.length>0);
 for(const i of planted)assert.equal(restored.grains[i],12);
 const afterBrush=snapshotWorld(restored);
 assert.deepEqual(restoreWorldSnapshot(afterBrush,s).grains,restored.grains);
 const wire={...INITIAL_SETTINGS,engine:'wireworld',cellCount:32,wireBrush:2};
 const wireW=createWorld(wire);
 const touched=applyAlienStamp(wireW,wire,[4,4],brush,4431);
 for(const i of touched)assert.equal(wireW.cells[i],2,'Selected head material actually painted');
 for(const engine of ['wireworld','sandpile']){
  const options={...INITIAL_SETTINGS,engine,cellCount:32,seed:12345};
  const a=createWorld(options),b=createWorld(options);
  assert.deepEqual(a.cells,b.cells);
  assert.deepEqual(stepWorld(a,options).cells,stepWorld(b,options).cells);
 }
 const mutation=mutateAutomatart(s,INITIAL_APPEARANCE,
  {strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},allowRestart:false},132);
 assert.equal(mutation.settings.sandFeed,s.sandFeed,'Locked math is immutable');
 assert.equal(mutation.willRestart,false);
 console.log('PASS: Wireworld four-state rules, 1/2-head excitation, boundaries, deterministic replay');
 console.log('PASS: real UInt32 grain conservation, finite sinks, high piles, Abelian stabilization');
 console.log('PASS: sandpile snapshot/brush/recorder cloning and mutation rule-lock parity');
}finally{
 await Promise.all(files.map(([,p])=>unlink(resolve(p)).catch(()=>{})));
}
