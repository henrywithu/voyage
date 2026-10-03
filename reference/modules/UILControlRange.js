function UILControlRange(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlRange"),
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
                  refName: "unnamed",
                  children: [],
                },
                {
                  type: "range",
                  id: "$state.id",
                  min: "$props.min",
                  max: "$props.max",
                  step: "$props.step",
                  _type: "input",
                  refName: "slider",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function change() {
        _this.finish();
      }
      function input() {
        _this.value = Number(_this.slider.div.value);
      }
      ((_this.props = { min: 0, max: 100, step: 1 }),
        (_this.params = Object.assign(
          {},
          { id: _this.params },
          { options: restArgs[0] },
        )),
        _this.state.set("id", _this.params.id),
        Object.assign(_this.props, _this.params.options),
        _this.init(_this.params.id, _this.params.options),
        (_this.slider.div.value = _this.params.options.value || ""),
        (function initListeners() {
          (_this.slider.div.addEventListener("change", change, !1),
            _this.slider.div.addEventListener("input", input, !1));
        })(),
        (_this.force = function (value) {
          ((_this.value = value),
            (_this.slider.div.value = value),
            _this.finish(!1));
        }),
        (_this.onDestroy = function () {
          (_this.slider.div.removeEventListener("change", change, !1),
            _this.slider.div.removeEventListener("input", input, !1));
        }),
        _this.element.goob("\n    & {}\n"),
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
          "UILControlRange" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }