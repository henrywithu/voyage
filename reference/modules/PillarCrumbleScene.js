function PillarCrumbleScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "PillarCrumbleScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "PillarCrumbleScene"),
      (_this.contexts = "BaseView, 'PillarCrumbleScene'"),
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
      ((_this.state.text1padx = 0.4),
        (_this.state.text1pady = 1.1),
        (_this.state.text1horizontalAlign = "left"),
        (_this.state.text1verticalAlign = "top"),
        (_this.state.text1body =
          "THE saint GENTLY FLOATS BACK TO THE FLOOR, ONE FOOT AFTER THE OTHER. HIS ROBE, NOW SATURATED WITH THE COLOR OF THE MYSTERIOUS LIQUID."),
        (_this.state.text1Width = 500),
        (_this.state.text2padx = 1),
        (_this.state.text2pady = -1),
        (_this.state.text2horizontalAlign = "center"),
        (_this.state.text2verticalAlign = "center"),
        (_this.state.text2body =
          "The sudden roar of shattering stone fills the air. The columns and roof begin to break apart and lift away, revealing a deep red sky."),
        (_this.state.text2Width = 500),
        (_this.state.frame1horizontalAlign = "left"),
        (_this.state.frame1verticalAlign = "bottom"),
        (_this.state.needsToPlayTransition = null),
        (_this.floatingFrameShader = _this.initClass(
          Shader,
          "FloatingFramePillarShader",
          {
            uPoint1: { value: new Vector3() },
            uPoint2: { value: new Vector3() },
            uPoint3: { value: new Vector3() },
            uPoint4: { value: new Vector3() },
            uCenter: { value: new Vector3() },
            uDPR: { value: Tests.getDPR() },
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
              value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
            },
            tNoise: {
              value: Utils3D.getRepeatTexture("assets/images/story/perlin.png"),
            },
            uLinesTile: { value: 4.5 },
            uLightDir: { value: new Vector3(0.1, 1, 0) },
            uColor1: { value: new Color("#be261e") },
            uColor2: { value: new Color("#63C4F4") },
            uColor3: { value: new Color("#3c3c3c") },
            uTransition: { value: 0 },
            uHover: { value: 0 },
          },
        )),
        (_this.init = async () => {
          (await _this.wait(
            () => _this.box1.flag("isReady") && _this.box2.flag("isReady"),
          ),
            _this.box1.animateSet(),
            _this.box2.animateSet());
          const layers = await _this.layout.getAllLayers(),
            {
              border: border,
              column1: column1,
              column2: column2,
              background: background,
            } = layers;
          ((_this.sceneRoot = new Group()),
            _this.sceneRoot.add(column1),
            _this.sceneRoot.add(column2),
            _this.sceneRoot.add(background),
            _this.add(_this.sceneRoot),
            _this.isPlayground() &&
              ((_this.floatingFrame1.visible = !1), (border.visible = !1)),
            (_this.border = border));
          [column1, column2].forEach((layer) => {
            if (!layer.visible) return;
            const shader = _this.initClass(
              Shader,
              "PillarFractureShaderInverse",
              {
                uLineWidth: { value: 5e-4 },
                uMouse: { value: new Vector3(0, 0, 0) },
              },
            );
            (layer.shader.copyUniformsTo(shader),
              (shader.uniforms.uDiscardTop = layer.shader.uniforms.uDiscardTop),
              (shader.uniforms.uDiscardBottom =
                layer.shader.uniforms.uDiscardBottom),
              (shader.side = Shader.BACK_SIDE));
            const mesh = new Mesh(layer.geometry, shader);
            (mesh.position.copy(layer.position),
              mesh.rotation.copy(layer.rotation),
              mesh.scale.copy(layer.scale),
              (mesh.renderOrder = layer.renderOrder + 1),
              (layer.inverseMesh = mesh),
              _this.sceneRoot.add(mesh),
              mesh.upload());
          });
          const windDustShader = _this.initClass(Shader, "WindDustShader", {
              tMap: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/clouds_noise.png",
                ),
              },
              uScroll: { value: 0 },
              uThreshold: { value: 0.4 },
              uSpeed: { value: 0 },
              uAnimatePosition: { value: 0 },
              uTile: { value: 1 },
              uThickness: { value: 0.35 },
              uColor: { value: new Color("#121212") },
              uFrameRate: { value: 60 },
              uDiscardBottom: { value: 0, ignoreUIL: !0 },
              uDiscardTop: { value: 1, ignoreUIL: !0 },
            }),
            projection = ScreenProjection.find(Global.CAMERA);
          let _mouse3D = new Vector3(),
            _mouse3D2 = new Vector3();
          _this.startRender(() => {
            const v = projection.unproject(
              Mouse,
              8 - _this.sceneRoot.position.z,
            );
            _mouse3D.lerp(v, 0.05);
            const v2 = projection.unproject(
              Mouse,
              6.5 - _this.sceneRoot.position.z,
            );
            (_mouse3D2.lerp(v2, 0.05),
              column1.shader.uniforms.uMouse.value.copy(_mouse3D),
              column1.inverseMesh.shader.uniforms.uMouse.value.copy(_mouse3D),
              column2.shader.uniforms.uMouse.value.copy(_mouse3D2),
              column2.inverseMesh.shader.uniforms.uMouse.value.copy(_mouse3D2));
          });
          const windLines = _this.initClass(
            WindLines,
            "assets/geometry/story/pillarcrumble/wind-curves.json",
            windDustShader,
          );
          (await windLines.wait("isReady"),
            (_this.windLines = windLines.mesh),
            (_this.windLines.frustumCulled = !1),
            (_this.windLines.shader.uniforms.uThreshold.value = 0.78),
            (_this.windLines.shader.uniforms.uSpeed.value = 1),
            (_this.windLines.position.z = -1.9),
            (_this.windLines.position.x = -0.25),
            _this.sceneRoot.add(_this.windLines),
            (_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.geometry = _this.border.geometry.clone()),
            (_this.border.geometry.boundingSphere.radius = _this.heightWorld));
        }),
        (_this.handleResize = function handleResize() {
          const isMobile = Stage.width / Stage.height < 1;
          ((_this.border.shader.uniforms.uScreenHeightWorld.value =
            _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.shader.uniforms.uPadX.value = Math.range(
              Stage.width,
              1600,
              393,
              0.18,
              0.08,
              !0,
            )),
            (_this.border.shader.uniforms.uPadY.value =
              _this.border.shader.uniforms.uPadX.value),
            (_this.state.frame1width = isMobile ? 0.4 : 0.65),
            (_this.state.frame1height = isMobile ? 0.3 : 0.4),
            (_this.state.frame1padx = isMobile ? 0 : 0.5),
            (_this.state.frame1pady = isMobile ? 0.4 : 1.25),
            (_this.state.frame1horizontalAlign = "left"),
            (_this.state.frame1verticalAlign = isMobile ? "center" : "bottom"),
            (_this.state.text1padx = isMobile ? 0.03 : 0.4),
            (_this.state.text1pady = isMobile ? 0.33 : 1.1),
            (_this.state.text1horizontalAlign = "left"),
            (_this.state.text1verticalAlign = "top"),
            (_this.state.text1Width = isMobile ? 0.6 * Stage.width : 500),
            (_this.state.text2padx = isMobile
              ? 0.03
              : Math.range(Stage.width, 1600, 393, 1, 0.05, !0)),
            (_this.state.text2pady = isMobile ? -1.2 : -1),
            (_this.state.text2horizontalAlign = isMobile ? "right" : "center"),
            (_this.state.text2verticalAlign = "center"),
            (_this.state.text2Width = isMobile ? 0.7 * Stage.width : 500),
            (_this.sceneRoot.position.z = isMobile ? -1.6 : 0),
            (_this.sceneRoot.position.x = isMobile ? 0.3 : 0),
            _this.box1.handleResize(),
            _this.box2.handleResize(),
            _this.floatingFrame1.handleResize());
        }),
        _this.bind("Story/scrollY", (value) => {
          _this.windLines &&
            ((_this.windLines.shader.uniforms.uScroll.value = value),
            (_this.windLines.shader.uniforms.uDiscardTop.value =
              (_this.worldTop + value) /
              _this.getSync("Story/screenHeightWorld")),
            (_this.windLines.shader.uniforms.uDiscardBottom.value =
              (_this.worldBottom + value) /
              _this.getSync("Story/screenHeightWorld")),
            _this.state.needsToPlayTransition &&
              _this.scrollProgress > 0.1 &&
              (AudioUtils.playOneShot(_this.state.needsToPlayTransition),
              (_this.state.needsToPlayTransition = !1)));
        }),
        _this.bind("Global/selectedBottle", (value) => {
          switch (value) {
            case 1:
              _this.floatingFrame1.mesh.shader.uniforms.uColor2.value.set(
                "#63C4F4",
              );
              break;
            case 2:
              _this.floatingFrame1.mesh.shader.uniforms.uColor2.value.set(
                "#97F3AD",
              );
              break;
            case 3:
              _this.floatingFrame1.mesh.shader.uniforms.uColor2.value.set(
                "#FBEB7F",
              );
          }
        }),
        (_this.animateIn = () => {}),
        (_this.animateOut = () => {}),
        (onInit = _this.onInit === onInit ? null : _this.onInit));
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_this.floatingFrame1 = _this.initClass(
          FloatingFrame,
          (function () {
            let params = AppState.createLocal({
              geometry:
                "assets/geometry/story/pillarcrumble/floating-frame-profile.bin",
              shader: _this.floatingFrameShader,
              frameWidth: _this.state.frame1width,
              frameHeight: _this.state.frame1height,
              frameZ: 0.1,
              zOffset: -0.25,
              horizontalAlign: _this.state.frame1horizontalAlign,
              verticalAlign: _this.state.frame1verticalAlign,
              padx: _this.state.frame1padx,
              pady: _this.state.frame1pady,
              lightDir: _this.state.lightDir,
            });
            return (
              _this.bindState(_this.state, ["frame1width"], (val) => {
                params.frameWidth = val;
              }),
              _this.bindState(_this.state, ["frame1height"], (val) => {
                params.frameHeight = val;
              }),
              _this.bindState(_this.state, ["frame1horizontalAlign"], (val) => {
                params.horizontalAlign = val;
              }),
              _this.bindState(_this.state, ["frame1verticalAlign"], (val) => {
                params.verticalAlign = val;
              }),
              _this.bindState(_this.state, ["frame1padx"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["frame1pady"], (val) => {
                params.pady = val;
              }),
              _this.bindState(_this.state, ["lightDir"], (val) => {
                params.lightDir = val;
              }),
              params
            );
          })(),
        )),
        _this.floatingFrame1.isFragment &&
          _promises.push(_this.wait(_this.floatingFrame1, "__ready")),
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
              id: 15,
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
              id: 16,
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
          "PillarCrumbleScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }