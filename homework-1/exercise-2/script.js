'use strict';
// Educational browser-only demo. NEVER use the public test mnemonic to store funds.
// Web Crypto supplies SHA-512 PBKDF2/HMAC; secp256k1 and Keccak-256 are plain JS.
const PUBLIC_MNEMONIC='test test test test test test test test test test test junk';
const TEST_PRIVATE='ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ADDRESS='0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const $=id=>document.getElementById(id);
const utf8=s=>new TextEncoder().encode(s);
const hex=a=>Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
const bytes=h=>new Uint8Array(h.match(/../g).map(v=>parseInt(v,16)));
const concat=(...xs)=>{const n=xs.reduce((s,x)=>s+x.length,0),out=new Uint8Array(n);let i=0;for(const x of xs){out.set(x,i);i+=x.length;}return out;};
const big=a=>BigInt('0x'+hex(a));
const bigBytes=(n,len=32)=>{if(n<0n)throw Error('Negative integer');return bytes(n.toString(16).padStart(len*2,'0'));};
const ser32=n=>new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
async function hmac(key,data){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-512'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data));}
async function mnemonicToSeed(mnemonic,passphrase=''){
  const normalized=mnemonic.normalize('NFKD'),salt='mnemonic'+passphrase.normalize('NFKD');
  const key=await crypto.subtle.importKey('raw',utf8(normalized),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:utf8(salt),iterations:2048,hash:'SHA-512'},key,512));
}
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
function checksumAddress(lower){const raw=lower.toLowerCase().replace(/^0x/,'');if(!/^[0-9a-f]{40}$/.test(raw))throw Error('Expected 40 hex address digits');const digest=hex(keccak256(utf8(raw)));return '0x'+raw.split('').map((c,i)=>parseInt(digest[i],16)>=8?c.toUpperCase():c).join('');}
function addressOf(key){const Q=ecMul(key),hashed=keccak256(pubBytes(Q)),lower=hex(hashed.slice(12));return {Q,lower:'0x'+lower,checksum:checksumAddress(lower)};}
function displayValue(value){const td=document.createElement('td');td.textContent=value;td.style.overflowWrap='anywhere';return td;}
function fillStages(items){const body=$('stages');body.replaceChildren();for(const [name,value] of items){const tr=document.createElement('tr');tr.append(displayValue(name),displayValue(value));body.append(tr);}}
let working=false;
async function derive(){if(working)return;working=true;$('derive').disabled=true;$('progress').textContent='Computing BIP-39 → BIP-32 → secp256k1 → Keccak-256 → EIP-55…';try{
 if(!crypto?.subtle)throw Error('Web Crypto unavailable. Open via HTTPS (GitHub Pages) or localhost.');
 const index=Number($('account').value),seed=await mnemonicToSeed(PUBLIC_MNEMONIC),node=await derivePath(seed,index),publicData=pubBytes(ecMul(node.key)),addr=addressOf(node.key),path=`m/44'/60'/0'/0/${index}`;
 $('path').textContent=path;$('address').textContent=addr.checksum;fillStages([
 ['BIP-39 public demo mnemonic',PUBLIC_MNEMONIC],['BIP-39 seed (64 bytes)',hex(seed)],['BIP-44 path',path],['BIP-32 private child key (32 bytes)',hex(bigBytes(node.key))],['BIP-32 child chain code',hex(node.chain)],['secp256k1 public key X || Y (64 bytes)',hex(publicData)],['Keccak-256 public-key digest',hex(keccak256(publicData))],['Last 20 digest bytes (lowercase)',addr.lower],['EIP-55 checksummed address',addr.checksum]
 ]);$('progress').textContent=`Account ${index} calculated successfully in your browser. Only public demonstration test data were used.`;
 }catch(err){$('progress').textContent='Error: '+err.message;}finally{$('derive').disabled=false;working=false;}}
let checking=false;
async function selfTests(){
 if(checking)return;
 checking=true;
 const buttons=[$('check'),$('testbtn')];
 buttons.forEach(button=>button.disabled=true);
 $('checkstatus').textContent='Running reference checks for the public account 0 vector…';
 $('testsummary').textContent='Running reference checks…';
 $('testout').textContent='Calculating independently in JavaScript…';
 // The top control moves directly to the visible results; both controls run the same suite.
 $('tests').scrollIntoView({behavior:'smooth',block:'start'});
 const results=[];function test(name,ok){results.push({name,ok:Boolean(ok)});}try{
 test('Keccak-256 empty input (published digest)',hex(keccak256(new Uint8Array()))==='c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
 test('EIP-55 official mixed-case checksum vector',checksumAddress('52908400098527886e0f7030069857d2e4169ee7')==='0x52908400098527886E0F7030069857D2E4169EE7');
 test('EIP-55 second checksum vector',checksumAddress('de709f2102306220921060314715629080e2fb77')==='0xde709f2102306220921060314715629080e2fb77');
 test('secp256k1 base point is on curve',mod(BASE.y*BASE.y-(BASE.x**3n)-7n)===0n);
 test('1 * G = G',(()=>{const q=ecMul(1n);return q.x===BASE.x&&q.y===BASE.y;})());
 test('Keccak-256 deterministic and length 32',hex(keccak256(utf8('hello')))==hex(keccak256(utf8('hello')))&&keccak256(utf8('hello')).length===32);
 if(!crypto?.subtle)throw Error('Web Crypto unavailable; remaining tests require HTTPS or localhost');
 const bip=await mnemonicToSeed('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
 test('BIP-39 standard test-vector seed prefix',hex(bip).startsWith('5eb00bbddcf069084889a8ab91555681'));
 const seed=await mnemonicToSeed(PUBLIC_MNEMONIC),node=await derivePath(seed,0),first=addressOf(node.key);
 test('Public Hardhat example private key',hex(bigBytes(node.key))===TEST_PRIVATE);
 test('Public Hardhat example Ethereum address',first.checksum.toLowerCase()===TEST_ADDRESS);
 const second=await derivePath(seed,1);test('BIP-44 indices produce distinct child keys',second.key!==node.key);
 }catch(e){results.push({name:'Environment or runtime error: '+e.message,ok:false});}
 const passed=results.filter(r=>r.ok).length;
 const allPassed=results.length>0&&passed===results.length;
 $('testsummary').textContent=`${passed} / ${results.length} reference checks passed${allPassed?' — all checks successful.':' — review failed checks below.'}`;
 $('checkstatus').textContent=`Reference checks finished: ${passed}/${results.length} passed (public reference account 0; independent of selected account).`;
 const output=$('testout');output.replaceChildren();
 for(const result of results){
  const line=document.createElement('div');
  line.className=result.ok?'score':'fail';
  line.textContent=`${result.ok?'PASS':'FAIL'} · ${result.name}`;
  output.append(line);
 }
 checking=false;
 buttons.forEach(button=>button.disabled=false);
}
$('derive').addEventListener('click',derive);$('check').addEventListener('click',selfTests);$('testbtn').addEventListener('click',selfTests);
