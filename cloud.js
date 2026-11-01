/* Private Supabase account storage. Only publishable credentials belong in config.js. */
(async function () {
  const status = message => {
    $('#cloud-status').textContent = message;
    $('#sync-indicator').textContent = message;
    window.studySaveMessage = message;
    if ($('#study').open) $('#save-status').textContent = message;
  };
  $('#account-open').onclick = () => $('#account').showModal();
  $('#account-close').onclick = () => $('#account').close();
  const config = window.STILL_ROOTED_CONFIG || {};
  $('#login-send').disabled = true;
  if (!config.supabaseUrl || !config.publishableKey) { status('Cloud setup pending · saved on this device'); return; }
  const guestPersist = persist;
  let client, user = null, queue = {}, ready = false, timer, flushPromise = null, loadPromise = null;
  const blank = () => ({day:0,complete:{},notes:{},saved:[],large:false});
  const cacheKey = id => 'still-rooted-cloud-' + id;
  let previous = {};
  function entries(s) {
    return Object.fromEntries([
      ...Object.entries(s.notes).map(([k,v])=>['note:'+k,v]),
      ...Object.entries(s.complete).map(([k,v])=>['complete:'+k,!!v]),
      ...refs.map(v=>['bookmark:'+v.ref,s.saved.includes(v.ref)])
    ]);
  }
  function apply(key,value) {
    if (/^note:[0-6]-[0-2]$/.test(key) && typeof value==='string') state.notes[key.slice(5)]=value;
    if (/^complete:[0-6]-[0-2]$/.test(key) && typeof value==='boolean') state.complete[key.slice(9)]=value;
    if(key.startsWith('bookmark:') && typeof value==='boolean' && refs.some(v=>v.ref===key.slice(9))) {
      state.saved=state.saved.filter(v=>v!==key.slice(9));if(value)state.saved.push(key.slice(9));
    }
  }
  function repaint() { renderHome();renderJournal();if(!$('#explore').hidden)renderVerses();size(); }
  function cache() { if(user)localStorage.setItem(cacheKey(user.id),JSON.stringify({state,queue})); }
  function accountControls(signedIn) {
    $('#login-form').hidden=signedIn;
    for(const id of ['#sign-out','#import-local','#cloud-refresh'])$(id).hidden=!signedIn;
  }
  persist=function() {
    if(!user){const ok=guestPersist();status(ok?'Saved on this device · sign in for cloud saving':'Could not save on this device');return ok;}
    if(!ready){status('Cloud account is loading. Please wait.');return false;}
    try {
      const next=entries(state);
      for(const [k,v] of Object.entries(next))if(JSON.stringify(previous[k])!==JSON.stringify(v))queue[k]=v;
      previous=next;cache();
      if(Object.keys(queue).length){status('Draft saved on this device · syncing…');clearTimeout(timer);timer=setTimeout(flush,700);}
      return true;
    }catch{status('Device storage unavailable · download a backup');return false;}
  };
  function flush() {
    if(flushPromise)return flushPromise;
    if(!user||!ready)return Promise.resolve();
    const uid=user.id;
    flushPromise=(async()=>{
      try {
        while(Object.keys(queue).length && user?.id===uid){
          const batch={...queue};
          const {error}=await client.from('study_entries').upsert(Object.entries(batch).map(([entry_key,value])=>({user_id:uid,entry_key,value})),{onConflict:'user_id,entry_key'});
          if(error)throw error;
          if(user?.id!==uid)return;
          for(const [k,v] of Object.entries(batch))if(JSON.stringify(queue[k])===JSON.stringify(v))delete queue[k];
          cache();
        }
        if(user?.id===uid){status('Saved to your private cloud account');$('#cloud-retry').hidden=true;}
      }catch{status('Not synced · drafts saved on this device. Retry when online.');$('#cloud-retry').hidden=false;}
    })().finally(()=>{flushPromise=null});
    return flushPromise;
  }
  async function loadAccount(session,force=false) {
    if(loadPromise){await loadPromise;return loadAccount(session,force);}
    const uid=session?.user.id;
    if(uid && user?.id===uid && ready && !force)return;
    loadPromise=(async()=>{
      clearTimeout(timer);if(flushPromise)await flushPromise;
      $('main').inert=true;
      if($('#study').open)$('#study').close();
      try {
        if(!session){
          if(user)cache();user=null;ready=false;queue={};state=blank();
          try{state={...state,...JSON.parse(localStorage.getItem('still-rooted-v1')||'{}')}}catch{}
          repaint();accountControls(false);status('Saved on this device · sign in for cloud saving');return;
        }
        user=session.user;ready=false;state=blank();queue={};accountControls(true);status('Loading your private reflections…');
        const cached=JSON.parse(localStorage.getItem(cacheKey(uid))||'null');
        if(cached){state={...state,...cached.state};queue=cached.queue||{}}
        const {data,error}=await client.from('study_entries').select('entry_key,value').eq('user_id',uid);
        if(error)throw error;
        for(const row of data)if(!Object.hasOwn(queue,row.entry_key))apply(row.entry_key,row.value);
        previous=entries(state);ready=true;cache();repaint();await flush();
      }catch{status('Cloud could not load · your saved data is unchanged. Retry sync.');$('#cloud-retry').hidden=false;if(!$('#account').open)$('#account').showModal();}
      finally{$('main').inert=!!user&&!ready;}
    })().finally(()=>{loadPromise=null});
    return loadPromise;
  }
  async function refresh(){await flush();if(Object.keys(queue).length)return;const {data,error}=await client.auth.getSession();if(error){status('Could not refresh sign-in. Please retry.');return;}await loadAccount(data.session,true);}
  $('#cloud-retry').onclick=()=>ready?flush():refresh();$('#cloud-refresh').onclick=refresh;
  $('#login-form').onsubmit=async event=>{
    event.preventDefault();$('#login-send').disabled=true;
    try{const {error}=await client.auth.signInWithOtp({email:$('#login-email').value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;status('Check your email for the sign-in link. Open it on this device.');}catch{status('Sign-in email could not be sent. Use your Supabase account email or try again later.');}finally{$('#login-send').disabled=false;}
  };
  $('#sign-out').onclick=async()=>{
    await flush();if(Object.keys(queue).length){status('Unsynced drafts remain. Retry sync before signing out.');return;}
    const {error}=await client.auth.signOut();if(error){status('Sign-out failed. Please retry.');return;}await loadAccount(null);
  };
  $('#import-local').onclick=()=>{
    if(!ready)return;
    try{const local=JSON.parse(localStorage.getItem('still-rooted-v1')||'null');if(!local){status('No local study data found in this browser.');return;}
      for(const [k,v] of Object.entries(local.notes||{}))if(!Object.hasOwn(state.notes,k))state.notes[k]=v;
      for(const [k,v] of Object.entries(local.complete||{}))if(v)state.complete[k]=true;
      state.saved=[...new Set([...state.saved,...(local.saved||[])])];persist();repaint();
    }catch{status('Could not import local notes. Download them from your original app.');}
  };
  window.addEventListener('online',()=>{if(ready)flush();else if(user)refresh()});
  window.addEventListener('beforeunload',event=>{if(Object.keys(queue).length){event.preventDefault();event.returnValue='';}});
  try{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    client=createClient(config.supabaseUrl,config.publishableKey);
    const {data,error}=await client.auth.getSession();if(error)throw error;await loadAccount(data.session);
    client.auth.onAuthStateChange((event,session)=>{if(event!=='INITIAL_SESSION')setTimeout(()=>loadAccount(session),0)});
    $('#login-send').disabled=false;
  }catch{status('Cloud unavailable · local study remains available');}
})();
