import * as THREE from "three";
import gsap from "gsap";
import layoutJson from "../data/scene-layouts.json";
import groupJson from "../data/scene-groups.json";
import { loadGeometry } from "./assets";
import { material, ensureAttributes } from "./shaders";
import { SourceText } from "./SourceText";
import { applySourceSide } from "./MaterialFacing";
import { worldHeight, type SectionName } from "../data/sections";

export interface Layer {
  id: number;
  name: string;
  geometry?: { src: string };
  shader?: string;
  custom?: string;
  position?: number[];
  rotation?: number[];
  scale?: number[];
  parent?: string;
  wildcard?: string;
  uniforms: Record<string, unknown>;
  visible?: boolean;
  depthWrite?: boolean;
  depthTest?: boolean;
  transparent?: boolean;
  renderOrder?: number;
  side?: string;
}
export type Frame = {
  scroll: number;
  time: number;
  delta: number;
  hz: number;
  rawScrollDelta: number;
  width: number;
  height: number;
  pointer: THREE.Vector2;
  pressed: boolean;
  selected: number;
  camera: THREE.PerspectiveCamera;
  fixedCameraMatrix: THREE.Matrix4;
};
export class SceneSection {
  readonly group = new THREE.Group();
  readonly layers: Record<string, THREE.Object3D> = {};
  readonly meshes: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>[] =
    [];
  onSelect: (index: number) => void = () => {};
  onPointerClick?: () => void;
  blocksScroll = false;
  readonly audioState: Record<string, number> = {};
  onAudio: (id: string, volume?: number, roundRobin?: boolean) => void =
    () => {};
  onProductStep?: (delta: number) => void;
  onProductChange: (index: number) => void = () => {};
  control?: {
    label: string;
    mode?: "hold" | "choose";
    hovered?: boolean;
    top?: number;
    height?: number;
    mobilePosition?: THREE.Vector2;
  };
  top = 0;
  height = worldHeight;
  pixelTop = 0;
  pixelHeight = 720;
  progress = 0;
  onResize: (width: number, height: number) => void = () => {};
  animate: (frame: Frame) => void = () => {};
  onEnter?: (frame: Frame) => void;
  onLeave?: (frame: Frame) => void;
  private wasVisible = false;
  readonly beforeRender: ((
    renderer: THREE.WebGLRenderer,
    frame: Frame,
  ) => void)[] = [];
  readonly afterRender: ((
    renderer: THREE.WebGLRenderer,
    frame: Frame,
  ) => void)[] = [];
  readonly disposables: (() => void)[] = [];
  readonly updates: ((frame: Frame) => void)[] = [];
  constructor(readonly name: SectionName) {
    this.group.name = name;
  }
  async load() {
    const config =
      (layoutJson as unknown as Record<string, Record<string, Layer>>)[
        this.name
      ] ?? {};
    const groups =
      (groupJson as Record<string, Record<string, any>>)[this.name] ?? {};
    const groupMap: Record<string, THREE.Group> = {};
    for (const [key, value] of Object.entries(groups)) {
      const group = new THREE.Group();
      group.name = value.name;
      this.transform(group, value);
      this.layers[value.name] = group;
      groupMap[key] = group;
      this.group.add(group);
    }
    for (const layer of Object.values(config)) {
      if (layer.custom === "ParentLayer") {
        const group = new THREE.Group();
        this.transform(group, layer);
        group.name = layer.name;
        this.layers[layer.name] = group;
        this.group.add(group);
      }
    }
    await Promise.all(
      Object.values(config).map(async (layer) => {
        if (layer.custom === "Text3D") {
          const mesh = await SourceText.create(this.name, layer);
          if (mesh) {
            mesh.name = layer.name;
            this.transform(mesh, layer);
            mesh.renderOrder = layer.renderOrder ?? 0;
            mesh.material.depthWrite = layer.depthWrite ?? true;
            mesh.material.depthTest = layer.depthTest ?? true;
            this.layers[layer.name] = mesh;
            this.meshes.push(mesh);
            (groupMap[layer.parent ?? ""] ?? this.group).add(mesh);
          }
          return;
        }
        if (/^point/.test(layer.name)) {
          const marker = new THREE.Object3D();
          marker.name = layer.name;
          this.transform(marker, layer);
          this.layers[layer.name] = marker;
          (groupMap[layer.parent ?? ""] ?? this.group).add(marker);
          return;
        }
        if (layer.custom || /^(hit|cursor)/.test(layer.name)) return;
        // SceneLayout falls back to its UV-texture shader when the serialized
        // shader field is empty. The moon's dark back-face is authored this
        // way in ApproachScene, so dropping empty shader names loses a visible
        // source layer rather than merely skipping editor/debug geometry.
        const shaderName = layer.shader || "SceneLayout";
        let geometry: THREE.BufferGeometry;
        const path = layer.geometry?.src;
        if (path?.startsWith("assets/"))
          geometry = (await loadGeometry(path)).geometry;
        else if (path === "World.BOX") geometry = new THREE.BoxGeometry();
        else if (path === "World.SPHERE")
          geometry = new THREE.SphereGeometry(1, 24, 16);
        else if (path === "World.CYLINDER")
          geometry = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
        else if (path === "World.LIGHT_BEAM")
          geometry = new THREE.CylinderGeometry(
            1,
            1,
            1,
            64,
            64,
            true,
            -Math.PI / 2,
          );
        else
          geometry = new THREE.PlaneGeometry(
            1,
            1,
            path === "World.PLANE_MID_RES" ? 4 : 1,
            path === "World.PLANE_MID_RES" ? 4 : 1,
          );
        const mat = material(shaderName, layer.uniforms, true);
        if (layer.transparent !== undefined)
          mat.transparent = layer.transparent;
        if (layer.depthTest !== undefined) mat.depthTest = layer.depthTest;
        if (layer.depthWrite !== undefined) mat.depthWrite = layer.depthWrite;
        applySourceSide(mat, layer.side);
        ensureAttributes(geometry, mat);
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.name = layer.name;
        mesh.frustumCulled = false;
        mesh.renderOrder = layer.renderOrder ?? 0;
        mesh.visible = layer.visible !== false;
        this.transform(mesh, layer);
        this.layers[layer.name] = mesh;
        this.meshes.push(mesh);
        (groupMap[layer.parent ?? ""] ?? this.group).add(mesh);
      }),
    );
    for (const layer of Object.values(config)) {
      if (layer.custom === "ParentLayer")
        for (const name of (layer.wildcard ?? "")
          .split(",")
          .map((s) => s.trim()))
          if (this.layers[name]) this.layers[layer.name].add(this.layers[name]);
    }
  }
  transform(
    obj: THREE.Object3D,
    layer: { position?: number[]; rotation?: number[]; scale?: number[] },
  ) {
    if (layer.position) obj.position.fromArray(layer.position);
    if (layer.scale) obj.scale.fromArray(layer.scale);
    if (layer.rotation)
      obj.rotation.set(
        ...(layer.rotation.map((v) => (v * Math.PI) / 180) as [
          number,
          number,
          number,
        ]),
      );
  }
  mesh(name: string) {
    return this.layers[name] as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.RawShaderMaterial
    >;
  }
  uniform(layer: string, key: string, value: any) {
    const m = this.mesh(layer);
    if (m?.material?.uniforms[key]) m.material.uniforms[key].value = value;
  }
  addMesh(
    geometry: THREE.BufferGeometry,
    shader: THREE.RawShaderMaterial,
    parent: THREE.Object3D = this.group,
  ) {
    ensureAttributes(geometry, shader);
    const mesh = new THREE.Mesh(geometry, shader);
    mesh.frustumCulled = false;
    parent.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }
  layout(element: HTMLElement, width: number, height: number) {
    this.pixelTop = element.offsetTop;
    this.pixelHeight = element.offsetHeight;
    this.top = (this.pixelTop / height) * worldHeight;
    this.height = (this.pixelHeight / height) * worldHeight;
    this.group.position.y = worldHeight / 2 - this.top - this.height / 2;
    for (const mesh of this.meshes) {
      const u = mesh.material.uniforms;
      if (u.uScreenHeightWorld) u.uScreenHeightWorld.value = worldHeight;
      if (u.uSceneHeightWorld) u.uSceneHeightWorld.value = this.height;
      if (u.uHeightWorld) u.uHeightWorld.value = this.height;
    }
    this.onResize(width, height);
  }
  dispose() {
    this.disposables.splice(0).forEach((dispose) => dispose());
    const meshes = new Set<THREE.Mesh>(this.meshes);
    this.group.traverse((object) => {
      gsap.killTweensOf(object.position);
      gsap.killTweensOf(object.rotation);
      gsap.killTweensOf(object.scale);
      if (object instanceof THREE.Mesh) meshes.add(object);
    });
    const materials = new Set<THREE.Material>(),
      geometries = new Set<THREE.BufferGeometry>();
    for (const mesh of meshes) {
      geometries.add(mesh.geometry);
      for (const mat of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        materials.add(mat);
    }
    for (const mat of materials) {
      if (mat instanceof THREE.RawShaderMaterial)
        for (const uniform of Object.values(mat.uniforms))
          gsap.killTweensOf(uniform);
      mat.dispose();
    }
    geometries.forEach((geometry) => geometry.dispose());
    this.group.removeFromParent();
  }
  update(frame: Frame) {
    const y = (frame.scroll / frame.height) * worldHeight;
    this.progress = (y - this.top + worldHeight) / (this.height + worldHeight);
    this.group.visible =
      y + worldHeight > this.top - 0.3 && y < this.top + this.height + 0.3;
    if (this.group.visible && !this.wasVisible) this.onEnter?.(frame);
    if (!this.group.visible && this.wasVisible) this.onLeave?.(frame);
    this.wasVisible = this.group.visible;
    if (!this.group.visible) return;
    for (const mesh of this.meshes) {
      const u = mesh.material.uniforms;
      if (u.uScroll) u.uScroll.value = -y;
      if (u.uDiscardTop)
        u.uDiscardTop.value = (this.top + this.height - y) / worldHeight;
      if (u.uDiscardBottom)
        u.uDiscardBottom.value = (this.top - y) / worldHeight;
      if (u.uFixedCameraMatrix)
        u.uFixedCameraMatrix.value = frame.fixedCameraMatrix;
    }
    this.animate(frame);
    for (const fn of this.updates) fn(frame);
  }
}
