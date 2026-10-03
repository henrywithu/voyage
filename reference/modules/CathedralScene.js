function CathedralScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "CathedralScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "CathedralScene"),
      (_this.contexts = "BaseView, 'CathedralScene'"),
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
      ((_this.state.text1PadX = 0.4),
        (_this.state.text1PadY = 3),
        (_this.state.text1OffsetZ = 0.45),
        (_this.state.text1HorizontalAlign = "right"),
        (_this.state.text1VerticalAlign = "top"),
        (_this.state.text1Body =
          "THE saint LOSES CONSCIOUSNESS FOR A BRIEF MOMENT. HIS MIND STRUGGLES TO PROCESS WHAT IS HAPPENING. HE AWAKES IN AN EXALTED ROOM LIT BY A WARM LIGHT."),
        (_this.state.text1Width = 440),
        (_this.state.frameWidth = 0.9),
        (_this.state.frameHeight = 0.35),
        (_this.state.framePadX = 0.5),
        (_this.state.framePadY = 0.35),
        (_this.state.frameHorizontalAlign = "right"),
        (_this.state.frameVerticalAlign = "bottom"),
        (_this.state.frameWidthEyes = 1.8),
        (_this.state.frameHeightEyes = 0.65),
        (_this.state.zOffsetEyes = -1.6),
        (_this.state.eyesScale = 1));
      const FOOTSTEP_AUDIO_KEYFRAMES = [3, 6];
      function loop() {
        _this.scrollProgress &&
          (function checkFootstepsAudio(animation) {
            const elapsed = animation.elapsed % animation.duration;
            for (let i = 0; i < FOOTSTEP_AUDIO_KEYFRAMES.length; i++) {
              elapsed < FOOTSTEP_AUDIO_KEYFRAMES[0] && (_footstepsPlayed = 0);
              const stepNeedsToBePlayed = _footstepsPlayed === i;
              elapsed >= FOOTSTEP_AUDIO_KEYFRAMES[i] &&
                stepNeedsToBePlayed &&
                (AudioUtils.playRoundRobin("footstep_in", {
                  volume: getFootstepVolume(),
                }),
                _footstepsPlayed++);
            }
          })(_this.floatingFrame2.animation);
      }
      ((_this.floatingFrameShader1 = _this.initClass(
        Shader,
        "FloatingFrameEyesShader",
        {
          uPoint1: { value: new Vector3() },
          uPoint2: { value: new Vector3() },
          uPoint3: { value: new Vector3() },
          uPoint4: { value: new Vector3() },
          uCenter: { value: new Vector3() },
          uDPR: { value: Tests.getDPR() },
          uTransition: { value: 0 },
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
          uLinesTile: { value: 0.8 },
          uLightDir: { value: new Vector3(0.25, 0.25, 0.2) },
          uColor: { value: new Color("#7F7261") },
        },
      )),
        (_this.floatingFrameShader2 = _this.initClass(
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
            uColor1: { value: new Color("#bc251c") },
            uColor2: { value: new Color("#b0976a") },
            uColor3: { value: new Color("#121212") },
            uTransition: { value: 0 },
            uHover: { value: 0 },
          },
        )),
        (_this.init = async () => {
          (await _this.wait(() => _this.box1.flag("isReady")),
            _this.box1.animateSet());
          const layers = await _this.layout.getAllLayers(),
            {
              border: border,
              structure: structure,
              table: table,
              character: character,
            } = layers;
          ((_this.sceneRoot = new Group()),
            _this.sceneRoot.add(layers.structure),
            _this.sceneRoot.add(layers.background),
            _this.sceneRoot.add(layers.floor),
            _this.sceneRoot.add(layers.table),
            _this.sceneRoot.add(layers.bottle1),
            _this.sceneRoot.add(layers.bottle2),
            _this.sceneRoot.add(layers.bottle3),
            _this.sceneRoot.add(layers.character),
            _this.sceneRoot.add(layers.background_floor),
            _this.sceneRoot.add(layers.structure_shadow),
            _this.add(_this.sceneRoot),
            (character._basePosition = character.position.clone()),
            (character._baseScale = character.scale.clone()),
            (_this.character = character),
            (_this.border = border));
          ([
            structure,
            table,
            layers.bottle1,
            layers.bottle2,
            layers.bottle3,
          ].forEach((layer) => {
            const shader = _this.initClass(
              Shader,
              "StaticObjectBaseShaderInverse",
              {
                uLineWidth: {
                  value: layer.uilName.includes("bottle") ? 0.003 : 0.009,
                },
              },
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
          }),
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
          ((_this.border.shader.uniforms.uScreenHeightWorld.value =
            _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld));
          const cam = Global.CAMERA.camera;
          if (Stage.width < 1060) {
            const screenWidth = Utils3D.getWidthFromCamera(cam, cam.position.z);
            ((_this.state.frameWidthEyes = 0.5 * screenWidth),
              (_this.state.frameHeightEyes =
                0.36 * _this.state.frameWidthEyes));
          } else
            ((_this.state.frameWidthEyes = 1.8),
              (_this.state.frameHeightEyes = 0.65));
          ((_this.state.zOffsetEyes = Math.range(
            Stage.width,
            1060,
            393,
            -1.6,
            -0.6,
            !0,
          )),
            (_this.state.eyesScale = Math.range(
              Stage.width,
              1060,
              393,
              1,
              0.46,
              !0,
            )),
            (_this.state.text1PadX = isMobile ? 0.03 : 0.4),
            (_this.state.text1Width = isMobile ? 0.6 * Stage.width : 440),
            (_this.state.frameWidth = isMobile ? 0.53 : 0.9),
            (_this.state.frameHeight = isMobile ? 0.33 : 0.35),
            _this.floatingFrame1.handleResize(),
            _this.floatingFrame2.handleResize(),
            _this.box1.handleResize());
          const charaterPositionXRange = Math.range(
              Stage.width,
              1600,
              393,
              _this.character._basePosition.x,
              -0.7,
              !0,
            ),
            charaterScaleRange = Math.range(
              Stage.width,
              1600,
              393,
              _this.character._baseScale.x,
              0.9 * _this.character._baseScale.x,
              !0,
            );
          ((_this.character.position.x = charaterPositionXRange),
            _this.character.scale.setScalar(charaterScaleRange),
            (_this.state.framePadY = isMobile ? 0.3 : 0.35),
            (_this.state.framePadX = isMobile ? 0.05 : 1.4));
        }));
      let _footstepsPlayed = 0;
      function getFootstepVolume() {
        return (
          _this.AUDIO_MANAGER.getAudio("footstep_in_1").baseGain *
          (_this.scrollProgress <= 0.95
            ? Math.range(_this.scrollProgress, 0.7, 0.75, 0, 1, !0)
            : Math.range(_this.scrollProgress, 0.95, 1, 1, 0, !0))
        );
      }
      onInit = _this.onInit === onInit ? null : _this.onInit;
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
              geometry: "assets/geometry/story/cathedral/saint-eyes.bin",
              shader: _this.floatingFrameShader1,
              frameWidth: _this.state.frameWidthEyes,
              frameHeight: _this.state.frameHeightEyes,
              frameZ: -0.4,
              zOffset: _this.state.zOffsetEyes,
              meshScale: _this.state.eyesScale,
            });
            return (
              _this.bindState(_this.state, ["frameWidthEyes"], (val) => {
                params.frameWidth = val;
              }),
              _this.bindState(_this.state, ["frameHeightEyes"], (val) => {
                params.frameHeight = val;
              }),
              _this.bindState(_this.state, ["zOffsetEyes"], (val) => {
                params.zOffset = val;
              }),
              _this.bindState(_this.state, ["eyesScale"], (val) => {
                params.meshScale = val;
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
              padx: _this.state.text1PadX,
              pady: _this.state.text1PadY,
              offsetZ: _this.state.text1OffsetZ,
              horizontalAlign: _this.state.text1HorizontalAlign,
              verticalAlign: _this.state.text1VerticalAlign,
              body: _this.state.text1Body,
              color: "black",
              width: _this.state.text1Width,
              id: 11,
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
        (_this.floatingFrame2 = _this.initClass(
          FloatingFrame,
          (function () {
            let params = AppState.createLocal({
              geometry:
                "assets/geometry/story/approach/floating-frame-walk.bin",
              animation:
                "assets/geometry/story/common/floating-frame-walk-anim.bin",
              shader: _this.floatingFrameShader2,
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
        _this.floatingFrame2.isFragment &&
          _promises.push(_this.wait(_this.floatingFrame2, "__ready")),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "CathedralScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }