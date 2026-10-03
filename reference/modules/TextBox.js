function TextBox(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Object3D),
      Inherit(_this, XComponent),
      (_this.fragName = "TextBox"),
      (_this.contexts = "Object3D"),
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
      AudioManager.instance();
      TweenManager.addCustomEase({
        name: "textBoxEase",
        curve: "cubic-bezier(0.45, 0.30, 0.16, 1.00)",
      });
      const container = new Group();
      (Config.NO_TEXT_BOXES || _this.add(container),
        (_this.params.padx = _this.params.padx ?? 0),
        (_this.params.pady = _this.params.pady ?? 0),
        (_this.params.offsetZ = _this.params.offsetZ ?? 0.25),
        (_this.params.fontSize = _this.params.fontSize ?? 0.044),
        (_this.params.padding = _this.params.padding ?? 0.2),
        (_this.params.width = Number(_this.params.width ?? 1 / 0)),
        (_this.params.body =
          VOManager.data[_this.params.id]?.words
            .map(({ text: text }) => text)
            .join("") ?? _this.params.body));
      const options = {
          color: _this.params.color,
          width: _this.params.width * Global.UNITS_PER_PIXEL_Y,
          lineHeight: _this.params.lineHeight ?? 1.7,
          align: "left",
          shader: "TextBoxTextShader",
          karaoke: VOManager.data[_this.params.id],
        },
        _id = Utils.uuid();
      ((Global.ALL_TEXTS = Global.ALL_TEXTS || {}),
        (Global.ALL_TEXTS[_id] = {
          id: _this.params.id,
          text: _this.params.body,
          frag: _this,
        }));
      const gluiText = _this.glText(
        _this.params.body.toUpperCase(),
        "PPNikkeiMaru-Regular",
        _this.params.fontSize,
        options,
      );
      gluiText.loaded().then(() => {
        gluiText.shader.addUniforms({
          uColorHighlight: { value: new Color("#c82924") },
        });
      });
      const bgShader = _this.createFragment(Shader, "BorderBGShader", {
        uColor: { value: new Color("#ffffff") },
        uColor1: { value: new Color("#ffffff") },
        uBorder: { value: new Color("#111111") },
        alpha: { value: 1 },
        uAspectRatio: { value: 1 },
        uDimensions: { value: new Vector2() },
        tNoise: {
          value: Utils3D.getRepeatTexture(
            "assets/images/story/clouds_noise.png",
          ),
          ignoreUIL: !0,
        },
        transparent: !0,
        depthTest: !1,
        depthWrite: !1,
      });
      container.add(gluiText.group);
      const bg = new Mesh(World.PLANE, bgShader);
      bg.upload();
      const bgContainer = new Group();
      (bgContainer.add(bg),
        container.add(bgContainer),
        await gluiText.loaded(),
        (gluiText.mesh.shader.nullRender = !0),
        _this.events.sub(World.NUKE, Nuke.BEFORE_POST_RENDER, () => {
          if (gluiText.mesh._drawing) {
            const oldAutoClear = World.RENDERER.autoClear;
            ((World.RENDERER.autoClear = !1),
              World.RENDERER.renderSingle(gluiText.mesh, World.NUKE.camera),
              (World.RENDERER.autoClear = oldAutoClear));
          }
        }),
        gluiText.mesh.shader.addUniforms({
          uKaraokeTime: { value: 0 },
          uKaraokeInfluence: { value: 1 },
        }),
        Config.NO_VO &&
          (gluiText.mesh.shader.uniforms.uKaraokeInfluence.value = 0),
        gluiText.text.centerY());
      const worldPos = new Vector3();
      let _textAnimation;
      (_this.params.ontop &&
        _this.startRender(() => {
          ((container.renderOrder = 99999999999),
            (bg.renderOrder = 99999999999));
        }),
        _this.events.sub(AudioManager.MUTED, (_) => handleAudioMute(!0)),
        _this.events.sub(AudioManager.UNMUTED, (_) => handleAudioMute(!1)),
        _this.listen("VOManager/reset", () => {
          (_this.flag("animatedIn", !1),
            _this.animateSet(),
            gluiText.mesh.shader.set("uKaraokeTime", 0),
            gluiText.mesh.shader.set("uKaraokeInfluence", 1));
        }),
        _this.listen("Global/scenesReady", async () => {
          (await defer(),
            _this.listen("Story/scrollY", (scroll) => {
              _this.parent.visible
                ? (_this.group.getWorldPosition(worldPos),
                  !_this.flag("animatedIn") &&
                  scroll <
                    worldPos.y -
                      0.5 * gluiText.dimensions.height +
                      0.6 * _this.screenHeightWorld
                    ? _this.animateIn()
                    : ((_this.flag("animatedIn") &&
                        scroll <
                          worldPos.y -
                            gluiText.dimensions.height -
                            _this.screenHeightWorld / 2) ||
                        (_this.flag("animatedIn") &&
                          scroll >=
                            worldPos.y -
                              0.5 * gluiText.dimensions.height +
                              0.6 * _this.screenHeightWorld)) &&
                      VOManager.removeFromQueue(_this.params.id))
                : VOManager.removeFromQueue(_this.params.id);
            }));
        }),
        (function initAnimationController() {
          ((_textAnimation = _this.initClass(GLTextAnimation, {
            glText: gluiText.text,
          })),
            _textAnimation.add("uTranslate", {
              animateBy: "lines",
              stagger: 200,
              duration: 2e3,
              delay: 0,
              ease: "easeOutQuart",
            }),
            _textAnimation.add("uOpacity", {
              animateBy: "lines",
              stagger: 100,
              duration: 1200,
              delay: 300,
              ease: "easeOutQuart",
            }));
        })(),
        (_this.animateSet = () => {
          ((container.scale.x = 0.25),
            (container.position.x = -0.5),
            bg.shader.set("alpha", 0));
        }),
        (_this.animateIn = () => {
          _this.visible &&
            (_this.flag("animatedIn", !0),
            _textAnimation.play("uTranslate", !1, {
              calculateItemDelayOverride: (index, count) =>
                (count > 4 ? 150 : 200) * index,
            }),
            _textAnimation.play("uOpacity", !1, {
              calculateItemDelayOverride: (index, count) =>
                (count > 4 ? 150 : 100) * index,
            }),
            tween(container.position, { x: 0 }, 800, "textBoxEase"),
            tween(container.scale, { x: 1 }, 800, "textBoxEase"),
            bg.shader.tween("alpha", 1, 333, "linear"),
            VOManager.addToQueue(_this.params.id),
            AudioUtils.playRoundRobin("textbox", { allowSimultaneous: !0 }));
        }));
      let _voStartTime = 0;
      function handleAudioMute(muted) {
        const value = muted ? 0 : 1;
        tween(
          gluiText.mesh.shader.uniforms.uKaraokeInfluence,
          { value: value },
          400,
          "easeOutCubic",
        );
      }
      ((_this.startVoAnimation = function () {
        ((_voStartTime = AudioManager.instance().ctx.currentTime),
          gluiText.mesh.shader.set("uKaraokeTime", 0),
          _this.startRender(_this.updateVoAnimation));
      }),
        (_this.updateVoAnimation = function () {
          const audioProgress =
            AudioManager.instance().ctx.currentTime - _voStartTime;
          gluiText.mesh.shader.set("uKaraokeTime", audioProgress);
        }),
        (_this.stopVoAnimation = function () {
          (_this.clearRenders(),
            tween(
              gluiText.mesh.shader.uniforms.uKaraokeInfluence,
              { value: 0 },
              600,
              "easeOutCubic",
            ));
        }),
        (_this.handleResize = async function handleResize() {
          const dist = Global.CAMERA.camera.position.length();
          _this.screenHeightWorld = Utils3D.getHeightFromCamera(
            Global.CAMERA.camera,
            dist - _this.params.offsetZ,
          );
          const screenWidthWorld = Utils3D.getWidthFromCamera(
              Global.CAMERA.camera,
              dist - _this.params.offsetZ,
            ),
            sceneHeightWorld = _this.parent.heightWorld,
            halfScreenWidthWorld = 0.5 * screenWidthWorld,
            halfSceneHeight = 0.5 * sceneHeightWorld,
            convertedWidth = _this.params.width * Global.UNITS_PER_PIXEL_Y;
          await gluiText.resize({ ...options, width: convertedWidth });
          const width = Math.min(
            gluiText.dimensions.width,
            screenWidthWorld - _this.params.padding - _this.params.padx,
          );
          width !== gluiText.dimensions.width &&
            (await gluiText.resize({ ...options, width: width }));
          ((gluiText.mesh.renderOrder = 1001), (bg.renderOrder = 1001));
          const totalWidth = gluiText.dimensions.width + _this.params.padding,
            totalHeight = gluiText.dimensions.height + _this.params.padding,
            bgOffset = 0.1 * _this.params.fontSize;
          ((bgContainer.position.y = -bgOffset),
            (bgContainer.position.x = 0.5 * gluiText.dimensions.width),
            (bg._scale = new Vector3(totalWidth, totalHeight, 1)),
            bg.scale.copy(bg._scale),
            bgShader.set("uAspectRatio", totalWidth / totalHeight));
          let xoffset = 0;
          switch (_this.params.horizontalAlign) {
            case "left":
              xoffset = _this.params.padx;
              break;
            case "right":
              xoffset = screenWidthWorld - totalWidth - _this.params.padx;
              break;
            case "center":
              xoffset =
                halfScreenWidthWorld - 0.5 * totalWidth + _this.params.padx;
              break;
            default:
              xoffset = 0;
          }
          let yoffset = 0;
          switch (_this.params.verticalAlign) {
            case "bottom":
              yoffset = -halfSceneHeight + _this.params.pady;
              break;
            case "top":
              yoffset = halfSceneHeight - _this.params.pady;
              break;
            case "center":
              yoffset = _this.params.pady;
              break;
            default:
              yoffset = 0;
          }
          (bgShader.set(
            "uDimensions",
            new Vector2(gluiText.dimensions.width, gluiText.dimensions.height),
          ),
            _this.group.position.set(
              0.5 * -screenWidthWorld + 0.5 * _this.params.padding + xoffset,
              yoffset,
              _this.params.offsetZ,
            ));
        }),
        _this.flag("isReady", !0),
        (onInit = _this.onInit === onInit ? null : _this.onInit));
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "TextBox" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }