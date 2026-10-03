function UILPerformanceItem(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, ViewStateElement),
      Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILPerformanceItem"),
      (_this.contexts = "ViewStateElement,Element"),
      (_this.data = _data),
      (_this.index = _index),
      (_this.params = _params),
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
              _type: "span",
              _innerText: "$data.key",
              refName: "unnamed",
              children: [],
            },
            {
              _type: "span",
              _innerText: "$data.value",
              refName: "unnamed",
              children: [],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.element.goob(
        "\n    & {\n        display: flex;\n        font: var(--label3);\n        justify-content: space-between;\n        align-items: center;\n        margin-bottom: calc(var(--spacing-small) / 2);\n    }\n",
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
          "UILPerformanceItem" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }