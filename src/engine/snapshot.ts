import type {Appearance,SimSettings,World} from './types';
import {renderWorld} from './render';
import {worldDimensions} from './types';

export type SnapshotAspect='current'|'square'|'portrait'|'landscape';
export type SnapshotSize=720|1080|1440|2160;
export interface SnapshotOptions {aspect:SnapshotAspect;shortSide:SnapshotSize}
export const INITIAL_SNAPSHOT_OPTIONS:SnapshotOptions={aspect:'current',shortSide:1080};
export interface SnapshotLayout {
  width:number;height:number;
  image:{x:number;y:number;width:number;height:number};
  letterboxed:boolean;
}
const even=(value:number)=>Math.max(2,2*Math.round(value/2));
export function snapshotLayout(s:SimSettings,options:SnapshotOptions):SnapshotLayout{
  const short=Math.max(720,Math.min(2160,options.shortSide));
  const [w,h]=worldDimensions(s);
  let width:number,height:number;
  switch(options.aspect){
    case 'square':width=short;height=short;break;
    case 'portrait':width=short;height=even(short*16/9);break;
    case 'landscape':width=even(short*16/9);height=short;break;
    case 'current':
    default:
      width=w>=h?even(short*w/h):short;
      height=w>=h?short:even(short*h/w);
  }
  // Fit mathematically correct artwork to any requested frame without
  // stretching it. Different ratios leave a deep-space matte, never a crop.
  const scale=Math.min(width/w,height/h);
  const targetW=Math.min(width,even(w*scale));
  const targetH=Math.min(height,even(h*scale));
  const image={x:Math.floor((width-targetW)/2),
    y:Math.floor((height-targetH)/2),width:targetW,height:targetH};
  return {width,height,image,letterboxed:targetW!==width||targetH!==height};
}
export function snapshotFilename(s:SimSettings,world:World,l:SnapshotLayout){
  return 'automatart-'+s.engine+'-gen'+world.generation+'-'+l.width+'x'+l.height+'.png';
}
export function renderSnapshot(canvas:HTMLCanvasElement,world:World,s:SimSettings,
  appearance:Appearance,options:SnapshotOptions):SnapshotLayout{
  const layout=snapshotLayout(s,options);
  canvas.width=layout.width;canvas.height=layout.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Snapshot canvas is unavailable');
  ctx.fillStyle='#090617';ctx.fillRect(0,0,layout.width,layout.height);
  const art=document.createElement('canvas');
  // The same shared rendering pipeline powers preview and all exports:
  // colors, skins, temporal history and post-processed Print Shop effects.
  renderWorld(art,world,appearance,layout.image.width,layout.image.height);
  ctx.drawImage(art,layout.image.x,layout.image.y,layout.image.width,layout.image.height);
  return layout;
}
export async function snapshotPng(canvas:HTMLCanvasElement):Promise<Blob>{
  const blob=await new Promise<Blob|null>(resolve=>{
    try{canvas.toBlob(resolve,'image/png');}catch{resolve(null);}
  });
  if(!blob||blob.size<100)throw new Error('PNG encoding failed. Try a smaller snapshot size.');
  return blob;
}
