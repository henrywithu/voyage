function ProductsScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "ProductsScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "ProductsScene"),
      (_this.contexts = "BaseView, 'ProductsScene'"),
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
      ((_this.screenHeight = 1), (_this.screenWidth = 1));
      let _lastSlide = null,
        _sliderLastFxPlay = null;
      TweenManager.addCustomEase({
        name: "productsEase",
        curve: "cubic-bezier(0.22, 1.00, 0.36, 1.00)",
      });
      let [input, appState] = _this.createUIL("Products Scene Config");
      (input.addNumber("wobbleMax", 5),
        input.addNumber("wobbleVelMultiplier", 10),
        input.addNumber("wobblePulseFrequency", 0.1),
        input.addNumber("wobbleDecay", 10),
        input.addNumber("posLerp", 0.1),
        input.addNumber("posRangeX", 0.4),
        input.addNumber("posRangeY", 0.2),
        input.addNumber("rotRangeZ", 0.1),
        input.addColor("blueColor", new Color("#63c6f8")),
        input.addColor("blueColorDark", new Color("#0062ff")),
        input.addColor("greenColor", new Color("#6DD993")),
        input.addColor("greenColorDark", new Color("#07cf4d")),
        input.addColor("yellowColor", new Color("#FDEB87")),
        input.addColor("yellowColorDark", new Color("#fdd90d")));
      let _objectPosition = new Vector3(0, 0, 0),
        _wobbleAmountToAddX = 0,
        _wobbleAmountToAddZ = 0,
        wobbleAmountX = 0,
        wobbleAmountZ = 0;
      ((_this.slider = null),
        (_this.init = async () => {
          _this.handleResize = handleResize;
          const layers = await _this.layout.getAllLayers(),
            {
              mainCamera: mainCamera,
              bg: bg,
              group1: group1,
              group2: group2,
              group3: group3,
              bottleRoot: bottleRoot,
              bottle: bottle,
              liquid: liquid,
              label: label,
              text1: text1,
              text2: text2,
              text3: text3,
              copy1: copy1,
              copy2: copy2,
              copy3: copy3,
              cursor: cursor,
              cursorBg: cursorBg,
              cursorIndicator: cursorIndicator,
              carouselTextLeft: carouselTextLeft,
              carouselTextRight: carouselTextRight,
            } = layers;
          ((bg.shader.depthTest = !1),
            (bg.shader.depthWrite = !1),
            (bg.shader.renderOrder = -1e3),
            Config.NO_BOTTLE_TEXT &&
              ((copy1.visible = !1),
              (copy2.visible = !1),
              (copy3.visible = !1),
              (carouselTextLeft.visible = !1),
              (carouselTextRight.visible = !1),
              (text1.visible = !1),
              (text2.visible = !1),
              (text3.visible = !1)),
            copy1.shader.set("uFixed", 1),
            copy2.shader.set("uFixed", 1),
            copy3.shader.set("uFixed", 1),
            text1.shader.set("uTranslateIn", 0),
            copy1.shader.set("uAlpha", 0),
            text2.shader.set("uTranslateIn", 0),
            copy2.shader.set("uAlpha", 0),
            text3.shader.set("uTranslateIn", 0),
            copy3.shader.set("uAlpha", 0),
            (bottle.renderOrder = 10),
            (cursor.visible = !1));
          const bottleGroup = new Group(),
            bottleTransform = new Group();
          bottleTransform.position.z = 0.25;
          const bottleRotation = new Group();
          ((bottleRotation.position.z = 0.25),
            bottleGroup.add(bottleTransform),
            bottleTransform.add(bottleRotation),
            bottleRotation.add(bottleRoot),
            _this.add(bottleGroup));
          let _positionVelocity = new VelocityTracker(bottleTransform.position),
            _rotationVelocity = new VelocityTracker(bottleRotation.rotation);
          const sliderGroup = new HydraObject(),
            slides = [group1, group2, group3];
          ((group1._text = text1),
            (group1._copy = copy1),
            (group2._text = text2),
            (group2._copy = copy2),
            (group3._text = text3),
            (group3._copy = copy3),
            (group1._prevLabel = "marshmallow\ncoffee\n& cream".toUpperCase()),
            (group1._nextLabel = "mint\nchocolate\n& cream".toUpperCase()),
            (group1._color = new Color(input.get("blueColor"))),
            (group1._colorDark = new Color(input.get("blueColorDark"))),
            (group1._uvOffset = 0),
            (group2._prevLabel = "orange\nchocolate\n& cream".toUpperCase()),
            (group2._nextLabel = "marshmallow\ncoffee\n& cream".toUpperCase()),
            (group2._color = new Color(input.get("greenColor"))),
            (group2._colorDark = new Color(input.get("greenColorDark"))),
            (group2._uvOffset = 0.5),
            (group3._prevLabel = "mint\nchocolate\n& cream".toUpperCase()),
            (group3._nextLabel = "orange\nchocolate\n& cream".toUpperCase()),
            (group3._color = new Color(input.get("yellowColor"))),
            (group3._colorDark = new Color(input.get("yellowColorDark"))),
            (group3._uvOffset = 0.25));
          const slider = _this.createFragment(
            Interaction.Slider,
            sliderGroup,
            { x: !0 },
            {
              slides: slides.length,
              hit: Device.mobile ? null : _this.ui.element,
              multiplier: Device.mobile ? 1.5 : 1,
              width: Stage.width / 2,
            },
          );
          ((_this.slider = slider),
            (slider.infinite = !0),
            (slider.friction = 0.3),
            (slider.interpolate = 0.3),
            (slider.easeTime = 1200),
            (slider.flickable = !0),
            (slider.ease = "easeOutCubic"),
            (slider.views = slides.map((slide, i, { length: length }) => ({
              updatePosition: (offset = 0, dragging, time, clock, delta) => {
                let roundOff = Math.round(offset);
                const isLeft = roundOff > 1.01,
                  isRight = roundOff < -1.01;
                ((offset = isLeft
                  ? -1 * offset + 1.01
                  : isRight
                    ? offset - 1.01 - 1
                    : offset),
                  (offset %= length),
                  (offset = isLeft
                    ? Math.range(offset, -1, -1.01, -1.01, -1)
                    : isRight
                      ? Math.range(offset, -1.01, -1, 1, 1.01)
                      : offset),
                  (slide.position.x = offset * _this.screenWidth),
                  slide._text &&
                    _this.flag("animated") &&
                    ((slide._text.position.x =
                      -offset * (0.5 * _this.screenWidth)),
                    slide._text.shader.set("uDirection", offset),
                    slide._text.shader.set(
                      "uTranslateIn",
                      1 - Math.abs(offset),
                    ),
                    ((slide._copy.group || slide._copy).position.x =
                      -offset * (0.5 * _this.screenWidth)),
                    slide._copy.shader.set(
                      "uAlpha",
                      1 - Math.abs(2 * offset),
                    )));
              },
            }))),
            _this.events.sub(
              slider,
              Interaction.Slider.START_INTERACTION,
              () => {
                Device.mobile ||
                  (_this.ui.element.div.style.cursor = "grabbing");
                const progress = Math.abs(
                  liquid.shader.uniforms.uTransition.value,
                );
                ((_sliderLastFxPlay =
                  progress > 0.5 ? "forwards" : "backwards"),
                  (_lastSlide = null));
              },
            ),
            _this.events.sub(slider, Interaction.Slider.MOVE, () => {
              (Device.mobile ||
                (_this.ui.element.div.style.cursor = "grabbing"),
                (function playCarouselFxWhenBottleFilledHalfway({
                  progress: progress,
                  currentSlide: currentSlide,
                }) {
                  null !== _lastSlide &&
                    _lastSlide !== currentSlide &&
                    (_sliderLastFxPlay =
                      progress > 0.5 ? "forwards" : "backwards");
                  ((_lastSlide = currentSlide),
                    "forwards" !== _sliderLastFxPlay && progress > 0.5
                      ? (AudioUtils.playRoundRobin("carousel"),
                        (_sliderLastFxPlay = "forwards"))
                      : "backwards" !== _sliderLastFxPlay &&
                        progress < 0.5 &&
                        (AudioUtils.playRoundRobin("carousel"),
                        (_sliderLastFxPlay = "backwards")));
                })({
                  progress: Math.abs(liquid.shader.uniforms.uTransition.value),
                  currentSlide: Math.floor(slider.elapsed),
                }));
            }),
            _this.events.sub(slider, Interaction.Slider.END_INTERACTION, () => {
              (Device.mobile || (_this.ui.element.div.style.cursor = "grab"),
                (_sliderLastFxPlay = null));
            }),
            Device.mobile
              ? (function initMobileSliderInteraction() {
                  const target = _this.ui.element;
                  (target.css({ touchAction: "pan-x" }),
                    target.bind("touchmove", handleInteractionDrag),
                    target.bind("touchend", handleInteractionEnd));
                })()
              : (_this.ui.element.div.style.cursor = "grab"),
            _this.bind("ProductsScene/nextSlide", () => {
              (slider.next(), AudioUtils.playRoundRobin("carousel"));
            }),
            _this.bind("ProductsScene/prevSlide", () => {
              (slider.prev(), AudioUtils.playRoundRobin("carousel"));
            }),
            _this.bind("ProductsScene/nextSlideHover", (value) => {
              ((cursorIndicator._opacity = value ? 0 : 1),
                (cursorIndicator._scale = value ? 2 : 1));
            }),
            _this.bind("ProductsScene/prevSlideHover", (value) => {
              ((cursorIndicator._opacity = value ? 0 : 1),
                (cursorIndicator._scale = value ? 2 : 1));
            }),
            (cursorIndicator._opacity = 1),
            (cursorIndicator._scale = 0),
            _this.isPlayground()
              ? ((_camera = mainCamera), _this.flag("inView", !0))
              : (await _this.wait(() => !!Global.CAMERA),
                (_camera = Global.CAMERA)));
          Interaction3D.find(_camera.camera).add(bg, (e) => {
            const isOver = "over" === e.action;
            (_this.flag("cursorVisible", isOver),
              (cursorIndicator._scale = isOver ? 1 : 0));
          });
          const glBoundsGroup = new Group();
          function animateSet() {
            switch (_this.getSync("Global/selectedBottle") || 1) {
              case 1:
                (copy1.shader.set("uAlpha", 0),
                  text1.shader.set("uTranslateIn", 0));
                break;
              case 2:
                (copy2.shader.set("uAlpha", 0),
                  text2.shader.set("uTranslateIn", 0));
                break;
              case 3:
                (copy3.shader.set("uAlpha", 0),
                  text3.shader.set("uTranslateIn", 0));
            }
            (carouselTextLeft.shader.set("uOpacity", 0),
              carouselTextRight.shader.set("uOpacity", 0),
              carouselTextLeft.shader.set("uFixed", 1),
              carouselTextRight.shader.set("uFixed", 1),
              _this.ui.prevSlide.transform({ x: "-100%" }),
              _this.ui.nextSlide.transform({ x: "100%" }),
              _this.ui.prevSlide.css({ opacity: 0 }),
              _this.ui.nextSlide.css({ opacity: 0 }),
              (bottleGroup.position.y =
                -_this.heightWorld * (Device.mobile ? 1 : 0.5)));
          }
          function handleResize() {
            if (!_camera) return;
            ((Stage.width < 960 || Device.mobile) && (cursor.visible = !1),
              _this.getSync("Global/selectedBottle") &&
                (slider.jumpTo(_this.getSync("Global/selectedBottle") - 1),
                loop()),
              (slider.width = Stage.width / 2));
            const dist = _camera.camera.position.length(),
              glBoundsTr = _this.domToWebGL({
                element: _this.ui.glBounds.div,
                camera: _camera.camera,
                dist: dist,
              });
            glBoundsGroup.position.set(glBoundsTr.position.x, 0);
            const scale = Math.range(Stage.width, 1600, 960, 0.3, 0.275),
              ratioScale = Math.range(
                Stage.width / Stage.height,
                2,
                1,
                1,
                Math.range(Stage.width, 1200, 600, 0.8, 1, !0),
              );
            if (
              (glBoundsGroup.scale.set(
                glBoundsTr.scale.x * scale * ratioScale,
                glBoundsTr.scale.y * scale * ratioScale,
                1,
              ),
              Stage.width < 960 || Device.mobile)
            )
              ((carouselTextLeft.visible = !1),
                (carouselTextRight.visible = !1),
                (cursor.visible = !1),
                (cursorIndicator.visible = !1),
                (cursorBg.visible = !1));
            else {
              (!Config.NO_BOTTLE_TEXT && (carouselTextLeft.visible = !0),
                !Config.NO_BOTTLE_TEXT && (carouselTextRight.visible = !0),
                (cursor.visible = _this.flag("inView")),
                (cursorIndicator.visible = !0),
                (cursorBg.visible = !0));
              const glBoundsTextLeft = _this.domToWebGL({
                  element: _this.ui.leftText.div,
                  camera: _camera.camera,
                  dist: dist,
                }),
                glBoundsTextRight = _this.domToWebGL({
                  element: _this.ui.rightText.div,
                  camera: _camera.camera,
                  dist: dist,
                }),
                textScale =
                  1 +
                  Math.max(glBoundsTextLeft.scale.x, glBoundsTextLeft.scale.y);
              ((carouselTextLeft.group.position.x =
                glBoundsTextLeft.position.x),
                carouselTextLeft.group.scale.setScalar(textScale),
                (carouselTextRight.group.position.x =
                  glBoundsTextRight.position.x),
                carouselTextRight.group.scale.setScalar(textScale),
                (_this.targetTextLeftPosition = glBoundsTextLeft.position.x),
                (_this.targetTextRightPosition = glBoundsTextRight.position.x));
            }
            const copyScale = Math.range(Stage.width, 1600, 390, 1.5, 3, !0),
              copyPosition = Math.range(Stage.width, 1600, 390, 1.2, 2, !0);
            (copy1._initialScale || (copy1._initialScale = copy1.scale.clone()),
              copy1._initialPosition ||
                (copy1._initialPosition = copy1.position.clone()),
              copy2._initialScale ||
                (copy2._initialScale = copy2.scale.clone()),
              copy2._initialPosition ||
                (copy2._initialPosition = copy2.position.clone()),
              copy3._initialScale ||
                (copy3._initialScale = copy3.scale.clone()),
              copy3._initialPosition ||
                (copy3._initialPosition = copy3.position.clone()),
              copy1.scale.copy(copy1._initialScale),
              copy1.position.copy(copy1._initialPosition),
              copy2.scale.copy(copy2._initialScale),
              copy2.position.copy(copy2._initialPosition),
              copy3.scale.copy(copy3._initialScale),
              copy3.position.copy(copy3._initialPosition),
              copy1.scale.multiplyScalar(copyScale),
              copy1.position.multiplyScalar(copyPosition),
              copy2.scale.multiplyScalar(copyScale),
              copy2.position.multiplyScalar(copyPosition),
              copy3.scale.multiplyScalar(copyScale),
              copy3.position.multiplyScalar(copyPosition),
              (_this.screenHeight = Utils3D.getHeightFromCamera(
                _camera.camera,
                dist,
              )),
              (_this.screenWidth = _this.screenHeight * _camera.camera.aspect),
              bg.scale.set(
                3 * _this.screenWidth,
                _this.screenHeight * _this.baseHeight,
                1,
              ));
            const groupY = Math.range(
              Stage.width,
              390,
              1024,
              0.4 * _this.screenHeight,
              0,
              !0,
            );
            ((_this.layers.group1.position.y = groupY),
              (_this.layers.group2.position.y = groupY),
              (_this.layers.group3.position.y = groupY),
              bottleGroup.scale.setScalar(
                (function getBottleScale() {
                  const { width: width, height: height } = Stage;
                  return width < 1440
                    ? Math.range(width, 390, 600, 2, 1, !0)
                    : width < 1900
                      ? Math.range(height, 690, 1080, 0.9, 0.975, !0)
                      : width < 3e3
                        ? Math.range(height, 800, 1080, 0.85, 0.9, !0)
                        : Math.range(height, 1400, 2e3, 0.7, 0.8, !0);
                })(),
              ),
              bottleRoot.scale.setScalar(
                Math.range(Stage.width, 1200, 390, 1.9, 1, !0),
              ),
              (bottleRoot.position.y = Math.range(
                Stage.width,
                1200,
                390,
                -1.15,
                0,
                !0,
              )),
              _this.flag("animated") ||
                (bottleGroup.position.y =
                  -_this.heightWorld * (Device.mobile ? 1 : 0.5)),
              _this.set("ProductsScene/yPixel", _this.worldBottomPx));
          }
          (glBoundsGroup.add(group1),
            glBoundsGroup.add(group2),
            glBoundsGroup.add(group3),
            glBoundsGroup.add(bottleGroup),
            _this.add(glBoundsGroup),
            animateSet(),
            (_this.onInView = () => {
              (_this.flag("inView", !0),
                (cursor.visible = !0),
                animateSet(),
                (function animateIn() {
                  switch (_this.getSync("Global/selectedBottle") || 1) {
                    case 1:
                      (text1.shader.tween("uTranslateIn", 1, 2e3, "linear"),
                        copy1.shader.tween(
                          "uAlpha",
                          1,
                          1e3,
                          "easeInOutCubic",
                          200,
                        ));
                      break;
                    case 2:
                      (text2.shader.tween("uTranslateIn", 1, 2e3, "linear"),
                        copy2.shader.tween(
                          "uAlpha",
                          1,
                          1e3,
                          "easeInOutCubic",
                          200,
                        ));
                      break;
                    case 3:
                      (text3.shader.tween("uTranslateIn", 1, 2e3, "linear"),
                        copy3.shader.tween(
                          "uAlpha",
                          1,
                          1e3,
                          "easeInOutCubic",
                          200,
                        ));
                  }
                  (_this.wait(1400).then(() => {
                    _this.flag("animated", !0);
                  }),
                    (carouselTextLeft.group.position.x =
                      0.5 * -_this.screenWidth),
                    (carouselTextRight.group.position.x =
                      0.5 * _this.screenWidth),
                    tween(
                      carouselTextLeft.group.position,
                      { x: _this.targetTextLeftPosition },
                      1e3,
                      "easeInOutCubic",
                      200,
                    ),
                    tween(
                      carouselTextRight.group.position,
                      { x: _this.targetTextRightPosition },
                      1e3,
                      "easeInOutCubic",
                      200,
                    ),
                    carouselTextLeft.shader.tween(
                      "uOpacity",
                      1,
                      1e3,
                      "easeInOutCubic",
                      200,
                    ),
                    carouselTextRight.shader.tween(
                      "uOpacity",
                      1,
                      1e3,
                      "easeInOutCubic",
                      200,
                    ),
                    _this.ui.prevSlide.tween(
                      { x: 0, opacity: 1 },
                      1e3,
                      "easeInOutCubic",
                      200,
                    ),
                    _this.ui.nextSlide.tween(
                      { x: 0, opacity: 1 },
                      1e3,
                      "easeInOutCubic",
                      200,
                    ),
                    tween(bottleGroup.position, { y: 0 }, 2e3, "easeOutBack"));
                })());
            }),
            (_this.onViewOut = () => {
              (_this.flag("inView", !1), (cursor.visible = !1));
            }),
            _this.isPlayground() &&
              (handleResize(),
              _camera.lock(),
              _this.onInView(),
              _this.onResize(handleResize, !1)),
            (_this.textrt = new RenderTarget(
              Stage.width * World.DPR,
              Stage.height * World.DPR,
              {
                generateMipmaps: !0,
                minFilter: Texture.LINEAR_MIPMAP,
                magFilter: Texture.LINEAR,
                format: Texture.RGBFormat,
              },
            )),
            (_this.textrt.texture.generateMipmaps = !0),
            _this.textrt.upload());
          const geo = World.QUAD,
            blurShader = _this.initClass(Shader, "kawaseblur", {
              tMap: { value: null },
              uStep: { value: 0 },
              uBlit: { value: 0 },
              uBlurAmount: { value: 0.15 },
              tNoise: {
                value: Utils3D.getRepeatTexture(
                  "assets/images/bluenoise/bluenoise0.png",
                ),
              },
              transparent: !1,
              depthTest: !1,
              depthWrite: !1,
            });
          let _blurProgram = new Mesh(geo, blurShader);
          _blurProgram.upload();
          let _buffer = {
            read: null,
            write: null,
            swap: () => {
              const tmp = _buffer.write;
              ((_buffer.write = _buffer.read), (_buffer.read = tmp));
            },
          };
          ((_buffer.read = new RenderTarget(
            0.2 * _this.textrt.width,
            0.2 * _this.textrt.height,
            {
              minFilter: Texture.LINEAR,
              magFilter: Texture.LINEAR,
              format: Texture.RGBFormat,
            },
          )),
            _buffer.read.upload(),
            (_buffer.write = new RenderTarget(
              0.2 * _this.textrt.width,
              0.2 * _this.textrt.height,
              {
                minFilter: Texture.LINEAR,
                magFilter: Texture.LINEAR,
                format: Texture.RGBFormat,
              },
            )),
            _buffer.write.upload(),
            bottle.shader.set("tRefraction", _buffer.read.texture),
            liquid.shader.set("tRefraction", _buffer.read.texture),
            bottle.shader.set("tText", _this.textrt),
            cursorBg.shader.set("tText", _this.textrt));
          const renderSingles = [
            text1,
            text2,
            text3,
            carouselTextLeft.text.mesh,
            carouselTextRight.text.mesh,
          ];
          _this.startRender(() => {
            _camera &&
              ((World.RENDERER.autoClear = !1),
              World.RENDERER.clearColor(_this.textrt),
              renderSingles.forEach((single) =>
                World.RENDERER.renderSingle(
                  single,
                  _camera.camera,
                  _this.textrt,
                ),
              ),
              (function renderBlur() {
                for (let i = 0; i < 8; i++)
                  (_blurProgram.shader.set(
                    "tMap",
                    0 === i ? _this.textrt.texture : _buffer.read.texture,
                  ),
                    _blurProgram.shader.set("uStep", i),
                    _blurProgram.shader.set("uBlit", 0 === i ? 1 : 0),
                    World.RENDERER.renderSingle(
                      _blurProgram,
                      World.CAMERA,
                      _buffer.write,
                    ),
                    _buffer.swap());
              })(),
              (World.RENDERER.autoClear = !0),
              Global?.CAMERA?._fixedCamera &&
                (carouselTextLeft.shader.uniforms.uFixedCameraMatrix.value.copy(
                  Global.CAMERA._fixedCamera.camera.matrixWorldInverse,
                ),
                carouselTextRight.shader.uniforms.uFixedCameraMatrix.value.copy(
                  Global.CAMERA._fixedCamera.camera.matrixWorldInverse,
                )));
          }, Render.BEFORE_RENDER);
          let direction = 0,
            rotationY = 0,
            prevMouseX = 0;
          const PI2 = Math.PI2 || 2 * Math.PI,
            lerpAngle = (target, current, alpha) => {
              return (
                current +
                ((angle = ((angle = target - current) + Math.PI) % PI2) < 0 &&
                  (angle += PI2),
                (angle - Math.PI) * alpha)
              );
              var angle;
            },
            animateText = (el, transition, prevText, nextText) => {
              transition > 0.5 ? el.setText(nextText) : el.setText(prevText);
            };
          let _t = 0,
            _screenProj = ScreenProjection.find(_camera.camera),
            prevSlide = -1,
            wobbleDecay = input.getNumber("wobbleDecay"),
            wobbleVelMultiplier = input.getNumber("wobbleVelMultiplier"),
            wobblePulseFrequency = input.getNumber("wobblePulseFrequency"),
            wobbleMax = input.getNumber("wobbleMax");
          const currentSlide = Math.floor(
            Math.mod(slider.elapsed + 0.001, slider.maxSlides),
          );
          function loop() {
            (_positionVelocity.update(), _rotationVelocity.update());
            const delta = 0.01 * Render.DELTA;
            ((_t += delta),
              (_wobbleAmountToAddX = Math.lerp(
                0,
                _wobbleAmountToAddX,
                delta * wobbleDecay,
              )),
              (_wobbleAmountToAddZ = Math.lerp(
                0,
                _wobbleAmountToAddZ,
                delta * wobbleDecay,
              )),
              (pulse = 2 * Math.PI * wobblePulseFrequency),
              (wobbleAmountX = _wobbleAmountToAddX * Math.sin(pulse * _t)),
              (wobbleAmountZ = _wobbleAmountToAddZ * Math.sin(pulse * _t)),
              liquid.shader.set("uWobbleX", wobbleAmountX),
              liquid.shader.set("uWobbleZ", wobbleAmountZ),
              (_objectPosition = bottleRoot.position
                .clone()
                .add(bottleTransform.position)),
              (_objectPosition.y -= Math.range(
                Stage.width,
                1200,
                390,
                0,
                1.07,
                !0,
              )),
              liquid.shader.set(
                "uObjectPosition",
                _objectPosition.add(_this.group.position),
              ));
            const currentSlide = Math.floor(
                Math.mod(slider.elapsed + 0.001, slider.maxSlides),
              ),
              uTransition = Math.mod(slider.elapsed + 0.001, 1);
            (liquid.shader.set("uTransition", uTransition),
              label.shader.set("uTransition", uTransition),
              currentSlide !== prevSlide &&
                (liquid.shader.set("uColor", slides[currentSlide]._color),
                liquid.shader.set(
                  "uColorDark",
                  slides[currentSlide]._colorDark ||
                    slides[currentSlide]._color,
                ),
                liquid.shader.set(
                  "uColor2",
                  slides[Math.mod(currentSlide + 1, slider.maxSlides)]._color,
                ),
                liquid.shader.set(
                  "uColor2Dark",
                  slides[Math.mod(currentSlide + 1, slider.maxSlides)]
                    ._colorDark ||
                    slides[Math.mod(currentSlide + 1, slider.maxSlides)]._color,
                ),
                label.shader.set("uUVOffset1", slides[currentSlide]._uvOffset),
                label.shader.set(
                  "uUVOffset2",
                  slides[Math.mod(currentSlide + 1, slider.maxSlides)]
                    ._uvOffset,
                ),
                (carouselTextLeft._prev = slides[currentSlide]._prevLabel),
                (carouselTextRight._prev = slides[currentSlide]._nextLabel),
                _this.ui.updateLabels({
                  prev: slides[currentSlide]._prevLabel,
                  next: slides[currentSlide]._nextLabel,
                }),
                (carouselTextLeft._next =
                  slides[
                    Math.mod(currentSlide + 1, slider.maxSlides)
                  ]._prevLabel),
                (carouselTextRight._next =
                  slides[
                    Math.mod(currentSlide + 1, slider.maxSlides)
                  ]._nextLabel),
                (prevSlide = currentSlide),
                GoogleAnalytics.track("products_slide_update")),
              animateText(
                carouselTextLeft,
                uTransition,
                carouselTextLeft._prev,
                carouselTextLeft._next,
              ),
              animateText(
                carouselTextRight,
                uTransition,
                carouselTextRight._prev,
                carouselTextRight._next,
              ));
            const cursorPos = _screenProj.unproject(Mouse),
              cursorX =
                (Mouse.tilt.x * _this.screenWidth) / 2 -
                (cursorBg.scale.x / 2) *
                  Math.sign(Mouse.tilt.x) *
                  cursorIndicator._opacity,
              cursorY =
                (Mouse.tilt.y * _this.screenHeight) / 2 -
                (cursorBg.scale.y / 2) * cursorIndicator._opacity +
                (cursorPos.y - _this.group.position.y);
            ((cursor.position.x = Math.lerp(cursorX, cursor.position.x, 0.2)),
              (cursor.position.y = Math.lerp(cursorY, cursor.position.y, 0.2)));
            const cursorScale =
              (Math.range(Stage.width, 1600, 960, 80, 60) / Stage.width) *
              _this.screenWidth *
              cursorIndicator._scale;
            ((cursorBg.scale._lerpScalar = Math.lerp(
              cursorScale,
              cursorBg.scale._lerpScalar || 0,
              0.1,
            )),
              cursorBg.scale.setScalar(cursorBg.scale._lerpScalar),
              cursorIndicator.scale.setScalar(cursorBg.scale._lerpScalar / 4),
              (cursorIndicator.shader.uniforms.uAlpha.value = Math.lerp(
                cursorIndicator._opacity,
                cursorIndicator.shader.uniforms.uAlpha.value,
                0.2,
              )));
            const indicatorDirection = Mouse.tilt.x > 0 ? 0 : 1;
            cursorIndicator.rotation.z = Math.lerp(
              indicatorDirection * Math.PI,
              cursorIndicator.rotation.z,
              0.1,
            );
            const deltaX = Mouse.x - prevMouseX;
            (Math.abs(deltaX) > 0.01 &&
              (deltaX > 0 ? (direction = 1) : deltaX < 0 && (direction = -1)),
              slider.isDragging() || (rotationY += 0.1 * direction * delta));
            const extraRotationY = slider.elapsed * -PI2,
              targetBottleRotationY =
                rotationY +
                extraRotationY +
                (bottleGroup.position.x / _this.screenWidth) * Math.PI2;
            prevMouseX = Mouse.x;
            let mousex = Device.mobile
              ? 0.4 * Math.sin(3e-4 * Render.TIME)
              : Mouse.tilt.x;
            bottleTransform.position.x = Math.lerp(
              0.75 * mousex,
              bottleTransform.position.x,
              0.1,
            );
            const zMul = Math.range(Stage.width, 500, 600, 0, 1, !0),
              zTarget = slider.isDragging() ? 0.7 : 0.6;
            ((bottleTransform.position.z = Math.lerp(
              zTarget * zMul,
              bottleTransform.position.z,
              0.1,
            )),
              (bottleRotation.rotation.y = lerpAngle(
                mousex * Math.PI,
                bottleRotation.rotation.y,
                0.1,
              )),
              (bottleRoot.rotation.y = lerpAngle(
                targetBottleRotationY,
                bottleRoot.rotation.y,
                0.1,
              )),
              (bottleTransform.rotation.z = lerpAngle(
                0.01 * Math.cos(0.1 * _t) + (mousex * Math.PI) / 12,
                bottleTransform.rotation.z,
                0.1,
              )),
              (_wobbleAmountToAddX += Math.clamp(
                (_positionVelocity.value.x + _rotationVelocity.value.x) *
                  wobbleVelMultiplier,
                -wobbleMax,
                wobbleMax,
              )),
              (_wobbleAmountToAddZ += Math.clamp(
                (_positionVelocity.value.z + _rotationVelocity.value.z) *
                  wobbleVelMultiplier,
                -wobbleMax,
                wobbleMax,
              )));
          }
          function updateColors(key) {
            ((group1._color = new Color(input.get(key))),
              (group1._colorDark = new Color(input.get(`${key}Dark`))),
              liquid.shader.set("uColor", group1._color),
              liquid.shader.set("uColorDark", group1._colorDark));
          }
          (_this.ui.updateLabels({
            prev: slides[currentSlide]._prevLabel,
            next: slides[currentSlide]._nextLabel,
          }),
            _this.startRender(loop),
            appState.bind("blueColor", () => updateColors("blueColor")),
            appState.bind("blueColorDark", () => updateColors("blueColor")),
            appState.bind("greenColor", () => updateColors("greenColor")),
            appState.bind("greenColorDark", () => updateColors("greenColor")),
            appState.bind("yellowColor", () => updateColors("yellowColor")),
            appState.bind("yellowColorDark", () => updateColors("yellowColor")),
            _this.bind("Global/selectedBottle", (value) => {
              (slider.jumpTo(value - 1), loop());
            }));
        }));
      let _blockHorizontal = !1,
        _lastMouse = null,
        _dragStart = null,
        _userIntentIsSwipe = !1,
        _userIntentIsScroll = !1;
      function handleInteractionDrag(e) {
        if (!Device.mobile) return;
        const { x: x, y: y } = e;
        if (null === _dragStart)
          return (
            (_dragStart = { x: x, y: y }),
            (_lastMouse = { x: x, y: y }),
            (_this.slider.input.move.x = 0),
            (_this.slider.input.move.y = 0),
            (_this.slider.input.delta.x = 0),
            (_this.slider.input.delta.y = 0),
            (_this.slider.input.velocity.x = 0),
            (_this.slider.input.velocity.y = 0),
            void _this.slider.input.events.fire(Interaction.START, {
              target: {},
            })
          );
        const frameDelta = { x: x - _lastMouse.x, y: y - _lastMouse.y },
          totalDelta = { x: x - _dragStart.x, y: y - _dragStart.y },
          userIntentIsSwipe = Math.abs(totalDelta.x) >= 20;
        userIntentIsSwipe && (_userIntentIsSwipe = userIntentIsSwipe);
        const userIntentIsScroll =
          Math.abs(totalDelta.y) >= 20 && !_userIntentIsSwipe;
        (userIntentIsScroll && (_userIntentIsScroll = userIntentIsScroll),
          _userIntentIsSwipe &&
            !_userIntentIsScroll &&
            ((_this.getSync("Story/scroll").enabled = !1),
            (_this.slider.input.move.x = x - _dragStart.x),
            (_this.slider.input.move.y = y - _dragStart.y),
            (_this.slider.input.delta.x = frameDelta.x),
            (_this.slider.input.delta.y = frameDelta.y),
            _this.slider.input.events.fire(Interaction.MOVE, e),
            (_lastMouse = { x: x, y: y })));
      }
      function handleInteractionEnd(e) {
        null !== _dragStart &&
          ((_this.getSync("Story/scroll").enabled = !0),
          _this.slider.input.events.fire(Interaction.END, e),
          (_blockHorizontal = !1),
          (_lastMouse = null),
          (_dragStart = null),
          (_userIntentIsSwipe = !1),
          (_userIntentIsScroll = !1));
      }
      onInit = _this.onInit === onInit ? null : _this.onInit;
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "ProductsScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }