function PillarFractureShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "PillarFractureShader"),
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
        tLines: {
          value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
        },
        tNoise: {
          value: Utils3D.getRepeatTexture("assets/images/story/perlin.png"),
        },
        uColorHighlight: { value: new Color("#ffffff") },
        uColor: { value: new Color("#ae9c74") },
        uLinesTile: { value: 4.5 },
        uLightDir: { value: new Vector3(-0.75, 0.75, 2).normalize() },
        uAxis: { value: new Vector3(0, 0.5, 2).normalize() },
        uAngle: { value: -0.5 },
        uDistanceCompensation: { value: 0 },
        uThreshold: { value: new Vector2(0.4, 0.7) },
        uVerticalGrad: { value: new Vector2(1e3, 1001) },
        uFractureThreshold: { value: 1 },
        uTimeOffset: { value: 1 },
        uDiscardTop: { value: 1 },
        uDiscardBottom: { value: 0 },
        uMouse: { value: new Vector3(0, 0, 0) },
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
          "PillarFractureShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }