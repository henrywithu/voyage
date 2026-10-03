function UILPerformance(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILPerformance"),
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
              data: "$statsData",
              view: "UILPerformanceItem",
              _type: "ViewState",
              refName: "unnamed",
              children: [],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.statsData = new StateArray(
        Object.entries(RenderStats.stats).map(([key, value]) => ({
          key: key,
          value: value,
        })),
      )),
        _this.startRender(function updateStats() {
          if (
            ((RenderStats.active = _this.params.active), !_this.params.active)
          )
            return;
          (Object.entries(RenderStats.stats).forEach(([key, value]) => {
            let isKeyMapped = !1;
            (_this.statsData.forEach(
              (d) => d.get("key") === key && (isKeyMapped = !0),
            ),
              isKeyMapped || _this.statsData.push({ key: key, value: value }));
          }),
            _this.statsData.forEach((d) =>
              d.set("value", RenderStats.stats[d.get("key")]),
            ));
        }, 10),
        _this.element.goob(
          "\n    & {\n        width: 100%;\n        padding: var(--spacing-small);\n    }\n",
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
          "UILPerformance" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }