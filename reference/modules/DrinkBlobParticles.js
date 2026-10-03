function DrinkBlobParticles(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params?.sceneLayoutName || "DrinkBlobParticles"),
      Inherit(_this, ParticleCurveBase),
      Inherit(_this, XComponent),
      (_this.fragName = "DrinkBlobParticles"),
      (_this.contexts =
        'Frag3D, _params?.sceneLayoutName || "DrinkBlobParticles",ParticleCurveBase'),
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
        [input, state] = _this.createUIL("LeafParticles"),
        blobShaders = [];
      function releaseBatch(worldPos) {
        let count = 0;
        function loop() {
          ((count += Render.DELTA),
            count >= 120 && ((count = 0), release(_this.spawnPoint)));
        }
        return (
          release(_this.spawnPoint),
          _this.startRender(loop),
          blobShaders.forEach((shader) => {
            shader.set("uAnimate", 0);
          }),
          () => {
            (_this.stopRender(loop), _this.resetCurves());
          }
        );
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
            await _this.wait(_this.layers.particles.spawn, "lifeOutput"),
            (_this.layers.particles.antimatter.storeVelocity = !0));
          const geom = World.SPHERE_LOW_RES,
            shader = _this.createFragment(Shader, "BlobShader", {
              tMap: {
                value: Utils3D.getTexture(
                  Assets.getPath("assets/images/story/antigrav/leaf.png"),
                ),
              },
              uColor: { value: new Color("#ffffff") },
              uInverse: { value: 1 },
              uAnimate: { value: 0 },
              side: Shader.BACK_SIDE,
              transparent: !0,
            });
          (blobShaders.push(shader),
            _this.layers.particles.applyToInstancedGeometry(geom),
            _this.layers.particles.applyToShader(shader),
            _this.layers.particles.spawn.applyToShader(shader));
          let mesh = new Mesh(geom, shader);
          ((mesh.frustumCulled = !1), _this.add(mesh), mesh.upload());
          const geometry2 = World.SPHERE_LOW_RES,
            shader2 = _this.createFragment(Shader, "BlobShader", {
              tMap: {
                value: Utils3D.getTexture(
                  Assets.getPath("assets/images/story/antigrav/leaf.png"),
                ),
              },
              uColor: { value: new Color("#ffffff") },
              uInverse: { value: 0 },
              uAnimate: { value: 0 },
              side: Shader.DOUBLE_SIDE,
              transparent: !0,
            });
          (blobShaders.push(shader2),
            _this.layers.particles.applyToInstancedGeometry(geometry2),
            _this.layers.particles.applyToShader(shader2),
            _this.layers.particles.spawn.applyToShader(shader2));
          let mesh2 = new Mesh(geometry2, shader2);
          ((mesh2.frustumCulled = !1),
            _this.add(mesh2),
            (_this.layers.particles.fps = 30));
        }),
        (_this.resetCurves = async () => {
          const lifeVars = _this.layers.particles.spawn.getLifeVariables();
          (await Promise.all(
            blobShaders.map(
              (shader) => (
                shader.set("uAnimate", 0),
                shader.tween("uAnimate", 1, 200, "easeOutCubic").promise()
              ),
            ),
          ),
            lifeVars.buffer.fill(0),
            (lifeVars.texture.needsUpdate = !0));
        }));
      const DEFAULT_WORLD_POS = new Vector3(0, 0, 0);
      function release(pos = DEFAULT_WORLD_POS) {
        let spawn = new Float32Array(3 * PARTICLE_COUNT);
        for (let i = 0; i < PARTICLE_COUNT; i++)
          ((spawn[3 * i + 0] = pos.x),
            (spawn[3 * i + 1] = pos.y),
            (spawn[3 * i + 2] = pos.z));
        _this.layers.particles.spawn.emit(spawn);
      }
      ((_this.release = release),
        (_this.releaseBatch = releaseBatch),
        (_this.setColor = async (color) => {
          await _this.wait(() => 2 === blobShaders.length);
          const [shader, shader2] = blobShaders;
          ((shader.uniforms.uColor.value = color),
            (shader2.uniforms.uColor.value = color));
        }),
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
          "DrinkBlobParticles" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }