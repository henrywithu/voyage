function Products(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, FragFXScene, _params?.sceneLayoutName || "Products"),
      Inherit(_this, XComponent),
      (_this.fragName = "Products"),
      (_this.contexts = 'FragFXScene, _params?.sceneLayoutName || "Products"'),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this._initFXScene(World.NUKE, null, {
          format: void 0,
          type: void 0,
          minFilter: void 0,
          magFilter: void 0,
          multiRenderTarget: void 0,
          mipmaps: void 0,
          screenQuad: void 0,
          vrMode: void 0,
          multisample: void 0,
          samplesAmount: void 0,
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.onInit = function () {
        ((_this.clearColor = "#C82824"),
          _this.useCamera(_this.layers.camera.camera),
          (_this.textrt = new RenderTarget(Stage.width, Stage.height, {
            generateMipmaps: !0,
            minFilter: Texture.LINEAR_MIPMAP,
            magFilter: Texture.LINEAR,
            format: Texture.RGBFormat,
          })),
          (_this.textrt.texture.generateMipmaps = !0),
          _this.textrt.upload(),
          _this.layers.bottle.shader.set("tText", _this.textrt),
          _this.startRender(() => {
            World.RENDERER.renderSingle(
              _this.layers.text,
              _this.nuke.camera,
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
          "Products" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }