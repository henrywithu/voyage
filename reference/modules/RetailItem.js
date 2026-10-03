function RetailItem(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element, "li"),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "RetailItem"),
      (_this.contexts = "Element, 'li',ViewStateElement"),
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
              className: "link",
              _type: "div",
              refName: "link",
              children: [
                {
                  className: "sr-only",
                  _type: "span",
                  refName: "text",
                  children: [],
                },
                {
                  "aria-hidden": !0,
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      noSplit: !0,
                      noAria: !0,
                      noResize: !0,
                      class: "body-regular",
                      text: "$data.name",
                      _type: "XText",
                      refName: "name",
                      children: [],
                    },
                    {
                      noSplit: !0,
                      noAria: !0,
                      noResize: !0,
                      class: "body-bold",
                      text: "$data.address",
                      _type: "XText",
                      refName: "address",
                      children: [],
                    },
                  ],
                },
              ],
            },
            { _type: "div", refName: "line", children: [] },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function onHover({ action: action }) {
        if (
          (_this.element.div.classList.toggle("hover", "over" === action),
          "over" === action)
        ) {
          const size = Math.range(Stage.width, 600, 1600, 10, 50, !0);
          (_this.name.element.tween({ x: size }, 400, "easeOutCubic"),
            _this.address.element.tween({ x: -size }, 400, "easeOutCubic"));
        } else
          (_this.name.element.tween({ x: 0 }, 400, "easeOutCubic"),
            _this.address.element.tween({ x: 0 }, 400, "easeOutCubic"));
      }
      function onClick() {
        (window.open(_this.data.url, "_blank"),
          GoogleAnalytics.track("retail_item_click"));
      }
      ((_this.onMounted = function () {
        Device.mobile
          ? _this.link.touchClick(
              () => {},
              () => {
                onClick();
              },
            )
          : (_this.element.hover(onHover), _this.link.click(onClick));
      }),
        (_this.animateSet = () => {
          (_this.name.element.transform({ x: "calc(33vw - 100%)" }),
            _this.address.element.transform({ x: "calc(-33vw + 100%)" }),
            _this.line.transform({ scaleX: 0 }));
        }),
        (_this.animateIn = (delay = 0) => {
          (_this.name.element.tween(
            { x: 0, opacity: 1 },
            1e3,
            "easeInOutCubic",
            delay,
          ),
            _this.address.element.tween(
              { x: 0, opacity: 1 },
              1e3,
              "easeInOutCubic",
              delay,
            ),
            _this.line.tween({ scaleX: 1 }, 1e3, "easeInOutCubic", delay));
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
          "RetailItem" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }