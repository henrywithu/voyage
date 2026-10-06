import * as THREE from 'three';
import {SceneSection} from './SceneSection';
import {material} from './shaders';
import {texture} from './assets';
import {assetUrl} from './assetUrl';
export async function windLines(scene:SceneSection,path:string|{curves:{position:number[]}[]},params:Record<string,unknown>={},shader='WindLineShader'){
 const curves=typeof path==='string'?(await fetch(assetUrl(path)).then(r=>r.json())).data.curves as {position:number[]}[]:path.curves;
 const position:number[]=[],uv:number[]=[],currpos:number[]=[],nextpos:number[]=[],prevpos:number[]=[],random:number[]=[],index:number[]=[];let counter=0;
 const point=new THREE.Vector3(),prev=new THREE.Vector3(),next=new THREE.Vector3();
 for(const curve of curves){const data=curve.position,n=data.length/3,rand=Math.random();for(let i=0;i<n;i++){
  point.fromArray(data,i*3);if(i<n-1)next.fromArray(data,(i+1)*3);else next.copy(point).multiplyScalar(2).sub(new THREE.Vector3().fromArray(data,(i-1)*3));
  if(i>0)prev.fromArray(data,(i-1)*3);else prev.copy(point).multiplyScalar(2).sub(new THREE.Vector3().fromArray(data,3));
  for(let j=0;j<2;j++){position.push(0,0,0);uv.push(1-j,i/(n-1));currpos.push(...point.toArray());nextpos.push(...next.toArray());prevpos.push(...prev.toArray());random.push(rand);}
 }for(let i=0;i<2*n-2;i++)index.push(counter+i,counter+i+(i%2?2:1),counter+i+(i%2?1:2));counter+=2*n;}
 const geometry=new THREE.BufferGeometry();for(const [key,data,size]of [['position',position,3],['uv',uv,2],['currpos',currpos,3],['nextpos',nextpos,3],['prevpos',prevpos,3],['random',random,1]] as const)geometry.setAttribute(key,new THREE.Float32BufferAttribute(data,size));geometry.setIndex(index);
 return scene.addMesh(geometry,material(shader,{tMap:texture('assets/images/story/clouds_noise.png'),uScroll:0,uThreshold:.4,uSpeed:0,uAnimatePosition:0,uTile:1,uFrameRate:60,...params}));
}
