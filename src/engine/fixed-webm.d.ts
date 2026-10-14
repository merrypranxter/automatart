export class FixedWebMMuxer {
 constructor(width:number,height:number,fps:number,codec?:'vp8'|'vp9');
 addChunk(chunk:{byteLength:number,timestamp:number,type:string,copyTo:(target:Uint8Array)=>void}):void;
 finish(frameCount?:number):Blob;
}
export function offlineVideoCodec(width:number,height:number,fps:number,bitrate:number):
 Promise<{config:Record<string,unknown>;name:'vp8'|'vp9'}|null>;
