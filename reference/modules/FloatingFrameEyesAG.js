function FloatingFrameEyesAG(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params?.sceneLayoutName || "FloatingFrameEyesAG"),
      Inherit(_this, XComponent),
      (_this.fragName = "FloatingFrameEyesAG"),
      (_this.contexts =
        'Frag3D, _params?.sceneLayoutName || "FloatingFrameEyesAG"'),
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
      const _m = new Matrix4(),
        _point1 = new Vector4(),
        _point2 = new Vector4(),
        _point3 = new Vector4(),
        _point4 = new Vector4(),
        [input, state] = _this.createUIL("Floating Frame Eyes AG Config");
      function openEyes() {
        ((_this.animation.elapsed = 0),
          _this.mesh.shader.set("uOpenEyesWeight", 0),
          _this.mesh.shader.set("uTransitionEyeColor", 0),
          tween(_this.animation, { elapsed: 75 }, 5e3, "linear"),
          _this.mesh.shader.tween("uOpenEyesWeight", 1, 2e3, "linear"),
          _this.mesh.shader.tween(
            "uTransitionEyeColor",
            1,
            2e3,
            "linear",
            700,
          ));
      }
      input.addButton("triggerOpenEyes", {
        label: "Trigger Open Eyes",
        actions: [
          {
            title: "Trigger",
            callback: () => {
              openEyes();
            },
          },
        ],
      });
      const geometry = await GeomThread.loadSkinnedGeometry(
          "assets/geometry/story/antigravity/eyes-widen.bin",
        ),
        shader = _this.initClass(Shader, "FloatingFrameEyesShaderAG", {
          uPoint1: { value: new Vector3() },
          uPoint2: { value: new Vector3() },
          uPoint3: { value: new Vector3() },
          uPoint4: { value: new Vector3() },
          uDPR: { value: Tests.getDPR() },
          uTransition: { value: 0 },
          uOpenEyesWeight: { value: 0 },
          tAtlas: {
            value: Utils3D.getRepeatTexture(
              "assets/images/story/tex_atlas.png",
            ),
          },
          tTrim: {
            value: Utils3D.getRepeatTexture(
              "assets/images/story/tex_trim-2.png",
            ),
          },
          tLines: {
            value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
          },
          tNoise: {
            value: Utils3D.getRepeatTexture("assets/images/story/perlin.png"),
          },
          uLinesTile: { value: 2.5 },
          uLightDir: { value: new Vector3(0.25, 0.25, 0.2) },
          uColor: { value: new Color("#7F7261") },
          uColorBG: { value: new Color("#bc251c") },
          uColorFlavor: { value: new Color("#63C4F4") },
          uTransitionEyeColor: { value: 0 },
        });
      ((shader.side = Shader.DOUBLE_SIDE), (shader.transparent = !0));
      const skin = new Skin(geometry, shader, geometry.bones);
      ((skin.autoUpdateBoneTexture = !1),
        (_this.animation = await skin.loadAnimation(
          "assets/geometry/story/antigravity/test2-animation.bin",
        )));
      const _windowMesh = new Mesh(geometry, shader.clone());
      (_windowMesh.upload(),
        _this.add(_windowMesh),
        (_windowMesh.shader.visible = !1),
        (_this.mesh = skin),
        (_this.mesh.renderOrder = 1e3),
        _this.add(_this.mesh),
        (_this.mesh._position = new Vector3()),
        (_this.handleResize = async function handleResize() {
          const screenHeightWorld = await _this.get("Story/screenHeightWorld"),
            sceneHeightWorld = _this.parent.heightWorld,
            aspect = Stage.width / Stage.height,
            screenWidthWorld = screenHeightWorld * aspect,
            halfScreenWidthWorld =
              0.5 *
              (Stage.width > 2100
                ? screenWidthWorld * (2100 / Stage.width)
                : screenWidthWorld),
            halfSceneHeight = 0.5 * sceneHeightWorld;
          let xoffset = 0;
          switch (_this.params.horizontalAlign) {
            case "left":
              xoffset =
                -halfScreenWidthWorld +
                _this.params.padx +
                _this.params.frameWidth;
              break;
            case "right":
              xoffset =
                halfScreenWidthWorld -
                _this.params.padx -
                _this.params.frameWidth;
              break;
            default:
              xoffset = 0;
          }
          let yoffset = 0;
          switch (_this.params.verticalAlign) {
            case "bottom":
              yoffset =
                -halfSceneHeight + _this.params.pady + _this.params.frameHeight;
              break;
            case "top":
              yoffset =
                halfSceneHeight - _this.params.pady - _this.params.frameHeight;
              break;
            default:
              yoffset = 0;
          }
          (_windowMesh.position.set(xoffset, yoffset, _this.params.frameZ),
            _this.mesh._position.set(
              xoffset,
              yoffset - 3,
              _this.params.frameZ - _this.params.zOffset,
            ),
            (_this.mesh._position.y += _this.params.offsetY || 0),
            _this.mesh.scale.setScalar(_this.params.scale || 2));
        }),
        _this.startRender(() => {
          skin.update();
        }),
        _this.bind("Global/selectedBottle", (value) => {
          switch (value) {
            case 1:
              shader.uniforms.uColorFlavor.value.set("#63C4F4");
              break;
            case 2:
              shader.uniforms.uColorFlavor.value.set("#97F3AD");
              break;
            case 3:
              shader.uniforms.uColorFlavor.value.set("#FBEB7F");
          }
        }),
        _this.listen("Story/update", (camera) => {
          if (!_this.parent.visible) return;
          const width = _this.params.frameWidth,
            height = _this.params.frameHeight,
            z = _this.params.frameZ,
            viewMatrix = camera.matrixWorldInverse,
            projectionMatrix = camera.projectionMatrix;
          (_m
            .copy(projectionMatrix)
            .multiply(viewMatrix)
            .multiply(_windowMesh.matrixWorld),
            _point1.set(-width, height, z, 1).applyMatrix4(_m),
            _point2.set(width, height, z, 1).applyMatrix4(_m),
            _point3.set(width, -height, z, 1).applyMatrix4(_m),
            _point4.set(-width, -height, z, 1).applyMatrix4(_m),
            _this.mesh.shader.uniforms.uPoint1.value
              .set(_point1.x, _point1.y, _point1.z)
              .divideScalar(_point1.w),
            _this.mesh.shader.uniforms.uPoint2.value
              .set(_point2.x, _point2.y, _point2.z)
              .divideScalar(_point2.w),
            _this.mesh.shader.uniforms.uPoint3.value
              .set(_point3.x, _point3.y, _point3.z)
              .divideScalar(_point3.w),
            _this.mesh.shader.uniforms.uPoint4.value
              .set(_point4.x, _point4.y, _point4.z)
              .divideScalar(_point4.w));
        }),
        _this.listen("Story/scrollY", (scrollY) => {
          const offset =
              (_this.parent.worldTop + scrollY) /
                _this.get("Story/screenHeightWorld", !0) -
              0.9 * _this.parent.baseHeight,
            outOffset =
              Stage.width > Stage.height
                ? _this.mesh._position.y + (offset - 0.5)
                : _this.mesh._position.y - (offset - 0.5);
          (_this.mesh.position.set(
            _this.mesh._position.x,
            outOffset,
            _this.mesh._position.z,
          ),
            offset < 0.75 &&
              !_this.flag("animatedIn") &&
              (openEyes(),
              _this.flag("animatedIn", !0),
              _this.parent.animateLightbeam?.()));
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
          "FloatingFrameEyesAG" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }