function UILControlText(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlText"),
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
                  _type: "label",
                  _innerText: "$state.label",
                  refName: "textInputLabel",
                  children: [],
                },
                {
                  type: "text",
                  id: "$state.id",
                  _type: "input",
                  refName: "textInput",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function onChange() {
        (clearTimeout(_this.timeout),
          (_this.timeout = setTimeout(onFinishChange, 400)),
          (_this.value = _this.textInput.div.value));
      }
      function onFinishChange() {
        null !== _this.timeout &&
          (clearTimeout(_this.timeout), (_this.timeout = null), _this.finish());
      }
      ((_this.params = Object.assign(
        {},
        { id: _this.params },
        { options: restArgs[0] },
      )),
        _this.state.set("id", _this.params.id),
        (function initListeners() {
          (_this.textInput.div.addEventListener("input", onChange, !1),
            _this.textInput.div.addEventListener("change", onFinishChange, !1));
        })(),
        _this.init(_this.params.id, _this.params.options),
        (_this.textInput.div.value = _this.params.options.value || ""),
        (_this.update = function () {
          _this.textInput.div.value = _this.value || "";
        }),
        (_this.onDestroy = function () {
          (_this.textInput.div.removeEventListener("input", onChange, !1),
            _this.textInput.div.removeEventListener("change", onBlur, !1));
        }),
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
          "UILControlText" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }