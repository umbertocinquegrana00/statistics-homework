'use strict';
/* Homework 6 — statistical independence on the official UNSW-NB15 test split.
   NO network observations are manufactured. A CSV must be fetched or uploaded.
   Pure mathematical functions are separated from rendering for independent testing. */
const MIRROR = 'https://raw.githubusercontent.com/Nir-J/ML-Projects/master/UNSW-Network_Packet_Classification/UNSW_NB15_testing-set.csv';
const OFFICIAL_ROWS = 82332;
const OUTCOMES = ['Normal', 'Attack'];
const FIELDS = ['service', 'proto', 'state'];
let records = null, current = null, sourceName = '', permutationBusy = false;
const $ = id => document.getElementById(id);
const number = n => Number(n).toLocaleString('en-US');
const fmt = (n, d = 4) => Number(n).toFixed(d);
const pct = p => `${fmt(100 * p, 2)}%`;
const safe = v => String(v).replaceAll('&', '&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

// CSV fields may be quoted. No external parsing library is needed for this schema.
function csvFields(line) {
  const result = []; let cell = '', quoted = false;
  for (let i=0; i<line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i+1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { result.push(cell); cell=''; }
    else cell += ch;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  result.push(cell); return result;
}
function parseUnswCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const headers = csvFields(lines.shift() || '').map(h=>h.trim().toLowerCase());
  const indexes = Object.fromEntries(['service','proto','state','label','attack_cat'].map(k=>[k, headers.indexOf(k)]));
  for (const k of Object.keys(indexes)) if (indexes[k] < 0) throw new Error(`Missing required column: ${k}. Select the UNSW_NB15_testing-set.csv file.`);
  const result = [];
  for (let j=0; j<lines.length; j++) {
    if (!lines[j].trim()) continue;
    const cells = csvFields(lines[j]);
    if (cells.length !== headers.length) throw new Error(`CSV row ${j+2}: ${cells.length} columns, expected ${headers.length}`);
    const label = cells[indexes.label].trim();
    if (label !== '0' && label !== '1') throw new Error(`Invalid binary label at CSV row ${j+2}`);
    result.push({service: cells[indexes.service].trim() || '(blank)',
      proto: cells[indexes.proto].trim() || '(blank)',
      state: cells[indexes.state].trim() || '(blank)',
      label: Number(label), attack_cat: cells[indexes.attack_cat].trim()});
  }
  if (result.length < 2) throw new Error('Dataset requires at least two records');
  return result;
}

// Choose top 7 categories by X frequency only. Never use the response label to group.
function groupCategories(rows, field, limit = 7) {
  const counts = new Map();
  for (const r of rows) counts.set(r[field], (counts.get(r[field]) || 0) + 1);
  const ranked = [...counts].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
  const top = ranked.slice(0, limit).map(v=>v[0]);
  const hasOther = ranked.length > limit;
  const categories = [...top, ...(hasOther ? ['Other (grouped)'] : [])];
  const kept = new Set(top);
  const indexes = new Map(categories.map((v,i)=>[v,i]));
  const rowIndex = new Uint8Array(rows.length);
  const labels = new Uint8Array(rows.length);
  const matrix = categories.map(()=>[0,0]);
  for (let i=0; i<rows.length; i++) {
    const cat = kept.has(rows[i][field]) ? rows[i][field] : 'Other (grouped)';
    const row = indexes.get(cat), col = rows[i].label;
    rowIndex[i]=row; labels[i]=col; matrix[row][col]++;
  }
  return { matrix, categories, rowIndex, labels, grouped: Math.max(0, ranked.length - limit), unique:ranked.length };
}
function analyseMatrix(matrix, categories) {
  if (!matrix.length || matrix.length !== categories.length || matrix.some(r=>r.length!==2 || r.some(x=>!Number.isSafeInteger(x) || x<0))) throw new Error('Invalid contingency table');
  const rowTotals = matrix.map(r=>r[0]+r[1]);
  const colTotals = [matrix.reduce((s,r)=>s+r[0],0),matrix.reduce((s,r)=>s+r[1],0)];
  const n = colTotals[0] + colTotals[1];
  if (n === 0 || rowTotals.some(x=>x===0) || colTotals.some(x=>x===0)) throw new Error('Both outcome classes and all row categories must be present');
  const expected = matrix.map((r,i)=>r.map((_,j)=>rowTotals[i]*colTotals[j]/n));
  const contributions = matrix.map((r,i)=>r.map((x,j)=>(x-expected[i][j])**2/expected[i][j]));
  const chi2 = contributions.flat().reduce((a,b)=>a+b,0);
  const df = categories.length-1;
  const v = df ? Math.sqrt(chi2/n) : 0; // 2 columns => min(r-1,c-1)=1
  return {matrix,categories,rowTotals,colTotals,expected,contributions,n,chi2,df,v,
    p: df ? chiSquareSurvival(chi2,df) : NaN, minExpected:Math.min(...expected.flat())};
}
function logGamma(z) {
  const c=[0.9999999999998099,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if (z<0.5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z-=1; let sum=c[0]; for(let i=1;i<c.length;i++) sum+=c[i]/(z+i);
  const t=z+7.5; return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(sum);
}
function gammaQ(a,x) {
  if (a<=0 || x<0) return NaN;
  if (x===0) return 1;
  const scale=Math.exp(a*Math.log(x)-x-logGamma(a)),tiny=1e-300;
  if (x<a+1) {
    let term=1/a, sum=term;
    for(let i=1;i<10000;i++){term*=x/(a+i);sum+=term;if(Math.abs(term)<Math.abs(sum)*1e-14)break;}
    return Math.max(0,Math.min(1,1-scale*sum));
  }
  let b=x+1-a,c=1/tiny,d=1/b,h=d;
  for(let i=1;i<10000;i++){
    const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<tiny)d=tiny;
    c=b+an/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;
    const delta=d*c;h*=delta;if(Math.abs(delta-1)<1e-14)break;
  }
  return Math.max(0,Math.min(1,scale*h));
}
function chiSquareSurvival(chi2,df) {return gammaQ(df/2,chi2/2);}
function pFormat(p){return p<0.0001 ? p.toExponential(3):fmt(p,6);}
function mkTable(headers,rows,total=false) {
 return `<table><thead><tr>${headers.map(x=>`<th>${safe(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr class="${total&&i===rows.length-1?'total':''}">${r.map(v=>`<td>${safe(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function cells(a,fn,total) {
  const rows=a.matrix.map((r,i)=>[a.categories[i],...r.map((v,j)=>fn(v,i,j)),total==='count'?number(a.rowTotals[i]):'']);
  if(total==='count')rows.push(['Total',...a.colTotals.map(number),number(a.n)]);
  return rows;
}
function bars(id, values, baseline=null) {
  $(id).innerHTML=values.map(([name,v])=>`<div class="baritem"><span title="${safe(name)}">${safe(name)}</span><div class="bartrack"><div class="barfill" style="width:${100*Math.max(0,Math.min(1,v))}%"></div>${baseline===null?'':`<div class="benchmark" style="left:${100*baseline}%"></div>`}</div><b>${pct(v)}</b></div>`).join('');
}
function kpis(id, values) {$(id).innerHTML=values.map(([a,b])=>`<div><span>${safe(a)}</span><strong>${safe(b)}</strong></div>`).join('');}

function compute(field) {
  const grouped=groupCategories(records,field);
  return {field, ...grouped, ...analyseMatrix(grouped.matrix,grouped.categories)};
}
function analyse() {
  if (!records) return;
  try {
    current=compute($('variable').value);
    const a=current, alpha=Number($('alpha').value), rate=a.colTotals[1]/a.n;
    $('heroN').textContent=number(a.n);$('heroAttacks').textContent=number(a.colTotals[1]);
    $('observedTable').innerHTML=mkTable(['X category','Normal (0)','Attack (1)','Total'],cells(a,v=>number(v),'count'),true);
    kpis('kpis',[['Observed flows',number(a.n)],['Normal flows',number(a.colTotals[0])],['Attack flows',number(a.colTotals[1])],['Overall attack rate',pct(rate)]]);
    bars('attackBars',a.matrix.map((r,i)=>[a.categories[i],r[1]/a.rowTotals[i]]),rate);
    $('jointTable').innerHTML=mkTable(['X','Normal','Attack','P(X)'],a.matrix.map((r,i)=>[a.categories[i],...r.map(x=>fmt(x/a.n,5)),fmt(a.rowTotals[i]/a.n,5)]));
    $('rowTable').innerHTML=mkTable(['X','P(Normal | X)','P(Attack | X)','Sum'],a.matrix.map((r,i)=>[a.categories[i],...r.map(x=>fmt(x/a.rowTotals[i],5)),'1.00000']));
    $('colTable').innerHTML=mkTable(['X','P(X | Normal)','P(X | Attack)'],a.matrix.map((r,i)=>[a.categories[i],...r.map((x,j)=>fmt(x/a.colTotals[j],5))]));
    kpis('testKpis',[['Pearson χ²',fmt(a.chi2,3)],['Degrees of freedom',String(a.df)],['Asymptotic p-value',pFormat(a.p)],['Min. expected count',fmt(a.minExpected,2)]]);
    $('expectedTable').innerHTML=mkTable(['X','Expected normal','Expected attack'],a.expected.map((r,i)=>[a.categories[i],...r.map(v=>fmt(v,2))]));
    $('contributionsTable').innerHTML=mkTable(['X','Normal contribution','Attack contribution','Total'],a.contributions.map((r,i)=>[a.categories[i],...r.map(v=>fmt(v,3)),fmt(r[0]+r[1],3)]));
    $('decision').innerHTML=`<b>${a.p<alpha?'Reject':'Do not reject'} H₀</b> at α = ${fmt(alpha,2)}. The category and attack label ${a.p<alpha?'show statistical association':'do not show sufficient evidence of association'} in these records. ${a.minExpected<5?'<br><b>Warning:</b> at least one expected count is below 5; the asymptotic χ² approximation may be unreliable.':'All expected counts are at least 5.'} <br><span class="muted">${a.unique} original ${safe(a.field)} categories; ${a.grouped} infrequent categories combined as Other.</span>`;
    const comparisons=FIELDS.map(f=>compute(f));
    $('comparisonTable').innerHTML=mkTable(['Explanatory feature','Categories','χ²','df','p-value',"Cramér’s V"],comparisons.map(x=>[x.field,String(x.categories.length),fmt(x.chi2,3),String(x.df),pFormat(x.p),fmt(x.v,4)]));
    bars('effectBars',comparisons.map(x=>[x.field,x.v]));
    $('summary').textContent=`For ${a.field}, χ²(${a.df}) = ${fmt(a.chi2,3)}, p = ${pFormat(a.p)}, Cramér’s V = ${fmt(a.v,4)}. The observed differences are descriptive associations in a constructed cyber-range dataset; this evidence does not establish that any service or protocol causes an attack.`;
    $('permutationStatus').textContent='Ready for a fixed-margin permutation experiment.';
    $('permKpis').innerHTML='';$('permutationPlot').replaceChildren();
  } catch(err) { $('loadStatus').textContent=`Analysis error: ${err.message}`; }
}
function rng(seed) {
  let state=(Number(seed)>>>0)||0x6d2b79f5;
  return () => {state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function shuffledStatistic(rowIndex, labels, rowCount, random) {
  const perm=labels.slice();
  for(let i=perm.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const temp=perm[i];perm[i]=perm[j];perm[j]=temp;}
  const matrix=Array.from({length:rowCount},()=>[0,0]);
  for(let i=0;i<perm.length;i++)matrix[rowIndex[i]][perm[i]]++;
  return analyseMatrix(matrix,Array.from({length:rowCount},(_,i)=>String(i))).chi2;
}
function histogram(values, observed) {
  const svg=$('permutationPlot'); svg.replaceChildren();
  const width=850,height=260,left=40,right=20,top=15,bottom=35,limit=Math.max(...values,1)*1.04,bins=26;
  const counts=Array(bins).fill(0);for(const v of values)counts[Math.min(bins-1,Math.floor(v/limit*bins))]++;
  const peak=Math.max(...counts,1),ns='http://www.w3.org/2000/svg';
  const elt=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));svg.appendChild(e);return e;};
  elt('line',{x1:left,y1:height-bottom,x2:width-right,y2:height-bottom,stroke:'#8da7c7'});
  counts.forEach((c,i)=>{
    const x=left+(width-left-right)*i/bins, bw=(width-left-right)/bins-2,h=(height-top-bottom)*c/peak;
    elt('rect',{x,y:height-bottom-h,width:bw,height:h,rx:2,fill:'#49c8de'});
  });
  if(observed<=limit){const x=left+(width-left-right)*observed/limit;elt('line',{x1:x,y1:top,x2:x,y2:height-bottom,stroke:'#ff9b7a','stroke-width':3});}
  [[0,'0'],[limit/2,fmt(limit/2,1)],[limit,fmt(limit,1)]].forEach(([v,s])=>{const x=left+(width-left-right)*v/limit;const t=elt('text',{x,y:height-9,fill:'#b4c9e3','text-anchor':'middle','font-size':13});t.textContent=s;});
  const t=elt('text',{x:width-20,y:18,fill:'#ffb39a','text-anchor':'end','font-size':13});t.textContent=observed>limit?`Observed χ² = ${fmt(observed,2)} (off-chart)`:`Red: observed χ²`;
}
async function permutation() {
  if(!current || permutationBusy)return;
  permutationBusy=true;$('permute').disabled=true;
  const a=current, count=Number($('reps').value),random=rng($('seed').value),scores=[];
  let exceed=0;
  for(let i=0;i<count;i++){
    const x=shuffledStatistic(a.rowIndex,a.labels,a.categories.length,random);scores.push(x);
    if(x>=a.chi2-1e-12)exceed++;
    if(i%25===24){$('permutationStatus').textContent=`Completed ${i+1} / ${count} permutations`;await new Promise(resolve=>setTimeout(resolve,0));}
  }
  const p=(exceed+1)/(count+1);
  kpis('permKpis',[['Repetitions',number(count)],['Tail exceedances',number(exceed)],['Monte Carlo p',fmt(p,6)],['Observed χ²',fmt(a.chi2,3)]]);
  histogram(scores,a.chi2);
  $('permutationStatus').textContent=`Finished. Monte Carlo resolution is 1 / (B + 1) = ${fmt(1/(count+1),6)}.`;
  permutationBusy=false;$('permute').disabled=false;
}
async function loadText(text,name) {
  const r=parseUnswCsv(text); records=r; sourceName=name;
  const attack=r.reduce((s,v)=>s+v.label,0);
  $('loadStatus').innerHTML=`<span class="statusgood">Loaded ${number(r.length)} real records</span> from ${safe(name)}; ${number(attack)} attack-labelled flows. ${r.length===OFFICIAL_ROWS?'Matches expected UNSW-NB15 test-split row count.':'Row count differs from full test split; results will describe the uploaded subset only.'}`;
  $('analyse').disabled=false;$('csvDownload').disabled=false;$('permute').disabled=false;
  analyse();
}
async function fetchOfficial() {
  $('fetchData').disabled=true;$('loadStatus').textContent='Downloading original test-split CSV from public GitHub mirror…';
  try {
    const response=await fetch(MIRROR,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const text=await response.text();await loadText(text,'UNSW_NB15_testing-set.csv (public mirror)');
  } catch(e) {
    $('loadStatus').innerHTML=`<span class="statusbad">Remote download unavailable: ${safe(e.message)}.</span> Download <a href="https://research.unsw.edu.au/projects/unsw-nb15-dataset" target="_blank" rel="noopener">the official test CSV</a> and select it with the file picker. No substitute data was loaded.`;
  } finally {$('fetchData').disabled=false;}
}
function downloadTable() {
  if(!current)return;
  const a=current, lines=[['X','Normal','Attack','Total'],...a.matrix.map((r,i)=>[a.categories[i],r[0],r[1],a.rowTotals[i]]),['Total',...a.colTotals,a.n]];
  const csv=lines.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`unsw_nb15_${a.field}_contingency.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function testSuite() {
  const tests=[];const test=(name,fn)=>{try{if(!fn())throw new Error('Mismatch');tests.push([name,true]);}catch(e){tests.push([name,false]);}};
  const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t;
  const small=[ [10,20],[20,10] ],a=analyseMatrix(small,['A','B']);
  test('CSV headers and quoted values',()=>csvFields('"one,two",3,"say ""hi"""').join('|')==='one,two|3|say "hi"');
  test('CSV fixture parses distinct labels',()=>parseUnswCsv('service,proto,state,label,attack_cat\nhttp,tcp,FIN,0,Normal\ndns,udp,CON,1,Generic').length===2);
  test('Observed matrix totals',()=>a.n===60&&a.rowTotals.join(',')==='30,30'&&a.colTotals.join(',')==='30,30');
  test('Expected counts from margins',()=>a.expected.flat().every(v=>near(v,15)));
  test('Pearson χ² known table',()=>near(a.chi2,6.666666666666667));
  test('df=(r-1)(c-1)',()=>a.df===1);
  test('Cramér V known value',()=>near(a.v,Math.sqrt(1/9)));
  test('χ² survival df2 x=2',()=>near(chiSquareSurvival(2,2),Math.exp(-1),1e-12));
  test('χ² survival df1 x=3.841458820694124',()=>near(chiSquareSurvival(3.841458820694124,1),0.05,3e-8));
  test('χ² survival df3 x=7.814727903',()=>near(chiSquareSurvival(7.814727903,3),0.05,3e-8));
  test('Independent matrix gives χ²=0',()=>near(analyseMatrix([[10,10],[20,20]],['A','B']).chi2,0));
  test('Joint probabilities sum to one',()=>near(a.matrix.flat().reduce((s,x)=>s+x/a.n,0),1));
  test('Conditional row proportions sum to one',()=>a.matrix.every((r,i)=>near((r[0]+r[1])/a.rowTotals[i],1)));
  test('Rare categories grouped without removing rows',()=>{const rows=[...Array(7)].map((_,i)=>({service:'A',proto:'tcp',state:'FIN',label:i%2}));rows.push(...['B','C','D','E','F','G','H','I'].map(x=>({service:x,proto:'udp',state:'CON',label:1})));return groupCategories(rows,'service',7).matrix.flat().reduce((s,x)=>s+x,0)===15;});
  test('Seeded PRNG repeats sequence',()=>{const x=rng(123),y=rng(123);return Array.from({length:12},()=>x()).every(v=>v===y());});
  test('Permutation statistic reproducible',()=>{const rows=new Uint8Array([0,0,0,1,1,1]),labels=new Uint8Array([0,0,1,1,0,1]);return shuffledStatistic(rows,labels,2,rng(14))===shuffledStatistic(rows,labels,2,rng(14));});
  test('Permutation fixes row and label margins in test fixture',()=>{const rows=new Uint8Array([0,0,1,1]),labels=new Uint8Array([0,1,0,1]);const z=shuffledStatistic(rows,labels,2,rng(20));return z===0||z===4;});
  test('All group labels are within allowed index range',()=>{const arr=[{service:'x',label:0},{service:'y',label:1},{service:'z',label:0}].map(x=>({...x,proto:'tcp',state:'FIN'}));const b=groupCategories(arr,'service',2);return [...b.rowIndex].every(x=>x<b.categories.length);});
  test('Invalid label is rejected',()=>{try{parseUnswCsv('service,proto,state,label,attack_cat\nhttp,tcp,FIN,7,X');return false;}catch{return true;}});
  test('Invalid empty expected class is rejected',()=>{try{analyseMatrix([[10,0],[8,0]],['a','b']);return false;}catch{return true;}});
  $('testStatus').textContent=`${tests.filter(x=>x[1]).length} / ${tests.length} PASS`;
  $('testList').innerHTML=tests.map(([name,ok])=>`<div class="check ${ok?'':'fail'}">${ok?'✓ PASS':'✕ FAIL'} · ${safe(name)}</div>`).join('');
  return tests;
}
function wire() {
  $('fetchData').addEventListener('click',fetchOfficial);
  $('csvFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{await loadText(await f.text(),f.name);}catch(err){$('loadStatus').textContent=`CSV error: ${err.message}`;}});
  $('analyse').addEventListener('click',analyse);
  $('variable').addEventListener('change',()=>{if(records)analyse();});
  $('alpha').addEventListener('change',()=>{if(records)analyse();});
  $('permute').addEventListener('click',permutation);
  $('csvDownload').addEventListener('click',downloadTable);
  $('runTests').addEventListener('click',testSuite);
  $('quickTest').addEventListener('click',()=>{testSuite();$('checks').scrollIntoView({behavior:'smooth'});});
}
if(typeof document!=='undefined') wire();
if(typeof module!=='undefined')module.exports={csvFields,parseUnswCsv,groupCategories,analyseMatrix,chiSquareSurvival,rng,shuffledStatistic,testSuite};
