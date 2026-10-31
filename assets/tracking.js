import {nextLoad,validDate} from './core.js?v=20261030d';
import {experiencedRecommendation} from './strength.js?v=20261031c';
export const measurementFields=[
 {key:'weight',label:'Body weight',unit:'kg',min:35,max:250,step:.1},
 {key:'bodyfat',label:'Percent body fat (PBF)',unit:'%',min:3,max:60,step:.1},
 {key:'muscle',label:'Skeletal muscle mass (SMM)',unit:'kg',min:1,max:150,step:.1},
 {key:'proteinMass',label:'Body protein mass',unit:'kg',min:1,max:60,step:.1},
 {key:'metabolism',label:'Basal metabolism',unit:'kcal/day',min:500,max:5000,step:1},
 {key:'waist',label:'Waist',unit:'cm',min:30,max:250,step:.1},
 {key:'fatMass',label:'Body fat mass',unit:'kg',min:1,max:180,step:.1,advanced:true},
 {key:'bodyWater',label:'Total body water',unit:'L',min:5,max:150,step:.1,advanced:true},
 {key:'bmi',label:'Body mass index (BMI)',unit:'kg/m²',min:10,max:80,step:.1,advanced:true},
 {key:'ecw',label:'ECW ratio',unit:'ratio',min:.2,max:.6,step:.001,advanced:true},
 {key:'inbodyScore',label:'InBody score',unit:'points',min:0,max:100,step:1,advanced:true},
 {key:'visceralFat',label:'Visceral fat level',unit:'level',min:1,max:50,step:1,advanced:true},
 {key:'waistHip',label:'Waist–hip ratio',unit:'ratio',min:.4,max:2,step:.01,advanced:true}
];
export function aggregateMeasurements(records,key,group='day',from='0001-01-01',to='9999-12-31'){
 const field=measurementFields.find(f=>f.key===key);if(!field)return [];
 const groups=new Map();
 for(const r of [...records].sort((a,b)=>a.date.localeCompare(b.date))){
  if(!validDate(r.date)||r.date<from||r.date>to||r[key]===''||r[key]===undefined||r[key]===null)continue;
  const value=Number(r[key]);if(!Number.isFinite(value)||value<field.min||value>field.max)continue;
  let date=r.date;
  if(group==='month')date=date.slice(0,7)+'-01';
  if(group==='week'){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);date=d.toISOString().slice(0,10);}
  const entry=groups.get(date)||{date,sum:0,count:0,first:r.date,last:r.date};entry.sum+=value;entry.count++;entry.last=r.date;groups.set(date,entry);
 }
 return [...groups.values()].map(({sum,...r})=>({...r,value:sum/r.count}));
}
export function previousExercise(ex,sessions,date){
 for(const [d,days] of Object.entries(sessions).filter(([d])=>d<date).sort(([a],[b])=>b.localeCompare(a))){
  for(const s of Object.values(days)){
   const sets=s.exercises[ex.id];
   if(sets?.some(s=>s.type==='working'&&s.done&&Number(s.reps)>0&&Number.isFinite(Number(s.kg))&&(ex.loadType==='kg'?Number(s.kg)>0:Number(s.kg)>=0)))return {date:d,sets};
  }
 }
 return null;
}
export function recommendSet(ex,sessions,date,index,type='working',training,workingCount){
 if(training?.mode==='experienced')return experiencedRecommendation(ex,previousExercise(ex,sessions,date),date,index,type,training,workingCount);
 const prior=previousExercise(ex,sessions,date),work=prior?.sets.filter(s=>s.type==='working'&&s.done&&s.reps>0)||[];
 const row=work[Math.min(index,work.length-1)];
 const progression=prior?nextLoad(ex,prior.sets):null;
 const samples={'lateral-thu':4,'lateral-fri':4,preacher:10,'pushdown-fri':15,'rear-fri':4,extension:6};
 const first=Number.parseFloat(ex.trial);
 let kg=row?Number(row.kg):ex.loadType==='bodyweight'||ex.loadType==='cardio'?0:ex.loadType==='assisted'?20:Number.isFinite(first)?first:(samples[ex.id]??4);
 if(type!=='warmup'&&progression?.kg!==null&&progression?.kg!==undefined)kg=progression.kg;
 if(type==='warmup')return {kg:ex.loadType==='kg'?Math.floor(kg*.5/0.5)*.5:kg,reps:Math.min(8,ex.min),source:prior?'Warm-up example from your history':'Warm-up example',date:prior?.date};
 const easy=ex.loadType==='cardio'||ex.muscle==='Mobility';
 const reps=row&&kg===Number(row.kg)?Math.max(ex.min,Math.min(ex.max,Number(row.reps)+(easy?0:1))):ex.min;
 return {kg,reps,source:prior?'From your history':'Starter example',date:prior?.date};
}
