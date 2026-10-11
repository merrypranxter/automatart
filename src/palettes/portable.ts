/** Astral Trash portable palette/v1 interchange. Existing rendering settings stay unchanged. */
export const PALETTE_SCHEMA='astral-trash/palette/v1' as const;
export interface PortablePalette {
  schema:typeof PALETTE_SCHEMA;version:1;id:string;name:string;source:string;
  gamut:'clip-srgb';interpolation:'srgb'|'oklab';
  stops:{at:number;hex:string}[];
  indexed:{colors:string[];ranges:{start:number;end:number;stepsPerSecond:number;direction:1|-1}[]};
}
const isObject=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const validColor=(v:unknown):v is string=>typeof v==='string'&&/^#[a-fA-F0-9]{6}$/.test(v);
export function parsePortablePalette(v:unknown):PortablePalette {
  if(!isObject(v)||v.schema!==PALETTE_SCHEMA||v.version!==1)throw new Error('Not an Astral Trash palette/v1 JSON');
  if(typeof v.id!=='string'||!/^[a-z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(v.id))throw new Error('Invalid palette identifier');
  if(typeof v.name!=='string'||!v.name.trim()||typeof v.source!=='string'||!v.source.trim())throw new Error('Missing palette name/source');
  if(v.gamut!=='clip-srgb'||(v.interpolation!=='oklab'&&v.interpolation!=='srgb'))throw new Error('Unsupported gamut/interpolation');
  if(!Array.isArray(v.stops)||v.stops.length<2||v.stops.length>32)throw new Error('Must have 2–32 color stops');
  let previous=-1;
  const stops=v.stops.map((entry:unknown)=>{
    if(!isObject(entry)||typeof entry.at!=='number'||!Number.isFinite(entry.at)||entry.at<0||entry.at>1||entry.at<=previous||!validColor(entry.hex))
      throw new Error('Invalid ordered palette stops');
    previous=entry.at;
    return {at:entry.at,hex:entry.hex.toLowerCase()};
  });
  if(stops[0].at!==0||previous!==1)throw new Error('Stops must span exactly 0 to 1');
  if(!isObject(v.indexed)||!Array.isArray(v.indexed.colors)||v.indexed.colors.length<2||v.indexed.colors.length>256||!v.indexed.colors.every(validColor))
    throw new Error('Invalid indexed palette colors');
  const colors=(v.indexed.colors as string[]).map(color=>color.toLowerCase());
  if(!Array.isArray(v.indexed.ranges))throw new Error('Invalid indexed ranges');
  const ranges=v.indexed.ranges.map((range:unknown)=>{
    if(!isObject(range)||!Number.isInteger(range.start)||!Number.isInteger(range.end)||
      (range.start as number)<0||(range.end as number)>=colors.length||
      (range.start as number)>=(range.end as number)||
      typeof range.stepsPerSecond!=='number'||!Number.isFinite(range.stepsPerSecond)||range.stepsPerSecond<0||range.stepsPerSecond>120||
      (range.direction!==1&&range.direction!==-1))throw new Error('Invalid cycling range');
    return {start:range.start as number,end:range.end as number,stepsPerSecond:range.stepsPerSecond,direction:range.direction as 1|-1};
  }).sort((a,b)=>a.start-b.start);
  if(ranges.some((range,i)=>i>0&&range.start<=ranges[i-1].end))throw new Error('Overlapping cycling ranges');
  return {schema:PALETTE_SCHEMA,version:1,id:v.id,name:v.name,source:v.source,
    gamut:'clip-srgb',interpolation:v.interpolation,stops,indexed:{colors,ranges}};
}
/** Convert the current visual treatment into portable data without modifying it. */
export function paletteFromColors(colors:string[],id='automatart/custom',name='Custom Automatart palette',source='automatart'):PortablePalette {
  if(colors.length<2||colors.length>32||!colors.every(validColor))throw new Error('Expected 2–32 #RRGGBB colors');
  return parsePortablePalette({
    schema:PALETTE_SCHEMA,version:1,id,name,source,gamut:'clip-srgb',interpolation:'srgb',
    stops:colors.map((hex,i)=>({at:i/(colors.length-1),hex})),
    indexed:{colors,ranges:[{start:0,end:colors.length-1,stepsPerSecond:6,direction:1}]}
  });
}
/** Preserve all indexed colors exactly; reject huge 256-entry UI payloads explicitly. */
export function automatartColorsFromPortable(raw:unknown):string[]{
  const palette=parsePortablePalette(raw);
  if(palette.indexed.colors.length>32)throw new Error('Automatart supports at most 32 editable colors');
  return [...palette.indexed.colors];
}
