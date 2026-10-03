function UILGateView(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, Element),
        Inherit(_this, XComponent),
        (_this.fragName = "UILGateView"),
        (_this.contexts = "Element"),
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
        (_this.element.hide(),
          (_this.animateIn = function () {
            _this.element
              .css({ opacity: 0 })
              .show()
              .tween({ opacity: 1 }, 500, "easeOutCubic");
          }),
          (_this.animateOut = function () {
            return _this.element
              .tween({ opacity: 0 }, 500, "easeOutCubic")
              .onComplete(() => {
                _this.element.hide();
              })
              .promise();
          }),
          _this.element.goob(
            "\n    & {\n        opacity: 0;\n    }\n\n    .gate {\n        display: grid;\n        justify-items: center;\n        grid-template-rows: 1fr minmax(calc(var(--logo-size) + var(--spacing) * 2), calc(var(--logo-size) + var(--max-spacing))) 1fr;\n        max-height: 100%;\n    }\n\n    .gate-header {\n        display: flex;\n        align-items: center;\n    }\n\n    .version {\n        font: var(--label3);\n    }\n",
          ),
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
            "UILGateView" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }