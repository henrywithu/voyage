function UILGateError(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILGateView),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGateError"),
      (_this.contexts = "UILGateView"),
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
              className: "gate",
              _type: "article",
              refName: "unnamed",
              children: [
                {
                  className: "gate-header",
                  _type: "header",
                  refName: "unnamed",
                  children: [
                    { _type: "div", refName: "logo", children: [] },
                    {
                      className: "version",
                      _type: "h1",
                      _innerText: "UIL v2.3",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  className: "gate-main",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      className: "error",
                      _type: "h2",
                      _innerText: "Error",
                      refName: "unnamed",
                      children: [],
                    },
                    {
                      _type: "p",
                      _innerText: "You do not have access to this page",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  className: "gate-footer",
                  _type: "footer",
                  refName: "unnamed",
                  children: [
                    {
                      _type: "button",
                      _innerText: "Go Back",
                      refName: "backButton",
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function goBack() {
        _this.parent.state.set("updateView", "login");
      }
      (!(function initListeners() {
        _this.backButton.click(goBack);
      })(),
        _this.logo.html(UILGate.logo),
        _this.element.goob(
          "\n    & {\n        --logo-size: 25px;\n\n        opacity: 0;\n    }\n\n    .gate-header {\n        gap: var(--spacing);\n        justify-self: start;\n    }\n\n    .logo {\n        width: var(--logo-size);\n        height: var(--logo-size);\n    }\n\n    .error {\n        font-size: 64px;\n        font-weight: 300;\n        line-height: 1;\n        letter-spacing: 0.2rem;\n        margin: calc(var(--spacing) * 3) 0;\n    }\n\n    .gate-main {\n        font-size: 14px;\n        margin-bottom: calc(var(--spacing) * 3);\n    }\n\n    .gate-footer {\n        justify-self: start;\n    }\n",
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
          "UILGateError" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }