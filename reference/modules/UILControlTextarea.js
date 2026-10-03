function UILControlTextarea(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlTextarea"),
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
              className: "form-group",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  htmlFor: "$state.id",
                  title: "$state.label",
                  _type: "label",
                  _innerText: "$state.label",
                  refName: "unnamed",
                  children: [],
                },
                {
                  type: "text",
                  id: "$state.id",
                  maxLength: "$props.max",
                  minLength: "$props.min",
                  rows: "$props.rows",
                  readOnly: "$props.readonly",
                  _type: "textarea",
                  refName: "textareaInput",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let _timeout,
        onInit = _this.onInit;
      function onChange() {
        (clearTimeout(_timeout),
          (_timeout = setTimeout(onFinishChange, 400)),
          (_this.value = _this.textareaInput.div.value));
      }
      function onFinishChange() {
        null !== _timeout &&
          (clearTimeout(_timeout), (_timeout = null), _this.finish());
      }
      ((_this.props = { max: 1 / 0, min: -1 / 0, rows: 2, readonly: !1 }),
        (_this.params = Object.assign(
          {},
          { id: _this.params },
          { options: restArgs[0] },
        )),
        _this.state.set("id", _this.params.id),
        Object.assign(_this.props, _this.params.options),
        _this.init(_this.params.id, _this.params.options),
        (_this.textareaInput.div.value = _this.params.options.value || ""),
        (function initListeners() {
          (_this.textareaInput.div.addEventListener("input", onChange, !1),
            _this.textareaInput.div.addEventListener(
              "change",
              onFinishChange,
              !1,
            ));
        })(),
        (_this.update = function () {
          _this.textareaInput.div.value = _this.value || "";
        }),
        (_this.onDestroy = function () {
          (_this.textareaInput.div.removeEventListener("input", onChange, !1),
            _this.textareaInput.div.removeEventListener(
              "change",
              onFinishChange,
              !1,
            ));
        }),
        _this.element.goob(
          "\n    .textareaInput {\n        font-family: Consolas, monaco, monospace;\n    }\n",
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
          "UILControlTextarea" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }