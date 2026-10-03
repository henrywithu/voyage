function WanderBorderShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "WanderBorderShader"),
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
        uSceneHeightWorld: { value: 1, ignoreUIL: !0 },
        uScreenHeightWorld: { value: 1, ignoreUIL: !0 },
        uPadX: { value: 0.3 },
        uPadY: { value: 0.3 },
        uFixedWidth: { value: 0 },
        uScroll: { value: 0 },
        uProgress: { value: 0 },
        uMaxWidth: { value: 2100 },
        uDPR: { value: RenderManager.DPR },
      }),
        !Device.mobile &&
          Tests.useFluid() &&
          MouseFluid.instance().applyTo(_this.shader),
        (_this.shader.transparent = !0),
        _this.bind("Story/scrollY", (value) => {
          ((_this.shader.uniforms.uScroll.value = value),
            (_this.shader.uniforms.uSceneHeightWorld.value =
              _this.parent.parent.heightWorld));
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
          "WanderBorderShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }