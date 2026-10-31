import {RecordStore,stateToRecords} from './cloud-records.js?v=20261031c';
import {firebaseConfig,ownerUid as configuredOwner} from './firebase-config.js?v=20261031c';
import {createFirebaseTransport} from './cloud-transport.js?v=20261031c';
import {validateBackup} from './core.js?v=20261031c';
const copy=value=>JSON.parse(JSON.stringify(value));
const checkBackup=state=>{if(!validateBackup(state))throw Error('Invalid records. Keep your original backup.');};
const recordCount=state=>1+(state.profile.training?1:0)+Object.values(state.sessions).reduce((n,days)=>n+Object.keys(days).length,0)+Object.keys(state.nutrition).length+state.measurements.length;

export function createCloudSync({initial,guestKey,onChange=()=>{},storage=globalThis.localStorage,transport=createFirebaseTransport(firebaseConfig),ownerUid=configuredOwner,isOnline=()=>globalThis.navigator?.onLine!==false,initializationTimeoutMs=10000}){
 let guest=initial(),guestError='',user=null,store=null,unsubscribe=null,epoch=0,mode='device',error='',hasServer=false,running=false,initializing=false,connected=false,initializationId=0;
 try{const saved=storage.getItem(guestKey);if(saved){guest=JSON.parse(saved);checkBackup(guest);}}catch{guest=initial();guestError='Device records could not be read. Keep your backup.';}
 const emit=()=>onChange();
 const account=()=>user&&ownerUid&&user.uid===ownerUid&&store;
 const unsaved=new Map(),cacheKey=()=>account()?`account:${user.uid}`:'device';
 const summary=()=>({mode,user:user?{...user}:null,...(account()?store.status():{pendingCount:0,conflictCount:0,lastSynced:null}),unsaved:unsaved.has(cacheKey()),error:error||guestError,online:isOnline(),hasServer,readOnly:initializing||Boolean(account()&&!hasServer&&!Object.keys(store.value.remote).length&&!store.status().pendingCount),conflicts:account()?Object.keys(store.value.conflicts).map(id=>({id,local:store.value.pending[id]?.record,remote:store.value.remote[id]})):[],guestCount:recordCount(guest)});
 const view=()=>{const retained=unsaved.get(cacheKey());return retained?copy({state:retained.state,versions:retained.versions}):account()?store.view():{state:copy(guest),versions:{}};};
 async function drain(){
  if(running||!account()||!hasServer||!isOnline()||error)return;
  const generation=epoch,activeStore=store,uid=user.uid;running=true;
  try{
   while(generation===epoch&&isOnline()){
    const next=activeStore.pending()[0];if(!next)break;const m=activeStore.begin(next.id);if(!m)break;
    try{
     const saved=await transport.write(uid,m);
     if(generation!==epoch)return;
     activeStore.ack(m,saved);emit();
    }catch(failure){
     if(generation!==epoch)return;activeStore.failed(m.id);
     if(failure.code==='ironpath/conflict'){
      const records={...activeStore.value.remote};if(failure.remote)records[m.id]=failure.remote;else delete records[m.id];
      activeStore.receive(records);emit();continue;
     }
     error='Cloud saving could not finish. Your changes remain on this device. Retry when connected.';emit();break;
    }
   }
  }finally{if(generation===epoch){running=false;emit();}}
 }
 function listen(){
  if(!account())return;unsubscribe?.();const generation=epoch,activeStore=store,uid=user.uid;
  unsubscribe=transport.listen(uid,records=>{
   if(generation!==epoch)return;
   try{activeStore.receive(records);hasServer=true;error='';mode='account';emit();void drain();}
   catch{error='Cloud records could not be validated. Your device copy has been kept. Export a backup before retrying.';emit();}
  },()=>{if(generation!==epoch)return;error='Cloud connection unavailable. Your device copy and pending changes have been kept.';emit();});
 }
 function authenticated(next){
  epoch++;unsubscribe?.();unsubscribe=null;user=next;store=null;hasServer=false;running=false;error='';initializing=false;
  if(!user)mode='device';
  else if(!ownerUid)mode='setup';
  else if(user.uid!==ownerUid)mode='blocked';
  else{
   try{store=new RecordStore({storage,key:`${guestKey}:account:${user.uid}`,initial});mode='account';listen();}
   catch{mode='error';error='The account’s device copy could not be opened. Export your current records before continuing.';}
  }
  emit();
 }
 async function initialize(){
  const attempt=++initializationId;let expired=false,timer;initializing=true;emit();
  try{
   await Promise.race([transport.init(next=>{if(attempt===initializationId&&!expired)authenticated(next);}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cloud startup timed out.')),initializationTimeoutMs);})]);
   if(attempt===initializationId&&!expired)connected=true;
  }catch{
   if(attempt!==initializationId)return;expired=true;epoch++;unsubscribe?.();unsubscribe=null;user=null;store=null;hasServer=false;running=false;connected=false;initializing=false;mode='device';error='Cloud sign-in is unavailable. Device saving still works. Try again when connected.';emit();
  }finally{clearTimeout(timer);}
 }
 const ready=Promise.resolve().then(initialize);
 const destination=()=>`${epoch}:${mode}:${user?.uid||''}`;
 const confirmDestination=expected=>{if(expected!==destination())throw Error('Your account changed. Review the destination and confirm again.');};
 const api={ready,view,summary,
  destination,
  save(next,baseline){
   checkBackup(next);
   const durableBaseline=unsaved.get(cacheKey())?.baseline||baseline;
   try{
    if(summary().readOnly)throw Error('Wait for your account records to load before editing.');
    if(account())store.edit(next,durableBaseline);
    else{storage.setItem(guestKey,JSON.stringify(next));guest=copy(next);guestError='';}
    unsaved.delete(cacheKey());emit();void drain();return true;
   }catch(failure){unsaved.set(cacheKey(),{state:copy(next),versions:copy(durableBaseline.versions),baseline:copy(durableBaseline)});emit();throw failure;}
  },
  async signIn(){await ready;if(!connected)await initialize();if(!connected)throw Error('Could not connect to Google sign-in. Please retry when connected.');await transport.signIn();},
  async signOut(){await transport.signOut();},
  migrationPreview(source=guest){
   if(!account()||!hasServer)throw Error('Connect to your approved account before importing.');
   const records=stateToRecords(source),existing=store.effective();let added=0,skipped=0;
   for(const id of Object.keys(records))existing[id]?skipped++:added++;
   return {added,skipped};
  },
  migrate(source=guest,expected=destination()){
   confirmDestination(expected);
   if(!account()||!hasServer)throw Error('Sign in to the approved account and connect before importing records.');
   stateToRecords(source);const result=store.mergeGuest(source);emit();void drain();return result;
  },
  importBackup(source,expected=destination()){
   confirmDestination(expected);
   checkBackup(source);if(account())return api.migrate(source,expected);
   api.save(source,view());return {added:recordCount(source),skipped:0};
  },
  resolve(id,choice){if(!account())return;store.resolve(id,choice);emit();void drain();},
  retry(){if(account()){error='';listen();void drain();}else if(connected)authenticated(user);else void initialize();},
  changed(){emit();if(isOnline())api.retry();}
 };
 return api;
}
