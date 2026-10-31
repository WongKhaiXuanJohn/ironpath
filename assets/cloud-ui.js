const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cloudStatus(s){
 if(s.unsaved)return 'Not saved · export a backup';
 if(s.readOnly)return 'Connecting your account…';
 if(s.mode!=='account')return 'Saved on this device';
 if(s.conflictCount)return 'Saved on device · review changes';
 if(!s.online)return 'Saved on device · offline';
 if(s.error)return 'Saved on device · sync paused';
 if(s.pendingCount)return `${s.pendingCount} change${s.pendingCount===1?'':'s'} waiting to sync`;
 if(!s.hasServer)return 'Connecting cloud…';
 return 'Cloud synced';
}
function recordLabel(id){if(id==='profile')return 'Your profile';const [kind,date]=id.split('_');return `${kind==='session'?'Workout':kind==='measurement'?'Body check-in':'Nutrition'} · ${date}`;}
export function cloudPanel(s){
 const account=s.mode==='account',button=(action,label,secondary=false)=>`<button type="button" class="button ${secondary?'secondary':''}" data-cloud="${action}">${label}</button>`;
 let detail='Your records currently stay in this browser. Sign in to use your private cloud account. Existing device records are uploaded only when you choose.';
 if(account)detail='Your records belong to your approved account. Changes save here first, then sync to Firebase when connected. Dates and backups work as before.';
 if(s.mode==='setup')detail='You are signed in. Private account access is still being finalized; your records remain on this device.';
 if(s.mode==='blocked')detail='This Google account is not approved for cloud saving. Your cloud records are protected. You can still use device-only saving here.';
 return `<section class="panel cloud-panel" aria-labelledby="cloud-title"><div class="panel-heading"><h2 id="cloud-title">Private cloud saving</h2><span class="tag">YOUR ACCOUNT ONLY</span></div><p class="cloud-state" role="status">${escape(cloudStatus(s))}</p><p class="note">${detail}</p>${s.user?`<p class="cloud-account">${escape(s.user.email||s.user.displayName||'Google account')}</p>`:''}${s.error?`<p class="cloud-error" role="status">${escape(s.error)}</p>`:''}<div class="cloud-actions">${s.user?button('signout','Sign out',true):button('signin','Sign in with Google')}${button('retry','Retry connection',true)}</div>${account&&s.hasServer?`<div class="cloud-migration"><h3>Bring your device records with you</h3><p class="note">Copy this browser’s saved profile and dated records into your account. Existing cloud dates are kept. Your original device copy stays available after sign-out.</p>${button('migrate','Upload this device’s records',true)}</div>`:''}${s.mode==='setup'&&s.user?`<details class="cloud-details"><summary>Account setup details</summary><p class="note">Account ID</p><code>${escape(s.user.uid)}</code></details>`:''}${s.conflicts?.length?`<div class="cloud-conflicts"><h3>Choose which changes to keep</h3><p class="note">This record changed on another device while you were editing. Your unsent version is safe here.</p>${s.conflicts.map(c=>`<article class="cloud-conflict"><strong>${escape(recordLabel(c.id))}</strong><details><summary>Compare the saved values</summary><div class="cloud-compare"><div><h4>This device</h4><pre>${escape(JSON.stringify(c.local?.data??'Removed',null,2))}</pre></div><div><h4>Cloud</h4><pre>${escape(JSON.stringify(c.remote?.data??'Removed',null,2))}</pre></div></div></details><div class="cloud-actions"><button type="button" class="button secondary" data-resolve="${escape(c.id)}" data-choice="cloud">Use cloud version</button><button type="button" class="button" data-resolve="${escape(c.id)}" data-choice="local">Keep this device’s version</button></div></article>`).join('')}</div>`:''}</section>`;
}
export function bindCloudPanel(sync,{notify,hasDraft,onRefresh}){
 const guard=()=>{if(hasDraft()){notify('Save your current form or leave it before changing accounts or importing records.');return false;}return true;};
 document.querySelectorAll('[data-cloud]').forEach(button=>button.onclick=async()=>{
  const action=button.dataset.cloud;
  if(action!=='retry'&&!guard())return;
  button.disabled=true;
  try{
   if(action==='signin')await sync.signIn();
   if(action==='signout')await sync.signOut();
   if(action==='retry')sync.retry();
   if(action==='migrate'){
    const destination=sync.destination(),preview=sync.migrationPreview();
    const dialog=document.querySelector('#cloud-dialog');dialog.returnValue='';
    dialog.querySelector('[data-migration-preview]').textContent=`${preview.added} records to add · ${preview.skipped} existing records to keep.`;
    dialog.onclose=()=>{if(dialog.returnValue!=='upload')return;try{const result=sync.migrate(undefined,destination);onRefresh();notify(`${result.added} records queued for cloud saving. ${result.skipped} existing records kept.`);}catch(e){notify(e.message);}};
    dialog.showModal();
   }
  }catch(e){notify(e.code==='auth/popup-blocked'?'Allow the Google sign-in pop-up for Ironpath, then try again.':e.code==='auth/popup-closed-by-user'?'Sign-in closed. Your records are still saved on this device.':e.message||'Could not connect. Your device records have been kept.');}
  finally{button.disabled=false;}
 });
 document.querySelectorAll('[data-resolve]').forEach(button=>button.onclick=()=>{if(!guard())return;try{sync.resolve(button.dataset.resolve,button.dataset.choice);onRefresh();}catch(e){notify(e.message);}});
}
