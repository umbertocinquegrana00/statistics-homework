'use strict';
const {tests}=require('./script.js');
const out=tests();
for (const [i,t] of out.entries()) console.log(`${String(i+1).padStart(2,'0')} ${t.pass?'PASS':'FAIL'} ${t.name}${t.error?' — '+t.error:''}`);
const count=out.filter(t=>t.pass).length;
console.log(`\n${count}/${out.length} reference checks passed`);
if(count!==out.length)process.exitCode=1;
