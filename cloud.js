/* Cloud adapter. Inactive until project configuration is provided. */
(async function () {
  const status = message => { $('#cloud-status').textContent = message; };
  $('#account-open').onclick = () => $('#account').showModal();
  $('#account-close').onclick = () => $('#account').close();
  const config = window.STILL_ROOTED_CONFIG || {};
  if (!config.supabaseUrl || !config.publishableKey) {
    $('#login-send').disabled = true;
    return;
  }
  let client, user = null, queue = {}, syncRunning = false, ready = false, timer;
  const localPersist = persist;
  const blank = () => ({ day: 0, complete: {}, notes: {}, saved: [], large: false });
  const cacheKey = () => 'still-rooted-cloud-' + user.id;
  function entries(s) {
    return Object.fromEntries([
      ...Object.entries(s.notes).map(([k,v]) => ['note:'+k,v]),
      ...Object.entries(s.complete).map(([k,v]) => ['complete:'+k,!!v]),
      ...refs.map(v => ['bookmark:'+v.ref,s.saved.includes(v.ref)])
    ]);
  }
  let previous = {};
  function cache() { localStorage.setItem(cacheKey(), JSON.stringify({state,queue})); }
  function apply(key,value) {
    if (key.startsWith('note:') && typeof value==='string') state.notes[key.slice(5)] = value;
    if (key.startsWith('complete:') && typeof value==='boolean') state.complete[key.slice(9)] = value;
    if (key.startsWith('bookmark:') && typeof value==='boolean') {
      state.saved = state.saved.filter(v=>v!==key.slice(9));
      if(value) state.saved.push(key.slice(9));
    }
  }
  function repaint() { renderHome(); renderJournal(); if(!$('#explore').hidden) renderVerses(); size(); }
  persist = function () {
    if (!user) return localPersist();
    if (!ready) { status('Account is loading. Please wait before editing.'); return false; }
    try {
      const next=entries(state);
      for(const [k,v] of Object.entries(next)) if(JSON.stringify(previous[k])!==JSON.stringify(v)) queue[k]=v;
      previous=next; cache(); status('Saved on this device · syncing…');
      clearTimeout(timer); timer=setTimeout(flush,700); return true;
    } catch { status('Device storage is unavailable. Download a backup.'); return false; }
  };
  async function flush() {
    if (!user || !ready || syncRunning) return;
    syncRunning=true; const uid=user.id;
    try {
      while (Object.keys(queue).length && user?.id===uid) {
        const batch={...queue};
        const {error}=await client.from('study_entries').upsert(Object.entries(batch).map(([entry_key,value])=>({user_id:uid,entry_key,value})),{onConflict:'user_id,entry_key'});
        if(error) throw error;
        for(const [k,v] of Object.entries(batch)) if(JSON.stringify(queue[k])===JSON.stringify(v)) delete queue[k];
        cache();
      }
      status('Saved to your private cloud account.'); $('#cloud-retry').hidden=true;
    } catch { status('Cloud sync failed. Drafts are kept on this device; retry when connected.'); $('#cloud-retry').hidden=false; }
    finally { syncRunning=false; }
  }
  async function loadAccount(session) {
    if(!session) { user=null;ready=false;queue={};state=blank();try{state={...state,...JSON.parse(localStorage.getItem('still-rooted-v1')||'{}')}}catch{} repaint();status('Sign in to save across devices.');$('#sign-out').hidden=true;$('#import-local').hidden=true;$('#login-form').hidden=false;return; }
    if(user?.id===session.user.id && ready) return;
    user=session.user;ready=false;state=blank();queue={};$('#login-form').hidden=true;$('#sign-out').hidden=false;
    status('Loading your private reflections…');
    try {
      const cached=JSON.parse(localStorage.getItem(cacheKey())||'null');
      if(cached){state={...state,...cached.state};queue=cached.queue||{}}
      const {data,error}=await client.from('study_entries').select('entry_key,value').eq('user_id',user.id);
      if(error) throw error;
      for(const row of data) if(!Object.hasOwn(queue,row.entry_key)) apply(row.entry_key,row.value);
      previous=entries(state);ready=true;cache();repaint();$('#import-local').hidden=false;await flush();
    }catch { status('Could not load your cloud account. Your saved data has not been replaced. Retry sync.');$('#cloud-retry').hidden=false; }
  }
  $('#cloud-retry').onclick=async()=>{if(!ready){user=null;await loadAccount((await client.auth.getSession()).data.session)}else await flush()};
  $('#login-form').onsubmit=async event=>{
    event.preventDefault();$('#login-send').disabled=true;
    try{const {error}=await client.auth.signInWithOtp({email:$('#login-email').value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;status('Check your email for the sign-in link. Open it on this device.');}catch{status('The sign-in email could not be sent. Check the address and project email settings.');}finally{$('#login-send').disabled=false;}
  };
  $('#sign-out').onclick=async()=>{
    await flush();if(Object.keys(queue).length){status('You still have unsynced drafts. Retry sync or download a backup before signing out.');return;}
    const {error}=await client.auth.signOut();if(error){status('Sign-out failed. Please retry.');return;} await loadAccount(null);
  };
  $('#import-local').onclick=()=>{
    if(!ready)return;
    try{const local=JSON.parse(localStorage.getItem('still-rooted-v1')||'null');if(!local){status('No local study data found.');return;}
      for(const [k,v] of Object.entries(local.notes||{}))if(!Object.hasOwn(state.notes,k))state.notes[k]=v;
      for(const [k,v] of Object.entries(local.complete||{}))if(v)state.complete[k]=true;
      state.saved=[...new Set([...state.saved,...(local.saved||[])])];persist();repaint();
    }catch{status('Local notes could not be imported. Download them from the original app.');}
  };
  window.addEventListener('online',flush);
  try {
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    client=createClient(config.supabaseUrl,config.publishableKey);
    client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>loadAccount(session),0)});
    const {data,error}=await client.auth.getSession();if(error)throw error;await loadAccount(data.session);
  }catch{status('Cloud connection unavailable. Your local study remains available.');}
})();
