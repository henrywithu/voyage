function ParticleCurveBase(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "ParticleCurveBase"),
      (_this.contexts = "Component"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit,
        _lastPosTexture = null,
        _lastTangentTexture = null;
      ((_this.drawCurveDebug = (curve, color = 0, width = 5) => {
        const curve1Points = curve.getPoints(256),
          curve1LineDebug = new Line3D({ width: 5, color: color });
        return (
          curve1Points.forEach((point) => {
            curve1LineDebug.draw(point);
          }),
          curve1LineDebug
        );
      }),
        (_this.setCurveFromInstance = async (instance) => {
          (_lastPosTexture && _lastPosTexture.destroy(),
            _lastTangentTexture && _lastTangentTexture.destroy(),
            await _this.layers.particles.ready());
          const instanceShader = instance.layers.particles.behavior.shader;
          (_this.layers.particles.behavior.shader.set(
            "tCurvePos",
            instanceShader.get("tCurvePos"),
          ),
            _this.layers.particles.behavior.shader.set(
              "tCurveTangent",
              instanceShader.get("tCurveTangent"),
            ),
            _this.layers.particles.behavior.shader.set(
              "uCurveCount",
              instanceShader.get("uCurveCount"),
            ),
            (_this.spawnPoint = instance.spawnPoint));
        }),
        (_this.setCurveGPU = async function setCurveGPU(curve) {
          const posbuffer = new Float32Array(1024),
            tangentbuffer = new Float32Array(1024);
          for (let i = 0; i < 256; i++) {
            const u = i / 255,
              point = curve.getPoint(u),
              tangent = curve.getTangent(u);
            (0 === i && (_this.spawnPoint = point),
              (posbuffer[4 * i + 0] = point.x),
              (posbuffer[4 * i + 1] = point.y),
              (posbuffer[4 * i + 2] = point.z),
              (posbuffer[4 * i + 3] = 1),
              (tangentbuffer[4 * i + 0] = tangent.x),
              (tangentbuffer[4 * i + 1] = tangent.y),
              (tangentbuffer[4 * i + 2] = tangent.z),
              (tangentbuffer[4 * i + 3] = 1));
          }
          (_lastPosTexture && _lastPosTexture.destroy(),
            _lastTangentTexture && _lastTangentTexture.destroy());
          const posTexture = new DataTexture(posbuffer, 256, 1, Texture.RGBA),
            tangentTexture = new DataTexture(
              tangentbuffer,
              256,
              1,
              Texture.RGBA,
            );
          return (
            (posTexture.destroyDataAfterUpload = !1),
            (tangentTexture.destroyDataAfterUpload = !1),
            (posTexture.needsUpdate = !0),
            (tangentTexture.needsUpdate = !0),
            await _this.layers.particles.ready(),
            _this.layers.particles.behavior.shader.set("tCurvePos", posTexture),
            _this.layers.particles.behavior.shader.set(
              "tCurveTangent",
              tangentTexture,
            ),
            _this.layers.particles.behavior.shader.set("uCurveCount", 256),
            (_lastPosTexture = posTexture),
            (_lastTangentTexture = tangentTexture),
            { posTexture: posTexture, tangentTexture: tangentTexture }
          );
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
          "ParticleCurveBase" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }