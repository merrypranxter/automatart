// Tiny dependency-free WebM muxer for WebCodecs VP8/VP9 fixed-timebase frames.
// The WebCodecs timestamps are authored from frame number, NEVER wall time.
const bytes=(...n)=>Uint8Array.from(n);
const idBytes=n=>{let v=n.toString(16);if(v.length%2)v='0'+v;return Uint8Array.from(v.match(/../g).map(x=>parseInt(x,16)));};
const uint=(n,size)=>{let x=BigInt(Math.floor(n));const out=new Uint8Array(size);for(let i=size-1;i>=0;i--){out[i]=Number(x&255n);x>>=8n;}return out;};
const utf8=s=>new TextEncoder().encode(s);
const merge=parts=>{const total=parts.reduce((n,b)=>n+b.length,0),data=new Uint8Array(total);let offset=0;for(const b of parts){data.set(b,offset);offset+=b.length;}return data;};
const vint=n=>{for(let size=1;size<=8;size++){if(BigInt(n)<(1n<<BigInt(7*size))-1n){const arr=uint(n,size);arr[0]|=1<<(8-size);return arr;}}throw Error('WebM element too large');};
const el=(id,payload)=>merge([idBytes(id),vint(payload.length),payload]);
const field=(id,n,width)=>el(id,uint(n,width));
const string=(id,s)=>el(id,utf8(s));
const group=(id,children)=>el(id,merge(children));
const float64=(id,value)=>{const b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,value,false);return el(id,b);};
function webmHeader(width,height,fps,codec,duration){
 const ebml=group(0x1a45dfa3,[field(0x4286,1,1),field(0x42f7,1,1),field(0x42f2,4,1),field(0x42f3,8,1),
  string(0x4282,'webm'),field(0x4287,4,1),field(0x4285,2,1)]);
 const info=group(0x1549a966,[field(0x2ad7b1,1000000,3),float64(0x4489,duration*1000),
  string(0x4d80,'MATHEMAGICAL!'),string(0x5741,'MATHEMAGICAL! offline frame encoder')]);
 const video=group(0xe0,[field(0xb0,width,4),field(0xba,height,4)]);
 const entry=group(0xae,[field(0xd7,1,1),field(0x73c5,1,1),field(0x83,1,1),
  field(0x9c,0,1),string(0x86,codec==='vp8'?'V_VP8':'V_VP9'),video,
  field(0x23e383,Math.round(1e9/fps),4)]);
 return [ebml,info,group(0x1654ae6b,[entry])];
}
export class FixedWebMMuxer{
 constructor(width,height,fps,codec='vp9'){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2
    ||!Number.isFinite(fps)||fps<1||fps>120||!['vp8','vp9'].includes(codec))
   throw new RangeError('Invalid fixed-frame WebM format');
  this.width=width;this.height=height;this.fps=fps;this.codec=codec;this.frames=[];
 }
 addChunk(chunk){
  // copy encoded memory before VideoEncoder releases the chunk.
  const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);
  const timestamp=Number(chunk.timestamp);
  if(!Number.isFinite(timestamp)||timestamp<0)throw Error('Invalid frame timestamp');
  if(this.frames.length&&timestamp<=this.frames.at(-1).timestamp)throw Error('Frames must be strictly increasing');
  this.frames.push({data:b,timestamp,key:chunk.type==='key'});
 }
 finish(frameCount=this.frames.length){
  if(!this.frames.length||this.frames.length!==frameCount)throw Error('Missing WebM encoded frames');
  const duration=frameCount/this.fps,header=webmHeader(this.width,this.height,this.fps,this.codec,duration);
  const clusters=[],maxCluster=12000;let groupStart=-1,blocks=[];
  const close=()=>{if(groupStart>=0)clusters.push(group(0x1f43b675,[field(0xe7,groupStart,2),...blocks]));};
  for(const f of this.frames){
   const ms=Math.round(f.timestamp/1000);
   if(groupStart<0||ms-groupStart>maxCluster){close();groupStart=ms;blocks=[];}
   const relative=ms-groupStart;
   const head=bytes(0x81,(relative>>8)&255,relative&255,f.key?0x80:0);
   blocks.push(el(0xa3,merge([head,f.data])));
  }
  close();
  const payload=[...header.slice(1),...clusters];
  // Container length is encoded after all chunks; Blob chunks are already compressed.
  const payloadSize=payload.reduce((n,b)=>n+b.length,0);
  const segmentStart=merge([idBytes(0x18538067),vint(payloadSize)]);
  const result=new Blob([header[0],segmentStart,...payload],{type:'video/webm'});
  this.frames.length=0;
  return result;
 }
}
export async function offlineVideoCodec(width,height,fps,bitrate){
 if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')return null;
 for(const [codec,name] of [['vp09.00.10.08','vp9'],['vp8','vp8']]){
  try{
   const config={codec,width,height,bitrate,framerate:fps,latencyMode:'quality'};
   const response=await VideoEncoder.isConfigSupported(config);
   if(response.supported)return {config:response.config||config,name};
  }catch{/* codec not usable in this browser */ }
 }
 return null;
}
