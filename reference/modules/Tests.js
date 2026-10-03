function Tests() {
    const _this = this;
    (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "Tests"),
      (_this.contexts = "Component"),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.getDPR = (_) =>
        GPU.OVERSIZED
          ? 0.8
          : GPU.lt(0)
            ? 1
            : GPU.lt(1)
              ? Math.min(Device.pixelRatio, 1.2)
              : GPU.lt(2)
                ? Math.min(Device.pixelRatio, 1.35)
                : GPU.lt(3)
                  ? Math.min(Device.pixelRatio, 1.5)
                  : GPU.lt(4) || GPU.lt(5)
                    ? Math.min(Device.pixelRatio, 2)
                    : GPU.mobileLT(0)
                      ? 1
                      : GPU.mobileLT(1)
                        ? Math.min(Device.pixelRatio, 1.2)
                        : GPU.mobileLT(2)
                          ? Math.min(Device.pixelRatio, 1.35)
                          : GPU.mobileLT(3)
                            ? Math.min(Device.pixelRatio, 1.4)
                            : GPU.mobileLT(4)
                              ? Math.min(Device.pixelRatio, 1.6)
                              : GPU.mobileLT(5)
                                ? Math.min(Device.pixelRatio, 1.8)
                                : 1),
        (_this.useFluid = (_) => !GPU.lt(1) && !GPU.mobileLT(1)),
        (_this.domTilt = (_) => !Device.mobile),
        (_this.blurSamples = (_) => 9),
        (_this.capFPS = (_) => null),
        (_this.renderFXAA = (_) =>
          !1 === _this.msaaSamples() && !GPU.lt(1) && !GPU.mobileLT(2)),
        (_this.enableWorldNukeMSAA = (_) => !0),
        (_this.msaaSamples = (_) =>
          !(!Device.graphics.webgl.webgl2 || Utils.query("compat")) &&
          !Device.system.xr?.vr &&
          !GPU.lt(2) &&
          !GPU.mobileLT(2) &&
          (GPU.lt(3) || GPU.mobileLT(3) ? 2 : 4)),
        (_this.getXRType = (_) =>
          Device.system.xr.ar && !Device.system.xr.vr
            ? RenderManager.AR
            : Device.system.xr.vr
              ? RenderManager.VR
              : null),
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
          "Tests" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }