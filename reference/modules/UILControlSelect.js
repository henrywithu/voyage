function UILControlSelect(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlSelect"),
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
                  refName: "selectLabel",
                  children: [],
                },
                {
                  className: "select-wrapper",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      id: "$state.id",
                      _type: "select",
                      refName: "select",
                      children: [],
                    },
                    {
                      className: "arrow",
                      _type: "div",
                      _innerText: " ▼ ",
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
        !_this.params.options.options)
      )
        throw "UILControlSelect is missing select options";
      function change() {
        _this.finish();
      }
      function input() {
        let i = _this.select.div.selectedIndex;
        _this.value = _this.selectOptions[i].value;
      }
      ((_this.params.options.value =
        _this.params.options.value || _this.params.options.options[0].value),
        (function initOptions() {
          _this.selectOptions = _this.params.options.options.map(
            ({ value: value, label: label }) => {
              const el = document.createElement("option");
              return (
                el.setAttribute("value", value),
                _this.value === value && el.setAttribute("selected", !0),
                (el.text = label || value),
                (el.value = value),
                _this.select.add(el),
                el
              );
            },
          );
        })(),
        (function initListeners() {
          (_this.select.div.addEventListener("change", change, !1),
            _this.select.div.addEventListener("input", input, !1));
        })(),
        _this.init(_this.params.id, _this.params.options),
        (_this.select.div.value = _this.params.options.value),
        (_this.force = function (value) {
          ((_this.select.div.value = value), (_this.value = value));
        }),
        (_this.onDestroy = function () {
          (_this.select.div.removeEventListener("change", change, !1),
            _this.select.div.removeEventListener("input", input, !1));
        }),
        _this.element.goob(
          "\n    .select-wrapper {\n        position: relative;\n    }\n\n    .arrow {\n        color: var(--color-neutral-70);\n        font-size: 7px;\n        position: absolute;\n        right: var(--spacing-small);\n        top: 15px;\n        pointer-events: none;\n    }\n",
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
          "UILControlSelect" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }