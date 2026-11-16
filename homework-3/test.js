'use strict';
const assert = require('node:assert/strict');
const C = require('./script.js');
assert.deepEqual(C.parameters('bernoulli',.3),{mu:.3,variance:.21});
assert.deepEqual(C.parameters('rademacher',.3),{mu:0,variance:1});
const stats=C.summarize([2,4,6,8,10]);
assert.equal(stats.mean,6); assert.equal(stats.variance,10);
assert.equal(C.summarize([2,2,2]).variance,0);
const sim=C.simulate({model:'rademacher',p:.3,n:100,m:400,seed:123});
const replay=C.simulate({model:'rademacher',p:.3,n:100,m:400,seed:123});
for(let j=0;j<sim.m;j++)assert.deepEqual(sim.paths[j],replay.paths[j]);
for(let j=0;j<sim.m;j++)for(let t=0;t<sim.n;t++){
 const value=sim.paths[j][t];
 assert.equal(Math.abs(t?value-sim.paths[j][t-1]:value),1);
 assert.ok((value-(t+1))%2===0);
}
assert.equal(C.theory(100,'total',0,1).variance,100);
assert.equal(C.theory(100,'average',0,1).variance,.01);
assert.equal(C.theory(100,'scaled',0,1).variance,1);
const z=C.standardized(sim,100);
for(let j=0;j<sim.m;j++)assert.ok(Math.abs(z[j]-sim.paths[j][99]/10)<1e-12);
const prob=C.llnProbability(sim,100,.2);
assert.ok(prob.empirical>=0&&prob.empirical<=1&&prob.chebyshev>=0&&prob.chebyshev<=1);
const bern=C.simulate({model:'bernoulli',p:.3,n:100,m:2000,seed:20261027});
const mean=C.summarize(C.valuesAt(bern,100,'average')).mean;
assert.ok(Math.abs(mean-.3)<.02,`Bernoulli average ${mean}`);
console.log('PASS: deterministic generator, supports, parity, formulas, LLN, CLT, sample variance.');
