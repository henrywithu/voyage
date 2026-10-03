function UILControlNumber(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlNumber"),
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
                  id: "$state.labelId",
                  _type: "label",
                  _innerText: "$state.label",
                  refName: "unnamed",
                  children: [],
                },
                {
                  view: "UILInputNumber",
                  data: "$data",
                  _type: "ViewState",
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
      ((_this.params = Object.assign(
        {},
        { id: _this.params },
        { options: restArgs[0] },
      )),
        _this.state.set("id", _this.params.id),
        _this.state.set("labelId", `${_this.params.id}-label`),
        (_this.data = Data.request(`vectorInputData-${_this.params.id}`, () => [
          {
            id: _this.params.id,
            value: _this.params.options.value || 0,
            labelledBy: _this.state.labelId,
            min: _this.params.options.min || -1 / 0,
            max: _this.params.options.max || 1 / 0,
            step: _this.params.options.step || 1,
            precision: _this.params.options.precision || 3,
            onInputCB: (value) =>
              (function onInput(value) {
                (_this.setValue(Number(value)), (_this.data[value] = value));
              })(value),
            onFinishCB: () =>
              (function onFinish() {
                _this.finish();
              })(),
          },
        ])),
        _this.init(_this.params.id, _this.params.options),
        (_this.update = function () {
          _this.data.forEach((input) => {
            input.value = _this.value;
          });
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
          "UILControlNumber" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }