function UILControl(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, Element),
        Inherit(_this, XComponent),
        (_this.fragName = "UILControl"),
        (_this.contexts = "Element"),
        (_this.params = _params),
        (_this.args = arguments),
        (this.isFragment = !0));
      var _promises = [];
      !(async function () {
        (_this.element &&
          (_this.element.onMountedHook = (_) => _this.onMounted?.()),
          _this.layout?.getAllLayers &&
            (_this.layers = await _this.layout.getAllLayers()));
        let onInit = _this.onInit;
        var _onChange = () => {};
        (_this.element.attr("data-type", "UILControl"),
          (_this.element.div._this = _this));
        let _onFinishChange = () => {};
        function isEqual(a, b) {
          return Array.isArray(a) || Array.isArray(b)
            ? a + "" == b + ""
            : "object" == typeof a || "object" == typeof b
              ? JSON.stringify(a) === JSON.stringify(b)
              : a === b;
        }
        function clone(value) {
          return Array.isArray(value)
            ? [...value]
            : null === value
              ? ""
              : "object" == typeof value
                ? Object.assign({}, value)
                : value;
        }
        (_this.element.goob(
          "\n    & {\n        padding: calc(var(--spacing) / 2) var(--spacing);\n        width: 100%;\n    }\n",
        ),
          (_this.init = (id, opts = {}) => {
            ((_this.id = id),
              (_this.opts = opts),
              _this.setValue(clone(opts.value)),
              (_this.previous = clone(_this.value)),
              _this.value && _this.set("value", _this.value),
              _this.setLabel(opts.label || id),
              _this.element.attr("data-id", id));
          }),
          (_this.finish = (history = !0) => {
            (_onFinishChange(_this.value),
              isEqual(_this.value, _this.previous) ||
                (history && UILHistory.set(_this, _this.previous),
                UILLocalStorage.set(_this.id, _this.value),
                UILStorage.set(_this.id, _this.value),
                (_this.previous = clone(_this.value))));
          }),
          (_this.force = (value) => {
            (_this.setValue(clone(value)), _this.finish(!1));
          }),
          (_this.debounce = (callback, time = 250) => {
            let interval;
            return (...args) => {
              (clearTimeout(interval),
                (interval = setTimeout(() => {
                  ((interval = null), callback(...args));
                }, time)));
            };
          }),
          (_this.onChange = (cb) => ((_onChange = cb), _this)),
          (_this.onFinishChange = (cb) => ((_onFinishChange = cb), _this)),
          (_this.getValue = function () {
            return _this.value;
          }),
          (_this.setValue = (value) => {
            isEqual(value, _this.value) ||
              ((_this.value = clone(value)),
              _this.update && _this.update(_this.value),
              "function" == typeof _onChange && _onChange(_this.value));
          }),
          (_this.getView = function () {
            return _this.view;
          }),
          (_this.setView = (view) => {
            (_this.view && _this.view.destroy(),
              (_this.view = view),
              _this.content.add(_this.view));
          }),
          (_this.hide = function () {
            return (
              (_this.visible = !1),
              _this.element.css({ display: "none" }),
              _this
            );
          }),
          (_this.show = function () {
            return (
              (_this.visible = !0),
              _this.element.css({ display: "inline-block" }),
              _this
            );
          }),
          (_this.isVisible = function () {
            return _this.visible;
          }),
          (_this.setLabel = (label) => {
            ((_this.label = label), _this.state.set("label", label));
          }),
          (_this.setDescription = function (desc) {
            (console.log("description: " + desc),
              _this.label.attr("title", desc));
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
            "UILControl" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }