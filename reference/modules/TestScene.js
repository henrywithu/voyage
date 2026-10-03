function TestScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "TestScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "TestScene"),
      (_this.contexts = "BaseView, 'TestScene'"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.init = async () => {
        const layers = await _this.layout.getAllLayers(),
          { border: border } = layers;
        ((border.shader.uniforms.uScreenHeightWorld.value = await _this.get(
          "Story/screenHeightWorld",
        )),
          (border.shader.uniforms.uSceneHeightWorld.value = _this.heightWorld),
          (border.geometry = border.geometry.clone()),
          (border.geometry.boundingSphere.radius = _this.heightWorld));
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
          "TestScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }