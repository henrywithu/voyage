function GlassLiquidPBR(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "GlassLiquidPBR"),
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
        uColor: { value: new Color("#F4E27D") },
        uColorDark: { value: new Color("#CB2C1F") },
        uColor2: { value: new Color("#ff0000") },
        uColor2Dark: { value: new Color("#dd0000") },
        uTransition: { value: 0.5 },
        tRefraction: { value: null },
        tNoise: { value: null, getTexture: Utils3D.getRepeatTexture },
        uMultiplier: { value: 1 },
        uOpacity: { value: 1, ignoreUIL: !0 },
        uFillAmount: { value: 0.5 },
        uObjectPosition: { value: new Vector3(0, 0, 0), ignoreUIL: !0 },
        uWobbleX: { value: 0, ignoreUIL: !0 },
        uWobbleZ: { value: 0, ignoreUIL: !0 },
        uRefractionStrength: { value: new Vector2(0, 1) },
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
          "GlassLiquidPBR" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }