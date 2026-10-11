import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const outfile=resolve('scripts/.mutant-engines-smoke.mjs');
const makeWorld=(engine,w=7,h=7)=>{
  const n=w*h;
  return {engine,width:w,height:h,generation:0,cells:new Uint8Array(n),
    ages:new Uint16Array(n),neighbors:new Uint8Array(n),events:new Uint8Array(n),traces:new Float32Array(n)};
};
try{
  await build({entryPoints:['src/engine/sim.ts'],platform:'node',format:'esm',bundle:true,target:'node22',outfile});
  const {createWorld,stepWorld}=await import(pathToFileURL(outfile).href);
  const base={
    engine:'life',lifeRule:'conway',cellCount:32,aspect:'square',seed:1234,density:.35,wrap:false,pattern:'noise',
    neighborShape:'moore',customBirth:[3],customSurvive:[2,3],trailDecay:.89,
    cyclicStates:12,cyclicThreshold:2,wolframRule:30,
    genStates:4,genBirth:[3],genSurvive:[2,3],
    exciteStates:4,exciteThreshold:2,
    largeRadius:2,largeBirthMin:4,largeBirthMax:4,largeSurviveMin:3,largeSurviveMax:5,
    speciesCount:3,speciesBirth:2,speciesSurvive:1,speciesAttackBias:1
  };
  const idx=(w,x,y)=>y*w+x;
  {
    const world=makeWorld('generations');
    const a=world.cells;
    // Three live neighbors: birth in the center. Two dying/refractory states
    // nearby should be ignored by neighbor count.
    a[idx(7,2,3)]=1;a[idx(7,4,3)]=1;a[idx(7,3,2)]=1;
    a[idx(7,3,4)]=2;a[idx(7,4,4)]=3;
    let next=stepWorld(world,{...base,engine:'generations'});
    assert.equal(next.cells[idx(7,3,3)],1,'B3 birth');
    assert.equal(next.neighbors[idx(7,3,3)],3,'Refractory states excluded from living count');
    assert.equal(next.cells[idx(7,3,4)],3,'2 -> 3 refractory');
    assert.equal(next.cells[idx(7,4,4)],0,'Last refractory -> rest');
    assert.equal(next.events[idx(7,3,3)],1,'Birth event');
    // Also exercise standalone dying cell.
    const alone=makeWorld('generations');alone.cells[idx(7,3,3)]=1;
    next=stepWorld(alone,{...base,engine:'generations'});
    assert.equal(next.cells[idx(7,3,3)],2,'Death -> first refractory');
  }
  {
    const world=makeWorld('excitable');
    world.cells[idx(7,2,3)]=1;world.cells[idx(7,4,3)]=1;
    world.cells[idx(7,3,2)]=2;world.cells[idx(7,3,4)]=3;
    const out=stepWorld(world,{...base,engine:'excitable'});
    assert.equal(out.cells[idx(7,3,3)],1,'Two excited neighbors cause excitation');
    assert.equal(out.cells[idx(7,2,3)],2,'Excited -> recovery');
    assert.equal(out.cells[idx(7,3,2)],3,'Refractory increments');
    assert.equal(out.cells[idx(7,3,4)],0,'Recovery returns to rest');
  }
  {
    const world=makeWorld('larger');
    for(const [x,y] of [[1,3],[5,3],[3,1],[3,5]])world.cells[idx(7,x,y)]=1;
    const out=stepWorld(world,{...base,engine:'larger'});
    assert.equal(out.neighbors[idx(7,3,3)],4,'Radius 2 counts four distant cells');
    assert.equal(out.cells[idx(7,3,3)],1,'Range B4..B4 births');
    const short=stepWorld(world,{...base,engine:'larger',largeRadius:1});
    assert.equal(short.cells[idx(7,3,3)],0,'Radius 1 ignores distant cells');
  }
  {
    const world=makeWorld('species');
    for(const [x,y] of [[2,2],[3,2],[4,3]])world.cells[idx(7,x,y)]=2;
    world.cells[idx(7,2,4)]=1;
    const out=stepWorld(world,{...base,engine:'species'});
    assert.equal(out.cells[idx(7,3,3)],2,'Majority species wins empty territory');
    const occupied=makeWorld('species');occupied.cells[idx(7,3,3)]=1;
    for(const [x,y] of [[2,3],[4,3],[3,2]])occupied.cells[idx(7,x,y)]=2;
    assert.equal(stepWorld(occupied,{...base,engine:'species'}).cells[idx(7,3,3)],2,'Overwhelming local enemy claims territory');
    const tied=makeWorld('species');
    for(const [x,y] of [[2,3],[4,3]])tied.cells[idx(7,x,y)]=2;
    for(const [x,y] of [[3,2],[3,4]])tied.cells[idx(7,x,y)]=1;
    assert.equal(stepWorld(tied,{...base,engine:'species'}).cells[idx(7,3,3)],1,'Deterministic ties favor lower species ID');
  }
  {
    const world=makeWorld('life');for(let x=2;x<=4;x++)world.cells[idx(7,x,3)]=1;
    const out=stepWorld(world,base);
    for(let y=2;y<=4;y++)assert.equal(out.cells[idx(7,3,y)],1,'Conway blinker remains correct');
  }
  for(const engine of ['life','brians','cyclic','wolfram','generations','excitable','larger','species']){
    const settings={...base,engine};
    let a=createWorld(settings),b=createWorld(settings);
    assert.deepEqual(a.cells,b.cells,engine+' deterministic seed');
    for(let i=0;i<4;i++){a=stepWorld(a,settings);b=stepWorld(b,settings);}
    assert.deepEqual(a.cells,b.cells,engine+' deterministic replay');
    assert.equal(a.generation,4,engine+' increments generations');
  }
  console.log('PASS: 8 deterministic engine families, 4 new rules, existing Conway, and local multistate transitions');
}finally{await unlink(outfile).catch(()=>{});}
