import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const outputs=[
  ['src/engine/printshop.ts','scripts/.print-smoke-print.mjs'],
  ['src/engine/render.ts','scripts/.print-smoke-render.mjs'],
  ['src/engine/types.ts','scripts/.print-smoke-types.mjs'],
  ['src/engine/sim.ts','scripts/.print-smoke-sim.mjs']
];
try{
  await Promise.all(outputs.map(([entryPoints,outfile])=>
    build({entryPoints:[entryPoints],outfile,platform:'node',bundle:true,format:'esm',target:'node22'})));
  const load=async index=>import(pathToFileURL(resolve(outputs[index][1])).href);
  const {INITIAL_PRINT_SHOP,PRINT_EFFECTS,reorderEffect,
    validatePrintShop,randomizePrintShop}=await load(0);
  const {renderWorld}=await load(1);
  const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(2);
  const {createWorld,stepWorld}=await load(3);
  globalThis.document={createElement(type){assert.equal(type,'canvas');return createCanvas(1,1);}};
  assert.equal(PRINT_EFFECTS.length,6,'Exactly six independent print treatments');
  const settings={...INITIAL_SETTINGS,engine:'cyclic',cellCount:48,seed:4567};
  let world=createWorld(settings);
  for(let i=0;i<6;i++)world=stepWorld(world,settings);
  const before=world.cells.slice();
  const appearance={...INITIAL_APPEARANCE,print:validatePrintShop(undefined)};
  const test=(id,extra={},w=240)=>{
    const canvas=createCanvas(1,1);
    const enabled=id===null?[]:[{id,enabled:true,amount:1}];
    renderWorld(canvas,world,{
      ...appearance,...extra,print:validatePrintShop({...INITIAL_PRINT_SHOP,...extra.print,
        enabled:extra.print?.enabled??true,effects:extra.print?.effects??enabled})
    },w,w);
    const pixels=canvas.getContext('2d').getImageData(0,0,w,w).data;
    let hash=2166136261;
    for(let i=0;i<pixels.length;i+=17){hash^=pixels[i];hash=Math.imul(hash,16777619);}
    return [hash>>>0,pixels];
  };
  const baseline=test(null,{print:{enabled:false}})[0];
  assert.equal(test('posterize',{print:{mix:0}})[0],baseline,
    'Zero global blend must preserve exact source pixels');
  assert.equal(test('posterize',{print:{enabled:false}})[0],baseline,
    'Master off must produce original pixels');
  const ids=PRINT_EFFECTS.map(e=>e.id);
  const hashes=ids.map(id=>test(id)[0]);
  assert.equal(new Set(hashes).size,6,'All six effects should look different');
  assert(hashes.every(v=>v!==baseline),'All effects should differ from source');
  for(const id of ids)assert.equal(test(id)[0],test(id)[0],id+' deterministic output');
  const fx=(ids)=>ids.map(id=>({id,enabled:true,amount:1}));
  const order1=test(null,{print:{effects:fx(['solarize','posterize'])}})[0];
  const order2=test(null,{print:{effects:fx(['posterize','solarize'])}})[0];
  assert.notEqual(order1,order2,'Print effects must execute in their listed order');
  const moved=reorderEffect({...INITIAL_PRINT_SHOP,effects:fx(['posterize','halftone'])},'halftone',-1);
  assert.equal(moved.effects[0].id,'halftone','Up/down must genuinely reorder');
  assert.notEqual(test('duotone',{print:{inkA:0,inkB:2}})[0],
    test('duotone',{print:{inkA:2,inkB:5}})[0],
    'Duotone must draw from editable palette colors');
  const randomized=randomizePrintShop(INITIAL_PRINT_SHOP,()=>.36);
  assert(randomized.enabled&&randomized.effects.some(e=>e.enabled),
    'Surprise print actually enables a treatment');
  assert.equal(validatePrintShop(undefined).enabled,false,'Old JSON recipe imports no print effects');
  const invalid=validatePrintShop({enabled:true,mix:99,posterLevels:1000,halftoneSize:-1,
    effects:[{id:'solarize',enabled:true,amount:900},{id:'bad',enabled:true,amount:1}]});
  assert.equal(invalid.mix,1);assert.equal(invalid.posterLevels,12);
  assert.equal(invalid.effects.length,6,'Bad future recipe cannot inject unexpected print shaders');
  for(const lattice of ['square','hex','triangle']){
    const ws={...settings,lattice};
    const current=createWorld(ws);
    const c=createCanvas(1,1);
    renderWorld(c,current,{...appearance,print:validatePrintShop({
      ...INITIAL_PRINT_SHOP,enabled:true,
      effects:fx(['posterize','halftone','stipple','duotone'])
    })},384,384);
    assert.equal(c.width,384,'Export output width persists under Print Shop');
    assert.equal(c.height,384,'Export output height persists under Print Shop');
  }
  const largeCanvas=createCanvas(1,1);
  renderWorld(largeCanvas,world,{...appearance,print:validatePrintShop({
    ...INITIAL_PRINT_SHOP,enabled:true,effects:fx(['xray','stipple','halftone'])
  })},900,900);
  assert.equal(largeCanvas.width,900,'HD export preserves requested dimensions');
  assert.deepEqual(world.cells,before,'All print effects are VISUAL ONLY');
  console.log('PASS: six unique post-process effects, real ordering, palette inks, capped HD output, all 3 lattices');
  console.log('PASS: Print Shop master bypass, deterministic grain, legacy recipe migration and immutable CA');
}finally{await Promise.all(outputs.map(x=>unlink(resolve(x[1])).catch(()=>{})));}
