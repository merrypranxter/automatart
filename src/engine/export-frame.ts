import {worldDimensions} from './types';
import {geometryExtent} from './topology';
import {renderWorld} from './render';
import type {AspectId,Appearance,SimSettings,World} from './types';

/** One canonical frame vocabulary shared by the world, PNG, GIF and video.
 * Reframing exports never changes the physical cellular automaton.
 */
export type ExportFrameAspect='current'|AspectId;
export type ExportFrameFit='contain'|'cover';
export const FRAME_RATIOS:Record<AspectId,readonly [number,number]>={
 square:[1,1],portrait:[9,16],landscape:[16,9],
 portrait34:[3,4],landscape43:[4,3],
 portrait45:[4,5],landscape54:[5,4],
 portrait23:[2,3],landscape32:[3,2]
};
export const FRAME_OPTIONS:readonly {value:ExportFrameAspect;label:string}[]=[
 {value:'current',label:'MATCH LIVING WORLD · ORIGINAL SHAPE'},
 {value:'square',label:'1:1 · SQUARE'},
 {value:'portrait',label:'9:16 · VERTICAL / PHONE'},
 {value:'landscape',label:'16:9 · WIDE / VIDEO'},
 {value:'portrait34',label:'3:4 · PORTRAIT'},
 {value:'landscape43',label:'4:3 · LANDSCAPE'},
 {value:'portrait45',label:'4:5 · SOCIAL PORTRAIT'},
 {value:'landscape54',label:'5:4 · LANDSCAPE'},
 {value:'portrait23',label:'2:3 · PRINT PORTRAIT'},
 {value:'landscape32',label:'3:2 · PRINT LANDSCAPE'}
];
export interface ExportFrameLayout {
 width:number;height:number;
 image:{x:number;y:number;width:number;height:number};
 letterboxed:boolean;
 cropped:boolean;
}
const even=(n:number)=>Math.max(2,2*Math.round(n/2));
function displayRatio(s:SimSettings):number{
 const [w,h]=worldDimensions(s);
 const [gx,gy]=geometryExtent(s.lattice,w,h);
 return (s.lattice==='rhombille'||s.lattice==='kagome')?gx/gy:w/h;
}
export function exportFrameLayout(
 s:SimSettings,shortSide:number,aspect:ExportFrameAspect='current',
 fit:ExportFrameFit='contain'
):ExportFrameLayout{
 if(!Number.isFinite(shortSide)||shortSide<2||shortSide>4320||
  !['contain','cover'].includes(fit)||
  (aspect!=='current'&&!Object.prototype.hasOwnProperty.call(FRAME_RATIOS,aspect)))
  throw new Error('Invalid export frame settings');
 const artRatio=displayRatio(s);
 const frameRatio=aspect==='current'?artRatio:
  FRAME_RATIOS[aspect][0]/FRAME_RATIOS[aspect][1];
 const portrait=frameRatio<1;
 const width=portrait?even(shortSide):even(shortSide*frameRatio);
 const height=portrait?even(shortSide/frameRatio):even(shortSide);
 // A real aspect-ratio composition, not a stretched image or warped CA.
 // Fit has optional matte; fill crops equally on opposite sides.
 const artScale=fit==='cover'?
  Math.max(width/artRatio,height):
  Math.min(width/artRatio,height);
 // Scale is expressed as output HEIGHT; derive width using true lattice
 // aspect. The +2 cover guard avoids one-pixel letterbox lines from rounding.
 const imageHeight=even(artScale+(fit==='cover'?2:0));
 const imageWidth=even(imageHeight*artRatio);
 // Fit may round slightly outside the frame; bound without changing ratio
 // appreciably. For cover, always ensure both dimensions cover the frame.
 let drawW=imageWidth,drawH=imageHeight;
 if(fit==='contain'){
  const k=Math.min(1,width/drawW,height/drawH);
  drawW=even(drawW*k);drawH=even(drawH*k);
  if(drawW>width)drawW=width;
  if(drawH>height)drawH=height;
 }else{
  const k=Math.max(1,width/drawW,height/drawH);
  drawW=even(drawW*k)+2;drawH=even(drawH*k)+2;
 }
 return {width,height,
  image:{x:Math.floor((width-drawW)/2),y:Math.floor((height-drawH)/2),
   width:drawW,height:drawH},
  letterboxed:drawW<width||drawH<height,
  cropped:drawW>width||drawH>height
 };
}
/** Render the real full-resolution artwork into a reused scratch canvas,
 * then frame it on the output without altering world, colors, paint or time.
 * A stable final canvas is required by browser-native video capture streams.
 */
export function renderExportFrame(
 target:HTMLCanvasElement,scratch:HTMLCanvasElement,world:World,
 a:Appearance,l:ExportFrameLayout
):void{
 if(target.width!==l.width)target.width=l.width;
 if(target.height!==l.height)target.height=l.height;
 renderWorld(scratch,world,a,l.image.width,l.image.height);
 const ctx=target.getContext('2d');
 if(!ctx)throw new Error('Export canvas unavailable');
 ctx.fillStyle='#090617';
 ctx.fillRect(0,0,l.width,l.height);
 ctx.drawImage(scratch,l.image.x,l.image.y,l.image.width,l.image.height);
}
