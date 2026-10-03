function Header(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, GLUIElement),
      Inherit(_this, XComponent),
      (_this.fragName = "Header"),
      (_this.contexts = "GLUIElement"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          _type: "UI",
          refName: "ui",
          children: [
            { bg: "#000000", _type: "glObject", refName: "logo", children: [] },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      const fileName = Device.mobile ? "logo_mobile.png" : "logo.png";
      function onResize() {
        const margin = Math.range(Stage.width, 393, 1600, 20, 24, !0);
        let logoAspect = 286 / 120;
        (Device.mobile && (logoAspect = 1.4),
          (_this.logo.x = margin),
          (_this.logo.y = Math.range(Stage.height, 393, 1600, 20, 18, !0)),
          (_this.logo.height = Math.range(Stage.width, 393, 1600, 40, 60, !0)),
          (_this.logo.width = _this.logo.height * logoAspect));
      }
      (Config.NO_UI && (_this.logo.group.visible = !1),
        (_this.logoShader = _this.createFragment(Shader, "LogoShader", {
          tLogo: { value: Utils3D.getTexture(`assets/images/${fileName}`) },
          tNoise: {
            value: Utils3D.getRepeatTexture(
              "assets/images/story/clouds_noise.png",
            ),
          },
          tLines: {
            value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
          },
          tScene: { value: null },
          uShow: { value: 0 },
          uColor: { value: new Color("#121212") },
          uColor2: { value: new Color("#ffffff") },
          uColor3: { value: new Color("#C82924") },
          depthTest: !1,
          depthWrite: !1,
          transparent: !0,
        })),
        Tests.useFluid() && MouseFluid.instance().applyTo(_this.logoShader),
        (_this.onInit = async function () {
          (_this.ui.setZ(999999),
            await _this.logo.ready,
            _this.logoShader.set("tScene", World.NUKE.prevFrameRT),
            _this.logo.useShader(_this.logoShader),
            _this.logo.setZ(999999),
            _this.listen("Global/loaderFinished", () =>
              _this.logoShader.tween("uShow", 1, 3e3, "easeOutSine", 3e3),
            ),
            _this.listen("Footer/inView", () =>
              _this.logoShader.tween("uShow", 0, 500, "easeOutSine"),
            ),
            _this.listen("Footer/outView", () =>
              _this.logoShader.tween("uShow", 1, 500, "easeOutSine"),
            ),
            _this.logo.interact(
              (_) => {},
              () => Story.scrollToTop(),
            ),
            _this.onResize(onResize),
            GLUI.Stage.add(_this.ui));
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
          "Header" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }