function TasteUI(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseUI),
      Inherit(_this, XComponent),
      (_this.fragName = "TasteUI"),
      (_this.contexts = "BaseUI"),
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
              className: "container",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  className: "gl-bounds",
                  _type: "div",
                  refName: "glBounds",
                  children: [],
                },
                {
                  className: "row-heading",
                  _type: "div",
                  refName: "rowHeading",
                  children: [
                    {
                      className: "ghost-text",
                      _type: "div",
                      refName: "unnamed",
                      children: [],
                    },
                    {
                      addSrOnly: !0,
                      noSplit: !0,
                      noResize: !0,
                      "data-heading": 1,
                      class: "body-bold",
                      text: "The Notturno Collection <br>is an ode to the night",
                      _type: "XText",
                      refName: "heading1",
                      children: [],
                    },
                    {
                      addSrOnly: !0,
                      noSplit: !0,
                      noResize: !0,
                      "data-heading": 2,
                      class: "body-bold",
                      text: "A taste<br>of possibility",
                      _type: "XText",
                      refName: "heading2",
                      children: [],
                    },
                    {
                      addSrOnly: !0,
                      noSplit: !0,
                      noResize: !0,
                      "data-heading": 3,
                      class: "body-bold",
                      text: "Inspired by the quiet glamour<br>of the late hours",
                      _type: "XText",
                      refName: "heading3",
                      children: [],
                    },
                    {
                      className: "ghost-text",
                      _type: "div",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  className: "row-copy",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      className: "side-text",
                      _type: "div",
                      refName: "unnamed",
                      children: [
                        {
                          noSplit: !0,
                          noResize: !0,
                          class: "body-bold",
                          text: "Santioni",
                          _type: "XText",
                          refName: "copyheading1",
                          children: [],
                        },
                      ],
                    },
                    {
                      noSplit: !0,
                      noResize: !0,
                      class: "body-bold",
                      text: "Spirits",
                      _type: "XText",
                      refName: "copyheading2",
                      children: [],
                    },
                    {
                      className: "copy",
                      _type: "div",
                      refName: "unnamed",
                      children: [
                        {
                          noSplit: !0,
                          noResize: !0,
                          class: "body-regular",
                          text: "True devotion requires a little indulgence. Santioni Spirits is crafted for the saints and the sinners alike. The Notturno Collection blends heavenly cream and earthly decadence to unwind your soul and elevate your evenings.",
                          _type: "XText",
                          refName: "copy",
                          children: [],
                        },
                      ],
                    },
                    {
                      noSplit: !0,
                      noResize: !0,
                      class: "body-bold",
                      text: "Notturno",
                      _type: "XText",
                      refName: "copyheading3",
                      children: [],
                    },
                    {
                      className: "side-text",
                      _type: "div",
                      refName: "unnamed",
                      children: [
                        {
                          noSplit: !0,
                          noResize: !0,
                          class: "body-bold",
                          text: "Collection",
                          _type: "XText",
                          refName: "copyheading4",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  className: "row-copy-mobile",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      addSrOnly: !0,
                      noSplit: !0,
                      noResize: !0,
                      class: "body-bold",
                      text: "Santioni<br>Spirits",
                      _type: "XText",
                      refName: "copyMobileHeading1",
                      children: [],
                    },
                    {
                      addSrOnly: !0,
                      noSplit: !0,
                      noResize: !0,
                      class: "body-bold",
                      text: "Notturno<br>Collection",
                      _type: "XText",
                      refName: "copyMobileHeading2",
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
      ((_this.useScrollTrigger = !0),
        (_this.scrollTriggerOffsetIn = 0.5),
        (_this.scrollTriggerOffsetOut = 0),
        (_this.onInit = () => {}),
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
          "TasteUI" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }