function CookieBanner(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "CookieBanner"),
      (_this.contexts = "Element"),
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
              className: "cookie__background",
              _type: "div",
              refName: "background",
              children: [
                {
                  width: "100%",
                  height: "100%",
                  viewBox: "0 0 100 100",
                  preserveAspectRatio: "none",
                  fill: "none",
                  xmlns: "http://www.w3.org/2000/svg",
                  _type: "svg",
                  refName: "svg",
                  children: [
                    {
                      className: "border-path",
                      stroke: "#111111",
                      "stroke-width": 3,
                      vectorEffect: "non-scaling-stroke",
                      _type: "path",
                      refName: "pathTop",
                      children: [],
                    },
                    {
                      className: "border-path",
                      stroke: "#111111",
                      "stroke-width": 3,
                      vectorEffect: "non-scaling-stroke",
                      _type: "path",
                      refName: "pathRight",
                      children: [],
                    },
                    {
                      className: "border-path",
                      stroke: "#111111",
                      "stroke-width": 3,
                      vectorEffect: "non-scaling-stroke",
                      _type: "path",
                      refName: "pathBottom",
                      children: [],
                    },
                    {
                      className: "border-path",
                      stroke: "#111111",
                      "stroke-width": 3,
                      vectorEffect: "non-scaling-stroke",
                      _type: "path",
                      refName: "pathLeft",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              className: "cookie-banner-content",
              _type: "div",
              refName: "wrapper",
              children: [
                {
                  class: "body-regular",
                  noSplit: "$noSplit",
                  splitType: "lines, words",
                  animType: "words",
                  text: "$copy",
                  _type: "XText",
                  refName: "text",
                  children: [],
                },
                {
                  className: "cookie-banner-buttons",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      text: "Accept",
                      onClick: "$acceptCookies",
                      _type: "XButton",
                      refName: "acceptButton",
                      children: [],
                    },
                    {
                      text: "Decline",
                      onClick: "$rejectCookies",
                      class: "secondary",
                      _type: "XButton",
                      refName: "rejectButton",
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
      function perlin(x, y) {
        return (
          (x += Render.TIME),
          ((43758.5453 * Math.sin(12.9898 * x + 78.233 * y)) % 1) * 0.8
        );
      }
      function loop() {
        let _topD = "M0 0";
        for (let i = 0; i < 11; i++) {
          const progress = i / 10;
          let x = Math.range(progress, 0, 1, 0, 100),
            y = 0;
          _topD += `L${x} ${y + perlin(x, y)}`;
        }
        let _rightD = "M100 0";
        for (let i = 0; i < 9; i++) {
          const progress = i / 8;
          let x = 100,
            y = Math.range(progress, 0, 1, -1, 101);
          _rightD += `L${x + 0.2 * perlin(x, y)} ${y}`;
        }
        let _bottomD = "M0 100";
        for (let i = 0; i < 11; i++) {
          const progress = i / 10;
          let x = Math.range(progress, 0, 1, 0, 100),
            y = 100;
          _bottomD += `L${x} ${y + perlin(x, y)}`;
        }
        let _leftD = "M0 0";
        for (let i = 0; i < 9; i++) {
          const progress = i / 8;
          let y = Math.range(progress, 0, 1, -1, 101),
            x = 0;
          _leftD += `L${x + 0.2 * perlin(x, y)} ${y}`;
        }
        (_this.pathTop.div.setAttribute("d", _topD),
          _this.pathRight.div.setAttribute("d", _rightD),
          _this.pathBottom.div.setAttribute("d", _bottomD),
          _this.pathLeft.div.setAttribute("d", _leftD));
      }
      ((_this.cms = Config.CMS_COPY.homePage),
        (_this.copy = `This website uses cookies to improve your experience and for analytics and marketing purposes. View our <a class="privacy-link" href="${_this.cms.privacyPolicy}" target="_blank">Privacy Policy</a> for more information.`),
        (_this.ready = Promise.create()),
        (_this.noSplit = "safari" === Device.system.browser),
        (_this.onMounted = async () => {
          (_this.element.css({ opacity: 0 }),
            await _this.wait("text"),
            (function animateSet() {
              (_this.text.animateSet(),
                _this.acceptButton.animateSet(),
                _this.rejectButton.animateSet(),
                _this.element.transform({ y: "130%" }),
                _this.element.css({ opacity: 1 }));
            })(),
            _this.ready.resolve(),
            _this.startRender(loop, 8),
            _this.listen("Global/loaderFinished", () => {
              _this.delayedCall(_this.animateIn, 4500);
            }));
        }),
        (_this.acceptCookies = () => {
          (CookieNotice.accept(), _this.animateOut());
        }),
        (_this.rejectCookies = () => {
          (CookieNotice.decline(), _this.animateOut());
        }),
        (_this.animateIn = async () => {
          (await _this.ready,
            _this.element.tween({ y: "0%" }, 800, "easeOutCubic"),
            _this.text.animateIn(500, { stagger: 10 }),
            _this.acceptButton.animateIn(750),
            _this.rejectButton.animateIn(950));
        }),
        (_this.animateOut = async () => {
          (await _this.ready,
            AudioUtils.playClick(),
            await _this.element
              .tween({ y: "120%" }, 300, "easeOutCubic")
              .promise(),
            _this.element.hide(),
            _this.destroy());
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
          "CookieBanner" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }