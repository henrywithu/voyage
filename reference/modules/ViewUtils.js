function ViewUtils() {
      const _this = this;
      (Inherit(_this, XComponent),
        (_this.fragName = "ViewUtils"),
        (_this.contexts = ""),
        (this.isFragment = !0));
      var _promises = [];
      !(async function () {
        (_this.element &&
          (_this.element.onMountedHook = (_) => _this.onMounted?.()),
          _this.layout?.getAllLayers &&
            (_this.layers = await _this.layout.getAllLayers()));
        let onInit = _this.onInit;
        ((_this.parentView = ViewUtils.findView(_this)),
          (_this.parentUI = _this.parentView?.ui),
          (_this.onViewResize = function (cb) {
            if (_this.parentView) {
              const unsub = _this.parentView.onViewResize(cb);
              _this._bindOnDestroy(() => unsub());
            } else _this.onResize(cb, !1);
          }),
          (_this.waitForEl = async (el) => {
            (await _this.wait(el), await _this.wait(_this[el], "element"));
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
            "ViewUtils" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }