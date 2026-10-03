function TextDOMPlayground(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "TextDOMPlayground"),
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
              className: "heading1",
              _type: "h1",
              _innerText: "this is a heading 1",
              refName: "unnamed",
              children: [],
            },
            {
              className: "heading2",
              _type: "h2",
              _innerText: "this is a heading 2",
              refName: "unnamed",
              children: [],
            },
            {
              className: "heading3",
              _type: "h3",
              _innerText: "this is a heading 3",
              refName: "unnamed",
              children: [],
            },
            {
              className: "body-bold",
              _type: "p",
              _innerText: "this is a body bold",
              refName: "unnamed",
              children: [],
            },
            {
              className: "body-regular",
              _type: "p",
              _innerText: "this is a body regular",
              refName: "unnamed",
              children: [],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.onInit = async () => {}),
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
          "TextDOMPlayground" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }