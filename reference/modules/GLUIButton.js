function GLUIButton(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, GLUIElement),
      Inherit(_this, XComponent),
      (_this.fragName = "GLUIButton"),
      (_this.contexts = "GLUIElement"),
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
      ((_this.params = _this.params ?? {}),
        (_this.params.fontSize = _this.params.fontSize ?? 16),
        (_this.params.text = _this.params.text ?? "Cursor"));
      const text = new GLUIText(
        _this.params.text.toUpperCase(),
        "PPNikkeiMaru-Ultrabold",
        _this.params.fontSize,
        {
          color: new Color("#ffffff"),
          width: 100,
          align: "center",
          lineHeight: 0.8,
        },
      );
      text.setZ(1);
      const bg = _this.gl(96, 48),
        bgShader = _this.createFragment(Shader, "GLUIButtonShader", {
          uColor: { value: new Color("#1d1d1d") },
          uBorder: { value: new Color("#ffffff") },
          alpha: { value: 1 },
          uAspectRatio: { value: 2 },
          uDimensions: { value: new Vector2(96, 48) },
          tNoise: {
            value: Utils3D.getRepeatTexture(
              "assets/images/story/clouds_noise.png",
            ),
            ignoreUIL: !0,
          },
          uHover: { value: 0 },
          transparent: !0,
          depthTest: !1,
          depthWrite: !1,
        });
      (bg.useShader(bgShader), (bg.scale = 1.1));
      const transform = _this.gl();
      (transform.add(bg),
        (transform.x = -bg.width / 2),
        (transform.y = -bg.height / 2),
        transform.add(text),
        (text.x = bg.width / 2),
        (text.y = bg.height / 2),
        _this.element.add(transform),
        (_this.element.x = Stage.width / 2),
        (_this.element.y = Stage.height / 2),
        text.loaded().then(() => {
          ((text.x = bg.width / 2),
            (text.y = bg.height / 2 - text.dimensions.height / 2));
        }),
        (_this.width = bg.width),
        (_this.height = bg.height),
        (_this.hover = (e) => {
          const isOver = "over" === e.action;
          bgShader.tween("uHover", isOver ? 1 : 0, 600, "easeOutCubic");
        }),
        (_this.animateSet = () => {
          ((text.alpha = 0), bgShader.set("alpha", 0));
        }),
        (_this.animateIn = () => {
          (text.tween({ alpha: 1 }, 1e3, "easeInOutCubic"),
            bgShader.tween("alpha", 1, 1e3, "easeInOutCubic"));
        }),
        (_this.animateOut = () => {
          (text.tween({ alpha: 0 }, 1e3, "easeInOutCubic"),
            bgShader.tween("alpha", 0, 1e3, "easeInOutCubic"));
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
          "GLUIButton" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }