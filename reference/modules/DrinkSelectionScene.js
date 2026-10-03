function DrinkSelectionScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "DrinkSelectionScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "DrinkSelectionScene"),
      (_this.contexts = "BaseView, 'DrinkSelectionScene'"),
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
        onInit = _this.onInit;
      ((_this.state.text1PadX = 0.2),
        (_this.state.text1PadY = 1.5),
        (_this.state.text1OffsetZ = 0.45),
        (_this.state.text1HorizontalAlign = "left"),
        (_this.state.text1VerticalAlign = "top"),
        (_this.state.text1Body =
          "IN FRONT OF HIM A LARGE PEDESTAL PULSATES WITH LIGHT."),
        (_this.state.text2PadX = 0.2),
        (_this.state.text2PadY = -1),
        (_this.state.text2OffsetZ = 0.45),
        (_this.state.text2HorizontalAlign = "right"),
        (_this.state.text2VerticalAlign = "center"),
        (_this.state.text2Body =
          "THREE SANTIONI SPIRITS BOTTLES GLINT ON THE TABLE, VIBRATING WITH A TANTILIZING SHIMMER. THE SAINT PAUSES SOMEHOW… THEY'RE CALLING TO HIM, INVITING HIM TO INDULGE."),
        (_this.state.text2Width = 440),
        (_this.state.cursorText = "Choose\nFlavor"),
        (_this.canInteract = !1));
      let [input, appState] = _this.createUIL("Drink Selection Scene Config");
      function handleResize() {
        const isMobile = Stage.width / Stage.height < 1;
        ((_this.state.text1PadX = isMobile ? 0.03 : 0.2),
          (_this.state.text1PadY = isMobile ? 1 : 1.5),
          (_this.state.text1Width = isMobile ? 0.6 * Stage.width : 440),
          (_this.state.text1OffsetZ = isMobile ? 0.2 : 0.45),
          (_this.state.text1HorizontalAlign = isMobile ? "right" : "left"),
          (_this.state.text2PadX = isMobile ? 0 : 0.2),
          (_this.state.text2PadY = isMobile ? -1.4 : -1),
          (_this.state.text2OffsetZ = 0.45),
          (_this.state.text2HorizontalAlign = isMobile ? "center" : "right"),
          (_this.state.text2VerticalAlign = "center"),
          (_this.state.text2Width = isMobile ? 0.65 * Stage.width : 440),
          (_this.border.shader.uniforms.uScreenHeightWorld.value =
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
          _this.bottle1Root.scale.setScalar(isMobile ? 0.85 : 1.15),
          _this.bottle2Root.scale.setScalar(isMobile ? 0.85 : 1.15),
          _this.bottle3Root.scale.setScalar(isMobile ? 0.85 : 1.15),
          _this.bottle1Group.scale.setScalar(isMobile ? 0.7 : 1),
          _this.bottle2Group.scale.setScalar(isMobile ? 0.7 : 1),
          _this.bottle3Group.scale.setScalar(isMobile ? 0.7 : 1),
          _this.bottle1Root._initialPosition ||
            (_this.bottle1Root._initialPosition =
              _this.bottle1Root.position.clone()),
          _this.bottle3Root._initialPosition ||
            (_this.bottle3Root._initialPosition =
              _this.bottle3Root.position.clone()),
          (_this.bottle1Root.position.x = isMobile
            ? _this.bottle1Root._initialPosition.x + 0.3
            : _this.bottle1Root._initialPosition.x),
          (_this.bottle3Root.position.x = isMobile
            ? _this.bottle3Root._initialPosition.x - 0.3
            : _this.bottle3Root._initialPosition.x),
          _this.bottle1Group._initialPosition ||
            (_this.bottle1Group._initialPosition =
              _this.bottle1Group.position.clone()),
          _this.bottle3Group._initialPosition ||
            (_this.bottle3Group._initialPosition =
              _this.bottle3Group.position.clone()),
          (_this.bottle1Group.position.x = isMobile
            ? _this.bottle1Group._initialPosition.x + 0.3
            : _this.bottle1Group._initialPosition.x),
          (_this.bottle3Group.position.x = isMobile
            ? _this.bottle3Group._initialPosition.x - 0.3
            : _this.bottle3Group._initialPosition.x),
          _this.box1.handleResize(),
          _this.box2.handleResize());
      }
      (input.addNumber("wobbleMax", 5),
        input.addNumber("wobbleVelMultiplier", 10),
        input.addNumber("wobblePulseFrequency", 0.1),
        input.addNumber("wobblePulseSpeed", 0.001),
        input.addNumber("wobbleDecay", 10),
        input.addNumber("windLinesSpeed", 0.5),
        (_this.init = async () => {
          ((_camera = _this.isPlayground()
            ? Story.createCamera(!1)
            : Global.CAMERA),
            await _this.wait(
              () => _this.box1.flag("isReady") && _this.box2.flag("isReady"),
            ),
            _this.box1.animateSet(),
            _this.box2.animateSet(),
            _this.cursor.animateSet());
          const {
            border: border,
            landscape: landscape,
            foregroundplinth: foregroundplinth,
            backgroundplinth: backgroundplinth,
            structure: structure,
            bottle1: bottle1,
            bottle2: bottle2,
            bottle3: bottle3,
            character: character,
            plinth_bottle1: plinth_bottle1,
            plinth_bottle2: plinth_bottle2,
            plinth_bottle3: plinth_bottle3,
            bottle1Group: bottle1Group,
            bottle2Group: bottle2Group,
            bottle3Group: bottle3Group,
            hit1: hit1,
            hit2: hit2,
            hit3: hit3,
            shadow1: shadow1,
            shadow2: shadow2,
            shadow3: shadow3,
          } = _this.layers;
          ((shadow1._initialScale = shadow1.scale.clone()),
            (shadow2._initialScale = shadow2.scale.clone()),
            (shadow3._initialScale = shadow3.scale.clone()),
            _this.isPlayground() && (_this.group.position.y = 2),
            (_this.border = border));
          const bottle1Root = new Group(),
            bottle1Transform = new Group(),
            bottle1Rotation = new Group();
          (bottle1Root.add(bottle1Transform),
            bottle1Transform.add(bottle1Rotation),
            bottle1Rotation.add(bottle1),
            _this.add(bottle1Root),
            (_this.bottle1Root = bottle1Root),
            (_this.bottle1Group = bottle1Group),
            bottle1Root.position.copy(bottle1Group.position),
            bottle1Root.scale.setScalar(1.15));
          const bottle2Root = new Group(),
            bottle2Transform = new Group(),
            bottle2Rotation = new Group();
          (bottle2Root.add(bottle2Transform),
            bottle2Transform.add(bottle2Rotation),
            bottle2Rotation.add(bottle2),
            _this.add(bottle2Root),
            (_this.bottle2Root = bottle2Root),
            (_this.bottle2Group = bottle2Group),
            bottle2Root.position.copy(bottle2Group.position),
            bottle2Root.scale.setScalar(1.15));
          const bottle3Root = new Group(),
            bottle3Transform = new Group(),
            bottle3Rotation = new Group();
          (bottle3Root.add(bottle3Transform),
            bottle3Transform.add(bottle3Rotation),
            bottle3Rotation.add(bottle3),
            _this.add(bottle3Root),
            (_this.bottle3Root = bottle3Root),
            (_this.bottle3Group = bottle3Group),
            bottle3Root.position.copy(bottle3Group.position),
            bottle3Root.scale.setScalar(1.15),
            (bottle1.parentGroup = bottle1Rotation),
            (bottle2.parentGroup = bottle2Rotation),
            (bottle3.parentGroup = bottle3Rotation));
          [
            landscape,
            foregroundplinth,
            backgroundplinth,
            structure,
            bottle1,
            bottle2,
            bottle3,
            plinth_bottle1,
            plinth_bottle2,
            plinth_bottle3,
          ].forEach((layer) => {
            const shader = _this.initClass(
              Shader,
              "StaticObjectBaseShaderInverse",
              { uLineWidth: { value: 0.003 } },
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
              layer.parentGroup
                ? layer.parentGroup.add(mesh)
                : _this.add(mesh));
          });
          const shader = _this.initClass(
            Shader,
            "StaticCharacterBaseShaderInverse",
            {
              uLineWidth: { value: 0.008 },
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
            _this.add(mesh),
            mesh.upload(),
            (_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.geometry = _this.border.geometry.clone()),
            (_this.border.geometry.boundingSphere.radius = _this.heightWorld));
          let _t = 0;
          const bottleState = {
              first: 0,
              firstUv: { x: 0.5, y: 0.5 },
              firstMagnet: { x: 0, y: 0 },
              second: 0,
              secondUv: { x: 0.5, y: 0.5 },
              secondMagnet: { x: 0, y: 0 },
              third: 0,
              thirdUv: { x: 0.5, y: 0.5 },
              thirdMagnet: { x: 0, y: 0 },
            },
            baseRotations = {
              first: bottle1Root.rotation.y,
              second: bottle2Root.rotation.y,
              third: bottle3Root.rotation.y,
            },
            rotationState = {
              first: baseRotations.first,
              second: baseRotations.second,
              third: baseRotations.third,
            },
            continuousOffset = { first: 0, second: 0, third: 0 },
            getNextFullRotation = (current, base) => {
              const normalizedDelta = Math.mod(current - base, Math.PI2),
                toAlignment = Math.PI2 - normalizedDelta;
              return toAlignment < 0.75 * Math.PI2
                ? current + Math.PI2 + toAlignment
                : current + toAlignment;
            },
            firstProgress = { value: 2 },
            secondProgress = { value: 2 },
            thirdProgress = { value: 2 };
          let tweenHover,
            tweenRotationState,
            offsetX = 0,
            offsetY = 0,
            targetX = 0,
            targetY = 0;
          (_this.startRender(function loop() {
            _t += 0.01 * Render.DELTA;
            const y = 0.05 * Math.sin(0.1 * _t) + 0.2;
            ((continuousOffset.first +=
              0.01 * bottleState.first * Render.HZ_MULTIPLIER),
              (continuousOffset.second +=
                0.01 * bottleState.second * Render.HZ_MULTIPLIER),
              (continuousOffset.third +=
                0.01 * bottleState.third * Render.HZ_MULTIPLIER),
              (offsetX = 2 * bottleState.firstUv.x - 1),
              (offsetY = 2 * bottleState.firstUv.y - 1),
              (targetX = 0.1 * offsetX),
              (targetY = 0.1 * offsetY),
              (bottleState.firstMagnet.x = Math.lerp(
                targetX,
                bottleState.firstMagnet.x,
                0.05,
              )),
              (bottleState.firstMagnet.y = Math.lerp(
                targetY,
                bottleState.firstMagnet.y,
                0.05,
              )),
              (bottle1Transform.position.x = bottleState.firstMagnet.x),
              (bottle1Transform.position.y =
                Math.mix(0, y, bottleState.first) + bottleState.firstMagnet.y),
              (bottle1Rotation.rotation.y =
                rotationState.first + continuousOffset.first),
              (bottle1Transform.rotation.z = Math.mix(
                0,
                0.05 * Math.cos(0.1 * _t),
                bottleState.first,
              )),
              (offsetX = 2 * bottleState.secondUv.x - 1),
              (offsetY = 2 * bottleState.secondUv.y - 1),
              (targetX = 0.1 * offsetX),
              (targetY = 0.1 * offsetY),
              (bottleState.secondMagnet.x = Math.lerp(
                targetX,
                bottleState.secondMagnet.x,
                0.05,
              )),
              (bottleState.secondMagnet.y = Math.lerp(
                targetY,
                bottleState.secondMagnet.y,
                0.05,
              )),
              (bottle2Transform.position.x = bottleState.secondMagnet.x),
              (bottle2Transform.position.y =
                Math.mix(0, y, bottleState.second) +
                bottleState.secondMagnet.y),
              (bottle2Rotation.rotation.y =
                rotationState.second + continuousOffset.second),
              (bottle2Transform.rotation.z = Math.mix(
                0,
                0.05 * Math.cos(0.1 * _t),
                bottleState.second,
              )),
              (offsetX = 2 * bottleState.thirdUv.x - 1),
              (offsetY = 2 * bottleState.thirdUv.y - 1),
              (targetX = 0.1 * offsetX),
              (targetY = 0.1 * offsetY),
              (bottleState.thirdMagnet.x = Math.lerp(
                targetX,
                bottleState.thirdMagnet.x,
                0.05,
              )),
              (bottleState.thirdMagnet.y = Math.lerp(
                targetY,
                bottleState.thirdMagnet.y,
                0.05,
              )),
              (bottle3Transform.position.x = bottleState.thirdMagnet.x),
              (bottle3Transform.position.y =
                Math.mix(0, y, bottleState.third) + bottleState.thirdMagnet.y),
              (bottle3Rotation.rotation.y =
                rotationState.third + continuousOffset.third),
              (bottle3Transform.rotation.z = Math.mix(
                0,
                0.05 * Math.cos(0.1 * _t),
                bottleState.third,
              )));
            const shadowNear = Math.range(y, 0, 0.2, 1, 1.2);
            ((shadow1.scale.x = Math.mix(
              shadow1._initialScale.x,
              shadow1._initialScale.x * shadowNear,
              bottleState.first,
            )),
              (shadow1.scale.y = shadow1.scale.x),
              (shadow1.shader.uniforms.uLinesStrength.value = Math.mix(
                0.6,
                0.55,
                bottleState.first,
              )),
              (shadow2.scale.x = Math.mix(
                shadow2._initialScale.x,
                shadow2._initialScale.x * shadowNear,
                bottleState.second,
              )),
              (shadow2.scale.y = shadow2.scale.x),
              (shadow2.shader.uniforms.uLinesStrength.value = Math.mix(
                0.6,
                0.55,
                bottleState.second,
              )),
              (shadow3.scale.x = Math.mix(
                shadow3._initialScale.x,
                shadow3._initialScale.x * shadowNear,
                bottleState.third,
              )),
              (shadow3.scale.y = shadow3.scale.x),
              (shadow3.shader.uniforms.uLinesStrength.value = Math.mix(
                0.6,
                0.55,
                bottleState.third,
              )),
              _this.AUDIO_MANAGER.setVolume(
                "bottle_levitate",
                (function getBottleLevitateVolume() {
                  const baseGain =
                    _this.AUDIO_MANAGER.getAudio("bottle_levitate").baseGain;
                  let scrollInfluence =
                    _this.scrollProgress <= 0.9
                      ? Math.range(_this.scrollProgress, 0.45, 0.55, 0, 1, !0)
                      : Math.range(_this.scrollProgress, 0.9, 1, 1, 0, !0);
                  return baseGain * scrollInfluence;
                })(),
              ));
          }),
            (blobsRelease = {
              first: () => {},
              second: () => {},
              third: () => {},
            }));
          const onHover = (index) => (e) => {
              if (!_this.canInteract) return;
              recordUv(index, e.hit?.uv || { x: 0.5, y: 0.5 });
              const selectedBottle = _this.getSync("Global/selectedBottle"),
                interactionSelected = _this.flag("interactionSelected"),
                isActiveBottle = _this.flag("activeBottle") === index;
              if (!(
                interactionSelected === index && selectedBottle === index
              )) {
                if ("over" === e.action) {
                  if (isActiveBottle) return;
                  if ((tweenRotationState?.stop(), 1 === index)) {
                    const currentTotal =
                        rotationState.first + continuousOffset.first,
                      target = getNextFullRotation(
                        currentTotal,
                        baseRotations.first,
                      );
                    ((continuousOffset.first = 0),
                      (rotationState.first = currentTotal),
                      (rotationState.firstTarget = target));
                  }
                  if (2 === index) {
                    const currentTotal =
                        rotationState.second + continuousOffset.second,
                      target = getNextFullRotation(
                        currentTotal,
                        baseRotations.second,
                      );
                    ((continuousOffset.second = 0),
                      (rotationState.second = currentTotal),
                      (rotationState.secondTarget = target));
                  }
                  if (3 === index) {
                    const currentTotal =
                        rotationState.third + continuousOffset.third,
                      target = getNextFullRotation(
                        currentTotal,
                        baseRotations.third,
                      );
                    ((continuousOffset.third = 0),
                      (rotationState.third = currentTotal),
                      (rotationState.thirdTarget = target));
                  }
                  (_this.flag("activeBottle", index),
                    selectedBottle !== index && _this.cursor.animateIn(),
                    (tweenRotationState = tween(
                      rotationState,
                      {
                        first: rotationState.firstTarget || rotationState.first,
                        second:
                          rotationState.secondTarget || rotationState.second,
                        third: rotationState.thirdTarget || rotationState.third,
                      },
                      800,
                      "easeOutCubic",
                    )),
                    tweenHover?.stop(),
                    (tweenHover = tween(
                      bottleState,
                      {
                        first: 1 === index || 1 === selectedBottle ? 1 : 0,
                        second: 2 === index || 2 === selectedBottle ? 1 : 0,
                        third: 3 === index || 3 === selectedBottle ? 1 : 0,
                      },
                      800,
                      "easeOutCubic",
                    )),
                    AudioUtils.playRoundRobin("bottle_hover", {
                      allowSimultaneous: !0,
                    }));
                } else {
                  if (
                    (tweenRotationState?.stop(),
                    1 === index && 1 !== selectedBottle)
                  ) {
                    const currentTotal =
                        rotationState.first + continuousOffset.first,
                      target = getNextFullRotation(
                        rotationState.firstTarget
                          ? rotationState.firstTarget + continuousOffset.first
                          : currentTotal,
                        baseRotations.first,
                      );
                    ((continuousOffset.first = 0),
                      (rotationState.first = currentTotal),
                      (rotationState.firstTarget = target));
                  }
                  if (2 === index && 2 !== selectedBottle) {
                    const currentTotal =
                        rotationState.second + continuousOffset.second,
                      target = getNextFullRotation(
                        rotationState.secondTarget
                          ? rotationState.secondTarget + continuousOffset.second
                          : currentTotal,
                        baseRotations.second,
                      );
                    ((continuousOffset.second = 0),
                      (rotationState.second = currentTotal),
                      (rotationState.secondTarget = target));
                  }
                  if (3 === index && 3 !== selectedBottle) {
                    const currentTotal =
                        rotationState.third + continuousOffset.third,
                      target = getNextFullRotation(
                        rotationState.thirdTarget
                          ? rotationState.thirdTarget + continuousOffset.third
                          : currentTotal,
                        baseRotations.third,
                      );
                    ((continuousOffset.third = 0),
                      (rotationState.third = currentTotal),
                      (rotationState.thirdTarget = target));
                  }
                  ((tweenRotationState = tween(
                    rotationState,
                    {
                      first: rotationState.firstTarget || rotationState.first,
                      second:
                        rotationState.secondTarget || rotationState.second,
                      third: rotationState.thirdTarget || rotationState.third,
                    },
                    800,
                    "easeOutCubic",
                  )),
                    tweenHover?.stop(),
                    (tweenHover = tween(
                      bottleState,
                      {
                        first: 1 !== selectedBottle ? 0 : 1,
                        second: 2 !== selectedBottle ? 0 : 1,
                        third: 3 !== selectedBottle ? 0 : 1,
                      },
                      600,
                      "easeOutCubic",
                    )),
                    _this.flag("activeBottle", null),
                    _this.cursor.animateOut());
                }
                _this.flag("interactionSelected", selectedBottle);
              }
            },
            onClick =
              (index, options = {}) =>
              () => {
                if (!_this.canInteract && !options.force) return;
                let timeMul = options.timeMul || 1;
                const prevSelectedBottle = _this.getSync(
                  "Global/selectedBottle",
                );
                if (
                  (1 !== index && blobsRelease.first(),
                  2 !== index && blobsRelease.second(),
                  3 !== index && blobsRelease.third(),
                  1 !== index &&
                    tween(
                      firstProgress,
                      { value: 2 },
                      1200 * timeMul,
                      "easeOutCubic",
                    ),
                  2 !== index &&
                    tween(
                      secondProgress,
                      { value: 2 },
                      1200 * timeMul,
                      "easeOutCubic",
                    ),
                  3 !== index &&
                    tween(
                      thirdProgress,
                      { value: 2 },
                      1200 * timeMul,
                      "easeOutCubic",
                    ),
                  tweenRotationState?.stop(),
                  (1 !== index && 1 === prevSelectedBottle) || 1 === index)
                ) {
                  const currentTotal =
                      rotationState.first + continuousOffset.first,
                    target = getNextFullRotation(
                      currentTotal,
                      baseRotations.first,
                    );
                  ((continuousOffset.first = 0),
                    (rotationState.first = currentTotal),
                    (rotationState.firstTarget = target));
                }
                if ((2 !== index && 2 === prevSelectedBottle) || 2 === index) {
                  const currentTotal =
                      rotationState.second + continuousOffset.second,
                    target = getNextFullRotation(
                      currentTotal,
                      baseRotations.second,
                    );
                  ((continuousOffset.second = 0),
                    (rotationState.second = currentTotal),
                    (rotationState.secondTarget = target));
                }
                if ((3 !== index && 3 === prevSelectedBottle) || 3 === index) {
                  const currentTotal =
                      rotationState.third + continuousOffset.third,
                    target = getNextFullRotation(
                      currentTotal,
                      baseRotations.third,
                    );
                  ((continuousOffset.third = 0),
                    (rotationState.third = currentTotal),
                    (rotationState.thirdTarget = target));
                }
                switch (
                  ((tweenRotationState = tween(
                    rotationState,
                    {
                      first: rotationState.firstTarget || rotationState.first,
                      second:
                        rotationState.secondTarget || rotationState.second,
                      third: rotationState.thirdTarget || rotationState.third,
                    },
                    800 * timeMul,
                    "easeOutCubic",
                  )),
                  index)
                ) {
                  case 1:
                    if (1 === prevSelectedBottle) break;
                    ((firstProgress.value = 0),
                      tween(
                        firstProgress,
                        { value: 1 },
                        600 * timeMul,
                        "easeOutCubic",
                      ),
                      (blobsRelease.first = _this.layers.blobs1.releaseBatch(
                        new Vector3(0, 0, 0),
                      )));
                    break;
                  case 2:
                    if (2 === prevSelectedBottle) break;
                    ((secondProgress.value = 0),
                      tween(
                        secondProgress,
                        { value: 1 },
                        600 * timeMul,
                        "easeOutCubic",
                      ),
                      (blobsRelease.second = _this.layers.blobs2.releaseBatch(
                        new Vector3(0, 0, 0),
                      )));
                    break;
                  case 3:
                    if (3 === prevSelectedBottle) break;
                    ((thirdProgress.value = 0),
                      tween(
                        thirdProgress,
                        { value: 1 },
                        600 * timeMul,
                        "easeOutCubic",
                      ),
                      (blobsRelease.third = _this.layers.blobs3.releaseBatch(
                        new Vector3(0, 0, 0),
                      )));
                }
                (_this.cursor.animateOut(),
                  tweenHover?.stop(),
                  (tweenHover = tween(
                    bottleState,
                    {
                      first: 1 !== index ? 0 : 1,
                      second: 2 !== index ? 0 : 1,
                      third: 3 !== index ? 0 : 1,
                    },
                    600 * timeMul,
                    "easeOutCubic",
                  )),
                  _this.set("Global/selectedBottle", index),
                  _this.flag("interactionSelected", null),
                  GoogleAnalytics.track(`drinkselection_select_${index}`),
                  options.suppressAudio ||
                    AudioUtils.playOneShot("bottle_interact"));
              };
          function recordUv(index, uv) {
            switch (index) {
              case 1:
                ((bottleState.firstUv.x = uv.x),
                  (bottleState.firstUv.y = uv.y));
                break;
              case 2:
                ((bottleState.secondUv.x = uv.x),
                  (bottleState.secondUv.y = uv.y));
                break;
              case 3:
                ((bottleState.thirdUv.x = uv.x),
                  (bottleState.thirdUv.y = uv.y));
            }
          }
          const onMove = (index) => (e) => {
            if (!_this.canInteract) return;
            const uv = e.hit.uv;
            recordUv(index, uv);
          };
          ((hit1.shader.neverRender = !Utils.query("debugHit")),
            (hit2.shader.neverRender = !Utils.query("debugHit")),
            (hit3.shader.neverRender = !Utils.query("debugHit")));
          const interaction3d = Interaction3D.find(_camera);
          function getVortexPoints(
            numPoints,
            radius = 0.4,
            height = 1.4,
            spirals = 1,
            startY = 0,
          ) {
            const points = [];
            for (let i = 0; i < numPoints; i++) {
              const t = i / (numPoints - 1 || 1),
                angle = t * Math.PI2 * spirals,
                y = t * height + startY;
              points.push(
                Math.cos(angle) * radius,
                y,
                Math.sin(angle) * radius,
              );
            }
            return points;
          }
          (_this.cursor.registerHit(
            interaction3d,
            hit1,
            onHover(1),
            onClick(1),
            onMove(1),
          ),
            _this.cursor.registerHit(
              interaction3d,
              hit2,
              onHover(2),
              onClick(2),
              onMove(2),
            ),
            _this.cursor.registerHit(
              interaction3d,
              hit3,
              onHover(3),
              onClick(3),
              onMove(3),
            ),
            _this.cursor.registerCollider(foregroundplinth));
          const curvePoints = getVortexPoints(128),
            curvePointsFlipped = getVortexPoints(128, -0.4),
            curve = new Curve(getVortexPoints(6, 0.4, 1.4, 1, 0.4)),
            windLinesCurves = [{ position: curvePoints }],
            windLinesCurvesFlipped = [{ position: curvePointsFlipped }],
            windShader = _this.createFragment(Shader, "DrinkLineShader", {
              tMap: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/story/clouds_noise.png",
                ),
              },
              uScroll: { value: 1.65 },
              uThreshold: { value: 0.4 },
              uSpeed: { value: 2 },
              uTile: { value: 10 },
              uFrameRate: { value: 60 },
              uThickness: { value: 0.0075 },
              uAnimate: firstProgress,
              uDiscardBottom: { value: 0, ignoreUIL: !0 },
              uDiscardTop: { value: 1, ignoreUIL: !0 },
            }),
            windLines = _this.initClass(
              WindLines,
              { curves: windLinesCurves },
              windShader,
            );
          await windLines.wait("isReady");
          const windLinesMesh = windLines.mesh;
          ((windLinesMesh.frustumCulled = !1),
            (windLinesMesh.shader.uniforms.uAnimate = firstProgress),
            windLinesMesh.shader.set("uScroll", 1.65),
            windLinesMesh.shader.set("uThreshold", 0.4),
            windLinesMesh.shader.set("uSpeed", 0.5),
            windLinesMesh.shader.set("uTile", 10),
            (windLinesMesh.position.y = 0.4),
            bottle1Group.add(windLinesMesh));
          const windLines2 = _this.initClass(
            WindLines,
            { curves: windLinesCurvesFlipped },
            windShader.clone(),
          );
          await windLines2.wait("isReady");
          const windLines2Mesh = windLines2.mesh;
          ((windLines2Mesh.frustumCulled = !1),
            (windLines2Mesh.shader.uniforms.uAnimate = firstProgress),
            windLines2Mesh.shader.set("uScroll", 1.35),
            windLines2Mesh.shader.set("uThreshold", 0.4),
            windLines2Mesh.shader.set("uSpeed", 0.25),
            windLines2Mesh.shader.set("uTile", 5),
            (windLines2Mesh.position.y = 0.4),
            bottle1Group.add(windLines2Mesh));
          const windLines3Mesh = windLines.mesh.clone();
          ((windLines3Mesh.shader = windLinesMesh.shader.clone()),
            (windLines3Mesh.shader.uniforms.uAnimate = firstProgress),
            windLines2Mesh.shader.set("uScroll", 1.35),
            windLines3Mesh.shader.set("uThreshold", 0.4),
            windLines3Mesh.shader.set("uSpeed", 0.25),
            windLines3Mesh.shader.set("uTile", 5),
            (windLines3Mesh.position.y = 0.2),
            bottle1Group.add(windLines3Mesh));
          const windLines4Mesh = windLines2.mesh.clone();
          ((windLines4Mesh.shader = windLines2Mesh.shader.clone()),
            (windLines4Mesh.shader.uniforms.uAnimate = firstProgress),
            windLines4Mesh.shader.set("uScroll", 1.65),
            windLines4Mesh.shader.set("uThreshold", 0.4),
            windLines4Mesh.shader.set("uSpeed", 0.5),
            windLines4Mesh.shader.set("uTile", 10),
            (windLines4Mesh.position.y = 0.2),
            bottle1Group.add(windLines4Mesh));
          const windLines1Clone1 = windLinesMesh.clone(),
            windLines1Clone2 = windLines2Mesh.clone(),
            windLines1Clone3 = windLines3Mesh.clone(),
            windLines1Clone4 = windLines4Mesh.clone();
          ((windLines1Clone1.shader = windLinesMesh.shader.clone()),
            (windLines1Clone1.shader.uniforms.uAnimate = secondProgress),
            (windLines1Clone2.shader = windLines2Mesh.shader.clone()),
            (windLines1Clone2.shader.uniforms.uAnimate = secondProgress),
            (windLines1Clone3.shader = windLines3Mesh.shader.clone()),
            (windLines1Clone3.shader.uniforms.uAnimate = secondProgress),
            (windLines1Clone4.shader = windLines4Mesh.shader.clone()),
            (windLines1Clone4.shader.uniforms.uAnimate = secondProgress),
            bottle2Group.add(windLines1Clone1),
            bottle2Group.add(windLines1Clone2),
            bottle2Group.add(windLines1Clone3),
            bottle2Group.add(windLines1Clone4));
          const windLines2Clone1 = windLinesMesh.clone(),
            windLines2Clone2 = windLines2Mesh.clone(),
            windLines2Clone3 = windLines3Mesh.clone(),
            windLines2Clone4 = windLines4Mesh.clone();
          ((windLines2Clone1.shader = windLinesMesh.shader.clone()),
            (windLines2Clone1.shader.uniforms.uAnimate = thirdProgress),
            (windLines2Clone2.shader = windLines2Mesh.shader.clone()),
            (windLines2Clone2.shader.uniforms.uAnimate = thirdProgress),
            (windLines2Clone3.shader = windLines3Mesh.shader.clone()),
            (windLines2Clone3.shader.uniforms.uAnimate = thirdProgress),
            (windLines2Clone4.shader = windLines4Mesh.shader.clone()),
            (windLines2Clone4.shader.uniforms.uAnimate = thirdProgress),
            bottle3Group.add(windLines2Clone1),
            bottle3Group.add(windLines2Clone2),
            bottle3Group.add(windLines2Clone3),
            bottle3Group.add(windLines2Clone4),
            await _this.layers.blobs1.setCurveGPU(curve),
            await _this.layers.blobs2.setCurveFromInstance(_this.layers.blobs1),
            await _this.layers.blobs3.setCurveFromInstance(_this.layers.blobs1),
            _this.layers.blobs1.setColor(
              _this.layers.bottle1.shader.get("uColorHighlight"),
            ),
            _this.layers.blobs2.setColor(
              _this.layers.bottle2.shader.get("uColorHighlight"),
            ),
            _this.layers.blobs3.setColor(
              _this.layers.bottle3.shader.get("uColorHighlight"),
            ),
            (_this.animateIn = () => {}),
            (_this.bottleAnimateIn = function () {
              _this.delayedCall(() => {
                (onClick(1, { suppressAudio: !0, force: !0, timeMul: 4 })(),
                  _this.delayedCall(() => {
                    _this.canInteract = !0;
                  }, 400));
              }, 400);
            }),
            _this.startRender(() => {
              _this.layers.bottle1._drawing &&
                !_this.animatedInBottles &&
                ((_this.animatedInBottles = !0), _this.bottleAnimateIn());
            }),
            _this.isPlayground() &&
              (_this.onResize(handleResize), _this.animateIn()));
        }),
        (_this.handleResize = handleResize),
        (_this.onVisibilityChange = function (visible) {
          visible || _this.AUDIO_MANAGER.setVolume("bottle_levitate", 0);
        }),
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
              id: 12,
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
              id: 13,
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
        (_this.cursor = _this.initClass(
          GLUICursor,
          (function () {
            let params = AppState.createLocal({
              text: _this.state.cursorText,
              manualHits: !0,
              cursorType: "pointer",
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
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "DrinkSelectionScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }