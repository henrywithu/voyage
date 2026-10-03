function LightBeamShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "LightBeamShader"),
      (_this.contexts = "Component"),
      (_this.mesh = _mesh),
      (_this.shader = _shader),
      (_this.uilInput = _input),
      (_this.uilFolder = _group),
      _this.uilFolder?.addButton)
    ) {
      let a = _this.uilFolder;
      ((_this.uilFolder = _this.uilInput), (_this.uilInput = a));
    }
    this.isFragment = !0;
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      _this.shader.addUniforms({
        color: { value: new Color(16777215) },
        uTime: { value: 0 },
        uDiscardBottom: { value: 0, ignoreUIL: !0 },
        tWindNoise: { value: null, getTexture: Utils3D.getRepeatTexture },
        tNoise: { value: null, getTexture: Utils3D.getRepeatTexture },
        tLines: {
          value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
        },
        uDiscardTop: { value: 1, ignoreUIL: !0 },
        uScale: { value: new Vector3(1.8, 6.4, 1.8) },
        uOffsetX: { value: 0.1 },
        colorB: { value: new Color(16777215) },
        uMask: { value: new Vector2(0.3, 0.05) },
        uNoise: { value: new Vector3(1, 0.4, 0.15) },
        uRotation: { value: new Vector2(360, 5) },
        uXZScale: { value: new Vector2(0.4, 1.3) },
        uSmoothstep: { value: new Vector2(0, 0.05) },
        uTimeUp: { value: 0 },
        uDraw: { value: 0 },
        uParabolaK: { value: 1 },
        uAnimateInMask: { value: 0 },
        uAnimateNoise: { value: 0 },
        uEndNoise: { value: new Vector2(1.62, 10) },
        uEndsMask: { value: new Vector2(0.2, 1) },
        uNoiseUVTimeSpeed: { value: new Vector2(0.05, 0.05) },
        uNoiseUVScaleA: { value: new Vector2(0.4, 0.4) },
        uNoiseUVScaleB: { value: new Vector2(0.3, 0.3) },
        uWindNoiseThreshold: { value: 0.3 },
      });
      const scene = _this.mesh._parent.classRef.parent;
      (_this.bind("Story/scrollY", (value) => {
        ((_this.shader.uniforms.uDiscardTop.value =
          (scene.worldTop + value) / _this.get("Story/screenHeightWorld")),
          (_this.shader.uniforms.uDiscardBottom.value =
            (scene.worldBottom + value) /
            _this.get("Story/screenHeightWorld")));
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
          "LightBeamShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }