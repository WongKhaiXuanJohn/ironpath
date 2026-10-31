import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendSet} from '../assets/tracking.js';
import {programme} from '../assets/programme.js';
import {validateBackup} from '../assets/core.js';
import {stateToRecords,recordsToState} from '../assets/cloud-records.js';

const initial=()=>({version:1,profile:{age:'',height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26'},sessions:{},measurements:[],nutrition:{}});
const bench=programme[0].exercises[0],squat=programme[1].exercises[0],deadlift=programme[1].exercises[2];
const experienced={mode:'experienced',baselines:{}};
const baseline=(kg=80,date='2026-10-20')=>({kg,reps:5,sets:4,date});
const training={mode:'experienced',baselines:{bench:baseline(),squat:baseline(100),deadlift:baseline(100)}};
const set=(reps=6,kg=60,done=true)=>({type:'working',kg,reps,done});
const sessions=rows=>({'2026-10-25':{0:{complete:true,exercises:{bench:rows}}}});
const suggestion=(rows,index=0,count=rows.length)=>recommendSet(bench,sessions(rows),'2026-10-30',index,'working',experienced,count);

test('heavy-set calibration produces buffered working suggestions without altering actual records',()=>{
 const before=structuredClone(training);
 assert.equal(recommendSet(bench,{},'2026-10-30',0,'working',training).kg,70);
 assert.equal(recommendSet(bench,{},'2026-10-30',0,'working',training).reps,6);
 assert.equal(recommendSet(squat,{},'2026-10-30',0,'working',training).kg,90);
 assert.equal(recommendSet(deadlift,{},'2026-10-30',0,'working',training).kg,85);
 assert.match(recommendSet(bench,{},'2026-10-30',0,'working',training).source,/calibration/i);
 assert.deepEqual(training,before);
});
test('calibration date priority is respected and future information never calibrates a past workout',()=>{
 const history=sessions([set(),set(),set()]);
 const newer={mode:'experienced',baselines:{bench:baseline(80,'2026-10-28')}};
 assert.equal(recommendSet(bench,history,'2026-10-30',0,'working',newer).kg,70);
 assert.equal(recommendSet(bench,history,'2026-10-27',0,'working',newer).kg,60);
 assert.doesNotMatch(recommendSet(bench,history,'2026-10-19',0,'working',newer).source,/calibration|history/i);
});
test('experienced accessories have explicit practical trials without scaling from bench strength',()=>{
 const lateral=programme[0].exercises.find(e=>e.id==='lateral-mon');
 const result=recommendSet(lateral,{},'2026-10-30',0,'working',training);
 assert.equal(result.kg,6);assert.deepEqual(result.range,[6,8]);assert.match(result.source,/trial/i);
 assert.deepEqual(recommendSet(lateral,{},'2026-10-30',0,'working',{...training,baselines:{bench:baseline(200)}}),result);
 for(const day of programme)for(const exercise of day.exercises){
  const r=recommendSet(exercise,{},'2026-10-30',0,'working',experienced);
  assert.ok(Number.isFinite(r.kg));assert.ok(r.reps>0);
 }
 assert.equal(recommendSet(lateral,{},'2026-10-30',0).kg,4);
});
test('experienced progression adds at most one total rep across the completed working sets',()=>{
 const rows=[set(),set(),set()];
 assert.deepEqual(rows.map((_,i)=>suggestion(rows,i).reps),[7,6,6]);
 const next=[set(7),set(),set()];
 assert.deepEqual(next.map((_,i)=>suggestion(next,i).reps),[7,7,6]);
 assert.deepEqual(suggestion([set(8),set(8),set(8)]).kg,62.5);
 assert.equal(suggestion([set(8),set(8),set(8)]).reps,6);
});
test('mixed loads, incomplete work and a changed set count do not trigger blanket progression',()=>{
 const mixed=[set(8,60),set(8,50),set(8,50)];
 assert.deepEqual(mixed.map((_,i)=>suggestion(mixed,i).kg),[60,50,50]);
 assert.deepEqual(suggestion([set(6),set(6,60,false)]).reps,6);
 const top=[set(8),set(8),set(8)];
 assert.equal(suggestion(top,0,4).kg,60);assert.equal(suggestion(top,3,4).reps,6);
 assert.equal(suggestion(top,0,2).kg,60);
});
test('a completed session below the rep guide suggests a lighter trial instead of more reps at the same heavy load',()=>{
 const result=suggestion([set(4),set(4),set(4)]);
 assert.ok(result.kg<60);assert.equal(result.reps,6);assert.match(result.note,/lighter|reduce/i);
});
test('zero-load checked barbell rows do not hide earlier usable performance',()=>{
 const history={...sessions([set(),set(),set()]),'2026-10-28':{0:{complete:false,exercises:{bench:[set(6,0)]}}}};
 const result=recommendSet(bench,history,'2026-10-30',0,'working',experienced,3);
 assert.equal(result.kg,60);assert.equal(result.reps,7);assert.equal(result.date,'2026-10-25');
});
test('warm-up rows do not affect experienced working-set progression',()=>{
 const rows=[{...set(1,500),type:'warmup'},set(8),set(8),set(8)];
 assert.equal(suggestion(rows,0,3).kg,62.5);
});
test('private training settings round-trip with backups and cloud records while old profiles remain valid',()=>{
 const data=initial();assert.equal(validateBackup(data),true);data.profile.training=training;
 assert.equal(validateBackup(data),true);assert.deepEqual(recordsToState(stateToRecords(data),initial),data);
 const strings=structuredClone(data);strings.profile.training.baselines.bench.kg='80';
 assert.equal(stateToRecords(strings).profile.data.training.baselines.bench.kg,80);
});
test('invalid nested calibration values and unknown keys are rejected even with a blank profile age',()=>{
 const data=initial();
 for(const value of [null,{mode:'other',baselines:{}},{...experienced,extra:true},{mode:'experienced',baselines:{invented:baseline()}},{mode:'experienced',baselines:{bench:{...baseline(),kg:0}}},{mode:'experienced',baselines:{bench:{...baseline(),reps:1}}},{mode:'experienced',baselines:{bench:{...baseline(),sets:21}}},{mode:'experienced',baselines:{bench:{...baseline(),date:'2026-02-30'}}},{mode:'experienced',baselines:{bench:{kg:80}}}]){
  assert.equal(validateBackup({...data,profile:{...data.profile,training:value}}),false,JSON.stringify(value));
 }
});
