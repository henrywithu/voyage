function UILSpinner(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILSpinner"),
      (_this.contexts = "Element"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          className: "spinner",
          _type: "UI",
          refName: "unnamed",
          children: [
            {
              _type: "div",
              refName: "spinnercontainer",
              children: [
                {
                  "aria-hidden": !0,
                  viewBox: "0 0 50 50",
                  _type: "svg",
                  refName: "spinnersvg",
                  children: [
                    {
                      cx: 25,
                      cy: 25,
                      r: 19,
                      stroke: "currentColor",
                      "stroke-width": 2,
                      fill: "none",
                      _type: "circle",
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
      (_this.element.goob(
        "\n    @keyframes lrotate {\n        100% {\n            transform: rotate(360deg);\n        }\n    }\n\n    @keyframes ldash {\n        0% {\n            stroke-dasharray: 1, 122;\n            stroke-dashoffset: 0;\n        }\n      \n        50% {\n            stroke-dasharray: 122, 150;\n            stroke-dashoffset: 0;\n        }\n      \n        100% {\n            stroke-dasharray: 122, 150;\n            stroke-dashoffset: -122;\n        }\n    }\n\n    svg {\n        animation: lrotate 2s linear infinite;\n    }\n\n    circle {\n        animation: ldash 4s ease-in-out infinite;\n    }\n\n    & {\n        width: 20px;\n        height: 20px;\n        svg {\n          display: block;\n          position: relative;\n          width: 100%;\n          height: 100%;\n        }\n    \n        circle {\n            stroke-linecap: round;\n            stroke: currentColor;\n            vector-effect: non-scaling-stroke;\n        }\n    }\n\n    \n",
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
          "UILSpinner" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }