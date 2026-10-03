import * as THREE from "three";
import { SceneSection } from "../engine/SceneSection";
import { material } from "../engine/shaders";
import { texture } from "../engine/assets";
import { range, clamp } from "../data/sections";

/** The original PourFX ballistic ribbon: 64 staggered particles, gravity -15, original splash shaders. */
export class PourStream {
  readonly base: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  readonly ribbon: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  readonly spawn = new THREE.Vector3();
  strength = 0;
  private readonly points = Array.from({ length: 64 }, (_, i) => ({
    position: new THREE.Vector3(0, 0.1 - 0.005 * i, 0),
    velocity: new THREE.Vector3(),
    life: i / 64,
  }));
  private readonly direction = new THREE.Vector3();
  private readonly previous = new THREE.Vector3();
  private readonly next = new THREE.Vector3();
  constructor(
    section: SceneSection,
    parent: THREE.Group,
    spawnScale: number,
    spawnZ: number,
  ) {
    const noise = texture("assets/images/story/drinkpour/T_Noise15.png");
    this.base = section.addMesh(
      new THREE.PlaneGeometry(),
      material("PourBasePlaneShader", {
        tNoise: noise,
        uImpactPos: new THREE.Vector3(),
        uSpawnPos: this.spawn,
        uPourStrength: 1,
        uWaterLine: 1,
        uColor: new THREE.Color(110 / 255, 192 / 255, 240 / 255),
      }),
      parent,
    );
    this.base.material.transparent = true;
    this.base.scale.setScalar(0.125 * spawnScale);
    this.base.position.z = spawnZ - 0.55;
    const geometry = new THREE.BufferGeometry(),
      uv: number[] = [],
      index: number[] = [];
    for (let i = 0; i < 64; i++) {
      uv.push(1, i / 63, 0, i / 63);
      if (i < 63) {
        const n = i * 2;
        index.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(index);
    for (const name of ["position", "currpos", "nextpos", "prevpos"])
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(new Float32Array(128 * 3), 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
    this.ribbon = section.addMesh(
      geometry,
      material("PourLineShader", {
        tNoise: noise,
        uPourStrength: 1,
        uClipHeight: 2.8,
        uClipAngle: Math.PI / 9,
        uThickness: 1,
        uColor: new THREE.Color(110 / 255, 192 / 255, 240 / 255),
        uBasePlanePos: new THREE.Vector3(),
      }),
      parent,
    );
    this.ribbon.material.transparent = true;
  }
  update(
    delta: number,
    time: number,
    base: THREE.Vector3,
    tip: THREE.Vector3,
    rootScale: number,
    selected: number,
  ) {
    this.spawn.copy(tip);
    this.direction.subVectors(tip, base).normalize();
    this.strength =
      clamp(range(this.direction.x, 0.9, 0.995, 0, 1, false)) ** 2;
    this.base.material.uniforms.uImpactPos.value.copy(
      this.points.at(-1)!.position,
    );
    this.base.material.uniforms.uPourStrength.value = this.strength;
    const speed = (1.5 + (0.5 * Math.sin(time * 7.5) + 0.5)) * this.strength;
    for (const p of this.points) {
      if (p.life > 1) {
        p.position.copy(this.spawn);
        p.velocity.set(speed, 0, 0);
        p.life = 0;
      }
      p.velocity.y -= 15 * delta;
      p.velocity.x *= 0.95 - 0.25 * (1 - this.strength);
      p.position.addScaledVector(p.velocity, delta);
      p.life += 1 / 63;
    }
    this.points.sort((a, b) => a.life - b.life);
    const attributes = this.ribbon.geometry.attributes;
    this.points.forEach((point, i) => {
      const position = point.position;
      if (i === 63)
        this.next
          .copy(position)
          .multiplyScalar(2)
          .sub(this.points[i - 1].position);
      else this.next.copy(this.points[i + 1].position);
      if (i === 0)
        this.previous
          .copy(position)
          .multiplyScalar(2)
          .sub(this.points[1].position);
      else this.previous.copy(this.points[i - 1].position);
      for (const [key, value] of [
        ["currpos", position],
        ["prevpos", this.previous],
        ["nextpos", this.next],
      ] as const) {
        attributes[key].setXYZ(i * 2, value.x, value.y, value.z);
        attributes[key].setXYZ(i * 2 + 1, value.x, value.y, value.z);
        attributes[key].needsUpdate = true;
      }
    });
    const uniforms = this.ribbon.material.uniforms;
    uniforms.uPourStrength.value = this.strength;
    uniforms.uClipHeight.value = range(rootScale, 0.69, 1.73, 1.2, 2.8, false);
    uniforms.uThickness.value = range(rootScale, 0.69, 1.73, 0.4, 1, false);
    for (const mesh of [this.base, this.ribbon])
      mesh.material.uniforms.uColor.value
        .set(["#63c4f4", "#97f3ad", "#fbeb7f"][selected])
        .convertLinearToSRGB();
  }
}
