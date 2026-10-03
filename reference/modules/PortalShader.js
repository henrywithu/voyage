function PortalShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "PortalShader"),
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
        tMap: { value: null, getTexture: Utils3D.getRepeatTexture },
        uDiscardBottom: { value: 0, ignoreUIL: !0 },
        uDiscardTop: { value: 1, ignoreUIL: !0 },
        uSteppedTime: { value: 8 },
        uLinesTile: { value: 1 },
        uStep: { value: 0 },
        uColor1: { value: new Color("#000000") },
        uColor2: { value: new Color("#ffffff") },
      }),
        Tests.useFluid() && MouseFluid.instance().applyTo(_this.shader));
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
          "PortalShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }