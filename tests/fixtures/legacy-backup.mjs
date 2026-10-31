// Same profile shape accepted by the original backup validator, before start/override fields.
export const legacyBackup={version:1,profile:{age:30,height:171,weight:78,sex:'male',activity:1.55,goal:'cut',scoops:3},sessions:{},measurements:[],nutrition:{}};
export const numericStringBackup={...structuredClone(legacyBackup),
 profile:{age:'30',height:'171',weight:'78',sex:'male',activity:'1.55',goal:'cut',scoops:'3'},
 sessions:{'2026-10-30':{4:{complete:true,exercises:{preacher:[{type:'working',kg:'10',reps:'12',rir:'2',form:true,done:true}]}}}},
 measurements:[{date:'2026-10-30',weight:'78',bodyProtein:'12',proteinMass:'12',metabolism:'1673'}],
 nutrition:{'2026-10-30':{calories:'2200',protein:'160',fat:'70',carbs:'220'}}
};
