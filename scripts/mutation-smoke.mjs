import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const filename=resolve('scripts/.mutation-test.mjs');
const typeFilename=resolve('scripts/.mutation-types-test.mjs');
const simFilename=resolve('scripts/.mutation-sim-test.mjs');
try{
  await Promise.all([
    build({entryPoints:['src/engine/mutation-automatart.ts'],outfile:filename,
      bundle:true,platform:'node',format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/types.ts'],outfile:typeFilename,
      bundle:true,platform:'node',format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/sim.ts'],outfile:simFilename,
      bundle:true,platform:'node',format:'esm',target:'node22'})
  ]);
  const {mutateAutomatart,requiresWorldRestart,INITIAL_MUTATION_LOCKS}=await import(pathToFileURL(filename).href);
  const {INITIAL_SETTINGS,INITIAL_APPEARANCE,PALETTES}=await import(pathToFileURL(typeFilename).href);
  const {createWorld,stepWorld}=await import(pathToFileURL(simFilename).href);
  const inputs=[
    'life','brians','cyclic','wolfram','generations',
    'excitable','larger','species','oriented','margolus'
  ];
  const opts={strength:'wtf',locks:{...INITIAL_MUTATION_LOCKS},allowRestart:false};
  const originalPreset=JSON.stringify(PALETTES);
  for(const engine of inputs){
    const settings={...INITIAL_SETTINGS,engine,
      lattice:['wolfram','larger','oriented','margolus'].includes(engine)?'square':'hex'};
    for(const strength of ['gentle','weird','wtf']){
      for(const seed of [1,7,12345,99999]){
        const mutationOptions={...opts,strength};
        const first=mutateAutomatart(settings,INITIAL_APPEARANCE,mutationOptions,seed);
        const second=mutateAutomatart(settings,INITIAL_APPEARANCE,mutationOptions,seed);
        assert.deepEqual(first,second,engine+' / '+strength+' seeded mutation must replay');
        assert(!first.willRestart,engine+' / '+strength+' may not reboot a live universe');
        assert(!requiresWorldRestart(settings,first.settings));
        assert.equal(first.settings.engine,engine,'Engine lock');
        assert.equal(first.settings.seed,settings.seed,'Seed lock');
        assert(first.changes.length>=1&&first.changes.length<=
          ({gentle:2,weird:5,wtf:9})[strength],
          'Strength controls independent number of changes');
        assert(first.appearance.palette.length>=2);
        assert(first.settings.cyclicThreshold>=1&&first.settings.cyclicThreshold<=8);
        assert(first.settings.orientedMask>=1&&first.settings.orientedMask<=255);
        assert(first.settings.largeBirthMin<=first.settings.largeBirthMax);
        assert(first.settings.largeSurviveMin<=first.settings.largeSurviveMax);
        assert(first.settings.speciesCount>=2&&first.settings.speciesCount<=8);
        // No math rule rewrites merely because the universe was exported.
        const one=createWorld(first.settings),two=createWorld(first.settings);
        assert.deepEqual(stepWorld(one,first.settings).cells,stepWorld(two,first.settings).cells,
          engine+' stepping remains deterministic after mutation');
      }
    }
  }
  assert.equal(JSON.stringify(PALETTES),originalPreset,'Mutable palettes do not touch canonical presets');
  const protectedOpts={strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},allowRestart:false};
  const s={...INITIAL_SETTINGS,engine:'life',lifeRule:'highlife'};
  const protectedMutation=mutateAutomatart(s,INITIAL_APPEARANCE,protectedOpts,19022);
  assert.deepEqual(protectedMutation.settings,s,'Math lock protects all mathematical parameters');
  assert.deepEqual(protectedMutation.appearance.palette,INITIAL_APPEARANCE.palette,'Palette lock preserves every swatch');
  assert(protectedMutation.changes.length>0,'Visual mutation remains possible when locks are all enabled');
  let sawRestart=false,sawEngine=false,sawSeed=false;
  for(let seed=1;seed<=120;seed++){
    const result=mutateAutomatart(INITIAL_SETTINGS,INITIAL_APPEARANCE,
      {strength:'wtf',locks:{palette:false,rule:false,engine:false,seed:false},allowRestart:true},seed);
    if(result.willRestart)sawRestart=true;
    if(result.settings.engine!==INITIAL_SETTINGS.engine)sawEngine=true;
    if(result.settings.seed!==INITIAL_SETTINGS.seed)sawSeed=true;
    if(result.settings.engine==='margolus'){
      assert.equal(result.settings.wrap,true);
      assert.equal(result.settings.lattice,'square');
    }
  }
  assert(sawRestart&&sawEngine&&sawSeed,'Explicit unlocks allow real world changes');
  console.log('PASS: 10 engines × 3 mutation strengths × 4 seeds replay deterministically without forced restarts');
  console.log('PASS: Math / palette / engine / seed locks, optional structural resets and 31 untouched presets');
}finally{
  await Promise.all([unlink(filename).catch(()=>{}),unlink(typeFilename).catch(()=>{}),unlink(simFilename).catch(()=>{})]);
}
