function UILControlVector(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlVector"),
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
                  className: "number-inputs",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      view: "UILInputNumber",
                      data: "$inputData",
                      _type: "ViewState",
                      refName: "unnamed",
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
      if (
        ((_this.params = Object.assign(
          {},
          { id: _this.params },
          { options: restArgs[0] },
        )),
        _this.state.set("id", _this.params.id),
        _this.state.set("labelId", `${_this.params.id}-label`),
        (_this.inputData = await Data.request(
          `vectorInputData-${_this.params.id}`,
          () =>
            _this.params.options.value.map((value, index) => ({
              value: value || 0,
              labelledBy: _this.state.labelId,
              min: _this.params.options.min || -1 / 0,
              max: _this.params.options.max || 1 / 0,
              step: _this.params.options.step || 1,
              precision: _this.params.options.precision || 3,
              onInputCB: (v, m) =>
                (function onInput(value, index, master) {
                  master
                    ? (_this.vector = _this.vector.map((v) => value))
                    : (_this.vector[index] = value);
                  (_this.setValue([..._this.vector]),
                    _this.inputData.forEach((input, idx) => {
                      input.value = _this.vector[idx];
                    }));
                })(v, index, m),
              onFinishCB: () =>
                (function onFinish() {
                  _this.finish();
                })(),
              index: index,
            })),
        )),
        (_this.vector = []),
        _this.params.options.value)
      )
        _this.length = _this.vector.length;
      else {
        if (!_this.params.options.components)
          throw 'UILControlVector: Cannot detect vector type. Define "options.components" count or init with a initial value';
        _this.params.options.value = new Array(
          _this.params.options.components,
        ).fill(0);
      }
      ((_this.length = _this.params.options.value.length),
        _this.init(_this.params.id, _this.params.options),
        (_this.vector = [..._this.value]),
        (_this.update = function () {
          _this.inputData.forEach((input, index) => {
            input.value = _this.value[index];
          });
        }),
        _this.element.goob(
          "\n    .number-inputs {\n        display: flex;\n        gap: calc(var(--spacing-small) / 2);\n    }\n",
        ),
        (_this.force = function (value, history = !1) {
          ((_this.vector = [...value]),
            _this.setValue([..._this.vector]),
            _this.inputData.forEach(
              (input, index) => (input.value = _this.value[index]),
            ),
            _this.finish(history));
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
          "UILControlVector" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }