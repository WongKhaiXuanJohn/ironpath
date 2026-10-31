import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotJoin} from '../assets/cloud-snapshot-join.js';

for(const trainingFirst of [false,true])test(`account loading waits for both server snapshots (training first: ${trainingFirst})`,()=>{
 const seen=[],join=createSnapshotJoin(value=>seen.push(value)),profile={data:{weight:80},revision:1};
 if(trainingFirst)join.training(null);else join.records({profile});assert.equal(seen.length,0);
 if(trainingFirst)join.records({profile});else join.training(null);
 assert.deepEqual(seen,[{profile}]);
});
test('independent training updates never rewrite the legacy profile document or its revision',()=>{
 const seen=[],join=createSnapshotJoin(value=>seen.push(value)),profile={data:{weight:80},revision:2},records={profile};
 join.records(records);join.training(null);
 const training={data:{mode:'experienced',baselines:{}},revision:1};join.training(training);
 assert.deepEqual(seen.at(-1),{profile,training});assert.equal(records.training,undefined);
 join.records({profile:{...profile,revision:3}});assert.deepEqual(seen.at(-1).training,training);assert.equal(seen.at(-1).profile.revision,3);
});
