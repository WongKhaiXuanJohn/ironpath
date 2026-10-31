const numeric=(v,min,max)=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
export const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export function calculateNutrition(p){
  if(!numeric(p.age,18,100)||!numeric(p.height,120,230)||!numeric(p.weight,35,250)||!['male','female'].includes(p.sex)||![1.2,1.375,1.55,1.725].includes(Number(p.activity))||!['cut','maintain','gain'].includes(p.goal)||!numeric(p.scoops??0,0,10))throw Error('Enter a valid adult profile to calculate your targets.');
  const bmr=10*Number(p.weight)+6.25*Number(p.height)-5*Number(p.age)+(p.sex==='male'?5:-161);
  const maintenance=Math.round(bmr*Number(p.activity)/10)*10;
  const protein=Math.round(Number(p.weight)*2.05),fat=Math.round(Number(p.weight)*.9);
  const hasOverride=p.calorieOverride!==''&&p.calorieOverride!==null&&p.calorieOverride!==undefined;
  const calories=hasOverride?Number(p.calorieOverride):maintenance+({cut:-300,maintain:0,gain:150}[p.goal]);
  if(!numeric(calories,1200,6000)||calories<protein*4+fat*9+200)throw Error('This calorie target leaves too little room for balanced macros. Check your profile or use maintenance.');
  const carbs=Math.round((calories-protein*4-fat*9)/4),whey=Number(p.scoops??0)*24;
  return {bmr,maintenance,calories,protein,fat,carbs,whey,foodProtein:Math.max(0,protein-whey),override:hasOverride};
}
export function nextLoad(exercise,sets){
  if(exercise.muscle==='Mobility')return {kg:null,message:'Move comfortably and slowly. This is mobility practice, not a load-progression target.'};
  if(exercise.loadType==='cardio')return {kg:null,message:'Keep a conversational pace. Repeat a comfortable duration and only build it gradually when recovery is good.'};
  if(exercise.loadType!=='kg')return {kg:null,message:'Progress control and reps first; adjust assistance or load manually.'};
  const work=sets.filter(s=>s.type==='working');
  if(!work.length||work.some(s=>!s.done||!numeric(s.kg,.5,1000)||!numeric(s.reps,1,100)))return {kg:null,message:'Log and complete your working sets to see a next-session suggestion.'};
  const load=Number(work[0].kg);
  if(work.every(s=>Number(s.kg)===load&&Number(s.reps)>=exercise.max))return {kg:load+exercise.increment,message:'Rep target reached across your working sets. Consider a small increase only if the load felt controlled.'};
  return {kg:load,message:'Keep the load and build clean reps. Reduce if form breaks down or you miss minimum reps.'};
}
export function programmeWeek(start,date){if(!validDate(start)||!validDate(date))throw Error('Invalid date');return Math.min(53,Math.max(0,Math.floor((Date.parse(date)-Date.parse(start))/604800000)+1));}
export function weeklyAverage(records,date){const end=Date.parse(date),start=end-6*86400000;const recent=records.filter(r=>Date.parse(r.date)>=start&&Date.parse(r.date)<=end&&numeric(r.weight,35,250));return recent.length?recent.reduce((s,r)=>s+Number(r.weight),0)/recent.length:null;}
export function validateTraining(value){
 const map=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const keys=(v,allowed)=>Object.keys(v).every(k=>allowed.includes(k));
 if(!map(value)||!keys(value,['mode','baselines'])||!['starter','experienced'].includes(value.mode)||!map(value.baselines)||!keys(value.baselines,['bench','squat','deadlift']))return false;
 return Object.values(value.baselines).every(b=>map(b)&&keys(b,['kg','reps','sets','date'])&&Object.keys(b).length===4&&numeric(b.kg,1,1000)&&numeric(b.reps,3,12)&&Number.isInteger(Number(b.reps))&&numeric(b.sets,1,20)&&Number.isInteger(Number(b.sets))&&validDate(b.date));
}
export function validateBackup(b){
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>!['__proto__','prototype','constructor'].includes(k));
  if(!object(b)||b.version!==1||!object(b.profile)||!object(b.sessions)||!Array.isArray(b.measurements)||!object(b.nutrition))return false;
  const p=b.profile;
  if(p.training!==undefined&&!validateTraining(p.training))return false;
  if(p.age!==''){try{calculateNutrition(p);}catch{return false;}}
  else if(!numeric(p.weight,35,250)||!numeric(p.height,120,230))return false;
  if(p.start!==undefined&&!validDate(p.start))return false;
  const metrics=[['weight',35,250],['waist',30,250],['bodyfat',3,60],['muscle',1,150],['bodyProtein',1,40],['proteinMass',1,60],['metabolism',500,5000],['fatMass',1,180],['bodyWater',5,150],['bmi',10,80],['ecw',.2,.6],['inbodyScore',0,100],['visceralFat',1,50],['waistHip',.4,2]];
  if(b.measurements.some(r=>!object(r)||!validDate(r.date)||!metrics.some(([key])=>r[key]!==undefined&&r[key]!=='')||metrics.some(([key,min,max])=>r[key]!==undefined&&r[key]!==''&&!numeric(r[key],min,max))))return false;
  for(const [date,days]of Object.entries(b.sessions)){
    if(!validDate(date)||!object(days))return false;
    for(const [day,session]of Object.entries(days)){
      if(!/^[0-6]$/.test(day)||!object(session)||!object(session.exercises)||typeof session.complete!=='boolean')return false;
      for(const [id,sets]of Object.entries(session.exercises)){
        if(!/^[a-z0-9-]+$/.test(id)||!Array.isArray(sets)||sets.length>20||sets.some(s=>!object(s)||!['working','warmup'].includes(s.type)||!numeric(s.kg,0,1000)||!numeric(s.reps,0,100)||(s.rir!==undefined&&!numeric(s.rir,0,10))||typeof s.done!=='boolean'||(s.form!==undefined&&typeof s.form!=='boolean')))return false;
      }
    }
  }
  for(const [date,n]of Object.entries(b.nutrition)){if(!validDate(date)||!object(n)||!numeric(n.calories,0,10000)||!numeric(n.protein,0,600)||!numeric(n.fat,0,500)||!numeric(n.carbs,0,1500))return false;}
  return true;
}
