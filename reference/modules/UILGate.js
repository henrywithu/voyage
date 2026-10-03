function UILGate(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGate"),
      (_this.contexts = "Element"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          _type: "UI",
          refName: "unnamed",
          children: [
            { _type: "UILGateLogin", refName: "login", children: [] },
            { _type: "UILGateError", refName: "error", children: [] },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.views = { login: _this.login, error: _this.error }),
        _this.createState(),
        _this.bindState(
          _this.state,
          "updateView",
          async function updateView(newView) {
            _this.state.currentView &&
              (await _this.views[_this.state.currentView].animateOut());
            (_this.views[newView].animateIn(),
              _this.state.set("currentView", newView));
          },
        ),
        _this.state.set("updateView", "login"),
        (_this.animateIn = function () {
          _this.element.tween({ opacity: 1 }, 500, "easeOutCubic");
        }),
        (_this.animateOut = function () {
          _this.element
            .tween({ opacity: 0 }, 500, "easeOutCubic")
            .onComplete(() => _this.destroy());
        }),
        _this.element.goob(
          "\n    & {\n        background-color: var(--color-black);\n        position: absolute;\n        inset: 0;\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        pointer-events: all;\n        opacity: 0;\n        z-index: 100001;\n    }\n\n",
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
          "UILGate" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }