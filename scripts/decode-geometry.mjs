import fs from 'node:fs';
import path from 'node:path';
import draco3d from 'draco3d';
const draco = await draco3d.createDecoderModule({});
const root = 'public/assets/geometry';
const files = fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.bin'));
const inventory = [];
for(const file of files){
 const input=fs.readFileSync(path.join(root,file));
 const headerLength=parseInt(input.subarray(0,10).toString());
 if(!headerLength)continue;
 const header=JSON.parse(input.subarray(10,10+headerLength).toString());
 const data=input.subarray(10+headerLength);
 const decoder=new draco.Decoder(), mesh=header.type===0?new draco.Mesh():new draco.PointCloud();
 const bytes=new Int8Array(data.buffer,data.byteOffset,data.byteLength);
 const status=header.type===0?decoder.DecodeArrayToMesh(bytes,bytes.length,mesh):decoder.DecodeArrayToPointCloud(bytes,bytes.length,mesh);
 if(!status.ok())throw new Error(`${file}: ${status.error_msg()}`);
 const arrays=[],attributes={};let offset=0;
 for(let i=0;i<header.attributes.length;i++){
  const name=header.attributes[i][0],att=decoder.GetAttributeByUniqueId(mesh,i),size=att.num_components(),count=mesh.num_points()*size;
  const ptr=draco._malloc(count*4);
  decoder.GetAttributeDataArrayForAllPoints(mesh,att,draco.DT_FLOAT32,count*4,ptr);
  const values=new Float32Array(draco.HEAPF32.buffer,ptr,count).slice();
  if(name==='skinIndex')for(let j=0;j<values.length;j++)values[j]=Math.round(values[j]);
  draco._free(ptr);
  attributes[name]={offset,count,itemSize:size,type:'Float32Array'};
  arrays.push(Buffer.from(values.buffer));offset+=values.byteLength;
 }
 let index;
 if(header.type===0){
  const count=mesh.num_faces()*3,ptr=draco._malloc(count*4);
  decoder.GetTrianglesUInt32Array(mesh,count*4,ptr);
  const values=new Uint32Array(draco.HEAPU32.buffer,ptr,count).slice();draco._free(ptr);
  index={offset,count,itemSize:1,type:'Uint32Array'};arrays.push(Buffer.from(values.buffer));
 }
 let bones;const meta=decoder.GetMetadata(mesh);
 if(meta.ptr){const q=new draco.MetadataQuerier();const json=q.GetStringEntry(meta,'json');if(json){const v=JSON.parse(json);bones=v.rig?.bones??v.bones;}draco.destroy(q);}
 const spec={attributes,index,bones,duration:header.duration,frameCount:header.frameCount,frameTimes:header.frameTimes,userData:header.userData};
 let json=JSON.stringify(spec);json=json.padEnd(Math.ceil(json.length/4)*4,' ');
 const length=Buffer.alloc(4);length.writeUInt32LE(Buffer.byteLength(json));
 const dest=path.join('public/assets/decoded',file+'.mesh');fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,Buffer.concat([length,Buffer.from(json),...arrays]));
 inventory.push({source:'assets/geometry/'+file,output:dest.replace('public/',''),vertices:mesh.num_points(),bones:bones?.length??0,attributes:Object.keys(attributes),bytes:fs.statSync(dest).size});
 draco.destroy(mesh);draco.destroy(decoder);
}
fs.writeFileSync('reference/geometry-inventory.json',JSON.stringify(inventory,null,2));
console.log('Decoded',inventory.length,'original geometries and animations');
