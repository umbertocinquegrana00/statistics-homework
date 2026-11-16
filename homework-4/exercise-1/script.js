'use strict';

/* Statistics Homework 01 – Exercise 1
 * Welford's recurrence for the running mean and corrected sum of squares.
 * No libraries required. All statistics are computed locally in the browser.
 */

const $ = (id) => document.getElementById(id);
const DEFAULT_DATA = [4, 7, 2, 9, 5, 8, 3, 6, 10, 1, 7, 4];
const MAX_OBSERVATIONS = 250;

// Welford's algorithm: these are the three core update statements.
class Welford {
  constructor() {
    this.count = 0;
    this.mean = 0;
    this.M2 = 0;
  }
  update(x) {
    this.count++;
    const delta = x - this.mean;
    this.mean += delta / this.count;
    this.M2 += delta * (x - this.mean);
    return { n: this.count, x, delta, mean: this.mean, M2: this.M2, variance: this.sampleVariance };
  }
  get sampleVariance() {
    return this.count > 1 ? this.M2 / (this.count - 1) : NaN;
  }
}

let data = [...DEFAULT_DATA];
let calculator = new Welford();
let history = [];
let timer = null;

function format(value, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e7 || (Math.abs(value) < 1e-4 && value !== 0)) return value.toExponential(3);
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
function parseData(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter at least one numeric observation.');
  const tokens = trimmed.split(/[\s,;]+/).filter(Boolean);
  if (tokens.length > MAX_OBSERVATIONS) throw new Error(`Use up to ${MAX_OBSERVATIONS} observations to keep the step-by-step display readable.`);
  const values = tokens.map((token) => Number(token));
  if (values.some((value) => !Number.isFinite(value))) throw new Error('Every observation must be a valid finite number (e.g. 4, -2.5, 7).');
  if (values.some((value) => Math.abs(value) > 1e12)) throw new Error('For this visual demonstration, use values with an absolute magnitude no greater than 10¹².');
  return values;
}
function pause() {
  if (timer !== null) { window.clearInterval(timer); timer = null; }
  $('play-btn').textContent = '▶ Play';
}
function reset() {
  pause();
  calculator = new Welford();
  history = [];
  render();
}
function applyData() {
  try {
    const values = parseData($('dataset').value);
    data = values;
    $('dataset-error').hidden = true;
    reset();
    document.querySelectorAll('.preset').forEach((button) => button.classList.remove('active'));
  } catch (error) {
    pause();
    $('dataset-error').textContent = error.message;
    $('dataset-error').hidden = false;
  }
}
function next() {
  if (history.length >= data.length) { pause(); return; }
  const x = data[history.length];
  history.push(calculator.update(x));
  render();
  if (history.length === data.length) pause();
}
function processAll() {
  pause();
  while (history.length < data.length) {
    history.push(calculator.update(data[history.length]));
  }
  render();
}
function togglePlay() {
  if (timer !== null) { pause(); return; }
  if (history.length === data.length) reset();
  $('play-btn').textContent = 'Ⅱ Pause';
  timer = window.setInterval(next, 600);
}
function twoPassVariance(values) {
  if (values.length < 2) return NaN;
  const mean = values.reduce((sum, x) => sum + x, 0) / values.length;
  const sumOfSquares = values.reduce((sum, x) => sum + (x - mean) ** 2, 0);
  return sumOfSquares / (values.length - 1);
}
function render() {
  const n = history.length;
  const current = n ? history[n - 1] : null;
  $('metric-count').textContent = String(n);
  $('metric-count-detail').textContent = `${n} of ${data.length} processed`;
  $('metric-mean').textContent = current ? format(current.mean) : '—';
  $('metric-m2').textContent = current ? format(current.M2) : '—';
  $('metric-variance').textContent = current ? format(current.variance) : '—';
  $('last-x').textContent = current ? format(current.x) : '—';
  $('last-delta').textContent = current ? format(current.delta) : '—';
  $('last-mean').textContent = current ? format(current.mean) : '—';
  $('last-m2').textContent = current ? format(current.M2) : '—';
  $('stream-progress-text').textContent = `${n} / ${data.length}`;
  $('progress-fill').style.width = `${100 * n / data.length}%`;
  $('progressbar').setAttribute('aria-valuemax', String(data.length));
  $('progressbar').setAttribute('aria-valuenow', String(n));
  $('stream-status').textContent = n === 0 ? 'READY' : n === data.length ? 'COMPLETE' : 'STREAMING';
  $('next-btn').disabled = n === data.length;
  $('all-btn').disabled = n === data.length;
  $('export-btn').disabled = n === 0;
  $('results-body').innerHTML = n ? history.map((row) => `<tr><td>${row.n}</td><td>${format(row.x, 6)}</td><td>${format(row.delta, 6)}</td><td>${format(row.mean, 6)}</td><td>${format(row.M2, 6)}</td><td>${format(row.variance, 6)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty-table">Run the simulation to view calculations.</td></tr>';

  const classic = twoPassVariance(data.slice(0, n));
  const welford = calculator.sampleVariance;
  const diff = Math.abs(welford - classic);
  const tolerance = 1e-10 * Math.max(1, Math.abs(classic), Math.abs(welford));
  $('check-welford').textContent = format(welford, 8);
  $('check-classic').textContent = format(classic, 8);
  $('check-diff').textContent = format(diff, 9);
  $('check-status').textContent = n < 2 ? 'Needs n ≥ 2' : diff <= tolerance ? '✓ Match within tolerance' : 'Precision differs';
  $('check-status').style.color = n < 2 ? '#aabbd1' : diff <= tolerance ? '#73e4aa' : '#ffc786';
  drawChart('mean-chart', history.map((row) => ({ x: row.n, y: row.mean })), '#4ddbd2', 'running mean');
  drawChart('variance-chart', history.filter((row) => row.n >= 2).map((row) => ({ x: row.n, y: row.variance })), '#9d8cff', 'sample variance');
}
function drawChart(targetId, series, stroke, description) {
  const el = $(targetId);
  if (!series.length) {
    el.innerHTML = '<div style="height:100%;display:grid;place-items:center;color:#7890ad;font-size:12px;text-align:center;padding:20px">No data to plot yet.<br>Process observations to start.</div>';
    el.setAttribute('aria-label', `No ${description} data yet`);
    return;
  }
  // Fixed SVG coordinate space: scales responsively without external chart libraries.
  const W = 540, H = 255, l = 54, r = 16, t = 20, b = 35;
  const ys = series.map((point) => point.y);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const padding = Math.max((maxY - minY) * .18, Math.abs(maxY) * .02, .2);
  minY -= padding; maxY += padding;
  const minX = Math.min(1, series[0].x), maxX = Math.max(2, series[series.length - 1].x);
  const sx = (x) => l + (x - minX) / (maxX - minX) * (W - l - r);
  const sy = (y) => t + (maxY - y) / (maxY - minY) * (H - t - b);
  const path = series.map((point, index) => `${index ? 'L' : 'M'}${sx(point.x).toFixed(2)},${sy(point.y).toFixed(2)}`).join(' ');
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = maxY - (maxY - minY) * index / 4;
    const y = sy(value);
    return `<line x1="${l}" y1="${y}" x2="${W - r}" y2="${y}" stroke="#2b3b52" stroke-dasharray="3 5"/><text x="${l - 10}" y="${y + 4}" text-anchor="end" fill="#7e94af" font-size="11">${format(value, 2)}</text>`;
  }).join('');
  const ticks = Array.from(new Set([minX, Math.round((minX + maxX) / 2), maxX])).map((x) => `<text x="${sx(x)}" y="${H - 11}" text-anchor="middle" fill="#7e94af" font-size="11">${x}</text>`).join('');
  const last = series[series.length - 1];
  const poly = path + ` L${sx(last.x).toFixed(2)},${H - b} L${sx(series[0].x).toFixed(2)},${H - b} Z`;
  const gradientId = targetId === 'mean-chart' ? 'fill-mean' : 'fill-variance';
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stroke}" stop-opacity="0.24"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs>${grid}${ticks}<path d="${poly}" fill="url(#${gradientId})"/><path d="${path}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${sx(last.x)}" cy="${sy(last.y)}" r="5" fill="${stroke}" stroke="#101b30" stroke-width="2"/></svg>`;
  el.setAttribute('aria-label', `${description} line chart, ${series.length} plotted points, latest value ${format(last.y, 6)}`);
}
function setPreset(name) {
  const options = {
    default: DEFAULT_DATA,
    constant: Array(12).fill(5),
    large: [1000000001, 1000000002, 1000000003, 1000000004, 1000000005, 1000000006, 1000000007, 1000000008],
    random: Array.from({ length: 20 }, () => Math.floor(Math.random() * 11))
  };
  $('dataset').value = options[name].join(', ');
  applyData();
  document.querySelectorAll('.preset').forEach((button) => button.classList.toggle('active', button.dataset.preset === name));
}
function exportCSV() {
  if (!history.length) return;
  const rows = [['n', 'x', 'delta', 'mean', 'sum_of_squares_M2', 'sample_variance'], ...history.map(({ n, x, delta, mean, M2, variance }) => [n, x, delta, mean, M2, Number.isFinite(variance) ? variance : 'undefined'])];
  const text = rows.map((row) => row.join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'welford_results.csv';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
$('apply-btn').addEventListener('click', applyData);
$('reset-btn').addEventListener('click', reset);
$('next-btn').addEventListener('click', next);
$('all-btn').addEventListener('click', processAll);
$('play-btn').addEventListener('click', togglePlay);
$('dataset').addEventListener('input', () => { pause(); $('dataset-error').hidden = true; });
$('export-btn').addEventListener('click', exportCSV);
document.querySelectorAll('.preset').forEach((button) => button.addEventListener('click', () => setPreset(button.dataset.preset)));
$('copy-code').addEventListener('click', async () => {
  const snippet = `let count = 0, mean = 0, M2 = 0;\nfunction update(x) {\n  count++;\n  const delta = x - mean;\n  mean += delta / count;\n  M2 += delta * (x - mean);\n}\nconst sampleVariance = () => count > 1 ? M2 / (count - 1) : NaN;`;
  try {
    await navigator.clipboard.writeText(snippet);
    $('copy-code').textContent = '✓ Copied';
  } catch {
    $('copy-code').textContent = 'Clipboard unavailable';
  }
  setTimeout(() => { $('copy-code').textContent = 'Copy code'; }, 1600);
});
render();

// Known-answer tests and per-step cross-checks. Run on demand, not on page load.
const TEST_CASES = [
  { name: 'Five observations', values: [2, 4, 6, 8, 10], mean: 6, ss: 40, variance: 10,
    steps: [{ mean: 2, ss: 0 }, { mean: 3, ss: 2 }, { mean: 4, ss: 8 }, { mean: 5, ss: 20 }, { mean: 6, ss: 40 }] },
  { name: 'Constant values', values: [5, 5, 5, 5], mean: 5, ss: 0, variance: 0 },
  { name: 'Two observations', values: [10, 20], mean: 15, ss: 50, variance: 50 },
  { name: 'Negative values', values: [-2, 0, 2], mean: 0, ss: 8, variance: 4 },
  { name: 'Decimal values', values: [1.5, 2.5, 3.5], mean: 2.5, ss: 2, variance: 1 },
  { name: 'Single observation', values: [7], mean: 7, ss: 0, variance: NaN },
  { name: 'Large offset', values: [1000000001, 1000000002, 1000000003, 1000000004], mean: 1000000002.5, ss: 5, variance: 5/3 },
];
function nearlyEqual(actual, expected) {
  if (Number.isNaN(actual) && Number.isNaN(expected)) return true;
  return Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));
}
function runSelfTests() {
  let passed = 0;
  const rows = TEST_CASES.map((test) => {
    const engine = new Welford();
    let okay = true;
    for (let i = 0; i < test.values.length; i++) {
      const current = engine.update(test.values[i]);
      const prefix = test.values.slice(0, i + 1);
      const referenceMean = prefix.reduce((sum, x) => sum + x, 0) / prefix.length;
      const referenceSS = prefix.reduce((sum, x) => sum + (x - referenceMean) ** 2, 0);
      const referenceVariance = prefix.length > 1 ? referenceSS / (prefix.length - 1) : NaN;
      if (!nearlyEqual(current.mean, referenceMean) || !nearlyEqual(current.M2, referenceSS) || !nearlyEqual(current.variance, referenceVariance)) okay = false;
      if (test.steps && (!nearlyEqual(current.mean, test.steps[i].mean) || !nearlyEqual(current.M2, test.steps[i].ss))) okay = false;
    }
    if (!nearlyEqual(engine.mean, test.mean) || !nearlyEqual(engine.M2, test.ss) || !nearlyEqual(engine.sampleVariance, test.variance)) okay = false;
    if (okay) passed++;
    return `<tr><td>${test.name}</td><td>${format(test.mean, 7)}</td><td>${format(test.ss, 7)}</td><td>${Number.isNaN(test.variance) ? 'Undefined' : format(test.variance, 7)}</td><td class="${okay ? 'test-pass' : 'test-fail'}">${okay ? '✓ PASS' : '✕ FAIL'}</td></tr>`;
  });
  $('test-results').innerHTML = rows.join('');
  $('test-summary').textContent = `${passed} / ${TEST_CASES.length} tests passed · All intermediate updates checked`;
  $('test-summary').className = 'test-summary ' + (passed === TEST_CASES.length ? 'test-pass' : 'test-fail');
  return passed === TEST_CASES.length;
}
$('run-tests-btn').addEventListener('click', runSelfTests);
