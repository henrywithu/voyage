function NearScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "NearScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "NearScene"),
      (_this.contexts = "BaseView, 'NearScene'"),
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
      function loop() {
        const scrollY = _this.getSync("Story/scrollY"),
          screenHeightWorld = _this.getSync("Story/screenHeightWorld");
        ((_this.windLines.shader.uniforms.uScroll.value = scrollY),
          (_this.windLines.shader.uniforms.uDiscardTop.value =
            (_this.worldTop + scrollY) / screenHeightWorld),
          (_this.windLines.shader.uniforms.uDiscardBottom.value =
            (_this.worldBottom + scrollY) / screenHeightWorld));
      }
      ((_this.state.text1PadX = 0.2),
        (_this.state.text1PadY = 4),
        (_this.state.text1OffsetZ = 0.45),
        (_this.state.text1HorizontalAlign = "left"),
        (_this.state.text1VerticalAlign = "bottom"),
        (_this.state.text1Body =
          "As he approaches the portal, the holy sound grows stronger, shaking him to the core. Light begins to pulsate, inviting him closer."),
        (_this.state.text1Width = 440),
        (_this.state.text2PadX = 0.2),
        (_this.state.text2PadY = 2.5),
        (_this.state.text2OffsetZ = 0.45),
        (_this.state.text2HorizontalAlign = "right"),
        (_this.state.text2VerticalAlign = "bottom"),
        (_this.state.text2Body =
          "A strong wind begins to blow, playful and expectant. Now standing before the portal, he raises a hand…"),
        (_this.state.text2Width = 440),
        (_this.state.framePadX = 0.7),
        (_this.state.framePadY = 2.1),
        (_this.state.frameHorizontalAlign = "left"),
        (_this.state.frameVerticalAlign = "bottom"),
        (_this.init = async () => {
          (await _this.wait(
            () => _this.box1.flag("isReady") && _this.box2.flag("isReady"),
          ),
            _this.box1.animateSet(),
            _this.box2.animateSet());
          const layers = await _this.layout.getAllLayers(),
            {
              border: border,
              structure: structure,
              character: character,
              portal: portal,
              shadow: shadow,
              newfloor: newfloor,
            } = layers;
          ((_this.sceneRoot = new Group()),
            _this.sceneRoot.add(layers.structure_shadow1),
            _this.sceneRoot.add(layers.structure_shadow1),
            _this.sceneRoot.add(layers.portal),
            _this.sceneRoot.add(layers.structure),
            _this.sceneRoot.add(layers.background),
            _this.sceneRoot.add(layers.character),
            _this.sceneRoot.add(layers.newfloor),
            _this.sceneRoot.add(layers.shadow),
            _this.add(_this.sceneRoot),
            "NearScene" === Global.PLAYGROUND && (border.visible = !1),
            (_this.border = border),
            (_this.layerGroup = new Group()));
          [structure, portal, character, shadow, newfloor].forEach((layer) => {
            _this.layerGroup.add(layer);
          });
          [structure].forEach((layer) => {
            const shader = _this.initClass(
              Shader,
              "StaticObjectBaseShaderInverse",
              { uLineWidth: { value: 0.002 } },
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
              mesh.upload(),
              _this.layerGroup.add(mesh));
          });
          const shader = _this.initClass(
            Shader,
            "StaticCharacterBaseShaderInverse",
            {
              uLineWidth: { value: 0.02 },
              uWindAxisAngle: {
                value: new Vector4().copy(
                  character.shader.uniforms.uWindAxisAngle.value,
                ),
              },
              uWindParams: {
                value: new Vector3().copy(
                  character.shader.uniforms.uWindParams.value,
                ),
              },
            },
          );
          ((shader.side = Shader.BACK_SIDE),
            character.shader.copyUniformsTo(shader));
          const mesh = new Mesh(character.geometry, shader);
          (mesh.position.copy(character.position),
            mesh.rotation.copy(character.rotation),
            mesh.scale.copy(character.scale),
            (mesh.renderOrder = character.renderOrder + 1),
            (character.inverseMesh = mesh),
            _this.layerGroup.add(mesh),
            mesh.upload(),
            _this.sceneRoot.add(_this.layerGroup));
          const windLines = _this.initClass(
            WindLines,
            "assets/geometry/story/profile/outward-curves.json",
          );
          (await windLines.wait("isReady"),
            (_this.windLines = windLines.mesh),
            (_this.windLines.position.z = -9),
            _this.windLines.scale.set(2.5, 2.5, 11),
            (_this.windLines.frustumCulled = !1),
            (_this.windLines.shader.uniforms.uThreshold.value = 0.78),
            (_this.windLines.shader.uniforms.uSpeed.value = 1),
            (_this.windLines.renderOrder = 5),
            _this.sceneRoot.add(_this.windLines),
            (_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.geometry = _this.border.geometry.clone()),
            (_this.border.geometry.boundingSphere.radius = _this.heightWorld),
            _this.startRender(loop));
        }),
        (_this.handleResize = function handleResize() {
          const isMobile = Stage.width / Stage.height < 1;
          if (
            ((_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.shader.uniforms.uPadX.value = isMobile ? 0.1 : 0.15),
            (_this.border.shader.uniforms.uPadY.value = 0.2),
            (_this.border.shader.uniforms.uPadTop.value = isMobile ? 0.25 : 0),
            (_this.border.shader.uniforms.uSkewCorrection.value = isMobile
              ? -0.05
              : -0.45),
            _this.layerGroup)
          ) {
            const groupScale = isMobile ? 0.55 : 1;
            (_this.layerGroup.scale.setScalar(groupScale),
              (_this.layerGroup.position.y = isMobile ? -1.6 : 0));
          }
          ((_this.state.text1PadY = isMobile ? 0.6 : 4),
            (_this.state.text1PadX = isMobile ? 0 : 0.2),
            (_this.state.text1Width = isMobile ? 0.75 * Stage.width : 440),
            (_this.state.text1VerticalAlign = isMobile ? "top" : "bottom"),
            (_this.state.text1HorizontalAlign = isMobile ? "center" : "left"),
            (_this.state.text2PadX = isMobile ? 0.03 : 0.2),
            (_this.state.text2PadY = isMobile ? 0.4 : 2.5),
            (_this.state.text2Width = isMobile ? 0.6 * Stage.width : 440),
            (_this.state.text2HorizontalAlign = isMobile ? "left" : "right"),
            (_this.state.text2VerticalAlign = "bottom"),
            (_this.state.framePadY = isMobile ? 0.3 : 2.1),
            (_this.state.framePadX = isMobile ? 0.05 : 0.7),
            (_this.sceneRoot.rotation.x = isMobile ? -0.05 : 0),
            (_this.sceneRoot.position.y = isMobile ? 1.2 : 0),
            (_this.sceneRoot.position.z = isMobile ? -3.5 : 0),
            _this.box2.handleResize(),
            _this.box1.handleResize());
        }),
        (_this.animateIn = () => {
          _this.border?.shader?.tween?.("uTransition", 1, 800, "easeOutCubic");
        }),
        (_this.animateOut = () => {}),
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
              id: 7,
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
        (_this.box2 = _this.initClass(
          TextBox,
          (function () {
            let params = AppState.createLocal({
              padx: _this.state.text2PadX,
              pady: _this.state.text2PadY,
              offsetZ: _this.state.text2OffsetZ,
              horizontalAlign: _this.state.text2HorizontalAlign,
              verticalAlign: _this.state.text2VerticalAlign,
              body: _this.state.text2Body,
              color: "black",
              width: _this.state.text2Width,
              id: 8,
            });
            return (
              _this.bindState(_this.state, ["text2PadX"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["text2PadY"], (val) => {
                params.pady = val;
              }),
              _this.bindState(_this.state, ["text2OffsetZ"], (val) => {
                params.offsetZ = val;
              }),
              _this.bindState(_this.state, ["text2HorizontalAlign"], (val) => {
                params.horizontalAlign = val;
              }),
              _this.bindState(_this.state, ["text2VerticalAlign"], (val) => {
                params.verticalAlign = val;
              }),
              _this.bindState(_this.state, ["text2Body"], (val) => {
                params.body = val;
              }),
              _this.bindState(_this.state, ["text2Width"], (val) => {
                params.width = val;
              }),
              params
            );
          })(),
        )),
        _this.box2.isFragment &&
          _promises.push(_this.wait(_this.box2, "__ready")),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "NearScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }