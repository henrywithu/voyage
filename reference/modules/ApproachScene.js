function ApproachScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "ApproachScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "ApproachScene"),
      (_this.contexts = "BaseView, 'ApproachScene'"),
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
      const AUDIO_MANAGER = AudioManager.instance();
      ((_this.state.text1padx = 0.4),
        (_this.state.text1pady = 1.1),
        (_this.state.text1horizontalAlign = "left"),
        (_this.state.text1verticalAlign = "top"),
        (_this.state.text1body =
          "AN OMINOUS STRUCTURE STANDS BEFORE THE saint, THE HUMMING SOUND SEEMS TO COME FROM ITS DIRECTION. A VIVID LIGHT SHINES THROUGH THE CIRCULAR PORTAL AT THE BASE OF THE great monolith.  NOT COMPLETELY believing IT, THE saint PAUSES FOR A MOMENT TO GET HIS SENSES BACK."),
        (_this.state.text1Width = 500),
        (_this.state.text2padx = 0.4),
        (_this.state.text2pady = -1.5),
        (_this.state.text2horizontalAlign = "center"),
        (_this.state.text2verticalAlign = "center"),
        (_this.state.text2body =
          "There's no time.\nHe must see it through the end."),
        (_this.state.framePadX = 0.5),
        (_this.state.framePadY = 0.35),
        (_this.state.frameWidth = 0.9),
        (_this.state.frameHeight = 0.35),
        (_this.state.frameHorizontalAlign = "right"),
        (_this.state.frameVerticalAlign = "bottom"),
        (_this.customVisibilityPaddingTop = 0.1));
      const FOOTSTEP_AUDIO_KEYFRAMES = [16, 32];
      ((_this.floatingFrameShader = _this.initClass(
        Shader,
        "FloatingFrameWalkShader",
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
              "assets/images/story/tex_clothing_trim.png",
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
          uColor1: { value: new Color("#f3f1e9") },
          uColor2: { value: new Color("#b0976a") },
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
            _this.box2.animateSet(),
            _this.startRender(() => {
              _this.scrollProgress &&
                (function checkFootstepsAudio(animation) {
                  const elapsed = animation.elapsed % animation.duration;
                  for (let i = 0; i < FOOTSTEP_AUDIO_KEYFRAMES.length; i++) {
                    elapsed < FOOTSTEP_AUDIO_KEYFRAMES[0] &&
                      (_footstepsPlayed = 0);
                    elapsed >= FOOTSTEP_AUDIO_KEYFRAMES[i] &&
                      _footstepsPlayed === i &&
                      (AudioUtils.playRoundRobin("footstep_out", {
                        volume: getFootstepVolume(),
                      }),
                      _footstepsPlayed++);
                  }
                })(_this.floatingFrame.animation);
            }));
          const layers = await _this.layout.getAllLayers(),
            {
              border: border,
              landscape: landscape,
              steps: steps,
              stepsclose: stepsclose,
              structure: structure,
              character: character,
              moonRoot: moonRoot,
            } = layers;
          ((_this.sceneRoot = new Group()),
            _this.sceneRoot.add(_this.layers.portal),
            _this.sceneRoot.add(_this.layers.background),
            _this.sceneRoot.add(_this.layers.landscape),
            _this.sceneRoot.add(_this.layers.steps),
            _this.sceneRoot.add(_this.layers.structure),
            _this.sceneRoot.add(_this.layers.stepsclose),
            _this.sceneRoot.add(_this.layers.character),
            _this.sceneRoot.add(_this.layers.charshadow),
            _this.add(_this.sceneRoot),
            (_this.moonParentRoot = new Group()),
            _this.moonParentRoot.add(moonRoot),
            _this.add(_this.moonParentRoot),
            (_this.border = border),
            (_this.stepsclose = stepsclose),
            (_this.moonRoot = moonRoot));
          [landscape, steps, stepsclose, structure].forEach((layer) => {
            if (!layer.visible) return;
            const shader = _this.initClass(
              Shader,
              "StaticObjectBaseShaderInverse",
              { uLineWidth: { value: 0.0025 } },
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
              mesh.upload(),
              (layer.inverseMesh = mesh),
              _this.sceneRoot.add(mesh));
          });
          const shader = _this.initClass(
            Shader,
            "StaticCharacterBaseShaderInverse",
            { uLineWidth: { value: 0.008 } },
          );
          ((shader.uniforms.uWindAxisAngle =
            character.shader.uniforms.uWindAxisAngle),
            (shader.uniforms.uWindParams =
              character.shader.uniforms.uWindParams),
            (shader.uniforms.uBreathe = character.shader.uniforms.uBreathe),
            (shader.uniforms.uBend = character.shader.uniforms.uBend),
            (shader.side = Shader.BACK_SIDE),
            character.shader.copyUniformsTo(shader));
          const mesh = new Mesh(character.geometry, shader);
          (mesh.position.copy(character.position),
            mesh.rotation.copy(character.rotation),
            mesh.scale.copy(character.scale),
            (mesh.renderOrder = character.renderOrder + 1),
            (character.inverseMesh = mesh),
            _this.sceneRoot.add(mesh),
            mesh.upload());
          const windLines = _this.initClass(
            WindLines,
            "assets/geometry/story/approach/portal-wind-curves.json",
          );
          (await windLines.wait("isReady"),
            (_this.windLines = windLines.mesh),
            (_this.windLines.position.y = 0.5 * -_this.heightWorld + 0.6),
            (_this.windLines.frustumCulled = !1),
            (_this.windLines.shader.uniforms.uThreshold.value = 0.84),
            (_this.windLines.shader.uniforms.uSpeed.value = 1),
            (_this.windLines.shader.uniforms.uTile.value = 2),
            (_this.windLines.shader.uniforms.uFrameRate.value = 18),
            _this.sceneRoot.add(_this.windLines),
            (_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.geometry = _this.border.geometry.clone()),
            (_this.border.geometry.boundingSphere.radius = _this.heightWorld),
            (function animateSet() {
              (_this.border.shader.set("uTransition", 0),
                _this.stepsclose.scale.setScalar(0),
                _this.stepsclose.position.set(-0.437, 1 - 2.49, 0.138),
                _this.stepsclose.inverseMesh.scale.setScalar(0),
                _this.stepsclose.inverseMesh.position.set(
                  -0.437,
                  1 - 2.49,
                  0.138,
                ),
                (_this.stepsclose.inverseMesh.visible = !1));
            })());
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
            _this.stepsclose &&
              ((_this.stepsclose.visible = Stage.width >= 1600),
              (_this.stepsclose.inverseMesh.visible =
                _this.stepsclose.visible)));
          ((_this.customVisibilityPaddingTop = isMobile ? 0.3 : 0.1),
            _this.moonParentRoot.scale.setScalar(isMobile ? 0.75 : 1),
            (_this.moonParentRoot.position.y = isMobile ? 0.25 : 0.4),
            (_this.moonParentRoot.position.x = isMobile ? -0.9 : 0.3),
            (_this.sceneRoot.rotation.y = isMobile ? 0.2 : 0),
            (_this.sceneRoot.rotation.x = isMobile ? 0.05 : 0),
            (_this.sceneRoot.position.x = isMobile ? 1.6 : 0),
            (_this.sceneRoot.position.y = isMobile ? -0.5 : 0),
            (_this.layers.background.scale.y = isMobile ? 142 : 140),
            (_this.state.text1padx = isMobile ? 0.03 : 0.4),
            (_this.state.text1pady = isMobile ? 0.1 : 1.1),
            (_this.state.text1Width = isMobile ? 0.5 * Stage.width : 500),
            (_this.state.text1horizontalAlign = isMobile ? "right" : "left"),
            (_this.state.text1verticalAlign = "top"),
            (_this.state.text2pady = isMobile ? -1.7 : -1.5),
            (_this.state.text2padx = isMobile
              ? 0.03
              : Math.range(Stage.width, 1024, 3400, 0.1, 1.9, !0)),
            (_this.state.text2horizontalAlign = isMobile ? "left" : "right"),
            (_this.state.text2verticalAlign = "center"),
            _this.box1.handleResize(),
            _this.box2.handleResize(),
            (_this.state.framePadY = isMobile ? 0 : 0.35),
            (_this.state.frameWidth = isMobile ? 0.4 : 0.9),
            (_this.state.frameHeight = isMobile ? 0.3 : 0.35),
            (_this.state.framePadX = isMobile ? 0.05 : 0.5),
            _this.floatingFrame.handleResize());
        }),
        _this.bind("Story/scrollY", (value) => {
          _this.windLines &&
            ((_this.windLines.shader.uniforms.uScroll.value = value),
            (_this.windLines.shader.uniforms.uDiscardTop.value =
              (_this.worldTop + value) /
              _this.getSync("Story/screenHeightWorld")),
            (_this.windLines.shader.uniforms.uDiscardBottom.value =
              (_this.worldBottom + value) /
              _this.getSync("Story/screenHeightWorld")));
        }),
        (_this.animateIn = () => {
          (_this.border.shader.tween("uTransition", 1, 800, "easeOutCubic"),
            tween(
              _this.stepsclose.scale,
              { x: 0.8, y: 0.768, z: 1 },
              500,
              "easeOutCubic",
              500,
            ),
            tween(
              _this.stepsclose.inverseMesh.scale,
              { x: 0.8, y: 0.768, z: 1 },
              500,
              "easeOutCubic",
              500,
            ),
            tween(
              _this.stepsclose.position,
              { x: -0.437, y: -2.49, z: 0.138 },
              500,
              "easeOutCubic",
              500,
            ),
            tween(
              _this.stepsclose.inverseMesh.position,
              { x: -0.437, y: -2.49, z: 0.138 },
              500,
              "easeOutCubic",
              500,
            ));
        }),
        (_this.animateOut = () => {}));
      let _footstepsPlayed = 0;
      function getFootstepVolume() {
        return (
          AUDIO_MANAGER.getAudio("footstep_out_1").baseGain *
          (_this.scrollProgress <= 0.85
            ? Math.range(_this.scrollProgress, 0.5, 0.65, 0, 1, !0)
            : Math.range(_this.scrollProgress, 0.85, 1, 1, 0, !0))
        );
      }
      onInit = _this.onInit === onInit ? null : _this.onInit;
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_this.floatingFrame = _this.initClass(
          FloatingFrame,
          (function () {
            let params = AppState.createLocal({
              geometry:
                "assets/geometry/story/approach/floating-frame-walk.bin",
              animation:
                "assets/geometry/story/common/floating-frame-walk-anim.bin",
              shader: _this.floatingFrameShader,
              frameWidth: _this.state.frameWidth,
              frameHeight: _this.state.frameHeight,
              frameZ: 0.1,
              zOffset: -0.1,
              horizontalAlign: _this.state.frameHorizontalAlign,
              verticalAlign: _this.state.frameVerticalAlign,
              padx: _this.state.framePadX,
              pady: _this.state.framePadY,
            });
            return (
              _this.bindState(_this.state, ["frameWidth"], (val) => {
                params.frameWidth = val;
              }),
              _this.bindState(_this.state, ["frameHeight"], (val) => {
                params.frameHeight = val;
              }),
              _this.bindState(_this.state, ["frameHorizontalAlign"], (val) => {
                params.horizontalAlign = val;
              }),
              _this.bindState(_this.state, ["frameVerticalAlign"], (val) => {
                params.verticalAlign = val;
              }),
              _this.bindState(_this.state, ["framePadX"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["framePadY"], (val) => {
                params.pady = val;
              }),
              params
            );
          })(),
        )),
        _this.floatingFrame.isFragment &&
          _promises.push(_this.wait(_this.floatingFrame, "__ready")),
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
              id: 5,
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
              id: 6,
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
              params
            );
          })(),
        )),
        _this.box2.isFragment &&
          _promises.push(_this.wait(_this.box2, "__ready")),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "ApproachScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }