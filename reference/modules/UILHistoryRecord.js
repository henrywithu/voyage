function UILHistoryRecord(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILHistoryRecord"),
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
            { _type: "span", refName: "metadata", children: [] },
            {
              _type: "span",
              _innerText: "$data.message",
              refName: "message",
              children: [],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.onInit = function () {
        !(function initHTML() {
          _this.metadata.text(
            `${_this.data.actorName} - ${_this.data.timeFormatted}`,
          );
        })();
      }),
        _this.element.goob(
          "\n    & {\n        border-bottom: 1px solid var(--color-neutral-40);\n        padding: 0.75rem 1rem;\n        word-wrap: break-word;\n        overflow-wrap: break-word;\n        word-break: break-all;\n        hyphens: auto;\n    }\n\n    .metadata,\n    .message {\n        display: flex;\n        justify-content: flex-start;\n        align-items: flex-start;\n        line-height: 14.3px;\n    }\n    \n    .metadata {\n        margin-bottom: 0.24rem;     \n        font-weight: 600;\n    }\n",
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
          "UILHistoryRecord" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }