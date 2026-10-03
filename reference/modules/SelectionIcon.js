function SelectionIcon(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "SelectionIcon"),
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
            {
              className: "drawing-control-inner",
              _type: "div",
              refName: "controlInner",
              children: [
                {
                  noSplit: !0,
                  noResize: !0,
                  class: "body-bold",
                  text: "$state.text",
                  _type: "XText",
                  refName: "text",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.state.text = _this.params.text || "Hold"),
        (_this.animateSet = () => {
          _this.controlInner.transform({ scale: 0 });
        }),
        (_this.animateIn = () => {
          (_this.controlInner.tween({ scale: 1 }, 600, "easeOutCubic"),
            _this.text.element.tween({ opacity: 1 }, 600, "easeOutCubic"));
        }),
        (_this.animateOut = () => {
          (_this.controlInner.tween({ scale: 0 }, 300, "easeOutCubic"),
            _this.text.element.tween({ opacity: 0 }, 300, "easeOutCubic"));
        }),
        (_this.animateActive = (direction = "down") => {
          "down" === direction
            ? (_this.controlInner.tween({ scale: 0.5 }, 400, "easeOutCubic"),
              _this.text.element.tween({ opacity: 0 }, 400, "easeOutCubic"))
            : (_this.controlInner.tween({ scale: 1 }, 600, "easeOutCubic"),
              _this.text.element.tween({ opacity: 1 }, 600, "easeOutCubic"));
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
          "SelectionIcon" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }