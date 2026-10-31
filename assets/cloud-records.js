import {validateBackup,validDate} from './core.js?v=20261031c';

const copy=value=>JSON.parse(JSON.stringify(value));
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const stable=value=>JSON.stringify(value,(_,v)=>plain(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const same=(a,b)=>stable(a)===stable(b);
const content=r=>r?{kind:r.kind,date:r.date,day:r.day,data:r.data,deleted:r.deleted}:null;
const profileKeys=['age','height','weight','sex','activity','goal','scoops','calorieOverride','start','training'];
const measurementKeys=['date','weight','waist','bodyfat','muscle','bodyProtein','proteinMass','metabolism','fatMass','bodyWater','bmi','ecw','inbodyScore','visceralFat','waistHip'];
function canonicalState(state){
 if(!validateBackup(state))throw Error('Invalid records. Export a valid backup before trying again.');
 const next=copy(state),supported=(value,keys)=>{
  if(Object.keys(value).some(key=>!keys.includes(key)))throw Error('This backup contains unsupported cloud fields. Keep the original backup.');
 };
 const p=next.profile;supported(p,profileKeys);
 const defaults={sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26'};
 for(const [key,value]of Object.entries(defaults))if(p[key]===undefined||key==='calorieOverride'&&p[key]===null)p[key]=value;
 for(const key of ['age','height','weight','activity','scoops','calorieOverride'])if(p[key]!=='')p[key]=Number(p[key]);
 if(p.training)for(const baseline of Object.values(p.training.baselines))for(const key of ['kg','reps','sets'])baseline[key]=Number(baseline[key]);
 if(!['male','female'].includes(p.sex)||![1.2,1.375,1.55,1.725].includes(p.activity)||!['cut','maintain','gain'].includes(p.goal)||!Number.isFinite(p.scoops)||p.scoops<0||p.scoops>10||p.calorieOverride!==''&&(!Number.isFinite(p.calorieOverride)||p.calorieOverride<1200||p.calorieOverride>6000))throw Error('This profile contains unsupported cloud values. Check your profile before uploading.');
 for(const days of Object.values(next.sessions))for(const session of Object.values(days)){
  supported(session,['complete','exercises']);
  if(Object.keys(session.exercises).length>40)throw Error('Cloud workouts support up to 40 exercises per session. Keep the original backup.');
  for(const sets of Object.values(session.exercises))for(const set of sets)for(const key of ['kg','reps','rir'])if(set[key]!==undefined)set[key]=Number(set[key]);
 }
 for(const reading of next.measurements){supported(reading,measurementKeys);for(const key of Object.keys(reading))if(key!=='date'&&reading[key]!=='')reading[key]=Number(reading[key]);}
 for(const totals of Object.values(next.nutrition)){supported(totals,['calories','protein','fat','carbs']);for(const key of Object.keys(totals))totals[key]=Number(totals[key]);}
 if(!validateBackup(next))throw Error('This backup contains unsupported cloud values. Keep the original backup.');
 return next;
}
function metadata(id){
 if(id==='profile')return {kind:'profile',date:'',day:-1};
 const match=/^(session|nutrition|measurement)_(\d{4}-\d{2}-\d{2})(?:_([0-6]))?$/.exec(id);
 if(!match||!validDate(match[2])||(match[1]==='session')!==(match[3]!==undefined))throw Error('Unrecognized cloud record.');
 return {kind:match[1],date:match[2],day:match[3]===undefined?-1:Number(match[3])};
}
const record=(id,data,deleted=false)=>({schema:1,...metadata(id),data:deleted?null:copy(data),deleted,revision:0,mutationId:''});
export function stateToRecords(state){
 state=canonicalState(state);
 const records={profile:record('profile',state.profile)};
 for(const [date,days]of Object.entries(state.sessions))for(const [day,value]of Object.entries(days)){const id=`session_${date}_${day}`;records[id]=record(id,value);}
 for(const [date,value]of Object.entries(state.nutrition)){const id=`nutrition_${date}`;records[id]=record(id,value);}
 for(const value of state.measurements){const id=`measurement_${value.date}`;records[id]=record(id,value);}
 return records;
}
function validateRecord(id,r,initial){
 const meta=metadata(id);
 if(!plain(r)||Object.keys(r).some(k=>!['schema','kind','date','day','data','deleted','revision','mutationId','updatedAt'].includes(k))||r.schema!==1||r.kind!==meta.kind||r.date!==meta.date||r.day!==meta.day||typeof r.deleted!=='boolean'||!Number.isSafeInteger(r.revision)||r.revision<0||typeof r.mutationId!=='string'||r.mutationId.length>128)throw Error('Invalid cloud record.');
 if(r.deleted){if(id==='profile'||r.data!==null)throw Error('Invalid deleted cloud record.');return;}
 if(!plain(r.data)||JSON.stringify(r.data).length>200000)throw Error('Invalid cloud record values.');
 const state=initial();
 if(meta.kind==='profile')state.profile=copy(r.data);
 if(meta.kind==='session')state.sessions[meta.date]={[meta.day]:copy(r.data)};
 if(meta.kind==='nutrition')state.nutrition[meta.date]=copy(r.data);
 if(meta.kind==='measurement'){if(r.data.date!==meta.date)throw Error('Cloud record date mismatch.');state.measurements=[copy(r.data)];}
 if(!validateBackup(state))throw Error('Invalid cloud record values.');
}
export function recordsToState(records,initial){
 if(!plain(records))throw Error('Invalid cloud snapshot.');
 const state=initial();
 for(const [id,r]of Object.entries(records)){
  validateRecord(id,r,initial);if(r.deleted)continue;
  if(r.kind==='profile')state.profile=copy(r.data);
  if(r.kind==='session'){state.sessions[r.date]??={};state.sessions[r.date][r.day]=copy(r.data);}
  if(r.kind==='nutrition')state.nutrition[r.date]=copy(r.data);
  if(r.kind==='measurement')state.measurements.push(copy(r.data));
 }
 state.measurements.sort((a,b)=>a.date.localeCompare(b.date));
 if(!validateBackup(state))throw Error('Invalid cloud snapshot.');
 return state;
}

export class RecordStore{
 constructor({storage,key,initial,uuid=()=>crypto.randomUUID()}){
  this.storage=storage;this.key=key;this.initial=initial;this.uuid=uuid;this.inFlight={};
  this.value={version:1,remote:{},pending:{},conflicts:{},lastSynced:null};
  const saved=storage.getItem(key);
  if(saved){
   const value=JSON.parse(saved);
   if(value.version!==1||!plain(value.remote)||!plain(value.pending)||!plain(value.conflicts))throw Error('Account cache could not be read. Keep a backup.');
   recordsToState(value.remote,initial);
   for(const [id,m]of Object.entries(value.pending)){
    validateRecord(id,m.record,initial);
    if(m.id!==id||typeof m.mutationId!=='string'||!Number.isSafeInteger(m.baseRevision)||m.baseRevision<0)throw Error('Pending account changes could not be read.');
   }
   this.value=value;recordsToState(this.effective(),initial);
  }
 }
 commit(value){this.storage.setItem(this.key,JSON.stringify(value));this.value=value;}
 effective(){return {...this.value.remote,...Object.fromEntries(Object.entries(this.value.pending).map(([id,m])=>[id,m.record]))};}
 view(){return {state:recordsToState(this.effective(),this.initial),versions:Object.fromEntries(Object.entries(this.value.remote).map(([id,r])=>[id,r.revision]))};}
 status(){return {pendingCount:Object.keys(this.value.pending).length,conflictCount:Object.keys(this.value.conflicts).length,lastSynced:this.value.lastSynced};}
 pending(){return Object.values(this.value.pending).filter(m=>!this.value.conflicts[m.id]).map(copy);}
 edit(next,view){
  const before=stateToRecords(view.state),after=stateToRecords(next),value=copy(this.value);
  for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
   if(same(content(before[id]),content(after[id])))continue;
   const desired=after[id]||record(id,null,true),current=value.remote[id],old=value.pending[id];
   const writingDifferent=this.inFlight[id]&&!same(content(this.inFlight[id].record),content(desired));
   if(same(content(desired),content(current))&&!writingDifferent){delete value.pending[id];delete value.conflicts[id];continue;}
   const baseRevision=old?old.baseRevision:(same(content(before[id]),content(current))?(current?.revision||0):(view.versions[id]||0));
   value.pending[id]={id,record:desired,baseRevision,mutationId:this.uuid()};
   if((current?.revision||0)!==baseRevision)value.conflicts[id]=true;
  }
  this.commit(value);
 }
 receive(records){
  recordsToState(records,this.initial);
  for(const r of Object.values(records))if(r.revision<1||!r.mutationId)throw Error('Invalid cloud revision.');
  const value=copy(this.value);value.remote=copy(records);
  for(const r of Object.values(value.remote))delete r.updatedAt;
  for(const [id,m]of Object.entries(value.pending)){
   const remote=value.remote[id];
   const writingDifferent=this.inFlight[id]&&!same(content(this.inFlight[id].record),content(m.record));
   if(remote&&(remote.mutationId===m.mutationId||same(content(remote),content(m.record))&&!writingDifferent)){delete value.pending[id];delete value.conflicts[id];}
   else if(remote&&this.inFlight[id]?.mutationId===remote.mutationId){m.baseRevision=remote.revision;delete value.conflicts[id];}
   else if((remote?.revision||0)!==m.baseRevision)value.conflicts[id]=true;
  }
  value.lastSynced=Date.now();this.commit(value);
 }
 begin(id){const m=this.value.pending[id];if(!m||this.value.conflicts[id])return null;this.inFlight[id]=copy(m);return copy(m);}
 ack(m,r){
  validateRecord(m.id,r,this.initial);const value=copy(this.value),existing=value.remote[m.id];
  if(!existing||existing.revision<=r.revision)value.remote[m.id]=copy(r);
  const current=value.pending[m.id];
  if(current?.mutationId===m.mutationId){delete value.pending[m.id];delete value.conflicts[m.id];}
  else if(current&&current.baseRevision===m.baseRevision&&(!existing||existing.revision<=r.revision)){current.baseRevision=r.revision;delete value.conflicts[m.id];}
  value.lastSynced=Date.now();this.commit(value);delete this.inFlight[m.id];
 }
 failed(id){delete this.inFlight[id];}
 resolve(id,choice){
  if(!['cloud','local'].includes(choice))throw Error('Choose which version to keep.');
  const value=copy(this.value);
  if(choice==='cloud')delete value.pending[id];
  else if(value.pending[id]){value.pending[id].baseRevision=value.remote[id]?.revision||0;value.pending[id].mutationId=this.uuid();}
  delete value.conflicts[id];this.commit(value);
 }
 mergeGuest(guest){
  const additions=stateToRecords(guest),effective=this.effective(),combined=copy(effective);let added=0,skipped=0;
  for(const [id,r]of Object.entries(additions)){if(effective[id]){skipped++;continue;}combined[id]=r;added++;}
  const view=this.view();this.edit(recordsToState(combined,this.initial),view);return {added,skipped};
 }
}
