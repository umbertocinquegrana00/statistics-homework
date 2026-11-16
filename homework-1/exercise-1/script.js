'use strict';
// Curve: y^2 = x^3 + 7 (mod 17); O (point at infinity) is represented by null.
const P = 17, G = {x: 1, y: 5}, ORDER = 9;
const mod = a => ((a % P) + P) % P;
const same = (a,b) => a === null || b === null ? a === b : a.x === b.x && a.y === b.y;
const onCurve = q => q === null || mod(q.y*q.y - q.x*q.x*q.x - 7) === 0;
function inverse(a) {
  a = mod(a);
  if (a === 0) throw Error('Zero has no modular inverse');
  for (let i=1;i<P;i++) if (mod(a*i)===1) return i;
  throw Error('Modular inverse does not exist');
}
function addPoints(A,B) {
  if (A===null) return B;
  if (B===null) return A;
  if (!onCurve(A)||!onCurve(B)) throw Error('Point is not on the curve');
  if (A.x===B.x && mod(A.y+B.y)===0) return null;
  const slope = same(A,B)
    ? mod(3*A.x*A.x * inverse(2*A.y))
    : mod((B.y-A.y) * inverse(B.x-A.x));
  const x=mod(slope*slope-A.x-B.x);
  return {x,y:mod(slope*(A.x-x)-A.y)};
}
function repeated(k,base=G) { let q=null; for(let i=0;i<k;i++) q=addPoints(q,base); return q; }
function doubleAndAdd(k,base=G) {
  let q=null,a=base;
  while(k>0) {if(k%2) q=addPoints(q,a);a=addPoints(a,a);k=Math.floor(k/2);}
  return q;
}
const show=q=>q===null?'O':`(${q.x}, ${q.y})`;
const $=id=>document.getElementById(id);
let current=6,step=0;
function row(i,q) {return `<tr><td>${i}</td><td>${i===1?'O + G':`${i-1}G + G`}</td><td><code>${show(q)}</code></td></tr>`;}
function render() {
 $('kout').textContent=String(current);$('qout').textContent=show(repeated(current));
 let q=null,html=''; for(let i=1;i<=step;i++){q=addPoints(q,G);html+=row(i,q);}
 $('ladder').innerHTML=html||'<tr><td colspan="3">No operations yet. Click “Next addition”.</td></tr>';
 $('next').disabled=step===current;
 $('hint').textContent=`${step} of ${current} point additions shown. The final result is ${show(repeated(current))}.`;
 plot(q);
}
function setKey(){const n=Number($('key').value);if(!Number.isInteger(n)||n<1||n>8){$('hint').textContent='Choose an integer from 1 to 8.';return;}current=n;step=current;render();}
function plot(selected){const points=[];for(let x=0;x<P;x++)for(let y=0;y<P;y++)if(onCurve({x,y}))points.push({x,y});
const pad=40,unit=26.8,atX=x=>pad+x*unit,atY=y=>480-y*unit;
let s='';for(let i=0;i<P;i++){s+=`<line x1="${atX(i)}" y1="${atY(0)}" x2="${atX(i)}" y2="${atY(16)}" stroke="#283b54" stroke-width=".7"/><line x1="${atX(0)}" y1="${atY(i)}" x2="${atX(16)}" y2="${atY(i)}" stroke="#283b54" stroke-width=".7"/>`; if(i%2===0)s+=`<text x="${atX(i)}" y="503" fill="#879bb8" font-size="11" text-anchor="middle">${i}</text><text x="19" y="${atY(i)+4}" fill="#879bb8" font-size="11" text-anchor="middle">${i}</text>`;}
for(const q of points)s+=`<circle cx="${atX(q.x)}" cy="${atY(q.y)}" r="5" fill="#75ded8" opacity=".8"/>`;
for(let i=1;i<=step;i++){const q=repeated(i);if(q)s+=`<circle cx="${atX(q.x)}" cy="${atY(q.y)}" r="9" fill="none" stroke="#a497ff" stroke-width="3"/>`}
if(selected)s+=`<circle cx="${atX(selected.x)}" cy="${atY(selected.y)}" r="14" fill="none" stroke="#fefefe" stroke-width="2.5"/><text x="${atX(selected.x)+14}" y="${atY(selected.y)-13}" fill="#fff" font-size="14">${step}G</text>`;
s+='<text x="260" y="519" fill="#9daec9" font-size="11" text-anchor="middle">x in F₁₇</text>';$('curve').innerHTML=s;}
function stats(){const coord=$('coord').value;const freq=Array(P).fill(0);for(let k=1;k<ORDER;k++){freq[repeated(k)[coord]]++;}let s='<svg viewBox="0 0 550 190" role="img" aria-label="Frequency distribution of coordinate values">';for(let i=0;i<P;i++){const h=freq[i]*64,x=21+i*30;s+=`<rect x="${x}" y="${144-h}" width="21" height="${h}" rx="3" fill="${freq[i]?'#79d9d3':'#293952'}"/><text x="${x+10}" y="161" text-anchor="middle" font-size="10" fill="#9fb1cf">${i}</text>`;if(freq[i])s+=`<text x="${x+10}" y="${135-h}" text-anchor="middle" font-size="10" fill="#e9f7fa">${freq[i]}</text>`;}s+='</svg>';$('histogram').innerHTML=s;const occupied=freq.filter(Boolean).length;$('statnote').textContent=`Eight nonzero keys; ${occupied} distinct ${coord}-coordinates. Frequencies sum to ${freq.reduce((a,b)=>a+b,0)}. Coordinate values are not assumed uniform.`;}
function tests(){const results=[];function test(name,fn){let ok=false;try{ok=Boolean(fn());}catch(e){ok=false;}results.push({name,ok});}
test('G belongs to E(F17)',()=>onCurve(G));
test('All enumerated curve points satisfy the equation',()=>Array.from({length:P*P},(_,i)=>({x:Math.floor(i/P),y:i%P})).filter(onCurve).length===17);
test('2G = (2, 10)',()=>same(repeated(2),{x:2,y:10}));
test('6G = (5, 8)',()=>same(repeated(6),{x:5,y:8}));
test('G + (-G) = O',()=>addPoints(G,{x:1,y:12})===null);
test('9G = O (subgroup order)',()=>repeated(9)===null);
test('Repeated addition = double-and-add for k = 0..80',()=>Array.from({length:81},(_,i)=>same(repeated(i),doubleAndAdd(i))).every(Boolean));
test('Every 1..8 multiple stays on the curve',()=>Array.from({length:8},(_,i)=>onCurve(repeated(i+1))).every(Boolean));
$('testout').innerHTML=results.map(r=>`<div class="${r.ok?'score':'fail'}">${r.ok?'PASS':'FAIL'} · ${r.name}</div>`).join('')+`<strong>${results.filter(r=>r.ok).length}/${results.length} passed</strong>`;}
$('compute').addEventListener('click',setKey);$('next').addEventListener('click',()=>{if(step<current){step++;render();}});$('reset').addEventListener('click',()=>{step=0;render();});$('statrun').addEventListener('click',stats);$('coord').addEventListener('change',stats);$('testbtn').addEventListener('click',tests);step=6;render();stats();
