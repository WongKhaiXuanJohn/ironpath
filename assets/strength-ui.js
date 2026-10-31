import {validateTraining} from './core.js?v=20261031c';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lifts=[['bench','Bench press'],['squat','Back squat'],['deadlift','Conventional deadlift']];

export function readTraining(formData){
 const result={mode:formData.get('training-mode'),baselines:{}};
 for(const [id,name]of lifts){
  const values=['kg','reps','sets'].map(key=>formData.get(`${id}-${key}`)||'');
  if(values.every(v=>v===''))continue;
  if(values.some(v=>v===''))throw Error(`Complete the weight, reps and sets for ${name.toLowerCase()}, or leave that lift blank.`);
  result.baselines[id]={kg:Number(values[0]),reps:Number(values[1]),sets:Number(values[2]),date:formData.get(`${id}-date`)||''};
 }
 if(!validateTraining(result))throw Error('Check your training settings: use repeatable working sets of 3–12 reps, 1–20 sets, a valid date and a total load from 1–1000 kg.');
 return result;
}

export function trainingPanel(profile,today){
 const training=validateTraining(profile.training)?profile.training:{mode:'starter',baselines:{}};
 const liftCards=lifts.map(([id,name])=>{
  const baseline=training.baselines[id]||{};
  const field=(key,label,min,max,step)=>`<label class="field"><span>${label}</span><input name="${id}-${key}" aria-label="${name} ${label}" type="number" min="${min}" max="${max}" step="${step}" value="${escape(baseline[key]??'')}" placeholder="Optional"></label>`;
  return `<fieldset class="strength-baseline"><legend>${name}</legend><div class="baseline-numbers">${field('kg','Total kg',1,1000,.5)}${field('reps','Reps',3,12,1)}${field('sets','Sets',1,20,1)}</div><label class="field baseline-date"><span>Reference date</span><input name="${id}-date" aria-label="${name} reference date" type="date" value="${escape(baseline.date||today)}" max="${escape(today)}"></label></fieldset>`;
 }).join('');
 return `<section class="panel training-panel" aria-labelledby="training-title"><div class="panel-heading"><div><span class="eyebrow">YOUR STRENGTH / YOUR STARTING POINT</span><h2 id="training-title">Train from your own baseline.</h2></div><span class="tag neutral">PRIVATE SETTINGS</span></div><p class="note">Use a working weight you can repeat with controlled reps, including the bar. These are working-set references, not personal records or one-rep maximums.</p><form id="training-form"><label class="field training-mode"><span>Recommendation style</span><select name="training-mode"><option value="starter" ${training.mode==='starter'?'selected':''}>Starter · beginner examples</option><option value="experienced" ${training.mode==='experienced'?'selected':''}>Experienced · personal calibration & trials</option></select></label><div class="training-grid">${liftCards}</div><p class="form-help">Dates start at today. Leave a lift blank to use a trial guide. Experienced mode starts with a modest buffer below your heavy working reference, then learns from completed sets. Accessory and machine weights have their own practical trial guides.</p><div class="training-method"><strong>Progress one step at a time.</strong><p>Build reps within the exercise guide. After a fully completed session, aim for one extra rep across the exercise. When every working set reaches the top, consider a small load increase. Keep technique and recovery in charge.</p></div><p id="training-error" class="form-error" role="alert"></p><p id="training-status" class="form-help" role="status"></p><div class="form-actions"><button type="submit" class="button">Save training settings →</button><span class="muted">Saves independently of your nutrition details.</span></div></form></section>`;
}
