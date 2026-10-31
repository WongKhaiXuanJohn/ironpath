// Keep the independent settings document outside the legacy collection, and
// wait for both initial server responses before permitting account writes.
export function createSnapshotJoin(onRecords){
 let records=null,training;
 function emit(){
  if(records===null||training===undefined)return;
  onRecords({...records,...(training?{training}: {})});
 }
 return {
  records(value){records=value;emit();},
  training(value){training=value;emit();}
 };
}
