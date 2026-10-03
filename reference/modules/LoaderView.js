function LoaderView(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "LoaderView"),
      (_this.contexts = "Element"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          clsx: "stack",
          css: "position: absolute",
          size: "100%",
          setZ: 100,
          _type: "UI",
          refName: "unnamed",
          children: [
            { _type: "Logo", refName: "logo", children: [] },
            {
              className: "lottie-container",
              _type: "div",
              refName: "lottieContainer",
              children: [],
            },
            {
              className: "loading-bar stack",
              _type: "div",
              refName: "loadingBar",
              children: [
                {
                  width: "100%",
                  height: "100%",
                  viewBox: "$viewBox",
                  preserveAspectRatio: "none",
                  fill: "none",
                  xmlns: "http://www.w3.org/2000/svg",
                  _type: "svg",
                  refName: "loadingBarSvg",
                  children: [
                    {
                      className: "loading-bar__track",
                      _type: "path",
                      refName: "pathTrack",
                      children: [],
                    },
                    {
                      className: "loading-bar__fill",
                      _type: "path",
                      refName: "pathFill",
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
      const CONFIG = { bar: { size: 8, noise: { scale: 3, density: 8 } } };
      ((_this.viewBox = `0 0 ${100 + CONFIG.bar.size / 2} ${CONFIG.bar.size}`),
        Utils.query("skip") &&
          (_this.fire("Global/loaderFinished"),
          _this.element
            .tween({ opacity: 0 }, 1e3, "easeInOutSine", 500)
            .promise()
            .then(() => {
              (null !== barRafId && cancelAnimationFrame(barRafId),
                _this.destroy());
            })),
        _this.logo.element.css({ opacity: 0 }),
        _this.loadingBar.css({ opacity: 0 }),
        (_this.logo.element.y = "2%"),
        _this.logo.element.transform(),
        _this.loadingBar.css({ height: `${CONFIG.bar.size}px` }),
        (_this.onInit = function () {
          _this.loadingBar.css({ height: `${CONFIG.bar.size}px` });
        }),
        (async function initLottie() {
          const json = await get(Assets.getPath("assets/lottie/loader.json"));
          ((_this.lottieAnim = lottie.loadAnimation({
            container: _this.lottieContainer.div,
            renderer: "svg",
            loop: !1,
            autoplay: !1,
            animationData: json,
          })),
            _this.lottieAnim.setSpeed(0.5),
            _this.wait(3e3).then(() => {
              (console.log("lottie complete"), lottieComplete.resolve());
            }),
            _this.logo.element.tween(
              { opacity: 1, y: 0 },
              1e3,
              "easeInOutSine",
            ),
            await _this.wait(200),
            _this.lottieAnim.play(),
            _this.loadingBar.tween({ opacity: 1 }, 1e3, "easeInOutSine", 200),
            _this.startRender(updateBarPaths, 8));
        })());
      const lottieComplete = Promise.create();
      let loaderPercent = 0,
        barRafId = null,
        seed = 80;
      function perlin(x, y) {
        return (
          (x += (Math.floor(8 * seed) / 8) * 0.01),
          ((43758.5453 * Math.sin(12.9898 * x + 78.233 * y)) % 1) * 0.8
        );
      }
      function updateBarPaths() {
        const { density: density, scale: scale } = CONFIG.bar.noise;
        let trackD = `M4 ${perlin(0, 0)}`;
        for (let i = 1; i <= density; i++) {
          const progress = i / density,
            x = Math.range(progress, 0, 1, 0, 100);
          trackD += ` L${x} ${perlin(x, 0) * scale}`;
        }
        trackD += " Z";
        const fillD = trackD;
        if (
          (_this.pathTrack?.div &&
            _this.pathTrack.div.setAttribute("d", trackD),
          _this.pathFill?.div)
        ) {
          _this.pathFill.div.setAttribute("d", fillD);
          const length = _this.pathFill.div.getTotalLength();
          (_this.pathFill.div.setAttribute("stroke-dasharray", length),
            _this.pathFill.div.setAttribute(
              "stroke-dashoffset",
              length * (1 - loaderPercent),
            ));
        }
      }
      (_this.bind(
        _this.params.loader,
        Events.PROGRESS,
        ({ percent: percent }) => {
          ((loaderPercent = percent),
            _this.element.div?.style?.setProperty(
              "--loader-per",
              100 * percent + "%",
            ));
        },
      ),
        _this.bind(_this.params.loader, Events.COMPLETE, async (_) => {
          if (
            (await lottieComplete,
            Config.SHOW_AGE_GATE && AgeGate.NEEDS_CONSENT)
          ) {
            (await _this.fn("AgeGate/animateIn"))();
          } else _this.fire("Global/loaderFinished");
          (await _this.element
            .tween({ opacity: 0 }, 1e3, "easeInOutSine", 500)
            .promise(),
            GoogleAnalytics.track("load_complete"),
            _this.clearRenders(),
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
          "LoaderView" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }