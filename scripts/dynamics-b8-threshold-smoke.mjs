import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const jobs=[
 ['src/engine/wire-logic.ts','scripts/.b8-logic.mjs'],
 ['src/engine/wire-inhibition.ts','scripts/.b8-inhibition.mjs'],
 ['src/engine/wire-threshold-spectrum.ts','scripts/.b8-spectrum.mjs'],
 ['src/engine/sim.ts','scripts/.b8-sim.mjs'],
 ['src/engine/types.ts','scripts/.b8-types.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.b8-snapshot.mjs'],
 ['src/engine/wire-signal-scope.ts','scripts/.b8-scope.mjs']
];
try{
 await Promise.all(jobs.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(jobs[i][1])).href);
 const {wireLogicLayout,wireLogicFootprint,stampWireLogic,runWireLogicBench}=await load(0);
 const {inspectWireInhibition}=await load(1);
 const {runWireThresholdSpectrum,WIRE_THRESHOLD_LAWS}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 const {INITIAL_SETTINGS}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 const {forecastWireSignals}=await load(6);
 const s={...INITIAL_SETTINGS,engine:'wireworld',lattice:'square',cellCount:72,
  aspect:'square',wrap:false,seed:1982,density:0,
  wireExciteMin:1,wireExciteMax:2,wireDrive:'off'};
 const address=(p,w)=>p[1]*w+p[0];
 let fullWorldCases=0,collisionRows=0,physicsVariantChecks=0;
 for(const kind of ['nor','nae'])for(let radius=7;radius<=12;radius++){
  const bench=runWireLogicBench(kind,radius);
  assert(bench.allPass,'Canonical NAE/NOR must pass all source truth rows at radius '+radius);
  assert.equal(bench.cases.length,kind==='nae'?8:4);
  assert.deepEqual(bench.cases.map(row=>Number(row.hits[0])),kind==='nae'?
   [0,1,1,1,1,1,1,0]:[1,0,0,0],
   'Truth table must be measured from actual electron HEADS');
  for(const row of bench.cases){
   const event=inspectWireInhibition(kind,radius,row.a,row.b,row.c);
   const neighborExpected=kind==='nor'?2+row.a+row.b:row.a+row.b+row.c;
   assert.equal(event.neighborHeads[0],neighborExpected,
    'Original eight-neighbor head count directly encodes threshold algebra');
   assert.equal(event.junctionStates[0],1,'Junction must be actual conductor');
   assert.equal(event.junctionStates[1],row.hits[0]?2:1);
   assert.deepEqual(event.outputHeadTicks,row.hits[0]?[radius+1]:[],
    'Output must produce exactly one HEAD or remain silent for entire horizon');
   assert(event.exact,'Collision microscope and physical truth table agree');
   collisionRows++;
   for(const rotation of [0,1,2,3]){
    const opts={kind,radius,rotation,a:row.a,b:row.b,c:row.c};
    let live=createWorld(s);live.cells.fill(0);
    const before=live.cells.slice(),startGen=live.generation;
    const ids=wireLogicFootprint(live,[36,36],opts);
    const installed=stampWireLogic(live,[36,36],opts);
    assert.equal(live.generation,startGen);
    assert.notDeepEqual(live.cells,before);
    assert(ids.every(i=>[1,2,3].includes(live.cells[i])));
    assert(installed.touched.length<800,'Stamp must clear local cells only');
    assert.equal(installed.ports.inputC!==undefined,kind==='nae');
    let imported=restoreWorldSnapshot(snapshotWorld(live),s);
    assert.deepEqual(imported.cells,live.cells);
    const out=address(installed.ports.outputs[0],live.width);
    const actual=[];
    for(let t=0;t<2*radius+34;t++){
     if(live.cells[out]===2)actual.push(t);
     live=stepWorld(live,s);imported=stepWorld(imported,s);
    }
    assert.deepEqual(actual,event.outputHeadTicks,
     'No late phantom HEAD on the remote truth port');
    assert.deepEqual(live.cells,imported.cells,'Recipe replay byte parity');
    assert.equal(live.waveStimulusCount,0);
    fullWorldCases++;
   }
  }
 }
 assert.equal(fullWorldCases,288);
 assert.equal(collisionRows,72);
 // The SAME physical geometry, five bona fide four-state neighbor laws.
 for(const kind of ['nor','nae'])for(const radius of [7,9,12]){
  const spectrum=runWireThresholdSpectrum(kind,radius);
  assert.equal(spectrum.length,WIRE_THRESHOLD_LAWS.length);
  const expected=kind==='nae'?'01111110':'1000';
  assert.equal(spectrum[1].fingerprint,expected);
  assert.deepEqual(spectrum[1].rows.map(r=>Number(r.head)),
   runWireLogicBench(kind,radius).cases.map(c=>Number(c.hits[0])));
  for(const {law,rows,fingerprint} of spectrum){
   assert.equal(fingerprint.length,kind==='nae'?8:4);
   assert.equal(rows.length,kind==='nae'?8:4);
   for(const entry of rows){
    let world=createWorld({...s,wireExciteMin:law.min,wireExciteMax:law.max});
    world.cells.fill(0);
    const geometry=wireLogicLayout({kind,radius,rotation:0,a:entry.a,b:entry.b,c:entry.c});
    const center=[36,36],index=(pt)=> (center[1]+pt[1])*world.width+center[0]+pt[0];
    for(const p of geometry.conductors)world.cells[index(p)]=1;
    for(const p of geometry.heads)world.cells[index(p)]=2;
    for(const p of geometry.tails)world.cells[index(p)]=3;
    const remote=index(geometry.ports.outputs[0]),observed=[];
    const changed={...s,wireExciteMin:law.min,wireExciteMax:law.max};
    for(let tick=0;tick<2*radius+18;tick++){
     if(world.cells[remote]===2)observed.push(tick);
     world=stepWorld(world,changed);
    }
    assert.deepEqual(observed,entry.ticks,'Spectrum is full real-world production physics, NOT boolean truth substitution');
    physicsVariantChecks++;
   }
  }
 }
 // Genuine metamorphosis: NAE 111 OFF under original rule, ON at remote port for 1..3; exactly 3 excites only the junction.
 const changed=runWireThresholdSpectrum('nae',9);
 assert.equal(changed[1].rows.at(-1).head,false);
 assert.equal(changed[2].rows.at(-1).head,true);
 assert.equal(changed[4].rows.at(-1).head,false,
  'An EXACT-3 center ignites, but the output wire cannot propagate a single neighboring HEAD');
 const strict3={...s,wireExciteMin:3,wireExciteMax:3};
 const strictWorld=createWorld(strict3);strictWorld.cells.fill(0);
 stampWireLogic(strictWorld,[36,36],{kind:'nae',radius:9,rotation:0,a:1,b:1,c:1});
 const strictNext=stepWorld(strictWorld,strict3);
 assert.equal(strictNext.cells[36*strictNext.width+36],2,
  'True 111 junction ignition occurs under EXACT-3, even while the remote output stays silent');
 // Original recipe & passive scope remain valid for the new three-input gate.
 let stamped=createWorld(s);stamped.cells.fill(0);
 const art=stampWireLogic(stamped,[36,36],{kind:'nae',radius:9,rotation:0,a:0,b:1,c:1});
 const previous=stamped.cells.slice();
 const [x,y]=art.ports.outputs[0];
 assert.deepEqual(forecastWireSignals(stamped,s,[{label:'NAE',x,y}],32).traces[0].headTicks,[10]);
 assert.deepEqual(stamped.cells,previous,'Probe never overwrites generated 3-input art');
 const before=stamped.cells.slice();
 assert.throws(()=>stampWireLogic(stamped,[0,0],{kind:'nor',radius:9,rotation:0,a:0,b:0}),
  /artboard edge/);
 assert.deepEqual(stamped.cells,before,'A clipped gate must be rejected atomically');
 assert.throws(()=>wireLogicLayout({kind:'and',radius:9,rotation:0,a:1,b:1}),/Invalid/,
  'Unverified physical AND cannot be relabeled from algebra');
 console.log('PASS B8: '+collisionRows+' real 0..4 Moore HEAD counts and '+fullWorldCases+' rotated whole-world NOR/NAE truth histories');
 console.log('PASS B8: '+physicsVariantChecks+' full production-cell simulations prove five alternative excitation laws change the actual logic');
 console.log('PASS B8: exact recipes, eight-case NAE, silent 000/111, safe stamps, untouched scope; no fake physical AND');
}finally{
 await Promise.all(jobs.map(([,filename])=>unlink(resolve(filename)).catch(()=>{})));
}
