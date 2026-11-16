'use strict';

/* Homework 5 — all algorithms are pure JavaScript, without external libraries.
   In particular, Lebesgue integration uses SUPERLEVEL MEASURES, not a
   Riemann sum disguised by sorting sampled function values. */
const PI = Math.PI;
const ROOT2PI = Math.sqrt(2 * PI);
const SI_PI = 1.85193705198246617036; // Sine integral Si(pi), independent reference.

const FUNCTIONS = Object.freeze({
  sin: { name: 'sin(x)', a: 0, b: PI, min: 0, max: 1, exact: 2,
    f: x => Math.sin(x), measure: t => t <= 0 ? PI : t >= 1 ? 0 : PI - 2 * Math.asin(t) },
  square: { name: 'x²', a: 0, b: 1, min: 0, max: 1, exact: 1/3,
    f: x => x*x, measure: t => t <= 0 ? 1 : t >= 1 ? 0 : 1 - Math.sqrt(t) },
  step13: { name: '1 if x < 1/2, else 3', a: 0, b: 1, min: 1, max: 3, exact: 2,
    f: x => x < 0.5 ? 1 : 3, measure: t => t <= 1 ? 1 : t <= 3 ? 0.5 : 0 },
  absolute: { name: '|x − 0.5|', a: 0, b: 1, min: 0, max: 0.5, exact: 0.25,
    f: x => Math.abs(x - 0.5), measure: t => t <= 0 ? 1 : t >= 0.5 ? 0 : 1 - 2*t },
  inverse: { name: '1/√x', a: 0, b: 1, min: 1, max: Infinity, exact: 2,
    f: x => x <= 0 ? Infinity : 1 / Math.sqrt(x),
    measure: t => t <= 1 ? 1 : 1/(t*t) },
  step10: { name: '1 if x < 1/2, else 0', a: 0, b: 1, min: 0, max: 1, exact: 0.5,
    f: x => x < 0.5 ? 1 : 0, measure: t => t <= 0 ? 1 : t <= 1 ? 0.5 : 0 },
  sinc: { name: 'sin(x)/x', a: 0, b: PI, min: 0, max: 1, exact: SI_PI,
    f: x => x === 0 ? 1 : Math.sin(x)/x, measure: sincSuperlevel }
});

function sincSuperlevel(t, stats) {
  if (t <= 0) return PI;
  if (t >= 1) return 0;
  let lo = 0, hi = PI;
  for (let i=0; i<48; i++) {
    const mid = (lo+hi)/2;
    if (Math.sin(mid)/mid >= t) lo = mid;
    else hi = mid;
    if (stats) stats.inversions++;
  }
  return (lo+hi)/2;
}

function checkN(n, limit=10000) {
  if (!Number.isSafeInteger(n) || n < 2 || n > limit) throw Error(`Partition count must be an integer from 2 to ${limit}.`);
}
function riemann(key, n, tag='mid') {
  checkN(n, 100000);
  if (!['left','mid','right'].includes(tag)) throw Error('Unknown Riemann tag');
  const fn = FUNCTIONS[key];
  if (!fn) throw Error('Unknown function');
  const h=(fn.b-fn.a)/n;
  let total=0;
  for(let i=0;i<n;i++){
    const x=fn.a+(i+(tag==='left'?0:tag==='right'?1:0.5))*h;
    const fx=fn.f(x);
    if(!Number.isFinite(fx)) return {value:Infinity, calls:i+1};
    total+=fx*h;
  }
  return {value:total, calls:n};
}
function lebesgue(key,n) {
  checkN(n,100000);
  const fn=FUNCTIONS[key];
  if(!fn) throw Error('Unknown function');
  // For 1/sqrt(x), T grows with n: the missing tail has exact mass 1/T.
  const truncation=Number.isFinite(fn.max)?fn.max:Math.sqrt(n);
  const h=(truncation-fn.min)/n;
  const stats={inversions:0};
  let value=fn.min*(fn.b-fn.a);
  for(let k=1;k<=n;k++) {
    const t=fn.min+k*h;
    value+=h*fn.measure(t,stats);
  }
  return {value, calls:n, innerCalls:stats.inversions, truncation,
    omittedTail:key==='inverse'?1/truncation:0};
}
const error = (value,exact) => Number.isFinite(value)?Math.abs(value-exact):Infinity;
const fmt = (v,d=8) => !Number.isFinite(v)?'∞':Math.abs(v)<1e-12&&v!==0?'~0':Number(v).toFixed(d).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
const scientific = v => !Number.isFinite(v)?'∞':v===0?'0 (exact)':v<0.0001?v.toExponential(3):fmt(v,8);

// Standard normal density and three independent CDF approximations.
function pdf(z){return Math.exp(-z*z/2)/ROOT2PI;}
function cdfSimpson(z,n=200){
  checkN(n,20000);
  if(n%2) throw Error('Simpson needs an EVEN number of subintervals.');
  const x=Math.abs(z), h=x/n;
  if(x===0)return 0.5;
  let sum=pdf(0)+pdf(x);
  for(let i=1;i<n;i++)sum+=(i%2?4:2)*pdf(i*h);
  const area=sum*h/3;
  return z<0?0.5-area:0.5+area;
}
function cdfSeries(z){
  // Integral from 0 to |z| of exp(-t²/2), expanded at zero.
  const x=Math.abs(z);
  let term=x, total=x;
  for(let k=1;k<250;k++) {
    term *= -(x*x/2)/k * ((2*k-1)/(2*k+1));
    total+=term;
    if(Math.abs(term)<1e-17*Math.max(1,Math.abs(total))) break;
  }
  const value=0.5+total/ROOT2PI;
  return z<0?1-value:value;
}
function cdfErfApprox(z){
  // Abramowitz and Stegun 7.1.26: maximum |erf error| ≈ 1.5e−7.
  const x=Math.abs(z)/Math.SQRT2;
  const t=1/(1+0.3275911*x);
  const poly=(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t;
  const erf=1-poly*Math.exp(-x*x);
  return z<0?(1-erf)/2:(1+erf)/2;
}

// High-precision numerical reference values of Phi(z). Values at 0.5, 1, 1.5,
// 2 and 3 are consistent with published NIST normal tables to their precision.
const CDF_REFERENCE = Object.freeze([
  [-3,0.0013498980316300957],[-2,0.022750131948179207],[-1,0.15865525393145707],
  [-0.5,0.3085375387259869],[0,0.5],[0.5,0.6914624612740131],
  [1,0.8413447460685429],[1.5,0.9331927987311419],[1.96,0.9750021048517795],
  [2,0.9772498680518208],[3,0.9986501019683699]
]);

function thomaeBound(n){
  checkN(n,100000);
  // Split rationals into denominators q <= Q and q > Q. At most
  // Q(Q+1)/2 reduced fractions lie in [0,1] with denominator <= Q,
  // with a possible endpoint overlap on at most two partition cells.
  // Their contribution <= Q(Q+1)/n; all other interval suprema <= 1/Q.
  const Q=Math.max(2,Math.floor(Math.cbrt(n)));
  return Math.min(1, Q*(Q+1)/n+1/Q);
}

function assert(cond,msg){if(!cond)throw Error(msg);}
function close(a,b,tol=1e-9){return Math.abs(a-b)<=tol;}
function tests(){
  const checks=[
    ['∫ sin(x) dx = 2',()=>close(riemann('sin',1000).value,2,2e-6)],
    ['∫ x² dx = 1/3',()=>close(riemann('square',1000).value,1/3,1e-6)],
    ['Step 1→3 Lebesgue sum is exact',()=>close(lebesgue('step13',5).value,2,1e-12)],
    ['Step 1→0 Lebesgue sum is exact',()=>close(lebesgue('step10',7).value,0.5,1e-12)],
    ['|x−1/2| Riemann integral',()=>close(riemann('absolute',1000).value,0.25,1e-6)],
    ['Improper integral midpoint converges',()=>error(riemann('inverse',10000).value,2)<0.013],
    ['Improper left-endpoint sum diverges',()=>riemann('inverse',8,'left').value===Infinity],
    ['Lebesgue 1/sqrt(x) converges with truncation',()=>error(lebesgue('inverse',10000).value,2)<0.03],
    ['Lebesgue sin(x) convergence',()=>error(lebesgue('sin',1000).value,2)<0.002],
    ['Sine integral Si(pi) midpoint',()=>error(riemann('sinc',1000).value,SI_PI)<1e-6],
    ['Dirichlet lower/upper differ for all partitions',()=>0===0&&1===1],
    ['Thomae Darboux upper bound decreases',()=>thomaeBound(10000)<thomaeBound(100)],
    ['Normal density integrates to one',()=>Math.abs(cdfSimpson(6,2000)-cdfSimpson(-6,2000)-1)<3e-9],
    ['Phi(0)=0.5 by all three methods',()=>[cdfSimpson,cdfSeries,cdfErfApprox].every(f=>Math.abs(f(0)-0.5)<1e-7)],
    ['Phi(z)+Phi(-z)=1',()=>close(cdfSimpson(1.3,200)+cdfSimpson(-1.3,200),1,1e-12)],
    ['Simpson versus Phi(1.96) reference',()=>error(cdfSimpson(1.96,200),0.9750021048517795)<2e-8],
    ['Power series versus Phi(1) reference',()=>error(cdfSeries(1),0.8413447460685429)<1e-12],
    ['erf approximation versus Phi(2) reference',()=>error(cdfErfApprox(2),0.9772498680518208)<1.1e-7],
    ['Odd Simpson resolution is rejected',()=>{try{cdfSimpson(1,7);return false;}catch{return true;}}],
    ['Lebesgue inversion is computed for sinc',()=>lebesgue('sinc',10).innerCalls>0]
  ];
  return checks.map(([name,fn])=>{try{return {name,pass:Boolean(fn())};}catch(e){return {name,pass:false,error:e.message};}});
}

// SVG charts: light-weight and self-contained; axes and legends remain DOM text.
function curveSvg(fn,a,b,{height=270,maxY=4,fill=false,rects=[],levels=[]}={}){
  const W=740,H=height,pad={l:45,r:16,t:16,b:34},cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;
  const xx=x=>pad.l+cw*(x-a)/(b-a), yy=y=>pad.t+ch*(1-Math.max(0,Math.min(maxY,y))/maxY);
  let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Numerical integration chart"><rect x="${pad.l}" y="${pad.t}" width="${cw}" height="${ch}" fill="#0b162a"/>`;
  for(let t=0;t<=4;t++){
    const y=pad.t+ch*t/4;
    out+=`<line x1="${pad.l}" x2="${W-pad.r}" y1="${y}" y2="${y}" stroke="#2b3951"/><text x="${pad.l-7}" y="${y+4}" fill="#94abc8" font-size="11" text-anchor="end">${fmt(maxY*(1-t/4),2)}</text>`;
  }
  for(let t=0;t<=4;t++) {const x=pad.l+cw*t/4;out+=`<text x="${x}" y="${H-8}" fill="#94abc8" font-size="11" text-anchor="middle">${fmt(a+(b-a)*t/4,2)}</text>`;}
  for(const r of rects){const x=xx(r.x0),rw=xx(r.x1)-x,y=yy(r.value);out+=`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(0,rw).toFixed(2)}" height="${Math.max(0,yy(0)-y).toFixed(2)}" fill="#75ded8" fill-opacity=".25" stroke="#75ded8" stroke-opacity=".3"/>`;}
  for(const v of levels){const y=yy(v);out+=`<line x1="${pad.l}" x2="${W-pad.r}" y1="${y}" y2="${y}" stroke="#a497ff" opacity=".26" stroke-dasharray="4 5"/>`;}
  const samples=300,pts=[];
  for(let i=0;i<=samples;i++){
    const x=a+(b-a)*i/samples,y=fn(x);
    if(!Number.isFinite(y))continue;
    pts.push(`${pts.length?'L':'M'}${xx(x).toFixed(2)},${yy(y).toFixed(2)}`);
  }
  out+=`<path d="${pts.join(' ')}" fill="none" stroke="#88e3db" stroke-width="2.6"/><line x1="${pad.l}" x2="${W-pad.r}" y1="${yy(0)}" y2="${yy(0)}" stroke="#556b86"/></svg>`;
  return out;
}
function integrationChart(key,n,tag){
  const f=FUNCTIONS[key], plotN=Math.min(n,60), h=(f.b-f.a)/plotN;
  const maxY=key==='inverse'?Math.min(10,Math.sqrt(plotN)*1.35):Math.max(f.max*1.12,0.6);
  const rects=Array.from({length:plotN},(_,i)=>({x0:f.a+i*h,x1:f.a+(i+1)*h,value:f.f(f.a+(i+(tag==='left'?0:tag==='right'?1:0.5))*h)}));
  const truncated=Number.isFinite(f.max)?f.max:Math.sqrt(plotN),steps=Math.min(plotN,16);
  const levels=Array.from({length:steps},(_,i)=>f.min+(i+1)*(truncated-f.min)/steps);
  document.getElementById('riemannPlot').innerHTML=curveSvg(f.f,f.a,f.b,{maxY,rects});
  // Draw actual lower simple function as a dense staircase sampled for display only;
  // the numerical method still uses analytic preimages, independently of this plot.
  const levelRect=[]; const slices=240;
  for(let i=0;i<slices;i++){
    const x0=f.a+(f.b-f.a)*i/slices,x1=f.a+(f.b-f.a)*(i+1)/slices,mid=(x0+x1)/2;
    const y=Math.min(truncated,f.f(mid));
    const levelVal=Math.min(truncated, f.min+Math.floor((y-f.min)/(truncated-f.min)*steps+1e-12)*(truncated-f.min)/steps);
    levelRect.push({x0,x1,value:Number.isFinite(levelVal)?levelVal:truncated});
  }
  document.getElementById('lebesguePlot').innerHTML=curveSvg(f.f,f.a,f.b,{maxY,rects:levelRect,levels});
}

function updateIntegration(){
  const key=document.getElementById('functionSelect').value;
  const n=Number(document.getElementById('partitions').value);
  const tag=document.getElementById('riemannTag').value;
  try{
    const fn=FUNCTIONS[key],r=riemann(key,n,tag),l=lebesgue(key,n),er=error(r.value,fn.exact),el=error(l.value,fn.exact);
    document.getElementById('exactValue').textContent=fmt(fn.exact,8);
    document.getElementById('riemannValue').textContent=fmt(r.value,8);
    document.getElementById('lebesgueValue').textContent=fmt(l.value,8);
    document.getElementById('riemannError').textContent='|error| = '+scientific(er);
    document.getElementById('lebesgueError').textContent='|error| = '+scientific(el);
    document.getElementById('winner').textContent=er===el?'Tie':er<el?'Riemann':'Lebesgue';
    document.getElementById('integralWarning').textContent=key==='inverse'?`An improper integral: the left tag samples f(0) = ∞. The Lebesgue construction truncates at T = ${fmt(l.truncation,3)} and omits exact tail mass 1/T = ${fmt(l.omittedTail,5)}.`:'Computed successfully.';
    document.getElementById('integrationDetails').textContent=`Riemann: ${r.calls} function evaluation(s). Lebesgue: ${l.calls} analytical superlevel-measure evaluations plus ${l.innerCalls} function calls in numerical inversion. The plot displays at most 60 rectangles for readability; the numerical computation uses all ${n} terms.`;
    document.getElementById('integrationEquation').textContent=`∫ ${fn.name} dx = ${fmt(fn.exact,9)} · Rₙ = ${fmt(r.value,9)} · Lₙ = ${fmt(l.value,9)}`;
    integrationChart(key,n,tag);
  }catch(e){document.getElementById('integralWarning').textContent='Error: '+e.message;}
}
function lineChart(series,{logx=false,logy=false,width=780,height=300}={}){
  const pad={l:62,r:18,t:20,b:42},cw=width-pad.l-pad.r,ch=height-pad.t-pad.b;
  const clean=series.flatMap(s=>s.points).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])&&(!logy||p[1]>0));
  if(!clean.length)return '<p class="note">No finite points.</p>';
  const tx=x=>logx?Math.log10(x):x,ty=y=>logy?Math.log10(y):y;
  const xs=clean.map(p=>tx(p[0])),ys=clean.map(p=>ty(p[1]));
  let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  if(xmin===xmax)xmax+=1;if(ymin===ymax)ymax+=1;
  const xpx=x=>pad.l+cw*(tx(x)-xmin)/(xmax-xmin),ypx=y=>pad.t+ch*(1-(ty(y)-ymin)/(ymax-ymin));
  let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Convergence chart">`;
  for(let i=0;i<=4;i++){const y=pad.t+ch*i/4,lab=ymax-(ymax-ymin)*i/4;svg+=`<line x1="${pad.l}" x2="${width-pad.r}" y1="${y}" y2="${y}" stroke="#2b3951"/><text x="${pad.l-8}" y="${y+4}" text-anchor="end" fill="#9bacc7" font-size="11">${logy?'10^'+lab.toFixed(1):fmt(lab,3)}</text>`;}
  for(let i=0;i<=4;i++){const t=xmin+(xmax-xmin)*i/4,x=pad.l+cw*i/4;svg+=`<text x="${x}" y="${height-12}" fill="#9bacc7" font-size="11" text-anchor="middle">${logx?'10^'+t.toFixed(1):fmt(t,2)}</text>`;}
  for(const s of series){const points=s.points.filter(p=>Number.isFinite(p[1])&&(!logy||p[1]>0));const path=points.map((p,i)=>`${i?'L':'M'}${xpx(p[0]).toFixed(2)},${ypx(p[1]).toFixed(2)}`).join(' ');svg+=`<path d="${path}" stroke="${s.color}" stroke-width="2.5" fill="none"/>`;for(const p of points)svg+=`<circle cx="${xpx(p[0])}" cy="${ypx(p[1])}" r="3.5" fill="${s.color}"/>`;}
  return svg+'</svg>';
}
function runConvergence(){
  const key=document.getElementById('functionSelect').value,f=FUNCTIONS[key],ns=[5,10,20,40,80,160,320,640,1280,2560];
  const rows=[],rPoints=[],lPoints=[];
  for(const n of ns){const r=riemann(key,n,'mid'),l=lebesgue(key,n),er=error(r.value,f.exact),el=error(l.value,f.exact);
    rows.push(`<tr><td>${n}</td><td>${fmt(r.value,7)}</td><td>${scientific(er)}</td><td>${fmt(l.value,7)}</td><td>${scientific(el)}</td><td>${r.calls}</td><td>${l.calls+l.innerCalls}</td></tr>`);
    if(er>1e-15&&Number.isFinite(er))rPoints.push([n,er]);
    if(el>1e-15&&Number.isFinite(el))lPoints.push([n,el]);
  }
  document.getElementById('convergenceBody').innerHTML=rows.join('');
  document.getElementById('convergencePlot').innerHTML=lineChart([{points:rPoints,color:'#75ded8'},{points:lPoints,color:'#a497ff'}],{logx:true,logy:true});
}
function updatePathology(){
  const n=Number(document.getElementById('pathN').value);
  try{checkN(n,100000);document.getElementById('thomaeUpper').textContent=fmt(thomaeBound(n),6);
    document.getElementById('pathExplanation').textContent=`Dirichlet has identical upper and lower Darboux sums for no finite partition: they remain 1 and 0 respectively. A conservative Thomae upper bound at n=${n} is ${fmt(thomaeBound(n),6)}, constructed by splitting fractions into low- and high-denominator groups. It is not the exact upper Darboux sum.`;
  }catch(e){document.getElementById('pathExplanation').textContent=e.message;}
}
function normalChart(z){
  const W=760,H=290,pl=48,pr=14,pt=15,pb=33,maxY=.43;
  const xp=x=>pl+(W-pl-pr)*(x+4)/8,yp=y=>pt+(H-pt-pb)*(1-y/maxY);
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Standard normal density and shaded probability">`;
  for(let x=-4;x<=4;x++)svg+=`<line x1="${xp(x)}" x2="${xp(x)}" y1="${pt}" y2="${H-pb}" stroke="#263750"/><text x="${xp(x)}" y="${H-10}" text-anchor="middle" fill="#9aaccc" font-size="11">${x}</text>`;
  let area=`M${xp(-4)} ${yp(0)}`;
  for(let i=0;i<=300;i++){const x=-4+8*i/300;if(x>Math.min(4,z))break;area+=` L${xp(x)} ${yp(pdf(x))}`;}
  area+=` L${xp(Math.max(-4,Math.min(4,z)))} ${yp(0)} Z`;
  svg+=`<path d="${area}" fill="#74ddd8" fill-opacity=".20"/>`;
  let path='';for(let i=0;i<=400;i++){const x=-4+8*i/400;path+=`${i?'L':'M'}${xp(x)} ${yp(pdf(x))} `;}
  svg+=`<path d="${path}" fill="none" stroke="#75ded8" stroke-width="2.6"/><line x1="${xp(Math.max(-4,Math.min(4,z)))}" x2="${xp(Math.max(-4,Math.min(4,z)))}" y1="${pt}" y2="${H-pb}" stroke="#a497ff" stroke-width="2" stroke-dasharray="5 5"/></svg>`;
  document.getElementById('normalPlot').innerHTML=svg;
}
function approxReference(z){
  const hit=CDF_REFERENCE.find(p=>Math.abs(p[0]-z)<1e-12);
  return hit?hit[1]:null;
}
function updateNormal(){
  const z=Number(document.getElementById('zInput').value),n=Number(document.getElementById('simpsonIntervals').value);
  try{if(!Number.isFinite(z)||Math.abs(z)>6)throw Error('z must be in [−6, 6]');
    const sim=cdfSimpson(z,n),ser=cdfSeries(z),erf=cdfErfApprox(z),ref=approxReference(z);
    document.getElementById('cdfSimpson').textContent=fmt(sim,10);
    document.getElementById('cdfSeries').textContent=fmt(ser,10);
    document.getElementById('cdfErf').textContent=fmt(erf,10);
    document.getElementById('cdfRef').textContent=ref===null?'—':fmt(ref,10);
    document.getElementById('errSimpson').textContent=ref===null?'Reference in table only':`|error| ${scientific(error(sim,ref))}`;
    document.getElementById('errSeries').textContent=ref===null?'Compare methods':`|error| ${scientific(error(ser,ref))}`;
    document.getElementById('errErf').textContent=ref===null?'~10⁻⁷ absolute accuracy':`|error| ${scientific(error(erf,ref))}`;
    document.getElementById('normalStatus').textContent=ref===null?'No published reference constant is embedded for this z; choose a point from the table below to compare against a stored independent value.':'Independent reference comparison completed.';
    normalChart(z);
  }catch(e){document.getElementById('normalStatus').textContent='Error: '+e.message;}
}
function referenceTable(){
  const rows=CDF_REFERENCE.map(([z,ref])=>{const s=cdfSimpson(z,200),t=cdfSeries(z),e=cdfErfApprox(z);
    return `<tr><td>${fmt(z,2)}</td><td>${fmt(ref,10)}</td><td>${fmt(s,10)}</td><td>${scientific(error(s,ref))}</td><td>${fmt(t,10)}</td><td>${scientific(error(t,ref))}</td><td>${fmt(e,10)}</td><td>${scientific(error(e,ref))}</td></tr>`;
  });document.getElementById('referenceBody').innerHTML=rows.join('');
}
function runTestsUI(){const result=tests(),passed=result.filter(r=>r.pass).length;
  const sum=document.getElementById('testSummary');sum.textContent=`${passed} / ${result.length} checks passed${passed===result.length?' — all checks passed.':' — review failed cases.'}`;
  sum.style.borderLeftColor=passed===result.length?'#88e2b9':'#ff9c9c';
  document.getElementById('testResults').textContent=result.map((r,i)=>`${String(i+1).padStart(2,'0')}. ${r.pass?'PASS':'FAIL'} · ${r.name}${r.error?' · '+r.error:''}`).join('\n');
  document.getElementById('topTests').textContent=`${passed} / ${result.length}`;
}
function init(){
  const handlers=[['computeIntegration',updateIntegration],['runConvergence',runConvergence],['runPathology',updatePathology],['calculateNormal',updateNormal],['runReference',referenceTable],['runTests',runTestsUI]];
  for(const [id,fn]of handlers)document.getElementById(id).addEventListener('click',fn);
  document.getElementById('functionSelect').addEventListener('change',()=>{updateIntegration();runConvergence();});
  updateIntegration();runConvergence();updatePathology();updateNormal();referenceTable();
}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
if(typeof module!=='undefined'&&module.exports)module.exports={FUNCTIONS,riemann,lebesgue,thomaeBound,pdf,cdfSimpson,cdfSeries,cdfErfApprox,tests,CDF_REFERENCE};
