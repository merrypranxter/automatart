import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parsePortablePalette,paletteFromColors,automatartColorsFromPortable} from '../src/palettes/portable.ts';
const source=JSON.parse(readFileSync(new URL('../src/palettes/astral-trash-palettes.json',import.meta.url),'utf8'));
assert.equal(source.palettes.length,31);
for(const p of source.palettes){
  const encoded=paletteFromColors(p.colors,p.id,p.name,p.source);
  const decoded=parsePortablePalette(JSON.parse(JSON.stringify(encoded)));
  assert.deepEqual(automatartColorsFromPortable(decoded),p.colors.map(x=>x.toLowerCase()),p.id);
  if(p.source==='itsamoire')assert.equal(decoded.indexed.colors.length,12);
}
const original=source.palettes[0].colors;
const doc=paletteFromColors(original);
assert.throws(()=>parsePortablePalette({...doc,schema:'evil'}),/Not an Astral Trash/);
assert.throws(()=>parsePortablePalette({...doc,stops:[{at:0,hex:'#123456'},{at:0,hex:'#654321'}]}),/ordered/);
assert.throws(()=>parsePortablePalette({...doc,indexed:{colors:['bad'],ranges:[]}}),/indexed/);
console.log('Portable palette v1 import/export preserved 31 palettes, including all 26 twelve-color Moiré originals.');
