function FooterScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "FooterScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "FooterScene"),
      (_this.contexts = "BaseView, 'FooterScene'"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let _camera,
        onInit = _this.onInit;
      ((_this.init = async () => {
        _this.handleResize = function handleResize() {
          const dist = _camera.camera.position.length();
          ((_this.screenHeight = Utils3D.getHeightFromCamera(
            _camera.camera,
            dist,
          )),
            (_this.screenWidth = _this.screenHeight * _camera.camera.aspect),
            bg.scale.set(
              3 * _this.screenWidth,
              _this.screenHeight * _this.baseHeight * 1.3,
              1,
            ));
        };
        const layers = await _this.layout.getAllLayers(),
          { mainCamera: mainCamera, bg: bg } = layers;
        (_this.isPlayground()
          ? (_camera = mainCamera)
          : (await _this.wait(() => !!Global.CAMERA),
            (_camera = Global.CAMERA)),
          (_this.onInView = () => {}),
          (_this.onViewOut = () => {}),
          _this.isPlayground() &&
            (_this.handleResize(), _camera.lock(), _this.onInView()));
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
          "FooterScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }