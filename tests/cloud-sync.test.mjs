import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudSync} from '../assets/cloud-sync.js';
import {stateToRecords} from '../assets/cloud-records.js';
import {editableState} from '../assets/editable-state.js';
const initial=()=>({version:1,profile:{age:'',height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26'},sessions:{},measurements:[],nutrition:{}});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
function fakeTransport(user=null){
 const callbacks=new Map(),data={};let auth;const writes=[];
 return {writes,data,fail:false,hold:null,initCalls:0,
  async init(cb){this.initCalls++;auth=cb;cb(user);},async signIn(){user={uid:'owner',email:'owner@example.test'};auth(user);},async signOut(){user=null;auth(null);},
  changeUser(next){user=next;auth(next);},
  listen(uid,cb){callbacks.set(uid,cb);queueMicrotask(()=>cb(data[uid]||{}));return ()=>callbacks.delete(uid);},
  async write(uid,m){writes.push({uid,m});if(this.hold)await this.hold;const record={...m.record,revision:m.baseRevision+1,mutationId:m.mutationId};data[uid]??={};data[uid][m.id]=record;callbacks.get(uid)?.(data[uid]);return record;}
 };
}
const make=(options={})=>createCloudSync({initial,guestKey:'guest',ownerUid:'owner',storage:memory(),onChange:()=>{},...options});
for(const [name,change,id] of [
 ['training settings',s=>{s.profile.training={mode:'experienced',baselines:{bench:{kg:80,reps:5,sets:4,date:'2026-10-30'}}};},'training'],
 ['nutrition totals',s=>{s.nutrition['2026-10-30']={calories:2000,protein:150,fat:60,carbs:220};},'nutrition_2026-10-30'],
 ['workout rows',s=>{s.sessions['2026-10-30']={0:{complete:false,exercises:{bench:[{type:'working',kg:60,reps:6,done:true}]}}};},'session_2026-10-30_0']
])test(`the first rendered ${name} edit is written and survives an account reload`,async()=>{
 const storage=memory(),transport=fakeTransport({uid:'owner'}),sync=make({storage,transport});await sync.ready;await settle();
 const baseline=sync.view(),draft=editableState(baseline);change(draft);sync.save(draft,baseline);await settle();
 assert.deepEqual(transport.writes.map(w=>w.m.id),[id]);
 const reloaded=make({storage,transport});await reloaded.ready;await settle();assert.deepEqual(reloaded.view().state,draft);
});
test('Google sign-in never uploads guest records automatically',async()=>{
 const storage=memory(),guest=initial();guest.profile.weight=82;storage.setItem('guest',JSON.stringify(guest));const transport=fakeTransport();const s=make({storage,transport});
 await s.ready;await s.signIn();await settle();assert.equal(transport.writes.length,0);assert.equal(s.view().state.profile.weight,78);
 assert.equal(JSON.parse(storage.getItem('guest')).profile.weight,82);
 const result=s.migrate();assert.equal(result.added,1);await settle();assert.equal(transport.writes.length,1);assert.equal(s.view().state.profile.weight,82);
});
test('signing in does not register duplicate authentication listeners',async()=>{
 const transport=fakeTransport(),s=make({transport});await s.ready;await s.signIn();await settle();assert.equal(transport.initCalls,1);
});
test('offline account edits survive reload and sync after reconnecting',async()=>{
 const storage=memory(),transport=fakeTransport({uid:'owner'});let online=true;const s=make({storage,transport,isOnline:()=>online});await s.ready;await settle();
 const view=s.view();online=false;const next=structuredClone(view.state);next.profile.weight=81;s.save(next,view);await settle();assert.equal(transport.writes.length,0);
 const reloadTransport=fakeTransport({uid:'owner'}),reloaded=make({storage,transport:reloadTransport,isOnline:()=>online});await reloaded.ready;await settle();
 assert.equal(reloaded.view().state.profile.weight,81);assert.equal(reloaded.summary().pendingCount,1);
 online=true;reloaded.retry();await settle();assert.equal(reloadTransport.writes.length,1);assert.equal(reloaded.summary().pendingCount,0);
});
test('an unauthorized account never loads or writes the owner cache',async()=>{
 const storage=memory(),transport=fakeTransport({uid:'other'});const s=make({storage,transport});await s.ready;await settle();
 assert.equal(s.summary().mode,'blocked');const view=s.view(),next=structuredClone(view.state);next.profile.weight=83;s.save(next,view);await settle();assert.equal(transport.writes.length,0);assert.equal(JSON.parse(storage.getItem('guest')).profile.weight,83);
});
test('a write completing after sign-out cannot replace guest data',async()=>{
 const transport=fakeTransport({uid:'owner'}),s=make({transport});await s.ready;await settle();let release;transport.hold=new Promise(r=>release=r);
 const view=s.view(),next=structuredClone(view.state);next.profile.weight=81;s.save(next,view);await settle();await s.signOut();release();await settle();
 assert.equal(s.summary().user,null);assert.equal(s.view().state.profile.weight,78);assert.equal(transport.writes[0].uid,'owner');
});
test('SDK connection failure leaves device saving usable',async()=>{
 const transport={async init(){throw Error('network unavailable');}},s=make({transport});await s.ready;
 const view=s.view(),next=structuredClone(view.state);next.profile.weight=80;assert.equal(s.save(next,view),true);assert.equal(s.view().state.profile.weight,80);assert.equal(s.summary().mode,'device');
});
test('an unknown owner UID permits identity setup but no database access',async()=>{
 const transport=fakeTransport({uid:'owner'}),s=make({transport,ownerUid:null});await s.ready;await settle();assert.equal(s.summary().mode,'setup');assert.equal(transport.writes.length,0);assert.throws(()=>s.migrate());
});
test('storage failure retains unsaved values for display and export without claiming synced',async()=>{
 const transport=fakeTransport(),storage=memory(),s=make({transport,storage});await s.ready;const view=s.view(),next=structuredClone(view.state);next.profile.weight=84;
 storage.setItem=()=>{throw Error('Storage full');};assert.throws(()=>s.save(next,view));assert.equal(s.view().state.profile.weight,84);assert.equal(s.summary().unsaved,true);assert.equal(transport.writes.length,0);
});
for(const remoteUpdate of [false,true])test(`a later save retains earlier storage-failed changes (remote update: ${remoteUpdate})`,async()=>{
 const storage=memory(),transport=fakeTransport({uid:'owner'}),s=make({storage,transport,isOnline:()=>false});
 transport.data.owner=Object.fromEntries(Object.entries(stateToRecords(initial())).map(([id,r])=>[id,{...r,revision:1,mutationId:'initial'}]));
 await s.ready;await settle();const durable=storage.setItem,first=s.view(),next=structuredClone(first.state);next.profile.weight=84;
 storage.setItem=()=>{throw Error('Storage full');};assert.throws(()=>s.save(next,first));storage.setItem=durable;
 if(remoteUpdate){transport.data.owner.profile={...transport.data.owner.profile,data:{...initial().profile,weight:79},revision:2,mutationId:'other-device'};s.retry();await settle();}
 const shown=s.view(),later=structuredClone(shown.state);later.nutrition['2026-10-30']={calories:2200,protein:160,fat:70,carbs:220};s.save(later,shown);
 assert.equal(s.view().state.profile.weight,84);assert.equal(s.summary().pendingCount,2);assert.equal(s.summary().unsaved,false);
 assert.equal(s.summary().conflictCount,remoteUpdate?1:0);
});
test('retrying an unapproved account does not duplicate authentication listeners',async()=>{
 const transport=fakeTransport({uid:'other'}),s=make({transport});await s.ready;s.retry();await settle();assert.equal(transport.initCalls,1);
});
test('stalled startup releases device saving and ignores a late authentication callback',{timeout:300},async()=>{
 let auth;
 const transport={init(callback){auth=callback;return new Promise(()=>{});}};
 const s=make({transport,initializationTimeoutMs:20});await s.ready;
 assert.equal(s.summary().readOnly,false);const view=s.view(),next=structuredClone(view.state);next.profile.weight=85;s.save(next,view);
 auth({uid:'owner'});await settle();assert.equal(s.summary().user,null);assert.equal(s.view().state.profile.weight,85);
});
for(const signedIn of [false,true])test(`backup consent cannot switch destination after auth changes (initial account: ${signedIn})`,async()=>{
 const transport=fakeTransport(signedIn?{uid:'owner'}:null),s=make({transport});await s.ready;await settle();
 const destination=s.destination(),backup=initial();backup.profile.weight=86;
 if(signedIn)await s.signOut();else await s.signIn();await settle();
 assert.throws(()=>s.importBackup(backup,destination),/account changed/i);
 assert.equal(s.view().state.profile.weight,78);assert.equal(transport.writes.length,0);
});
test('device migration consent expires even when the same owner signs out and back in',async()=>{
 const transport=fakeTransport({uid:'owner'}),s=make({transport});await s.ready;await settle();const destination=s.destination();
 await s.signOut();await s.signIn();await settle();assert.throws(()=>s.migrate(undefined,destination),/account changed/i);assert.equal(transport.writes.length,0);
});
test('migration preview counts additions before any upload and keeps existing dates',async()=>{
 const transport=fakeTransport({uid:'owner'}),storage=memory(),guest=initial();guest.measurements=[{date:'2026-10-30',weight:80},{date:'2026-10-29',weight:81}];storage.setItem('guest',JSON.stringify(guest));
 const existing=initial();existing.measurements=[{date:'2026-10-30',weight:79}];transport.data.owner=Object.fromEntries(Object.entries(stateToRecords(existing)).map(([id,r])=>[id,{...r,revision:1,mutationId:'existing'}]));
 const s=make({transport,storage});await s.ready;await settle();assert.deepEqual(s.migrationPreview(),{added:1,skipped:2});assert.equal(transport.writes.length,0);
});
test('valid device backups with unsupported cloud fields remain available until explicit migration',async()=>{
 const storage=memory(),backup=initial();backup.profile.legacyNote='Preserve in original backup';storage.setItem('guest',JSON.stringify(backup));
 const transport=fakeTransport(),s=make({transport,storage});await s.ready;assert.equal(s.view().state.profile.legacyNote,'Preserve in original backup');
 await s.signIn();await settle();assert.throws(()=>s.migrate(),/unsupported cloud fields/);assert.equal(transport.writes.length,0);await s.signOut();assert.equal(s.view().state.profile.legacyNote,'Preserve in original backup');
});
