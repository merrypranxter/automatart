import type {Appearance,World} from './types';
import {voronoiPatch} from './voronoi';

/** Draw genuine Voronoi convex polygons at the FINAL pixel resolution.
 * No huge 2160p CPU index map is allocated. Each face has the actual
 * rendered 2×2 skin/color material clipped into its true polygon boundaries.
 * This is used for PNG, GIF and video, never for lightweight live previews.
 */
export function renderVoronoiVector(
 ctx:CanvasRenderingContext2D,source:HTMLCanvasElement,
 pixels:Uint8ClampedArray,world:World,appearance:Appearance,
 outputWidth:number,outputHeight:number
):void{
 const w=world.width,patch=voronoiPatch(w,world.height,world.voronoiSeed??1,world.voronoiJitter??.34);
 const sx=outputWidth/patch.extent[0],sy=outputHeight/patch.extent[1];
 const sw=source.width;
 ctx.save();
 ctx.fillStyle='#090617';ctx.fillRect(0,0,outputWidth,outputHeight);
 ctx.imageSmoothingEnabled=appearance.skin!=='pixels'&&appearance.skin!=='glass';
 ctx.imageSmoothingQuality='high';
 ctx.lineJoin='miter';
 for(let id=0;id<patch.cells.length;id++){
  const vertices=patch.cells[id].polygon.map(([x,y])=>[x*sx,y*sy] as const);
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const [x,y] of vertices){
   left=Math.min(left,x);top=Math.min(top,y);
   right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  if(right<=left||bottom<=top)continue;
  const cx=id%w,cy=Math.floor(id/w),offset=(cy*2*sw+cx*2)*4;
  const color:[number,number,number]=[0,0,0];
  for(const d of [0,4,sw*4,sw*4+4])
   for(let j=0;j<3;j++)color[j]+=pixels[offset+d+j]/4;
  const pigment='rgb('+color.map(z=>Math.round(z)).join(',')+')';
  ctx.beginPath();
  ctx.moveTo(vertices[0][0],vertices[0][1]);
  for(let j=1;j<vertices.length;j++)ctx.lineTo(vertices[j][0],vertices[j][1]);
  ctx.closePath();
  // Match edge antialias to pigment; avoid dark background gaps
  // between neighboring subpixel-aligned polygon paths.
  ctx.fillStyle=pigment;
  ctx.fill();
  ctx.save();ctx.clip();
  ctx.drawImage(source,cx*2,cy*2,2,2,left,top,right-left,bottom-top);
  ctx.restore();
  ctx.lineWidth=appearance.showGrid?Math.max(.7,Math.min(1.25,sx*.08)):.55;
  ctx.strokeStyle=appearance.showGrid?'rgba(255,255,255,.25)':pigment;
  ctx.stroke();
 }
 ctx.restore();
}
