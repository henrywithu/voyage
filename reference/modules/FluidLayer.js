function FluidLayer(_input, _group) {
    Inherit(this, Object3D);
    var _fluid,
      _config,
      _this = this;
    (!(function initConfig() {
      ((_this.uilInput = _input),
        (_this.uilGroup = _group),
        (_config = InputUIL.create(_input.prefix + "fluid", _group)).setLabel(
          "Fluid Config",
        ),
        (_this.config = _config),
        _config.add("dyeSize", 512),
        _config.add("simSize", 128),
        _config.add("velocity", 0.98),
        _config.add("density", 0.97),
        _config.add("pressure", 0.8),
        _config.add("iterations", 5),
        _config.add("curl", 30),
        _config.add("defaultRadius", 25),
        _config.addToggle("debugMouse", !1));
    })(),
      (function initFluid() {
        let stage = Stage,
          parent = _this.parent;
        for (; parent;) {
          if ("function" == typeof parent.Stage) {
            stage = parent.Stage();
            break;
          }
          parent = parent.parent;
        }
        let rect = stage,
          wildcard = _input.get("wildcard");
        if (wildcard && wildcard.includes("x")) {
          let split = wildcard.split("x");
          rect = { width: Number(split[0]), height: Number(split[1]) };
        }
        ((_fluid = _this.initClass(
          Fluid,
          _config.getNumber("simSize"),
          _config.getNumber("dyeSize"),
          rect,
        )),
          (_this.rt = _fluid.rt),
          (_this.fbos = _fluid.fbos),
          (_config.onUpdate = (key) => {
            switch (key) {
              case "velocity":
                _fluid.updateConfig(
                  "VELOCITY_DISSIPATION",
                  _config.getNumber(key),
                );
                break;
              case "density":
                _fluid.updateConfig(
                  "DENSITY_DISSIPATION",
                  _config.getNumber(key),
                );
                break;
              case "pressure":
                _fluid.updateConfig(
                  "PRESSURE_DISSIPATION",
                  _config.getNumber(key),
                );
                break;
              case "iterations":
                _fluid.updateConfig(
                  "PRESSURE_ITERATIONS",
                  _config.getNumber(key),
                );
                break;
              case "curl":
                _fluid.updateConfig("CURL", _config.getNumber(key));
                break;
              case "defaultRadius":
                _fluid.updateConfig("SPLAT_RADIUS", _config.getNumber(key));
                break;
              case "debugMouse":
                _fluid.updateConfig("DEBUG_MOUSE", _config.get(key));
            }
          }),
          [
            "velocity",
            "density",
            "pressure",
            "iterations",
            "curl",
            "defaultRadius",
            "debugMouse",
          ].forEach(_config.onUpdate));
      })(),
      (this.initMesh = function initMesh() {
        let shader = _this.initClass(Shader, "ScreenQuad", {
            tMap: { value: _fluid.rt },
          }),
          mesh = new Mesh(World.QUAD, shader);
        return (_this.add(mesh), (_this.mesh = mesh), mesh);
      }),
      (this.drawInput = _fluid.drawInput),
      (this.drawSplatTexture = _fluid.drawSplatTexture),
      (this.setScrollDelta = _fluid.setScrollDelta),
      this.set("additiveBlending", (v) => (_fluid.additiveBlending = v)),
      (this.applyTo = function (shader) {
        ((shader.uniforms.tFluid = _this.fbos.velocity.uniform),
          (shader.uniforms.tFluidMask = { value: _this }));
      }));
  }