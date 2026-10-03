function DrinkLineParticles(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params?.sceneLayoutName || "DrinkLineParticles"),
      Inherit(_this, ParticleCurveBase),
      Inherit(_this, XComponent),
      (_this.fragName = "DrinkLineParticles"),
      (_this.contexts =
        'Frag3D, _params?.sceneLayoutName || "DrinkLineParticles",ParticleCurveBase'),
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
      const [input, state] = _this.createUIL("LineParticles");
      function releaseBatch(worldPos) {
        let count = 0;
        function loop() {
          ((count += Render.DELTA),
            count >= 120 && ((count = 0), release(worldPos)));
        }
        return (
          _this.startRender(loop),
          () => {
            _this.stopRender(loop);
          }
        );
      }
      (input.addButton("release", {
        label: "release",
        actions: [
          {
            title: "Release",
            callback: (_) => {
              releaseBatch();
            },
          },
        ],
      }),
        (_this.onInit = async (_) => {
          (_this.isPlayground() && _this.layers?.camera?.lock(),
            await _this.layers.particles.ready(),
            (_this.layers.particles.fps = 24),
            await _this.wait(
              () =>
                _this.layers.particles.tubes &&
                _this.layers.particles.tubes.shader,
            ),
            (_this.layers.particles.tubes.shader.blending =
              Shader.SUBTRACTIVE_BLENDING));
        }));
      const DEFAULT_WORLD_POS = new Vector3(0, 0, 0);
      function release(worldPos = DEFAULT_WORLD_POS) {
        _this.layers.particles.tubes.release(
          worldPos,
          1,
          0,
          new Vector3(1, 2 * Math.random(), 1),
        );
      }
      ((_this.release = release),
        (_this.releaseBatch = releaseBatch),
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
          "DrinkLineParticles" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }