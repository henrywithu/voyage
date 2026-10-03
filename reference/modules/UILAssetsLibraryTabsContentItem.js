function UILAssetsLibraryTabsContentItem(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILAssetsLibraryTabsContentItem"),
      (_this.contexts = "Element,ViewStateElement"),
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
              _type: "article",
              refName: "contentContainer",
              children: [
                {
                  view: "UILAssetFile",
                  data: "$state.tabData",
                  _type: "ViewState",
                  refName: "unnamed",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.createState(),
        _this.state.set("tabData", new StateArray(_this.data.content)),
        _this.element.goob(
          "\n    .contentContainer {\n        display: flex;\n        flex-wrap: wrap;\n        padding: var(--spacing);\n    }\n\n    .UILAssetFile {\n        width: 124px;\n    }\n",
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
          "UILAssetsLibraryTabsContentItem" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }