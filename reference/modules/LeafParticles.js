function LeafParticles(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params?.sceneLayoutName || "LeafParticles"),
      Inherit(_this, ParticleCurveBase),
      Inherit(_this, XComponent),
      (_this.fragName = "LeafParticles"),
      (_this.contexts =
        'Frag3D, _params?.sceneLayoutName || "LeafParticles",ParticleCurveBase'),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      const PARTICLE_COUNT = 1,
        [input, state] = _this.createUIL("LeafParticles");
      function releaseBatch({
        worldPos: worldPos,
        x: x = 1,
        y: y = 1,
        z: z = 1,
      }) {
        let count = 0;
        (_this.startRender(() => {
          ((count += Render.DELTA),
            count >= 100 &&
              ((count = 0), release({ worldPos: worldPos, x: x, y: y, z: z })));
        }),
          _this.layers.particles.behavior.shader.set("uProgress", 1));
      }
      function release({ worldPos: worldPos, x: x = 1, y: y = 1, z: z = 0 }) {
        let spawn = new Float32Array(3 * PARTICLE_COUNT);
        for (let i = 0; i < PARTICLE_COUNT; i++)
          ((spawn[3 * i + 0] = 0),
            (spawn[3 * i + 1] = -2),
            (spawn[3 * i + 2] = -3));
        _this.layers.particles.spawn.emit(spawn);
      }
      (input.addButton("release", {
        label: "release",
        actions: [
          {
            title: "Release",
            callback: (_) => {
              releaseBatch({
                worldPos: new Vector3(0, 0, 0),
                x: 0.3,
                y: 0.3,
                z: 0.3,
              });
            },
          },
        ],
      }),
        (_this.onInit = async (_) => {
          (_this.isPlayground() && _this.layers?.camera?.lock(),
            await _this.layers.particles.ready(),
            await _this.wait(_this.layers.particles.spawn, "lifeOutput"));
          const geom = World.PLANE_HIGH_RES;
          let shader = _this.createFragment(Shader, "LeafShader", {
            tMap: {
              value: Utils3D.getTexture(
                Assets.getPath("assets/images/story/antigrav/leaf-outline.png"),
              ),
            },
            side: Shader.DOUBLE_SIDE,
            transparent: !0,
            uColor: { value: new Color(16777215) },
          });
          (_this.layers.particles.applyToInstancedGeometry(geom),
            _this.layers.particles.applyToShader(shader),
            _this.layers.particles.spawn.applyToShader(shader));
          let mesh = new Mesh(geom, shader);
          ((mesh.frustumCulled = !1),
            _this.add(mesh),
            (_this.layers.particles.fps = 30),
            releaseBatch({
              worldPos: new Vector3(0, 0, 0),
              x: 0.3,
              y: 0.3,
              z: 0.3,
            }));
          const startDecay = _this.layers.particles.spawn.getDecay(),
            decayValue = { value: startDecay };
          _this.bind("DrawnParticles/Drawing", (value) => {
            value
              ? tween(
                  decayValue,
                  { value: 3 * startDecay },
                  3e3,
                  "easeOutCubic",
                ).onUpdate(() => {
                  _this.layers.particles.spawn.setDecay(decayValue.value);
                })
              : tween(
                  decayValue,
                  { value: startDecay },
                  3e3,
                  "easeOutCubic",
                ).onUpdate(() => {
                  _this.layers.particles.spawn.setDecay(decayValue.value);
                });
          });
        }),
        (_this.release = release),
        (onInit = _this.onInit === onInit ? null : _this.onInit));
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "LeafParticles" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }