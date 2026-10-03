function UILGateLogin(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILGateView),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGateLogin"),
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
                  refName: "logoContainer",
                  children: [],
                },
                {
                  className: "gate-footer",
                  _type: "footer",
                  refName: "unnamed",
                  children: [
                    {
                      _type: "button",
                      _innerText: "Log in with Google",
                      refName: "loginButton",
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
      async function openLoginModal() {
        ((_this.loginButton.div.disabled = !0),
          (_this.user = await UILRemote.auth.login()),
          _this.user.success
            ? (async function handleLogin() {
                (await _this.animateOut(),
                  _this.parent.animateOut(),
                  window.location.reload());
              })()
            : (async function handleError() {
                (_this.parent.state.set("updateView", "error"),
                  await _this.wait(500),
                  (_this.loginButton.div.disabled = !1));
              })());
      }
      (!(function initListeners() {
        _this.loginButton.click(openLoginModal);
      })(),
        _this.logoContainer.html(UILGate.logo),
        _this.element.goob(
          "\n    & {\n        --max-spacing: 240px;\n        --logo-size: 145px;\n        --dot-size: 4px;\n    }\n\n    .gate-header {\n        justify-content: space-between;\n        width: 100%;\n    }\n    \n    .version {\n        margin-bottom: 0;\n        position: relative;\n        width: 100%;\n\n        &:after {\n            background-color: var(--color-white);\n            content: '';\n            display: block;\n            width: var(--dot-size);\n            height: var(--dot-size);\n            border-radius: 50%;\n            position: absolute;\n            right: 0;\n            top: 3px;\n        }\n    }\n\n    .gate-main {\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        width: var(--logo-size);\n    }\n\n    .loginButton:disabled {\n        cursor: not-allowed !important;\n    }\n",
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
          "UILGateLogin" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }