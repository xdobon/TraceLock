/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= SHA-256 incremental (JS puro, sin crypto.subtle) ================= */
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,
0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,
0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,
0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,
0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);

function Sha256(){this.h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  this.buf=new Uint8Array(64);this.bl=0;this.bytes=0;this.w=new Uint32Array(64);}
Sha256.prototype._b=function(b,o){const w=this.w,h=this.h;
  for(let i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
  for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];
    const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3);
    const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10);
    w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}
  let a=h[0],b2=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
  for(let i=0;i<64;i++){
    const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
    const ch=(e&f)^(~e&g); const t1=(hh+S1+ch+K[i]+w[i])|0;
    const S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
    const mj=(a&b2)^(a&c)^(b2&c); const t2=(S0+mj)|0;
    hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b2;b2=a;a=(t1+t2)|0;}
  h[0]=(h[0]+a)|0;h[1]=(h[1]+b2)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;
  h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0;};
Sha256.prototype.update=function(d){this.bytes+=d.length;let i=0;
  if(this.bl){while(i<d.length&&this.bl<64)this.buf[this.bl++]=d[i++];
    if(this.bl===64){this._b(this.buf,0);this.bl=0;}}
  while(i+64<=d.length){this._b(d,i);i+=64;}
  while(i<d.length)this.buf[this.bl++]=d[i++];return this;};
Sha256.prototype.hex=function(){const bits=this.bytes*8;this.buf[this.bl++]=0x80;
  if(this.bl>56){while(this.bl<64)this.buf[this.bl++]=0;this._b(this.buf,0);this.bl=0;}
  while(this.bl<56)this.buf[this.bl++]=0;
  const al=Math.floor(bits/4294967296),ba=bits>>>0;
  this.buf[56]=(al>>>24)&255;this.buf[57]=(al>>>16)&255;this.buf[58]=(al>>>8)&255;this.buf[59]=al&255;
  this.buf[60]=(ba>>>24)&255;this.buf[61]=(ba>>>16)&255;this.buf[62]=(ba>>>8)&255;this.buf[63]=ba&255;
  this._b(this.buf,0);let s='';
  for(let i=0;i<8;i++)s+=(this.h[i]>>>0).toString(16).padStart(8,'0');return s;};
const sha256Texto=(t)=>new Sha256().update(new TextEncoder().encode(t)).hex();

/* MD5 incremental, JS puro. Solo para cotejar con herramientas antiguas. */
const MD5_S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
 5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
 4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
 6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
const MD5_K=new Uint32Array(64);
for(let i=0;i<64;i++)MD5_K[i]=Math.floor(Math.abs(Math.sin(i+1))*4294967296);

function Md5(){this.h=new Int32Array([0x67452301,0xefcdab89,0x98badcfe,0x10325476]);
  this.buf=new Uint8Array(64);this.bl=0;this.bytes=0;this.m=new Int32Array(16);}
Md5.prototype._b=function(b,o){
  const m=this.m;
  for(let i=0;i<16;i++)m[i]=b[o+i*4]|(b[o+i*4+1]<<8)|(b[o+i*4+2]<<16)|(b[o+i*4+3]<<24);
  let a=this.h[0],bb=this.h[1],c=this.h[2],d=this.h[3];
  for(let i=0;i<64;i++){
    let f,g;
    if(i<16){f=(bb&c)|(~bb&d);g=i;}
    else if(i<32){f=(d&bb)|(~d&c);g=(5*i+1)&15;}
    else if(i<48){f=bb^c^d;g=(3*i+5)&15;}
    else{f=c^(bb|~d);g=(7*i)&15;}
    const tmp=d;d=c;c=bb;
    const x=(a+f+MD5_K[i]+m[g])|0, s=MD5_S[i];
    bb=(bb+((x<<s)|(x>>>(32-s))))|0;
    a=tmp;
  }
  this.h[0]=(this.h[0]+a)|0;this.h[1]=(this.h[1]+bb)|0;
  this.h[2]=(this.h[2]+c)|0;this.h[3]=(this.h[3]+d)|0;
};
Md5.prototype.update=function(d){this.bytes+=d.length;let i=0;
  if(this.bl){while(i<d.length&&this.bl<64)this.buf[this.bl++]=d[i++];
    if(this.bl===64){this._b(this.buf,0);this.bl=0;}}
  while(i+64<=d.length){this._b(d,i);i+=64;}
  while(i<d.length)this.buf[this.bl++]=d[i++];return this;};
Md5.prototype.hex=function(){const bits=this.bytes*8;
  this.buf[this.bl++]=0x80;
  if(this.bl>56){while(this.bl<64)this.buf[this.bl++]=0;this._b(this.buf,0);this.bl=0;}
  while(this.bl<56)this.buf[this.bl++]=0;
  const bajo=bits>>>0, alto=Math.floor(bits/4294967296);
  this.buf[56]=bajo&255;this.buf[57]=(bajo>>>8)&255;this.buf[58]=(bajo>>>16)&255;this.buf[59]=(bajo>>>24)&255;
  this.buf[60]=alto&255;this.buf[61]=(alto>>>8)&255;this.buf[62]=(alto>>>16)&255;this.buf[63]=(alto>>>24)&255;
  this._b(this.buf,0);
  let s='';
  for(let i=0;i<4;i++){const v=this.h[i]>>>0;
    for(let j=0;j<4;j++)s+=((v>>>(j*8))&255).toString(16).padStart(2,'0');}
  return s;};


