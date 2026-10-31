// Practical first-session trials, not predictions of personal capacity or 1RM.
export const experiencedTrials={
 bench:[50,65],squat:[70,90],deadlift:[80,100],ohp:[30,40],
 'incline-db':[20,24],'supported-row-mon':[35,50],fly:[7.5,12.5],
 'lateral-mon':[6,8],'pushdown-mon':[20,30],
 'supported-row-wed':[35,50],pulldown:[40,55],'reverse-pec':[20,30],
 'ez-curl':[20,30],hammer:[10,14],legpress:[100,160],split:[10,14],rdl:[60,75],
 'curl-tue':[25,40],'curl-thu':[25,40],'calf-tue':[40,60],'calf-thu':[30,50],
 'incline-machine':[35,50],'lateral-thu':[6,8],extension:[12,18],
 'lateral-fri':[6,8],preacher:[15,25],'pushdown-fri':[20,30],'rear-fri':[6,8],
 'leg-extension-sat':[20,35],'leg-curl-sat':[20,30],
 'seated-calf-sat':[20,35],'ab-machine-sat':[10,20]
};
const mainFactors={bench:.9,squat:.9,deadlift:.85};
const roundDown=(kg,step)=>Math.max(step,Math.floor((kg+1e-8)/step)*step);
const usable=(ex,row)=>row?.done&&Number.isFinite(Number(row.kg))&&Number(row.kg)>=0&&(ex.loadType!=='kg'||Number(row.kg)>0)&&Number(row.reps)>0;

function historySuggestion(ex,prior,index,workingCount){
 const work=prior.sets.filter(s=>s.type==='working');
 const completed=work.filter(s=>usable(ex,s));
 if(!completed.length)return null;
 const row=usable(ex,work[index])?work[index]:null;
 const kg=Number((row||completed[0]).kg);
 const reps=row?Number(row.reps):ex.min;
 const result={kg,reps,source:'From your completed session',date:prior.date};
 const easy=ex.loadType==='cardio'||ex.muscle==='Mobility';
 if(easy)return {...result,note:'Repeat a comfortable duration or movement. Recovery work does not need automatic increases.'};
 const allDone=work.length>0&&work.every(s=>usable(ex,s));
 const sameLoad=work.every(s=>Number(s.kg)===Number(work[0].kg));
 const sameCount=index<work.length&&(workingCount===undefined||workingCount===work.length);
 if(!allDone||!sameLoad||!sameCount)return {...result,note:'Repeat or calibrate these sets. Mixed loads, unfinished work or a changed set count do not trigger an automatic increase.'};
 if(work.some(s=>Number(s.reps)<ex.min)){
  return {...result,kg:ex.loadType==='kg'?roundDown(kg*.9,ex.increment):kg,reps:ex.min,note:'Try a lighter load after missing the rep guide. Build controlled reps before increasing again.'};
 }
 if(work.every(s=>Number(s.reps)>=ex.max)){
  if(ex.loadType==='kg')return {...result,kg:kg+ex.increment,reps:ex.min,note:'All working sets reached the top of the guide. Consider the smallest load increase if the sets felt controlled.'};
  return {...result,reps:ex.max,note:ex.loadType==='assisted'?'Consider slightly less assistance when every set is controlled.':'Progress control or added load manually when all sets are comfortable.'};
 }
 const lowest=Math.min(...work.map(s=>Number(s.reps)));
 const next=work.findIndex(s=>Number(s.reps)===lowest);
 return {...result,reps:index===next?Math.min(ex.max,reps+1):reps,note:'Aim for one additional rep across the whole exercise, keeping the other sets steady. It is a suggestion, not a required increase.'};
}

export function experiencedRecommendation(ex,prior,date,index,type,training,workingCount){
 const calibration=training.baselines[ex.id];
 const applies=calibration&&calibration.date<=date;
 let result;
 if(prior&&(!applies||prior.date>=calibration.date))result=historySuggestion(ex,prior,index,workingCount);
 if(!result&&applies&&mainFactors[ex.id]){
  const kg=roundDown(Number(calibration.kg)*mainFactors[ex.id],ex.increment);
  result={kg,reps:ex.min,source:'Your private calibration',date:calibration.date,note:'A buffered starting trial from your repeatable working sets, not a measured 1RM. Confirm this load with controlled reps.'};
 }
 if(!result){
  const range=experiencedTrials[ex.id];
  if(ex.loadType==='cardio'||ex.loadType==='bodyweight')result={kg:0,reps:ex.min,source:ex.muscle==='Mobility'?'Comfortable movement guide':'Starting guide'};
  else if(ex.loadType==='assisted')result={kg:20,reps:ex.min,source:'Assistance trial',range:[15,25],note:'Use the assistance needed for controlled reps. Less assistance is harder; this is not added lifting weight.'};
  else result={kg:range?.[0]??(Number.parseFloat(ex.trial)||ex.increment),reps:ex.min,source:'Experienced starting trial',...(range?{range}:{}),note:'Test the first set with controlled technique. The final reps should be challenging while leaving a little capacity. Machine and cable readings depend on the equipment.'};
 }
 if(type!=='warmup')return result;
 const factors=[.4,.6,.8],reps=[8,5,3],step=Math.min(index,2);
 return {kg:ex.loadType==='kg'?roundDown(result.kg*factors[step],ex.increment):result.kg,reps:ex.loadType==='kg'?Math.min(reps[step],ex.min):Math.min(8,ex.min),source:'Warm-up ramp example',date:result.date,note:'Optional preparation, not a working set. Adjust or add ramps to suit the exercise.'};
}
