import type {Appearance,SimSettings,World} from './types';
import {exportFrameLayout,renderExportFrame} from './export-frame';
import type {ExportFrameAspect,ExportFrameFit,ExportFrameLayout} from './export-frame';

export type SnapshotAspect=ExportFrameAspect;
export type SnapshotSize=720|1080|1440|2160|4320;
export interface SnapshotOptions {aspect:SnapshotAspect;shortSide:SnapshotSize;fit?:ExportFrameFit}
export const INITIAL_SNAPSHOT_OPTIONS:SnapshotOptions={aspect:'current',shortSide:1080,fit:'contain'};
export type SnapshotLayout=ExportFrameLayout;
export function snapshotLayout(s:SimSettings,options:SnapshotOptions):SnapshotLayout{
 return exportFrameLayout(s,options.shortSide,options.aspect,options.fit??'contain');
}
export function snapshotFilename(s:SimSettings,world:World,l:SnapshotLayout){
  return 'automatart-'+s.engine+'-gen'+world.generation+'-'+l.width+'x'+l.height+'.png';
}
export function renderSnapshot(canvas:HTMLCanvasElement,world:World,s:SimSettings,
  appearance:Appearance,options:SnapshotOptions):SnapshotLayout{
  const layout=snapshotLayout(s,options);
  // Shares the exact same physically faithful frame geometry as GIF/video.
  // The scratch canvas is separate so Print Shop and skins are never resized.
  renderExportFrame(canvas,document.createElement('canvas'),world,appearance,layout);
  return layout;
}
export async function snapshotPng(canvas:HTMLCanvasElement):Promise<Blob>{
  const blob=await new Promise<Blob|null>(resolve=>{
    try{canvas.toBlob(resolve,'image/png');}catch{resolve(null);}
  });
  if(!blob||blob.size<100)throw new Error('PNG encoding failed. Try a smaller snapshot size.');
  return blob;
}
