import test from 'node:test';
import assert from 'node:assert/strict';
import {stateToRecords,recordsToState,RecordStore} from '../assets/cloud-records.js';

const initial=()=>({version:1,profile:{age:'',height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26'},sessions:{},measurements:[],nutrition:{}});
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const remote=(state,revision=1,mutationId='remote')=>Object.fromEntries(Object.entries(stateToRecords(state)).map(([id,r])=>[id,{...r,revision,mutationId}]));
let seq=0;
const store=(storage=memory(),key='owner')=>new RecordStore({storage,key,initial,uuid:()=>`change-${++seq}`});
const change=(s,fn)=>{const v=s.view(),next=structuredClone(v.state);fn(next);s.edit(next,v);return next;};

test('dated records round-trip complete workouts and archived fields',()=>{
 const data=initial();data.sessions['2026-10-30']={4:{complete:false,exercises:{preacher:[{type:'working',kg:10,reps:12,done:true,rir:2,form:true}]}}};
 data.measurements=[{date:'2026-10-30',weight:78,proteinMass:12.1,metabolism:1673}];
 data.nutrition['2026-10-30']={calories:2200,protein:160,fat:70,carbs:220};
 assert.deepEqual(recordsToState(stateToRecords(data),initial),data);
 assert.equal(Object.keys(stateToRecords(data)).length,4);
});
test('malformed cloud snapshots are rejected without replacing valid data',()=>{
 const s=store();s.receive(remote(initial()));const before=s.view();
 assert.throws(()=>s.receive({...remote(initial()),'measurement_2026-10-30':{kind:'measurement',data:{date:'2026-10-30',weight:-1},revision:1}}));
 assert.deepEqual(s.view(),before);
});
test('pending changes survive reload and do not cross account storage keys',()=>{
 const storage=memory(),s=store(storage);change(s,d=>d.profile.weight=80);
 assert.equal(store(storage).view().state.profile.weight,80);assert.equal(store(storage).status().pendingCount,1);
 assert.equal(store(storage,'other').view().state.profile.weight,78);assert.equal(store(storage,'other').status().pendingCount,0);
});
test('acknowledging an older in-flight edit retains the newer edit',()=>{
 const s=store();s.receive(remote(initial()));change(s,d=>d.profile.weight=80);const first=s.begin('profile');
 change(s,d=>d.profile.weight=81);const saved={...first.record,revision:2,mutationId:first.mutationId};
 s.receive({profile:saved});s.ack(first,saved);
 assert.equal(s.view().state.profile.weight,81);assert.equal(s.status().pendingCount,1);assert.equal(s.status().conflictCount,0);
 const second=s.begin('profile');assert.equal(second.baseRevision,2);assert.equal(second.record.data.weight,81);
 s.ack(second,{...second.record,revision:3,mutationId:second.mutationId});assert.equal(s.status().pendingCount,0);
});
test('simultaneous edits require an explicit choice and preserve unsent local data',()=>{
 const s=store();s.receive(remote(initial()));change(s,d=>d.profile.weight=80);
 const other=initial();other.profile.weight=79;s.receive(remote(other,2,'other-device'));
 assert.equal(s.view().state.profile.weight,80);assert.equal(s.status().conflictCount,1);assert.equal(s.begin('profile'),null);
 s.resolve('profile','local');assert.equal(s.begin('profile').baseRevision,2);
 s.resolve('profile','cloud');assert.equal(s.view().state.profile.weight,79);assert.equal(s.status().pendingCount,0);
});
test('a remote edit arriving during an unsaved form draft causes a conflict on submission',()=>{
 const s=store();s.receive(remote(initial()));const rendered=s.view(),draft=structuredClone(rendered.state);draft.profile.weight=80;
 const other=initial();other.profile.weight=79;s.receive(remote(other,2));s.edit(draft,rendered);
 assert.equal(s.status().conflictCount,1);assert.equal(s.view().state.profile.weight,80);
});
test('migration keeps existing cloud dates and never mutates the guest copy',()=>{
 const s=store(),cloud=initial();cloud.measurements=[{date:'2026-10-30',weight:79}];s.receive(remote(cloud));
 const guest=initial();guest.measurements=[{date:'2026-10-30',weight:80},{date:'2026-10-29',weight:81}];const before=structuredClone(guest);
 const result=s.mergeGuest(guest);assert.equal(result.added,1);assert.equal(result.skipped,2);
 assert.equal(s.view().state.measurements.find(x=>x.date==='2026-10-30').weight,79);assert.deepEqual(guest,before);
});
test('removed records become queued tombstones and disappear on other devices',()=>{
 const s=store(),data=initial();data.measurements=[{date:'2026-10-30',weight:79}];s.receive(remote(data));
 change(s,d=>d.measurements=[]);const mutation=s.begin('measurement_2026-10-30');assert.equal(mutation.record.deleted,true);
 const deleted={...mutation.record,revision:2,mutationId:mutation.mutationId};s.ack(mutation,deleted);
 const other=store();other.receive({...remote(initial()),'measurement_2026-10-30':deleted});assert.deepEqual(other.view().state.measurements,[]);
});
test('editing again after an own acknowledgement does not create a false conflict',()=>{
 const s=store();s.receive(remote(initial()));change(s,d=>d.profile.weight=80);const shown=s.view(),m=s.begin('profile');s.ack(m,{...m.record,revision:2,mutationId:m.mutationId});
 const next=structuredClone(shown.state);next.profile.weight=81;s.edit(next,shown);assert.equal(s.status().conflictCount,0);assert.equal(s.begin('profile').baseRevision,2);
});
test('an old acknowledgement cannot clear a newer remote conflict with an unsent edit',()=>{
 const s=store();s.receive(remote(initial()));change(s,d=>d.profile.weight=80);const sent=s.begin('profile');change(s,d=>d.profile.weight=81);
 const newer=initial();newer.profile.weight=79;s.receive(remote(newer,3,'newer-device'));assert.equal(s.status().conflictCount,1);
 s.ack(sent,{...sent.record,revision:2,mutationId:sent.mutationId});
 assert.equal(s.status().conflictCount,1);assert.equal(s.view().state.profile.weight,81);assert.equal(s.begin('profile'),null);
});
