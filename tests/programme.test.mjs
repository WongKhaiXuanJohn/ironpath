import test from 'node:test';
import assert from 'node:assert/strict';
import {programme,volumes,programmeForSession} from '../assets/programme.js';
test('weekend sessions are distinct and add no essential core work',()=>{
 assert.equal(programme.length,7);
 assert.match(programme[5].focus,/legs/i);
 assert.match(programme[6].focus,/conditioning/i);
 const ids=i=>programme[i].exercises.map(e=>e.id);
 assert.notDeepEqual(ids(5),ids(4));assert.notDeepEqual(ids(6),ids(4));assert.notDeepEqual(ids(6),ids(5));
 assert.ok(programme[6].exercises.every(e=>e.loadType==='cardio'||e.muscle==='Mobility'));
 assert.ok(programme.slice(5).every(d=>/optional/i.test(d.tag)));
});
test('core volume totals and fixed exercise preferences remain intact',()=>{
 const counts={};for(const day of programme.slice(0,4))for(const e of day.exercises)counts[e.muscle]=(counts[e.muscle]||0)+e.sets;
 for(const [muscle,total] of volumes)assert.equal(counts[muscle],total,muscle);
 assert.deepEqual(programme[1].exercises.slice(0,3).map(e=>e.id),['squat','ohp','deadlift']);
 assert.equal(programme[0].exercises.at(-1).id,'captain');
 assert.ok(programme.flatMap(d=>d.exercises).every(e=>!/floor crunch|ab wheel|cable crunch/i.test(e.name)));
});
test('previously logged weekend workouts keep their original exercise template',()=>{
 const saved={exercises:{preacher:[{type:'working',kg:10,reps:12,done:true}]},complete:false};
 const copy=JSON.stringify(saved),legacy=programmeForSession(5,saved);
 assert.ok(legacy.archived);assert.ok(legacy.exercises.some(e=>e.id==='preacher'));
 assert.equal(programmeForSession(6,saved).day,'Sunday');
 assert.equal(JSON.stringify(saved),copy);
 assert.equal(programmeForSession(5,{exercises:{},complete:false}),programme[5]);
 assert.equal(programmeForSession(5,{exercises:{'leg-extension-sat':[]},complete:false}),programme[5]);
 assert.equal(programmeForSession(0,saved),programme[0]);
});
