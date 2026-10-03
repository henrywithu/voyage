function TargetBorderShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "TargetBorderShader"),
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
        uMaxWidth: { value: 2100 },
        uDPR: { value: RenderManager.DPR },
        uProgress: { value: 0, ignoreUIL: !0 },
        uDiscardTop: { value: 0, ignoreUIL: !0 },
        uDiscardBottom: { value: 1, ignoreUIL: !0 },
      }),
        (_this.shader.transparent = !0));
      const scene = _this.mesh._parent.classRef.parent;
      (_this.bind("Story/scrollY", (value) => {
        ((_this.shader.uniforms.uDiscardTop.value =
          (scene.worldTop + value) / _this.getSync("Story/screenHeightWorld")),
          (_this.shader.uniforms.uDiscardBottom.value =
            (scene.worldBottom + value) /
            _this.getSync("Story/screenHeightWorld")));
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
          "TargetBorderShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }