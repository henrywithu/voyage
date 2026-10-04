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
const target = new THREE.Vector3(num("x", 0), num("y", 1.2), num("z", 0));
const yaw = (num("yaw", 0) * Math.PI) / 180, pitch = (num("pitch", 0) * Math.PI) / 180, dist = num("dist", 4);
camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
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
  } else if (q.get("hand")) {
    skin = new SkeletalMesh(asset, "SkinHandShader", { tTrim: tex.tTrim, tLines: tex.tLines, tNoise: tex.tNoise, uLinesTile: num("tile", 12), uColor: new THREE.Vector3(150 / 255, 138 / 255, 131 / 255), uLightDir: new THREE.Vector3(-1.5, 0.5, 2), uAxis: new THREE.Vector3(0.1, -0.5, 0), uAngle: 1.5, uPortalPlane: new THREE.Vector4(0, 0, 1, num("portal", 100)), uPortalFeather: 0.005, uDiscard: new THREE.Vector2(1, 0) }, "InverseSkinHandShader");
    if (q.get("anim")) await skin.loadAnimation(`assets/geometry/${q.get("anim")}.bin`);
    mesh = skin.mesh;
    outline = skin.outline;
  } else {
    skin = new SkeletalMesh(asset, "SkinShader", { ...tex, uColor: new THREE.Vector3(0.945, 0.925, 0.882), uLinesTile: num("tile", 1.25), uLightDir: light, uAxis: new THREE.Vector3(1, 0, 2.5), uAngle: 0.5 });
    if (q.get("anim")) await skin.loadAnimation(`assets/geometry/${q.get("anim")}.bin`);
    mesh = skin.mesh;
    outline = skin.outline;
  }
  const group = new THREE.Group();
  // Static environment objects (StaticObjectBaseShader + inverse-hull outline): &extra=story/sea/boat,...
  for (const path of (q.get("extra") ?? "").split(",").filter(Boolean)) {
    const env = await loadGeometry(`assets/geometry/${path}.bin`);
    const params = { tLines: tex.tLines, tNoise: tex.tNoise, uLinesTile: num("otile", 0.7), uLightDir: new THREE.Vector3(num("olx", 0.3), num("oly", 1), num("olz", 0.6)), uThreshold: new THREE.Vector2(num("oth0", -0.4), num("oth1", 0.6)), uAxis: new THREE.Vector3(-0.54, 0, 1), uAngle: 1.55, uDistanceCompensation: 0, uColor: new THREE.Color("#f3f1e9"), uColorHighlight: new THREE.Color("#ffffff"), uVerticalGrad: new THREE.Vector2(100, 101), uDiscardTop: 2, uDiscardBottom: -1 };
    const envMesh = new THREE.Mesh(env.geometry, material("StaticObjectBaseShader", params));
    const inv = material("StaticObjectBaseShaderInverse", { uLineWidth: num("olw", 0.0025), uDiscardTop: 2, uDiscardBottom: -1 });
    inv.side = THREE.BackSide;
    group.add(envMesh, new THREE.Mesh(env.geometry, inv));
  }
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
