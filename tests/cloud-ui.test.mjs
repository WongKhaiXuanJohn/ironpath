import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudPanel,cloudStatus} from '../assets/cloud-ui.js';
const base={mode:'account',user:{uid:'owner',email:'owner@example.test'},pendingCount:0,conflictCount:0,hasServer:true,online:true,readOnly:false,error:'',conflicts:[],guestCount:1};
test('pending, offline and failed writes are never labelled cloud synced',()=>{
 for(const change of [{pendingCount:1},{online:false},{error:'quota exceeded'},{conflictCount:1}])assert.doesNotMatch(cloudStatus({...base,...change}),/^Cloud synced$/);
 assert.equal(cloudStatus(base),'Cloud synced');
});
test('account labels and conflicting cloud payloads cannot inject HTML',()=>{
 const html=cloudPanel({...base,user:{uid:'<script>',email:'<img src=x onerror=alert(1)>'},conflicts:[{id:'profile',local:{data:{weight:'<iframe>'}},remote:{data:{weight:'<svg onload=alert(1)>'}}}],conflictCount:1});
 assert.doesNotMatch(html,/<img|<iframe|<svg|<script/);assert.match(html,/&lt;img/);
});
test('identity setup and unapproved accounts expose no cloud-upload action',()=>{
 for(const mode of ['setup','blocked','device'])assert.doesNotMatch(cloudPanel({...base,mode}),/data-cloud="migrate"/);
 assert.match(cloudPanel(base),/data-cloud="migrate"/);
});
