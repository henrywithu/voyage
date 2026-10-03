function XButton(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "XButton"),
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
              className: "x-button",
              clsx: "$params.class",
              _type: "button",
              refName: "btn",
              children: [
                {
                  class: "body-bold",
                  splitType: "lines, chars",
                  animType: "chars",
                  text: "$text",
                  _type: "XText",
                  refName: "xtext",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.text = _this.params.text || ""),
        (_this.ready = Promise.create()),
        (_this.onMounted = async () => {
          (await _this.wait("xtext"),
            _this.events.sub(Mouse.input, Interaction.CLICK, () => {
              const bounds = _this.btn.div.getBoundingClientRect();
              Mouse.x > bounds.left &&
                Mouse.x < bounds.right &&
                Mouse.y > bounds.top &&
                Mouse.y < bounds.bottom &&
                _this.onClick();
            }),
            _this.events.sub(Keyboard.DOWN, (e) => {
              document.activeElement === _this.btn.div &&
                "Enter" === e.key &&
                _this.onClick();
            }),
            _this.ready.resolve());
        }),
        (_this.animateSet = async () => {
          (await _this.ready, _this.xtext.animateSet());
        }),
        (_this.animateIn = async (delay = 0) => {
          (await _this.ready, _this.xtext.animateIn(delay));
        }),
        (_this.onClick = () => {
          _this.params.onClick?.();
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
          "XButton" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }