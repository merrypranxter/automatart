import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir='scripts/.f3-';
const out=resolve(dir+'alien.mjs'),snap=resolve(dir+'snapshot.mjs'),types=resolve(dir+'types.mjs'),sim=resolve(dir+'sim.mjs');
try{
  await Promise.all([
    build({entryPoints:['src/engine/alien-paint.ts'],outfile:out,platform:'node',bundle:true,format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/world-snapshot.ts'],outfile:snap,platform:'node',bundle:true,format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/types.ts'],outfile:types,platform:'node',bundle:true,format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/sim.ts'],outfile:sim,platform:'node',bundle:true,format:'esm',target:'node22'})
  ]);
  const {applyAlienStamp,alienFootprint,INITIAL_ALIEN_BRUSH,validateAlienBrush,isGliderCompatible}=await import(pathToFileURL(out).href);
  const {snapshotWorld,restoreWorldSnapshot}=await import(pathToFileURL(snap).href);
  const {INITIAL_SETTINGS,worldDimensions}=await import(pathToFileURL(types).href);
  const {createWorld,stepWorld}=await import(pathToFileURL(sim).href);
  const settings={...INITIAL_SETTINGS,engine:'life',lifeRule:'conway',lattice:'square',cellCount:32,aspect:'square',density:0,seed:41};
  const world=createWorld(settings);
  const blank=()=>{
    const w=createWorld(settings);
    w.cells.fill(0);w.ages.fill(0);w.traces.fill(0);w.events.fill(0);
    return w;
  };
  const stamp=(b,seed=987,anchor=[11,12],worldOverride=blank(),settingsOverride=settings)=>{
    const points=applyAlienStamp(worldOverride,settingsOverride,anchor,b,seed);
    return {world:worldOverride,points};
  };
  for(const sym of ['single','mirror','quad','radial8']){
    const b={...INITIAL_ALIEN_BRUSH,stamp:'brush',size:0,symmetry:sym};
    const a=stamp(b),c=stamp(b);
    assert.deepEqual(a.points,c.points,sym+' deterministic stamping');
    assert.equal(a.points.length,({single:1,mirror:2,quad:4,radial8:8})[sym],sym+' orbit cardinality');
  }
  // Mirrored asymmetric glider must mirror its SHAPE as well as its center.
  const glide=stamp({...INITIAL_ALIEN_BRUSH,stamp:'glider',size:2,symmetry:'mirror'},56,[10,10]);
  assert.equal(glide.points.length,10,'Conway glider has 5 + 5 mirrored sites');
  for(const cell of glide.points){
    const x=cell%32,y=Math.floor(cell/32);
    assert(glide.points.includes(y*32+(31-x)),'Every mirrored glider cell has a reflected partner');
  }
  assert(isGliderCompatible(settings));
  assert(!isGliderCompatible({...settings,lifeRule:'highlife'}));
  assert.equal(validateAlienBrush({...INITIAL_ALIEN_BRUSH,stamp:'glider'},{
    ...settings,lifeRule:'highlife'}).stamp,'spore','Unsupported glider converted to generic seed');
  for(const shape of ['square','hex','triangle']){
    const setup={...settings,lattice:shape,aspect:'portrait'};
    const w=createWorld(setup);
    const b={...INITIAL_ALIEN_BRUSH,stamp:'spiral',size:5,
      symmetry:'radial8',scatter:2,density:.73,rotation:45};
    const x=Math.floor(w.width/2),y=Math.floor(w.height/2);
    const points=applyAlienStamp(w,setup,[x,y],b,221);
    assert(points.length>8,shape+' has a substantial actual-cell stamp');
    for(const p of points)assert.equal(w.cells[p],1,shape+' paints valid lattice cells');
    const wp=createWorld(setup);
    assert.deepEqual(applyAlienStamp(wp,setup,[x,y],b,221),points,
      shape+' seeded scatter is reproducible');
    assert.deepEqual(wp.cells,w.cells,shape+' seeded stamp grid reproducible');
    const erased=applyAlienStamp(w,setup,[x,y],{...b,mode:'erase'},221);
    assert.deepEqual(erased,points,shape+' eraser mirrors same footprint');
    assert(points.every(p=>w.cells[p]===0),shape+' actually erases');
    applyAlienStamp(w,setup,[x,y],{...b,mode:'invert'},221);
    assert(points.every(p=>w.cells[p]===1),shape+' invert toggles empty cells on');
    applyAlienStamp(w,setup,[x,y],{...b,mode:'invert'},221);
    assert(points.every(p=>w.cells[p]===0),shape+' invert toggles cells off');
    const packed=snapshotWorld(wp);
    const restored=restoreWorldSnapshot(packed,setup);
    for(const key of ['cells','ages','traces','events','previousCells','olderCells','fossils']){
      assert.deepEqual(restored[key],wp[key],shape+' restores '+key+' without loss');
    }
    assert.equal(restored.generation,wp.generation);
    const next1=stepWorld(wp,setup),next2=stepWorld(restored,setup);
    assert.deepEqual(next1.cells,next2.cells,shape+' resumed evolution matches exact snapshot');
  }
  const speciesSettings={...settings,engine:'species',speciesCount:4};
  const sw=createWorld(speciesSettings);sw.cells.fill(0);
  const speciesPaint=applyAlienStamp(sw,speciesSettings,[12,12],
    {...INITIAL_ALIEN_BRUSH,stamp:'diamond',size:3,species:3},14);
  assert(speciesPaint.length>4);
  assert(speciesPaint.every(index=>sw.cells[index]===3),'Species stamp writes selected ID, not generic 1');
  const margolus={...settings,engine:'margolus'};
  const mw=createWorld(margolus);
  const p=applyAlienStamp(mw,margolus,[12,12],{...INITIAL_ALIEN_BRUSH,stamp:'ring',size:4},11);
  assert(p.length>0);
  const first=stepWorld(mw,margolus);
  assert.equal(first.generation,1,'Stamps do not break reversible block evolution');
  assert.throws(()=>restoreWorldSnapshot(snapshotWorld(mw),{...settings,engine:'cyclic'}),/incompatible/);
  assert.deepEqual(worldDimensions({...settings,lattice:'hex'}),[32,32]);
  console.log('PASS: F3 real-cell symmetry, glider compatibility, 10 stamps, seed scatter, 3 lattices, species/erase/invert and exact JSON world snapshots');
}finally{
  await Promise.all([out,snap,types,sim].map(p=>unlink(p).catch(()=>{})));
}
