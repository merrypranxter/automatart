// Portable mutation primitives: no React, renderer or CA assumptions.
// Future math-art instruments can reuse this module with their own adapters.
export interface MutationRng {
  float():number;
  int(min:number,max:number):number;
  chance(probability:number):boolean;
  pick<T>(values:readonly T[]):T;
}
export function createMutationRng(seed:number):MutationRng{
  let state=(seed>>>0)||0x6d2b79f5;
  function float(){
    state=(state+0x6D2B79F5)|0;
    let t=Math.imul(state^(state>>>15),1|state);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  }
  return {
    float,
    int:(min,max)=>Math.floor(float()*(max-min+1))+min,
    chance:p=>float()<p,
    pick:<T>(values:readonly T[]):T=>{
      if(!values.length)throw new Error('Cannot pick from empty mutation set');
      return values[Math.floor(float()*values.length)];
    }
  };
}
export function clampMutation(value:number,min:number,max:number,precision=2):number{
  return Number(Math.min(max,Math.max(min,value)).toFixed(precision));
}
export function jitterMutation(rng:MutationRng,value:number,step:number,min:number,max:number,precision=2){
  const direction=rng.chance(.5)?1:-1;
  return clampMutation(value+direction*step*(.4+rng.float()*1.2),min,max,precision);
}
export function distinctMutation<T>(rng:MutationRng,choices:readonly T[],current:T):T{
  const alternatives=choices.filter(v=>v!==current);
  return rng.pick(alternatives.length?alternatives:choices);
}
