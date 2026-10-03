function ProfileScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "ProfileScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "ProfileScene"),
      (_this.contexts = "BaseView, 'ProfileScene'"),
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
      ((_this.state.text1padx = -1.15),
        (_this.state.text1pady = 0.5),
        (_this.state.text1horizontalAlign = "center"),
        (_this.state.text1verticalAlign = "center"),
        (_this.state.text1body =
          "The saint finally catches a glimpse of what he was seeking since he went on his pilgrimage."),
        (_this.state.text1Width = 350),
        (_this.state.text2padx = 1.15),
        (_this.state.text2pady = -0.5),
        (_this.state.text2horizontalAlign = "center"),
        (_this.state.text2verticalAlign = "center"),
        (_this.state.text2body =
          "At the sight of it, he stands taller, gaze fixated, and determination burning within."),
        (_this.state.text2Width = 350),
        (_this.init = async () => {
          (await _this.wait(
            () => _this.box1.flag("isReady") && _this.box2.flag("isReady"),
          ),
            _this.box1.animateSet(),
            _this.box2.animateSet());
          const layers = await _this.layout.getAllLayers(),
            { border: border } = layers;
          ((_this.border = border),
            (_this.characterGroup = new Group()),
            _this.characterGroup.scale.setScalar(3.6),
            (_this.characterGroup.rotation.y = 0.5 * -Math.PI + 0.1),
            (_this.characterGroup.rotation.z = -0.2),
            (_this.characterGroup.position.x = 0.25),
            (_this.characterGroup.position.y = -0.35),
            (_this.characterGroup.position.z = -1.05),
            _this.add(_this.characterGroup));
          const geometry = await GeomThread.loadGeometry(
              "assets/geometry/story/wander/saint-pose-3.bin",
            ),
            shader = _this.initClass(Shader, "StaticCharacterBaseShader", {
              tAtlas: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/tex_atlas.png",
                ),
              },
              tTrim: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/tex_trim-2.png",
                ),
              },
              tLines: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/lines.jpg",
                ),
              },
              tNoise: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/perlin.png",
                ),
              },
              uLinesTile: { value: 5.5 },
              uLightDir: { value: new Vector3(0, 0.5, 2).normalize() },
              uLinesAxis: { value: new Vector3(1, 0, 0.3).normalize() },
              uLinesAngle: { value: -0.4 },
              uThreshold: { value: new Vector2(0.4, 1.8) },
              uBreathe: { value: new Vector3(-0.2, 0.3, 1) },
              uWindAxisAngle: { value: new Vector4(0, 1, 0, 0) },
              uWindParams: { value: new Vector3(0, 1, 1) },
              uColor: { value: new Color("#b39b70") },
              uBend: { value: -0.4 },
            });
          ((_this.character = new Mesh(geometry, shader)),
            _this.character.upload());
          const inverseShader = _this.initClass(
            Shader,
            "StaticCharacterBaseShaderInverse",
            {
              tTrim: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/tex_trim-2.png",
                ),
              },
              uLineWidth: { value: 0.0025 },
              uWindAxisAngle: { value: new Vector4(0, 1, 0, 0) },
              uWindParams: { value: new Vector3(0, 1, 1) },
              uBreathe: { value: shader.uniforms.uBreathe.value },
            },
          );
          (inverseShader.set(
            "tTrim",
            Utils3D.getRepeatTexture("assets/images/story/tex_trim-2.png"),
          ),
            (inverseShader.side = Shader.BACK_SIDE),
            (_this.characterInverse = new Mesh(geometry, inverseShader)),
            (_this.characterInverse.renderOrder =
              _this.character.renderOrder + 1),
            _this.characterInverse.upload());
          const hairGeometry = await GeomThread.loadGeometry(
              "assets/geometry/story/wander/saint-pose-3-hair.bin",
            ),
            hairShader = _this.initClass(Shader, "HairShader", {
              tAtlas: {
                value: Utils3D.getTexture("assets/images/story/hair_card.png"),
              },
              tLines: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/lines.jpg",
                ),
              },
              uLinesTile: { value: 3.5 },
              uLightDir: { value: new Vector3(0, 0.75, 3).normalize() },
              uBreathe: { value: shader.uniforms.uBreathe.value },
            });
          ((_this.hair = new Mesh(hairGeometry, hairShader)),
            _this.hair.upload(),
            _this.characterGroup.add(_this.hair),
            _this.characterGroup.add(_this.character),
            _this.characterGroup.add(_this.characterInverse),
            (inverseShader.uniforms.uWindAxisAngle =
              shader.uniforms.uWindAxisAngle),
            (inverseShader.uniforms.uWindParams = shader.uniforms.uWindParams),
            (inverseShader.uniforms.uBreathe = shader.uniforms.uBreathe),
            (inverseShader.uniforms.uBend = shader.uniforms.uBend),
            (hairShader.uniforms.uWindAxisAngle =
              shader.uniforms.uWindAxisAngle),
            (hairShader.uniforms.uWindParams = shader.uniforms.uWindParams),
            (hairShader.uniforms.uBreathe = shader.uniforms.uBreathe),
            (hairShader.uniforms.uBend = shader.uniforms.uBend));
          const windLines = _this.initClass(
            WindLines,
            "assets/geometry/story/profile/outward-curves.json",
          );
          (await windLines.wait("isReady"),
            (_this.windLines = windLines.mesh),
            (_this.windLines.frustumCulled = !1),
            (_this.windLines.shader.uniforms.uThreshold.value = 0.78),
            (_this.windLines.shader.uniforms.uSpeed.value = 1),
            _this.add(_this.windLines),
            (border.shader.uniforms.uScreenHeightWorld.value = _this.getSync(
              "Story/screenHeightWorld",
            )),
            (border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (border.geometry = border.geometry.clone()),
            (border.geometry.boundingSphere.radius = _this.heightWorld),
            _this.group.updateMatrixWorld(!0),
            (_this.characterGroup.matrixAutoUpdate = !1),
            (_this.character.matrixAutoUpdate = !1),
            (_this.characterInverse.matrixAutoUpdate = !1),
            (_this.hair.matrixAutoUpdate = !1),
            (function animateSet() {
              _this.border.shader.set("uTransition", 0);
            })(),
            _this.startRender(loop));
        }),
        (_this.handleResize = function handleResize() {
          const isMobile = Stage.width / Stage.height < 1 || Stage.width < 1200;
          ((_this.border.shader.uniforms.uScreenHeightWorld.value =
            _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.shader.uniforms.uPadX.value = isMobile ? 0.1 : 0.75),
            (_this.border.shader.uniforms.uPadY.value = 0.375),
            (_this.border.shader.uniforms.uSkewCorrection.value = 0.085),
            (_this.border.shader.uniforms.uDepthSkew.value = 0.75),
            (_this.border.shader.uniforms.uFixedWidth.value = isMobile ? 0 : 1),
            (_this.state.text1padx = isMobile ? 0.03 : -1.1),
            (_this.state.text1pady = isMobile ? -0.1 : 0.5),
            (_this.state.text1Width = isMobile ? 0.63 * Stage.width : 350),
            (_this.state.text1horizontalAlign = isMobile ? "right" : "center"),
            (_this.state.text2padx = isMobile ? 0.03 : 1.1),
            (_this.state.text2pady = isMobile ? -1 : -0.5),
            (_this.state.text2Width = isMobile ? 0.5 * Stage.width : 350),
            (_this.state.text2horizontalAlign = isMobile ? "left" : "center"),
            _this.box1.handleResize(),
            _this.box2.handleResize());
        }),
        (_this.animateIn = () => {
          (_this.border.shader.tween("uTransition", 1, 800, "easeOutCubic"),
            _this.character.shader.tween("uBend", 0, 2500, "easeOutQuint"));
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
              padx: _this.state.text1padx,
              pady: _this.state.text1pady,
              offsetZ: 0.45,
              horizontalAlign: _this.state.text1horizontalAlign,
              verticalAlign: _this.state.text1verticalAlign,
              body: _this.state.text1body,
              color: "black",
              width: _this.state.text1Width,
              id: 3,
            });
            return (
              _this.bindState(_this.state, ["text1padx"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["text1pady"], (val) => {
                params.pady = val;
              }),
              _this.bindState(_this.state, ["text1horizontalAlign"], (val) => {
                params.horizontalAlign = val;
              }),
              _this.bindState(_this.state, ["text1verticalAlign"], (val) => {
                params.verticalAlign = val;
              }),
              _this.bindState(_this.state, ["text1body"], (val) => {
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
              padx: _this.state.text2padx,
              pady: _this.state.text2pady,
              offsetZ: 0.45,
              horizontalAlign: _this.state.text2horizontalAlign,
              verticalAlign: _this.state.text2verticalAlign,
              body: _this.state.text2body,
              color: "black",
              width: _this.state.text2Width,
              id: 4,
            });
            return (
              _this.bindState(_this.state, ["text2padx"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["text2pady"], (val) => {
                params.pady = val;
              }),
              _this.bindState(_this.state, ["text2horizontalAlign"], (val) => {
                params.horizontalAlign = val;
              }),
              _this.bindState(_this.state, ["text2verticalAlign"], (val) => {
                params.verticalAlign = val;
              }),
              _this.bindState(_this.state, ["text2body"], (val) => {
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
          "ProfileScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }