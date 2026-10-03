function UILControlButton(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlButton"),
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
                  htmlFor: "$state.groupId",
                  _type: "label",
                  _innerText: "$state.label",
                  refName: "componentLabel",
                  children: [],
                },
                {
                  id: "$state.groupId",
                  className: "content",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      view: "UILInputButton",
                      data: "$data",
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
      ((_this.params = Object.assign(
        {},
        { id: _this.params },
        { options: restArgs[0] },
      )),
        _this.state.set("id", _this.params.id),
        _this.state.set("groupId", `${_this.params.id}-group`),
        (_this.data = new StateArray(_this.params.options.actions)),
        _this.init(_this.params.id, _this.params.options),
        _this.params.options.hideLabel &&
          (_this.element.classList().add("hide-label"),
          _this.componentLabel.classList().add("visibility-hidden")),
        (_this.setTitle = (title) => {
          _this.data.forEach((button) => {
            button.title = title;
          });
        }),
        _this.element.goob(
          "\n    .button {\n        width: 100%;\n    }\n\n    &.hide-label {\n        .form-group,\n        .content {\n            width: 100%;\n            max-width: 100% !important;\n        }\n\n    }\n    \n    .UILInputButton + .UILInputButton {\n        margin-top: 2px;\n    }\n",
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
          "UILControlButton" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }