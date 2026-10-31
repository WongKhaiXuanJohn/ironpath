const copy=value=>JSON.parse(JSON.stringify(value));

export function captureMeasurementDraft(date,values,view,previous){
 return {...values,date,baseline:previous?.date===date?previous.baseline:copy(view)};
}

// Chart controls may refresh other records, but an edited reading keeps the
// revision the user actually began editing until it is saved or discarded.
export function measurementBaseline(current,draft,updateProfile=false){
 if(!draft?.baseline)return current;
 const baseline=copy(current),original=draft.baseline,date=draft.date,id=`measurement_${date}`;
 baseline.state.measurements=baseline.state.measurements.filter(r=>r.date!==date).concat(original.state.measurements.filter(r=>r.date===date));
 baseline.versions[id]=original.versions[id]||0;
 if(updateProfile){baseline.state.profile=copy(original.state.profile);baseline.versions.profile=original.versions.profile||0;}
 return baseline;
}
