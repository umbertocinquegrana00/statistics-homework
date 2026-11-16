'use strict';

// Statistics Homework 3. Deterministic pseudorandomness is used only for reproducibility.
const Homework3Core = (() => {
  function mulberry32(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function parameters(model, p) {
    if (model === 'rademacher') return { mu: 0, variance: 1 };
    if (model === 'bernoulli' && p > 0 && p < 1) return { mu: p, variance: p * (1 - p) };
    throw new RangeError('Unknown model or invalid Bernoulli probability');
  }

  function increment(model, p, random) {
    const u = random();
    return model === 'rademacher' ? (u < 0.5 ? 1 : -1) : (u < p ? 1 : 0);
  }

  function checkpoints(n) {
    const values = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, n];
    return [...new Set(values.filter(v => v <= n))].sort((a, b) => a - b);
  }

  // Every row represents one attacker and every column one system (zero-indexed).
  function simulate({model, p, n, m, seed}) {
    if (!Number.isInteger(n) || n < 1 || !Number.isInteger(m) || m < 2 ||
        n * m > 3000000 || !Number.isInteger(seed)) throw new RangeError('Invalid experiment size or seed');
    const {mu, variance} = parameters(model, p);
    const rng = mulberry32(seed);
    const paths = new Array(m);
    for (let attacker = 0; attacker < m; attacker++) {
      const path = new Int32Array(n);
      let score = 0;
      for (let i = 0; i < n; i++) {
        score += increment(model, p, rng);
        path[i] = score;
      }
      paths[attacker] = path;
    }
    return {model, p, n, m, seed, mu, variance, paths, points: checkpoints(n)};
  }

  function summarize(values) {
    // Welford's recurrence: unbiased sample variance across m attackers.
    let count = 0, mean = 0, M2 = 0;
    for (const value of values) {
      count++;
      const delta = value - mean;
      mean += delta / count;
      M2 += delta * (value - mean);
    }
    return {mean, variance: count > 1 ? M2 / (count - 1) : NaN};
  }

  function quantityValue(sum, t, quantity) {
    return quantity === 'average' ? sum / t : quantity === 'scaled' ? sum / Math.sqrt(t) : sum;
  }

  function theory(t, quantity, mu, variance) {
    if (quantity === 'average') return {mean:mu, variance:variance / t};
    if (quantity === 'scaled') return {mean:Math.sqrt(t) * mu, variance};
    return {mean:t * mu, variance:t * variance};
  }

  function valuesAt(sim, t, quantity = 'total') {
    return sim.paths.map(path => quantityValue(path[t - 1], t, quantity));
  }

  function atCheckpoints(sim) {
    return sim.points.map(t => {
      const sums = valuesAt(sim, t);
      const summary = summarize(sums);
      return {t, mean:summary.mean, variance:summary.variance,
        avgMean: summary.mean / t, avgVariance: summary.variance / (t * t),
        scaledVariance: summary.variance / t};
    });
  }

  function llnProbability(sim, t, epsilon) {
    const outside = sim.paths.reduce((count, path) =>
      count + (Math.abs(path[t - 1] / t - sim.mu) >= epsilon ? 1 : 0), 0);
    return {empirical:outside / sim.m, chebyshev:Math.min(1, sim.variance / (t * epsilon * epsilon))};
  }

  function standardized(sim, t) {
    const denominator = Math.sqrt(t * sim.variance);
    return sim.paths.map(path => (path[t - 1] - t * sim.mu) / denominator);
  }

  const normalDensity = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);

  return {mulberry32, parameters, increment, checkpoints, simulate, summarize,
    quantityValue, theory, valuesAt, atCheckpoints, llnProbability, standardized, normalDensity};
})();

// Node-based verification is possible without a browser or additional packages.
if (typeof module !== 'undefined' && module.exports) module.exports = Homework3Core;

if (typeof document !== 'undefined') {
  const C = Homework3Core;
  const $ = id => document.getElementById(id);
  const palette = ['#75ded8', '#a497ff', '#ebbd80', '#7fa7ff', '#e8a0cd', '#8ad59a',
    '#b4b4e4', '#df9a8b', '#9ca9cb', '#75c9d9', '#d9af7c', '#b6dcb0'];
  let current = null;
  let rows = [];

  function fmt(x, digits = 4) {
    return Number.isFinite(x) ? Number(x).toLocaleString('en-US', {maximumFractionDigits:digits}) : '—';
  }
  function validateInput(id, min, max, integer = false) {
    const raw = $(id).value.trim();
    if (!raw) throw new Error(`Please enter ${id}.`);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new Error(`${id} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
    }
    return value;
  }

  function plotLine(series, opts = {}) {
    const width = 760, height = opts.height || 290;
    const L = 60, R = 19, T = 25, B = 39;
    const {xMin, xMax, yMin, yMax} = opts;
    const spanX = (xMax - xMin) || 1, spanY = (yMax - yMin) || 1;
    const xx = x => L + (x - xMin) / spanX * (width - L - R);
    const yy = y => T + (yMax - y) / spanY * (height - T - B);
    let out = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${opts.label || 'Statistical plot'}">`;
    for (let i = 0; i <= 4; i++) {
      const y = yMin + (yMax - yMin) * i / 4;
      out += `<line x1="${L}" y1="${yy(y)}" x2="${width - R}" y2="${yy(y)}" stroke="#32445e" stroke-dasharray="3 5"/>`;
      out += `<text x="${L - 8}" y="${yy(y) + 4}" fill="#a5bad4" text-anchor="end" font-size="11">${fmt(y, 3)}</text>`;
    }
    for (let i = 0; i <= 4; i++) {
      const x = xMin + spanX * i / 4;
      out += `<text x="${xx(x)}" y="${height - 13}" fill="#a5bad4" text-anchor="middle" font-size="11">${fmt(x, 0)}</text>`;
    }
    for (const item of series) {
      if (!item.points.length) continue;
      const d = item.points.map(([x,y],i) => `${i?'L':'M'}${xx(x).toFixed(2)},${yy(y).toFixed(2)}`).join(' ');
      out += `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${item.width || 2}" ${item.dash ? 'stroke-dasharray="6 5"' : ''} opacity="${item.opacity || 1}"/>`;
    }
    out += `<text x="${width / 2}" y="${height - 1}" text-anchor="middle" fill="#9cb3ce" font-size="11">${opts.xLabel || 'Systems / step'}</text></svg>`;
    return out;
  }

  function lineRange(series, extra = []) {
    const values = series.flatMap(s => s.points.map(p=>p[1])).concat(extra).filter(Number.isFinite);
    const min = Math.min(...values), max = Math.max(...values);
    const margin = Math.max((max-min)*0.1, Math.abs(max)*0.04, 0.06);
    return [min-margin, max+margin];
  }

  function histogram(values, {standardNormal=false, label='Histogram'}={}) {
    const bins = 25;
    const min = standardNormal ? -4 : Math.min(...values), max = standardNormal ? 4 : Math.max(...values);
    const xMin = min === max ? min - 1 : min, xMax = min === max ? max + 1 : max;
    const step = (xMax - xMin) / bins;
    const counts = new Array(bins).fill(0);
    let included = 0;
    for (const value of values) {
      if (value < xMin || value > xMax) continue;
      counts[Math.min(bins - 1, Math.floor((value-xMin)/step))]++;
      included++;
    }
    const densities = counts.map(v => v / (values.length * step));
    const theoreticalMax = standardNormal ? C.normalDensity(0) : 0;
    const ymax = Math.max(theoreticalMax, ...densities, 0.01) * 1.17;
    const W=760,H=245,L=53,R=20,T=15,B=35;
    const xx = x=>L+(x-xMin)/(xMax-xMin)*(W-L-R);
    const yy = y=>T+(ymax-y)/ymax*(H-T-B);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">`;
    for(let j=0;j<=4;j++) {
      const y=j*ymax/4;
      svg+=`<line x1="${L}" x2="${W-R}" y1="${yy(y)}" y2="${yy(y)}" stroke="#32445e" stroke-dasharray="3 5"/><text x="${L-7}" y="${yy(y)+4}" text-anchor="end" font-size="10" fill="#a5bad4">${fmt(y,2)}</text>`;
      const x=xMin+(xMax-xMin)*j/4;
      svg+=`<text x="${xx(x)}" y="${H-11}" text-anchor="middle" font-size="11" fill="#a5bad4">${fmt(x,2)}</text>`;
    }
    densities.forEach((y,i)=>{
      const bx=xx(xMin+i*step)+1, bw=Math.max(1,xx(xMin+(i+1)*step)-xx(xMin+i*step)-2);
      svg+=`<rect x="${bx}" y="${yy(y)}" width="${bw}" height="${Math.max(0,yy(0)-yy(y))}" fill="#75ded8" opacity=".78"/>`;
    });
    if (standardNormal) {
      const pts=Array.from({length:161},(_,i)=>{const x=xMin+(xMax-xMin)*i/160; return [x,C.normalDensity(x)];});
      const path=pts.map(([x,y],i)=>`${i?'L':'M'}${xx(x).toFixed(2)},${yy(y).toFixed(2)}`).join(' ');
      svg+=`<path d="${path}" fill="none" stroke="#a497ff" stroke-width="3"/>`;
    }
    svg+='</svg>';
    return svg;
  }

  function renderTrajectory() {
    const kind=$('quantity').value;
    const maxLines=Math.min(current.m,12);
    const series=[];
    const stride=Math.max(1,Math.ceil(current.n/350));
    for(let j=0;j<maxLines;j++) {
      const points=[];
      for(let i=0;i<current.n;i+=stride) points.push([i+1,C.quantityValue(current.paths[j][i],i+1,kind)]);
      if (points[points.length-1][0]!==current.n) points.push([current.n,C.quantityValue(current.paths[j][current.n-1],current.n,kind)]);
      series.push({points,color:palette[j],width:1.7,opacity:.76});
    }
    const expectation=Array.from({length:Math.min(350,current.n)},(_,i)=>{
      const t=1+Math.round((current.n-1)*i/(Math.min(350,current.n)-1 || 1));
      return [t,C.theory(t,kind,current.mu,current.variance).mean];
    });
    series.push({points:expectation,color:'#a497ff',width:3,dash:true});
    const [yMin,yMax]=lineRange(series);
    $('trajectoryPlot').innerHTML=plotLine(series,{xMin:1,xMax:current.n,yMin,yMax,label:'Sample random walks and theoretical expectation'});
    $('trajectoryTitle').textContent={total:'Total score Sₜ',average:'Average score Sₜ/t',scaled:'Normalised total score Sₜ/√t'}[kind];
    renderStep();
  }

  function renderStep() {
    const t=Number($('stepSlider').value);
    const kind=$('quantity').value;
    const vals=C.valuesAt(current,t,kind);
    const observed=C.summarize(vals);
    const reference=C.theory(t,kind,current.mu,current.variance);
    const avgAbs=C.valuesAt(current,t,'average').reduce((sum,x)=>sum+Math.abs(x-current.mu),0)/current.m;
    $('stepText').textContent=`${t} / ${current.n}`;
    $('stepMean').textContent=fmt(observed.mean);
    $('stepVariance').textContent=fmt(observed.variance,6);
    $('stepDeviation').textContent=fmt(avgAbs,5);
    $('expectedMean').textContent=`Theoretical: ${fmt(reference.mean)}`;
    $('expectedVariance').textContent=`Theoretical: ${fmt(reference.variance,6)}`;
    $('stepHistogram').innerHTML=histogram(vals,{label:'Empirical distribution of score across attackers'});
  }

  function renderMoments() {
    const kinds=[['varianceTotal',r=>r.variance,t=>t*current.variance],
      ['varianceAverage',r=>r.avgVariance,t=>current.variance/t],
      ['varianceScaled',r=>r.scaledVariance,t=>current.variance]];
    for (const [id,empirical,theoretical] of kinds) {
      const series=[{points:rows.map(r=>[r.t,empirical(r)]),color:'#75ded8',width:2.5},
        {points:rows.map(r=>[r.t,theoretical(r.t)]),color:'#a497ff',dash:true,width:2.5}];
      const [yMin,yMax]=lineRange(series);
      $(id).innerHTML=plotLine(series,{xMin:1,xMax:current.n,yMin:Math.max(0,yMin),yMax,height:245,label:'Variance against number of systems'});
    }
    $('momentsBody').innerHTML=rows.map(r=>{
      return `<tr><td>${r.t}</td><td>${fmt(r.avgMean,5)} / ${fmt(current.mu,5)}</td>`+
        `<td>${fmt(r.variance,5)} / ${fmt(r.t*current.variance,5)}</td>`+
        `<td>${fmt(r.avgVariance,6)} / ${fmt(current.variance/r.t,6)}</td>`+
        `<td>${fmt(r.scaledVariance,5)} / ${fmt(current.variance,5)}</td></tr>`;
    }).join('');
  }

  function renderLLN() {
    try {
      const epsilon=validateInput('epsilon',0.01,2);
      const stats=rows.map(row=>({t:row.t,...C.llnProbability(current,row.t,epsilon)}));
      const series=[{points:stats.map(r=>[r.t,r.empirical]),color:'#75ded8',width:3},
        {points:stats.map(r=>[r.t,r.chebyshev]),color:'#a497ff',dash:true,width:2.5}];
      $('llnPlot').innerHTML=plotLine(series,{xMin:1,xMax:current.n,yMin:0,yMax:1.04,height:255,label:'Probability of a deviation from the mean and Chebyshev bound'});
    } catch(error) { $('runStatus').textContent=error.message; }
  }

  function renderCLT() {
    const t=Number($('cltStep').value);
    const values=C.standardized(current,t);
    const sample=C.summarize(values);
    const coverage=values.filter(x=>Math.abs(x)<=1.96).length / values.length;
    $('cltPlot').innerHTML=histogram(values,{standardNormal:true,label:'Standardized sums and standard normal density'});
    $('cltMean').textContent=fmt(sample.mean);
    $('cltVariance').textContent=fmt(sample.variance);
    $('cltCoverage').textContent=fmt(100*coverage,2)+'%';
  }

  function renderAggregates() {
    const sums=C.valuesAt(current,current.n);
    const sample=C.summarize(sums);
    const aggregate=sums.reduce((a,b)=>a+b,0);
    const data=[
      ['Single attacker: E[Sₙ]',sample.mean,current.n*current.mu],
      ['Single attacker: Var(Sₙ)',sample.variance,current.n*current.variance],
      ['Aggregate ΣⱼSₙ⁽ʲ⁾',aggregate,current.m*current.n*current.mu],
      ['Aggregate variance (independent attackers)','—',current.m*current.n*current.variance]
    ];
    $('aggregateRows').innerHTML=data.map(([label,sim,theory])=>`<tr><td>${label}</td><td>${typeof sim==='number'?fmt(sim,4):sim}</td><td>${fmt(theory,4)}</td></tr>`).join('');
  }

  function run() {
    const button=$('run');
    try {
      const model=$('modelSelect').value;
      const p=validateInput('probability',.01,.99);
      const n=validateInput('systems',20,2000,true);
      const m=validateInput('attackers',20,3000,true);
      const seed=validateInput('seed',0,4294967295,true);
      if(n*m>3000000) throw new Error('Choose n × m ≤ 3,000,000 to keep the browser responsive.');
      button.disabled=true; $('runStatus').textContent='Simulating independent trajectories…';
      current=C.simulate({model,p,n,m,seed});
      rows=C.atCheckpoints(current);
      $('topN').textContent=fmt(n,0);$('topM').textContent=fmt(m,0);
      $('topVar').textContent=fmt(current.variance,4);
      $('topModel').textContent=model==='bernoulli'?`Bernoulli, p = ${fmt(p,2)}`:'Rademacher, p(+1) = 0.5';
      $('stepSlider').max=n;$('stepSlider').value=n;
      $('cltStep').innerHTML=current.points.filter(t=>t>=2).map(t=>`<option value="${t}" ${t===n?'selected':''}>n = ${t}</option>`).join('');
      renderTrajectory(); renderMoments(); renderLLN(); renderCLT(); renderAggregates();
      $('runStatus').textContent=`Completed: ${fmt(m,0)} independent trajectories × ${fmt(n,0)} systems, seed ${seed}.`;
    } catch(error) { $('runStatus').textContent=error.message; $('runStatus').classList.add('error'); }
    finally { button.disabled=false; }
  }

  function near(a,b,tolerance=1e-10){return Math.abs(a-b)<=tolerance;}
  function referenceTests() {
    const tests=[];
    const test=(label,fn)=>{let good=false;try{good=Boolean(fn());}catch(_){}tests.push({label,good});};
    const a=C.mulberry32(481),b=C.mulberry32(481);
    test('Seeded generator reproduces identical sequences',()=>Array.from({length:100},()=>a()===b()).every(Boolean));
    const r=C.mulberry32(47);
    test('PRNG output belongs to [0,1)',()=>Array.from({length:1000},()=>{const v=r();return v>=0&&v<1;}).every(Boolean));
    test('Bernoulli increments have support {0,1}',()=>{const r=C.mulberry32(12);return Array.from({length:300},()=>C.increment('bernoulli',.3,r)).every(x=>x===0||x===1);});
    test('Rademacher increments have support {−1,+1}',()=>{const r=C.mulberry32(12);return Array.from({length:300},()=>C.increment('rademacher',.3,r)).every(x=>x===-1||x===1);});
    test('Single-step Bernoulli moments are p and p(1-p)',()=>{const x=C.parameters('bernoulli',.3);return near(x.mu,.3)&&near(x.variance,.21);});
    test('Single-step Rademacher moments are 0 and 1',()=>{const x=C.parameters('rademacher',.9);return x.mu===0&&x.variance===1;});
    test('Mean/variance of [2,4,6,8,10] are 6 and 10',()=>{const x=C.summarize([2,4,6,8,10]);return near(x.mean,6)&&near(x.variance,10);});
    test('Constant-valued samples have variance zero',()=>C.summarize([5,5,5,5]).variance===0);
    test('Variance scaling follows n, 1/n and constant',()=>{
      const total=C.theory(40,'total',.3,.21),avg=C.theory(40,'average',.3,.21),scaled=C.theory(40,'scaled',.3,.21);
      return near(total.variance,8.4)&&near(avg.variance,.21/40)&&near(scaled.variance,.21);
    });
    const x=C.simulate({model:'rademacher',p:.3,n:50,m:50,seed:123}),y=C.simulate({model:'rademacher',p:.3,n:50,m:50,seed:123});
    test('Identical seeds produce identical attacker trajectories',()=>x.paths.every((path,j)=>path.every((v,i)=>v===y.paths[j][i])));
    test('All simulated paths start from sums of allowed increments',()=>x.paths.every(path=>path.every((v,i)=>i===0?Math.abs(v)===1:Math.abs(v-path[i-1])===1)));
    test('Rademacher parity: Sₙ and n have same parity',()=>x.paths.every(path=>path.every((v,i)=>((v-(i+1))%2)===0)));
    test('Rademacher empirical mean after enough trials is near zero',()=>{
      const big=C.simulate({model:'rademacher',p:.3,n:100,m:2000,seed:7});
      return Math.abs(C.summarize(C.valuesAt(big,100,'average')).mean)<.025;
    });
    test('Chebyshev bound is always in [0,1]',()=>{
      const bound=C.llnProbability(x,20,.2);return bound.chebyshev>=0&&bound.chebyshev<=1;
    });
    test('Rademacher Zₙ = Sₙ / √n',()=>x.paths.every((path,i)=>near(C.standardized(x,50)[i],path[49]/Math.sqrt(50))));
    test('Bernoulli standardization is correctly centred',()=>{
      const z=C.simulate({model:'bernoulli',p:.3,n:5,m:10,seed:123});
      return z.paths.every((path,i)=>near(C.standardized(z,5)[i],(path[4]-1.5)/Math.sqrt(1.05)));
    });
    const ok=tests.filter(t=>t.good).length;
    $('testSummary').textContent=`${ok} / ${tests.length} reference checks passed${ok===tests.length?' — all checks successful.':'. Review any failed checks.'}`;
    $('testResults').textContent=tests.map(t=>`${t.good?'PASS':'FAIL'} · ${t.label}`).join('\n');
    $('testResults').style.color=ok===tests.length?'#8be0b5':'#ffaaaa';
  }

  $('run').addEventListener('click',run);
  $('modelSelect').addEventListener('change',()=>{
    $('probability').disabled=$('modelSelect').value==='rademacher';
    $('probability').title=$('probability').disabled?'Rademacher uses P(+1)=1/2; p applies only to Bernoulli.':'';
  });
  $('quantity').addEventListener('change',()=>current&&renderTrajectory());
  $('stepSlider').addEventListener('input',()=>current&&renderStep());
  $('epsilon').addEventListener('change',()=>current&&renderLLN());
  $('updateEpsilon').addEventListener('click',()=>current&&renderLLN());
  $('cltStep').addEventListener('change',()=>current&&renderCLT());
  $('testRun').addEventListener('click',referenceTests);
  run();
}
