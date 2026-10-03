function TargetScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "TargetScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "TargetScene"),
      (_this.contexts = "BaseView, 'TargetScene'"),
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
      function handleResize() {
        const isMobile = Stage.width / Stage.height < 1;
        ((_this.state.text1PadX = isMobile ? 0.03 : -1),
          (_this.state.text1PadY = isMobile ? -0.9 : -0.5),
          (_this.state.text1HorizontalAlign = isMobile ? "left" : "center"),
          (_this.state.text1VerticalAlign = "center"),
          (_this.border.shader.uniforms.uScreenHeightWorld.value =
            _this.getSync("Story/screenHeightWorld")),
          (_this.border.shader.uniforms.uSceneHeightWorld.value =
            _this.heightWorld),
          (_this.border.geometry.boundingSphere.radius = _this.heightWorld),
          (_this.layers.character.shader.uniforms.uCutout.value = Math.range(
            Stage.width / Stage.height,
            0.591,
            2,
            0.18,
            0.5,
          )),
          (_this.layers.portal.shader.uniforms.uCutout.value =
            _this.layers.character.shader.uniforms.uCutout.value),
          _this.rootGroup.scale.setScalar(isMobile ? 0.6 : 1),
          _this.box1.handleResize());
      }
      ((_this.state.text1PadX = -1),
        (_this.state.text1PadY = -0.5),
        (_this.state.text1OffsetZ = 0.45),
        (_this.state.text1HorizontalAlign = "center"),
        (_this.state.text1VerticalAlign = "center"),
        (_this.state.text1Body = "taking a deep breath, he steps in."),
        (_this.state.text1Width = 440),
        (_this.init = async () => {
          (await _this.wait(() => _this.box1.flag("isReady")),
            _this.box1.animateSet());
          const {
            border: border,
            structure: structure,
            floor: floor,
            character: character,
          } = _this.layers;
          ((_this.border = border),
            (_this.rootGroup = new Group()),
            _this.rootGroup.add(floor),
            _this.rootGroup.add(structure),
            _this.rootGroup.add(character),
            _this.add(_this.rootGroup));
          ([structure].forEach((layer) => {
            const shader = _this.initClass(
              Shader,
              "StaticObjectBaseShaderInverse",
              { uLineWidth: { value: 0.005 } },
            );
            ((shader.uniforms.uDiscardTop = layer.shader.uniforms.uDiscardTop),
              (shader.uniforms.uDiscardBottom =
                layer.shader.uniforms.uDiscardBottom),
              (shader.side = Shader.BACK_SIDE));
            const mesh = new Mesh(layer.geometry, shader);
            (mesh.position.copy(layer.position),
              mesh.rotation.copy(layer.rotation),
              mesh.scale.copy(layer.scale),
              (mesh.renderOrder = layer.renderOrder + 1),
              (layer.inverseMesh = mesh),
              _this.rootGroup.add(mesh),
              mesh.upload());
          }),
            (_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.geometry = _this.border.geometry.clone()),
            _this.startRender(() => {
              _this.border.shader.uniforms.uProgress.value =
                _this.scrollProgress || 1;
            }),
            _this.isPlayground() && _this.onResize(handleResize));
        }),
        (_this.handleResize = handleResize),
        (_this.animateIn = () => {}),
        (onInit = _this.onInit === onInit ? null : _this.onInit));
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_this.box1 = _this.initClass(
          TextBox,
          (function () {
            let params = AppState.createLocal({
              padx: _this.state.text1PadX,
              pady: _this.state.text1PadY,
              offsetZ: _this.state.text1OffsetZ,
              horizontalAlign: _this.state.text1HorizontalAlign,
              verticalAlign: _this.state.text1VerticalAlign,
              body: _this.state.text1Body,
              color: "black",
              width: _this.state.text1Width,
              id: 10,
              ontop: !0,
            });
            return (
              _this.bindState(_this.state, ["text1PadX"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["text1PadY"], (val) => {
                params.pady = val;
              }),
              _this.bindState(_this.state, ["text1OffsetZ"], (val) => {
                params.offsetZ = val;
              }),
              _this.bindState(_this.state, ["text1HorizontalAlign"], (val) => {
                params.horizontalAlign = val;
              }),
              _this.bindState(_this.state, ["text1VerticalAlign"], (val) => {
                params.verticalAlign = val;
              }),
              _this.bindState(_this.state, ["text1Body"], (val) => {
                params.body = val;
              }),
              _this.bindState(_this.state, ["text1Width"], (val) => {
                params.width = val;
              }),
              params
            );
          })(),
        )),
        _this.box1.isFragment &&
          _promises.push(_this.wait(_this.box1, "__ready")),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "TargetScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }