function CursorShader(_mesh, _shader, _input, _group) {
    const _this = this;
    if (
      (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "CursorShader"),
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
        tText: { value: null, ignoreUIL: !0 },
        uTint: { value: new Color("#8C0D09") },
        uVelocity: { value: new Vector2(0, 0) },
      });
      let lastMouseX = Mouse.x,
        lastMouseY = Mouse.y,
        smoothVelocityX = 0,
        smoothVelocityY = 0;
      (_this.startRender(function loop() {
        const rawVelocityX = Mouse.x - lastMouseX,
          rawVelocityY = Mouse.y - lastMouseY;
        ((smoothVelocityX = Math.lerp(rawVelocityX, smoothVelocityX, 0.1)),
          (smoothVelocityY = Math.lerp(rawVelocityY, smoothVelocityY, 0.1)),
          Device.mobile ||
            ((_this.shader.uniforms.uVelocity.value.x = smoothVelocityX),
            (_this.shader.uniforms.uVelocity.value.y = -smoothVelocityY)));
        ((lastMouseX = Mouse.x), (lastMouseY = Mouse.y));
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
          "CursorShader" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }