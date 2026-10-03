function TransitionLineShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "TransitionLineShader"),
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
        tLines: {
          value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
          ignoreUIL: !0,
        },
        tNoise: {
          value: Utils3D.getRepeatTexture(
            "assets/images/story/clouds_noise.png",
          ),
          ignoreUIL: !0,
        },
        uScroll: { value: 0, ignoreUIL: !0 },
        uRepeat: { value: 1, ignoreUIL: !0 },
        uFixed: { value: 0, ignoreUIL: !0 },
        uFixedCameraMatrix: { value: new Matrix4(), ignoreUIL: !0 },
      }),
        _this.startRender(() => {
          ((_this.shader.uniforms.uScroll.value =
            _this.getSync("Story/scrollY") || 0),
            Global?.CAMERA?._fixedCamera &&
              ((_this.shader.uniforms.uFixed.value = 1),
              _this.shader.uniforms.uFixedCameraMatrix.value.copy(
                Global.CAMERA._fixedCamera.camera.matrixWorldInverse,
              )));
        }),
        _this.onResize(() => {
          _this.shader.uniforms.uRepeat.value = Math.range(
            Stage.width,
            320,
            1600,
            0.4,
            1,
          );
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
          "TransitionLineShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }