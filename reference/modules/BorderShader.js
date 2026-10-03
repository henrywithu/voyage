function BorderShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "BorderShader"),
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
      (_this.shader.addUniforms({
        uColor: { value: new Color("#ffffff") },
        tMap: {
          value: Utils3D.getRepeatTexture(
            "assets/images/story/clouds_noise.png",
          ),
          ignoreUIL: !0,
        },
        uSceneHeightWorld: { value: 1 },
        uScreenHeightWorld: { value: 1 },
        uPadX: { value: 0.3 },
        uPadY: { value: 0.3 },
        uPadTop: { value: 0 },
        uFixedWidth: { value: 0 },
        uDepthSkew: { value: 0 },
        uDepthOffset: { value: 0 },
        uFragDepth: { value: 0 },
        uSkewCorrection: { value: 0 },
        uMaxWidth: { value: 2100 },
        uDPR: { value: RenderManager.DPR },
        uTransition: { value: 1 },
        uFluidEdge: { value: new Vector4(3, 3, 0, 0) },
        uFadeTop: { value: 0 },
      }),
        !Device.mobile &&
          Tests.useFluid() &&
          MouseFluid.instance().applyTo(_this.shader),
        (_this.shader.transparent = !0),
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
          "BorderShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }