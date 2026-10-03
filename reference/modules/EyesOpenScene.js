function EyesOpenScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "EyesOpenScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "EyesOpenScene"),
      (_this.contexts = "BaseView, 'EyesOpenScene'"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        (_this.floatingFrame1 = _this.initClass(
          FloatingFrameEyesAG,
          AppState.createLocal({
            verticalAlign: "center",
            pady: 0,
            padx: 0,
            frameWidth: 2,
            frameHeight: 0.6,
            frameZ: 0,
            zOffset: 1,
          }),
        )),
        _this.floatingFrame1.isFragment &&
          _promises.push(_this.wait(_this.floatingFrame1, "__ready")),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let _camera,
        onInit = _this.onInit;
      ((_this.init = async () => {
        const layers = await _this.layout.getAllLayers(),
          { mainCamera: mainCamera, bg: bg } = layers;
        (console.log(bg),
          (bg.renderOrder = -1),
          _this.isPlayground()
            ? (_camera = mainCamera)
            : (await _this.wait(() => !!Global.CAMERA),
              (_camera = Global.CAMERA)),
          _this.flag("ready", !0),
          (_this.handleResize = function handleResize() {
            if (!_this.flag("ready")) return;
            const dist = _camera.camera.position.length();
            ((_this.screenHeight = Utils3D.getHeightFromCamera(
              _camera.camera,
              dist,
            )),
              (_this.screenWidth = _this.screenHeight * _camera.camera.aspect),
              bg.scale.set(
                3 * _this.screenWidth,
                _this.screenHeight * _this.baseHeight * 1.01,
                1,
              ),
              _this.floatingFrame1.handleResize());
          }));
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
          "EyesOpenScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }