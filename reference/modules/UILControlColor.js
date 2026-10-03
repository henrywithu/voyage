function UILControlColor(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlColor"),
      (_this.contexts = "UILControl"),
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
              className: "form-group UIL",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  _type: "label",
                  _innerText: "$state.label",
                  refName: "unnamed",
                  children: [],
                },
                {
                  className: "color-input",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      className: "color-selector",
                      _type: "div",
                      refName: "unnamed",
                      children: [
                        {
                          _type: "label",
                          refName: "unnamed",
                          children: [
                            {
                              className: "color-chip",
                              _type: "div",
                              refName: "colorChip",
                              children: [],
                            },
                          ],
                        },
                        {
                          className: "color-text no-style",
                          type: "text",
                          _type: "input",
                          refName: "textInput",
                          children: [],
                        },
                        {
                          id: "color",
                          name: "color",
                          type: "color",
                          className: "color-box hidden",
                          _type: "input",
                          refName: "colorInput",
                          children: [],
                        },
                      ],
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
      function onColorInput() {
        (_this.state.set("value", _this.colorInput.div.value),
          Utils.debounce(_this.finish, 200));
      }
      function onTextInput() {
        (_this.state.set("value", _this.textInput.div.value),
          Utils.debounce(_this.finish, 200));
      }
      function onTextClick() {
        (_this.textInput.div.focus(), _this.textInput.div.select());
      }
      function finishChange() {
        _this.finish();
      }
      ((_this.params = Object.assign(
        {},
        { id: _this.params },
        { options: restArgs[0] },
      )),
        _this.state.set("id", _this.params.id),
        _this.state.set("value", _this.params.options.value),
        _this.state.bind("value", _this.textInput),
        _this.bindState(_this.state, "value", function handleColorState(color) {
          (_this.setValue(_this.state.value),
            (function updateUI() {
              ((_this.colorChip.div.style.backgroundColor =
                _this.state.get("value")),
                (_this.colorInput.div.value = _this.state.get("value")));
            })());
        }),
        (_this.colorInput.div.value = _this.params.options.value),
        _this.init(_this.params.id, _this.params.options),
        (function initListeners() {
          (_this.colorInput.div.addEventListener("input", onColorInput, !1),
            _this.colorInput.div.addEventListener("blur", finishChange, !1),
            _this.textInput.div.addEventListener("input", onTextInput, !1),
            _this.textInput.div.addEventListener("click", onTextClick, !1),
            _this.textInput.div.addEventListener("blur", finishChange, !1));
        })(),
        (_this.update = function () {
          _this.state.set("value", _this.value);
        }),
        (_this.onDestroy = function () {
          (_this.colorInput.div.removeEventListener("input", onInput, !1),
            _this.colorInput.div.removeEventListener("blur", finishChange, !1));
        }),
        _this.element.goob(
          "\n    & {}\n\n    #color {\n        cursor: pointer;\n    }\n\n    .color-box {\n        max-width: 35px;\n    }\n\n    .color-text {\n        -webkit-appearance: none;\n                appearance: none;\n        margin: 0;\n        border: 0;\n        outline: 0;\n        font: var(--label2);\n        color: var(--font-color-highlight);\n        background: transparent;\n        position: absolute;\n        width: 100%;\n        height: 100%;\n        top: 0;\n        left: 0;\n        padding: 0 0 0 37px;\n    }\n",
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
          "UILControlColor" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }