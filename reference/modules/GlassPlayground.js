function GlassPlayground(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params?.sceneLayoutName || "GlassPlayground"),
      Inherit(_this, XComponent),
      (_this.fragName = "GlassPlayground"),
      (_this.contexts =
        'Frag3D, _params?.sceneLayoutName || "GlassPlayground"'),
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
      ((_this.onInit = async () => {
        await _this.layout.getAllLayers();
        const { glass: glass, camera: camera } = _this.layers;
        (camera.lock(),
          (Renderer.CLEAR = [1, 0, 0, 0]),
          (_this.textrt = new RenderTarget(Stage.width, Stage.height, {
            generateMipmaps: !0,
            minFilter: Texture.LINEAR_MIPMAP,
            magFilter: Texture.LINEAR,
            format: Texture.RGBFormat,
          })),
          _this.textrt.upload(),
          _this.layers.glass2.shader.set("tRefraction", _this.textrt),
          _this.layers.liquid2.shader.set("tRefraction", _this.textrt),
          _this.startRender(() => {
            World.RENDERER.renderSingle(
              _this.layers.text,
              camera.camera,
              _this.textrt,
            );
          }, Render.BEFORE_RENDER));
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
          "GlassPlayground" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }