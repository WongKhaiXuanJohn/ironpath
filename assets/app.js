import {calculateNutrition,nextLoad,programmeWeek,weeklyAverage,validateBackup,validDate} from './core.js?v=20261030d';
import {programme,volumes,phases,programmeForSession} from './programme.js?v=20261030d';
import {measurementFields,recommendSet,previousExercise} from './tracking.js?v=20261030d';
import {progressView} from './progress-ui.js?v=20261031b';
import {createCloudSync} from './cloud-sync.js?v=20261031a';
import {cloudPanel,cloudStatus,bindCloudPanel} from './cloud-ui.js?v=20261031a';
import {captureMeasurementDraft,measurementBaseline} from './measurement-draft.js?v=20261031a';

const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let today=localDate();
const dayIndex=d=>(new Date(`${d}T12:00:00`).getDay()+6)%7;
const dateText=(d,options={day:'numeric',month:'short',year:'numeric'})=>new Date(`${d}T12:00:00`).toLocaleDateString('en-GB',options);
const addDays=(d,n)=>{const t=new Date(`${d}T12:00:00`);t.setDate(t.getDate()+n);return localDate(t);};
const weekStart=d=>addDays(d,-dayIndex(d));
const KEY='ironpath-v1';
const initial=()=>({version:1,profile:{age:'',height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:0,calorieOverride:'',start:'2026-10-26'},sessions:{},measurements:[],nutrition:{}});
let state=initial(),storageWarning='';
try{const saved=localStorage.getItem(KEY);if(saved){const data=JSON.parse(saved);if(validateBackup(data))state=data;else storageWarning='Your saved data could not be read. Import a valid backup to restore it.';}}catch{storageWarning='Browser storage is unavailable. Export a backup before closing this page.';}
let selectedDay=dayIndex(today),sessionDate=today,nutritionDate=today,measurementDate=today,toastTimer,deletedSet=null;
let trendMetric='weight',trendGroup='day',trendRange='90',trendFrom=addDays(today,-89),trendTo=today;
let historyFrom='',historyTo=today;
let measurementDraft=null;
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
let cloud,cloudView,cloudIdentity='',saving=false;
const hasDraft=()=>Boolean(document.querySelector('#main form[data-dirty="true"]'));
const editing=()=>hasDraft()||Boolean(document.activeElement?.closest('#main input,#main select,#main textarea'));
function updateCloudUI(){
 if(!cloud)return;const info=cloud.summary();$('.local-badge').textContent=cloudStatus(info);
 const mount=$('#cloud-panel');if(mount){mount.innerHTML=cloudPanel(info);bindCloudPanel(cloud,{notify,hasDraft,onRefresh:render});}
 document.querySelectorAll('#main input,#main select,#main textarea,#main button').forEach(el=>{
  if(el.closest('#cloud-panel'))return;
  if(info.readOnly){if(el.dataset.cloudLocked===undefined)el.dataset.cloudLocked=el.disabled?'1':'0';el.disabled=true;}
  else if(el.dataset.cloudLocked!==undefined){el.disabled=el.dataset.cloudLocked==='1';delete el.dataset.cloudLocked;}
 });
}
function cloudChanged(){
 if(!cloud)return;const s=cloud.summary(),identity=`${s.mode}:${s.user?.uid||''}`;
 if(identity!==cloudIdentity){cloudIdentity=identity;measurementDraft=null;deletedSet=null;if(!saving)render();else updateCloudUI();}
 else if(!saving&&!editing())render();else updateCloudUI();
}
cloud=createCloudSync({initial,guestKey:KEY,onChange:cloudChanged});cloudView=cloud.view();state=cloudView.state;
function persist(baseline=cloudView){
 saving=true;
 try{cloud.save(state,baseline);cloudView={state:JSON.parse(JSON.stringify(state)),versions:cloudView.versions};updateCloudUI();return true;}
 catch(error){$('.local-badge').textContent='Not saved · export a backup';notify(error.message||'Device storage is unavailable or full. Export your data to keep this session.');return false;}
 finally{saving=false;}
}
function targets(){try{return calculateNutrition(state.profile);}catch{return null;}}
const pageTitle={overview:'Overview',workouts:'Workouts',nutrition:'Nutrition',progress:'Progress',roadmap:'The 52-week plan',profile:'Your profile'};
function header(kicker,title,subtitle,action=''){return `<div class="page-heading"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${subtitle}</p></div>${action||`<div class="date-chip"><span>◷</span>${dateText(today,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</div>`}</div>`;}
function stat(label,value,unit,detail,icon='↗'){return `<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon}</span></div><div class="stat-value">${value}<span>${unit}</span></div><div class="stat-bottom">${detail}</div></div>`;}
function panel(title,content,link=''){return `<section class="panel"><div class="panel-heading"><h2>${title}</h2>${link}</div>${content}</section>`;}
function empty(text,symbol='↗'){return `<div class="empty"><div class="empty-symbol">${symbol}</div>${text}</div>`;}
function activeWeek(){return programmeWeek(state.profile.start||'2026-10-26',today);}
function phaseIndex(){return Math.min(3,Math.max(0,Math.floor((activeWeek()-1)/13)));}
function completedWeek(){const start=weekStart(today);return new Set(Object.entries(state.sessions).filter(([d])=>d>=start&&d<=today).flatMap(([,days])=>Object.entries(days)).filter(([d,s])=>Number(d)<4&&s.complete).map(([d])=>d)).size;}
function actualVolume(){const counts=Object.fromEntries(volumes.map(([name])=>[name,0]));const start=weekStart(today);for(const [d,days]of Object.entries(state.sessions)){if(d<start||d>today)continue;for(const [day,s]of Object.entries(days)){if(Number(day)>3)continue;for(const ex of programme[Number(day)].exercises){const sets=(s.exercises[ex.id]||[]).filter(x=>x.type==='working'&&x.done).length;if(ex.muscle in counts)counts[ex.muscle]+=sets;}}}return counts;}
function weightChart(records,compact=false){const sorted=records.filter(r=>r.weight!==''&&r.weight!==undefined&&Number(r.weight)>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);if(sorted.length<2)return empty(sorted.length?'Your first check-in is saved. Add another to reveal your trend.':'Your story starts with one check-in.<br>Log your weight to see your progress here.');const w=620,h=compact?160:220,pad=35;const lo=Math.min(...sorted.map(r=>Number(r.weight)))-.5,hi=Math.max(...sorted.map(r=>Number(r.weight)))+.5;const x=i=>pad+i*(w-2*pad)/(sorted.length-1),y=v=>h-pad-(v-lo)/(hi-lo)*(h-2*pad);const pts=sorted.map((r,i)=>`${x(i)},${y(Number(r.weight))}`);const lines=Array.from({length:4},(_,i)=>{const v=lo+(hi-lo)*i/3,yy=y(v);return `<line x1="${pad}" y1="${yy}" x2="${w-pad}" y2="${yy}" stroke="#e9eee1" stroke-dasharray="3 5"/><text x="${pad-8}" y="${yy+3}" text-anchor="end" font-size="9" fill="#8c9a83">${v.toFixed(1)}</text>`;}).join('');return `<div class="chart-container" style="height:${h}px"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Body weight from ${escape(sorted[0].date)} to ${escape(sorted.at(-1).date)}"><defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bdd5a4" stop-opacity=".45"/><stop offset="1" stop-color="#bdd5a4" stop-opacity=".03"/></linearGradient></defs>${lines}<path d="M ${pts.join(' L ')} L ${x(sorted.length-1)},${h-pad} L ${pad},${h-pad} Z" fill="url(#weight-fill)"/><polyline points="${pts.join(' ')}" stroke="#477450" stroke-width="2.5" fill="none"/>${sorted.map((r,i)=>`<circle cx="${x(i)}" cy="${y(Number(r.weight))}" r="3" fill="#477450"><title>${escape(r.date)}: ${r.weight} kg</title></circle>`).join('')}<text x="${pad}" y="${h-10}" font-size="9" fill="#8c9a83">${dateText(sorted[0].date,{day:'numeric',month:'short'})}</text><text x="${w-pad}" y="${h-10}" text-anchor="end" font-size="9" fill="#8c9a83">${dateText(sorted.at(-1).date,{day:'numeric',month:'short'})}</text></svg></div>`;}
function overview(){
 const n=targets(),week=activeWeek(),phase=phases[phaseIndex()],actual=actualVolume(),daily=state.nutrition[today]||{calories:0,protein:0,fat:0,carbs:0};const avg=weeklyAverage(state.measurements,today),current=dayIndex(today),exday=programme[current];
 const weekdays=Array.from({length:7},(_,i)=>{const d=addDays(weekStart(today),i),done=state.sessions[d]?.[i]?.complete;return '<button data-overview-day="'+i+'" data-date="'+d+'" class="week-day '+(i===current?'current':'')+'" aria-label="Open '+programme[i].day+' workout">'+programme[i].short+'<strong>'+new Date(d+'T12:00:00').getDate()+'</strong>'+(done?'✓':i>=4?'<small>Optional</small>':'<i></i>')+'</button>';}).join('');
 return header('YOUR 52-WEEK TRANSFORMATION','Strong is a process.','Show up. Train with intention. Let the progress follow.')+
 `<section class="hero"><div><span class="eyebrow">PHASE ${phaseIndex()+1} / ${escape(phase.label.toUpperCase())}</span><h2>A stronger you.<br>One session at a time.</h2><p>Your plan is built around four focused training days. Keep it consistent. Make every rep count.</p><a href="#workouts" data-open-today class="button lime">Open today’s workout <span>↗</span></a></div><div class="hero-art" aria-hidden="true"><div class="orbit"><div class="orbit-inner"><strong>${week>52?'52':Math.max(0,week).toString().padStart(2,'0')}</strong><small>OF 52 WEEKS</small></div><div class="orbit-label">✧ BUILT OVER TIME</div></div></div></section>`+
 `<div class="stats-grid">${stat('Core sessions this week',completedWeek(),' / 4','Fri–Sun are optional','↗')}${stat('7-day average weight',avg?avg.toFixed(1):'—','kg',avg?'Based on your recent check-ins':'Add your first weight check-in','⚖')}${stat('Daily calorie target',n?n.calories.toLocaleString():'—','kcal',n?(n.override?'Manual calorie override':'Calculated from your profile'):'Enter your age to personalize','◉')}${stat('Daily protein target',n?n.protein:'—','g',n?'2.05 g per kg of body weight':'Complete your profile to calculate','⌁')}</div>`+
 '<div class="two-column">'+panel('Your training week','<div class="week-strip">'+weekdays+'</div><div class="workout-preview"><div class="workout-preview-top"><span class="tag">'+exday.day.toUpperCase()+'</span><span class="muted" style="font-size:10px">'+(current>=4?'Optional · rest is welcome':'Core session')+'</span></div><h3>'+exday.focus+'</h3><div class="meta"><span>◷ '+exday.time+'</span><span>'+exday.exercises.length+' exercises</span></div><div class="preview-exercises">'+exday.exercises.slice(0,3).map(ex=>'<span>'+ex.name+'</span>').join('')+'<span>+'+(exday.exercises.length-3)+' more</span></div><a href="#workouts" data-open-today class="button">Go to workout →</a></div>','<span class="tag neutral">MON–THU CORE</span>')+
 `${panel('Fuel your progress',`<div class="macro-overview"><div class="calorie-ring" style="--pct:${n?Math.min(100,daily.calories/n.calories*100):0}"><div class="ring-label"><strong>${Number(daily.calories).toLocaleString()}</strong><small>of ${n?n.calories.toLocaleString():'—'} kcal</small></div></div><div class="macro-list">${[['Protein',daily.protein,n?.protein,''],['Carbs',daily.carbs,n?.carbs,'carbs'],['Fat',daily.fat,n?.fat,'fat']].map(([name,v,target,c])=>`<div class="macro-row"><i class="dot ${c}"></i>${name}<b>${v} / ${target??'—'} g</b></div>`).join('')}</div></div><div class="divider nutrition-foot"><span>${n?'Daily totals, kept simple.':'Start with your age, height & weight.'}</span><a href="${n?'#nutrition':'#profile'}" class="button ghost">${n?'Log intake':'Set up profile'} ↗</a></div>`,`<span class="tag neutral">TODAY</span>`)}</div>`+
 `<div class="two-column">${panel('Progress over perfection',`${avg?`<div class="weight-trend-header"><strong>${avg.toFixed(1)} <small>kg</small></strong><span>7-day average</span></div>`:''}${weightChart(state.measurements,true)}<div class="chart-legend"><span><i class="dot"></i>Actual weight check-ins</span><span>No invented progress</span></div>`,`<a href="#progress" class="button ghost">View progress ↗</a>`)}${panel('Your weekly training balance',`<p class="note">Completed / planned direct working sets. Core days only.</p>${volumes.map(([name,sets])=>`<div class="volume-row"><span>${name}</span><div class="volume-bar"><i style="width:${Math.min(100,actual[name]/sets*100)}%"></i></div><b>${actual[name]} / ${sets}</b></div>`).join('')}<p class="form-help">Compounds add indirect stimulus. Deadlifts are additional to the six hamstring sets.</p>`)}</div>`+
 `<div class="callout"><span>✧</span><div><strong>Quality reps beat heavier numbers.</strong><p>Build repetitions first and increase the load only when your technique and recovery are ready.</p></div></div>`;
}
function workoutDay(){return programmeForSession(selectedDay,state.sessions[sessionDate]?.[selectedDay]);}
function session(create=false){const days=state.sessions[sessionDate];if(days?.[selectedDay])return days[selectedDay];if(!create)return {exercises:{},complete:false};state.sessions[sessionDate]??={};return state.sessions[sessionDate][selectedDay]={exercises:{},complete:false};}
function defaultSets(ex){return Array.from({length:ex.sets},()=>({type:'working',kg:0,reps:0,done:false}));}
function setsFor(ex){return session().exercises[ex.id]??defaultSets(ex);}
function recommended(ex,s,i){const index=setsFor(ex).slice(0,i).filter(x=>x.type===s.type).length;return recommendSet(ex,state.sessions,sessionDate,index,s.type);}
function setRow(ex,s,i){
 const warm=s.type==='warmup',number=setsFor(ex).slice(0,i+1).filter(x=>x.type===s.type).length,r=recommended(ex,s,i);
 const load=ex.loadType==='cardio'?'—':ex.loadType==='bodyweight'?'BW':r.kg+' kg'+(ex.loadType==='assisted'?' assist.':ex.trial.includes('/ hand')?' / hand':ex.trial.includes('/ side')?' / side':'');
 return '<div class="set-row" data-exercise="'+ex.id+'" data-set="'+i+'"><span class="set-type">'+(warm?'Warm-up '+number:'Set '+number)+'</span>'+
 '<div class="recommended-set"><span>'+load+' × '+r.reps+(ex.loadType==='cardio'?' min':' reps')+'</span><small>'+r.source+'</small></div>'+
 '<input type="number" aria-label="'+ex.name+' row '+(i+1)+' kg" data-field="kg" min="0" max="1000" step="0.5" value="'+(s.kg||'')+'" placeholder="'+(ex.loadType==='bodyweight'?'BW':ex.loadType==='cardio'?'—':r.kg)+'" '+(ex.loadType==='cardio'||ex.muscle==='Mobility'?'disabled':'')+'>'+
 '<input type="number" aria-label="'+ex.name+' row '+(i+1)+' reps or minutes" data-field="reps" min="0" max="100" step="1" value="'+(s.reps||'')+'" placeholder="'+r.reps+'">'+
 '<input class="done-check" type="checkbox" aria-label="'+ex.name+' row '+(i+1)+' complete" data-field="done" '+(s.done?'checked':'')+'>'+
 '<button class="remove-set" data-remove="'+ex.id+'" data-index="'+i+'" aria-label="Remove '+ex.name+' '+(warm?'warm-up':'working')+' set '+number+'" title="Remove set">×</button></div>';
}
function suggestion(ex){const s=nextLoad(ex,setsFor(ex));return (s.kg!==null?'<strong>Next session: '+s.kg+' kg'+(ex.trial.includes('/ hand')?' / hand':'')+'.</strong> ':'')+s.message;}
function dateControl(id,value,label){return '<div class="date-control"><label class="field">'+label+'<input id="'+id+'" type="date" value="'+value+'" max="'+today+'"></label><button type="button" class="button secondary small" data-today="'+id+'">Today</button></div>';}
function workout(){
 const day=workoutDay(),all=day.exercises.flatMap(e=>setsFor(e).filter(s=>s.type==='working')),done=all.filter(s=>s.done).length;
 const saved=state.sessions[sessionDate]?.[selectedDay],records=Object.entries(state.sessions).filter(([d])=>(!historyFrom||d>=historyFrom)&&d<=historyTo).sort(([a],[b])=>b.localeCompare(a)).flatMap(([date,days])=>Object.entries(days).map(([index,s])=>({date,index:Number(index),s})));
 return header('YOUR TRAINING / YOUR PACE','Make every set count.','Start with the guide. Adjust the sets and loads to suit your training.')+
 '<div class="workout-toolbar">'+dateControl('session-date',sessionDate,'Workout date')+'<span class="record-status '+(saved?'has-record':'')+'">'+(saved?(saved.complete?'✓ Completed session':'● Saved session · continue editing'):'New session · '+(sessionDate===today?'today':dateText(sessionDate)))+'</span></div>'+
 '<div class="day-tabs seven-days" role="group" aria-label="Workout template">'+programme.map((d,i)=>'<button class="day-tab '+(selectedDay===i?'active':'')+'" data-day="'+i+'" aria-pressed="'+(selectedDay===i)+'">'+d.short+'<small>'+(i>=4?'Optional':'Core')+'</small></button>').join('')+'</div>'+
 '<section class="session-head"><span class="eyebrow">'+day.day.toUpperCase()+' / '+day.tag.toUpperCase()+'</span><h2>'+day.title+'</h2><p>'+day.focus+'</p><div class="meta"><span>◷ '+day.time+'</span><span>'+day.exercises.length+' exercises</span><span>'+(day.archived?'Saved original template':selectedDay>=4?'Optional · rest is welcome':'Core session')+'</span></div></section>'+
 '<div class="callout session-note"><span>ⓘ</span><div><strong>A guide, with room to make it yours.</strong><p>'+day.note+' Suggested loads are examples, not a strength assessment. Start lighter if needed; machines vary. “From your history” uses completed sets before this date. Add, remove or skip sets freely.</p></div></div>'+
 (deletedSet&&deletedSet.date===sessionDate&&deletedSet.day===selectedDay?'<div class="undo-bar" role="status"><span>Set removed.</span><button class="button ghost small" id="undo-set">Undo removal ↶</button></div>':'')+
 day.exercises.map((ex,i)=>'<section class="panel exercise"><div class="exercise-header"><div class="exercise-title"><span class="exercise-number">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+ex.name+'</h3><p>Guide: '+ex.sets+(ex.sets===1?' set × ':' sets × ')+ex.min+'–'+ex.max+(ex.loadType==='cardio'?' min':' reps')+' · '+(ex.loadType==='assisted'?'kg = assistance':ex.trial.includes('/ hand')?'kg per hand':ex.trial.includes('/ side')?'kg per side':ex.loadType==='cardio'?'minutes only':ex.muscle==='Mobility'?'easy bodyweight movement':ex.loadType==='bodyweight'?'bodyweight · added kg only':'total kg')+'</p></div></div><span class="tag neutral">'+ex.muscle+'</span></div>'+
 '<details><summary>Technique & logging guide ↗</summary><p>'+ex.cue+' '+(ex.muscle==='Mobility'?'No external load is needed; log comfortable repetitions.':ex.loadType==='bodyweight'?'Bodyweight is 0 kg; enter only additional load.':ex.loadType==='assisted'?'Enter assistance in kg; less assistance is harder. Adjust it for controlled reps.':ex.loadType==='cardio'?'Log minutes; no load is needed.':'Choose a load that allows controlled repetitions. Suggestions are optional.')+' Warm-ups do not count toward working sets.</p></details>'+
 '<div class="set-head"><span>SET</span><span>SUGGESTED</span><span>ACTUAL KG</span><span>'+(ex.loadType==='cardio'?'MINUTES':'REPS')+'</span><span>DONE</span><span></span></div>'+
 setsFor(ex).map((s,j)=>setRow(ex,s,j)).join('')+
 (!setsFor(ex).length?'<p class="skipped-note">No sets planned. Add a set to include this exercise.</p>':'')+
 '<div class="set-actions"><div class="actions"><button class="button secondary small" data-add="'+ex.id+'" data-type="warmup">＋ Warm-up</button><button class="button secondary small" data-add="'+ex.id+'" data-type="working">＋ Working set</button></div><button class="button ghost small" data-copy="'+ex.id+'">Use last session ↗</button></div><div class="suggestion" id="suggestion-'+ex.id+'">'+suggestion(ex)+'</div></section>').join('')+
 '<div class="session-finish"><div><p><strong id="set-count">'+done+' / '+all.length+'</strong> '+(day.exercises.some(e=>e.loadType==='cardio'||e.muscle==='Mobility')?'planned sets / blocks':'working sets')+' complete</p><small>Actual entries save automatically · '+dateText(sessionDate)+'</small></div><button class="button" id="finish-session">'+(session().complete?'✓ Session completed':'Finish session →')+'</button></div>'+
 '<section class="panel history-panel"><div class="panel-heading"><h2>Your workout journal</h2><span class="tag neutral">'+records.length+' SESSIONS</span></div><div class="history-filters"><label class="field">From<input type="date" id="history-from" value="'+historyFrom+'" max="'+historyTo+'"></label><label class="field">To<input type="date" id="history-to" value="'+historyTo+'" min="'+historyFrom+'" max="'+today+'"></label></div>'+
 (records.length?'<div class="journal-list">'+records.map(r=>'<button class="journal-entry" data-log-date="'+r.date+'" data-log-day="'+r.index+'"><span><strong>'+dateText(r.date)+'</strong><small>'+programme[r.index].day+(r.index>=4?' · optional':'')+'</small></span><span class="tag '+(r.s.complete?'':'neutral')+'">'+(r.s.complete?'COMPLETE':'IN PROGRESS')+'</span><span aria-hidden="true">↗</span></button>').join('')+'</div>':empty('No saved workouts in this date range.'))+'</section>';
}
function nutrition(){const n=targets(),p=state.profile,record=state.nutrition[nutritionDate]||{};return header('EAT FOR YOUR GOAL','Fuel the work.','Flexible targets, calculated from your current profile.',`<a href="#profile" class="button secondary">Edit your profile ↗</a>`)+
 (!n?`<div class="callout session-note"><span>ⓘ</span><div><strong>Let’s make this personal.</strong><p>Your programme’s original estimate was 2,300 kcal and 160 g protein at 78 kg. Enter your age, height, weight and activity level to calculate your own targets. <a href="#profile"><u>Complete your profile →</u></a></p></div></div>`:'')+
 `<div class="target-grid">${[['DAILY ENERGY',n?.calories,'kcal',n?(n.override?'Your manual override':p.goal==='cut'?'Maintenance − 300 kcal':p.goal==='gain'?'Maintenance + 150 kcal':'Estimated maintenance'):'Complete your profile'],['PROTEIN',n?.protein,'g','2.05 g / kg body weight'],['CARBOHYDRATE',n?.carbs,'g','Remaining calorie budget'],['FAT',n?.fat,'g','0.9 g / kg body weight']].map(([label,val,unit,desc])=>`<div class="target-card"><span class="eyebrow">${label}</span><strong>${val??'—'} <span style="font-size:13px;font-weight:400">${unit}</span></strong><small>${desc}</small></div>`).join('')}</div>`+
 `<div class="two-column">${panel('Your daily nutrition log',`${dateControl('nutrition-date',nutritionDate,'Entry date')}<p class="record-status">${state.nutrition[nutritionDate]?'Saved entry · edit your totals':'No entry yet for this date'}</p><p class="note" style="margin-bottom:18px">Log your daily totals from meals and supplements. Whey counts toward your protein total; don’t add it twice.</p><form id="nutrition-form"><div class="form-grid">${[['calories','Calories (kcal)',10000],['protein','Protein (g)',600],['carbs','Carbohydrates (g)',1500],['fat','Fat (g)',500]].map(([key,label,max])=>`<label class="field">${label}<input name="${key}" type="number" min="0" max="${max}" step="1" required placeholder="0" value="${record[key]??''}"></label>`).join('')}</div><div class="form-actions"><button class="button" type="submit">Save intake →</button><span class="muted" style="font-size:10px">${dateText(nutritionDate)}</span></div></form>`)}
 ${panel('Your protein, your way.',`<p class="note">Whey is optional. This planner assumes 24 g of protein per scoop. Whole-food protein can replace any amount.</p><form id="whey-form"><label class="field" style="margin-top:16px">Planned whey scoops per day<input type="number" name="scoops" min="0" max="10" step="0.5" value="${p.scoops}" required></label><div class="whey-result"><strong id="whey-protein">${n?.whey??Number(p.scoops)*24} g</strong> from whey<br><span class="note" id="food-protein">${n?`${n.foodProtein} g remaining from food to reach ${n.protein} g.`:'Complete your profile to calculate remaining food protein.'}</span></div><button class="button secondary" type="submit">Update whey plan</button></form>`)}</div>`+
 `<div class="two-column">${panel('How your targets are calculated',`<p class="note">These are starting estimates for healthy adults. Your real weight trend, training performance and recovery guide adjustments.</p><div class="formula">Mifflin–St Jeor resting energy:<br><b>10 × weight (kg) + 6.25 × height (cm) − 5 × age + sex constant</b><br>Male +5 / female −161. Resting energy × selected activity factor estimates maintenance. Cut: −300 kcal. Maintain: no change. Lean gain: +150 kcal.<br><br>Protein = weight × 2.05. Fat = weight × 0.9. Carbs = (calories − protein × 4 − fat × 9) ÷ 4. Rounded macros may vary by a few calories.<br><br>${n?`Your resting estimate: <b>${Math.round(n.bmr)} kcal</b><br>Estimated maintenance: <b>${n.maintenance} kcal</b><br>${n.override?'Manual override is active: calorie targets will stay fixed until you clear it. Protein and fat still scale with your weight.':''}`:'Personal results appear after you enter your age.'}</div><p class="form-help">Sources: <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer"><u>Mifflin et al.</u></a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noopener noreferrer"><u>ISSN protein position stand</u></a>. The 2.05 g/kg setting follows this training programme; it is not a universal requirement.</p>`)}
 ${panel('Adjust from trends, not one weigh-in.',`<div class="formula"><b>During a cut</b><br>Aim for gradual loss around 0.25–0.5 kg/week, as set in the programme. Review 2–3 weeks of consistent intake and morning weigh-ins.<br><br><b>If the trend stays flat</b><br>Check tracking and activity first, then consider a small calorie adjustment.<br><br><b>If loss is rapid or recovery drops</b><br>Review your intake and reduce the deficit rather than pushing harder.<br><br><b>Across all phases</b><br>Get enough sleep, eat a varied diet, and adapt phase timing to actual progress. General fitness estimates do not replace individualized advice for medical needs.</div>`)}</div>`;
}
function progress(){return progressView({state,today,date:measurementDate,draft:measurementDraft,metric:trendMetric,group:trendGroup,from:trendFrom,to:trendTo,range:trendRange},{header,panel,empty,dateControl});}
function programmeReview(){return panel('Why this programme fits the goal',`<p class="note">The aim is to build or retain muscle while reducing body fat gradually. Monday–Thursday covers the core lifting work; the weekend adds choices, not requirements.</p><div class="formula"><b>Weekly balance</b><br>Core days provide 11 direct chest sets, 10 back sets, 11 shoulder sets across different heads, 6 each for biceps and triceps, 8 quads, 6 hamstrings plus deadlifts, 5 calves and 6 abs. Presses and pulls also train the arms indirectly. These are starting volumes, not a promise of an individual optimum.<br><br><b>Distinct optional days</b><br>Friday: shoulders and arms. Saturday: supported legs, calves and abs. Sunday: easy conditioning and standing mobility. Choose based on recovery; do not chase seven hard gym days.<br><br><b>Progress and recovery</b><br>Keep Tuesday’s squat, overhead press and deadlift; alternate squat/deadlift emphasis. Reduce Thursday’s hinge work if Tuesday fatigue persists. Build controlled reps before increasing load. Optional machine loads remain unverified examples.<br><br><b>Definition takes nutrition too</b><br>Use a modest calorie deficit while cutting and adequate protein. Review weight averages, waist and strength together; visible abs and a particular body-fat level are not guaranteed on a deadline. Continue phases according to actual progress.<br><br><b>What the evidence means</b><br>Research supports these general principles, not this exact split or your trial loads. Individual response and recovery guide adjustments.</div><p class="form-help">Research checked October 2026: <a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noopener noreferrer"><u>ACSM resistance-training guidance</u></a> · <a href="https://pubmed.ncbi.nlm.nih.gov/41343037/" target="_blank" rel="noopener noreferrer"><u>Volume and frequency review</u></a> · <a href="https://pubmed.ncbi.nlm.nih.gov/34757594/" target="_blank" rel="noopener noreferrer"><u>Strength plus aerobic training</u></a> · <a href="https://pubmed.ncbi.nlm.nih.gov/34623696/" target="_blank" rel="noopener noreferrer"><u>Energy deficit and lean mass</u></a></p>`);}

function roadmap(){const w=activeWeek(),percent=Math.min(100,Math.max(0,(w-1)/52*100));return header('52 WEEKS. ONE LONG GAME.','Built over time.','A roadmap, with room for real life. Adapt each phase to your actual progress.')+
 `<section class="panel" style="margin-bottom:23px"><div class="panel-heading"><h2>${w===0?'Your programme is coming up.':w>52?'Your first 52 weeks are complete.':`Week ${w} of 52`}</h2><a href="#profile" class="button ghost">Change start date ↗</a></div><p class="note">${dateText(state.profile.start)} – ${dateText(addDays(state.profile.start,363))}</p><div class="progress-track"><i style="width:${percent}%"></i></div><p class="note">Four core training days, Monday to Thursday. Friday, Saturday and Sunday are optional. Rest whenever recovery calls for it.</p></section>`+
 phases.map((p,i)=>`<section class="phase ${w>0&&w<=52&&i===phaseIndex()?'current':''}"><span class="phase-number">0${i+1}</span><div><span class="eyebrow">${p.label.toUpperCase()} ${w>0&&w<=52&&i===phaseIndex()?'· CURRENT PHASE':''}</span><h2>${p.title}</h2><p>${p.text}</p></div><div class="phase-weeks">WEEKS<b>${p.weeks}</b></div></section>`).join('')+
 `<div class="two-column" style="margin-top:23px">${panel('Progression that earns its place.',`<p class="note">Use double progression: build reps inside your prescribed range first. Once every working set reaches the ceiling with controlled technique, consider a small increase.</p><div class="formula">Bench example: 50 kg × 8 / 7 / 6 → build to 8 / 8 / 8 → consider 52.5 kg. This is an illustration, not a verified personal working weight.<br><br>Barbells: usually +2.5–5 kg where appropriate. Dumbbells and machines: the smallest practical increment. Never trade technique for load.</div>`)}${panel('Recovery is part of the programme.',`<p class="note">Consider a lighter week every 6–8 weeks or when recovery is inadequate. Reduce working sets by roughly half and stay further from failure.</p><div class="formula">Rest 2–3 minutes for demanding compounds and 60–120 seconds for isolation work, longer if needed. Aim for 7–9 hours of sleep. Stop painful movements and seek qualified help for persistent pain or medical limitations.</div>`)}</div>`+programmeReview();
}
function profile(){const p=state.profile,n=targets();return header('MAKE THE PLAN YOURS','Your starting point.','Adjust your details. Your nutrition targets move with you.')+`<div id="cloud-panel">${cloudPanel(cloud.summary())}</div>`+
 `<div class="two-column profile-layout">${panel('Personal details',`<form id="profile-form">
 <fieldset class="profile-section"><legend>01 / YOUR BODY</legend><div class="form-grid">
 <label class="field"><span class="field-label">Age <span class="muted">(years)</span></span><input name="age" type="number" min="18" max="100" step="1" required placeholder="Enter your age" value="${p.age}" aria-describedby="age-help"><small id="age-help">Used to personalize your energy estimate.</small></label>
 <label class="field"><span class="field-label">Sex used in energy equation</span><select name="sex"><option value="male" ${p.sex==='male'?'selected':''}>Male</option><option value="female" ${p.sex==='female'?'selected':''}>Female</option></select></label>
 <label class="field"><span class="field-label">Height <span class="muted">(cm)</span></span><input name="height" type="number" min="120" max="230" step="0.1" value="${p.height}" required></label>
 <label class="field"><span class="field-label">Current weight <span class="muted">(kg)</span></span><input name="weight" type="number" min="35" max="250" step="0.1" value="${p.weight}" required></label>
 </div></fieldset>
 <fieldset class="profile-section"><legend>02 / YOUR ROUTINE & GOAL</legend><div class="form-grid">
 <label class="field full"><span class="field-label">Daily activity level</span><select name="activity" aria-describedby="activity-help">${[[1.2,'Mostly seated · little exercise'],[1.375,'Lightly active · low daily movement'],[1.55,'Moderately active · regular gym + some movement'],[1.725,'Very active · hard training + active daily life']].map(([v,t])=>`<option value="${v}" ${Number(p.activity)===v?'selected':''}>${t} (×${v})</option>`).join('')}</select><small id="activity-help">Consider your whole day, including your job and steps.</small></label>
 <label class="field"><span class="field-label">Nutrition goal</span><select name="goal"><option value="cut" ${p.goal==='cut'?'selected':''}>Gradual fat loss (−300 kcal)</option><option value="maintain" ${p.goal==='maintain'?'selected':''}>Maintain & perform</option><option value="gain" ${p.goal==='gain'?'selected':''}>Lean muscle gain (+150 kcal)</option></select></label>
 <label class="field"><span class="field-label">Programme start date</span><input type="date" name="start" value="${p.start}" required></label>
 <label class="field full"><span class="field-label">Calorie override <span class="muted">(kcal/day) · optional</span></span><input type="number" min="1200" max="6000" step="10" name="calorieOverride" value="${p.calorieOverride??''}" placeholder="Calculate automatically" aria-describedby="override-help"><small id="override-help">Leave blank for a calculated target. An override fixes calories; protein and fat still adjust with your weight.</small></label>
 </div></fieldset>
 <div class="profile-calculation"><p class="profile-preview-label">YOUR DAILY TARGETS / LIVE PREVIEW</p><div id="profile-preview" role="status" aria-live="polite">${n?`<strong>${n.calories.toLocaleString()} kcal · ${n.protein} g protein</strong><br><span class="note">${n.carbs} g carbs · ${n.fat} g fat</span>`:'Enter your age to calculate your nutrition targets.'}</div></div><p id="profile-error" class="form-error" role="alert"></p><div class="form-actions"><button type="submit" class="button">Save profile →</button><span class="muted" style="font-size:11px">Save to apply your changes.</span></div></form>`)}
 <div>${panel('Your data stays with you.',`<p class="note">${cloud.summary().mode==='account'?'Your records are saved to your approved account, with a device copy for pending changes. Check the cloud status before clearing browser data.':'Your records are saved in this browser. Sign in above to connect your private account; existing device records are uploaded only when you choose.'}</p><p class="note" style="margin-top:12px">Keep a JSON backup as an additional copy. Cloud saving lets your approved account retrieve records on other devices. Keep exported files private.</p><div class="backup-buttons"><button class="button secondary" id="export-data">↓ Export my backup (.json)</button><label class="button secondary" for="import-data" tabindex="0" id="import-label">↑ Restore from a backup</label><input type="file" id="import-data" accept=".json,application/json" hidden></div><p id="backup-error" class="form-error" role="alert"></p>`)}<div style="height:18px"></div>${panel('A plan with clear boundaries.',`<p class="note">Monday–Thursday contains all essential work. Friday adds optional upper-body accessories, Saturday offers supported lower-body and abs work, and Sunday is easy conditioning and standing mobility. Rest remains a good choice. Tuesday keeps squat, standing overhead press and conventional deadlift. Monday abs use the Captain’s Chair Knee Raise.</p><div class="formula">Profile defaults are editable starting values. Working-weight ranges are trial examples only. The adult nutrition calculator provides estimates; validate them against 2–3 weeks of your actual weight trend and recovery.</div>`)}</div></div>`;
}
function render(){if(cloud){cloudView=cloud.view();state=cloudView.state;}const route=location.hash.slice(1)||'overview',view=pageTitle[route]?route:'overview';$('#main').innerHTML=({overview,workouts:workout,nutrition,progress,roadmap,profile}[view])();document.title=`${pageTitle[view]} · Ironpath`;document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===view;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});$('#breadcrumb').innerHTML=`Your workspace <span>/</span> ${pageTitle[view]}`;const w=activeWeek();$('#side-week').textContent=w===0?'Starting soon':w>52?'52 weeks complete':`Week ${w} of 52`;$('#side-progress').style.width=`${Math.max(0,Math.min(100,(w-1)/52*100))}%`;bind(view);updateCloudUI();}
function openWorkout(day,date){selectedDay=day;sessionDate=date;if(location.hash==='#workouts')render();else location.hash='workouts';}
function bind(view){
 document.querySelectorAll('#main form').forEach(form=>form.addEventListener('input',()=>{form.dataset.dirty='true';}));
 document.querySelectorAll('[data-open-today]').forEach(a=>a.onclick=()=>{selectedDay=dayIndex(today);sessionDate=today;});
 document.querySelectorAll('[data-overview-day]').forEach(b=>b.onclick=()=>openWorkout(Number(b.dataset.overviewDay),b.dataset.date>today?today:b.dataset.date));
 document.querySelectorAll('[data-log-date]').forEach(b=>b.onclick=()=>{openWorkout(Number(b.dataset.logDay),b.dataset.logDate);window.scrollTo({top:0,behavior:'instant'});});
 document.querySelectorAll('[data-today]').forEach(b=>b.onclick=()=>{
  if(b.dataset.today==='session-date'){sessionDate=today;selectedDay=dayIndex(today);}
  if(b.dataset.today==='nutrition-date')nutritionDate=today;
  if(b.dataset.today==='measurement-date')measurementDate=today;
  render();
 });
 if(view==='workouts')bindWorkout();
 if(view==='profile')bindProfile();
 if(view==='nutrition'){
  $('#nutrition-date').onchange=e=>{if(validDate(e.target.value)&&e.target.value<=today){nutritionDate=e.target.value;render();}};
  $('#nutrition-form').onsubmit=e=>{e.preventDefault();delete e.target.dataset.dirty;state.nutrition[nutritionDate]=Object.fromEntries([...new FormData(e.target)].map(([k,v])=>[k,Number(v)]));if(!persist())return;notify('Nutrition saved for '+dateText(nutritionDate)+'.');};
  $('#whey-form').onsubmit=e=>{e.preventDefault();delete e.target.dataset.dirty;state.profile.scoops=Number(new FormData(e.target).get('scoops'));if(!persist())return;render();notify('Whey plan updated.');};
 }
 if(view==='progress')bindProgress();
}
function bindProgress(){
 document.querySelectorAll('#measurement-form input:not([type="date"])').forEach(input=>input.oninput=()=>{measurementDraft=captureMeasurementDraft(measurementDate,Object.fromEntries(new FormData($('#measurement-form'))),cloudView,measurementDraft);});
 $('#measurement-date').onchange=e=>{if(validDate(e.target.value)&&e.target.value<=today){measurementDate=e.target.value;render();}};
 document.querySelectorAll('[data-check-date]').forEach(b=>b.onclick=()=>{measurementDate=b.dataset.checkDate;render();$('#measurement-form').scrollIntoView({block:'start',behavior:'smooth'});});
 $('#trend-metric').onchange=e=>{trendMetric=e.target.value;render();};
 $('#trend-group').onchange=e=>{trendGroup=e.target.value;render();};
 $('#trend-range').onchange=e=>{trendRange=e.target.value;trendTo=today;trendFrom=trendRange==='all'?(state.measurements.map(r=>r.date).sort()[0]||today):trendRange==='custom'?trendFrom:addDays(today,-Number(trendRange)+1);render();};
 $('#trend-from').onchange=e=>{if(validDate(e.target.value)&&e.target.value<=trendTo){trendFrom=e.target.value;trendRange='custom';render();}};
 $('#trend-to').onchange=e=>{if(validDate(e.target.value)&&e.target.value>=trendFrom&&e.target.value<=today){trendTo=e.target.value;trendRange='custom';render();}};
 $('#measurement-form').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target),r={...state.measurements.find(x=>x.date===measurementDate),date:measurementDate};
  for(const field of measurementFields)r[field.key]=f.get(field.key)===''?'':Number(f.get(field.key));
  if(!measurementFields.some(field=>r[field.key]!=='')){$('#measurement-error').textContent='Add at least one reading to save this check-in.';return;}
  let p=state.profile;
  if(f.has('updateProfile')){
   if(r.weight===''){$('#measurement-error').textContent='Add your body weight to update your profile.';return;}
   p={...p,weight:r.weight};
   if(p.age!==''){try{calculateNutrition(p);}catch(err){$('#measurement-error').textContent=err.message;return;}}
  }
  const next={...state,profile:p,measurements:state.measurements.filter(x=>x.date!==r.date).concat(r)};
  if(!validateBackup(next)){$('#measurement-error').textContent='Please check the reading values and units.';return;}
  const baseline=measurementBaseline(cloudView,measurementDraft?.date===measurementDate?measurementDraft:null,f.has('updateProfile'));
  state=next;
  if(r[trendMetric]===''||r[trendMetric]===undefined)trendMetric=measurementFields.find(field=>r[field.key]!==''&&r[field.key]!==undefined).key;
  if(r.date<trendFrom){trendFrom=r.date;trendRange='custom';}
  if(r.date>trendTo){trendTo=r.date;trendRange='custom';}
  if(!persist(baseline))return;delete e.target.dataset.dirty;measurementDraft=null;render();notify('Check-in saved for '+dateText(measurementDate)+'.');
 };
}
function updateSessionProgress(){
 const all=workoutDay().exercises.flatMap(e=>setsFor(e).filter(s=>s.type==='working'));
 $('#set-count').textContent=all.filter(s=>s.done).length+' / '+all.length;
 $('#finish-session').textContent='Finish session →';
}
function bindWorkout(){
 document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{selectedDay=Number(b.dataset.day);render();});
 $('#session-date').onchange=e=>{if(validDate(e.target.value)&&e.target.value<=today){sessionDate=e.target.value;const keys=Object.keys(state.sessions[sessionDate]||{});selectedDay=keys.includes(String(dayIndex(sessionDate)))?dayIndex(sessionDate):keys.length?Number(keys[0]):dayIndex(sessionDate);render();}};
 $('#history-from').onchange=e=>{if(e.target.value===''||validDate(e.target.value)&&e.target.value<=historyTo){historyFrom=e.target.value;render();}};
 $('#history-to').onchange=e=>{if(validDate(e.target.value)&&e.target.value>=(historyFrom||'0001-01-01')&&e.target.value<=today){historyTo=e.target.value;render();}};
 document.querySelectorAll('.set-row input').forEach(input=>input.onchange=()=>{
  const row=input.closest('.set-row'),ex=workoutDay().exercises.find(e=>e.id===row.dataset.exercise),index=Number(row.dataset.set),field=input.dataset.field;
  if(!input.checkValidity()){input.reportValidity();input.value=setsFor(ex)[index][field]||'';return;}
  const s=session(true);s.exercises[ex.id]??=defaultSets(ex);const set=s.exercises[ex.id][index];
  if(field==='done'){
   const kgInput=row.querySelector('[data-field="kg"]'),repInput=row.querySelector('[data-field="reps"]');
   if(!kgInput.checkValidity()||!repInput.checkValidity()){input.checked=false;notify('Check the load and repetition values.');return;}
   set.kg=Number(kgInput.value);set.reps=Number(repInput.value);
  }
  if(field==='done'&&input.checked&&(!set.reps||(ex.loadType==='kg'&&!set.kg))){input.checked=false;notify('Enter your actual load and reps before completing the set.');return;}
  set[field]=input.type==='checkbox'?input.checked:Number(input.value);
  if(field!=='done')set.done=false;
  s.complete=false;if(!persist())return;row.querySelector('.done-check').checked=set.done;
  $('#suggestion-'+ex.id).innerHTML=suggestion(ex);updateSessionProgress();
  $('.record-status').textContent='● Saved session · continue editing';
 });
 document.querySelectorAll('.set-row input[type="number"]').forEach(input=>input.oninput=()=>{if(input.checkValidity())input.onchange();});
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
  const ex=workoutDay().exercises.find(e=>e.id===b.dataset.add),s=session(true);s.exercises[ex.id]??=defaultSets(ex);
  if(s.exercises[ex.id].length>=20){notify('Maximum 20 sets per exercise.');return;}
  const row={type:b.dataset.type,kg:0,reps:0,done:false};
  if(row.type==='warmup'){const firstWork=s.exercises[ex.id].findIndex(x=>x.type==='working');s.exercises[ex.id].splice(firstWork<0?s.exercises[ex.id].length:firstWork,0,row);}else s.exercises[ex.id].push(row);
  s.complete=false;if(!persist())return;render();
 });
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
  const ex=workoutDay().exercises.find(e=>e.id===b.dataset.remove),s=session(true);s.exercises[ex.id]??=defaultSets(ex);
  const index=Number(b.dataset.index),[row]=s.exercises[ex.id].splice(index,1);
  deletedSet={date:sessionDate,day:selectedDay,id:ex.id,index,row};s.complete=false;if(!persist())return;render();
 });
 if($('#undo-set'))$('#undo-set').onclick=()=>{
  const s=session(true),rows=s.exercises[deletedSet.id]??=[];
  if(rows.length>=20){notify('Remove a set first to restore this one.');return;}
  rows.splice(deletedSet.index,0,deletedSet.row);s.complete=false;deletedSet=null;if(!persist())return;render();
 };
 document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{
  const ex=workoutDay().exercises.find(e=>e.id===b.dataset.copy),previous=previousExercise(ex,state.sessions,sessionDate);
  if(!previous){notify('No earlier completed sets for this exercise yet.');return;}
  if(setsFor(ex).some(s=>s.done||s.reps||s.kg)){notify('This exercise already has entries. Earlier values were not copied over them.');return;}
  session(true).exercises[ex.id]=previous.sets.map(({type,kg,reps})=>({type,kg,reps,done:false}));session(true).complete=false;if(!persist())return;render();notify('Previous loads and reps copied. Confirm your actual sets as you complete them.');
 });
 $('#finish-session').onclick=()=>{
  const all=workoutDay().exercises.flatMap(e=>setsFor(e).filter(s=>s.type==='working'));
  if(!all.length){notify('Add at least one working set to finish a session.');return;}
  if(!all.every(s=>s.done)){notify('Complete your selected working sets first, or remove the sets you are skipping. Your partial workout is saved.');return;}
  session(true).complete=true;if(!persist())return;render();notify('Session complete. Good work—now recover.');
 };
}
function readProfile(form){const f=new FormData(form);return {...state.profile,...Object.fromEntries(f),age:f.get('age')===''?'':Number(f.get('age')),height:Number(f.get('height')),weight:Number(f.get('weight')),activity:Number(f.get('activity')),calorieOverride:f.get('calorieOverride')===''?'':Number(f.get('calorieOverride'))};}
function bindProfile(){
 const form=$('#profile-form');
 form.oninput=()=>{try{const n=calculateNutrition(readProfile(form));$('#profile-preview').innerHTML=`<strong>${n.calories.toLocaleString()} kcal · ${n.protein} g protein</strong><br><span class="note">${n.carbs} g carbs · ${n.fat} g fat${n.override?' · Calorie override active':''}</span>`;$('#profile-error').textContent='';}catch(err){$('#profile-preview').textContent='Complete valid details to preview your targets.';$('#profile-error').textContent=err.message;}};
 form.onsubmit=e=>{e.preventDefault();const p=readProfile(form);try{calculateNutrition(p);if(!validDate(p.start))throw Error('Choose a valid programme start date.');delete form.dataset.dirty;state.profile=p;if(!persist())return;render();notify('Profile saved. Nutrition targets updated.');}catch(err){$('#profile-error').textContent=err.message;}};
 $('#export-data').onclick=()=>{const blob=new Blob([JSON.stringify(cloud.view().state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ironpath-backup-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Backup exported. Keep it somewhere private.');};
 $('#import-label').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#import-data').click();}};
 $('#import-data').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5_000_000)throw Error('Backup is too large. Choose an Ironpath JSON backup under 5 MB.');const data=JSON.parse(await file.text());if(!validateBackup(data))throw Error('This is not a valid Ironpath backup. Your current data has not changed.');const dialog=$('#confirm-dialog');dialog.returnValue='';const destination=cloud.destination(),isCloud=cloud.summary().mode==='account';dialog.querySelector('h2').textContent=isCloud?'Import into your private account?':'Replace this device’s data?';dialog.querySelector('p').textContent=isCloud?'This uploads the backup’s profile, workouts, nutrition and body-composition records to your Ironpath Firebase account. Existing cloud dates are kept; unrelated records are not removed.':'Your current profile, workout logs and check-ins will be replaced by the selected backup. Export your current data first to keep it.';dialog.onclose=()=>{if(dialog.returnValue==='restore'){try{const result=cloud.importBackup(data,destination);render();notify(cloud.summary().mode==='account'?`${result.added} imported; ${result.skipped} existing records kept.`:'Backup restored.');}catch(error){notify(error.message);}}};dialog.showModal();}catch(err){$('#backup-error').textContent=err.message;}e.target.value='';};
}
function refreshCalendar(){
 const now=localDate();if(now===today)return;
 const before=today;today=now;
 if(sessionDate===before){sessionDate=today;selectedDay=dayIndex(today);}
 if(nutritionDate===before)nutritionDate=today;
 if(measurementDate===before)measurementDate=today;
 if(historyTo===before)historyTo=today;
 if(trendRange!=='custom'){trendTo=today;if(trendRange!=='all')trendFrom=addDays(today,-Number(trendRange)+1);}
 render();
}
window.addEventListener('focus',refreshCalendar);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCalendar();});
setInterval(refreshCalendar,60000);
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});});
render();if(storageWarning)notify(storageWarning);

window.addEventListener('online',()=>cloud.changed());
window.addEventListener('offline',()=>cloud.changed());
