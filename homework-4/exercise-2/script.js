'use strict';

// Statistics Homework 4, Exercise 2.
// Scores are discrete and bounded: every draw is independent and uses this fixed PMF.
const DISTRIBUTION = Object.freeze([
  { score: 0, probability: 0.05 },
  { score: 2, probability: 0.10 },
  { score: 4, probability: 0.20 },
  { score: 6, probability: 0.30 },
  { score: 8, probability: 0.25 },
  { score: 10, probability: 0.10 }
]);
const SAMPLE_SIZES = Object.freeze([2, 5, 10, 30, 100, 300]);
const THEORETICAL_MEAN = DISTRIBUTION.reduce((sum, item) => sum + item.score * item.probability, 0);
const SECOND_MOMENT = DISTRIBUTION.reduce((sum, item) => sum + item.score ** 2 * item.probability, 0);
const THEORETICAL_VARIANCE = SECOND_MOMENT - THEORETICAL_MEAN ** 2;
const FOURTH_CENTRAL_MOMENT = DISTRIBUTION.reduce(
  (sum, item) => sum + item.probability * (item.score - THEORETICAL_MEAN) ** 4, 0
);

// For n >= 2 and independent identically distributed observations:
// E[M2/(n-1)] = sigma^2; E[M2/n] = (n-1)/n * sigma^2.
function expectedBiasedVariance(n) {
  return THEORETICAL_VARIANCE * (n - 1) / n;
}

// Exact sampling variance of the unbiased sample variance (finite fourth moment).
function theoreticalVarianceEstimatorSD(n) {
  const v = (FOURTH_CENTRAL_MOMENT - (n - 3) / (n - 1) * THEORETICAL_VARIANCE ** 2) / n;
  return Math.sqrt(Math.max(0, v));
}

// Xorshift32 gives reproducible pseudo-random draws. Not suitable for cryptography.
function randomGenerator(seed) {
  let state = (seed >>> 0) || 0x6D2B79F5;
  return function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function drawScore(random) {
  const u = random();
  let cumulative = 0;
  for (const item of DISTRIBUTION) {
    cumulative += item.probability;
    if (u < cumulative) return item.score;
  }
  // Protect against rounding of cumulative floating-point probabilities.
  return DISTRIBUTION[DISTRIBUTION.length - 1].score;
}

// Welford's recurrence: only three update statements after incrementing the count.
function welford(scores, keepSteps = false) {
  let n = 0;
  let mean = 0;
  let M2 = 0;
  const steps = keepSteps ? [] : null;
  for (const x of scores) {
    n++;
    const delta = x - mean;
    mean += delta / n;
    M2 += delta * (x - mean);
    if (keepSteps) {
      steps.push({ n, score: x, mean, M2, variance: n > 1 ? M2 / (n - 1) : NaN });
    }
  }
  return { mean, M2, variance: n > 1 ? M2 / (n - 1) : NaN, steps };
}

// Independent reference calculation: compute mean, then deviations from that mean.
function twoPass(scores) {
  const n = scores.length;
  if (n === 0) return { mean: NaN, variance: NaN };
  const mean = scores.reduce((sum, x) => sum + x, 0) / n;
  const M2 = scores.reduce((sum, x) => sum + (x - mean) ** 2, 0);
  return { mean, variance: n > 1 ? M2 / (n - 1) : NaN };
}

// The SD reported across hackers is the descriptive population SD of the m estimates.
// It measures the observed Monte Carlo spread, not another unbiased variance estimator.
function descriptiveSD(values) {
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function simulate(m, n, seed, retainScores = true) {
  const random = randomGenerator(seed);
  const means = [];
  const variances = [];
  const biasedVariances = [];
  const hackers = retainScores ? [] : null;
  for (let hacker = 0; hacker < m; hacker++) {
    const scores = Array.from({ length: n }, () => drawScore(random));
    const result = welford(scores);
    means.push(result.mean);
    variances.push(result.variance);
    biasedVariances.push(result.M2 / n);
    if (retainScores) hackers.push(scores);
  }
  return {
    m, n, seed, hackers, means, variances, biasedVariances,
    averageMean: means.reduce((sum, value) => sum + value, 0) / m,
    averageVariance: variances.reduce((sum, value) => sum + value, 0) / m,
    averageBiasedVariance: biasedVariances.reduce((sum, value) => sum + value, 0) / m,
    sdMean: descriptiveSD(means),
    sdVariance: descriptiveSD(variances)
  };
}

const $ = id => document.getElementById(id);
const fmt = (value, digits = 4) => Number.isFinite(value) ? value.toFixed(digits) : '—';
let currentExperiment = null;
let compared = null;

function showError(message) {
  $('input-error').textContent = message;
  $('input-error').hidden = !message;
}

function settings() {
  const m = Number($('hackers').value);
  const n = Number($('systems').value);
  const seed = Number($('seed').value);
  if (!Number.isInteger(m) || m < 10 || m > 2000) throw new Error('m must be an integer between 10 and 2000.');
  if (!Number.isInteger(n) || n < 2 || n > 1000) throw new Error('n must be an integer between 2 and 1000.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Seed must be an integer between 0 and 4294967295.');
  return { m, n, seed };
}

function cell(row, content) {
  const td = document.createElement('td');
  td.textContent = content;
  row.appendChild(td);
  return td;
}

function setRows(tbodyId, rows) {
  const body = $(tbodyId);
  body.replaceChildren(...rows);
}

function renderDistribution() {
  const rows = DISTRIBUTION.map(({ score, probability }) => {
    const tr = document.createElement('tr');
    cell(tr, String(score));
    cell(tr, probability.toFixed(2));
    return tr;
  });
  setRows('distribution-table', rows);
  $('theory-mean').textContent = fmt(THEORETICAL_MEAN, 2);
  $('theory-variance').textContent = fmt(THEORETICAL_VARIANCE, 2);
  $('metric-mu').textContent = fmt(THEORETICAL_MEAN, 2);
  $('metric-sigma').textContent = fmt(THEORETICAL_VARIANCE, 2);
}

// Responsive SVG charts with no third-party charting dependency.
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes = {}, content) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  if (content !== undefined) element.textContent = String(content);
  return element;
}

function chartBase(containerId, empty = 'Run the experiment to see the chart.') {
  const container = $(containerId);
  container.replaceChildren();
  const svg = svgElement('svg', { viewBox: '0 0 520 260', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  container.appendChild(svg);
  if (empty) {
    const message = document.createElement('div');
    message.className = 'chart-empty';
    message.textContent = empty;
    container.replaceChildren(message);
    return null;
  }
  return svg;
}

function axes(svg, low, high, maxY, formatX = value => fmt(value, 1)) {
  const x0 = 49, x1 = 499, y0 = 213, y1 = 17;
  const x = value => x0 + (value - low) / (high - low) * (x1 - x0);
  const y = value => y0 - value / maxY * (y0 - y1);
  for (let i = 0; i <= 4; i++) {
    const value = maxY * i / 4;
    const yy = y(value);
    svg.appendChild(svgElement('line', { x1:x0, y1:yy, x2:x1, y2:yy, class:'gridline' }));
    svg.appendChild(svgElement('text', { x:42, y:yy + 4, 'text-anchor':'end' }, fmt(value, value < 2 ? 2 : 0)));
    const xv = low + (high - low) * i / 4;
    svg.appendChild(svgElement('text', { x:x(xv), y:238, 'text-anchor':'middle' }, formatX(xv)));
  }
  return { x, y, x0, x1, y0, y1 };
}

function histogram(containerId, values, target, color) {
  if (!values || values.length === 0) return chartBase(containerId);
  const bins = 22;
  const min = Math.min(target, ...values);
  const max = Math.max(target, ...values);
  const padding = Math.max((max - min) * 0.08, 0.15);
  const low = min - padding, high = max + padding;
  const counts = Array(bins).fill(0);
  for (const value of values) {
    const index = Math.min(bins - 1, Math.max(0, Math.floor((value - low) / (high - low) * bins)));
    counts[index]++;
  }
  const svg = chartBase(containerId, '');
  const { x, y, y0 } = axes(svg, low, high, Math.max(1, ...counts) * 1.1);
  const binWidth = (high - low) / bins;
  counts.forEach((count, index) => {
    const left = low + index * binWidth;
    const top = y(count);
    svg.appendChild(svgElement('rect', { x:x(left)+1, y:top, width:Math.max(1, x(left+binWidth)-x(left)-2), height:y0-top, rx:2, fill:color, opacity:0.84 }));
  });
  svg.appendChild(svgElement('line', { x1:x(target), y1:17, x2:x(target), y2:y0, class:'target-line' }));
  svg.appendChild(svgElement('text', { x:Math.max(72, Math.min(475, x(target) + 5)), y:13, fill:'#73e4aa' }, 'theory'));
}

function lineChart(containerId, rows, key, color, referenceKey = null) {
  if (!rows || rows.length === 0) return chartBase(containerId);
  const maxY = Math.max(0.001, ...rows.map(r => r[key]), ...(referenceKey ? rows.map(r => r[referenceKey]) : [])) * 1.15;
  const svg = chartBase(containerId, '');
  const { x, y } = axes(svg, 0, rows.length - 1, maxY, pos => {
    const index = Math.round(pos);
    return rows[index] ? String(rows[index].n) : '';
  });
  const path = field => rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(row[field])}`).join(' ');
  if (referenceKey) svg.appendChild(svgElement('path', { d:path(referenceKey), class:'plot-line', stroke:'#73e4aa', 'stroke-dasharray':'5 4', 'stroke-width':1.6 }));
  svg.appendChild(svgElement('path', { d:path(key), class:'plot-line', stroke:color }));
  rows.forEach((row,index) => {
    const dot = svgElement('circle', { cx:x(index), cy:y(row[key]), r:4, fill:color });
    dot.appendChild(svgElement('title', {}, `n=${row.n}, ${key}=${fmt(row[key], 5)}`));
    svg.appendChild(dot);
  });
}

function renderTrajectory() {
  if (!currentExperiment) return;
  const index = Number($('hacker-index').value);
  const scores = currentExperiment.hackers[index];
  const result = welford(scores, true);
  const rows = result.steps.map(step => {
    const tr = document.createElement('tr');
    [step.n, step.score, fmt(step.mean), fmt(step.M2), fmt(step.variance)].forEach(value => cell(tr, String(value)));
    return tr;
  });
  setRows('trajectory-body', rows);
  $('trajectory-note').textContent = `Hacker ${index+1}: ${scores.length} scores, final mean ${fmt(result.mean)}, final s² ${fmt(result.variance)}.`;
  const direct = twoPass(scores);
  const close = (a,b) => Math.abs(a-b) <= 1e-10 * Math.max(1,Math.abs(a),Math.abs(b));
  $('check-mean').textContent = fmt(result.mean, 6);
  $('check-direct-mean').textContent = fmt(direct.mean, 6);
  $('check-variance').textContent = fmt(result.variance, 6);
  $('check-status').textContent = close(result.mean,direct.mean) && close(result.variance,direct.variance) ? 'PASS' : 'CHECK FAILED';
  $('check-status').className = $('check-status').textContent === 'PASS' ? 'test-pass' : 'test-fail';
}

function renderExperiment(result) {
  currentExperiment = result;
  $('metric-mean').textContent = fmt(result.averageMean);
  $('metric-variance').textContent = fmt(result.averageVariance);
  $('metric-sdmean').textContent = fmt(result.sdMean);
  $('metric-sdvariance').textContent = fmt(result.sdVariance);
  $('metric-biased').textContent = fmt(result.averageBiasedVariance);
  $('theory-biased').textContent = fmt(expectedBiasedVariance(result.n));
  $('theoretical-sdmean').textContent = fmt(Math.sqrt(THEORETICAL_VARIANCE / result.n));
  $('mean-error').textContent = fmt(result.averageMean - THEORETICAL_MEAN);
  $('variance-error').textContent = fmt(result.averageVariance - THEORETICAL_VARIANCE);
  $('actual-m').textContent = String(result.m);
  $('actual-n').textContent = String(result.n);
  const select = $('hacker-index');
  select.replaceChildren();
  for (let i = 0; i < result.m; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `Hacker ${i + 1}`;
    select.appendChild(option);
  }
  select.disabled = false;
  $('download-btn').disabled = false;
  $('run-status').textContent = 'COMPLETED';
  histogram('means-histogram', result.means, THEORETICAL_MEAN, '#4ddbd2');
  histogram('variance-histogram', result.variances, THEORETICAL_VARIANCE, '#9d8cff');
  renderTrajectory();
}

function runExperiment() {
  try {
    const input = settings();
    showError('');
    renderExperiment(simulate(input.m, input.n, input.seed));
  } catch(error) {
    showError(error.message);
  }
}

function renderComparison() {
  const tbodyRows = compared.map(row => {
    const tr = document.createElement('tr');
    [row.n, fmt(row.averageMean), fmt(THEORETICAL_MEAN,2), fmt(row.sdMean), fmt(row.theorySdMean), fmt(row.averageVariance), fmt(THEORETICAL_VARIANCE,2), fmt(row.sdVariance), fmt(row.theorySdVariance)].forEach(value => cell(tr, String(value)));
    return tr;
  });
  setRows('comparison-body', tbodyRows);
  lineChart('sd-means-chart', compared, 'sdMean', '#4ddbd2', 'theorySdMean');
  lineChart('sd-variances-chart', compared, 'sdVariance', '#9d8cff', 'theorySdVariance');
  renderBiasComparison();
}


function renderBiasComparison() {
  if (!compared) return;
  const rows = compared.map(row => {
    const tr = document.createElement('tr');
    [row.n, fmt(row.averageVariance), fmt(THEORETICAL_VARIANCE),
      fmt(row.averageBiasedVariance), fmt(expectedBiasedVariance(row.n)),
      fmt(row.averageBiasedVariance - THEORETICAL_VARIANCE)].forEach(value => cell(tr, String(value)));
    return tr;
  });
  setRows('bias-body', rows);
}

function compareSizes() {
  try {
    const {m,seed} = settings();
    showError('');
    // Distinct deterministic random streams per sample size (not reused observations).
    compared = SAMPLE_SIZES.map((n, i) => {
      const result = simulate(m, n, (seed + Math.imul(i + 1, 2654435761)) >>> 0, false);
      return { ...result, theorySdMean: Math.sqrt(THEORETICAL_VARIANCE / n), theorySdVariance: theoreticalVarianceEstimatorSD(n) };
    });
    renderComparison();
  } catch(error) {
    showError(error.message);
    $('simulation').scrollIntoView({behavior:'smooth'});
  }
}

function approx(a,b,tolerance = 1e-11) {
  return Math.abs(a-b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

function runSelfTests() {
  const tests = [];
  const check = (name, purpose, callback) => {
    let passed = false;
    try { passed = Boolean(callback()); } catch { passed = false; }
    tests.push({name,purpose,passed});
  };
  check('Probability model', 'Probabilities sum to one', () => approx(DISTRIBUTION.reduce((s,x)=>s+x.probability,0),1));
  check('Population moments', 'E[X] = 5.8, Var(X) = 6.76', () => approx(THEORETICAL_MEAN,5.8) && approx(THEORETICAL_VARIANCE,6.76));
  check('Known sample', '[2, 4, 6, 8, 10] → x̄=6, SS=40, s²=10', () => { const r=welford([2,4,6,8,10]); return approx(r.mean,6)&&approx(r.M2,40)&&approx(r.variance,10); });
  check('Constant sample', 'No variation → s²=0', () => { const r=welford([6,6,6,6]); return approx(r.mean,6)&&approx(r.variance,0); });
  check('Two observations', '[4, 8] → x̄=6, s²=8', () => { const r=welford([4,8]); return approx(r.mean,6)&&approx(r.variance,8); });
  check('Single observation', 'Sample variance must be undefined', () => Number.isNaN(welford([6]).variance));
  check('Step-by-step recurrence', 'Each prefix matches independent two-pass computation', () => {
    const scores=[0,10,4,8,2,6,10,0,8];
    const steps=welford(scores,true).steps;
    return steps.every((step,i)=>{
      const direct=twoPass(scores.slice(0,i+1));
      return approx(step.mean,direct.mean) && (i===0 ? Number.isNaN(step.variance) : approx(step.variance,direct.variance));
    });
  });
  check('Seed reproducibility', 'Same seed gives identical score sequence', () => {
    const randomA=randomGenerator(2026), randomB=randomGenerator(2026);
    return Array.from({length:100},()=>drawScore(randomA)).every(score=>score===drawScore(randomB));
  });
  check('Cross-hacker aggregates', 'Known means and variances have correct averages', () => {
    const samples=[[2,4],[6,8]];
    const stats=samples.map(scores=>welford(scores));
    const averageMean=stats.reduce((s,r)=>s+r.mean,0)/stats.length;
    const averageVariance=stats.reduce((s,r)=>s+r.variance,0)/stats.length;
    return approx(averageMean,5) && approx(averageVariance,2);
  });
  check('Bessel correction, n = 2', 'Known [2, 4] gives SS/(n-1)=2 and SS/n=1', () => { const r = welford([2,4]); return approx(r.variance,2) && approx(r.M2/2,1); });
  check('Variance bias identity', 'E[M2/n] = (n-1)/n × population variance', () => [2,5,10,30,100].every(n => approx(expectedBiasedVariance(n), (n-1)/n*THEORETICAL_VARIANCE)));
  check('Sampling mean theoretical SD', 'SD(sample mean) = σ/√n', () => [2,5,30,100].every(n => approx(Math.sqrt(THEORETICAL_VARIANCE/n),Math.sqrt(THEORETICAL_VARIANCE)/Math.sqrt(n))));
  check('Variance estimator theoretical SD', 'Fourth-moment formula at n=2 matches Var[(X1-X2)^2/2]', () => { const values=[]; for(const a of DISTRIBUTION) for(const b of DISTRIBUTION) values.push({p:a.probability*b.probability,v:(a.score-b.score)**2/2}); const exp=values.reduce((z,r)=>z+r.p*r.v,0); const v=values.reduce((z,r)=>z+r.p*(r.v-exp)**2,0); return approx(Math.sqrt(v),theoreticalVarianceEstimatorSD(2)); });
  check('Seeded aggregate bias', 'Monte Carlo SS/n average follows theoretical biased expectation', () => { const r=simulate(2000,10,6789,false); return Math.abs(r.averageBiasedVariance-expectedBiasedVariance(10))<0.30 && approx(r.averageBiasedVariance,r.averageVariance*9/10); });
  check('Numerical Monte Carlo', 'Simulated mean and variance approach theory', () => {
    const result=simulate(2000,100,12345,false);
    return Math.abs(result.averageMean-THEORETICAL_MEAN)<0.12 && Math.abs(result.averageVariance-THEORETICAL_VARIANCE)<0.40;
  });
  const rows=tests.map(test=>{
    const tr=document.createElement('tr');
    cell(tr,test.name);cell(tr,test.purpose);
    const verdict=cell(tr,test.passed?'PASS':'FAIL');
    verdict.className=test.passed?'pass':'fail';
    return tr;
  });
  setRows('test-body',rows);
  const passed=tests.filter(t=>t.passed).length;
  $('test-summary').textContent=`${passed} / ${tests.length} PASS`;
  $('test-summary').className='test-summary '+(passed===tests.length?'test-pass':'test-fail');
}

function exportCSV() {
  if (!currentExperiment) return;
  const rows=[['hacker','sample_mean','sample_variance','variance_divide_by_n']];
  currentExperiment.means.forEach((mean,i)=>rows.push([i+1,mean,currentExperiment.variances[i],currentExperiment.biasedVariances[i]]));
  const csv=rows.map(row=>row.join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=`welford_m${currentExperiment.m}_n${currentExperiment.n}.csv`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function init() {
  renderDistribution();
  chartBase('means-histogram');chartBase('variance-histogram');chartBase('sd-means-chart','Compare sample sizes to see this chart.');chartBase('sd-variances-chart','Compare sample sizes to see this chart.');
  $('run-btn').addEventListener('click',runExperiment);
  $('compare-btn').addEventListener('click',compareSizes);
  $('test-btn').addEventListener('click',runSelfTests);
  $('hacker-index').addEventListener('change',renderTrajectory);
  $('download-btn').addEventListener('click',exportCSV);
  document.querySelectorAll('[data-n]').forEach(button=>button.addEventListener('click',()=>{
    $('systems').value=button.dataset.n;
    document.querySelectorAll('[data-n]').forEach(item=>item.classList.toggle('active',item===button));
  }));
  $('copy-code').addEventListener('click',async()=>{
    const code=`function welford(scores) {\n  let n = 0, mean = 0, M2 = 0;\n  for (const x of scores) {\n    n++;\n    const delta = x - mean;\n    mean += delta / n;\n    M2 += delta * (x - mean);\n  }\n  return { mean, variance: n > 1 ? M2 / (n - 1) : NaN };\n}`;
    try { await navigator.clipboard.writeText(code); $('copy-code').textContent='Copied!'; }
    catch { $('copy-code').textContent='Copy unavailable'; }
    setTimeout(()=>$('copy-code').textContent='Copy code',1800);
  });
  runExperiment();compareSizes();
}

document.addEventListener('DOMContentLoaded',init);
