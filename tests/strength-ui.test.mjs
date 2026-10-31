import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingPanel,readTraining} from '../assets/strength-ui.js';
import {validateBackup} from '../assets/core.js';
const form=entries=>{const f=new FormData();for(const [k,v]of Object.entries(entries))f.set(k,String(v));return f;};
const fields={'training-mode':'experienced','bench-kg':'80','bench-reps':'5','bench-sets':'4','bench-date':'2026-10-25'};
test('training settings parse into numeric private values independently of nutrition age',()=>{
 const training=readTraining(form(fields));
 assert.deepEqual(training,{mode:'experienced',baselines:{bench:{kg:80,reps:5,sets:4,date:'2026-10-25'}}});
 const state={version:1,profile:{age:'',height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26',training},sessions:{},measurements:[],nutrition:{}};
 assert.equal(validateBackup(state),true);
});
test('an untouched optional baseline is omitted while a partially entered lift cannot be saved',()=>{
 assert.deepEqual(readTraining(form({'training-mode':'experienced','bench-date':'2026-10-30'})),{mode:'experienced',baselines:{}});
 assert.throws(()=>readTraining(form({'training-mode':'experienced','bench-kg':'80','bench-date':'2026-10-30'})),/complete|reps|sets/i);
 for(const changes of [{'bench-kg':'0'},{'bench-reps':'5.5'},{'bench-reps':'1'},{'bench-sets':'21'},{'bench-date':'bad-date'},{'training-mode':'unexpected'}])assert.throws(()=>readTraining(form({...fields,...changes})));
});
test('the training form restores saved fields with explicit barbell units and automatic dates',()=>{
 const html=trainingPanel({training:readTraining(form(fields))},'2026-10-30');
 assert.match(html,/<form id="training-form"/);assert.match(html,/name="bench-kg"[^>]*value="80"/);
 assert.match(html,/name="bench-date"[^>]*value="2026-10-25"/);assert.match(html,/name="squat-date"[^>]*value="2026-10-30"/);
 assert.match(html,/including the bar/);assert.doesNotMatch(html,/name="age"/);
});
test('malformed imported training data cannot inject HTML into the form',()=>{
 const html=trainingPanel({training:{mode:'experienced',baselines:{bench:{kg:'"><img src=x>',reps:5,sets:4,date:'<script>'}}}},'2026-10-30');
 assert.doesNotMatch(html,/<img|<script/);assert.match(html,/training-form/);
});
