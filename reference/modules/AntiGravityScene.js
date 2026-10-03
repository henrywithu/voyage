function AntiGravityScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "AntiGravityScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "AntiGravityScene"),
      (_this.contexts = "BaseView, 'AntiGravityScene'"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let _camera,
        onInit = _this.onInit,
        [input] = _this.createUIL("Anti Gravity Scene Config");
      const vortexFocusEffectChain =
        _this.AUDIO_MANAGER.getEffectChain("vortexFocus");
      ((_this.state.text1PadX = 0.2),
        (_this.state.text1PadY = 0),
        (_this.state.framePadY = 0),
        (_this.state.text1OffsetZ = 0.45),
        (_this.state.text1HorizontalAlign = "right"),
        (_this.state.text1VerticalAlign = "center"),
        (_this.state.text1Width = 440),
        (_this.state.pady = 0),
        (_this.state.cursorText = "Hold"),
        (_this.state.eyesScale = 2),
        (_this.state.eyesOffsetY = 0),
        (_this.canDraw = !Device.mobile));
      const copy_orange =
          "THE saint DRINKS-AND IN AN INSTANT, A BEAM OF LIGHT ENGULFS HIM, SWIRLING WITH orange, CHOCOLATE, AND CREAM: AN ETHEREAL TRAIL THAT LIFTS HIM BEYOND THE SENSES.",
        copy_mint =
          "THE saint DRINKS-AND IN AN INSTANT, A BEAM OF LIGHT ENGULFS HIM, SWIRLING WITH MINT, CHOCOLATE, AND CREAM: AN ETHEREAL TRAIL THAT LIFTS HIM BEYOND THE SENSES.",
        copy_marshmallow =
          "THE saint DRINKS-AND IN AN INSTANT, A BEAM OF LIGHT ENGULFS HIM, SWIRLING WITH marshmallow, coffee, AND CREAM: AN ETHEREAL TRAIL THAT LIFTS HIM BEYOND THE SENSES.";
      function showTextBoxForSelectedBottle() {
        const selectedBottle = _this.getSync("Global/selectedBottle");
        for (let index = 0; index < 3; index++)
          _this.boxes[index].visible = index === selectedBottle - 1;
      }
      ((_this.boxes = null),
        (_this.init = async () => {
          ((_this.boxes = [_this.box0, _this.box1, _this.box2]),
            await Promise.all(
              _this.boxes.map((box) =>
                _this.wait(() => !!box && box.flag("isReady")),
              ),
            ),
            _this.bind("Global/selectedBottle", showTextBoxForSelectedBottle));
          const layers = await _this.layout.getAllLayers();
          ((_this.rootGroup = new Group()), _this.add(_this.rootGroup));
          const root = new Group();
          ((root.position.z = -1), (root.position.y = -1));
          const {
            mainCamera: mainCamera,
            characterRoot: characterRoot,
            test: test,
            curveLeaves: curveLeaves,
            curveLines: curveLines,
            leaves: leaves,
            lines: lines,
            bg: bg,
            lightbeam: lightbeam,
            drawnParticles: drawnParticles,
            particleRoot: particleRoot,
            dragMarker: dragMarker,
            floor: floor,
            border: border,
          } = layers;
          ((lightbeam._originalScale = lightbeam.scale.clone()),
            (lightbeam._originalPosition = lightbeam.position.clone()));
          let lastFpsTime = 0,
            lightBeamTime = 0,
            lightBeamSpeedMultiplier = { value: 1 },
            windLinesSpeedMultiplier = { value: 1 },
            skinWindSpeedMultiplier = { value: 1 },
            cameraShakeSpeedMultiplier = { value: 0 };
          ((bg.renderOrder = 0),
            (_this.dragMarker = dragMarker),
            (_this.border = border),
            (_this.border.frustumCulled = !1));
          TweenManager.addCustomEase({
            name: "speedUpEase",
            curve: "cubic-bezier(0.52, 0.02, 0.02, 1.00)",
          });
          (_this.cursor.animateSet(), _this.discButton.animateSet());
          const geometry = await GeomThread.loadSkinnedGeometry(
              "assets/geometry/story/antigravity/saint-antigravity.bin",
            ),
            shader = new Shader("AntiGravSkinShader");
          (shader.addUniforms({
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
            uColor: { value: new Color("#63C4F4") },
            uLinesTile: { value: 2.25 },
            uLightDir: { value: new Vector3(0.1, 0.1, 0.9).normalize() },
            uAxis: { value: new Vector3(1, 1, 2.5) },
            uTime: { value: 0 },
            uAngle: { value: 0.5 },
            uInverse: { value: 0 },
            uWindSpeed: { value: 1 },
            uDisplacement: { value: 0 },
            uDiscardBottom: { value: 0, ignoreUIL: !0 },
            uDiscardTop: { value: 1, ignoreUIL: !0 },
          }),
            _this.bind("Global/selectedBottle", (value) => {
              switch (value) {
                case 1:
                  shader.uniforms.uColor.value.set("#63C4F4");
                  break;
                case 2:
                  shader.uniforms.uColor.value.set("#97f3ad");
                  break;
                case 3:
                  shader.uniforms.uColor.value.set("#fbeb7f");
              }
            }),
            (lightbeam.renderOrder = 2),
            (lightbeam.frustumCulled = !1));
          const skin = new Skin(geometry, shader, geometry.bones);
          ((skin.renderOrder = 3),
            (skin.autoUpdateBoneTexture = !1),
            (_this.skin = skin),
            characterRoot.add(skin));
          const inverseGeometry = geometry,
            inverseShader = shader.clone();
          (inverseShader.set("uInverse", 1),
            inverseShader.set("uDisplacement", 1),
            (inverseShader.side = Shader.BACK_SIDE),
            (_this.inverseSkin = new Mesh(inverseGeometry, inverseShader)),
            _this.inverseSkin.upload(),
            (_this.inverseSkin.renderOrder = skin.renderOrder + 1),
            characterRoot.add(_this.inverseSkin),
            (characterRoot.rotation.y = 0.3 * Math.PI),
            root.add(characterRoot),
            root.add(lightbeam),
            root.add(particleRoot),
            root.add(curveLeaves),
            root.add(curveLines),
            _this.rootGroup.add(root),
            _this.rootGroup.add(floor));
          const animation = await skin.loadAnimation(
            "assets/geometry/story/antigravity/saint-antigravity-idle.bin",
          );
          function initCurve(curveRoot, color) {
            const curvePoints = curveRoot.children.map((child) => {
                const worldPosition = child.worldPos.clone();
                return (
                  Utils.query("debugCurves") || (child.visible = !1),
                  worldPosition
                );
              }),
              curve = new CatmullRomCurve(curvePoints),
              curve1Points = curve.getPoints(256),
              curve1LineDebug = new Line3D({ width: 20, color: color });
            return (
              curve1Points.forEach((point) => {
                curve1LineDebug.draw(point);
              }),
              Utils.query("debugCurves") && _this.add(curve1LineDebug.group),
              curve
            );
          }
          function handleResize() {
            if (!_camera) return;
            const dist = _camera.camera.position.length();
            ((_this.screenHeight = Utils3D.getHeightFromCamera(
              _camera.camera,
              dist,
            )),
              (_this.screenWidth = _this.screenHeight * _camera.camera.aspect));
            const padX = Math.range(Stage.width, 1600, 393, 0.095, 0.04, !0);
            ((_this.state.eyesWidth =
              _this.screenWidth / 2 - _this.screenWidth * padX),
              Device.mobile && (_this.state.eyesWidth += 0.1),
              (_this.state.eyesHeight = Math.range(
                Stage.width,
                1728,
                393,
                0.75,
                0.3,
                !0,
              )),
              (_this.state.zOffset = Math.range(
                Stage.width,
                1728,
                393,
                3,
                4,
                !0,
              )),
              (_this.state.eyesScale = Math.range(
                Stage.width,
                1728,
                393,
                2,
                1.3,
                !0,
              )),
              (_this.state.eyesOffsetY = Math.range(
                Stage.width,
                1728,
                393,
                0,
                1,
                !0,
              )),
              bg.scale.set(
                3 * _this.screenWidth,
                _this.screenHeight * _this.baseHeight,
                1,
              ));
            const isMobile = Stage.width / Stage.height < 1;
            ((root.position.z = -1),
              drawnParticles.setPull(isMobile ? 0.01 : 0.005),
              lightbeam.scale.copy(lightbeam._originalScale),
              lightbeam.position.copy(lightbeam._originalPosition),
              (_this.state.text1PadX = isMobile ? 0 : 0.2),
              (_this.state.text1PadY = isMobile ? 1 : 0),
              (_this.state.framePadY = 0),
              (_this.state.text1HorizontalAlign = isMobile
                ? "center"
                : "right"),
              (_this.state.text1VerticalAlign = "center"),
              (_this.state.text1Width = 440),
              (_this.border.shader.uniforms.uScreenHeightWorld.value =
                _this.getSync("Story/screenHeightWorld")),
              (_this.border.shader.uniforms.uSceneHeightWorld.value =
                _this.heightWorld),
              (_this.rootGroup.position.z = isMobile ? -1 : 0),
              (_this.rootGroup.rotation.x = 0),
              (_this.rootGroup.position.y = isMobile ? 0.2 : 0),
              (_this.layers.lightbeam.scale.x = isMobile ? 1.1 : 2.75),
              (_this.layers.lightbeam.scale.y = isMobile ? 0.9 : 0.85));
            for (const box of _this.boxes) box.handleResize();
            _this.floatingFrame1.handleResize();
          }
          (!(async function initCurves() {
            const curve1 = initCurve(curveLeaves, 6538484);
            leaves.setCurveGPU(curve1);
            const points2 = initCurve(curveLines, 16711680)
                .getPoints(256)
                .map((point) => [point.x, point.y, point.z])
                .flat(),
              windLines = _this.initClass(WindLinesSketch, {
                curves: [{ position: points2 }],
              });
            (await windLines.wait("isReady"),
              (_this.windLines = windLines.mesh),
              (_this.windLines.frustumCulled = !1),
              _this.windLines.shader.set("uAnimatePosition", 0),
              _this.windLines.shader.set("uThreshold", 0.55),
              _this.windLines.shader.set("uScroll", 0.4),
              _this.windLines.shader.set("uTile", 10),
              _this.windLines.shader.set("uSpeed", 0.8),
              root.add(_this.windLines));
            const windLines2 = _this.initClass(WindLinesSketch, {
              curves: [{ position: points2 }],
            });
            (await windLines2.wait("isReady"),
              (_this.windLines2 = windLines2.mesh),
              (_this.windLines2.frustumCulled = !1),
              _this.windLines2.shader.set("uAnimatePosition", 0),
              _this.windLines2.shader.set("uThreshold", 0.5),
              _this.windLines2.shader.set("uScroll", 0.4),
              _this.windLines2.shader.set("uTile", 5),
              _this.windLines2.shader.set("uSpeed", 0.8),
              (_this.windLines2.position.y -= 0.1),
              root.add(_this.windLines2));
            const windLines3 = _this.initClass(WindLinesSketch, {
              curves: [{ position: points2 }],
            });
            (await windLines3.wait("isReady"),
              (_this.windLines3 = windLines3.mesh),
              (_this.windLines3.frustumCulled = !1),
              _this.windLines3.shader.set("uAnimatePosition", 0),
              _this.windLines3.shader.set("uThreshold", 0.5),
              _this.windLines3.shader.set("uScroll", 0.4),
              _this.windLines3.shader.set("uTile", 5),
              _this.windLines3.shader.set("uSpeed", 0.8),
              (_this.windLines3.position.y += 0.3),
              root.add(_this.windLines3),
              (_this.windLinesAll = [
                _this.windLines,
                _this.windLines2,
                _this.windLines3,
              ]),
              _this.windLinesAll.forEach((windLine) => {
                windLine.position.z = 1;
              }),
              _this.flag("windLinesReady", !0));
          })(),
            (_this.setDrawCoords = (x, y) => {
              const normalizedX = x / _this.ui.element.div.clientWidth,
                normalizedY = 1 - y / _this.ui.element.div.clientHeight;
              drawnParticles.setDrawCoords({ x: normalizedX, y: normalizedY });
            }),
            (_this.onDrawDown = () => {
              _this.visible &&
                _this.canDraw &&
                (drawnParticles.onDrawDown(),
                GoogleAnalytics.track("antigravity_draw_start"));
            }),
            (_this.onDrawMove = (point) => {
              _this.canDraw && drawnParticles.onDrawMove(point);
            }),
            (_this.onDrawUp = () => {
              _this.visible &&
                (drawnParticles.onDrawUp(),
                GoogleAnalytics.track("antigravity_draw_stop"),
                AudioUtils.playOneShot("antigravity_release"));
            }),
            (_this.onDiscHoldStart = (e) => {
              ((_this.canDraw = !0),
                _this.setDrawCoords(
                  e?.clientX ?? Mouse.x,
                  e?.clientY ?? Mouse.y,
                ),
                _this.onDrawDown());
            }),
            (_this.onDiscHoldEnd = () => {
              Device.mobile && ((_this.canDraw = !1), _this.onDrawUp());
            }),
            (_this.animateLightbeam = () => {
              (lightbeam.shader.tween("uAnimateInMask", 1, 4e3, "easeOutQuint"),
                lightbeam.shader.tween("uAnimateNoise", 1, 5e3, "easeOutQuint"),
                tween(
                  characterRoot.position,
                  { y: -1.45 },
                  3e3,
                  "easeOutQuint",
                  400,
                ));
            }),
            (floor._position = floor.position.clone()),
            _this.startRender(() => {
              ((animation.elapsed += 0.02 * Render.DELTA), skin.update());
              Mouse.tilt.y;
              const gestureY = Mouse.tilt.x;
              if (
                ((characterRoot.rotation.y = Math.lerp(
                  0.1 * Math.PI - 0.2 * gestureY,
                  characterRoot.rotation.y,
                  0.05,
                )),
                Device.mobile)
              ) {
                const rect = _this.ui.element.div.getBoundingClientRect();
                _this.discButton.updatePosOnHold({
                  x: 0.65 * Stage.width,
                  y: 0.7 * rect.bottom,
                });
              }
              var now = performance.now();
              now - lastFpsTime < 41.666666666666664 ||
                ((lightBeamTime +=
                  0.005 * Render.DELTA * lightBeamSpeedMultiplier.value),
                (lightbeam.shader.uniforms.uTime.value = lightBeamTime),
                (lightbeam.shader.uniforms.uTimeUp.value = 4 * lightBeamTime),
                (lastFpsTime = now),
                _this.windLinesAll.forEach((windLine) => {
                  windLine.shader.uniforms.uTime.value +=
                    0.005 * Render.DELTA * windLinesSpeedMultiplier.value;
                }),
                (_this.skin.shader.uniforms.uTime.value +=
                  0.005 * Render.DELTA * skinWindSpeedMultiplier.value),
                (_this.inverseSkin.shader.uniforms.uTime.value +=
                  0.005 * Render.DELTA * skinWindSpeedMultiplier.value),
                cameraShakeSpeedMultiplier.value < 0.1 &&
                  (cameraShakeSpeedMultiplier.value = 0),
                (root.position.x =
                  0.0035 *
                  Math.sin(10 * Render.TIME) *
                  cameraShakeSpeedMultiplier.value),
                (root.position.y =
                  0.0035 *
                    Math.cos(10 * (Render.TIME + 10)) *
                    cameraShakeSpeedMultiplier.value -
                  1),
                (floor.position.x =
                  floor._position.x +
                  0.0035 *
                    Math.sin(10 * Render.TIME) *
                    cameraShakeSpeedMultiplier.value),
                (floor.position.y =
                  floor._position.y +
                  0.0035 *
                    Math.cos(10 * (Render.TIME + 10)) *
                    cameraShakeSpeedMultiplier.value),
                (function updateSpeedUpLoop(progress) {
                  (_this.AUDIO_MANAGER.setVolume(
                    "antigravity_speed_up",
                    progress,
                    { smoothing: 0.2 },
                  ),
                    vortexFocusEffectChain.mixWetDry(progress));
                })(cameraShakeSpeedMultiplier.value),
                (function updateSpawnLoop(progress) {
                  _this.AUDIO_MANAGER.setVolume("antigravity_spawn", progress, {
                    smoothing: 0.2,
                  });
                })(cameraShakeSpeedMultiplier.value));
            }),
            _this.isPlayground()
              ? ((_camera = mainCamera),
                (_this.floatingFrame1.visible = !1),
                (Global.CAMERA = mainCamera))
              : (await _this.wait(() => !!Global.CAMERA),
                (_camera = Global.CAMERA),
                _this.bind("Story/scrollY", (value) => {
                  if (!_this.flag("windLinesReady")) return;
                  const discardTop =
                      (_this.worldTop + value) /
                      _this.get("Story/screenHeightWorld"),
                    discardBottom =
                      (_this.worldBottom + value) /
                      _this.get("Story/screenHeightWorld");
                  ((lightbeam.shader.uniforms.uDiscardTop.value = discardTop),
                    (lightbeam.shader.uniforms.uDiscardBottom.value =
                      discardBottom),
                    _this.windLinesAll.forEach((windLine) => {
                      ((windLine.shader.uniforms.uDiscardTop.value =
                        discardTop),
                        (windLine.shader.uniforms.uDiscardBottom.value =
                          discardBottom));
                    }));
                }),
                _this.bind("DrawnParticles/Drawing", (value) => {
                  value
                    ? (tween(
                        lightBeamSpeedMultiplier,
                        { value: 8 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        windLinesSpeedMultiplier,
                        { value: 4 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        cameraShakeSpeedMultiplier,
                        { value: 1 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        skinWindSpeedMultiplier,
                        { value: 3.5 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        characterRoot.rotation,
                        { z: 0.045 * Math.PI },
                        6e3,
                        "speedUpEase",
                      ),
                      tween(
                        characterRoot.position,
                        { x: 0.4, y: -1.45 },
                        6e3,
                        "speedUpEase",
                      ),
                      tween(
                        Global.CAMERA.camera,
                        { zoom: 1.1 },
                        6e3,
                        "speedUpEase",
                      ),
                      lightbeam.shader.tween("uDraw", 1, 6e3, "speedUpEase"))
                    : (tween(
                        lightBeamSpeedMultiplier,
                        { value: 1 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        windLinesSpeedMultiplier,
                        { value: 1 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        skinWindSpeedMultiplier,
                        { value: 1 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        cameraShakeSpeedMultiplier,
                        { value: 0 },
                        3e3,
                        "speedUpEase",
                      ),
                      tween(
                        characterRoot.rotation,
                        { z: 0 },
                        6e3,
                        "speedUpEase",
                      ),
                      tween(
                        characterRoot.position,
                        { x: 0, y: -1.45 },
                        6e3,
                        "speedUpEase",
                      ),
                      tween(
                        Global.CAMERA.camera,
                        { zoom: 1 },
                        6e3,
                        "speedUpEase",
                      ),
                      lightbeam.shader.tween("uDraw", 0, 6e3, "speedUpEase"));
                })),
            (_this.onInView = () => {}),
            (_this.onViewOut = () => {
              ((cameraShakeSpeedMultiplier.value = 0),
                console.log(
                  "cameraShakeSpeedMultiplier",
                  cameraShakeSpeedMultiplier.value,
                ));
            }),
            _this.isPlayground() &&
              (handleResize(), _camera.lock(), _this.onInView()),
            (_this.handleResize = handleResize));
        }),
        (onInit = _this.onInit === onInit ? null : _this.onInit));
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_this.box0 = _this.initClass(
          TextBox,
          (function () {
            let params = AppState.createLocal({
              padx: _this.state.text1PadX,
              pady: _this.state.text1PadY,
              offsetZ: _this.state.text1OffsetZ,
              horizontalAlign: _this.state.text1HorizontalAlign,
              verticalAlign: _this.state.text1VerticalAlign,
              body: copy_orange,
              color: "black",
              width: _this.state.text1Width,
              id: "orange",
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
              _this.bindState(_this.state, ["text1Width"], (val) => {
                params.width = val;
              }),
              params
            );
          })(),
        )),
        _this.box0.isFragment &&
          _promises.push(_this.wait(_this.box0, "__ready")),
        (_this.box1 = _this.initClass(
          TextBox,
          (function () {
            let params = AppState.createLocal({
              padx: _this.state.text1PadX,
              pady: _this.state.text1PadY,
              offsetZ: _this.state.text1OffsetZ,
              horizontalAlign: _this.state.text1HorizontalAlign,
              verticalAlign: _this.state.text1VerticalAlign,
              body: copy_mint,
              color: "black",
              width: _this.state.text1Width,
              id: 14,
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
              padx: _this.state.text1PadX,
              pady: _this.state.text1PadY,
              offsetZ: _this.state.text1OffsetZ,
              horizontalAlign: _this.state.text1HorizontalAlign,
              verticalAlign: _this.state.text1VerticalAlign,
              body: copy_marshmallow,
              color: "black",
              width: _this.state.text1Width,
              id: "marshmallow",
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
              _this.bindState(_this.state, ["text1Width"], (val) => {
                params.width = val;
              }),
              params
            );
          })(),
        )),
        _this.box2.isFragment &&
          _promises.push(_this.wait(_this.box2, "__ready")),
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
            let params = AppState.createLocal({ text: _this.state.cursorText });
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
        (_this.floatingFrame1 = _this.initClass(
          FloatingFrameEyesAG,
          (function () {
            let params = AppState.createLocal({
              verticalAlign: "top",
              pady: _this.state.framePadY,
              padx: 0,
              frameWidth: _this.state.eyesWidth,
              frameHeight: _this.state.eyesHeight,
              frameZ: 0,
              zOffset: _this.state.zOffset,
              scale: _this.state.eyesScale,
              offsetY: _this.state.eyesOffsetY,
            });
            return (
              _this.bindState(_this.state, ["framePadY"], (val) => {
                params.pady = val;
              }),
              _this.bindState(_this.state, ["eyesWidth"], (val) => {
                params.frameWidth = val;
              }),
              _this.bindState(_this.state, ["eyesHeight"], (val) => {
                params.frameHeight = val;
              }),
              _this.bindState(_this.state, ["zOffset"], (val) => {
                params.zOffset = val;
              }),
              _this.bindState(_this.state, ["eyesScale"], (val) => {
                params.scale = val;
              }),
              _this.bindState(_this.state, ["eyesOffsetY"], (val) => {
                params.offsetY = val;
              }),
              params
            );
          })(),
        )),
        _this.floatingFrame1.isFragment &&
          _promises.push(_this.wait(_this.floatingFrame1, "__ready")),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "AntiGravityScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }