function Scrollbar(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, GLUIElement),
      Inherit(_this, XComponent),
      (_this.fragName = "Scrollbar"),
      (_this.contexts = "GLUIElement"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          _type: "UI",
          refName: "ui",
          children: [
            {
              bg: "#ff0000",
              _type: "glObject",
              refName: "thumb",
              children: [],
            },
            { _type: "glObject", refName: "track", children: [] },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.set("hover", !1),
        _this.set("dragging", !1),
        (_this.thumbShader = _this.createFragment(
          Shader,
          "ScrollbarThumbShader",
          {
            tNoise: {
              value: Utils3D.getRepeatTexture(
                "assets/images/story/clouds_noise.png",
              ),
            },
            tScene: { value: null },
            uDelta: { value: 0 },
            uHover: { value: 0 },
            uShow: { value: 0 },
            transparent: !0,
          },
        )));
      let _dragOffsetY = 0;
      function onTrackOver(e) {
        _this.set("hover", "over" === e.action);
      }
      function onMouseDown() {
        if (Device.mobile || Mouse.x < _this.track.x) return;
        const scroll = _this.getSync("Story/scroll");
        if (!scroll) return;
        Mouse.y >= _this.thumb.y &&
          Mouse.y <= _this.thumb.y + _this.thumb.height &&
          (_this.set("dragging", !0),
          (_dragOffsetY = Mouse.y - _this.thumb.y),
          (scroll.enabled = !1),
          __window.bind("mousemove", onDragMove),
          __window.bind("mouseup", onDragEnd));
      }
      function onDragMove() {
        const scroll = _this.getSync("Story/scroll");
        if (!scroll || !scroll.max.y) return;
        const maxY = Stage.height - _this.thumb.height,
          thumbY = Math.clamp(Mouse.y - _dragOffsetY, 0, maxY);
        scroll.setTarget((thumbY / maxY) * scroll.max.y);
      }
      function onDragEnd() {
        _this.set("dragging", !1);
        const scroll = _this.getSync("Story/scroll");
        (scroll && (scroll.enabled = !0),
          __window.unbind("mousemove", onDragMove),
          __window.unbind("mouseup", onDragEnd));
      }
      function onTrackClick() {
        if (Device.mobile || _this.getSync("dragging")) return;
        const scroll = _this.getSync("Story/scroll");
        if (!scroll) return;
        const yTarget = (Mouse.y / Stage.height) * scroll.max.y;
        scroll.setTarget(yTarget);
      }
      function onResize() {
        const trackWidth = Math.range(Stage.width, 320, 1600, 10, 15, !0);
        ((_this.track.width = trackWidth),
          (_this.track.height = Stage.height),
          (_this.track.x = Stage.width - trackWidth));
        const width = Math.range(Stage.width, 320, 1600, 7, 10, !0);
        ((_this.thumb.width = width),
          (_this.thumb.height = 0.15 * Stage.height),
          (_this.thumb.x = Stage.width - width - 2));
      }
      function loop() {
        const scroll = _this.getSync("Story/scroll");
        if (!scroll || !scroll.max.y) return;
        const percent = scroll.y / scroll.max.y,
          maxY = Stage.height - _this.thumb.height;
        _this.thumb.y = Math.lerp(percent * maxY, _this.thumb.y, 0.13);
        const yOffset = Math.range(percent, 0, 1, -2, 2);
        ((_this.thumb.y += yOffset),
          (_this.thumbShader.uniforms.uDelta.value = Math.lerp(
            scroll.delta.y,
            _this.thumbShader.uniforms.uDelta.value,
            0.13,
          )));
        const targetHover = _this.get("hover") ? 1 : 0;
        _this.thumbShader.uniforms.uHover.value = Math.lerp(
          targetHover,
          _this.thumbShader.uniforms.uHover.value,
          0.13,
        );
      }
      ((_this.onInit = async function () {
        (GLUI.Stage.add(_this.ui),
          _this.onResize(onResize),
          _this.startRender(loop),
          _this.thumb.setZ(50),
          _this.track.setZ(20),
          await _this.thumb.ready,
          _this.thumbShader.set("tScene", World.NUKE.prevFrameRT),
          _this.thumb.useShader(_this.thumbShader),
          _this.track.interact(onTrackOver, onTrackClick),
          __window.bind("mousedown", onMouseDown),
          _this.listen("Global/loaderFinished", () => {
            _this.thumbShader.tween("uShow", 1, 1200, "easeOutSine", 3e3);
          }));
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
          "Scrollbar" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }