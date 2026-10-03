function UILSaveIndicator(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILSaveIndicator"),
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
              className: "uil-save-indicator",
              _type: "div",
              refName: "container",
              children: [
                { _type: "UILSpinner", refName: "spinner", children: [] },
                {
                  _type: "span",
                  _innerText: "\n                Saving...\n            ",
                  refName: "unnamed",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.bind("UILStorage/saving", (value) => {
        value
          ? _this.element.classList().add("saving")
          : _this.element.classList().remove("saving");
      }),
        _this.element.goob(
          "\n    & {\n        position: absolute;\n        bottom: 0;\n        left: 50%;\n        transform: translate(-50%, 140%);\n        transition: transform 0.2s ease-out;\n    }\n\n    &.saving {\n        transform: translate(-50%, 0);\n    }\n\n    .uil-save-indicator {\n        position: relative;\n        background-color: var(--color-highlight);\n        color: var(--color-primary-text);\n        padding: var(--spacing-small) var(--spacing-large);\n        border-radius: var(--border-radius);\n        border-bottom-left-radius: 0;\n        border-bottom-right-radius: 0;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: var(--spacing-small);\n    }\n\n    .spinner {\n        width: 20px;\n        height: 20px;\n    }\n",
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
          "UILSaveIndicator" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }