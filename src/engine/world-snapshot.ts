import type {SimSettings,World} from './types';
import {worldDimensions} from './types';
import {createWorld} from './sim';

interface PackedWorld {
  kind:'automatart-world-v1';
  engine:World['engine'];
  lattice:World['lattice'];
  width:number;
  height:number;
  generation:number;
  arrays:Record<'cells'|'ages'|'neighbors'|'events'|'traces'|'previousCells'|'olderCells'|'fossils',string> & {grains?:string};
}
function pack(data:Uint8Array):string{
  let string='';
  for(let i=0;i<data.length;i+=8192)string+=String.fromCharCode(...data.subarray(i,i+8192));
  return btoa(string);
}
function unpack(base64:string,expected:number):Uint8Array{
  if(typeof base64!=='string'||base64.length>Math.ceil(expected/3)*4+16)
    throw new Error('Invalid world snapshot array');
  const raw=atob(base64);
  if(raw.length!==expected)throw new Error('World snapshot array has wrong length');
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
const bytes=(view:ArrayBufferView)=>new Uint8Array(view.buffer,view.byteOffset,view.byteLength);
export function snapshotWorld(world:World):PackedWorld{
  const n=world.width*world.height;
  return {
    kind:'automatart-world-v1',engine:world.engine,lattice:world.lattice,
    width:world.width,height:world.height,generation:world.generation,
    arrays:{
      cells:pack(world.cells),ages:pack(bytes(world.ages)),
      neighbors:pack(world.neighbors),events:pack(world.events),
      traces:pack(bytes(world.traces)),
      previousCells:pack(world.previousCells??world.cells),
      olderCells:pack(world.olderCells??world.cells),
      fossils:pack(bytes(world.fossils??new Float32Array(n))),
      ...(world.engine==='sandpile'?{grains:pack(bytes(world.grains??new Uint32Array(n)))}:{})
    }
  };
}
export function restoreWorldSnapshot(value:unknown,settings:SimSettings):World{
  if(!value||typeof value!=='object')throw new Error('Missing world snapshot');
  const s=value as Partial<PackedWorld>;
  const [width,height]=worldDimensions(settings),n=width*height;
  if(s.kind!=='automatart-world-v1'||s.width!==width||s.height!==height||
    s.engine!==settings.engine||s.lattice!==settings.lattice)
    throw new Error('Snapshot is incompatible with the selected engine or lattice');
  if(!Number.isSafeInteger(s.generation)||s.generation!<0||s.generation!>1e9)
    throw new Error('Invalid snapshot generation');
  if(!s.arrays||typeof s.arrays!=='object')throw new Error('Invalid snapshot content');
  const source=s.arrays;
  const get=(name:keyof PackedWorld['arrays'],len:number)=>unpack(source[name],len);
  const getU16=(name:keyof PackedWorld['arrays'])=>
    new Uint16Array(get(name,n*2).buffer);
  const getF32=(name:keyof PackedWorld['arrays'])=>
    new Float32Array(get(name,n*4).buffer);
  const original=createWorld(settings);
  const world:World={...original,generation:s.generation!,
    cells:get('cells',n),ages:getU16('ages'),neighbors:get('neighbors',n),
    events:get('events',n),traces:getF32('traces'),
    previousCells:get('previousCells',n),olderCells:get('olderCells',n),
    fossils:getF32('fossils'),
    grains:settings.engine==='sandpile'?new Uint32Array(get('grains',n*4).buffer):undefined};
  if(settings.engine==='sandpile'){
    // Never trust stale Uint8 display proxies over canonical grain integers.
    for(let i=0;i<n;i++){
      if(world.cells[i]!==Math.min(255,world.grains![i]))
        throw new Error('Sandpile snapshot has inconsistent grain heights');
    }
  }
  // Imported binary data may not contain NaN/Infinity in history arrays.
  for(const array of [world.traces,world.fossils!]){
    for(let i=0;i<array.length;i++){
      if(!Number.isFinite(array[i]))throw new Error('Snapshot contains invalid float values');
    }
  }
  return world;
}
