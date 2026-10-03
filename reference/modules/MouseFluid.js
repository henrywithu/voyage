function MouseFluid(_params = { active: !0, mouse: Mouse }) {
    Inherit(this, Object3D);
    const _this = this;
    var _config, _fluid, _custom;
    this.scale = 1;
    var _layout,
      _scale = 1,
      _last = new Vector2(),
      _mouse = new Vector2(),
      _white = new Color("#ffffff");
    function loop() {
      if (_this.disabled) return;
      _scale += (_this.scale - _scale) * Math.framerateNormalizeLerpAlpha(0.05);
      const storyScroll = AppState.get("Story/scroll");
      (storyScroll &&
        _fluid.setScrollDelta(storyScroll.delta.x, storyScroll.delta.y),
        _custom || _mouse.copy(_params.mouse));
      let len = _mouse.distanceTo(_last),
        size = _this.scaleBasedOnVelocity
          ? Math.range(len, 0, 5, 0, 60, !0)
          : 25;
      size *= 0.8;
      let delta = Math.range(len, 0, 15, 0, 10, !0);
      if (_this._handDown) {
        const size = Math.sin(0.004 * Render.TIME),
          fsize = Math.range(size, 0, 1, 100, 140, !0),
          x = 100 * Math.sin(0.004 * Render.TIME),
          y = 100 * Math.cos(0.004 * Render.TIME);
        _fluid.drawInput(_mouse.x + x, _mouse.y + y, 20, 20, _white, fsize);
      } else
        len > 0.01 &&
          _fluid.drawInput(
            _mouse.x,
            _mouse.y,
            (_mouse.x - _last.x) * delta,
            (_mouse.y - _last.y) * delta,
            _white,
            size * _scale,
          );
      _last.copy(_mouse);
      let scrollDelta = storyScroll?.delta?.y || 0,
        scrollLen = Math.abs(scrollDelta);
      if (scrollLen > 0.01) {
        let scrollForce =
            Math.range(scrollLen, 0, 40, 0, 10, !0) * Math.sign(scrollDelta),
          scrollSize = Math.range(scrollLen, 0, 40, 20, 70, !0) * _scale;
        _fluid.drawInput(
          _mouse.x,
          _mouse.y,
          0,
          -20 * scrollForce,
          _white,
          scrollSize,
        );
      }
    }
    ((this.scaleBasedOnVelocity = !0),
      (async function () {
        ((_layout = _this.initClass(SceneLayout, "mousefluid")),
          ((_fluid = await _layout.getLayer("fluid")).forcePersist = !0),
          (function initConfig() {
            ((_config = InputUIL.create(
              _fluid.uilInput.prefix + "mousefluid",
              _fluid.uilGroup,
            )).setLabel("MouseFluid Config"),
              _config.add("scale", 1),
              (_config.onUpdate = (key) => {
                if ("scale" === key) _this.scale = _config.getNumber("scale");
              }),
              _config.onUpdate());
          })(),
          _this.isPlayground() && _fluid.initMesh(),
          (_this.fluid = _fluid),
          _params.active
            ? _this.startRender(loop, RenderManager.AFTER_LOOPS)
            : (_fluid.visible = !1));
      })(),
      (this._handDown = !1),
      (this.applyTo = async function (shader) {
        (await _this.wait("fluid"),
          (shader.uniforms.tFluid = _fluid.fbos.velocity.uniform),
          (shader.uniforms.tFluidMask = { value: _fluid }));
      }),
      (this.useCustomMouse = function () {
        _custom = !0;
      }),
      (this.getFluid = async function () {
        return (await _this.wait("fluid"), _this.fluid);
      }),
      this.get("mouse", (_) => _mouse),
      this.get("layout", (_) => _layout));
  }