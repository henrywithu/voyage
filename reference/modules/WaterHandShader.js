function WaterHandShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "WaterHandShader"),
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
        tHand: { value: null },
        uColor1: { value: new Color("#000000") },
        uColor2: { value: new Color("#ffffff") },
        uColor3: { value: new Color("#ff0000") },
        uColor4: { value: new Color("#C82924") },
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
        tBlueNoise: {
          value: Utils3D.getRepeatTexture(
            "assets/images/bluenoise/bluenoise0.png",
          ),
          ignoreUIL: !0,
        },
        uFixed: { value: 0 },
        uFixedCameraMatrix: { value: new Matrix4() },
        uScroll: { value: 0 },
        uPageScroll: { value: 0 },
      }),
        _this.startRender(() => {
          Global?.CAMERA?._fixedCamera &&
            ((_this.shader.uniforms.uFixed.value = 1),
            _this.shader.uniforms.uFixedCameraMatrix.value.copy(
              Global.CAMERA._fixedCamera.camera.matrixWorldInverse,
            ));
        }, Render.BEFORE_RENDER),
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
          "WaterHandShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }