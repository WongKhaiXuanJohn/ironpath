import {createSnapshotJoin} from './cloud-snapshot-join.js?v=20261031c';
export function createFirebaseTransport(config){
 let auth,db,a,f,initializing,unsubscribeAuth,startId=0;
 return {
  async init(onAuth){
   const attempt=++startId;
   if(!config.apiKey||!config.appId)throw Error('Firebase connection is not configured yet.');
   initializing??=Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
   ]).catch(error=>{initializing=null;throw error;});
   const [app,authSdk,firestoreSdk]=await initializing;if(attempt!==startId)throw Error('A newer connection attempt replaced this one.');a=authSdk;f=firestoreSdk;
   const instance=app.getApps().length?app.getApp():app.initializeApp(config);auth=a.getAuth(instance);db=f.getFirestore(instance);
   unsubscribeAuth?.();
   return await new Promise((resolve,reject)=>{let first=true;unsubscribeAuth=a.onAuthStateChanged(auth,user=>{onAuth(user?{uid:user.uid,email:user.email,displayName:user.displayName}:null);if(first){first=false;resolve();}},reject);});
  },
  async signIn(){const provider=new a.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await a.signInWithPopup(auth,provider);},
  async signOut(){await a.signOut(auth);},
  listen(uid,onRecords,onError){
   const join=createSnapshotJoin(onRecords);
   const stopRecords=f.onSnapshot(f.collection(db,'users',uid,'records'),{includeMetadataChanges:true},snapshot=>{
    if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
    join.records(Object.fromEntries(snapshot.docs.map(d=>[d.id,d.data()])));
   },onError);
   const stopTraining=f.onSnapshot(f.doc(db,'users',uid,'settings','training'),{includeMetadataChanges:true},snapshot=>{
    if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
    join.training(snapshot.exists()?snapshot.data():null);
   },onError);
   return ()=>{stopRecords();stopTraining();};
  },
  async write(uid,m){
   const ref=m.id==='training'?f.doc(db,'users',uid,'settings','training'):f.doc(db,'users',uid,'records',m.id);
   return f.runTransaction(db,async tx=>{
    const snapshot=await tx.get(ref),current=snapshot.exists()?snapshot.data():null;
    if(current?.mutationId===m.mutationId)return current;
    if((current?.revision||0)!==m.baseRevision){const error=Error('This record changed on another device.');error.code='ironpath/conflict';error.remote=current;throw error;}
    const next={...m.record,revision:m.baseRevision+1,mutationId:m.mutationId};
    tx.set(ref,{...next,updatedAt:f.serverTimestamp()});return next;
   });
  }
 };
}
