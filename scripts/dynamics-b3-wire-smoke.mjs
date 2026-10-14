import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/circuits.ts','scripts/.b3-circuits.mjs'],
 ['src/engine/wire-electricity.ts','scripts/.b3-electric.mjs'],
 ['src/engine/wire-circuit-lab.ts','scripts/.b3-template.mjs'],
 ['src/engine/sim.ts','scripts/.b3-sim.mjs'],
 ['src/engine/types.ts','scripts/.b3-types.mjs'],
 ['src/engine/capture.ts','scripts/.b3-capture.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b3-snapshot.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.b3-mutation.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({entryPoints:[entry],outfile,
  bundle:true,platform:'node',format:'esm',target:'node22'})));
 const load=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {stepWireworld}=await load(0);
 const {wireCircuitCensus,injectWireSignals}=await load(1);
 const {WIRE_TEMPLATES,wireTemplateGeometry,wireStampFootprint,stampWireCircuit}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(4);
 const {cloneWorld,createCaptureCursor}=await load(5);
 const {snapshotWorld,restoreWorldSnapshot}=await load(6);
 const {requiresWorldRestart,mutateAutomatart}=await load(7);
 const s={...INITIAL_SETTINGS,engine:'wireworld',lattice:'square',cellCount:96,
  aspect:'square',seed:1982,wireDrive:'off',wireExciteMin:1,wireExciteMax:2};
 assert.equal(s.wireExciteMin,1);
 assert.equal(s.wireExciteMax,2);
 assert.equal(s.wireDrive,'off');
 const w=7,h=7,idx=(x,y)=>y*w+x;
 const cells=new Uint8Array(w*h);cells[idx(2,3)]=2;cells[idx(3,3)]=1;cells[idx(5,5)]=3;
 let traditional=stepWireworld(cells,w,h,false);
 assert.equal(traditional[idx(3,3)],2,'One head ignites conductor');
 assert.equal(traditional[idx(2,3)],3,'Head becomes refractory tail');
 assert.equal(traditional[idx(5,5)],1,'Tail relaxes into conductive material');
 assert.equal(traditional[idx(0,0)],0,'Empty cells cannot spontaneously conduct');
 const two=cells.slice();two[idx(3,2)]=2;
 assert.equal(stepWireworld(two,w,h,false)[idx(3,3)],2);
 const three=two.slice();three[idx(4,3)]=2;
 assert.equal(stepWireworld(three,w,h,false)[idx(3,3)],1);
 assert.equal(stepWireworld(three,w,h,false,1,3)[idx(3,3)],2,
  'Generalized one-to-three excitation is actually different');
 assert.equal(stepWireworld(two,w,h,false,2,2)[idx(3,3)],2,
  'Exact two-head firing also works');
 assert.equal(stepWireworld(cells,w,h,false,2,2)[idx(3,3)],1);
 assert.throws(()=>stepWireworld(cells,w,h,false,3,2),/excitation range/);
 let world=createWorld(s);
 const opts={template:'loop',radius:9,rotation:0,excite:true,clear:true};
 const before=world.cells.slice();
 let stamps=0;
 assert.equal(WIRE_TEMPLATES.length,7);
 for(const template of WIRE_TEMPLATES){
  for(let rotation=0;rotation<4;rotation++){
   const test=createWorld(s);
   test.cells.fill(0);
   const options={...opts,template:template.id,rotation};
   const footprint=wireStampFootprint(test,[48,48],options);
   assert(footprint.length>12,'Template must contain a useful real conductor track');
   const touched=stampWireCircuit(test,[48,48],options);
   assert(touched.length>=footprint.length);
   for(const p of footprint)assert([1,2,3].includes(test.cells[p]),
     'Templates have no fake canvas-only decoration');
   assert.equal(test.cells[footprint[0]],2);
   assert.equal(test.cells[footprint[1]],3);
   assert(touched.length<test.cells.length,'Placement never clears the entire canvas');
   const raw=snapshotWorld(test);
   assert.deepEqual(restoreWorldSnapshot(raw,s).cells,test.cells,
    'Circuit artwork survives exact JSON snapshot');
   const next=stepWorld(test,s);
   assert.equal(next.cells[footprint[0]],3,'Stamped head obeys true physical refractory step');
   stamps++;
  }
 }
 const footprint=wireStampFootprint(world,[48,48],opts);
 const placed=stampWireCircuit(world,[48,48],opts);
 assert.equal(world.generation,0,'Geometry stamps must not restart or advance time');
 assert(placed.length>footprint.length,'Local clearance touches only the chosen template neighborhood');
 assert.notDeepEqual(world.cells,before);
 const footprintSnapshot=snapshotWorld(world);
 const imported=restoreWorldSnapshot(footprintSnapshot,s);
 for(let i=0;i<12;i++){
  world=stepWorld(world,s);
  const follows=stepWorld(imported,s);
  imported.cells=follows.cells;imported.generation=follows.generation;
  // The canonical world is deterministic and has no hidden independent RNG.
  assert.deepEqual(world.cells,imported.cells);
 }
 let enough=0;
 for(const match of [[1,1],[1,2],[1,3],[2,2],[3,8]]){
  const settings={...s,wireExciteMin:match[0],wireExciteMax:match[1]};
  const sample=createWorld(settings);sample.cells.fill(0);
  // Test scan matches real pure production step, exact all 96x96 cells.
  for(let j=0;j<40;j++){
   const p=300+j*6;
   sample.cells[p]=1;
   if(j%3===0)sample.cells[p+1]=2;
  }
  const forecast=wireCircuitCensus(sample,settings,20000);
  assert.equal(forecast.checked,sample.cells.length);
  const result=stepWorld(sample,settings);
  let trueBirths=0;
  for(let k=0;k<sample.cells.length;k++)
   if(sample.cells[k]===1&&result.cells[k]===2)trueBirths++;
  assert.equal(forecast.naturalBirths,trueBirths,'Forecast matches actual next-step natural births');
  enough++;
 }
 const sampled=wireCircuitCensus(createWorld({...s,cellCount:256}),s);
 assert(sampled.checked<=4096,'Preview may never scan a 256x256 board at full expense');
 const base=new Uint8Array(96*96);base.fill(0);
 const clockBefore=base.slice(),clockNext=base.slice();
 const center=48*96+48;clockBefore[center]=1;clockNext[center]=1;
 const clock={...s,wireDrive:'clock',wirePeriod:7,wireSource:'center'};
 assert.equal(injectWireSignals(clockBefore,clockNext,96,96,clock,0),0);
 assert.equal(injectWireSignals(clockBefore,clockNext,96,96,clock,6),1);
 assert.equal(clockNext[center],2,'Clock writes real head only onto conductor');
 clockNext[center]=3;
 assert.equal(injectWireSignals(clockBefore,clockNext,96,96,clock,13),0,
  'No source may overwrite a tail or an already-energized site');
 const allZero=new Uint8Array(base.length);
 assert.equal(injectWireSignals(allZero,allZero.slice(),96,96,clock,6),0,
  'Clock cannot materialize an electron without conductive material');
 const storm={...s,wireDrive:'sparks',wireSparkRate:.009,seed:921};
 const source=new Uint8Array(96*96);for(let p=0;p<source.length;p++)if(p%5===0)source[p]=1;
 const a=source.slice(),b=source.slice();
 let impulses=injectWireSignals(source,a,96,96,storm,8);
 assert(impulses>0,'Seeded conductor sparks must generate true heads');
 assert.equal(injectWireSignals(source,b,96,96,storm,8),impulses);
 assert.deepEqual(a,b,'Seed + generation + address ensures exact deterministic replay');
 for(let p=0;p<a.length;p++)if(source[p]===0)assert.equal(a[p],0,
  'Sparks must never generate conductive material out of void');
 assert(!requiresWorldRestart(s,{...s,wireExciteMax:3,wireDrive:'sparks',wirePeriod:5}),
  'Live B3 wire rule and source tweaks must not reset the universe');
 const dead=createWorld({...s,density:0});dead.cells.fill(0);
 assert.deepEqual(stepWorld(dead,s).cells,dead.cells);
 assert.deepEqual(stepWorld(dead,clock).cells,dead.cells);
 const running=createCaptureCursor(dead,{...clock},10,10);
 assert.equal(running.advance().settled,false);
 // Pure Wireworld may genuinely settle; the renderer must not create fake motion.
 const pure=createCaptureCursor(dead,s,10,10);
 for(let k=0;k<2;k++)assert.equal(pure.advance().settled,false);
 assert.equal(pure.advance().settled,true);
 // A conductor with a timed pulse must not be mistaken for settled during a pause.
 const conductive=createWorld({...s,density:0});conductive.cells.fill(0);conductive.cells[center]=1;
 const slow=createCaptureCursor(conductive,{...clock,wirePeriod:120},10,10);
 for(let i=0;i<8;i++)assert.equal(slow.advance().settled,false);
 const locked=mutateAutomatart({...s,wireDrive:'clock'},INITIAL_APPEARANCE,
  {strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},allowRestart:false},1982);
 assert.equal(locked.settings.wireDrive,'clock');
 assert.equal(locked.settings.wireExciteMin,1);
 console.log('PASS B3: '+stamps+' real conductor stamps, 4 rotations, exact recipes and genuine head-tail transitions');
 console.log('PASS B3: canonical+generalized 4-state parity, deterministic conductor-only pulses, forecast and old GIF stop rules');
}finally{
 await Promise.all(jobs.map(([,outfile])=>unlink(resolve(outfile)).catch(()=>{})));
}
