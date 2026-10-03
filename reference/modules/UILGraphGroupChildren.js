function UILGraphGroupChildren(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, DragAndDrop),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGraphGroupChildren"),
      (_this.contexts = "Element,DragAndDrop"),
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
              _type: "div",
              refName: "wrapper",
              children: [
                {
                  _type: "div",
                  refName: "items",
                  children: [
                    {
                      view: "UILGraphLayer",
                      data: "$params.data.children",
                      layoutId: "$params.layoutId",
                      _type: "ViewState",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  _type: "div",
                  refName: "dropTarget",
                  children: [
                    { _type: "div", refName: "highlight", children: [] },
                  ],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.setDragEnabled(!1),
        _this.items
          .classList()
          [_this.params.data.open ? "remove" : "add"]("hidden"),
        _this.bind(_this.params.data, "open", (val) =>
          _this.items?.classList?.()[val ? "remove" : "add"]("hidden"),
        ),
        (_this.onDrop = function (dropId) {
          _this.fire("UILGraph/MoveNode", {
            moveId: dropId,
            targetId: _this.params.data.id,
            type: "end-of-list",
          });
        }),
        _this.element.goob(
          `\n    & > .wrapper > .items.hidden {\n        display: none;\n    }\n\n    & > .wrapper > .dropTarget {\n        margin-bottom: 0;\n        margin-left: ${32 * _this.params.data.depth}px;\n        height: 6px;\n    }\n`,
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
          "UILGraphGroupChildren" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }