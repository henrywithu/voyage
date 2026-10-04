// Development-only character viewer (not part of the production build).
// /dev/viewer.html?mesh=story/sea/chaewon-bow&anim=story/sea/chaewon-bow-anim&yaw=0&pitch=0&dist=3&y=1.6&frame=0
// Static meshes: &static=1 (StaticCharacterBaseShader).
import * as THREE from "three";
import { loadGeometry, texture } from "../src/engine/assets";
import { material, shared } from "../src/engine/shaders";
import { SkeletalMesh } from "../src/engine/SkeletalMesh";

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(new THREE.Color(q.get("bg") ?? "#f4f2ec"));
document.body.appendChild(renderer.domElement);
shared.resolution.value.set(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(num("fov", 30), innerWidth / innerHeight, 0.05, 100);
const target = new THREE.Vector3(0, num("y", 1.2), 0);
const yaw = (num("yaw", 0) * Math.PI) / 180, pitch = (num("pitch", 0) * Math.PI) / 180, dist = num("dist", 4);
camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
camera.lookAt(target);
const tex = {
  tAtlas: texture("assets/images/story/chaewon/atlas.png"),
  tTrim: texture("assets/images/story/chaewon/trim.png"),
  tLines: texture("assets/images/story/lines.jpg"),
  tNoise: texture("assets/images/story/perlin.png"),
};
const light = new THREE.Vector3(num("lx", 0.3), num("ly", 0.4), num("lz", 1)).normalize();
(async () => {
  const asset = await loadGeometry(`assets/geometry/${q.get("mesh")}.bin`);
  let mesh: THREE.Object3D, outline: THREE.Object3D | undefined, skin: SkeletalMesh | undefined;
  if (q.get("static")) {
    const mat = material("StaticCharacterBaseShader", { ...tex, uColor: new THREE.Vector3(0.945, 0.925, 0.882), uLinesTile: num("tile", 2), uLightDir: light, uThreshold: new THREE.Vector2(0.4, 1.8), uLinesAxis: new THREE.Vector3(1, 0, 0.3).normalize(), uLinesAngle: -0.4 });
    mesh = new THREE.Mesh(asset.geometry, mat);
    const inv = material("StaticCharacterBaseShaderInverse", { ...tex, uLineWidth: num("lw", 0.004) });
    inv.side = THREE.BackSide;
    outline = new THREE.Mesh(asset.geometry, inv);
  } else {
    skin = new SkeletalMesh(asset, "SkinShader", { ...tex, uColor: new THREE.Vector3(0.945, 0.925, 0.882), uLinesTile: num("tile", 1.25), uLightDir: light, uAxis: new THREE.Vector3(1, 0, 2.5), uAngle: 0.5 });
    if (q.get("anim")) await skin.loadAnimation(`assets/geometry/${q.get("anim")}.bin`);
    mesh = skin.mesh;
    outline = skin.outline;
  }
  const group = new THREE.Group();
  group.add(mesh);
  if (outline) group.add(outline);
  scene.add(group);
  const frame = num("frame", -1);
  let last = performance.now();
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    shared.time.value = now / 1000;
    if (skin) skin.update(frame >= 0 ? 0 : dt, frame >= 0 ? frame : undefined);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  (window as unknown as { ready: boolean }).ready = true;
})();
