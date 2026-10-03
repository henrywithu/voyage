function CollectionUI(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseUI),
      Inherit(_this, XComponent),
      (_this.fragName = "CollectionUI"),
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
          children: [
            {
              className: "collection-ui__center-text",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  addSrOnly: !0,
                  noResize: !0,
                  noSplit: !0,
                  class: "body-bold left-text",
                  text: "The night STARTS<br> after dinner",
                  _type: "XText",
                  refName: "leftText",
                  children: [],
                },
                {
                  className: "collection-ui__center-text__divider",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      className: "sr-only",
                      _type: "span",
                      _innerText:
                        "\n                    Chill your spirit. The night starts after dinner. Shake your spirit. Let the night play on. Pour your spirit. What happens next is up to you.\n                ",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  addSrOnly: !0,
                  noResize: !0,
                  noSplit: !0,
                  class: "body-bold right-text",
                  text: "What happens<br> next is up to you",
                  _type: "XText",
                  refName: "rightText",
                  children: [],
                },
              ],
            },
            {
              className: "collection-ui__container",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  className: "collection-ui__text-quad",
                  _type: "div",
                  refName: "textQuadProxy",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.useScrollTrigger = !0),
        (_this.scrollTriggerOffsetIn = 0.5),
        (_this.scrollTriggerOffsetOut = 0),
        (_this.onInit = async () => {}),
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
          "CollectionUI" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }