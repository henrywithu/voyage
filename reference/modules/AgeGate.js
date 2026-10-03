function AgeGate(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "AgeGate"),
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
              className: "tilt",
              _type: "div",
              refName: "tilt",
              children: [
                {
                  className: "intro",
                  _type: "div",
                  refName: "intro",
                  children: [
                    {
                      className: "top",
                      _type: "div",
                      refName: "top",
                      children: [
                        {
                          className: "heading2",
                          _type: "h2",
                          _innerText: "Are you of",
                          refName: "text1",
                          children: [],
                        },
                      ],
                    },
                    {
                      className: "bottom",
                      _type: "div",
                      refName: "bottom",
                      children: [
                        {
                          className: "heading2",
                          _type: "h2",
                          _innerText: "legal age?",
                          refName: "text2",
                          children: [],
                        },
                      ],
                    },
                    {
                      className: "actions",
                      _type: "div",
                      refName: "actions",
                      children: [
                        {
                          className: "action body-bold",
                          _type: "div",
                          _innerText: "Yes",
                          refName: "action1",
                          children: [],
                        },
                        {
                          className: "decor",
                          _type: "div",
                          refName: "decor",
                          children: [
                            {
                              width: 21,
                              height: 72,
                              viewBox: "0 0 21 72",
                              fill: "none",
                              xmlns: "http://www.w3.org/2000/svg",
                              _type: "svg",
                              refName: "unnamed",
                              children: [
                                {
                                  d: "M0.457361 26.1849C0.656611 25.4445 2.01966 25.4355 2.72157 25.5073C3.188 32.9693 6.85602 26.4631 9.84478 25.1663C11.5565 24.4214 13.1007 24.6234 14.9211 24.5875C15.5279 22.326 16.8186 20.2215 17.4571 17.9062C18.1952 15.2364 19.6262 8.11986 17.448 6.20836C17.0495 5.85837 16.9363 5.6385 16.3068 5.77311L15.8132 7.98076L14.4955 8.02114C17.1038 11.2474 17.9733 19.0549 14.74 21.949C13.3271 23.2144 12.1271 23.017 10.7233 21.9356C10.3203 21.626 10.5105 21.0696 10.1482 21.0202C9.48251 20.926 8.91192 21.1907 8.14662 20.8228C7.15942 20.3472 6.57979 18.9696 6.79263 17.9017C4.58276 18.1709 2.37288 17.2152 3.17441 14.7832C1.4672 14.9851 0.747189 13.3338 0.905683 11.8576C1.08229 10.2153 3.0612 8.98137 4.08009 7.80127L0.914735 8.92304C-0.289824 6.86347 1.06418 5.92118 1.31324 4.57505C1.5623 3.22893 -0.371334 1.16039 2.69893 0.150795C5.42051 -0.746622 11.3437 2.53792 12.2358 5.33337L13.1098 3.73597C16.3566 2.8565 18.014 1.45654 19.8707 5.17184C22.8096 11.0679 19.3273 19.9388 17.1899 25.7272C21.759 28.4239 20.953 35.8186 18.9197 40.0051C16.017 45.9864 7.70284 52.9683 7.23188 59.3893C7.19566 59.8604 6.95565 61.1033 7.69831 60.9732C7.53076 57.4194 9.7678 54.1349 12.4531 51.9991C14.2419 50.5766 18.0956 48.6382 19.6896 51.1151C21.0526 53.2285 19.5401 55.0817 19.4405 57.1637C19.359 58.8149 20.6813 59.9188 19.8616 61.3681C17.3982 62.6873 16.6148 59.2906 15.1883 58.272C11.5067 55.6426 8.18284 60.9284 10.207 64.5539C10.4063 64.9084 11.4388 66.2545 11.7558 66.6135C12.1497 67.0577 12.7067 67.0891 13.0192 67.3763C13.2954 67.6321 13.2501 68.3949 13.8479 68.5788C14.5498 68.7987 16.3159 68.157 16.9136 67.7353C17.6518 67.2103 18.3854 64.8546 19.925 65.0206V71.7512C18.8291 72.1416 18.2133 70.8493 17.448 70.8448C16.5197 70.8448 14.4457 71.9576 12.906 71.998C12.1407 72.0204 10.1029 71.8499 9.30136 71.7333C8.06057 71.5538 3.32386 69.4673 2.99781 69.5391C2.21439 69.7096 1.47174 71.8499 0 71.298L0.20377 65.4424C1.41739 64.4417 2.59931 65.1013 3.6182 65.9135C3.94425 65.55 2.68081 63.8135 2.48156 63.2302C-0.0724635 55.7323 3.44159 45.9819 6.70205 39.1256C8.6855 34.9571 11.1037 30.9905 13.5853 27.1002C12.4803 26.4002 11.2486 27.2752 10.4063 27.9887C7.05979 30.838 5.95487 38.632 0.452842 36.7475V26.2028L0.457361 26.1849ZM11.7784 5.76414C10.4878 3.53406 4.50577 -0.661367 2.26421 1.49692C0.842286 2.86548 2.84384 3.98277 2.70798 4.60199C2.58572 5.1539 0.674725 6.02439 1.36304 7.55898C2.74874 7.85064 3.15177 6.67053 4.20689 6.11413C6.44393 4.93403 9.40551 5.12249 11.7784 5.75965V5.76414ZM8.60399 64.5494C5.55184 62.4584 6.22656 58.9316 7.34961 55.8983C10.3837 47.7139 22.8957 39.2513 19.2548 29.5412C18.5348 27.6207 17.131 26.9252 16.2887 25.2919C17.2533 23.174 18.1635 21.0292 18.8065 18.7857C19.8752 15.0479 21.1251 7.77884 18.5756 4.63788C16.5423 2.13409 15.9038 4.81288 13.5853 4.86673L14.7173 7.10578C15.1747 7.10578 16.1393 3.89302 17.6744 5.07313C18.6978 5.61606 19.4043 8.42498 19.4858 9.56021C19.6126 11.3326 18.8971 15.2453 18.4578 17.0985C17.7921 19.9209 16.2706 22.7163 15.3604 25.4669C12.7973 25.1394 11.2893 25.1663 9.07042 26.6425C7.53076 27.6656 4.48312 31.5469 2.6944 29.3393L1.35853 26.4002C1.3223 28.8681 1.39475 31.3495 1.36758 33.8264C1.36305 34.3334 0.584161 36.4648 2.03325 36.2808C5.55636 35.8276 7.08696 29.4649 9.72703 27.2887C11.081 26.1714 12.752 25.7451 14.4909 25.9515C14.6313 26.6291 14.3641 27.0464 14.1332 27.6118C13.0056 30.3758 10.4289 33.6424 8.97079 36.4064C5.41146 43.173 0.923793 53.9375 2.81214 61.5251C3.22876 63.1988 4.33369 65.227 5.42957 66.5596C5.95034 67.1878 7.5217 69.023 8.15115 68.35C0.421143 61.8976 3.19706 51.1555 6.70205 43.1326C7.56698 41.1583 14.74 27.1182 15.6412 26.8579C17.0178 26.4586 18.4986 29.5277 18.571 30.6854C18.6254 31.529 17.7197 34.3648 17.3031 35.2398C15.6004 38.7981 11.6607 42.3788 9.59118 45.9953C6.50733 51.3798 3.83104 59.663 7.76623 65.1462C8.74437 66.5058 10.6146 67.309 10.4199 69.023H8.60851L9.96704 70.1448L9.06135 70.8134C10.7459 70.7057 12.5845 70.9839 14.2464 70.791C15.9083 70.598 17.448 69.3147 19.0239 70.3647L19.4767 66.3263L15.8811 69.2654L12.2403 69.4628C12.743 67.2731 10.4289 66.6628 9.5776 65.1462C8.39115 63.0418 8.59493 60.4437 9.95798 58.456C12.3897 54.9067 16.6238 56.7778 17.7288 60.4303L19.4812 60.4886C19.1643 59.5329 18.5393 58.097 18.5439 57.1233C18.5439 55.1355 20.5726 52.6721 18.2948 51.1196C17.0495 50.2715 15.1249 51.3125 13.8887 52.026C9.71346 54.449 7.03716 59.8156 8.61304 64.5225L8.60399 64.5494ZM4.08009 13.8454C2.6944 17.4036 6.10884 17.5966 8.59041 15.8466C10.3384 14.6127 13.3996 9.92367 12.032 7.98076C11.4478 7.15514 7.97001 7.38847 7.03263 7.57244C4.89522 7.98974 0.412082 11.3461 2.24609 13.6435L4.08009 13.8454ZM14.0426 8.90958C14.2917 13.4326 11.629 16.9774 7.70283 19.0055C8.4002 20.4863 10.1346 19.8311 10.8908 20.3292C11.4388 20.6882 11.2712 21.8548 12.4531 21.949C14.1468 22.0792 15.6366 19.6247 15.8313 18.0902C16.2163 15.0793 15.768 12.5845 14.7083 9.81149C14.5408 9.36727 14.6539 8.78394 14.0381 8.90958H14.0426ZM8.15115 67.2417C8.50437 66.8513 6.3126 64.5046 5.99109 63.7732C2.98875 56.9797 7.16395 47.8261 11.1127 42.132C13.8932 38.1205 20.4956 32.7854 16.0759 27.7598C15.8676 27.7598 14.6539 29.7207 14.4049 30.138C10.4923 36.7295 4.64615 47.7857 4.05746 55.333C3.73141 59.5553 4.46954 64.6526 8.14662 67.2417H8.15115ZM8.60399 69.9339C7.79793 69.8083 6.85602 69.4089 6.18129 68.9692C5.23485 68.35 1.80683 64.9398 0.910203 65.8911V69.9295C3.2197 67.3269 4.71861 69.3596 7.22735 70.1762C7.69831 70.3288 8.67191 70.7999 8.60851 69.9295L8.60399 69.9339Z",
                                  fill: "white",
                                  _type: "path",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          className: "action body-bold",
                          _type: "div",
                          _innerText: "No",
                          refName: "action2",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  className: "denied",
                  _type: "div",
                  refName: "denied",
                  children: [
                    {
                      className: "heading3",
                      _type: "h2",
                      refName: "unnamed",
                      children: [
                        {
                          _type: "inlinetext",
                          _innerText: "ACCESS",
                          refName: "unnamed",
                          children: [],
                        },
                        { _type: "br", refName: "unnamed", children: [] },
                        {
                          _type: "inlinetext",
                          _innerText: "DENIED",
                          refName: "unnamed",
                          children: [],
                        },
                      ],
                    },
                    {
                      className: "body-bold",
                      _type: "p",
                      _innerText: "You need to be of legal age to access.",
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
      (_this.set("visible", !1),
        (_this.tiltStrength = 0),
        _this.actions.css({ opacity: 0 }),
        _this.text1.css({ opacity: 0 }),
        _this.text2.css({ opacity: 0 }),
        _this.text1.transform({ y: "110%" }),
        _this.text2.transform({ y: "-110%" }),
        _this.decor.transform({ scale: 0 }),
        _this.denied.hide());
      const isPlayground = _this.isPlayground();
      function bindHoverEventListeners({ el: el, glEl: glEl }) {
        (el.addEventListener("mouseenter", () => {
          _this.flag("clicked") || glEl.hover({ action: "over" });
        }),
          el.addEventListener("focus", () => {
            _this.flag("clicked") || glEl.hover({ action: "over" });
          }),
          el.addEventListener("mouseleave", () => {
            _this.flag("clicked") || glEl.hover({ action: "out" });
          }),
          el.addEventListener("blur", () => {
            _this.flag("clicked") || glEl.hover({ action: "out" });
          }));
      }
      ((AgeGate.NEEDS_CONSENT = Config.SHOW_AGE_GATE || isPlayground),
        (_this.onMounted = AgeGate.NEEDS_CONSENT
          ? async () => {
              await GLUI.ready();
              (await _this.fn("Story/loop"))();
              const isMobile = Stage.width < 768,
                button1 = _this.createFragment(GLUIButton, { text: "Yes" }),
                button2 = _this.createFragment(GLUIButton, { text: "No" });
              (button1.animateSet(), button2.animateSet());
              const endButton1Rect = _this.action1.div.getBoundingClientRect(),
                endButton2Rect = _this.action2.div.getBoundingClientRect();
              (_this.action1.transform({ x: isMobile ? "-100%" : "100%" }),
                _this.action2.transform({ x: isMobile ? "100%" : "-100%" }));
              const startButton1Rect =
                  _this.action1.div.getBoundingClientRect(),
                startButton2Rect = _this.action2.div.getBoundingClientRect();
              ((button1.element.x =
                startButton1Rect.x + startButton1Rect.width / 2),
                (button1.element.y =
                  startButton1Rect.y + startButton1Rect.height / 2),
                (button2.element.x =
                  startButton2Rect.x + startButton2Rect.width / 2),
                (button2.element.y =
                  startButton2Rect.y + startButton2Rect.height / 2),
                (_this.gluiGroup = _this.gl()),
                _this.gluiGroup.add(button1.element),
                _this.gluiGroup.add(button2.element),
                GLUI.Stage.add(_this.gluiGroup));
              const onClick1 = () => {
                  _this.flag("clicked") ||
                    (_this.flag("clicked", !0),
                    _this.set("ageGateConsent", !0),
                    _this.fn("Story/tweenInDrones")(),
                    animateOut(),
                    AudioUtils.playClick());
                },
                onClick2 = () => {
                  _this.flag("clicked") ||
                    (_this.flag("clicked", !0),
                    _this.set("ageGateConsent", !1),
                    animateOut(),
                    AudioUtils.playClick());
                };
              async function animateIn() {
                (!isPlayground && (await _this.wait(1e3)),
                  _this.set("visible", !0),
                  handleResize({ beforeAnimating: !0 }),
                  _this.text1.tween(
                    { y: "0%", opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                  ),
                  _this.text2.tween(
                    { y: "0%", opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                  ),
                  await _this.wait(1200));
                const topRect = _this.top.div.getBoundingClientRect(),
                  bottomRect = _this.bottom.div.getBoundingClientRect(),
                  text1Rect = _this.text1.div.getBoundingClientRect(),
                  text2Rect = _this.text2.div.getBoundingClientRect();
                (_this.actions.tween({ opacity: 1 }, 1e3, "easeInOutCubic"),
                  _this.text1.tween(
                    { y: -(topRect.height - text1Rect.height) },
                    1e3,
                    "easeInOutQuart",
                  ),
                  _this.text2.tween(
                    { y: bottomRect.height - text2Rect.height },
                    1e3,
                    "easeInOutQuart",
                  ),
                  _this.action1.tween({ x: "0%" }, 1e3, "easeInOutCubic"),
                  _this.action2.tween({ x: "0%" }, 1e3, "easeInOutCubic"),
                  button1.element.tween(
                    {
                      x:
                        button1.element.x -
                        (startButton1Rect.x - endButton1Rect.x),
                    },
                    1e3,
                    "easeInOutCubic",
                  ),
                  button2.element.tween(
                    {
                      x:
                        button2.element.x -
                        (startButton2Rect.x - endButton2Rect.x),
                    },
                    1e3,
                    "easeInOutCubic",
                  ),
                  button1.animateIn(),
                  button2.animateIn(),
                  _this.decor.tween({ scale: 1 }, 1e3, "easeInOutCubic"),
                  _this.flag("animated", !0),
                  tween(
                    _this,
                    { tiltStrength: 1 },
                    2e3,
                    "easeInOutCubic",
                    400,
                  ));
              }
              async function animateOut() {
                const topRect = _this.top.div.getBoundingClientRect(),
                  bottomRect = _this.bottom.div.getBoundingClientRect();
                _this.get("ageGateConsent")
                  ? (_this.set("visible", !1),
                    _this.fire("Global/loaderFinished"),
                    button1.animateOut(),
                    button2.animateOut(),
                    _this.top.tween(
                      { y: -topRect.height },
                      1e3,
                      "easeInOutCubic",
                    ),
                    _this.bottom.tween(
                      { y: bottomRect.height },
                      1e3,
                      "easeInOutCubic",
                    ),
                    await _this.element
                      .tween({ opacity: 0 }, 1e3, "easeInOutCubic", 300)
                      .promise(),
                    _this.destroy())
                  : (_this.denied.css({ opacity: 0 }),
                    _this.denied.show(),
                    button1.animateOut(),
                    button2.animateOut(),
                    _this.top.tween(
                      { y: -topRect.height },
                      1e3,
                      "easeInOutCubic",
                    ),
                    _this.bottom.tween(
                      { y: bottomRect.height },
                      1e3,
                      "easeInOutCubic",
                    ),
                    _this.intro
                      .tween({ opacity: 0 }, 1e3, "easeInOutCubic")
                      .promise()
                      .then(() => {
                        _this.intro.hide();
                      }),
                    await _this.wait(500),
                    _this.denied.tween({ opacity: 1 }, 1e3, "easeInOutCubic"));
              }
              (Device.mobile
                ? (_this.action1.touchClick(() => {}, onClick1),
                  _this.action2.touchClick(() => {}, onClick2))
                : (_this.action1.click(onClick1),
                  _this.action2.click(onClick2)),
                bindHoverEventListeners({
                  el: _this.action1.div,
                  glEl: button1,
                }),
                bindHoverEventListeners({
                  el: _this.action2.div,
                  glEl: button2,
                }),
                isPlayground && animateIn());
              const handleResize = ({
                beforeAnimating: beforeAnimating = !1,
              } = {}) => {
                if (!_this.flag("animated") && !beforeAnimating) return;
                ((_this.isResizing = !0),
                  (_this.gluiGroup.x = 0),
                  (_this.gluiGroup.y = 0),
                  (_this.gluiGroup.rotationX = 0),
                  (_this.gluiGroup.rotationY = 0),
                  (_this.tilt.x = 0),
                  (_this.tilt.y = 0),
                  (_this.tilt.rotationX = 0),
                  (_this.tilt.rotationY = 0),
                  _this.tilt.transform(),
                  beforeAnimating ||
                    (_this.text1.transform({
                      y: -(
                        _this.top.div.getBoundingClientRect().height -
                        _this.text1.div.getBoundingClientRect().height
                      ),
                    }),
                    _this.text2.transform({
                      y:
                        _this.bottom.div.getBoundingClientRect().height -
                        _this.text2.div.getBoundingClientRect().height,
                    })));
                const action1Rect = _this.action1.div.getBoundingClientRect(),
                  action2Rect = _this.action2.div.getBoundingClientRect();
                ((button1.element.x = action1Rect.x + action1Rect.width / 2),
                  (button1.element.y = action1Rect.y + action1Rect.height / 2),
                  (button2.element.x = action2Rect.x + action2Rect.width / 2),
                  (button2.element.y = action2Rect.y + action2Rect.height / 2),
                  (_this.isResizing = !1));
              };
              (_this.onResize(() => Utils.debounce(handleResize, 100)),
                _this.fn("animateIn", animateIn),
                _this.applyTilt());
            }
          : () => {
              _this.destroy();
            }),
        (_this.applyTilt = function () {
          if (!Tests.domTilt()) return;
          if (_this.isResizing) return;
          _this.element.css({ perspective: 1e3 });
          const _t = new Vector2(),
            _tilt = new Vector2(),
            _translate = new Vector2(),
            _tiltSettings = new Vector2(20, 10),
            _translateSettings = new Vector2(80, 20);
          ((_tiltSettings.x *= -1),
            (_translateSettings.x *= -1),
            _this.startRender(() => {
              if (_this.isResizing) return;
              const strength = 0.25 * _this.tiltStrength;
              (_t.lerp(Mouse.tilt, 0.1),
                _tilt.copy(_t).multiply(_tiltSettings).multiplyScalar(strength),
                _translate
                  .copy(_t)
                  .multiply(_translateSettings)
                  .multiplyScalar(strength),
                (_this.tilt.x = _translate.x),
                (_this.tilt.y = _translate.y),
                (_this.tilt.rotationX = -1 * _tilt.y),
                (_this.tilt.rotationY = _tilt.x),
                _tilt.multiplyScalar(1.3),
                _translate.multiplyScalar(1.3),
                (_this.gluiGroup.x = _translate.x),
                (_this.gluiGroup.y = _translate.y),
                (_this.gluiGroup.rotationX = -1 * _tilt.y),
                (_this.gluiGroup.rotationY = _tilt.x),
                _this.tilt.transform());
            }, RenderManager.BEFORE_RENDER));
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
          "AgeGate" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }