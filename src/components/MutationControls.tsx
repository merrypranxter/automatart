import type {MutationLocks,MutationOptions,MutationStrength} from '../engine/mutation-automatart';

type Props={
  strength:MutationStrength;
  setStrength:(v:MutationStrength)=>void;
  locks:MutationLocks;
  setLocks:(v:MutationLocks)=>void;
  allowRestart:boolean;
  setAllowRestart:(v:boolean)=>void;
  mutate:()=>void;
  undo:()=>void;
  canUndo:boolean;
  disabled:boolean;
  lastMutation:{seed:number;changes:string[];willRestart:boolean}|null;
};
const LABELS:{key:keyof MutationLocks;text:string}[]=[
  {key:'palette',text:'COLOR PALETTE'},
  {key:'rule',text:'MATH / RULES'},
  {key:'engine',text:'ENGINE'},
  {key:'seed',text:'STARTING SEED'}
];
export default function MutationControls(p:Props){
  const opts:MutationOptions={strength:p.strength,locks:p.locks,allowRestart:p.allowRestart};
  const blocked=opts.locks.engine&&opts.locks.seed;
  return <div className="mutation-lab" aria-label="Funhouse mutation dice">
    <div className="mutation-header"><span>F2 · MUTATION DICE</span><span>RULE-SAFE CHAOS</span></div>
    <p>Mutate this exact universe. Each throw scrambles a handful of <strong>compatible</strong> mathematical and visual parameters, not random nonsense that breaks the engines.</p>
    <label className="input-label" htmlFor="mutation-strength">HOW VIOLENTLY?</label>
    <select id="mutation-strength" value={p.strength} onChange={e=>p.setStrength(e.target.value as MutationStrength)}>
      <option value="gentle">GENTLE · 2 PARAMETER MUTATIONS</option>
      <option value="weird">WEIRD · 5 PARAMETER MUTATIONS</option>
      <option value="wtf">WHAT THE FUCK · 9 PARAMETER MUTATIONS</option>
    </select>
    <div className="mutation-lock-grid" aria-label="Mutation setting locks">
      {LABELS.map(item=><label key={item.key} className="mutation-lock">
        <input type="checkbox" aria-label={'Lock '+item.text} checked={p.locks[item.key]}
          onChange={e=>p.setLocks({...p.locks,[item.key]:e.target.checked})}/>
        <span aria-hidden="true">{p.locks[item.key]?'🔒':'🔓'}</span>
        <span>{item.text}</span>
      </label>)}
    </div>
    <label className="mutation-restart">
      <input type="checkbox" checked={p.allowRestart} onChange={e=>p.setAllowRestart(e.target.checked)}
        aria-label="Allow mutations to restart the universe"/>
      <span>ALLOW UNIVERSE RESTARTS</span>
    </label>
    <p className="mutation-explain">{p.allowRestart?
      (blocked?
        'Restart is permitted, but engine and seed are locked. Unlock the relevant setting if you want a different world.':
        '⚠ Engine, seed, starting pattern and certain state-count changes may restart the simulation at generation zero.'):
      'LIVE MUTATION · No new seed, no world reset. Mathematical rule changes apply to the current running cells.'}</p>
    <div className="mutation-buttons">
      <button type="button" id="mutation-throw" disabled={p.disabled} onClick={p.mutate}>🎲 FUCK IT UP</button>
      <button type="button" id="mutation-undo" disabled={p.disabled||!p.canUndo} onClick={p.undo}>↶ UNDO</button>
    </div>
    {p.lastMutation&&<div className="mutation-result" role="status">
      <strong>LAST ROLL · SEED {p.lastMutation.seed}</strong>
      <span>{p.lastMutation.willRestart?'Universe reseeded as authorized · ':'Live cells preserved · '}
        {p.lastMutation.changes.join(' · ')}</span>
      <small>Save a JSON recipe to preserve these exact mutated settings and this roll's seed.</small>
    </div>}
  </div>;
}
