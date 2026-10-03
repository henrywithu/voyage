function DrawnParticles(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params?.sceneLayoutName || "DrawnParticles"),
      Inherit(_this, ParticleCurveBase),
      Inherit(_this, XComponent),
      (_this.fragName = "DrawnParticles"),
      (_this.contexts =
        'Frag3D, _params?.sceneLayoutName || "DrawnParticles",ParticleCurveBase'),
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
      const [input, state] = _this.createUIL("DrawnParticles");
      let blobShaders = [];
      function release({ worldPos: worldPos, x: x = 1, y: y = 1, z: z = 1 }) {
        _this.layers.particles.spawn.release(worldPos, 1, 0.1);
      }
      _this.onInit = async (_) => {
        !(async function initBlobs() {
          (await _this.layers.particles.ready(),
            await _this.wait(_this.layers.particles.spawn, "lifeOutput"),
            (_this.layers.particles.antimatter.storeVelocity = !0));
          const geom = World.SPHERE_LOW_RES;
          let shader = _this.createFragment(Shader, "BlobShaderDrawn", {
            tMap: {
              value: Utils3D.getTexture(
                Assets.getPath("assets/images/story/antigrav/leaf.png"),
              ),
            },
            uColor: { value: new Color("#ffffff") },
            uInverse: { value: 1 },
            uAnimate: { value: 0 },
            side: Shader.BACK_SIDE,
            transparent: !0,
          });
          (blobShaders.push(shader),
            _this.layers.particles.applyToInstancedGeometry(geom),
            _this.layers.particles.applyToShader(shader),
            _this.layers.particles.spawn.applyToShader(shader));
          const geometry2 = World.SPHERE_LOW_RES;
          let shader2 = _this.createFragment(Shader, "BlobShaderDrawn", {
            tMap: {
              value: Utils3D.getTexture(
                Assets.getPath("assets/images/story/antigrav/leaf.png"),
              ),
            },
            uColor: { value: new Color("#63C4F4") },
            uInverse: { value: 0 },
            uAnimate: { value: 0 },
            side: Shader.DOUBLE_SIDE,
            transparent: !0,
          });
          (blobShaders.push(shader2),
            _this.layers.particles.applyToInstancedGeometry(geometry2),
            _this.layers.particles.applyToShader(shader2),
            _this.layers.particles.spawn.applyToShader(shader2));
          let mesh2 = new Mesh(geometry2, shader2);
          (mesh2.upload(),
            (mesh2.frustumCulled = !1),
            _this.add(mesh2),
            (_this.layers.particles.fps = 40));
          let mesh = new Mesh(geom, shader);
          (mesh.upload(),
            (mesh.frustumCulled = !1),
            _this.add(mesh),
            _this.bind("Global/selectedBottle", (value) => {
              switch (value) {
                case 1:
                  shader2.set("uColor", new Color("#63C4F4"));
                  break;
                case 2:
                  shader2.set("uColor", new Color("#97f3ad"));
                  break;
                case 3:
                  shader2.set("uColor", new Color("#fbeb7f"));
              }
            }));
        })();
      };
      let _drawInterval = null;
      ((_this.release = release),
        (_this.onDrawDown = () => {
          ((_drawInterval = setInterval(() => {
            release({
              worldPos: getProjectedPosition(
                Global.CAMERA.camera,
                Mouse.tilt.x,
                Mouse.tilt.y,
              ),
              x: 0.3,
              y: 0.3,
              z: 0.3,
            });
          }, 7)),
            _this.set("DrawnParticles/Drawing", !0),
            _this.layers.particles.behavior.tween(
              "uSpeedUp",
              1,
              3e3,
              "easeInOutQuint",
            ));
        }),
        (_this.resetCurves = async () => {}),
        (_this.onDrawMove = () => {}),
        (_this.onDrawUp = async () => (
          clearInterval(_drawInterval),
          _this.set("DrawnParticles/Drawing", !1),
          _this.fire("DrawingComplete"),
          _this.flag("onDrawUp", !0),
          _this.layers.particles.behavior.tween(
            "uSpeedUp",
            0,
            3e3,
            "easeInOutQuint",
          ),
          !0
        )),
        (_this.setPull = (value) => {
          _this.layers.particles.behavior.uniforms.uPullValue.value = value;
        }));
      let raycaster = new RayManager(),
        plane = new Plane(new Vector3(0, 0, 1), 0),
        pos = new Vector3();
      function getProjectedPosition(camera, x, y) {
        raycaster.setFromCamera(new Vector2(x, y), camera);
        const intersection = raycaster.ray.intersectPlane(plane, pos);
        return intersection
          ? intersection.sub(_this.parent.parent.group.position)
          : pos.set(0, 0, 0);
      }
      ((_this.setDrawCoords = (point) => {}),
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
          "DrawnParticles" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }