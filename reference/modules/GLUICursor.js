function GLUICursor(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, GLUIElement),
      Inherit(_this, XComponent),
      (_this.fragName = "GLUICursor"),
      (_this.contexts = "GLUIElement"),
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
      ((_this.params = _this.params ?? {}),
        (_this.params.fontSize = _this.params.fontSize ?? 16),
        (_this.params.text = _this.params.text?.toUpperCase() ?? "Cursor"),
        (_this.params.manualHits = _this.params.manualHits ?? !1),
        (_this.params.cursorType = _this.params.cursorType ?? "grab"),
        (_this.params.getUIHit = _this.params.getUIHit ?? null));
      const text = new GLUIText(
        _this.params.text,
        "PPNikkeiMaru-Ultrabold",
        _this.params.fontSize,
        {
          color: new Color("#181818"),
          width: 100,
          align: "center",
          lineHeight: _this.params.text.includes("\n") ? 1 : 0.6,
        },
      );
      text.setZ(1);
      const bg = _this.gl(120, 120, "#ffffff"),
        bgShader = _this.createFragment(Shader, "GLUICursorBGShader", {
          tNoise: {
            value: Utils3D.getRepeatTexture(
              "assets/images/story/clouds_noise.png",
            ),
            ignoreUIL: !0,
          },
          uHover: { value: 0 },
          uVelocity: { value: new Vector2(0, 0) },
          uDiscard: { value: new Vector2(0, 1) },
        });
      bg.useShader(bgShader);
      const transform = _this.gl();
      (transform.add(bg),
        (transform.x = -bg.width / 2),
        (transform.y = -bg.height / 2),
        transform.add(text),
        (text.x = bg.width / 2),
        (text.y = bg.height / 2),
        _this.element.add(transform),
        text.loaded().then(() => {
          ((text.x = bg.width / 2),
            (text.y = bg.height / 2 - text.dimensions.height / 2),
            text.mesh.upload());
        }),
        bg.mesh.upload(),
        (_this.width = bg.width),
        (_this.height = bg.height),
        GLUI.Stage.add(_this.element),
        _this.startRender(function loop() {
          const value = _this.getSync("Story/scrollY"),
            screenHeightWorld = _this.getSync("Story/screenHeightWorld");
          ((bgShader.uniforms.uDiscard.value.y = Math.max(
            (_this.parent.worldTop + value) / screenHeightWorld,
            1,
          )),
            (bgShader.uniforms.uDiscard.value.x =
              (_this.parent.worldBottom + value) / screenHeightWorld));
          const rawVelocityX = Mouse.x - lastMouseX,
            rawVelocityY = Mouse.y - lastMouseY;
          ((smoothVelocityX = Math.lerp(rawVelocityX, smoothVelocityX, 0.1)),
            (smoothVelocityY = Math.lerp(rawVelocityY, smoothVelocityY, 0.1)),
            Device.mobile ||
              ((bgShader.uniforms.uVelocity.value.x = smoothVelocityX),
              (bgShader.uniforms.uVelocity.value.y = -smoothVelocityY)));
          const offsetX = Device.mobile ? 0 : -bg.width / 2,
            offsetY = Device.mobile ? 0 : bg.height / 2,
            newX = Math.lerp(Mouse.x + offsetX, _this.element.x, 0.1),
            newY = Math.lerp(Mouse.y + offsetY, _this.element.y, 0.1);
          ((_this.element.x = newX),
            (_this.element.y = newY),
            (lastMouseX = Mouse.x),
            (lastMouseY = Mouse.y));
        }));
      let lastMouseX = Mouse.x,
        lastMouseY = Mouse.y,
        smoothVelocityX = 0,
        smoothVelocityY = 0;
      ((_this.onVisible = () => {
        Device.mobile || Config.NO_CURSOR || _this.element.show();
      }),
        (_this.onInvisible = () => {
          _this.element.hide();
        }),
        (_this.animateSet = () => {
          (_this.flag("out", !1), (_this.element.scale = 0), (text.alpha = 0));
        }),
        (_this.animateIn = () => {
          (_this.flag("out", !1),
            (
              _this.parent.element ||
              _this.parent.ui.element ||
              _this.parent
            ).cursor(_this.params.cursorType),
            _this.element.tween({ scale: 1 }, 600, "easeOutCubic"),
            text.tween({ alpha: 1 }, 600, "easeOutCubic"));
        }),
        (_this.animateOut = () => {
          _this.flag("out") ||
            (_this.flag("out", !0),
            (
              _this.parent.element ||
              _this.parent.ui.element ||
              _this.parent
            ).cursor("default"),
            _this.element.tween({ scale: 0 }, 300, "easeOutCubic"),
            text.tween({ alpha: 0 }, 300, "easeOutCubic"),
            bgShader.tween("uHover", 0, 600, "easeOutCubic"));
        }),
        (_this.animateActive = (direction = "down") => {
          _this.flag("out") ||
            ("down" === direction
              ? ((
                  _this.parent.element ||
                  _this.parent.ui.element ||
                  _this.parent
                ).cursor("grabbing"),
                _this.element.tween({ scale: 0.5 }, 400, "easeOutCubic"),
                text.tween({ alpha: 0 }, 400, "easeOutCubic"),
                bgShader.tween("uHover", 1, 400, "easeOutCubic"))
              : ((
                  _this.parent.element ||
                  _this.parent.ui.element ||
                  _this.parent
                ).cursor("grab"),
                _this.element.tween({ scale: 1 }, 600, "easeOutCubic"),
                text.tween({ alpha: 1 }, 600, "easeOutCubic"),
                bgShader.tween("uHover", 0, 600, "easeOutCubic")));
        }));
      const hits = [];
      ((_this.registerCollider = (collider) => {
        hits.push({ hit: collider, isCollider: !0 });
      }),
        (_this.registerHit = (interaction3d, hit, onHover, onClick, onMove) => {
          if (0 === hits.length) {
            const checkMousePosition = () => {
              const hitResults = interaction3d.checkObjectHit(
                hits.map((h) => h.hit),
              );
              hits.forEach((h) => {
                h.isCollider ||
                  (hitResults?.object === h.hit
                    ? h.onHover({ action: "over" })
                    : h.onHover({ action: "out" }));
              });
            };
            _this.parent.startRender(checkMousePosition, 24);
          }
          const wrappedOnHover =
            ((onHoverFn = onHover),
            (e) => {
              if (
                (!hit._isHovering || "over" !== e.action) &&
                (hit._isHovering || "over" === e.action)
              )
                return ((hit._isHovering = "over" === e.action), onHoverFn(e));
            });
          var onHoverFn;
          (hits.push({ hit: hit, onHover: wrappedOnHover }),
            interaction3d.add(hit, null, onClick, onMove));
        }),
        (_this.onInit = async () => {
          if (Device.mobile)
            return (_this.element.hide(), void (_this.element.visible = !1));
          if ((_this.animateSet(), _this.params.manualHits)) return;
          let ui;
          _this.params.getUIHit
            ? ((ui = await _this.params.getUIHit()), (ui = ui.element || ui))
            : (await _this.wait(() => _this.parent.ui),
              (ui = _this.parent.ui.element));
          const onMouseDown = () => {
              (_this.animateActive("down"),
                (_this.mouseDown = !0),
                _this.parent.onMouseDown?.());
            },
            onMouseUp = () => {
              (_this.animateActive("up"),
                (_this.mouseDown = !1),
                _this.parent.onMouseUp?.());
            },
            onMouseEnter = () => {
              _this.mouseDown || _this.animateIn();
            },
            onMouseLeave = () => {
              ((_this.mouseDown = !1),
                _this.parent.onMouseUp?.(),
                _this.animateOut());
            };
          (ui.bind("mousedown", onMouseDown),
            ui.bind("mouseup", onMouseUp),
            ui.bind("mouseenter", onMouseEnter),
            ui.bind("mouseleave", onMouseLeave),
            _this._bindOnDestroy(() => {
              (ui.unbind("mousedown", onMouseDown),
                ui.unbind("mouseup", onMouseUp),
                ui.unbind("mouseenter", onMouseEnter),
                ui.unbind("mouseleave", onMouseLeave));
            }));
          _this.parent.startRender(() => {
            const bounds = ui.div.getBoundingClientRect(),
              mouseX = Mouse.x,
              mouseY = Mouse.y;
            mouseX > bounds.left &&
            mouseX < bounds.right &&
            mouseY > bounds.top &&
            mouseY < bounds.bottom - 100
              ? _this.mouseDown || _this.animateIn()
              : (_this.mouseDown &&
                  ((_this.mouseDown = !1), _this.parent.onMouseUp?.()),
                _this.animateOut());
          }, 24);
        }),
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
          "GLUICursor" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }