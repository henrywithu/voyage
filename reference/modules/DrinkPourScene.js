function DrinkPourScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "DrinkPourScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "DrinkPourScene"),
      (_this.contexts = "BaseView, 'DrinkPourScene'"),
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
      const AUDIO_MANAGER = AudioManager.instance(),
        DRINKING_AUDIO_KEYFRAME = 132,
        ANIMATION_SETTINGS = { start: 90, loopIn: 141, loopOut: 319 };
      ((_this.state.cursorText = "Hold &\nPour"),
        (_this.root = new Group()),
        _this.add(_this.root),
        (_this.floatingFrameShader = _this.initClass(
          Shader,
          "FloatingFrameDrinkShader",
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
            uColor2: { value: new Color("#b0976a") },
            uColor3: { value: new Color("#3c3c3c") },
            uDrinkColor: { value: new Color("#00ff00") },
            uTransition: { value: 0 },
            uHover: { value: 0 },
          },
        )),
        (_this.getUIHit = async () => (
          await _this.wait(() => _this.ui?.pourSection),
          _this.ui.pourSection
        )),
        (_this.init = async () => {
          (_this.isPlayground() && (_this.group.position.y = -3),
            (_this.onMouseDown = () => {
              (GoogleAnalytics.track("drinkpour_start"),
                tween(_this.pourProgress, { value: 1 }, 3e3, "linear"));
            }),
            (_this.onMouseUp = () => {
              (GoogleAnalytics.track("drinkpour_stop"),
                tween(_this.pourProgress, { value: 0 }, 1e3, "linear"));
            }),
            (_this.onDiscHoldStart = _this.onMouseDown),
            (_this.onDiscHoldEnd = _this.onMouseUp));
          const {
            border: border,
            background: background,
            background_plinth: background_plinth,
            foreground_plinth: foreground_plinth,
            glass: glass,
            armshadow: armshadow,
            glass_front: glass_front,
            glassshadow: glassshadow,
          } = _this.layers;
          ((_this.glass = glass),
            (_this.border = border),
            (_this.armshadow = armshadow),
            (_this.armGroup = new Group()),
            (_this.armGroup.position.y += 5.25),
            (_this.armGroup._originalPosition =
              _this.armGroup.position.clone()),
            (_this.characterGroup = new Group()),
            (_this.characterGroup.position.y -= 8.75),
            (_this.characterGroup.position.z -= 1.25),
            _this.characterGroup.scale.setScalar(3));
          const layersToOutline = [background_plinth, foreground_plinth];
          layersToOutline.forEach((layer) => {
            const shader = _this.initClass(
              Shader,
              "StaticObjectBaseShaderInverse",
              {
                uLineWidth: {
                  value: "foreground_plinth" === layer.uilName ? 0.002 : 5e-4,
                },
              },
            );
            ((shader.uniforms.uDiscardTop = layer.shader.uniforms.uDiscardTop),
              (shader.uniforms.uDiscardBottom =
                layer.shader.uniforms.uDiscardBottom),
              (shader.side = Shader.BACK_SIDE));
            const mesh = new Mesh(layer.geometry, shader);
            (mesh.upload(),
              mesh.position.copy(layer.position),
              mesh.rotation.copy(layer.rotation),
              mesh.scale.copy(layer.scale),
              (mesh.renderOrder = layer.renderOrder + 1),
              (layer.inverseMesh = mesh));
          });
          const geometry = await GeomThread.loadSkinnedGeometry(
              "assets/geometry/story/drinkpour/saint-pour-arm.bin",
            ),
            shader = _this.createFragment(Shader, "SkinShader");
          (shader.addUniforms({
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
            uColor: { value: new Color("#ffffff") },
            uDrinkColor: { value: new Color("#ffffff") },
            uLinesTile: { value: 12 },
            uLightDir: { value: new Vector3(0, 0.5, 0.95).normalize() },
            uAxis: { value: new Vector3(1, 0.77, -0.6) },
            uThreshold: { value: new Vector2(0, 0.7) },
            uAngle: { value: -2.008 },
            uDiscardBottom: { value: 0, ignoreUIL: !0 },
            uDiscardTop: { value: 1, ignoreUIL: !0 },
          }),
            (_this.skin = new Skin(geometry, shader, geometry.bones)),
            (_this.skin.frustumCulled = !1),
            (_this.skin.autoUpdateBoneTexture = !1),
            _this.armGroup.add(_this.skin),
            (_this.skin.groupRef = _this.armGroup),
            (_this.animation = await _this.skin.loadAnimation(
              "assets/geometry/story/drinkpour/saint-pour-arm-animation.bin",
            )));
          const characterGeometry = await GeomThread.loadSkinnedGeometry(
              "assets/geometry/story/drinkpour/saint-drink.bin",
            ),
            characterShader = _this.createFragment(Shader, "SkinShader");
          (characterShader.addUniforms({
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
            uColor: { value: new Color("#b0976a") },
            uDrinkColor: { value: new Color("#63C4F4") },
            uLinesTile: { value: 3.5 },
            uLightDir: { value: new Vector3(0.13, 0.3, 0.74).normalize() },
            uAxis: { value: new Vector3(0, 0, 1) },
            uThreshold: { value: new Vector2(0, 0) },
            uAngle: { value: -1.53 },
            uColorScan: { value: 0 },
            uDiscardBottom: { value: 0, ignoreUIL: !0 },
            uDiscardTop: { value: 1, ignoreUIL: !0 },
          }),
            (_this.characterSkin = new Skin(
              characterGeometry,
              characterShader,
              characterGeometry.bones,
            )),
            (_this.characterSkin.frustumCulled = !1),
            (_this.characterSkin.autoUpdateBoneTexture = !1),
            (_this.characterAnimation = await _this.characterSkin.loadAnimation(
              "assets/geometry/story/drinkpour/saint-drink-animation.bin",
            )),
            _this.characterGroup.add(_this.characterSkin),
            (_this.characterSkin.groupRef = _this.characterGroup),
            (_this.characterAnimation.elapsed = ANIMATION_SETTINGS.start));
          [_this.skin, _this.characterSkin].forEach((skin, index) => {
            const inverseGeometry = skin.geometry,
              inverseShader = _this.initClass(Shader, "InverseSkinShader", {
                uDisplacement: { value: 1 },
              });
            inverseShader.side = Shader.BACK_SIDE;
            const inverseSkin = new Mesh(inverseGeometry, inverseShader);
            (inverseSkin.upload(),
              (inverseSkin.frustumCulled = skin.frustumCulled),
              (inverseSkin.scale = skin.scale),
              (inverseSkin.position = skin.position),
              (inverseSkin.rotation = skin.rotation),
              skin.shader.copyUniformsTo(inverseShader, !0),
              skin.groupRef.add(inverseSkin));
          });
          const bottleGeometry = await GeomThread.loadGeometry(
              "assets/geometry/story/drinkpour/saint-pour-bottle2.bin",
            ),
            bottleShader = _this.createFragment(
              Shader,
              "DrinkPourBottleShader",
              {
                tLines: {
                  value: Utils3D.getRepeatTexture(
                    "assets/images/story/lines.jpg",
                  ),
                },
                tNoise: {
                  value: Utils3D.getRepeatTexture(
                    "assets/images/story/drinkpour/T_Noise15.png",
                  ),
                },
                tMap: {
                  value: Utils3D.getRepeatTexture(
                    "assets/images/story/drinkselection/merged_bottle.png",
                  ),
                },
                uColorHighlight: { value: new Color("#ffffff") },
                uColor: { value: new Color("#6ec0f0") },
                uLinesTile: { value: 10 },
                uLightDir: { value: new Vector3(0, 0.1, 1).normalize() },
                uAxis: { value: new Vector3(1, 0, 0).normalize() },
                uAngle: { value: 0.5 * Math.PI },
                uDistanceCompensation: { value: 0 },
                uThreshold: { value: new Vector2(0.5, 0.1) },
                uDiscardTop: { value: 1 },
                uDiscardBottom: { value: 0 },
                uPourStrength: { value: 0 },
                uWaterLineOffset: { value: 0.1 },
              },
            );
          ((_this.bottle = new Mesh(bottleGeometry, bottleShader)),
            (_this.bottle.rotation.z = 4.4),
            _this.bottle.upload(),
            (_this.bottleBaseBone = _this.skin.bones[0]),
            (_this.bottleTipBone = _this.skin.bones[4]),
            _this.armGroup.add(_this.bottleBaseBone),
            _this.bottleBaseBone.add(_this.bottle),
            _this.skin.update(),
            _this.characterSkin.update(),
            (_this.pourFX = _this.initClass(
              PourFX,
              _this.bottleBaseBone,
              _this.bottleTipBone,
            )),
            (_this.pourFX.basePlane.position.y =
              _this.glass.position.y -
              0.35 * _this.pourFX.basePlane.scale.y +
              (_this.glass.geometry.boundingBox.max.y -
                _this.glass.geometry.boundingBox.min.y) *
                _this.glass.scale.y),
            _this.startRender(loop),
            (_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld") || 1),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.geometry = _this.border.geometry.clone()),
            (_this.border.geometry.boundingSphere.radius = _this.heightWorld),
            _this.bind("Global/selectedBottle", (value) => {
              switch (value) {
                case 1:
                  (bottleShader.uniforms.uColor.value.set("#63C4F4"),
                    characterShader.uniforms.uDrinkColor.value.set("#63C4F4"),
                    _this.floatingFrameShader.uniforms.uDrinkColor.value.set(
                      "#63C4F4",
                    ),
                    _this.pourFX.updateColor("#63C4F4"));
                  break;
                case 2:
                  (bottleShader.uniforms.uColor.value.set("#97F3AD"),
                    characterShader.uniforms.uDrinkColor.value.set("#97F3AD"),
                    _this.floatingFrameShader.uniforms.uDrinkColor.value.set(
                      "#97F3AD",
                    ),
                    _this.pourFX.updateColor("#97F3AD"));
                  break;
                case 3:
                  (bottleShader.uniforms.uColor.value.set("#FBEB7F"),
                    characterShader.uniforms.uDrinkColor.value.set("#FBEB7F"),
                    _this.floatingFrameShader.uniforms.uDrinkColor.value.set(
                      "#FBEB7F",
                    ),
                    _this.pourFX.updateColor("#FBEB7F"));
              }
            }),
            _this.bind("Story/scrollY", (value) => {
              ((background_plinth.shader.uniforms.uDiscardTop.value =
                (_this.worldTop + value) /
                  _this.getSync("Story/screenHeightWorld") -
                0.1),
                (background_plinth.shader.uniforms.uDiscardBottom.value =
                  (_this.worldBottom + value) /
                  _this.getSync("Story/screenHeightWorld")),
                (background.shader.uniforms.uDiscardTop.value =
                  (_this.worldTop + value) /
                    _this.getSync("Story/screenHeightWorld") -
                  0.1),
                (background.shader.uniforms.uDiscardBottom.value =
                  (_this.worldBottom + value) /
                  _this.getSync("Story/screenHeightWorld")),
                (characterShader.uniforms.uColorScan.value =
                  (_this.worldBottom + value) /
                  _this.getSync("Story/screenHeightWorld")));
            }),
            _this.root.add(background_plinth),
            _this.root.add(foreground_plinth),
            layersToOutline.forEach((layer) => {
              _this.root.add(layer.inverseMesh);
            }),
            _this.root.add(background_plinth.inverseMesh),
            _this.root.add(foreground_plinth.inverseMesh),
            _this.root.add(_this.characterGroup),
            _this.root.add(_this.armGroup),
            _this.root.add(_this.glass),
            _this.root.add(_this.pourFX.meshLine),
            _this.root.add(_this.pourFX.basePlane),
            _this.root.add(glass_front),
            _this.root.add(glassshadow),
            _this.root.add(armshadow),
            (_this.root.position.z = 0),
            _this.cursor.animateSet(),
            _this.discButton.animateSet());
        }),
        (_this.pourProgress = { value: 0 }));
      let _x = { min: -0.25, max: 0.25 };
      function loop() {
        const timeInc = 0.02 * Render.DELTA,
          isMobile = Stage.width / Stage.height < 1;
        if (
          ((_x = isMobile
            ? { min: -0.4, max: 0.11 }
            : { min: -0.25, max: 0.25 }),
          Device.mobile)
        ) {
          const position = _this.webGLToDOM(_this.glass, Global.CAMERA.camera);
          ((position.y -= 400),
            (position.x += 0.125 * Stage.width),
            _this.discButton.updatePosOnHold(position));
        }
        _this.animation.elapsed = Math.mix(0, 60, _this.pourProgress.value);
        const targetX =
          Math.map(Mouse.tilt.x, -0.5, 0.5, _x.min, _x.max, !0) *
          _this.pourProgress.value;
        _this.armGroup.position.x =
          Math.lerp(targetX, _this.armGroup.position.x, 0.1) -
          Math.sin(7e-4 * Render.TIME) *
            Math.cos(6e-4 * (Render.TIME + 120)) *
            0.005;
        const targetY =
            _this.armGroup._originalPosition.y +
            Math.map(Mouse.tilt.y, -0.5, 0.5, 0, 0.6, !0) *
              _this.pourProgress.value,
          lerpedY = Math.lerp(targetY, _this.armGroup.position.y, 0.08);
        ((_this.armGroup.position.y =
          lerpedY +
          0.01 *
            ((0.5 * Math.sin(4e-4 * Render.TIME) + 0.5) *
              Math.cos(6e-4 * (Render.TIME + 10)) *
              0.5 +
              0.5)),
          (function loopCharacterAnimation(timeInc, speed) {
            ((_this.characterAnimation.elapsed += timeInc * speed),
              _this.characterAnimation.elapsed >= ANIMATION_SETTINGS.loopOut &&
                (_this.characterAnimation.elapsed =
                  ANIMATION_SETTINGS.loopIn +
                  (_this.characterAnimation.elapsed %
                    ANIMATION_SETTINGS.loopOut)),
              (_this.floatingFrame.animation.elapsed =
                _this.characterAnimation.elapsed));
          })(timeInc, 1.5),
          _this.armshadow._initialLinesStrength ||
            ((_this.armshadow._initialLinesStrength =
              _this.armshadow.shader.uniforms.uLinesStrength.value),
            (_this.armshadow._initialPositionX = _this.armshadow.position.x)),
          (_this.armshadow.shader.uniforms.uLinesStrength.value = Math.mix(
            _this.armshadow._initialLinesStrength,
            0.6,
            Math.clamp(2 * _this.pourProgress.value, 0, 1),
          )),
          (_this.armshadow.position.x = Math.lerp(
            _this.armshadow._initialPositionX + targetX,
            _this.armshadow.position.x,
            0.18,
          )),
          _this.skin.update(),
          _this.characterSkin.update(),
          _this.pourFX.setSpawnPosition(_this.bottleTipBone.getWorldPosition()),
          _this.pourFX.update(),
          (_this.bottle.shader.uniforms.uPourStrength.value =
            _this.pourFX.pourStrength),
          (function updatePouringAudio(progress) {
            const blendInStart = 0.24,
              blendInEnd = 0.28,
              volume = Math.range(progress, blendInStart, blendInEnd, 0, 1, !0);
            (AUDIO_MANAGER.setVolume("pouring", volume),
              progress >= blendInStart &&
                _pourState === POUR_STATE.idle &&
                (AudioUtils.playOneShot("pouring_start"),
                (_pourState = POUR_STATE.pouring)));
            progress <= blendInStart &&
              _pourState === POUR_STATE.pouring &&
              (AudioUtils.playOneShot("pouring_stop"),
              (_pourState = POUR_STATE.idle));
          })(_this.pourProgress.value),
          (function updateWaterLevel(progress) {
            const alpha = (function easeInSine(value) {
                return -(Math.cos(Math.PI * value) - 1) / 2;
              })(Math.range(progress, 0, 0.7, 0, 1, !0)),
              offset = Math.lerp(0.05, 0.4, alpha);
            _this.bottle.shader.set("uWaterLineOffset", offset);
          })(_this.pourProgress.value),
          (function updateDrinkingAudio(elapsed) {
            const volume = getDrinkingVolume();
            AUDIO_MANAGER.setVolume("drinking", volume);
            elapsed < DRINKING_AUDIO_KEYFRAME && (_hasDrinkingAudioPlayed = !1);
            elapsed >= DRINKING_AUDIO_KEYFRAME &&
              !_hasDrinkingAudioPlayed &&
              (AudioUtils.playOneShot("drinking", {
                volume: getDrinkingVolume(),
              }),
              (_hasDrinkingAudioPlayed = !0));
          })(
            _this.characterAnimation.elapsed %
              _this.characterAnimation.duration,
          ));
      }
      _this.handleResize = function handleResize() {
        const isMobile = Stage.width / Stage.height < 1;
        ((_this.state.framewidth = isMobile ? 0.45 : 0.63),
          (_this.state.frameheight = isMobile ? 0.25 : 0.33),
          (_this.state.framepadx = isMobile ? 0 : 0.5),
          (_this.state.framepady = isMobile ? 4 : 3.25),
          _this.floatingFrame.handleResize(),
          (_this.border.shader.uniforms.uScreenHeightWorld.value =
            _this.getSync("Story/screenHeightWorld") || 1),
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
          (_this.border.shader.uniforms.uPadY.value = 0.05),
          (_this.characterSkin.position.y = isMobile ? 0.1 : 0));
      };
      const POUR_STATE = { idle: 0, pouring: 1 };
      let _pourState = POUR_STATE.idle;
      let _hasDrinkingAudioPlayed = !1;
      function getDrinkingVolume() {
        const { baseGain: baseGain } = AUDIO_MANAGER.getAudio("drinking");
        return (
          baseGain *
          (_this.scrollProgress <= 0.8
            ? Math.range(_this.scrollProgress, 0.5, 0.6, 0, 1, !0)
            : Math.range(_this.scrollProgress, 0.8, 0.9, 1, 0, !0))
        );
      }
      onInit = _this.onInit === onInit ? null : _this.onInit;
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_this.discButton = _this.initClass(
          GLUIDiscButton,
          (function () {
            let params = AppState.createLocal({ text: _this.state.cursorText });
            return (
              _this.bindState(_this.state, ["cursorText"], (val) => {
                params.text = val;
              }),
              params
            );
          })(),
        )),
        _this.discButton.isFragment &&
          _promises.push(_this.wait(_this.discButton, "__ready")),
        (_this.cursor = _this.initClass(
          GLUICursor,
          (function () {
            let params = AppState.createLocal({
              text: _this.state.cursorText,
              getUIHit: _this.getUIHit,
            });
            return (
              _this.bindState(_this.state, ["cursorText"], (val) => {
                params.text = val;
              }),
              params
            );
          })(),
        )),
        _this.cursor.isFragment &&
          _promises.push(_this.wait(_this.cursor, "__ready")),
        (_this.floatingFrame = _this.initClass(
          FloatingFrame,
          (function () {
            let params = AppState.createLocal({
              geometry:
                "assets/geometry/story/drinkpour/floating-frame-drink.bin",
              animation:
                "assets/geometry/story/drinkpour/saint-drink-animation.bin",
              shader: _this.floatingFrameShader,
              frameWidth: _this.state.framewidth,
              frameHeight: _this.state.frameheight,
              frameZ: 0.1,
              zOffset: -0.3,
              horizontalAlign: "right",
              verticalAlign: "bottom",
              padx: _this.state.framepadx,
              pady: _this.state.framepady,
              lightDir: _this.state.lightDir2,
              meshOffsetY: -2.425,
              meshRotationY: 13.614,
              meshScale: 1.38,
            });
            return (
              _this.bindState(_this.state, ["framewidth"], (val) => {
                params.frameWidth = val;
              }),
              _this.bindState(_this.state, ["frameheight"], (val) => {
                params.frameHeight = val;
              }),
              _this.bindState(_this.state, ["framepadx"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["framepady"], (val) => {
                params.pady = val;
              }),
              _this.bindState(_this.state, ["lightDir2"], (val) => {
                params.lightDir = val;
              }),
              params
            );
          })(),
        )),
        _this.floatingFrame.isFragment &&
          _promises.push(_this.wait(_this.floatingFrame, "__ready")),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "DrinkPourScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }