import {readFile} from 'node:fs/promises';
import {test,before,after,beforeEach} from 'node:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,deleteDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
import {stateToRecords} from '../../assets/cloud-records.js';
import {legacyBackup,numericStringBackup} from '../fixtures/legacy-backup.mjs';
const rules=await readFile(new URL('../../firestore.rules',import.meta.url),'utf8');
const owner=rules.match(/request.auth.uid == '([^']+)'/)?.[1]||'owner-test';
const state={version:1,profile:{age:'',height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26'},sessions:{},measurements:[],nutrition:{}};
const profile=()=>({...stateToRecords(state).profile,revision:1,mutationId:'test-write',updatedAt:serverTimestamp()});
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-ironpath',firestore:{host:'127.0.0.1',port:8086,rules}});});
beforeEach(async()=>env.clearFirestore());
after(async()=>env?.cleanup());
const ref=(uid=owner,identity=owner,id='profile')=>doc((identity?env.authenticatedContext(identity):env.unauthenticatedContext()).firestore(),`users/${uid}/records/${id}`);
test('owner can create, read and list own valid records',async()=>{
 await assertSucceeds(setDoc(ref(),profile()));await assertSucceeds(getDoc(ref()));
 await assertSucceeds(getDocs(collection(env.authenticatedContext(owner).firestore(),`users/${owner}/records`)));
});
test('anonymous and another authenticated user cannot read or write owner records',async()=>{
 await assertFails(setDoc(ref(owner,null),profile()));await assertFails(getDoc(ref(owner,null)));
 await assertFails(setDoc(ref(owner,'other-user'),profile()));await assertFails(getDoc(ref(owner,'other-user')));
});
test('another authenticated account cannot save even in its own UID path',async()=>{
 await assertFails(setDoc(ref('other-user','other-user'),profile()));await assertFails(getDocs(collection(env.authenticatedContext('other-user').firestore(),'users/other-user/records')));
 await assertFails(setDoc(ref('other-user',owner),profile()));
});
test('forged revision, unknown fields, invalid profile and forged timestamps fail',async()=>{
 await assertFails(setDoc(ref(),{...profile(),revision:2}));await assertFails(setDoc(ref(),{...profile(),extra:'unsafe'}));
 const invalid=profile();invalid.data.weight=-1;await assertFails(setDoc(ref(),invalid));
 await assertFails(setDoc(ref(),{...profile(),updatedAt:Timestamp.fromMillis(0)}));
 await assertFails(setDoc(ref(),{...profile(),data:'bad'}));
});
test('updates must advance the prior revision exactly once',async()=>{
 await assertSucceeds(setDoc(ref(),profile()));await assertFails(setDoc(ref(),profile()));
 await assertSucceeds(setDoc(ref(),{...profile(),revision:2,mutationId:'second-write'}));
 await assertFails(setDoc(ref(),{...profile(),revision:4}));
});
test('valid dated measurements work while mismatched IDs and values fail',async()=>{
 const base=stateToRecords({...state,measurements:[{date:'2026-10-30',weight:79,proteinMass:12,metabolism:1600}]})['measurement_2026-10-30'];
 const value={...base,revision:1,mutationId:'measurement-test',updatedAt:serverTimestamp()};
 await assertSucceeds(setDoc(ref(owner,owner,'measurement_2026-10-30'),value));
 await assertFails(setDoc(ref(owner,owner,'measurement_2026-10-29'),value));
 await assertFails(setDoc(ref(owner,owner,'measurement_2026-10-30'),{...value,revision:2,data:{...value.data,weight:-1}}));
});
test('physical deletes and access outside the allowed record path fail',async()=>{
 await assertSucceeds(setDoc(ref(),profile()));await assertFails(deleteDoc(ref()));
 await assertFails(setDoc(doc(env.authenticatedContext(owner).firestore(),'users/'+owner),{public:true}));
 await assertFails(setDoc(ref(),{...profile(),revision:2,deleted:true,data:null}));
});
test('full body readings, nutrition and the supported workout size are accepted',async()=>{
 const data=structuredClone(state);
 data.measurements=[{date:'2026-10-30',weight:78,waist:85,bodyfat:20,muscle:35,bodyProtein:12,proteinMass:12,metabolism:1700,fatMass:16,bodyWater:44,bmi:26,ecw:.37,inbodyScore:78,visceralFat:7,waistHip:.9}];
 data.nutrition['2026-10-30']={calories:2300,protein:160,fat:70,carbs:250};
 data.sessions['2026-10-30']={0:{complete:false,exercises:Object.fromEntries(Array.from({length:40},(_,i)=>['exercise-'+i,Array.from({length:20},()=>({type:'working',kg:20,reps:10,done:false,rir:2,form:true}))]))}};
 for(const [id,record] of Object.entries(stateToRecords(data))){
  const first={...record,revision:1,mutationId:'full-record-test',updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(ref(owner,owner,id),first));
  await assertSucceeds(setDoc(ref(owner,owner,id),{...first,revision:2,mutationId:'updated-full-record-test',updatedAt:serverTimestamp()}));
 }
});
test('supported legacy backup fixtures produce writable canonical cloud records',async()=>{
 for(const backup of [legacyBackup,numericStringBackup]){
  await env.clearFirestore();
  for(const [id,record] of Object.entries(stateToRecords(backup)))await assertSucceeds(setDoc(ref(owner,owner,id),{...record,revision:1,mutationId:'legacy-import',updatedAt:serverTimestamp()}));
 }
});
test('private training settings are accepted while malformed nested calibrations are denied',async()=>{
 const value=profile();value.data.training={mode:'experienced',baselines:{bench:{kg:80,reps:5,sets:4,date:'2026-10-25'},squat:{kg:100,reps:5,sets:4,date:'2026-10-25'},deadlift:{kg:100,reps:5,sets:4,date:'2026-10-25'}}};
 await assertSucceeds(setDoc(ref(),value));
 await assertSucceeds(setDoc(ref(),{...value,revision:2,mutationId:'updated-calibration'}));
 const invalids=[{mode:'other',baselines:{}},{mode:'experienced',baselines:{unknown:{kg:80,reps:5,sets:4,date:'2026-10-25'}}},{mode:'experienced',baselines:{bench:{kg:0,reps:5,sets:4,date:'2026-10-25'}}},{mode:'experienced',baselines:{bench:{kg:80,reps:1,sets:4,date:'2026-10-25'}}},{mode:'experienced',baselines:{bench:{kg:80,reps:5,sets:21,date:'2026-10-25'}}},{mode:'experienced',baselines:{bench:{kg:80,reps:5,sets:4}}},{mode:'experienced',baselines:{bench:{kg:80,reps:5,sets:4,date:'bad-date'}}}];
 for(const training of invalids)await assertFails(setDoc(ref(),{...value,revision:3,mutationId:'invalid-calibration',data:{...value.data,training}}));
 await assertSucceeds(setDoc(ref(),{...profile(),revision:3,mutationId:'legacy-profile'}));
});
