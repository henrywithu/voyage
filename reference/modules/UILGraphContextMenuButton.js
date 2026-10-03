function UILGraphContextMenuButton(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, ViewStateElement),
      Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGraphContextMenuButton"),
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
          click: "$onClick",
          _type: "UI",
          refName: "unnamed",
          children: [
            {
              _type: "div",
              _innerText: "$data.label",
              refName: "button",
              children: [],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.bind("UILGraphContextMenu/open", (openContext) => {
        if (
          (openContext || _this.element.hide(),
          _this.data.targetNodeCases.reduce((a, b) => a() || b()))
        )
          return _this.element.show();
        const action = _this.data.uilContexts.includes(openContext.type)
          ? "show"
          : "hide";
        _this.element[action]();
      }),
        (_this.onClick = function () {
          _this.fire("GraphContextMenu/action", _this.data.action);
        }),
        _this.element.goob(
          "\n    position: relative;\n    width: 100%;\n    height: 27px;\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n    cursor: default;\n    box-sizing: border-box;\n    padding: 0 18px;\n    user-select: none;\n    transition: background-color 300ms ease-in-out, color 300ms ease-in-out;\n    background-color: transparent;\n    color: white;\n    font-family: sans-serif;\n    font-size: 11px;\n\n    &:hover {\n        color: #fff;\n        background-color: #525252;\n    }\n\n",
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
          "UILGraphContextMenuButton" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }