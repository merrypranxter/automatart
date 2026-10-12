import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out=resolve('scripts/.funhouse-smoke.mjs');
const typeOut=resolve('scripts/.funhouse-types.mjs');
const simOut=resolve('scripts/.funhouse-sim.mjs');
try{
  await Promise.all([
    build({entryPoints:['src/engine/funhouse.ts'],outfile:out,platform:'node',bundle:true,format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/types.ts'],outfile:typeOut,platform:'node',bundle:true,format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/sim.ts'],outfile:simOut,platform:'node',bundle:true,format:'esm',target:'node22'})
  ]);
  const {palettePhase,rotatedColors,shuffledColors,randomColors}=await import(pathToFileURL(out).href);
  const {LIFE_RULES,INITIAL_SETTINGS,INITIAL_APPEARANCE,PALETTE_LIBRARY}=await import(pathToFileURL(typeOut).href);
  const {createWorld,stepWorld}=await import(pathToFileURL(simOut).href);
  const named={
    maze:['3','12345'],mazectric:['3','1234'],replicator:['1357','1357'],
    diamoeba:['35678','5678'],coral:['3','45678'],amoeba:['357','1358']
  };
  for(const [id,[b,s]] of Object.entries(named)){
    const rule=LIFE_RULES[id];
    assert.equal(rule.birth.join(''),b,id+' exact birth');
    assert.equal(rule.survive.join(''),s,id+' exact survival');
    const world=createWorld({...INITIAL_SETTINGS,engine:'life',lifeRule:id,seed:342});
    const next=stepWorld(world,{...INITIAL_SETTINGS,engine:'life',lifeRule:id,seed:342});
    assert.equal(next.generation,1);
  }
  const a={...INITIAL_APPEARANCE,palette:Array.from({length:6},(_,i)=>'#'+(i*17).toString(16).padStart(6,'0')),paletteMotion:'pingpong',paletteOffset:0,paletteCycle:1};
  assert.deepEqual(Array.from({length:12},(_,i)=>palettePhase(a,i)),
    [0,1,2,3,4,5,4,3,2,1,0,1],'Six-stop triangle wave');
  assert.equal(palettePhase({...a,paletteCycle:-1},1),1,'Reverse generation direction also bounces');
  assert.equal(palettePhase({...a,paletteMotion:'forward'},6),6,'Continuous mode remains unchanged');
  const stops=['#110000','#220000','#330000','#440000','#550000','#660000'];
  const unchanged=[...stops];
  assert.deepEqual(rotatedColors(stops),['#220000','#330000','#440000','#550000','#660000','#110000']);
  assert.deepEqual(rotatedColors(stops,6),stops);
  const shuffled=shuffledColors(stops,()=>0);
  assert.notDeepEqual(shuffled,stops);
  assert.deepEqual([...shuffled].sort(),[...stops].sort(),'Shuffle preserves all color stops');
  const zero=randomColors(12,()=>0);
  assert.equal(zero.length,12);
  assert(zero.every(c=>c==='#000000'),'Unrestricted random means black allowed');
  assert.deepEqual(randomColors(2,()=>0.99999999),['#ffffff','#ffffff'],'White is allowed, no print limits');
  const newMix=randomColors(12,()=>Math.random());
  assert(newMix.every(c=>/^#[0-9a-f]{6}$/i.test(c)));
  assert.equal(PALETTE_LIBRARY.length,31,'Existing exact preset library unaffected');
  assert.deepEqual(stops,unchanged,'Operations do not modify original palette');
  console.log('PASS: six real B/S roulette rules, triangle-wave palette, two RGB randomizers, stop order');
}finally{
  await Promise.all([unlink(out).catch(()=>{}),unlink(typeOut).catch(()=>{}),unlink(simOut).catch(()=>{})]);
}
