import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateMeasurements, recommendSet, measurementFields} from '../assets/tracking.js';
import {nextLoad,validateBackup} from '../assets/core.js';
import {metricChart} from '../assets/progress-ui.js';
import {programme} from '../assets/programme.js';
const ex={id:'bench',name:'Barbell Bench Press',sets:3,min:6,max:8,trial:'40–60 kg',increment:2.5,loadType:'kg'};
const work={type:'working',kg:40,reps:8,done:true};
test('progression uses the actual selected working sets without RIR/Form',()=>{
 assert.equal(nextLoad(ex,[work,work]).kg,42.5);
 assert.equal(nextLoad(ex,[work,work,work,work,{...work,type:'warmup',kg:20}]).kg,42.5);
 assert.equal(nextLoad(ex,[work,{...work,done:false}]).kg,null);
 assert.equal(nextLoad(ex,[]).kg,null);
 assert.equal(nextLoad(ex,[work,{...work,reps:6}]).kg,40);
});
test('recommendations use prior actual sessions and never future or unfinished work',()=>{
 const sessions={'2026-10-20':{0:{exercises:{bench:[work,work]},complete:true}},'2026-10-31':{0:{exercises:{bench:[{...work,kg:100}]},complete:true}}};
 const snapshot=JSON.stringify(sessions);
 assert.equal(recommendSet(ex,sessions,'2026-10-30',0,'working').kg,42.5);
 assert.equal(recommendSet(ex,sessions,'2026-10-19',0,'working').source,'Starter example');
 assert.equal(recommendSet(ex,sessions,'2026-10-30',0,'warmup').kg,20);
 assert.equal(JSON.stringify(sessions),snapshot);
});
test('daily weekly monthly charts omit blanks and preserve real dates',()=>{
 const rows=[{date:'2026-10-01',bodyfat:20},{date:'2026-10-02',bodyfat:''},{date:'2026-10-04',bodyfat:22},{date:'2026-10-05',bodyfat:18},{date:'2026-11-01',bodyfat:16}];
 assert.equal(aggregateMeasurements(rows,'bodyfat','day','2026-10-01','2026-10-31').length,3);
 const weeks=aggregateMeasurements(rows,'bodyfat','week','2026-10-01','2026-10-31');
 assert.deepEqual(weeks.map(p=>[p.value,p.count]),[[21,2],[18,1]]);
 assert.equal(aggregateMeasurements(rows,'bodyfat','month','2026-10-01','2026-10-31')[0].value,20);
 assert.equal(aggregateMeasurements([{date:'2026-10-01',bodyfat:0}],'bodyfat','day','2026-10-01','2026-10-31').length,0);
 assert.ok(measurementFields.some(f=>f.key==='metabolism'&&f.unit==='kcal/day'));
});
test('new measurement records, weekend sessions and legacy backup fields remain valid',()=>{
 const b={version:1,profile:{age:'',height:171,weight:78,start:'2026-10-26'},sessions:{'2026-10-25':{6:{exercises:{bench:[work]},complete:false}}},measurements:[{date:'2026-10-25',weight:'',bodyfat:20,muscle:35,bodyProtein:17,metabolism:1700}],nutrition:{}};
 assert.equal(validateBackup(b),true);
 assert.equal(validateBackup({...b,measurements:[{date:'2026-10-25',weight:78,bodyfat:20}]}),true);
 assert.equal(validateBackup({...b,measurements:[{date:'2026-10-25',weight:78,metabolism:-1}]}),false);
 assert.equal(validateBackup({...b,measurements:[{date:'2026-10-25',weight:'',bodyfat:''}]}),false);
});
test('all seven programme days have finite suggestions with explicit load conventions',()=>{
 assert.equal(programme.length,7);
 for(const day of programme)for(const e of day.exercises){const r=recommendSet(e,{},'2026-10-30',0);assert.ok(Number.isFinite(r.kg));assert.ok(r.reps>0);}
 assert.match(programme[4].exercises[0].trial,/hand/);
});
test('chart handles a single reading and sparse dates without invalid SVG',()=>{
 const f=measurementFields.find(f=>f.key==='ecw');
 const one=aggregateMeasurements([{date:'2026-10-01',ecw:.367}],'ecw');
 const svg=metricChart(one,f);assert.ok(!/NaN|Infinity/.test(svg));assert.match(svg,/0\.367/);
 assert.match(metricChart([],f),/Your trend starts here/);
 const series=aggregateMeasurements([{date:'2026-01-01',metabolism:1600},{date:'2026-01-02',metabolism:1610},{date:'2026-10-30',metabolism:1650}],'metabolism');
 const chart=metricChart(series,measurementFields.find(f=>f.key==='metabolism'));assert.ok(!/NaN|Infinity/.test(chart));
});
test('week/month grouping and missing measurements never create zero averages',()=>{
 const rows=[{date:'2026-01-31',muscle:30},{date:'2026-02-01',muscle:32},{date:'2026-02-02',muscle:''},{date:'2026-02-03',weight:80}];
 assert.deepEqual(aggregateMeasurements(rows,'muscle','month').map(r=>r.value),[30,32]);
 assert.deepEqual(aggregateMeasurements(rows,'muscle','week').map(r=>r.value),[31]);
 assert.equal(aggregateMeasurements(rows,'proteinMass').length,0);
});
test('recovery cardio and mobility repeat comfortable prior work without an automatic increase',()=>{
 for(const ex of programme[6].exercises){
  const reps=Math.min(ex.max,ex.min+1),sessions={'2026-10-20':{6:{exercises:{[ex.id]:[{type:'working',kg:0,reps,done:true}]},complete:true}}};
  assert.equal(recommendSet(ex,sessions,'2026-10-30',0).reps,reps);
  assert.equal(nextLoad(ex,sessions['2026-10-20'][6].exercises[ex.id]).kg,null);
 }
});
