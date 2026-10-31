import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudSync} from '../assets/cloud-sync.js';
import {stateToRecords} from '../assets/cloud-records.js';
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
