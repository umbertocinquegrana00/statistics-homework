'use strict';
// Homework 2: all displayed results are computed in this browser.
// The scheme is custom and for teaching ONLY, not production encryption.
const $ = id => document.getElementById(id);
const utf8 = s => new TextEncoder().encode(s);
const decode = b => new TextDecoder('utf-8',{fatal:true}).decode(b);
const hex = a => Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
const bytes = h => new Uint8Array(h.match(/../g).map(v=>parseInt(v,16)));
const concat = (...xs) => {const out=new Uint8Array(xs.reduce((sum,x)=>sum+x.length,0));let i=0;for(const x of xs){out.set(x,i);i+=x.length;}return out;};
const big = a => BigInt('0x'+hex(a));
const bigBytes = (n,len=32) => bytes(n.toString(16).padStart(len*2,'0'));
const ser32 = n => new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const CURVE_P=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const CURVE_N=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const BASE={x:0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,y:0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n};
const mod=(a,p=CURVE_P)=>(a%p+p)%p;
function inverse(a,p=CURVE_P){let [t,nt,r,nr]=[0n,1n,p,mod(a,p)];while(nr!==0n){const q=r/nr;[t,nt]=[nt,t-q*nt];[r,nr]=[nr,r-q*nr];}if(r!==1n)throw Error('Not invertible');return mod(t,p);}
function ecAdd(A,B){if(!A)return B;if(!B)return A;if(A.x===B.x&&mod(A.y+B.y)===0n)return null;
  const lambda=A.x===B.x&&A.y===B.y?mod(3n*A.x*A.x*inverse(2n*A.y)):mod((B.y-A.y)*inverse(B.x-A.x));
  const x=mod(lambda*lambda-A.x-B.x),y=mod(lambda*(A.x-x)-A.y);return {x,y};}
function ecMul(k,P=BASE){if(k<=0n||k>=CURVE_N)throw Error('Private scalar outside valid range');let Q=null,A=P;while(k>0n){if(k&1n)Q=ecAdd(Q,A);A=ecAdd(A,A);k>>=1n;}return Q;}
function pubBytes(P){return concat(bigBytes(P.x),bigBytes(P.y));} // 64-byte X||Y, NO 0x04 prefix
function compressedPub(P){return concat(new Uint8Array([P.y&1n?3:2]),bigBytes(P.x));}
async function master(seed){const I=await hmac(utf8('Bitcoin seed'),seed),key=big(I.slice(0,32));if(key===0n||key>=CURVE_N)throw Error('Invalid master key');return {key,chain:I.slice(32)};}
async function child(node,index,hardened){const pos=hardened?(index+0x80000000)>>>0:index;
 const data=hardened?concat(new Uint8Array([0]),bigBytes(node.key),ser32(pos)):concat(compressedPub(ecMul(node.key)),ser32(pos));
 const I=await hmac(node.chain,data),il=big(I.slice(0,32));if(il>=CURVE_N)throw Error('Invalid child key, increment index');const key=(il+node.key)%CURVE_N;if(key===0n)throw Error('Invalid derived child key');return {key,chain:I.slice(32)};}
async function derivePath(seed,index){let node=await master(seed);for(const [idx,hard] of [[44,true],[60,true],[0,true],[0,false],[index,false]])node=await child(node,idx,hard);return node;}
// Keccak-f[1600] (64-bit lanes, little-endian), Keccak-256 rate=136, domain suffix 0x01.
const MASK=(1n<<64n)-1n;
const ROT=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const RC=['0000000000000001','0000000000008082','800000000000808A','8000000080008000','000000000000808B','0000000080000001','8000000080008081','8000000000008009','000000000000008A','0000000000000088','0000000080008009','000000008000000A','000000008000808B','800000000000008B','8000000000008089','8000000000008003','8000000000008002','8000000000000080','000000000000800A','800000008000000A','8000000080008081','8000000000008080','0000000080000001','8000000080008008'].map(x=>BigInt('0x'+x));
function rot(x,n){const s=BigInt(n);return s===0n?x:((x<<s)|(x>>(64n-s)))&MASK;}
function permute(a){for(const rc of RC){const c=Array(5).fill(0n),d=Array(5).fill(0n);for(let x=0;x<5;x++)for(let y=0;y<5;y++)c[x]^=a[x+5*y];for(let x=0;x<5;x++)d[x]=c[(x+4)%5]^rot(c[(x+1)%5],1);for(let x=0;x<5;x++)for(let y=0;y<5;y++)a[x+5*y]^=d[x];const b=Array(25).fill(0n);for(let x=0;x<5;x++)for(let y=0;y<5;y++)b[y+5*((2*x+3*y)%5)]=rot(a[x+5*y],ROT[x+5*y]);for(let x=0;x<5;x++)for(let y=0;y<5;y++)a[x+5*y]=b[x+5*y]^((~b[(x+1)%5+5*y])&b[(x+2)%5+5*y]);a[0]^=rc;}}
function keccak256(input){const rate=136,a=Array(25).fill(0n),len=Math.ceil((input.length+1)/rate)*rate||rate;const padded=new Uint8Array(len);padded.set(input);padded[input.length]^=0x01;padded[len-1]^=0x80;for(let off=0;off<len;off+=rate){for(let i=0;i<rate;i++)a[Math.floor(i/8)]^=BigInt(padded[off+i])<<BigInt(8*(i%8));permute(a);}const out=new Uint8Array(32);for(let i=0;i<32;i++)out[i]=Number((a[Math.floor(i/8)]>>BigInt(8*(i%8)))&255n);return out;}

// A pedagogical hash-based EC stream mask. This is NOT vetted ECIES or authenticated encryption.
function streamKey(S, length) {
  if (!S || length<0) throw Error('Invalid shared secret');
  const result = new Uint8Array(length);
  const compressed = compressedPub(S);
  const label = utf8('HMW2-STREAM');
  for (let pos=0, counter=0; pos<length;counter++) {
    const chunk=keccak256(concat(label,ser32(counter),compressed));
    const used=Math.min(chunk.length,length-pos);
    result.set(chunk.slice(0,used),pos);pos+=used;
  }
  return result;
}
function randomScalar(max) {
  if (!globalThis.crypto?.getRandomValues) throw Error('Secure browser randomness unavailable');
  const limit=Math.floor(0x100000000/max)*max;
  const word=new Uint32Array(1);
  do { crypto.getRandomValues(word); } while (word[0]>=limit);
  return 1+(word[0]%max);
}
function xor(a,b){if(a.length!==b.length)throw Error('Length mismatch');return a.map((v,i)=>v^b[i]);}
function encryptToy(message,privateKey,ephemeral) {
  const k=BigInt(privateKey),r=BigInt(ephemeral);
  if(k<1n||k>4096n||r<1n||r>=CURVE_N)throw Error('Scalar outside demo range');
  const Q=ecMul(k),R=ecMul(r),S=ecMul(r,Q),payload=utf8(message);
  const cipher=xor(payload,streamKey(S,payload.length));
  return {Q,R,cipher};
}
function decryptToy(packet,privateKey) {
  if(!packet.R || !isOnCurve(packet.R))throw Error('Invalid ephemeral point');
  const S=ecMul(BigInt(privateKey),packet.R);
  return decode(xor(packet.cipher,streamKey(S,packet.cipher.length)));
}
function isOnCurve(P) {return P===null || (P.x>=0n&&P.x<CURVE_P&&P.y>=0n&&P.y<CURVE_P&&mod(P.y*P.y-P.x*P.x*P.x-7n)===0n);}
function pointEqual(A,B){return A===null?B===null:B!==null&&A.x===B.x&&A.y===B.y;}
function pointLabel(P){return P?hex(compressedPub(P)):'POINT AT INFINITY';}
function integer(id,minimum,maximum){const value=Number($(id).value);if(!Number.isSafeInteger(value)||value<minimum||value>maximum)throw Error(id+' must be an integer from '+minimum+' to '+maximum);return value;}
function setText(id,txt){$(id).textContent=String(txt);}
function formatError(e){return e instanceof Error?e.message:String(e);}
let latestPacket=null;
function runECC() {
  try {
    const key=integer('eccKey',1,4096),message=$('message').value;
    if(!message)throw Error('Enter a non-empty message');
    const ephemeral=randomScalar(65535);
    const packet=encryptToy(message,key,ephemeral);
    const decrypted=decryptToy(packet,key);
    latestPacket=packet;
    setText('eccK',key);setText('eccOk',decrypted===message?'YES':'NO');setText('eccBytes',packet.cipher.length);
    setText('eccPublic',pointLabel(packet.Q));setText('eccR',pointLabel(packet.R));setText('eccCipher',hex(packet.cipher));setText('eccPlain',decrypted);
    setText('eccStatus','Encrypted with freshly sampled ephemeral r; decryption '+(decrypted===message?'succeeded.':'FAILED.'));
    setText('foundKey','—');setText('keyChecks','—');setText('keyMatch','—');setText('keyAttackStatus','');
    runCaesar();return packet;
  } catch(e){setText('eccStatus','ERROR: '+formatError(e));return null;}
}
function caesar(text,shift){return text.replace(/[A-Za-z]/g,char=>{const base=char>='a'?97:65;return String.fromCharCode(base+((char.charCodeAt(0)-base+shift%26+26)%26));});}
function runCaesar(){try{const key=integer('shift',0,25),plain=$('message').value,out=caesar(plain,key);setText('caesarOut',out);setText('caesarBack',caesar(out,-key));return out;}catch(e){setText('caesarOut','ERROR: '+formatError(e));return '';}}

// Approximate published English letter proportions. Fixed a priori, not fit to test ciphertexts.
const ENGLISH=[.08167,.01492,.02782,.04253,.12702,.02228,.02015,.06094,.06966,.00153,.00772,.04025,.02406,.06749,.07507,.01929,.00095,.05987,.06327,.09056,.02758,.00978,.02360,.00150,.01974,.00074];
const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function counts(text){const a=new Array(26).fill(0);for(const c of text.toUpperCase()){const i=c.charCodeAt(0)-65;if(i>=0&&i<26)a[i]++;}return a;}
function indexOfCoincidence(text){const a=counts(text),n=a.reduce((s,x)=>s+x,0);return n<2?NaN:a.reduce((s,x)=>s+x*(x-1),0)/(n*(n-1));}
function chiSquared(text){const a=counts(text),n=a.reduce((s,x)=>s+x,0);if(n<1)return Infinity;return a.reduce((s,x,i)=>s+(x-n*ENGLISH[i])**2/(n*ENGLISH[i]),0);}
function caesarRank(cipher){if(counts(cipher).every(v=>v===0))throw Error('Input must contain at least one Latin letter');return Array.from({length:26},(_,shift)=>({shift,plain:caesar(cipher,-shift),score:chiSquared(caesar(cipher,-shift))})).sort((a,b)=>a.score-b.score||a.shift-b.shift);}
function renderFrequencies(cipher){const a=counts(cipher),max=Math.max(1,...a),plot=$('freqPlot'),labels=$('freqLabels');plot.replaceChildren();labels.replaceChildren();a.forEach((n,i)=>{const bar=document.createElement('div');bar.className='bar';bar.style.height=(100*n/max)+'%';bar.title=abc[i]+': '+n+' occurrences';plot.append(bar);const label=document.createElement('span');label.textContent=abc[i];labels.append(label);});}
function runAttack(){try{const text=$('attackInput').value,rank=caesarRank(text),first=rank[0];setText('recoveredShift',first.shift);setText('bestScore',first.score.toFixed(2));setText('coincidence',Number.isFinite(indexOfCoincidence(text))?indexOfCoincidence(text).toFixed(4):'N/A');setText('recoveredPlain',first.plain);renderFrequencies(text);const body=$('rankedShifts');body.replaceChildren();rank.forEach((r,i)=>{const row=document.createElement('tr');for(const txt of [r.shift,r.score.toFixed(2),r.plain.slice(0,90)]){const td=document.createElement('td');td.textContent=txt;row.append(td);}if(i===0)row.style.background='#173b43';body.append(row);});return first;}catch(e){setText('recoveredPlain','ERROR: '+formatError(e));return null;}}

// Original embedded English teaching corpus. Excerpts are sampled contiguously, never reshuffled letter by letter.
const CORPUS=`Statistical inference studies the relationship between observed data and an unknown process. When observations are independent and generated by a stable distribution, their empirical frequencies often approach theoretical probabilities as the sample grows. A cryptanalyst can exploit this principle when a cipher preserves the recognizable distribution of letters in a natural language. English writing contains many occurrences of common letters, especially vowels and frequently used consonants. Not all messages behave in the same way, however. Short messages have substantial sampling variability, and technical jargon may use unusual combinations of symbols. A useful statistical analysis therefore evaluates uncertainty rather than relying on a single convenient example. Security engineering combines mathematics, careful implementations, explicit assumptions and reproducible experiments. A large numerical key space matters because exhaustive search becomes more expensive as the number of possibilities increases. Yet the size of a key space is only one aspect of security. A weak random generator, a repeated ephemeral secret or faulty parameter validation can compromise a system that otherwise uses sophisticated mathematics. In a classical substitution cipher every letter is consistently replaced by another letter, so the frequency histogram is rearranged but not hidden. An adversary who knows the language can test which candidate shift makes the recovered text most consistent with the expected frequencies. When the ciphertext is very short, random variation makes this decision uncertain. Longer observations usually provide more information, although their composition and genre still matter. Modern public key cryptography uses different mathematical constructions. The public key can be shared without revealing the private key when the discrete logarithm problem is hard within the chosen group. A small demonstration range deliberately removes that protection and makes direct enumeration possible. Experimental reproducibility requires specifying a random seed, the sample size, the number of repetitions and the scoring procedure. Results of a simulation are estimates of its assumed model and should not be presented as universal laws. The best explanations connect each computational step to the question that motivates it.`;
const CLEAN_CORPUS=CORPUS.toUpperCase().replace(/[^A-Z]/g,'');
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function simulation(trials,seed,lengths=[8,16,32,64,128,256,512]){const rand=rng(seed);return lengths.map(n=>{let hits=0;for(let i=0;i<trials;i++){const start=Math.floor(rand()*(CLEAN_CORPUS.length-n+1)),plain=CLEAN_CORPUS.slice(start,start+n),shift=Math.floor(rand()*26),cipher=caesar(plain,shift);if(caesarRank(cipher)[0].shift===shift)hits++;}return {n,hits,trials,rate:hits/trials};});}
function renderLineChart(data){const root=$('experimentChart');root.replaceChildren();const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 850 280');svg.setAttribute('class','chartsvg');const add=(tag,attrs,text)=>{const x=document.createElementNS(ns,tag);for(const [a,v] of Object.entries(attrs))x.setAttribute(a,String(v));if(text!==undefined)x.textContent=String(text);svg.append(x);return x;};for(let i=0;i<=4;i++){const y=220-i*48;add('line',{x1:70,y1:y,x2:815,y2:y,stroke:'#33445e','stroke-dasharray':'4 6'});add('text',{x:55,y:y+4,fill:'#a4b5d2','font-size':13,'text-anchor':'end'},(i*25)+'%');}const coords=data.map((p,i)=>[84+i*120,220-192*p.rate]);add('polyline',{points:coords.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#7adbd9','stroke-width':3});data.forEach((p,i)=>{const [x,y]=coords[i];add('circle',{cx:x,cy:y,r:6,fill:'#a49aff'});add('text',{x,y:244,fill:'#a4b5d2','font-size':13,'text-anchor':'middle'},'n='+p.n);add('text',{x,y:y-12,fill:'#b7f4ed','font-size':12,'text-anchor':'middle'},Math.round(p.rate*100)+'%');});root.append(svg);}
function runSimulation(){try{const trials=integer('trials',10,500),seed=integer('seed',1,2147483647);setText('experimentStatus','Calculating '+(trials*7)+' independent simulation trials…');const result=simulation(trials,seed);const tbody=$('experimentRows');tbody.replaceChildren();result.forEach(r=>{const tr=document.createElement('tr');[r.n,r.hits,r.trials,(100*r.rate).toFixed(1)+'%'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});tbody.append(tr);});renderLineChart(result);setText('experimentStatus','Completed with seed '+seed+'; '+trials+' trials per length.');}catch(e){setText('experimentStatus','ERROR: '+formatError(e));}}
function recoverKey(target,max=4096){let point=null;for(let i=1;i<=max;i++){point=ecAdd(point,BASE);if(pointEqual(point,target))return {key:i,checks:i};}return null;}
function runKeyAttack(){try{const k=integer('eccKey',1,4096),Q=ecMul(BigInt(k));setText('keyAttackStatus','Searching public key in the 4096-key teaching range…');const found=recoverKey(Q);setText('foundKey',found?.key??'NOT FOUND');setText('keyChecks',found?.checks??4096);setText('keyMatch',found?.key===k?'YES':'NO');setText('keyAttackStatus','Completed exhaustive search without using ciphertext statistics.');}catch(e){setText('keyAttackStatus','ERROR: '+formatError(e));}}

function selfTests(){const results=[];function check(name,ok){results.push({name,ok:Boolean(ok)});}try{
  check('Base point G lies on secp256k1',isOnCurve(BASE));
  check('2G known x-coordinate',ecMul(2n).x===0xC6047F9441ED7D6D3045406E95C07CD85C778E4B8CEF3CA7ABAC09B95C709EE5n);
  check('G + 2G = 3G',pointEqual(ecAdd(BASE,ecMul(2n)),ecMul(3n)));
  check('G + (-G) = point at infinity',ecAdd(BASE,{x:BASE.x,y:mod(-BASE.y)})===null);
  check('Keccak-256 empty input published vector',hex(keccak256(new Uint8Array()))==='c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
  const e=encryptToy('MEET ME AT THE OLD BRIDGE AT TEN',137,12345);
  check('ECDH shared secret: rQ = kR',pointEqual(ecMul(12345n,e.Q),ecMul(137n,e.R)));
  check('Toy ECC encrypt/decrypt round-trip',decryptToy(e,137)==='MEET ME AT THE OLD BRIDGE AT TEN');
  check('Wrong ECC private key does not recover same plaintext',hex(xor(e.cipher,streamKey(ecMul(138n,e.R),e.cipher.length)))!==hex(utf8('MEET ME AT THE OLD BRIDGE AT TEN')));
  const e2=encryptToy('MEET ME AT THE OLD BRIDGE AT TEN',137,12346);
  check('Fresh ephemeral scalar changes ciphertext',hex(e.cipher)!==hex(e2.cipher));
  check('Caesar shift 3 canonical example',caesar('ATTACK AT DAWN',3)==='DWWDFN DW GDZQ');
  check('Caesar decrypt round-trip',caesar(caesar('Hello, World! 123',19),-19)==='Hello, World! 123');
  check('Caesar key recovery from long reference text',caesarRank(caesar(CLEAN_CORPUS,11))[0].shift===11);
  const original='THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',cipher=caesar(original,17);
  check('Index of coincidence unchanged by Caesar',Math.abs(indexOfCoincidence(original)-indexOfCoincidence(cipher))<1e-12);
  check('Restricted ECC key search matches Q',recoverKey(ecMul(137n))?.key===137);
  check('Simulation reproducible for fixed seed',JSON.stringify(simulation(12,123))===JSON.stringify(simulation(12,123)));
}catch(e){results.push({name:'Unexpected exception: '+formatError(e),ok:false});}
 const count=results.filter(r=>r.ok).length;setText('testSummary',count+' / '+results.length+' checks passed'+(count===results.length?' — all checks successful.':' — inspect the failures below.'));const el=$('testResults');el.replaceChildren();results.forEach(r=>{const div=document.createElement('div');div.className=r.ok?'score':'fail';div.textContent=(r.ok?'PASS':'FAIL')+' · '+r.name;el.append(div);});return results;
}

function bind(){ $('eccRun').addEventListener('click',runECC);$('caesarRun').addEventListener('click',runCaesar);$('attackRun').addEventListener('click',runAttack);$('experimentRun').addEventListener('click',runSimulation);$('keyAttackRun').addEventListener('click',runKeyAttack);$('keyRandom').addEventListener('click',()=>{$('eccKey').value=randomScalar(4096);runECC();});$('testRun').addEventListener('click',selfTests);runECC();runAttack();runSimulation(); }
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();}
