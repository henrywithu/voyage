function UILControlCheckbox(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlCheckbox"),
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
                  className: "label",
                  _type: "div",
                  _innerText: "$state.label",
                  refName: "unnamed",
                  children: [],
                },
                {
                  className: "checkbox",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      type: "checkbox",
                      id: "$state.id",
                      ariaLabelledBy: "$state.labelId",
                      checked: "$state.isChecked",
                      _type: "input",
                      refName: "checkboxInput",
                      children: [],
                    },
                    {
                      htmlFor: "$state.id",
                      _type: "label",
                      _innerText: "$state.label",
                      refName: "checkboxLabel",
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
      function handleChecked(isChecked) {
        ((_this.checkboxInput.div.checked = isChecked),
          isChecked
            ? _this.checkboxInput.div.setAttribute("checked", _this.value)
            : _this.checkboxInput.div.removeAttribute("checked"));
      }
      function handleClick() {
        ((_this.value = !_this.value),
          _this.state.set("isChecked", _this.value),
          _this.finish());
      }
      ((_this.params = Object.assign(
        {},
        { id: _this.params },
        { options: restArgs[0] },
      )),
        _this.state.set("id", _this.params.id),
        _this.init(_this.params.id, _this.params.options),
        (function initListeners() {
          _this.checkboxInput.click(handleClick);
        })(),
        (_this.onInit = () => {
          (_this.state.set("labelId", `${_this.id}-label`),
            _this.state.set("isChecked", _this.params.options?.value),
            _this.state.bind("isChecked", handleChecked));
        }),
        _this.element.goob(
          "\n    & {\n        width: 50%;\n        \n        > .label, .content {\n            display: none;\n        }\n    }\n\n    .form-group > *:last-child {\n        width: auto;\n    }\n\n    .UILControlCheckbox:nth-of-type(even) {\n        padding-left: calc(var(--spacing-small) / 2);\n    }\n\n    .UILControlCheckbox:nth-of-type(odd) {\n        padding-right: calc(var(--spacing-small) / 2);\n    }\n\n\n",
        ),
        (_this.update = () => {
          _this.state.set("isChecked", _this.value);
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
          "UILControlCheckbox" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }