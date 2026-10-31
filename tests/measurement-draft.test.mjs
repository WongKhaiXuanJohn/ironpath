import test from 'node:test';
import assert from 'node:assert/strict';
import {RecordStore,stateToRecords} from '../assets/cloud-records.js';
import {captureMeasurementDraft,measurementBaseline} from '../assets/measurement-draft.js';
import {progressView} from '../assets/progress-ui.js';
const initial=()=>({version:1,profile:{age:'',height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26'},sessions:{},measurements:[],nutrition:{}});
test('a chart render preserves a measurement draft and its pre-remote revision',()=>{
 const store=new RecordStore({storage:{getItem:()=>null,setItem:()=>{}},key:'test',initial});
 const data=initial();data.measurements=[{date:'2026-10-30',weight:78}];
 const remote=(state,revision)=>Object.fromEntries(Object.entries(stateToRecords(state)).map(([id,r])=>[id,{...r,revision,mutationId:'remote-'+revision}]));
 store.receive(remote(data,1));const date='2026-10-30';let shown=store.view();
 let draft=captureMeasurementDraft(date,{weight:'80',updateProfile:'on'},shown,null);
 const newer=structuredClone(data);newer.measurements[0].weight=79;newer.profile.weight=79;store.receive(remote(newer,2));
 // Chart controls re-render with current cloud state while retaining the existing draft.
 shown=store.view();const html=progressView({state:shown.state,today:date,date,draft,metric:'muscle',group:'week',from:date,to:date,range:'all'},{header:()=>'',panel:(_,s)=>s,empty:()=>'',dateControl:()=>''});
 assert.match(html,/<form id="measurement-form" data-dirty="true">/);assert.match(html,/name="weight"[^>]*value="80"/);assert.match(html,/name="updateProfile"[^>]*checked/);
 draft=captureMeasurementDraft(date,{weight:'81',updateProfile:'on'},shown,draft);
 const next=structuredClone(shown.state);next.measurements[0].weight=81;next.profile.weight=81;
 store.edit(next,measurementBaseline(shown,draft,true));
 assert.equal(store.status().conflictCount,2);assert.equal(store.view().state.measurements[0].weight,81);assert.equal(store.begin('measurement_'+date),null);
});
