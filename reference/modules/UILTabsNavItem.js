function UILTabsNavItem(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILTabsNavItem"),
      (_this.contexts = "Element,ViewStateElement"),
      (_this.data = _data),
      (_this.index = _index),
      (_this.params = _params),
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
              click: "$onClick",
              href: "$state.anchor",
              _type: "a",
              _innerText: "$data.label",
              refName: "tab",
              children: [],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.createState(),
        (_this.onMounted = () => {
          _this.flag("isReady", !0);
        }),
        (_this.ready = (_) => _this.wait("isReady")),
        (_this.onInit = async () => {
          (await _this.wait(() => _this.ready),
            await defer(),
            _this.state.set("anchor", `#${_this.data.id}`),
            (function initListeners() {
              _this.data.bind("active", (value) => {
                const action = value ? "add" : "remove";
                _this.tab.classList()[action]("active");
              });
            })());
        }),
        (_this.onClick = (event) => {
          (event.preventDefault(), _this.fire("click", { id: _this.data.id }));
        }),
        _this.element.goob(
          "\n    & {\n        &:last-of-type {\n            .tab:after {\n                display: none;\n            }\n        }\n    }\n\n    .tab {\n        color: var(--color-action--disabled);\n        display: block;\n        font: var(--label3-semi);\n        padding: var(--spacing-small);\n        text-decoration: none;\n        position: relative;\n\n        &:after {\n            content: '';\n            display: block;\n            width: 1px;\n            height: 66%;\n            background-color: var(--color-neutral-40);\n            position: absolute;\n            right: 0;\n            top: 16.666%;\n        }\n        \n        &.active {\n            color: var(--font-color-base);\n        }\n    }\n",
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
          "UILTabsNavItem" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }