import * as THREE from 'three';

export interface PackedAttribute {offset:number;count:number;itemSize:number;type:string}
export interface BoneData {name:string;parent:number;pos:number[];rotq:number[];scl:number[];[key:string]:unknown}
export interface PackedMesh {attributes:Record<string,PackedAttribute>;index?:PackedAttribute;bones?:BoneData[];duration?:number;frameCount?:number;frameTimes?:number[];userData?:Record<string,unknown>}
export interface DecodedAsset {geometry:THREE.BufferGeometry;header:PackedMesh}
const geometries=new Map<string,Promise<DecodedAsset>>();
const textures=new Map<string,THREE.Texture>();
const textureLoader=new THREE.TextureLoader();
export const pendingTextures:Promise<void>[]=[];
export const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
export const black=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);black.needsUpdate=true;
export function texture(path:string,repeat=true):THREE.Texture{
 path='/'+path.replace(/^\//,'').split('?')[0];
 const key=path+repeat;if(textures.has(key))return textures.get(key)!;
 let done!:()=>void;pendingTextures.push(new Promise(resolve=>done=resolve));
 const tex=textureLoader.load(path,done,undefined,()=>{console.warn('Texture unavailable',path);done();});
 tex.colorSpace=THREE.NoColorSpace;
 // Hydra's image decoder uploads PNGs with premultiplied alpha. The blue-noise
 // atlas stores random alpha, so this also affects the composite's grain/tone.
 tex.premultiplyAlpha=true;
 if(repeat)tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 textures.set(key,tex);return tex;
}
export function loadGeometry(path:string):Promise<DecodedAsset>{
 path=path.split('?')[0];if(geometries.has(path))return geometries.get(path)!;
 const task=(async()=>{
  if(path.endsWith('.bin')){
   const response=await fetch('/'+path.replace('assets/geometry/','assets/decoded/')+'.mesh');
   if(!response.ok)throw new Error('Missing decoded geometry '+path);
   const data=await response.arrayBuffer();const size=new DataView(data).getUint32(0,true);
   const header:PackedMesh=JSON.parse(new TextDecoder().decode(data.slice(4,size+4)));
   const geometry=new THREE.BufferGeometry();
   for(const [name,att]of Object.entries(header.attributes))geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(data,4+size+att.offset,att.count),att.itemSize));
   if(header.index)geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data,4+size+header.index.offset,header.index.count),1));
   if(geometry.attributes.position){geometry.computeBoundingBox();geometry.computeBoundingSphere();}
   geometry.userData=header.userData??{};return {geometry,header};
  }
  const response=await fetch('/'+path);if(!response.ok)throw new Error('Missing geometry '+path);
  const json=await response.json();let geometry:THREE.BufferGeometry;
  if(json.data?.attributes)geometry=new THREE.BufferGeometryLoader().parse(json);
  else {geometry=new THREE.BufferGeometry();for(const [key,v]of Object.entries(json)){
   if(!Array.isArray(v)||key==='bones')continue;
   if(key==='index')geometry.setIndex(v as number[]);
   else geometry.setAttribute(key,new THREE.Float32BufferAttribute(v as number[],key==='uv'||key==='uv2'?2:key==='position'||key==='normal'||key==='color'?3:1));
  }}
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return {geometry,header:{attributes:{},bones:json.bones}};
 })();geometries.set(path,task);return task;
}
