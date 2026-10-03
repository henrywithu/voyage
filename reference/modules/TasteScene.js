function TasteScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "TasteScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "TasteScene"),
      (_this.contexts = "BaseView, 'TasteScene'"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let _camera,
        onInit = _this.onInit;
      ((_this.screenHeight = 1),
        (_this.screenWidth = 1),
        TweenManager.addCustomEase({
          name: "collectionEase",
          curve: "cubic-bezier(0.22, 1.00, 0.36, 1.00)",
        }),
        (_this.init = async () => {
          _this.handleResize = handleResize;
          const { bg: bg, title: title } = _this.layers;
          function animateSet() {
            if ((title.shader.set("uTranslateIn", 0), Stage.width < 1280)) {
              const isMobile = Stage.width <= 390;
              (_this.ui.heading1.element.transform({ x: "25%" }),
                _this.ui.heading1.element.css({ opacity: 1 }),
                _this.ui.heading2.element.transform({
                  x: isMobile ? 0 : "-25%",
                }),
                _this.ui.heading2.element.css({ opacity: 1 }),
                _this.ui.heading3.element.transform({
                  x: isMobile ? "-25%" : 0,
                }),
                _this.ui.heading3.element.css({ opacity: 1 }),
                _this.ui.copyMobileHeading1.element.transform({ x: "50%" }),
                _this.ui.copyMobileHeading1.element.css({ opacity: 0 }),
                _this.ui.copyMobileHeading2.element.transform({ x: "-50%" }),
                _this.ui.copyMobileHeading2.element.css({ opacity: 0 }));
            } else
              (_this.ui.heading1.element.transform({ x: "50%" }),
                _this.ui.heading1.element.css({ opacity: 1 }),
                _this.ui.heading2.element.transform({ x: 0 }),
                _this.ui.heading2.element.css({ opacity: 1 }),
                _this.ui.heading3.element.transform({ x: "-50%" }),
                _this.ui.heading3.element.css({ opacity: 1 }),
                _this.ui.copyheading1.element.transform({ x: "23vw" }),
                _this.ui.copyheading1.element.css({ opacity: 0 }),
                _this.ui.copyheading2.element.transform({ x: "-23vw" }),
                _this.ui.copyheading2.element.css({ opacity: 0 }),
                _this.ui.copyheading3.element.transform({ x: "23vw" }),
                _this.ui.copyheading3.element.css({ opacity: 0 }),
                _this.ui.copyheading4.element.transform({ x: "-23vw" }),
                _this.ui.copyheading4.element.css({ opacity: 0 }));
            (_this.ui.copy.element.css({ opacity: 0 }),
              _this.ui.rowHeading.css({ opacity: 0 }));
          }
          function animateIn() {
            (title.shader.tween("uTranslateIn", 1, 2e3, "linear"),
              _this.ui.rowHeading.tween(
                { opacity: 1 },
                600,
                "easeInOutCubic",
                600,
              ),
              _this.ui.heading1.element.tween(
                { x: 0 },
                1200,
                "easeInOutCubic",
                600,
              ),
              _this.ui.heading2.element.tween(
                { x: 0 },
                1200,
                "easeInOutCubic",
                600,
              ),
              _this.ui.heading3.element.tween(
                { x: 0 },
                1200,
                "easeInOutCubic",
                600,
              ),
              _this.ui.copyheading1.element.tween(
                { x: 0, opacity: 1 },
                1200,
                "easeInOutCubic",
                200,
              ),
              _this.ui.copyheading2.element.tween(
                { x: 0, opacity: 1 },
                1200,
                "easeInOutCubic",
                200,
              ),
              _this.ui.copyheading3.element.tween(
                { x: 0, opacity: 1 },
                1200,
                "easeInOutCubic",
                200,
              ),
              _this.ui.copyheading4.element.tween(
                { x: 0, opacity: 1 },
                1200,
                "easeInOutCubic",
                200,
              ),
              _this.ui.copy.element.tween(
                { opacity: 1 },
                1200,
                "easeInOutCubic",
                Stage.width < 1280 ? 200 : 400,
              ),
              _this.ui.copyMobileHeading1.element.tween(
                { x: 0, opacity: 1 },
                1200,
                "easeInOutCubic",
                200,
              ),
              _this.ui.copyMobileHeading2.element.tween(
                { x: 0, opacity: 1 },
                1200,
                "easeInOutCubic",
                200,
              ));
          }
          function handleResize() {
            const dist = _camera.camera.position.length(),
              glBoundsTr = _this.domToWebGL({
                element: _this.ui.glBounds.div,
                camera: _camera.camera,
                offsetY: _this.parent.lerpedScrollY
                  ? _this.worldBottomPx +
                    _this.parent.lerpedScrollY -
                    ((1 - _this.baseHeight) / 2) * Stage.height
                  : 0,
                dist: _camera.camera.position.z,
              });
            (title.position.set(
              glBoundsTr.position.x,
              glBoundsTr.position.y,
              0,
            ),
              title.scale.setScalar(0.33 * glBoundsTr.scale.x),
              (_this.screenHeight = Utils3D.getHeightFromCamera(
                _camera.camera,
                dist,
              )),
              (_this.screenWidth = _this.screenHeight * _camera.camera.aspect),
              bg.scale.set(
                3 * _this.screenWidth,
                _this.screenHeight * _this.baseHeight,
                1,
              ),
              _this.set("TasteScene/y", _this.worldBottom),
              _this.set("TasteScene/yPixel", _this.worldBottomPx));
          }
          ((title.shader.uniforms.uWhiteBits.value = 1),
            (title.shader.uniforms.uRowCount.value = 2),
            _this.isPlayground()
              ? ((_camera = Story.createCamera(!1)), (Global.CAMERA = _camera))
              : (await _this.wait(() => !!Global.CAMERA),
                (_camera = Global.CAMERA)),
            (title.renderOrder = -1e3),
            title.shader.set("uFixed", 1),
            animateSet(),
            (_this.onInView = () => {
              (animateSet(), animateIn());
            }),
            (_this.onViewOut = () => {}),
            _this.isPlayground() &&
              (_camera.lock(),
              await _this.wait(
                () => _this.ui.glBounds.div.getBoundingClientRect().width > 0,
              ),
              handleResize(),
              _this.onInView(),
              setInterval(() => {
                (animateSet(),
                  _this.wait(200).then(() => {
                    animateIn();
                  }));
              }, 2500),
              _this.onResize(handleResize, !1)));
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
          "TasteScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }