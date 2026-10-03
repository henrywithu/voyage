function DrinkSelectionUI(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseUI),
      Inherit(_this, XComponent),
      (_this.fragName = "DrinkSelectionUI"),
      (_this.contexts = "BaseUI"),
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
          children: [],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.useScrollTrigger = !0),
        (_this.scrollTriggerOffsetIn = 0.25),
        (_this.scrollTriggerOffsetOut = 0.25),
        (_this.onInit = () => {}),
        (_this.onInView = () => {
          _this.animateIn();
        }),
        (_this.onOutView = () => {
          _this.animateOut();
        }),
        (_this.animateIn = () => {
          _this.parent.animateIn?.();
        }),
        (_this.animateOut = () => {
          _this.parent.animateOut?.();
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
          "DrinkSelectionUI" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }