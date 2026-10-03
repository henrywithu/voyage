function AntiGravityUI(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseUI),
      Inherit(_this, XComponent),
      (_this.fragName = "AntiGravityUI"),
      (_this.contexts = "BaseUI"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          _type: "UI",
          refName: "unnamed",
          children: [],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.useScrollTrigger = !0),
        (_this.scrollTriggerOffsetIn = 0.25),
        (_this.scrollTriggerOffsetOut = 0.25));
      const pannerNode =
          _this.AUDIO_MANAGER.getEffectChain("panWithCursor").effects.panner,
        el = _this.element,
        pos = { x: 0, y: 0 };
      let lastPos = { x: 0, y: 0 };
      ((_this.onInit = () => {
        function onMouseUp() {
          (_this.onMouseUp(), _this.parent.onDrawUp?.());
        }
        (_this.animateSet(),
          Utils.query("orbit")
            ? (_this.element.div.style.pointerEvents = "none")
            : (Utils.query("orbit") ||
                (el.bind("mousemove", (e) => {
                  _this.flag("mouseDown") &&
                    (!(function draw(e) {
                      if (
                        1 !== e.buttons ||
                        _this.flag("block") ||
                        _this.flag("break")
                      )
                        return;
                      _this.flag("reset") && _this.flag("reset", !1);
                      ((lastPos.x = pos.x),
                        (lastPos.y = pos.y),
                        setPosition(e),
                        _this.parent.setDrawCoords?.(pos.x, pos.y),
                        (lastPos.x = pos.x),
                        (lastPos.y = pos.y),
                        pannerNode.setPan(
                          Math.range(pos.x, 0, Stage.width, -1, 1),
                        ));
                    })(e),
                    _this.parent.onDrawMove?.(e));
                }),
                el.bind("mousedown", (e) => {
                  (_this.flag("mouseDown", !0),
                    (function onMouseDown(e) {
                      (_this.parent.onDrawDown?.(e), setPosition(e));
                    })(e));
                }),
                el.bind("mouseenter", setPosition),
                el.bind("mouseup", () => {
                  (_this.flag("mouseDown", !1), onMouseUp());
                }),
                document.addEventListener("mouseout", (e) => {
                  _this.flag("mouseDown") && onMouseUp();
                })),
              _this.listen("DrawnParticles/DrawingComplete", () => {
                _this.onMouseUp();
              })));
      }),
        (_this.onMouseUp = () => {
          (_this.flag("reset", !0),
            _this.flag("break", !1),
            _this.flag("drawStarted", !1),
            (lastPos.y = -1e4));
        }),
        (_this.handleResize = function handleResize() {}));
      let _lastPos = { x: 0, y: 0 };
      function setPosition(e) {
        ((pos.x = e.clientX),
          (pos.y = e.clientY),
          (_lastPos.x = pos.x),
          (_lastPos.y = pos.y));
      }
      ((_this.onInView = () => {
        _this.animateIn();
      }),
        (_this.onOutView = () => {
          _this.animateOut();
        }),
        (_this.animateSet = () => {}),
        (_this.animateIn = () => {}),
        (_this.animateOut = () => {}),
        (_this.onDestroy = () => {
          (el.unbind("mousemove"),
            el.unbind("mousedown"),
            el.unbind("mouseenter"),
            el.unbind("mouseup"),
            el.unbind("mouseleave"));
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
          "AntiGravityUI" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }