import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const path='src/palettes/astral-trash-palettes.json';
const data=JSON.parse(readFileSync(path,'utf8'));
assert.equal(data.schema,'astral-trash/palette-library/v1');
assert.equal(data.palettes.length,31,'26 Moire + 5 Automatart palettes');
const moire=data.palettes.filter(p=>p.source==='itsamoire');
const original=data.palettes.filter(p=>p.source==='automatart');
assert.equal(moire.length,26);
assert.equal(original.length,5);
assert(new Set(data.palettes.map(p=>p.id)).size===31,'IDs must be unique');
assert(new Set(data.palettes.map(p=>p.name.toUpperCase())).size===31,'UI labels must be unique');
for(const p of moire)assert.equal(p.colors.length,12,p.name+' must keep all 12 original stops');
for(const p of original)assert.equal(p.colors.length,6,p.name+' must keep all 6 original stops');
for(const p of data.palettes){
  for(const color of p.colors)assert(/^#[0-9a-f]{6}$/i.test(color),p.name+' has invalid color '+color);
}
console.log('PASS: 31 named palettes, including 26 intact 12-stop Moire originals and 5 Automatart originals');
