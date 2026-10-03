function HeaderMenu(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element, "nav"),
      Inherit(_this, XComponent),
      (_this.fragName = "HeaderMenu"),
      (_this.contexts = "Element, 'nav'"),
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
              className: "header__background",
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
              className: "header__content",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  className: "header__link active",
                  _type: "div",
                  refName: "experience",
                  children: [
                    {
                      _type: "span",
                      _innerText: "EXPERIENCE",
                      refName: "experienceText",
                      children: [],
                    },
                  ],
                },
                {
                  className: "header__ornament",
                  width: 42,
                  height: 12,
                  viewBox: "0 0 42 12",
                  fill: "none",
                  xmlns: "http://www.w3.org/2000/svg",
                  _type: "svg",
                  refName: "ornament",
                  children: [
                    {
                      d: "M26.1778 0.261348C26.6009 0.375206 26.606 1.15409 26.565 1.55518C22.301 1.82171 26.0189 3.91773 26.7599 5.62559C27.1855 6.60372 27.0701 7.48612 27.0906 8.52636C28.3829 8.87311 29.5855 9.6106 30.9085 9.97546C32.4341 10.3973 36.5007 11.215 37.593 9.97028C37.793 9.74257 37.9186 9.67787 37.8417 9.31818L36.5802 9.03614L36.5571 8.28312C34.7136 9.77361 30.2521 10.2705 28.5983 8.42286C27.8752 7.61551 27.9881 6.92977 28.606 6.12759C28.7829 5.89729 29.1009 6.00598 29.1291 5.79896C29.1829 5.41858 29.0316 5.09253 29.2419 4.65521C29.5137 4.0911 30.3008 3.75988 30.9111 3.8815C30.7572 2.61872 31.3034 1.35593 32.6931 1.81395C32.5777 0.838399 33.5213 0.426965 34.3649 0.517533C35.3033 0.618452 36.0084 1.74926 36.6828 2.33148L36.0417 0.522706C37.2186 -0.165614 37.7571 0.6081 38.5263 0.750422C39.2955 0.892744 40.4775 -0.212191 41.0545 1.54225C41.5673 3.09744 39.6904 6.4821 38.093 6.99187L39.0058 7.49129C39.5083 9.34665 40.3083 10.2937 38.1853 11.3547C34.8161 13.0341 29.747 11.0442 26.4394 9.82278C24.8984 12.4337 20.6728 11.9731 18.2806 10.8113C14.8627 9.15258 10.873 4.40162 7.20389 4.1325C6.93466 4.1118 6.22442 3.97466 6.29878 4.39903C8.32951 4.30329 10.2064 5.5816 11.4269 7.11608C12.2397 8.13821 13.3473 10.3403 11.932 11.2512C10.7243 12.0301 9.66537 11.1658 8.47565 11.1088C7.53208 11.0623 6.90133 11.8179 6.07314 11.3495C5.31931 9.94182 7.2603 9.49415 7.84233 8.67904C9.34487 6.57526 6.32442 4.67591 4.25267 5.8326C4.05011 5.94645 3.28089 6.53644 3.07577 6.71758C2.82193 6.94271 2.80398 7.26099 2.63988 7.43954C2.49373 7.59739 2.05784 7.57151 1.95271 7.91308C1.82708 8.31417 2.19374 9.32337 2.43476 9.66494C2.73475 10.0867 4.08087 10.5059 3.986 11.3857L0.13993 11.3857C-0.0831426 10.7595 0.655308 10.4076 0.657872 9.97028C0.657872 9.43981 0.0219865 8.25466 -0.00108992 7.37485C-0.0139102 6.93753 0.0835228 5.77308 0.150188 5.31506C0.25275 4.60604 1.44503 1.89934 1.404 1.71303C1.30657 1.26537 0.0835231 0.84099 0.398901 -1.78088e-06L3.74498 0.116439C4.31676 0.809934 3.93985 1.48532 3.47576 2.06754C3.68345 2.25385 4.67574 1.53189 5.00906 1.41804C9.29359 -0.0414091 14.8653 1.96662 18.7831 3.82974C21.1651 4.96314 23.4318 6.34496 25.6548 7.763C26.0548 7.13161 25.5548 6.42776 25.1471 5.94645C23.5189 4.03417 19.0652 3.40278 20.1421 0.258766L26.1676 0.258766L26.1778 0.261348ZM37.8468 6.73052C39.1212 5.99303 41.5185 2.57473 40.2852 1.29383C39.5032 0.481306 38.8648 1.62505 38.5109 1.54742C38.1955 1.47755 37.6981 0.385557 36.8212 0.778882C36.6545 1.57071 37.3289 1.80101 37.6468 2.40394C38.3212 3.68224 38.2135 5.37458 37.8494 6.73052L37.8468 6.73052ZM4.25523 4.91657C5.45008 3.17248 7.46542 3.55804 9.19872 4.19978C13.8755 5.93352 18.7113 13.0832 24.2599 11.0028C25.3573 10.5913 25.7548 9.78915 26.6881 9.30784C27.8983 9.85901 29.1239 10.3791 30.406 10.7466C32.5418 11.3573 36.6956 12.0715 38.4904 10.6146C39.9211 9.45275 38.3904 9.08789 38.3596 7.763L37.0802 8.40991C37.0802 8.67127 38.916 9.22245 38.2417 10.0997C37.9314 10.6845 36.3263 11.0882 35.6776 11.1347C34.6648 11.2072 32.429 10.7983 31.37 10.5473C29.7573 10.1669 28.1599 9.29749 26.5881 8.77737C26.7753 7.31275 26.7599 6.45105 25.9163 5.1831C25.3317 4.30329 23.1138 2.56179 24.3753 1.53966L26.0548 0.7763C24.6445 0.755598 23.2266 0.796998 21.8113 0.781472C21.5215 0.778884 20.3036 0.333806 20.4087 1.16186C20.6677 3.17506 24.3035 4.04969 25.5471 5.5583C26.1855 6.33202 26.4291 7.28686 26.3112 8.28053C25.924 8.36074 25.6855 8.20808 25.3625 8.07611C23.783 7.43178 21.9164 5.9594 20.3369 5.12617C16.4704 3.09226 10.3192 0.527881 5.9834 1.60694C5.02701 1.845 3.86806 2.47639 3.10654 3.10261C2.74757 3.40019 1.69888 4.29811 2.08348 4.6578C5.77059 0.240652 11.9089 1.82689 16.4934 3.82974C17.6216 4.32399 25.6445 8.42286 25.7932 8.9378C26.0214 9.72446 24.2676 10.5706 23.6061 10.612C23.1241 10.6431 21.5036 10.1255 21.0036 9.88747C18.9703 8.91451 16.9242 6.66324 14.8576 5.48068C11.7807 3.71847 7.04748 2.18916 3.91421 4.43785C3.1373 4.99678 2.67834 6.06549 1.69888 5.95422V4.91915L1.05786 5.69545L0.675815 5.17792C0.737352 6.14053 0.578386 7.19112 0.68864 8.1408C0.798894 9.09047 1.53221 9.97028 0.93222 10.8708L3.23986 11.1296L1.56041 9.07494L1.4476 6.99446C2.69885 7.28169 3.04756 5.95939 3.91421 5.47291C5.11675 4.79494 6.60133 4.91139 7.73721 5.69028C9.76537 7.07985 8.69616 9.49932 6.60903 10.1307L6.57569 11.1321C7.12184 10.951 7.94233 10.5939 8.49873 10.5965C9.6346 10.5965 11.0423 11.7558 11.9294 10.4542C12.414 9.74256 11.8192 8.64281 11.4115 7.93638C10.0269 5.55055 6.9603 4.02123 4.27062 4.92174L4.25523 4.91657ZM33.229 2.33148C31.1957 1.53966 31.0854 3.49076 32.0854 4.9088C32.7905 5.90764 35.47 7.6569 36.5802 6.87543C37.052 6.54162 36.9186 4.55429 36.8135 4.01865C36.5751 2.79727 34.6572 0.235475 33.3444 1.28348L33.229 2.33148ZM36.0494 8.02435C33.4649 8.16667 31.4393 6.64512 30.2803 4.40162C29.4342 4.80012 29.8085 5.7912 29.5239 6.22334C29.3188 6.53644 28.6522 6.4407 28.5983 7.11608C28.524 8.08387 29.9265 8.93521 30.8034 9.04648C32.5239 9.26643 33.9495 9.01026 35.5341 8.40475C35.7879 8.309 36.1212 8.37368 36.0494 8.02176V8.02435ZM2.7168 4.6578C2.93988 4.85964 4.28087 3.6072 4.69881 3.42348C8.58078 1.70785 13.8114 4.09368 17.0652 6.35013C19.3575 7.93896 22.4061 11.7118 25.2779 9.18621C25.2779 9.06718 24.1574 8.37368 23.9189 8.23136C20.1523 5.99562 13.8345 2.65494 9.52178 2.31855C7.10901 2.13223 4.19626 2.55402 2.7168 4.65521V4.6578ZM1.17837 4.91657C1.25017 4.45596 1.47837 3.91773 1.72964 3.53216C2.08348 2.99134 4.03216 1.03247 3.48858 0.520114L1.18093 0.520114C2.66808 1.83982 1.50657 2.69635 1.03991 4.12991C0.952736 4.39903 0.683507 4.95538 1.18093 4.91915L1.17837 4.91657Z",
                      fill: "#C82924",
                      _type: "path",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  className: "header__link",
                  _type: "div",
                  refName: "collection",
                  children: [
                    {
                      _type: "span",
                      _innerText: "COLLECTION",
                      refName: "collectionText",
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
      function animateIn() {
        _this.background.tween({ scaleX: 1 }, 1100, "easeOutCubic", 4e3);
        [_this.experience, _this.ornament, _this.collection].forEach(
          (el, i) => {
            let delay = 4200;
            ((delay += 100 * i),
              el.tween({ opacity: 1, y: 0 }, 800, "easeOutCubic", delay));
          },
        );
      }
      function onChangeScrollY() {
        Math.abs(_this.getSync("Story/scrollY") || 0) >
        (_this.getSync("TasteScene/y") || 0) - 0.4
          ? _this.set("active", "collection")
          : _this.set("active", "experience");
      }
      function onChangeActive(value) {
        ("experience" === value
          ? (_this.experience.classList().add("active"),
            _this.collection.classList().remove("active"))
          : (_this.experience.classList().remove("active"),
            _this.collection.classList().add("active")),
          _this.experience.hit.attr(
            "aria-pressed",
            String("experience" === value),
          ),
          _this.collection.hit.attr(
            "aria-pressed",
            String("collection" === value),
          ));
      }
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
        for (let i = 0; i < 6; i++) {
          const progress = i / 5;
          let x = 100,
            y = Math.range(progress, 0, 1, -3, 103);
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
        for (let i = 0; i < 6; i++) {
          const progress = i / 5;
          let y = Math.range(progress, 0, 1, -3, 103),
            x = 0;
          _leftD += `L${x + 0.2 * perlin(x, y)} ${y}`;
        }
        (_this.pathTop.div.setAttribute("d", _topD),
          _this.pathRight.div.setAttribute("d", _rightD),
          _this.pathBottom.div.setAttribute("d", _bottomD),
          _this.pathLeft.div.setAttribute("d", _leftD));
      }
      function suppressAudioUntilScrollSettles() {
        const manager = AudioManager.instance();
        _this.set("Story/suppressTransitionAudio", !0);
        for (const [id, chain] of Object.entries(manager.effectChains))
          ["drone", "vortexFocus"].includes(id) ||
            chain.setGain(0, { smoothing: 0.4 });
        _this.startRender(() => {
          if (Math.abs(Global.SCROLL.delta.y) <= 10) {
            _this.clearRenders();
            for (const chain of Object.values(manager.effectChains))
              chain.setGain(1, { smoothing: 0.1 });
            _this.set("Story/suppressTransitionAudio", !1);
          }
        });
      }
      (_this.set("active", "experience"),
        (_this.onMounted = function () {
          (_this.startRender(loop, 8),
            Config.NO_UI && _this.element.hide(),
            _this.experience.interact({
              clickCallback: () => {
                (Story.scrollToTop(),
                  GoogleAnalytics.track("menu_experience"),
                  suppressAudioUntilScrollSettles());
              },
              seoText: "experience",
              seoLink: "#",
              role: "button",
            }));
          let collectionTimerId = null;
          (_this.collection.interact({
            clickCallback: () => {
              collectionTimerId && clearTimeout(collectionTimerId);
              const scrollInstance = _this.getSync("Story/scroll"),
                y =
                  _this.getSync("ProductsScene/yPixel") +
                    (Device.mobile ? -50 : 50) || 0,
                diff = Math.abs(scrollInstance.y - y);
              let time = Math.range(
                diff,
                Stage.height,
                10 * Stage.height,
                800,
                3e3,
                !0,
              );
              ((scrollInstance.enabled = !1),
                scrollInstance?.scrollTo?.(y, "y", time, "easeOutCubic"),
                (collectionTimerId = _this.delayedCall(
                  () => (scrollInstance.enabled = !0),
                  200,
                )),
                GoogleAnalytics.track("menu_collection"),
                AudioUtils.playClick(),
                suppressAudioUntilScrollSettles());
            },
            seoText: "collection",
            seoLink: "#",
            role: "button",
          }),
            _this.element.hover((e) => {
              const isOver = "over" === e.action;
              _this
                .getSync("Story/composite")
                ?.tween?.("uMenuHover", isOver ? 1 : 0, 800, "easeOutCubic");
            }),
            _this.bind("active", onChangeActive),
            _this.bind("Story/scrollY", onChangeScrollY),
            _this.bind("TasteScene/y", onChangeScrollY),
            (function animateSet() {
              _this.background.transform({ scaleX: 0 });
              [_this.experience, _this.ornament, _this.collection].forEach(
                (el) => {
                  (el.css({ opacity: 0 }), el.transform({ y: 20 }));
                },
              );
            })(),
            _this.listen("Global/loaderFinished", animateIn));
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
          "HeaderMenu" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }