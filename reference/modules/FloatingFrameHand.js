function FloatingFrameHand(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Object3D),
      Inherit(_this, XComponent),
      (_this.fragName = "FloatingFrameHand"),
      (_this.contexts = "Object3D"),
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
      ((_this.params.padx = _this.params.padx || 0.3),
        (_this.params.pady = _this.params.pady || 0.3));
      const _shader = _this.initClass(Shader, "FloatingFrameHandShader", {
        tMap: { value: null },
        tNoise: {
          value: Utils3D.getRepeatTexture("assets/images/story/perlin.png"),
        },
        uBorderWidth: { value: 0.013 },
        uDPR: { value: Tests.getDPR() },
        uAspectRatio: { value: 1 },
      });
      _shader.transparent = !0;
      const _geometry = new PlaneGeometry(1, 1),
        _mesh = new Mesh(_geometry, _shader);
      ((_mesh.renderOrder = 1e3),
        _mesh.upload(),
        (_this.mesh = _mesh),
        _this.add(_mesh),
        Global.PLAYGROUND &&
          ((_mesh.position.x = -1),
          (_mesh.position.y = -1),
          _mesh.scale.setScalar(_this.params.frameScale),
          Stage.width > Stage.height
            ? (_mesh.scale.y =
                _this.params.frameScale * (Stage.width / Stage.height))
            : (_mesh.scale.x =
                _this.params.frameScale * (Stage.width / Stage.height))),
        (_this.handleResize = () => {
          const screenHeightWorld =
              _this.getSync("Story/screenHeightWorld") || 1,
            screenWidthWorld = _this.getSync("Story/screenWidthWorld") || 1,
            heightWorld = _this.parent.heightWorld;
          let frameHeight = _this.params.frameScale,
            frameWidth = _this.params.frameScale;
          Stage.width > Stage.height
            ? (frameHeight =
                _this.params.frameScale * (Stage.height / Stage.width))
            : (frameWidth =
                _this.params.frameScale * (Stage.width / Stage.height));
          const y =
              heightWorld / 2 -
              frameHeight / 2 -
              screenHeightWorld +
              frameHeight +
              _this.params.pady,
            x = -screenWidthWorld / 2 + frameWidth / 2 + _this.params.padx;
          (_mesh.scale.set(frameWidth, frameHeight, 1),
            _this.group.position.set(x, y, 0.5),
            (_shader.uniforms.uAspectRatio.value = frameWidth / frameHeight));
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
          "FloatingFrameHand" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }