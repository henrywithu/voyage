function ColosseumScene(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseView, "ColosseumScene"),
      Inherit(_this, XComponent),
      (_this.fragName = "ColosseumScene"),
      (_this.contexts = "BaseView, 'ColosseumScene'"),
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
      ((_this.init = async () => {
        const {
            border: border,
            structure: structure,
            character: character,
            floatingrocks: floatingrocks,
            foregroundrock: foregroundrock,
            shadow: shadow,
            rockshadow: rockshadow,
            steps: steps,
            title: title,
            floatingrock1: floatingrock1,
            floatingrock2: floatingrock2,
            floatingrock3: floatingrock3,
            floatingrock4: floatingrock4,
            floatingrock5: floatingrock5,
            floatingrock6: floatingrock6,
          } = _this.layers,
          rootGroup = new Group();
        (rootGroup.add(
          structure,
          foregroundrock,
          steps,
          character,
          shadow,
          rockshadow,
        ),
          _this.add(rootGroup),
          (_this.rootGroup = rootGroup),
          (_this.border = border),
          (_this.title = title),
          (_this.title.renderOrder = 9991));
        ([structure, floatingrocks].forEach((layer) => {
          if (!layer.visible) return;
          const shader = _this.createFragment(
            Shader,
            "StaticObjectBaseShaderInverse",
            { uLineWidth: { value: 0.0035 } },
          );
          (layer.shader.copyUniformsTo(shader),
            (shader.uniforms.uDiscardTop = layer.shader.uniforms.uDiscardTop),
            (shader.uniforms.uDiscardBottom =
              layer.shader.uniforms.uDiscardBottom),
            (shader.side = Shader.BACK_SIDE));
          const mesh = new Mesh(layer.geometry, shader);
          (mesh.position.copy(layer.position),
            mesh.rotation.copy(layer.rotation),
            mesh.scale.copy(layer.scale),
            (mesh.renderOrder = layer.renderOrder + 1),
            (layer.inverseMesh = mesh),
            mesh.upload(),
            "structure" === layer.uilName
              ? rootGroup.add(mesh)
              : _this.add(mesh));
        }),
          [
            floatingrock1,
            floatingrock2,
            floatingrock3,
            floatingrock4,
            floatingrock5,
            floatingrock6,
          ].forEach((floatingRock) => {
            const camera = Utils3D.findParentCamera(_this);
            ((floatingRock._parentGroup = new Group()),
              floatingRock._parentGroup.add(floatingRock),
              _this.add(floatingRock._parentGroup),
              (floatingRock.hitArea = World.BOX),
              Interaction3D.find(camera).add(floatingRock, (e) => {
                "over" === e.action &&
                  floatingRock.shader.tween(
                    "uAngleAccum",
                    floatingRock.shader.uniforms.uAngleAccum.value + 3.14159,
                    1e3,
                    "easeOutCubic",
                  );
              }));
          }));
        const shader = _this.createFragment(
          Shader,
          "StaticCharacterBaseShaderInverse",
          {
            uLineWidth: { value: 0.005 },
            uWindAxisAngle: {
              value: new Vector4().copy(
                character.shader.uniforms.uWindAxisAngle.value,
              ),
            },
            uWindParams: {
              value: new Vector3().copy(
                character.shader.uniforms.uWindParams.value,
              ),
            },
          },
        );
        ((shader.side = Shader.BACK_SIDE),
          character.shader.copyUniformsTo(shader));
        const mesh = new Mesh(character.geometry, shader);
        (mesh.position.copy(character.position),
          mesh.rotation.copy(character.rotation),
          mesh.scale.copy(character.scale),
          (mesh.renderOrder = character.renderOrder + 1),
          (character.inverseMesh = mesh),
          rootGroup.add(mesh),
          mesh.upload());
        const windBlobShader = _this.createFragment(Shader, "WindDustShader", {
            tMap: {
              value: Utils3D.getRepeatTexture(
                "assets/images/story/clouds_noise.png",
              ),
            },
            uScroll: { value: 0 },
            uThreshold: { value: 0.4 },
            uSpeed: { value: 0 },
            uAnimatePosition: { value: 0 },
            uTile: { value: 1 },
            uThickness: { value: 0.25 },
            uColor: { value: new Color("#121212") },
            uFrameRate: { value: 60 },
            uDiscardBottom: { value: 0, ignoreUIL: !0 },
            uDiscardTop: { value: 1, ignoreUIL: !0 },
          }),
          windLines = _this.createFragment(
            WindLines,
            "assets/geometry/story/common/wind-curves-3.json",
            windBlobShader,
          );
        (await windLines.wait("isReady"),
          (_this.windLines = windLines.mesh),
          (_this.windLines.frustumCulled = !1),
          (_this.windLines.shader.uniforms.uThreshold.value = 0.78),
          (_this.windLines.shader.uniforms.uSpeed.value = 1),
          (_this.windLines.position.y = -3.5),
          (_this.windLines.renderOrder = 1e3),
          _this.add(_this.windLines),
          (_this.border.shader.uniforms.uScreenHeightWorld.value =
            _this.getSync("Story/screenHeightWorld")),
          (_this.border.shader.uniforms.uSceneHeightWorld.value =
            _this.heightWorld),
          (_this.border.geometry = _this.border.geometry.clone()),
          (_this.border.geometry.boundingSphere.radius = _this.heightWorld),
          _this.bind("Global/selectedBottle", (value) => {
            switch (value) {
              case 1:
                character.shader.uniforms.uColor.value.set("#63C4F4");
                break;
              case 2:
                character.shader.uniforms.uColor.value.set("#97f3ad");
                break;
              case 3:
                character.shader.uniforms.uColor.value.set("#fbeb7f");
            }
          }));
      }),
        (_this.handleResize = function handleResize() {
          _this.customVisibilityPaddingBottom = 0.2;
          const isMobile = Stage.width / Stage.height < 1;
          ((_this.border.shader.uniforms.uScreenHeightWorld.value =
            _this.getSync("Story/screenHeightWorld")),
            (_this.border.shader.uniforms.uSceneHeightWorld.value =
              _this.heightWorld),
            _this.rootGroup.scale.setScalar(isMobile ? 0.9 : 1));
          const box = new Box3().setFromObject(_this.rootGroup),
            size = new Vector3().copy(box.max).sub(box.min);
          ((_this.rootGroup.position.y = isMobile ? 0.1 * -size.y : 0),
            (_this.layers.floatingrock1._parentGroup.position.x = Math.range(
              Stage.width,
              1600,
              393,
              0,
              -0.2,
              !0,
            )),
            (_this.layers.floatingrock1._parentGroup.position.y = Math.range(
              Stage.width,
              1600,
              393,
              0,
              -1.4,
              !0,
            )),
            (_this.layers.floatingrock1._parentGroup.visible = !0),
            (_this.layers.floatingrock2._parentGroup.position.x = Math.range(
              Stage.width,
              1600,
              393,
              0,
              -2.5,
              !0,
            )),
            (_this.layers.floatingrock2._parentGroup.position.y = Math.range(
              Stage.width,
              1600,
              393,
              0,
              -0.3,
              !0,
            )),
            (_this.layers.floatingrock2._parentGroup.visible = !0),
            (_this.layers.floatingrock3._parentGroup.position.x = Math.range(
              Stage.width,
              1600,
              393,
              0,
              1,
              !0,
            )),
            (_this.layers.floatingrock3._parentGroup.visible = !0),
            (_this.layers.floatingrock4._parentGroup.position.x = Math.range(
              Stage.width,
              1600,
              393,
              0,
              -1,
              !0,
            )),
            (_this.layers.floatingrock4._parentGroup.visible = !0),
            (_this.layers.floatingrock5._parentGroup.position.x = Math.range(
              Stage.width,
              1600,
              393,
              0,
              0.5,
              !0,
            )),
            (_this.layers.floatingrock5._parentGroup.position.y = Math.range(
              Stage.width,
              1600,
              393,
              0,
              1.4,
              !0,
            )),
            _this.layers.floatingrock5._parentGroup.scale.setScalar(
              Math.range(Stage.width, 1600, 393, 0.7, 1, !0),
            ),
            (_this.layers.floatingrock5._parentGroup.visible = !0),
            (_this.layers.floatingrock6._parentGroup.position.x = Math.range(
              Stage.width,
              1600,
              393,
              0,
              0.8,
              !0,
            )),
            (_this.layers.floatingrock6._parentGroup.visible = !0));
        }),
        _this.bind("Story/scrollY", (value) => {
          _this.windLines &&
            ((_this.windLines.shader.uniforms.uScroll.value = value),
            (_this.windLines.shader.uniforms.uDiscardTop.value =
              (_this.worldTop + value) /
              _this.getSync("Story/screenHeightWorld")),
            (_this.windLines.shader.uniforms.uDiscardBottom.value =
              (_this.worldBottom + value) /
              _this.getSync("Story/screenHeightWorld")));
        }),
        (_this.animateIn = () => {
          ((_this.title.shader.uniforms.uProgress.value = 0.35),
            _this.title.shader.tween("uProgress", 1, 2500, "easeOutSine"));
        }),
        (_this.animateOut = () => {}),
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
          "ColosseumScene" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }