function UILHistoryDay(_data, _index, _params) {
      const _this = this;
      (Inherit(_this, Element),
        Inherit(_this, ViewStateElement),
        Inherit(_this, XComponent),
        (_this.fragName = "UILHistoryDay"),
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
                _type: "div",
                refName: "day",
                children: [
                  {
                    className: "day__info",
                    _type: "div",
                    refName: "unnamed",
                    children: [
                      {
                        _type: "span",
                        _innerText: "$data.date",
                        refName: "unnamed",
                        children: [],
                      },
                      {
                        _type: "span",
                        _innerText: "$data.amount",
                        refName: "unnamed",
                        children: [],
                      },
                    ],
                  },
                  {
                    className: "day__icon",
                    _type: "div",
                    refName: "icon",
                    children: [],
                  },
                ],
              },
            ],
          }),
          _this.createState(),
          _this.layout?.getAllLayers &&
            (_this.layers = await _this.layout.getAllLayers()));
        let onInit = _this.onInit;
        ((_this.onInit = function () {
          !(function initHTML() {
            _this.icon.html(UILHistoryDay.arrowRightIcon);
          })();
        }),
          (_this.onClick = function () {
            _this.parent.parent.onSelectDay(_this.data.date);
          }),
          _this.element.goob(
            "\n    .day {\n        display: flex;\n        font: var(--label4-medium);\n        font-size: 11px;\n        justify-content: center;\n        align-items: center;\n        width: 100%;\n        padding: 1rem;\n\n        border: 1px solid transparent;\n        border-bottom-color: var(--color-neutral-40);\n\n        &:hover {\n            border-color: var(--color-accent-50);\n\n            .day__icon > svg {\n                stroke: var(--font-color-base);\n            }\n        }\n\n        &__info {\n            flex-grow: 1;\n\n            > span {\n                display: inline-block;\n\n                &:last-child {\n                    margin-left: 0.2rem;\n                }\n            }\n        }\n\n        &__icon {\n            > svg {\n                display: block;\n\n                stroke: var(--color-neutral-70);\n\n                transition: stroke 0.17s ease-in-out;\n            }\n        }\n    }\n",
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
            "UILHistoryDay" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }