function UILAssetsExplorerTabs(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILBaseTabs),
      Inherit(_this, XComponent),
      (_this.fragName = "UILAssetsExplorerTabs"),
      (_this.contexts = "UILBaseTabs"),
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
      ((_this.ready = !1),
        (_this.onInit = () => {
          (_this.state.set("navView", "UILTabsIconNavItem"),
            _this.state.set("contentView", "UILAssetsLibraryTabsContentItem"),
            _this.state.tabsData.refresh(new StateArray(_this.params)));
        }),
        _this.listen("UILTabsIconNavItem/click", (event) => {
          _this.state.tabsData.forEach((tab, index) => {
            tab.id === event.id && _this.state.set("activeIndex", index);
          });
        }),
        (_this.updateContent = (data) => {
          _this.state.tabsData.refresh(new StateArray(data));
        }),
        _this.element.goob(
          "\n    & {}\n\n    .tabsHeader {\n        background-color: transparent;\n    }\n",
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
          "UILAssetsExplorerTabs" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }