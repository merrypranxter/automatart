/** F6F: deterministic, bounded microscopic render quality. No physics changes.
 * Work per physical polygon adapts to actual device pixel footprint and
 * cellular activity. Color-edge antialiasing needs NO additional equation
 * evaluations: it uses the already evaluated scalar tile's finite differences.
 */
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

/** Side length of the subcell tile for a physical polygon.
 * Never exceeds the fixed global-budget side from microBudget(). Sparse,
 * small or fairly uniform faces cannot waste the high-resolution allowance.
 */
export function adaptiveMicroSamples(
 cap:number,projectedWidth:number,projectedHeight:number,
 fieldGradient:number,laplacian:number,frequency:number
):number{
 if(!Number.isFinite(cap)||cap<2||
  !Number.isFinite(projectedWidth)||!Number.isFinite(projectedHeight)||
  projectedWidth<2||projectedHeight<2)return 0;
 const maxSide=Math.max(2,Math.floor(cap));
 const deviceLimit=Math.max(2,Math.ceil(Math.min(projectedWidth,projectedHeight)*1.2));
 const activity=clamp(
  (Number.isFinite(fieldGradient)?Math.abs(fieldGradient):0)*1.35+
  (Number.isFinite(laplacian)?Math.abs(laplacian):0)*1.1,0,1);
 const oscillation=clamp(Number.isFinite(frequency)?frequency/12:0,0,1);
 const desired=Math.max(2,Math.ceil(maxSide*(.60+.27*activity+.13*oscillation)));
 return Math.min(maxSide,deviceLimit,desired);
}

export interface InkEdge {offset:-1|0|1;mix:number}

/** Smooth only the immediate neighborhood of palette band boundaries.
 * Outside the transition region the pigment stays EXACTLY flat. Neighbor
 * differences are measured from samples already paid for by the work budget.
 * At a boundary each of the touching palette colors has 50% coverage.
 */
export function inkEdgeCoverage(
 band:number,neighborVariation:number,enabled:boolean
):InkEdge{
 if(!enabled||!Number.isFinite(band)||!Number.isFinite(neighborVariation))
  return {offset:0,mix:0};
 const width=clamp(Math.abs(neighborVariation)*.45,0,.46);
 if(width<.012)return {offset:0,mix:0};
 const fraction=band-Math.floor(band);
 if(fraction<width)return {offset:-1,mix:(width-fraction)/(2*width)};
 if(fraction>1-width)return {offset:1,mix:(fraction-(1-width))/(2*width)};
 return {offset:0,mix:0};
}

/** For a sampled scalar tile, estimate palette-band crossing coverage using
 * actual adjacent subcell evaluations, NOT any extra shader evaluations.
 * Border samples use the nearest available neighbor and remain deterministic.
 */
export function tileBandVariation(
 values:Float32Array,side:number,x:number,y:number
):number{
 const index=y*side+x,center=values[index];
 const left=values[y*side+Math.max(0,x-1)];
 const right=values[y*side+Math.min(side-1,x+1)];
 const top=values[Math.max(0,y-1)*side+x];
 const bottom=values[Math.min(side-1,y+1)*side+x];
 return Math.max(Math.abs(right-left),Math.abs(bottom-top),
  Math.abs(center-left),Math.abs(center-right),
  Math.abs(center-top),Math.abs(center-bottom));
}
