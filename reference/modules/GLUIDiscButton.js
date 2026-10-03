function GLUIDiscButton(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, GLUIElement),
      Inherit(_this, XComponent),
      (_this.fragName = "GLUIDiscButton"),
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
        (_this.params.size = _this.params.size ?? 120),
        (_this.params.fontSize = _this.params.fontSize ?? 16),
        (_this.params.text = _this.params.text?.toUpperCase() ?? "Cursor"),
        (_this.params.manualHits = _this.params.manualHits ?? !1),
        (_this.params.cursorType = _this.params.cursorType ?? "grab"),
        (_this.params.getUIHit = _this.params.getUIHit ?? null),
        (_this.params.subToHoldEvent = _this.params.subToHoldEvent ?? !0),
        (_this.isHolding = !1),
        (_this.canAnimateIn = !0),
        (_this.lerpTarget = 1));
      let _clickCallback = null;
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
      text.setZ(0.1);
      const bg = _this.gl(_this.params.size, _this.params.size, "#ffffff"),
        bgShader = _this.createFragment(Shader, "GLUICursorBGShader", {
          tNoise: {
            value: Utils3D.getRepeatTexture(
              "assets/images/story/clouds_noise.png",
            ),
            ignoreUIL: !0,
          },
          uHover: { value: 0 },
          uVelocity: { value: new Vector2(0, 0) },
          uDiscard: { value: new Vector2(0, 0) },
        });
      (_this.bind("Story/scrollY", (value) => {
        const screenHeightWorld = _this.getSync("Story/screenHeightWorld");
        ((bgShader.uniforms.uDiscard.value.y = Math.max(
          1,
          (_this.parent.worldTop + value) / screenHeightWorld,
        )),
          (bgShader.uniforms.uDiscard.value.x =
            (_this.parent.worldBottom + value) / screenHeightWorld));
      }),
        bg.useShader(bgShader));
      const hitboxSize = 1.3 * _this.params.size,
        hitbox = _this.gl(hitboxSize, hitboxSize, "#FFFF00");
      ((hitbox.x = (_this.params.size - hitboxSize) / 2),
        (hitbox.y = (_this.params.size - hitboxSize) / 2),
        (hitbox.z = -0.01),
        (hitbox.shader.neverRender = !Utils.query("debugHit")));
      const transform = _this.gl();
      (transform.add(bg),
        transform.add(hitbox),
        (transform.x = -bg.width / 2),
        (transform.y = -bg.height / 2),
        transform.add(text),
        (text.x = bg.width / 2),
        (text.y = bg.height / 2),
        _this.element.add(transform),
        text.loaded().then(() => {
          ((text.x = bg.width / 2),
            (text.y = bg.height / 2 - text.dimensions.height / 2));
        }),
        (_this.width = bg.width),
        (_this.height = bg.height),
        GLUI.Stage.add(_this.element),
        (_this.animateSet = () => {
          (_this.element.hide(), (_this.element.scale = 0), (text.alpha = 0));
        }));
      let elementTween = null;
      ((_this.animateIn = () => {
        Device.mobile &&
          (_this.flag("in") ||
            (console.log("animateIn!! disc"),
            _this.flag("in", !0),
            _this.element.show(),
            elementTween?.stop(),
            (elementTween = _this.element.tween(
              { scale: 1 },
              600,
              "easeOutCubic",
            )),
            text.tween({ alpha: 1 }, 600, "easeOutCubic")));
      }),
        (_this.animateOut = () => {
          Device.mobile &&
            _this.flag("in") &&
            (_this.flag("in", !1),
            elementTween?.stop(),
            (elementTween = _this.element
              .tween({ scale: 0 }, 300, "easeOutCubic")
              .onComplete(() => {
                _this.element.hide();
              })));
        }),
        (_this.onInit = async () => {
          let ui;
          ((_this.scrollInstance = await _this.get("Story/scroll")),
            _this.animateSet(),
            _this.params.getUIHit
              ? ((ui = await _this.params.getUIHit()), (ui = ui.element || ui))
              : (await _this.wait(() => _this.parent.ui),
                (ui = _this.parent.ui.element)),
            (_this.checkDiscPosition = () => {
              const bounds = ui.div.getBoundingClientRect(),
                { x: x, y: y } = _this.element;
              let inside =
                x >= bounds.left &&
                x <= bounds.right &&
                y >= bounds.top &&
                y <= bounds.bottom;
              (0 !== bounds.width && 0 !== bounds.height) || (inside = !1);
              const hasEnoughSpace = bounds.bottom >= bounds.height / 3;
              inside && hasEnoughSpace
                ? !_this.isHolding && _this.canAnimateIn && _this.animateIn()
                : (_this.isHolding &&
                    ((_this.isHolding = !1),
                    (_this.scrollInstance.enabled = !0)),
                  _this.animateOut());
            }),
            _this.startRender(function loop() {
              _this.checkDiscPosition();
            }, 24),
            _this.events.sub(Mouse.input, Interaction.START, (e) => {
              GLUI.Stage.interaction.checkObjectHit(hitbox, e) &&
                Math.abs(_this.scrollInstance.delta.y) < 1 &&
                (_this.params.subToHoldEvent &&
                  (_this.enableTimer && clearTimeout(_this.enableTimer),
                  (_this.isHolding = !0),
                  _this.element.tween({ scale: 0.1 }, 400, "easeOutCubic"),
                  text.tween({ alpha: 0 }, 400, "easeOutCubic"),
                  (_this.scrollInstance.enabled = !1),
                  tween(_this, { lerpTarget: 0.08 }, 1e3, "easeOutCubic"),
                  _this.parent.onDiscHoldStart?.(e)),
                _clickCallback?.());
            }),
            _this.params.subToHoldEvent &&
              _this.events.sub(Mouse.input, Interaction.END, () => {
                _this.isHolding &&
                  (_this.enableTimer && clearTimeout(_this.enableTimer),
                  (_this.isHolding = !1),
                  _this.element.tween({ scale: 1 }, 400, "easeOutCubic"),
                  text.tween({ alpha: 1 }, 400, "easeOutCubic"),
                  tween(_this, { lerpTarget: 1 }, 5e3, "easeOutSine"),
                  _this.parent.onDiscHoldEnd?.(),
                  (_this.enableTimer = _this.delayedCall(() => {
                    _this.scrollInstance.enabled = !0;
                  }, 300)));
              }));
        }),
        (_this.onVisible = () => {
          _this.flag("in", !1);
        }),
        (_this.onInvisible = () => {
          _this.element.hide();
        }),
        (_this.onClick = (cb) => {
          _clickCallback = cb;
        }),
        (_this.updatePosOnHold = (defaultPos) => {
          const targetX = _this.isHolding ? Mouse.x : defaultPos.x,
            targetY = _this.isHolding ? Mouse.y : defaultPos.y;
          ((_this.element.x = Math.lerp(
            targetX,
            _this.element.x,
            _this.lerpTarget,
          )),
            (_this.element.y = Math.lerp(
              targetY,
              _this.element.y,
              _this.lerpTarget,
            )));
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
          "GLUIDiscButton" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }