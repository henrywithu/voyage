function HandScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "HandScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "HandScene"),
      (_this.contexts = "BaseView, 'HandScene'"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        (_this.hand = _this.initClass(Hand)),
        _this.hand.isFragment &&
          _promises.push(_this.wait(_this.hand, "__ready")),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let _camera,
        onInit = _this.onInit;
      function handleResize() {
        _this.isPlayground()
          ? ((_this.screenHeightWorld = Utils3D.getHeightFromCamera(
              _camera.camera,
              _camera.camera.position.z,
            )),
            (_this.screenWidthWorld = Utils3D.getWidthFromCamera(
              _camera.camera,
              _camera.camera.position.z,
            )))
          : ((_this.screenHeightWorld =
              _this.getSync("Story/screenHeightWorld") || 1),
            (_this.screenWidthWorld =
              _this.getSync("Story/screenWidthWorld") || 1));
        const heightWorld = _this.heightWorld,
          isMobile = Stage.width / Stage.height < 1;
        ((_this.border.shader.uniforms.uScreenHeightWorld.value =
          _this.screenHeightWorld),
          (_this.border.shader.uniforms.uSceneHeightWorld.value =
            _this.heightWorld),
          (_this.state.text1PadX = isMobile ? 0.05 : 0.2),
          (_this.state.text1PadY = isMobile ? 0.6 : 1),
          (_this.state.frame1PadX = isMobile ? 0.2 : 0.3),
          (_this.state.frame1PadY = 0.3),
          (_this.state.frame1Scale = isMobile ? 1 : 1.5),
          _this.layers.water.group.scale.set(
            _this.screenWidthWorld,
            1,
            _this.screenHeightWorld,
          ),
          _this.layers.water.group.scale.multiplyScalar(1.05),
          _this.isPlayground() ||
            ((_this.layers.water.group.position.y =
              (heightWorld - _this.screenHeightWorld) / 2),
            _this.box1.handleResize(),
            _this.floatingFrameHand?.handleResize?.()));
      }
      function getPortalVolume() {
        const { baseGain: baseGain } =
          _this.AUDIO_MANAGER.getAudio("portal_base");
        return (
          baseGain *
          (isNaN(_this.scrollProgress)
            ? 0
            : _this.scrollProgress <= 0.9
              ? Math.range(_this.scrollProgress, 0, 0.15, 0, 1, !0)
              : Math.range(_this.scrollProgress, 0.8, 0.95, 1, 0, !0))
        );
      }
      ((_this.state.text1PadX = 0.2),
        (_this.state.text1PadY = 1),
        (_this.state.text1OffsetZ = 0.45),
        (_this.state.text1HorizontalAlign = "left"),
        (_this.state.text1VerticalAlign = "top"),
        (_this.state.text1Body = "Hesitantly, his hand draws forward."),
        (_this.state.text1Width = 440),
        (_this.state.frame1PadX = 0.3),
        (_this.state.frame1PadY = 0.3),
        (_this.state.frame1Scale = 1.5),
        (_this.state.cursorText = "Hold &\nMove"),
        (_this.init = async () => {
          Device.mobile && (_this.floatingFrameHand.visible = !1);
          const {
            border: border,
            characterGroup: characterGroup,
            water: water,
          } = _this.layers;
          let inversePass, inverseHandScene;
          if (
            ((_this.border = border),
            _this.border.shader.uniforms.uFluidEdge.value.set(0, 0, 0, 0),
            _this.isPlayground()
              ? ((_this.border.visible = !1),
                (_camera = Story.createCamera()),
                _camera.lock())
              : (await _this.wait(() => !!Global.CAMERA),
                (_camera = Global.CAMERA)),
            (_this.camera = _camera),
            (_this.stickyGroup = new Group()),
            _this.add(_this.stickyGroup),
            await _this.wait(
              () =>
                _this.box1?.flag("isReady") &&
                _this.hand?.flag("isReady") &&
                _this.cursor?.animateSet,
            ),
            (water.mesh._offsetZ = water.group.position.z),
            (water.group.position.z = 0),
            _this.box1.animateSet(),
            _this.cursor.animateSet(),
            _this.discButton.animateSet(),
            characterGroup.group.add(_this.hand.skin),
            characterGroup.group.add(_this.hand.inverseSkin),
            (_this.border.shader.uniforms.uScreenHeightWorld.value =
              _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            (_this.border.shader.uniforms.uPadX.value = -1),
            (_this.border.shader.uniforms.uPadY.value = 0.1),
            (_this.border.geometry = _this.border.geometry.clone()),
            (_this.border.geometry.boundingSphere.radius = _this.heightWorld),
            _this.floatingFrameHand &&
              _this.stickyGroup.add(_this.floatingFrameHand.group),
            _this.stickyGroup.add(_this.box1.group),
            _this.stickyGroup.add(water.group),
            !Device.mobile)
          ) {
            ((inverseHandScene = _this.createFragment(FXScene)),
              (inverseHandScene.resolution = Device.mobile ? 0.5 : 0.25),
              inverseHandScene.create(),
              (inverseHandScene.clearAlpha = 0),
              (inverseHandScene.manualRender = !0));
            const inverseCamera = _this.createFragment(GazeCamera);
            (inverseCamera.moveXY.set(0, 0),
              (inverseCamera.position.z = -2 * water.mesh._offsetZ),
              inverseHandScene.useCamera(inverseCamera),
              inverseHandScene.add(_this.hand.skin),
              inverseHandScene.add(_this.hand.inverseSkin),
              _camera.group.add(inverseCamera.group),
              (_this.floatingFrameHand.mesh.shader.uniforms.tMap.value =
                inverseHandScene.rt));
            const inverseHandlayer = Utils3D.createFXLayer(
              "HandInfo",
              inverseHandScene.nuke,
              { format: Texture.RGBAFormat },
            );
            (inverseHandlayer.rt.texture.upload(),
              inverseHandlayer.add(_this.hand.skin),
              inverseHandlayer.add(_this.hand.inverseSkin),
              (inversePass = _this.initClass(NukePass, "InverseHandPass", {
                tHand: { value: inverseHandlayer.rt },
                tHeightmap: {
                  value: water.mesh.shader.uniforms.heightmap.value,
                },
                tLines: { value: water.mesh.shader.uniforms.tLines.value },
                tNoise: { value: water.mesh.shader.uniforms.tNoise.value },
                tBlueNoise: {
                  value: water.mesh.shader.uniforms.tBlueNoise.value,
                },
                uColor1: { value: water.mesh.shader.uniforms.uColor1.value },
                uColor2: { value: water.mesh.shader.uniforms.uColor2.value },
                uColor3: { value: water.mesh.shader.uniforms.uColor3.value },
                uColor4: { value: water.mesh.shader.uniforms.uColor4.value },
                uScroll: { value: 0 },
              })),
              inverseHandScene.addPass(inversePass),
              inverseHandScene.upload());
          }
          const handscene = _this.createFragment(FXScene);
          (handscene.create({ format: Texture.RGBAFormat }),
            (handscene.clearAlpha = 0),
            (handscene.manualRender = !0),
            handscene.useCamera(_camera),
            handscene.add(_this.hand.skin),
            handscene.add(_this.hand.inverseSkin));
          const handlayer = Utils3D.createFXLayer("HandInfo", handscene.nuke, {
            format: Texture.RGBAFormat,
          });
          (handlayer.rt.texture.upload(),
            handlayer.add(_this.hand.skin),
            handlayer.add(_this.hand.inverseSkin),
            (water.computeShader.uniforms.tHand.value = handlayer.rt),
            (water.mesh.shader.uniforms.tHand.value = handlayer.rt));
          const outputShader = _this.createFragment(
              Shader,
              "HandOutputRender",
              {
                tMap: { value: handscene.rt },
                tHandInfo: { value: handlayer.rt },
                transparent: !0,
                depthWrite: !1,
                depthTest: !1,
              },
            ),
            outputQuad = new Mesh(World.QUAD, outputShader);
          function beforeRender() {
            _this.AUDIO_MANAGER.setVolume("portal_base", getPortalVolume());
            const move = _this.AUDIO_MANAGER.getAudio("portal_base");
            if (
              (_this.AUDIO_MANAGER.setVolume(
                "portal_move",
                getPortalVolume() * move.baseGain,
              ),
              Device.mobile)
            ) {
              const rect = _this.ui.element.div.getBoundingClientRect();
              _this.discButton.updatePosOnHold({
                x: 0.8 * rect.right,
                y: 0.7 * rect.bottom,
              });
            }
            if (!_this.isPlayground()) {
              const heightWorld = _this.heightWorld,
                groupY = 0,
                scrollY = _this.getSync("Story/scrollY"),
                scrollTop = Math.abs(scrollY),
                limitTop = _this.worldBottom + groupY,
                limitBottom =
                  _this.worldBottom +
                  heightWorld -
                  groupY -
                  _this.screenHeightWorld;
              let scrollAmount = 0;
              scrollTop >= limitTop && scrollTop <= limitBottom
                ? ((_this.stickyGroup.position.y = limitTop - scrollTop),
                  (scrollAmount = 0))
                : scrollTop > limitBottom
                  ? (scrollAmount = limitBottom - scrollTop)
                  : ((_this.stickyGroup.position.y = groupY),
                    (scrollAmount = limitTop - scrollTop));
              const cameraZ = _camera.position.z,
                parallaxFactor =
                  (cameraZ - _this.layers.water.mesh._offsetZ) / cameraZ,
                parallaxOffset =
                  _this.screenHeightWorld * (1 + (1 - parallaxFactor) / 2),
                scroll = Math.map(
                  scrollAmount,
                  -parallaxOffset,
                  parallaxOffset,
                  -1,
                  1,
                );
              ((water.computeShader.uniforms.uScroll.value = scroll),
                (water.mesh.shader.uniforms.uScroll.value = scroll),
                inversePass && (inversePass.uniforms.uScroll.value = scroll),
                (water.mesh.shader.uniforms.uPageScroll.value = scrollY));
            }
          }
          function render() {
            (_this.hand.render(_this.force),
              (_this.hand.skin.shader.nullRender = !1),
              (_this.hand.inverseSkin.shader.nullRender = !1));
            const prevDiscardX =
                _this.hand.skin.shader.uniforms.uDiscard.value.x,
              prevDiscardY = _this.hand.skin.shader.uniforms.uDiscard.value.y;
            ((_this.hand.skin.shader.uniforms.uDiscard.value.x = 1),
              (_this.hand.skin.shader.uniforms.uDiscard.value.y = 0),
              inverseHandScene && inverseHandScene.render(),
              (_this.hand.skin.shader.uniforms.uDiscard.value.x = prevDiscardX),
              (_this.hand.skin.shader.uniforms.uDiscard.value.y = prevDiscardY),
              handscene.render(),
              (_this.hand.skin.shader.nullRender = !0),
              (_this.hand.inverseSkin.shader.nullRender = !0));
          }
          (outputQuad.upload(),
            _this.add(outputQuad),
            handscene.upload(),
            (_this.force = !0),
            _this.isPlayground() && _this.onResize(handleResize),
            _this.startRender(render),
            _this.startRender(beforeRender, RenderManager.BEFORE_RENDER),
            (_this.visible = !0),
            (_this.force = !0),
            (_this.group.frustumCulled = !1));
          for (let i = 0; i < 10; i++)
            (beforeRender(), render(), await defer());
          ((_this.visible = !1),
            (_this.force = !1),
            (_this.group.frustumCulled = !0));
        }),
        (_this.onMouseDown = () => {
          GoogleAnalytics.track("hand_start");
        }),
        (_this.onMouseUp = () => {
          GoogleAnalytics.track("hand_stop");
        }),
        (_this.onDiscHoldStart = _this.onMouseDown),
        (_this.onDiscHoldEnd = _this.onMouseUp),
        (_this.handleResize = handleResize),
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
              id: 9,
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
        (_this.floatingFrameHand = _this.initClass(
          FloatingFrameHand,
          (function () {
            let params = AppState.createLocal({
              frameScale: _this.state.frame1Scale,
              padx: _this.state.frame1PadX,
              pady: _this.state.frame1PadY,
            });
            return (
              _this.bindState(_this.state, ["frame1Scale"], (val) => {
                params.frameScale = val;
              }),
              _this.bindState(_this.state, ["frame1PadX"], (val) => {
                params.padx = val;
              }),
              _this.bindState(_this.state, ["frame1PadY"], (val) => {
                params.pady = val;
              }),
              params
            );
          })(),
        )),
        _this.floatingFrameHand.isFragment &&
          _promises.push(_this.wait(_this.floatingFrameHand, "__ready")),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "HandScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }