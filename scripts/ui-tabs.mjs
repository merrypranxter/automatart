// Studio-shell helper for the browser smoke tests.
// Controls now live in tab panels; only the active one is displayed. A real
// user opens the right tab before touching a control, so this wraps a
// Playwright page so every locator does the same: before an action or a
// visibility/value query, if the target sits inside a hidden tab panel, the
// panel's own tab button is clicked. Nothing is forced visible and no app
// code is bypassed; a control that is genuinely not rendered still isn't.

const ACTIONS=new Set([
  'click','dblclick','fill','press','type','check','uncheck','setChecked','selectOption',
  'focus','hover','tap','isVisible','isHidden','isEnabled','isDisabled','isChecked',
  'inputValue','innerText','textContent','getAttribute','waitFor','boundingBox','scrollIntoViewIfNeeded'
]);
// Methods that derive a new locator. getBy* excludes hidden elements, so the
// "finder" twin used to locate the tab asks for hidden ones too.
const CHAINS=new Set(['locator','first','last','nth','filter','getByRole','getByText',
  'getByLabel','getByTitle','getByPlaceholder','getByAltText','getByTestId','and','or']);

function revealFirst(els){
  const el=els[0];
  if(!el)return false;
  let changed=false;
  const panel=el.closest('[role="tabpanel"]');
  if(panel&&panel.hidden){
    const tab=document.getElementById(panel.getAttribute('aria-labelledby')||'');
    if(tab){tab.click();changed=true;}
  }
  return changed;
}

function wrap(page,real,finder){
  return new Proxy(real,{
    get(target,prop){
      const value=target[prop];
      if(typeof value!=='function')return value;
      if(CHAINS.has(prop))return (...args)=>{
        const finderArgs=prop==='getByRole'?[args[0],{...(args[1]||{}),includeHidden:true}]:args;
        return wrap(page,value.apply(target,args),finder[prop](...finderArgs));
      };
      if(ACTIONS.has(prop))return async(...args)=>{
        // One round trip; no match (not rendered) simply reveals nothing.
        const changed=await finder.evaluateAll(revealFirst).catch(()=>false);
        // Let React commit the newly selected panel before querying it.
        if(changed)await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));
        return value.apply(target,args);
      };
      return value.bind(target);
    }
  });
}

export function withAutoTabs(page){
  return new Proxy(page,{
    get(target,prop){
      const value=target[prop];
      if(typeof value!=='function')return value;
      if(CHAINS.has(prop))return (...args)=>{
        const finderArgs=prop==='getByRole'?[args[0],{...(args[1]||{}),includeHidden:true}]:args;
        return wrap(target,value.apply(target,args),target[prop](...finderArgs));
      };
      return value.bind(target);
    }
  });
}

/** Explicitly open a tab by its id (world, rules, paint, …, export). */
export async function openTab(page,id){
  await page.locator('#tab-'+id).click();
  if(await page.locator('#tab-'+id).getAttribute('aria-selected')!=='true')
    throw Error('Tab '+id+' did not open');
}
