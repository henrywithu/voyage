import * as THREE from 'three';
import {SceneSection} from './SceneSection';
import {material} from './shaders';
export function outline(scene:SceneSection,layer:THREE.Mesh<THREE.BufferGeometry,THREE.RawShaderMaterial>,shader:string,width:number,parent=layer.parent!){
 const mat=material(shader,{uLineWidth:width});mat.side=THREE.BackSide;
 for(const key of Object.keys(mat.uniforms))if(layer.material.uniforms[key]&&key!=='uLineWidth')mat.uniforms[key]=layer.material.uniforms[key];
 const mesh=scene.addMesh(layer.geometry,mat,parent);mesh.position.copy(layer.position);mesh.quaternion.copy(layer.quaternion);mesh.scale.copy(layer.scale);mesh.renderOrder=layer.renderOrder+1;return mesh;
}
