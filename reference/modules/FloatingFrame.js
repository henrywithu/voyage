function FloatingFrame(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Object3D),
      Inherit(_this, XComponent),
      (_this.fragName = "FloatingFrame"),
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
      const _m = new Matrix4(),
        _point1 = new Vector4(),
        _point2 = new Vector4(),
        _point3 = new Vector4(),
        _point4 = new Vector4(),
        _center = new Vector4(),
        _meshOffsetY = _this.params.meshOffsetY || 0,
        _meshRotationY = _this.params.meshRotationY || 0,
        geo =
          _this.params.geometry ||
          "assets/geometry/story/wander/saint-hood.bin",
        geometry = await GeomThread.loadGeometry(geo),
        shader =
          _this.params.shader ||
          _this.initClass(Shader, "FloatingFrameBaseShader", {
            uPoint1: { value: new Vector3() },
            uPoint2: { value: new Vector3() },
            uPoint3: { value: new Vector3() },
            uPoint4: { value: new Vector3() },
            uCenter: { value: new Vector3() },
            uDPR: { value: Tests.getDPR() },
            tAtlas: {
              value: Utils3D.getRepeatTexture(
                "assets/images/story/tex_atlas.png",
              ),
            },
            tTrim: {
              value: Utils3D.getRepeatTexture(
                "assets/images/story/tex_clothing_trim.png",
              ),
            },
            tLines: {
              value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
            },
            tNoise: {
              value: Utils3D.getRepeatTexture("assets/images/story/perlin.png"),
            },
            uLinesTile: { value: 1.8 },
            uLightDir: { value: new Vector3(0.5, 1, 1) },
            uColor1: { value: new Color("#b29a6e") },
            uColor2: { value: new Color("#7F7261") },
            uTransition: { value: 0 },
            uHover: { value: 0 },
            uIdleAnimationOffset: { value: 0 },
            uIdleAnimationStrength: { value: 1 },
          });
      ((shader.side = Shader.DOUBLE_SIDE), (shader.transparent = !0));
      const _windowMesh = new Mesh(geometry, shader.clone());
      (_windowMesh.upload(),
        _this.add(_windowMesh),
        (_windowMesh.shader.visible = !1),
        (_this.mesh =
          geometry.bones && _this.params.animation
            ? new Skin(geometry, shader, geometry.bones)
            : new Mesh(geometry, shader)),
        _this.mesh.isMesh && _this.mesh.upload(),
        _this.mesh.isSkin &&
          ((_this.mesh.autoUpdateBoneTexture = !1),
          (_this.animation = await _this.mesh.loadAnimation(
            _this.params.animation,
          )),
          _this.startRender(() => {
            ((_this.animation.elapsed += 0.02 * Render.DELTA),
              _this.mesh.update());
          })),
        (_this.mesh.renderOrder = 1e3),
        (_this.mesh._position = new Vector3()),
        _this.add(_this.mesh));
      const camera = Utils3D.findParentCamera(_this);
      async function handleResize() {
        ((_this.screenHeightWorld = await _this.get("Story/screenHeightWorld")),
          (_this.screenWidthWorld = await _this.get("Story/screenWidthWorld")));
        const sceneHeightWorld = _this.parent.heightWorld,
          halfScreenWidthWorld =
            0.5 *
            (Stage.width > 2100
              ? _this.screenWidthWorld * (2100 / Stage.width)
              : _this.screenWidthWorld),
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
        let yoffset = 0,
          pady = _this.params.pady || 0,
          frameHeight = _this.params.frameHeight || 1;
        switch (_this.params.verticalAlign) {
          case "bottom":
            yoffset = -halfSceneHeight + pady + frameHeight;
            break;
          case "top":
            yoffset = halfSceneHeight - pady - frameHeight;
            break;
          default:
            yoffset = 0;
        }
        (_windowMesh.position.set(xoffset, yoffset, _this.params.frameZ),
          _this.mesh.position.set(
            xoffset,
            yoffset,
            _this.params.frameZ + _this.params.zOffset,
          ),
          (_this.mesh.position.y += _meshOffsetY),
          _this.mesh.rotation.set(0, _meshRotationY, 0),
          _this.mesh.scale.setScalar(_this.params.meshScale || 1));
      }
      (Interaction3D.find(camera).add(_this.mesh, (e) => {
        "over" === e.action
          ? shader.tween("uHover", 1, 1e3, "easeOutCubic")
          : shader.tween("uHover", 0, 1e3, "easeOutCubic");
      }),
        (_this.handleResize = handleResize),
        (_this.screenHeightWorld = 1),
        Config.NO_FRAMES && (_this.group.visible = !1),
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
            _center.set(0, 0, z, 1).applyMatrix4(_m),
            _this.mesh.shader.uniforms.uCenter.value
              .set(_center.x, _center.y, _center.z)
              .divideScalar(_center.w),
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
        }));
      const worldPos = new Vector3();
      ((_this.animateIn = () => {
        _this.mesh.shader.tween("uTransition", 1, 800, "easeOutCubic");
      }),
        _this.listen("Global/scenesReady", async () => {
          (await handleResize(),
            _this.bind("Story/scrollY", (scroll) => {
              if (_this.flag("animatedIn") || !_this.parent.visible) return;
              const scrollY = Math.abs(scroll / _this.screenHeightWorld);
              (_this.mesh.getWorldPosition(worldPos),
                (worldPos.y -= _meshOffsetY),
                scrollY >
                  (-1 * worldPos.y - 0.5 * _this.screenHeightWorld) /
                    _this.screenHeightWorld &&
                  (_this.animateIn(), _this.flag("animatedIn", !0)));
            }));
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
          "FloatingFrame" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }