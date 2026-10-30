// Read-only DOM audit, run through the supported browser evaluate API.
// Native date glyph centring must additionally be checked visually in Safari.
export default function auditAlignment() {
 const failures=[],tolerance=1.25,rect=el=>el.getBoundingClientRect();
 const visible=el=>{const r=rect(el),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
 const identify=el=>el.id?'#'+el.id:el.name?el.tagName.toLowerCase()+'[name="'+el.name+'"]':el.getAttribute('aria-label')||el.className||el.tagName;
 const near=(a,b)=>Math.abs(a-b)<=tolerance,fail=(kind,details)=>failures.push({kind,...details});
 const rows=elements=>{const result=[];for(const el of elements.filter(visible)){const top=rect(el).top;let row=result.find(r=>near(r.top,top));if(!row)result.push(row={top,elements:[]});row.elements.push(el);}return result;};
 for(const container of document.querySelectorAll('.form-grid,.history-filters,.trend-dates,.trend-controls')){
  const labels=[...container.children].filter(el=>el.matches('label.field'));
  for(const row of rows(labels)){
   const controls=row.elements.map(el=>el.querySelector('input:not([type=checkbox]),select')).filter(el=>el&&visible(el));
   if(controls.length<2)continue;const expected=rect(controls[0]);
   for(const el of controls.slice(1)){const r=rect(el);if(!near(r.top,expected.top)||!near(r.height,expected.height))fail('paired-control-alignment',{container:container.className,control:identify(el),topDelta:r.top-expected.top,heightDelta:r.height-expected.height});}
  }
 }
 for(const group of document.querySelectorAll('.date-control')){
  const input=group.querySelector('input[type=date]'),button=group.querySelector('button');if(!input||!button||!visible(input)||!visible(button))continue;
  const a=rect(input),b=rect(button);if(!near(a.top,b.top)||!near(a.bottom,b.bottom))fail('today-button-alignment',{input:identify(input),topDelta:b.top-a.top,bottomDelta:b.bottom-a.bottom});
 }
 for(const [containerSelector,childSelector,valueSelector] of [['.stats-grid','.stat','.stat-value'],['.report-grid','div','strong']]){
  for(const container of document.querySelectorAll(containerSelector)){
   const cards=[...container.children].filter(el=>el.matches(childSelector));
   for(const row of rows(cards)){const values=row.elements.map(el=>el.querySelector(valueSelector)).filter(el=>el&&visible(el));if(values.length<2)continue;const expected=rect(values[0]).top;for(const value of values.slice(1))if(!near(rect(value).top,expected))fail('card-value-alignment',{container:containerSelector,label:value.parentElement.textContent.trim().slice(0,80),topDelta:rect(value).top-expected});}
  }
 }
 for(const grid of document.querySelectorAll('.set-row,.set-head')){
  if(!visible(grid))continue;const g=rect(grid),s=getComputedStyle(grid),left=g.left+Number.parseFloat(s.borderLeftWidth)+Number.parseFloat(s.paddingLeft),right=g.right-Number.parseFloat(s.borderRightWidth)-Number.parseFloat(s.paddingRight);
  for(const child of [...grid.children].filter(visible)){const r=rect(child);if(r.left<left-tolerance||r.right>right+tolerance)fail('workout-content-intrusion',{child:identify(child),leftOverflow:Math.max(0,left-r.left),rightOverflow:Math.max(0,r.right-right)});}
 }
 for(const exercise of document.querySelectorAll('.exercise')){
  const headers=exercise.querySelectorAll('.set-head > span');if(headers.length!==6)continue;
  for(const row of exercise.querySelectorAll('.set-row'))for(const [field,index] of [['kg',2],['reps',3],['done',4]]){const input=row.querySelector('[data-field="'+field+'"]');if(!input||!visible(input)||!visible(headers[index]))continue;const a=rect(input),b=rect(headers[index]),delta=a.left+a.width/2-b.left-b.width/2;if(Math.abs(delta)>tolerance)fail('workout-header-column',{field,delta});}
 }
 if(document.documentElement.scrollWidth>innerWidth+tolerance)fail('page-overflow',{overflow:document.documentElement.scrollWidth-innerWidth});
 const dateStyles=[...document.querySelectorAll('input[type=date]')].filter(visible).map(el=>{const s=getComputedStyle(el),r=rect(el);return {input:identify(el),empty:!el.value,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom};});
 for(const date of dateStyles)if(!near(date.height,50)||!near(Number.parseFloat(date.lineHeight),22)||!near(Number.parseFloat(date.paddingTop),13)||!near(Number.parseFloat(date.paddingBottom),13))fail('native-date-style-invariant',date);
 return {route:location.hash,width:innerWidth,failures,dateStyles};
}
