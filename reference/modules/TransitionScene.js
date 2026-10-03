function TransitionScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "TransitionScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "TransitionScene"),
      (_this.contexts = "BaseView, 'TransitionScene'"),
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
      ((_this.init = async () => {}),
        (_this.handleResize = function handleResize() {
          const height = Utils3D.getHeightFromCamera(
              Global.CAMERA,
              Global.CAMERA.position.z,
            ),
            width = Utils3D.getWidthFromCamera(
              Global.CAMERA,
              Global.CAMERA.position.z,
            ),
            mul = _this.baseHeight;
          (_this.layers.background.scale.set(2 * width, height * mul, 1),
            (_this.layers.background.shader.transparent = !0),
            (_this.layers.background.shader.depthTest = !1),
            (_this.layers.background.shader.depthWrite = !1),
            (_this.layers.background.renderOrder = 1e5));
        }),
        (_this.animateIn = () => {}),
        (_this.animateOut = () => {}),
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
          "TransitionScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }