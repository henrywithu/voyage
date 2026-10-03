function RetailScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "RetailScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "RetailScene"),
      (_this.contexts = "BaseView, 'RetailScene'"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.screenHeight = 1), (_this.screenWidth = 1));
      const _stage = new GLUIStage();
      ((_this.init = async () => {
        const scrollContainer = _this.gl(0, 0);
        (GLUI.Stage.add(scrollContainer),
          (_this.bgGL = _this.gl(Stage.width, 100, "#FFFFFF")));
        const bgShader = _this.createFragment(
          Shader,
          "RetailBackgroundShader",
          {
            uColor: { value: new Color("#FFFFFF") },
            tNoise: {
              value: Utils3D.getRepeatTexture(
                "assets/images/story/clouds_noise.png",
              ),
              ignoreUIL: !0,
            },
          },
        );
        function animateSet() {
          (_this.ui.viewState.views.forEach((view) => view.animateSet()),
            _this.ui.headerDecor.css({ opacity: 0 }),
            _this.ui.heading1.element.transform({ x: "10vw" }),
            _this.ui.heading3.element.transform({ x: "-10vw" }),
            _this.ui.heading1mob.element.transform({ x: "10vw" }),
            _this.ui.heading3mob.element.transform({ x: "-10vw" }),
            _this.ui.lineTop.css({ opacity: 0, width: 0 }),
            _this.ui.lineBottom.css({ opacity: 0, width: 0 }));
        }
        function handleResize() {
          ((_this.bgGL.width = Stage.width),
            (_this.bgGL.height = _this.ui.element.div.clientHeight + 40));
        }
        (Tests.useFluid() &&
          !Device.mobile &&
          MouseFluid.instance().applyTo(bgShader),
          _this.bgGL.useShader(bgShader),
          _stage.add(_this.bgGL),
          _this.bgGL.setZ(1),
          (World.NUKE.onBeforePasses = (rttBuffer) => {
            GLUI.Stage.renderToRT(_stage.scene, rttBuffer);
          }),
          _this.set("RetailScene/bgGL", _this.bgGL),
          _this.set("RetailScene/ui", _this.ui),
          _this.startRender(() => {
            scrollContainer.y = _this.ui.element.y || 0;
          }, RenderManager.BEFORE_RENDER),
          await _this.wait(
            () =>
              _this.ui.viewState?.views?.length === _this.ui.retailers.length,
          ),
          animateSet(),
          (_this.onInView = () => {
            (animateSet(),
              (function animateIn() {
                (GoogleAnalytics.track("retail_item_view"),
                  _this.ui.headerDecor.tween(
                    { opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                  ),
                  _this.ui.heading1.element.tween(
                    { x: 0, opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                    200,
                  ),
                  _this.ui.heading3.element.tween(
                    { x: 0, opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                    200,
                  ),
                  _this.ui.heading1mob.element.tween(
                    { x: 0, opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                    200,
                  ),
                  _this.ui.heading3mob.element.tween(
                    { x: 0, opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                    200,
                  ),
                  _this.ui.heading2.element.tween(
                    { opacity: 1 },
                    1e3,
                    "easeInOutCubic",
                    200,
                  ),
                  _this.ui.lineTop.tween(
                    { opacity: 1, width: "100%" },
                    1e3,
                    "easeInOutCubic",
                    200,
                  ),
                  _this.ui.viewState.views.forEach((view, index) =>
                    view.animateIn(200 + 50 * index),
                  ),
                  _this.ui.lineBottom.tween(
                    { opacity: 1, width: "100%" },
                    1e3,
                    "easeInOutCubic",
                    200 + 50 * _this.ui.viewState.views.length,
                  ));
              })());
          }),
          (_this.onViewOut = () => {}),
          _this.isPlayground() && (handleResize(), _this.onInView()),
          (_this.handleResize = handleResize));
      }),
        (_this.afterScroll = (scrollY) => {
          _this.bgGL.y = _this.ui.element.div.getBoundingClientRect().y - 20;
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
          "RetailScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }