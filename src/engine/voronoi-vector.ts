import type {Appearance,World} from './types';
import {voronoiPatch} from './voronoi';
import type {VoronoiPatch} from './voronoi';

export interface VoronoiPixelFace{
  readonly vertices:readonly (readonly [number,number])[];
  readonly left:number;readonly top:number;readonly right:number;readonly bottom:number;
  readonly path:Path2D|null;
}
/** Retain geometric screen paths between consecutive export frames.
 * Weak-keyed by deterministic immutable Voronoi patch, capped at TWO
 * resolutions per world. Animation frames change pigments, not geometry.
 * Browser Path2D lets the Canvas avoid thousands of path constructions
 * per frame; Node/native canvas still reuses the pixel-transformed vertices.
 */
const screenLayouts=new WeakMap<VoronoiPatch,Map<string,readonly VoronoiPixelFace[]>>();
export function voronoiPixelGeometry(
  patch:VoronoiPatch,width:number,height:number
):readonly VoronoiPixelFace[]{
  const key=width+'x'+height;
  let layouts=screenLayouts.get(patch);
  if(!layouts){layouts=new Map();screenLayouts.set(patch,layouts);}
  const cached=layouts.get(key);
  if(cached)return cached;
  const sx=width/patch.extent[0],sy=height/patch.extent[1];
  const faces=patch.cells.map(cell=>{
    const vertices=cell.polygon.map(([x,y]):readonly [number,number]=>[x*sx,y*sy]);
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const [x,y] of vertices){
      left=Math.min(left,x);top=Math.min(top,y);
      right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
    let path:Path2D|null=null;
    if(typeof Path2D!=='undefined'){
      path=new Path2D();
      path.moveTo(vertices[0][0],vertices[0][1]);
      for(let i=1;i<vertices.length;i++)path.lineTo(vertices[i][0],vertices[i][1]);
      path.closePath();
    }
    return {vertices,left,top,right,bottom,path};
  });
  if(layouts.size>=2)layouts.delete(layouts.keys().next().value!);
  layouts.set(key,faces);
  return faces;
}

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
 const sx=outputWidth/patch.extent[0];
 const geometry=voronoiPixelGeometry(patch,outputWidth,outputHeight);
 const sw=source.width;
 ctx.save();
 ctx.fillStyle='#090617';ctx.fillRect(0,0,outputWidth,outputHeight);
 ctx.imageSmoothingEnabled=appearance.skin!=='pixels'&&appearance.skin!=='glass';
 ctx.imageSmoothingQuality='high';
 ctx.lineJoin='miter';
 for(let id=0;id<patch.cells.length;id++){
  const {vertices,left,top,right,bottom,path}=geometry[id];
  if(right<=left||bottom<=top)continue;
  const cx=id%w,cy=Math.floor(id/w),offset=(cy*2*sw+cx*2)*4;
  const color:[number,number,number]=[0,0,0];
  for(const d of [0,4,sw*4,sw*4+4])
   for(let j=0;j<3;j++)color[j]+=pixels[offset+d+j]/4;
  const pigment='rgb('+color.map(z=>Math.round(z)).join(',')+')';
  if(!path){
    ctx.beginPath();
    ctx.moveTo(vertices[0][0],vertices[0][1]);
    for(let j=1;j<vertices.length;j++)ctx.lineTo(vertices[j][0],vertices[j][1]);
    ctx.closePath();
  }
  // Match edge antialias to pigment; avoid dark background gaps
  // between neighboring subpixel-aligned polygon paths.
  ctx.fillStyle=pigment;
  if(path)ctx.fill(path);else ctx.fill();
  ctx.save();
  if(path)ctx.clip(path);else ctx.clip();
  ctx.drawImage(source,cx*2,cy*2,2,2,left,top,right-left,bottom-top);
  ctx.restore();
  ctx.lineWidth=appearance.showGrid?Math.max(.7,Math.min(1.25,sx*.08)):.55;
  ctx.strokeStyle=appearance.showGrid?'rgba(255,255,255,.25)':pigment;
  if(path)ctx.stroke(path);else ctx.stroke();
 }
 ctx.restore();
}
