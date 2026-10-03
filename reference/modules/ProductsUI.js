function ProductsUI(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseUI),
      Inherit(_this, XComponent),
      (_this.fragName = "ProductsUI"),
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
                  className: "left-text",
                  _type: "div",
                  refName: "leftText",
                  children: [],
                },
                {
                  className: "gl-bounds",
                  _type: "div",
                  refName: "glBounds",
                  children: [],
                },
                {
                  className: "right-text",
                  _type: "div",
                  refName: "rightText",
                  children: [],
                },
              ],
            },
            {
              className: "mobile-arrows",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  className: "mobile-arrow-left",
                  _type: "div",
                  refName: "prevSlide",
                  children: [
                    {
                      width: 17,
                      height: 13,
                      viewBox: "0 0 17 13",
                      fill: "none",
                      xmlns: "http://www.w3.org/2000/svg",
                      _type: "svg",
                      refName: "unnamed",
                      children: [
                        {
                          d: "M0.521801 5.35821C0.616664 5.33736 1.05239 5.71258 1.48651 5.59713C2.01067 5.45923 2.95448 4.61258 3.5333 4.29829C4.37903 3.83649 5.29873 3.51739 6.26183 3.45004C6.63646 3.42439 7.87772 3.59596 7.96776 3.5671C8.41796 3.42118 7.56902 3.02832 7.45807 2.89203C6.67184 1.91229 5.95795 -0.379115 7.96616 0.0538308C9.61581 0.408205 10.074 2.37089 11.0371 3.34261C11.7623 4.07381 13.3171 4.72162 14.2191 5.41113C14.5487 5.66287 16.1421 6.9585 16.0938 7.25675C15.9684 7.44276 15.7819 7.49086 15.5842 7.38503C15.0696 7.11083 14.3718 6.40369 13.7657 6.03489C11.944 4.92847 9.84573 4.37206 7.73945 4.74246C6.93874 4.88357 4.07515 5.63722 5.01414 6.86871C5.46594 7.4604 7.07219 7.35296 6.94999 7.87891C5.27622 10.1831 1.87722 9.15209 0.343332 7.19903C-0.0425527 6.70675 -0.245145 5.53459 0.520192 5.36302L0.521801 5.35821Z",
                          fill: "#121212",
                          _type: "path",
                          refName: "unnamed",
                          children: [],
                        },
                        {
                          d: "M6.93441 12.822C5.9681 12.2736 6.50673 9.98703 7.07591 9.23499C8.37987 7.51764 10.0038 7.04461 12.0586 7.19213C12.7613 7.24184 15.0669 7.6363 15.4287 8.21035C15.567 8.42843 15.5284 8.99927 15.128 8.90306C13.5845 7.49038 11.1261 7.75816 9.99576 9.57653C9.17736 10.8946 10.5199 12.0411 8.30591 12.7563C8.02615 12.8477 7.17077 12.9567 6.93281 12.822L6.93441 12.822Z",
                          fill: "#121212",
                          _type: "path",
                          refName: "unnamed",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  className: "mobile-arrow-right",
                  _type: "div",
                  refName: "nextSlide",
                  children: [
                    {
                      width: 17,
                      height: 13,
                      viewBox: "0 0 17 13",
                      fill: "none",
                      xmlns: "http://www.w3.org/2000/svg",
                      _type: "svg",
                      refName: "unnamed",
                      children: [
                        {
                          d: "M15.5731 7.52695C15.4782 7.54779 15.0425 7.17257 14.6084 7.28803C14.0842 7.42593 13.1404 8.27258 12.5616 8.58686C11.7159 9.04867 10.7962 9.36777 9.83308 9.43511C9.45845 9.46077 8.21719 9.28919 8.12715 9.31806C7.67696 9.46398 8.5259 9.85683 8.63684 9.99313C9.42308 10.9729 10.137 13.2643 8.12876 12.8313C6.4791 12.477 6.02087 10.5143 5.05777 9.54255C4.33263 8.81135 2.77783 8.16354 1.87583 7.47403C1.54622 7.22228 -0.0471632 5.92665 0.00107237 5.6284C0.126485 5.4424 0.312998 5.39429 0.510763 5.50012C1.02528 5.77432 1.72308 6.48147 2.32924 6.85027C4.15094 7.95669 6.24918 8.5131 8.35547 8.14269C9.15618 8.00158 12.0198 7.24794 11.0808 6.01645C10.629 5.42476 9.02273 5.53219 9.14492 5.00625C10.8187 2.70202 14.2177 3.73307 15.7516 5.68613C16.1375 6.1784 16.3401 7.35056 15.5747 7.52214L15.5731 7.52695Z",
                          fill: "#121212",
                          _type: "path",
                          refName: "unnamed",
                          children: [],
                        },
                        {
                          d: "M9.1605 0.0631379C10.1268 0.611535 9.58819 2.89813 9.01901 3.65017C7.71504 5.36752 6.09111 5.84055 4.03628 5.69303C3.33365 5.64332 1.02799 5.24886 0.666223 4.6748C0.527947 4.45673 0.566535 3.88588 0.96689 3.98209C2.51043 5.39478 4.96883 5.12699 6.09915 3.30862C6.91755 1.99055 5.57499 0.844043 7.789 0.128881C8.06877 0.0374819 8.92415 -0.0715562 9.16211 0.0631379H9.1605Z",
                          fill: "#121212",
                          _type: "path",
                          refName: "unnamed",
                          children: [],
                        },
                      ],
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
        (_this.onInit = () => {
          Device.mobile
            ? (function mobileInteractions() {
                (_this.prevSlide.touchClick(
                  () => {},
                  () => {
                    (_this.fire("ProductsScene/prevSlide"),
                      AudioUtils.playClick());
                  },
                ),
                  _this.nextSlide.touchClick(
                    () => {},
                    () => {
                      (_this.fire("ProductsScene/nextSlide"),
                        AudioUtils.playClick());
                    },
                  ));
              })()
            : (function desktopInteractions() {
                (_this.leftText.interact(
                  (e) => {
                    const isOver = "over" === e.action;
                    _this.fire("ProductsScene/prevSlideHover", isOver);
                  },
                  () => {
                    (_this.fire("ProductsScene/prevSlide"),
                      AudioUtils.playClick());
                  },
                  "#",
                  "left text",
                  "auto",
                  { role: "button" },
                ),
                  _this.rightText.interact(
                    (e) => {
                      const isOver = "over" === e.action;
                      _this.fire("ProductsScene/nextSlideHover", isOver);
                    },
                    () => {
                      (_this.fire("ProductsScene/nextSlide"),
                        AudioUtils.playClick());
                    },
                    "#",
                    "right text",
                    "auto",
                    { role: "button" },
                  ),
                  _this.prevSlide.interact(
                    (e) => {
                      const isOver = "over" === e.action;
                      _this.fire("ProductsScene/prevSlideHover", isOver);
                    },
                    () => {
                      (_this.fire("ProductsScene/prevSlide"),
                        AudioUtils.playClick());
                    },
                    "#",
                    "previous slide",
                    "auto",
                    { role: "button" },
                  ),
                  _this.nextSlide.interact(
                    (e) => {
                      const isOver = "over" === e.action;
                      _this.fire("ProductsScene/nextSlideHover", isOver);
                    },
                    () => {
                      (_this.fire("ProductsScene/nextSlide"),
                        AudioUtils.playClick());
                    },
                    "#",
                    "next slide",
                    "auto",
                    { role: "button" },
                  ));
              })();
        }),
        (_this.updateLabels = function ({ prev: prev, next: next }) {
          (_this.leftText.hit?.attr("aria-label", prev.replaceAll("\n", " ")),
            _this.rightText.hit?.attr(
              "aria-label",
              next.replaceAll("\n", " "),
            ));
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
          "ProductsUI" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }