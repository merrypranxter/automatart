import type { Appearance } from './types';

export function palettePhase(appearance:Appearance,generation:number,stops=appearance.palette.length):number{
  const origin=appearance.paletteOffset??0;
  const travel=generation*(appearance.paletteCycle??0);
  if(appearance.paletteMotion!=='pingpong'||stops<2)return origin+travel;
  const edge=stops-1;
  const period=edge*2;
  const position=((origin+travel)%period+period)%period;
  return position<=edge?position:period-position;
}

export function rotatedColors(colors:readonly string[],steps=1):string[]{
  if(!colors.length)return [];
  const n=((Math.floor(steps)%colors.length)+colors.length)%colors.length;
  return [...colors.slice(n),...colors.slice(0,n)];
}

export function shuffledColors(colors:readonly string[],random:()=>number=Math.random):string[]{
  const out=[...colors];
  if(out.length<2)return out;
  for(let i=out.length-1;i>0;i--){
    const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));
    [out[i],out[j]]=[out[j],out[i]];
  }
  // Avoid presenting an unchanged palette as a successful shuffle in the
  // unlikely case that the random permutation is the identity.
  if(out.every((c,i)=>c===colors[i]))return rotatedColors(out);
  return out;
}

export function randomColors(count:number,random:()=>number=Math.random):string[]{
  // Entirely new unrestricted RGB values. Maintain the existing number of
  // editable color wells (whether 6, 12, or a user's custom size).
  const length=Math.max(2,Math.min(32,Math.floor(count)||12));
  return Array.from({length},()=> '#'+
    Math.max(0,Math.min(0xffffff,Math.floor(random()*0x1000000)))
      .toString(16).padStart(6,'0'));
}
