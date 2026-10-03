function Hand(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Component),
      Inherit(_this, SceneUtils),
      Inherit(_this, XComponent),
      (_this.fragName = "Hand"),
      (_this.contexts = "Component,SceneUtils"),
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
      const AUDIO_MANAGER = AudioManager.instance();
      _this.flag("isReady", !1);
      let _camera,
        _projection,
        _portalObject,
        IS_STILL = Utils.query("still"),
        _bonesArmToAnimate = [],
        _bonesFingersToAnimate = [],
        _bonesWristToAnimate = [],
        _bonesSleeveToAnimate = [],
        _wiggleBones = [],
        _wiggleRootBones = [],
        _vNoise = new Vector2();
      const _portalPlane = new Vector4(),
        _portalNormal = new Vector3(),
        _portalPosition = new Vector3(),
        _portalQuaternion = new Quaternion();
      ((_this.onInit = async () => {
        (await _this.wait(() => !!_this.parent.layers && !!_this.parent.camera),
          (_camera = _this.parent.camera),
          (_projection = ScreenProjection.find(_camera)),
          (_portalObject = _this.parent.layers.water.mesh));
        const geometry = await GeomThread.loadSkinnedGeometry(
            "assets/geometry/story/hand/arm-skin.bin",
          ),
          skinShader = _this.createFragment(Shader, "SkinHandShader", {
            tTrim: {
              value: Utils3D.getRepeatTexture(
                "assets/images/story/tex_clothing_trim.png",
              ),
              ignoreUIL: !0,
            },
            tLines: {
              value: Utils3D.getRepeatTexture("assets/images/story/lines.jpg"),
              ignoreUIL: !0,
            },
            tNoise: {
              value: Utils3D.getRepeatTexture("assets/images/story/perlin.png"),
              ignoreUIL: !0,
            },
            uLinesTile: { value: 12 },
            uColor: { value: new Color("#968a83") },
            uLightDir: { value: new Vector3(-1.5, 0.5, 2) },
            uAxis: { value: new Vector3(0.1, -0.5, 0) },
            uAngle: { value: 1.5 },
            uPortalPlane: { value: new Vector4(0, 0, 0, 0), ignoreUIL: !0 },
            uPortalFeather: { value: 0.002 },
            uDiscard: { value: new Vector2(1, 0), ignoreUIL: !0 },
            boneTexture: { value: null, ignoreUIL: !0 },
          });
        (ShaderUIL.add(skinShader),
          (_this.skin = new Skin(geometry, skinShader, geometry.bones)),
          (_this.skin.frustumCulled = !1),
          (_bonesArmToAnimate = [_this.skin.bones[1]]),
          (_bonesWristToAnimate = _this.skin.bones.slice(2, 4)),
          _this.skin.bones
            .filter((bone) =>
              [
                "pinky2",
                "middle2",
                "index2",
                "ring2",
                "pinky3",
                "middle3",
                "index3",
                "ring3",
                "thumb2",
                "thumb3",
              ].includes(bone.name),
            )
            .forEach((bone) => {
              _bonesFingersToAnimate.push(bone);
            }),
          _this.skin.bones
            .filter((bone) => bone.name.startsWith("sleeve_wiggle"))
            .forEach((bone) => {
              _bonesSleeveToAnimate.push(bone);
            }),
          _this.skin.bones
            .filter((bone) => bone.name.startsWith("hand_bone_parent"))
            .forEach((bone) => {
              _bonesSleeveToAnimate.push(bone);
            }),
          _this.skin.bones
            .filter((bone) => bone.name.startsWith("arm_lower"))
            .forEach((bone) => {
              _wiggleRootBones.push(bone);
            }),
          _bonesArmToAnimate.forEach((bone) => {
            ((bone.noiseInfluencePosition = Math.random(0.2, 0.3, 3)),
              (bone.noiseInfluenceRotation = Math.random(0.6, 0.7, 3)));
          }),
          _bonesFingersToAnimate.forEach((bone) => {
            ((bone.noiseInfluencePosition = Math.random(0.2, 0.3, 3)),
              (bone.noiseInfluenceRotation = Math.random(0.6, 0.7, 3)));
          }),
          (_this.skin.autoUpdateBoneTexture = !1));
        const inverseGeometry = geometry,
          inverseShader = _this.initClass(Shader, "InverseSkinHandShader", {
            uDisplacement: { value: 1 },
            uPortalPlane: { value: new Vector4(0, 0, 0, 0), ignoreUIL: !0 },
            uPortalFeather: { value: 0.002 },
          });
        ((inverseShader.side = Shader.BACK_SIDE),
          (_this.inverseSkin = new Mesh(inverseGeometry, inverseShader)),
          skinShader.copyUniformsTo(inverseShader, !0));
        const animation = await _this.skin.loadAnimation(
          "assets/geometry/story/hand/arm.bin",
        );
        _this.skin.bones &&
          _bonesSleeveToAnimate.forEach((bone) => {
            const wiggleBone = _this.initClass(WiggleBoneSpring, bone, {});
            ((wiggleBone.weight = 1),
              (wiggleBone.name = bone.name),
              _wiggleBones.push(wiggleBone));
          });
        const startCharPos =
            _this.parent.layers.characterGroup.group.position.clone(),
          endCharPos = new Vector3(startCharPos.x, -0.05, startCharPos.z);
        let progress = 0;
        const _v3 = new Vector3(),
          mouse = new Vector2(0, 0),
          easeInSine = TweenManager.Interpolation.convertEase("easeInSine");
        (Device.mobile && (_this.parent.layers.water.group.position.z -= 0.25),
          (_this.render = (force = !1) => {
            if (!_camera || !_projection) return;
            const scrollY = _this.getSync("Story/scrollY"),
              screenHeightWorld = _this.getSync("Story/screenHeightWorld"),
              isMobile = Device.mobile,
              mouseDown = isMobile
                ? _this.parent?.discButton?.isHolding
                : _this.parent?.cursor?.mouseDown;
            endCharPos.x = isMobile ? startCharPos.x + 0.5 : endCharPos.x;
            let x = 0.2,
              endX = 1;
            mouseDown &&
              ((x = isMobile ? 0 : 0.65), (endX = isMobile ? 1 : 0.75));
            let y = 0.2,
              endY = 0.9;
            (mouseDown &&
              ((y = isMobile ? 0.05 : 0.1), (endY = isMobile ? 1 : 0.6)),
              (mouse.x =
                (isMobile && !mouseDown) || IS_STILL
                  ? 0.5
                  : Math.range(Mouse.normal.x, 0, 1, x, endX, !0)),
              (mouse.y =
                (isMobile && !mouseDown) || IS_STILL
                  ? 0.5
                  : Math.range(Mouse.normal.y, 0, 1, y, endY, !0)),
              (progress = Math.lerp(
                mouseDown || IS_STILL ? 1 : 0,
                progress,
                force ? 1 : 0.05,
              )),
              (animation.elapsed = Math.range(
                easeInSine(progress),
                0,
                1,
                25,
                55,
                !0,
              )),
              _v3.copy(startCharPos).lerp(endCharPos, progress, !1),
              _this.parent.layers.characterGroup.group.position.copy(_v3));
            const distHand = Math.range(
                progress,
                0,
                1,
                isMobile ? 3 : 2.5,
                isMobile ? 4 : 3.5,
                !0,
              ),
              xMultiplier = isMobile ? 0.88 : 0.8;
            mouse.x *= Stage.width * xMultiplier;
            const yMultiplier = isMobile ? 0.7 : 0.6;
            ((mouse.y *= Stage.height * yMultiplier),
              (mouse.x += Stage.width * (1 - xMultiplier)),
              (mouse.y += Stage.height * (1 - yMultiplier)));
            const pos = _projection.unproject(mouse, distHand),
              localPos = _this.parent.group.worldToLocal(pos);
            isMobile && (localPos.x += 0.15);
            const yRotationEnd = isMobile ? 10 : 0;
            _this.parent.layers.pivotGroup.group.rotation.y = Math.lerp(
              Math.radians(-30),
              Math.radians(yRotationEnd),
              progress,
              !1,
            );
            _this.parent.layers.pivotGroup.group.rotation.z = isMobile
              ? Math.lerp(Math.radians(-40), Math.radians(-30), progress, !1)
              : Math.lerp(Math.radians(-0), Math.radians(-40), progress, !1);
            let lerpValue = isMobile ? 0.2 : 0.3;
            (_this.parent.layers.pivotGroup.group.position.lerp(
              localPos,
              force ? 1 : lerpValue,
            ),
              _portalObject &&
                (_portalObject.getWorldPosition(_portalPosition),
                _portalObject.getWorldQuaternion(_portalQuaternion),
                (_portalPosition.z = _portalObject._offsetZ),
                _portalNormal
                  .set(0, 0, 1)
                  .applyQuaternion(_portalQuaternion)
                  .normalize(),
                _portalPlane.set(
                  _portalNormal.x,
                  _portalNormal.y,
                  _portalNormal.z,
                  -_portalNormal.dot(_portalPosition),
                ),
                skinShader.uniforms.uPortalPlane.value.copy(_portalPlane)),
              _this.skin._drawing &&
                _wiggleBones.forEach((wiggleBone) => {
                  wiggleBone.update(0.01 * Render.DELTA);
                }),
              _this.skin.update(),
              (function updateBoneNoises(force = !1) {
                Render.TIME;
                const mouseDown = _this.parent?.cursor?.mouseDown;
                ((boneLerp.x.target =
                  -Mouse.tilt.x * (mouseDown ? 1 : 0) * 0.8),
                  mouseDown && (boneLerp.x.target += 0.2));
                const boneLerpX = Math.lerp(
                  boneLerp.x.target,
                  boneLerp.x.current,
                  force ? 1 : 0.07,
                );
                ((boneLerp.x.delta =
                  boneLerpX - (boneLerp.x.current ?? boneLerpX)),
                  (boneLerp.x.current = boneLerpX),
                  (boneLerp.y.target =
                    Mouse.tilt.y * (mouseDown ? 1 : 0) * 0.5),
                  mouseDown &&
                    ((boneLerp.y.target *= 0.4), (boneLerp.y.target += 0.2)));
                const boneLerpY = Math.lerp(
                  boneLerp.y.target,
                  boneLerp.y.current,
                  force ? 1 : 0.04,
                );
                ((boneLerp.y.delta =
                  boneLerpY - (boneLerp.y.current ?? boneLerpY)),
                  (boneLerp.y.current = boneLerpY),
                  (_wiggleRootBones[0].rotation.y += boneLerp.x.current),
                  (_wiggleRootBones[0].rotation.x += boneLerp.y.current),
                  _bonesFingersToAnimate.forEach((bone) => {
                    _vNoise.set(6e-4 * Render.TIME, 0);
                    const amplitudeRotation = 0.15,
                      noiseValue = Noise.cnoise2d(_vNoise);
                    bone.rotation.x += noiseValue * amplitudeRotation;
                  }),
                  _bonesWristToAnimate.forEach((bone) => {
                    _vNoise.set(1e-4 * Render.TIME, 0);
                    const amplitudeRotation = 0.1,
                      noiseValue = Noise.cnoise2d(_vNoise);
                    ((bone.rotation.y += noiseValue * amplitudeRotation),
                      (bone.rotation.z += noiseValue * amplitudeRotation));
                  }));
              })(force),
              (function updateInteractionAudio(mouseDown) {
                !(function updatePivotDelta() {
                  const pivotPos =
                    _this.parent.layers.pivotGroup.group.position;
                  (_pivotDelta.subVectors(
                    _this.parent.layers.pivotGroup.group.position,
                    _prevPivotPos,
                  ),
                    _prevPivotPos.copy(pivotPos));
                })();
                const x = boneLerp.x.current,
                  contactVolumeTarget = mouseDown
                    ? Math.range(x, 0.25, 0.2, 0, 1, !0)
                    : 0;
                ((_contactVolumeCurrent = Math.lerp(
                  contactVolumeTarget,
                  _contactVolumeCurrent,
                  0.05,
                )),
                  AUDIO_MANAGER.setVolume(
                    "portal_contact",
                    _contactVolumeCurrent,
                  ),
                  portalEffectChain.setGain(1.5 * _contactVolumeCurrent),
                  droneEffectChain.setGain(1 - 0.66 * _contactVolumeCurrent, {
                    smoothing: 0.4,
                  }));
                const handVelocityMagnitudeDesktop = Math.sqrt(
                    Math.pow(boneLerp.x.delta, 2),
                    Math.pow(boneLerp.y.delta, 2),
                  ),
                  progress = Device.mobile
                    ? Math.range(_pivotDelta.length(), 0, 0.2, 0, 1, !0)
                    : Math.range(
                        handVelocityMagnitudeDesktop,
                        0,
                        0.05,
                        0,
                        1,
                        !0,
                      ),
                  targetFrequency =
                    Math.range(progress, 0, 1, 200, 12e3, !0) *
                    _contactVolumeCurrent;
                _moveFrequencyCurrent <= targetFrequency
                  ? portalEffectChain.effects.filter.setFrequency(
                      targetFrequency,
                      0.1,
                    )
                  : portalEffectChain.effects.filter.setFrequency(
                      targetFrequency,
                      0.02,
                    );
              })(mouseDown),
              (skinShader.uniforms.uDiscard.value.x =
                (_this.parent.worldTop + scrollY) / screenHeightWorld),
              (skinShader.uniforms.uDiscard.value.y =
                (_this.parent.worldBottom + scrollY) / screenHeightWorld));
          }),
          _this.flag("isReady", !0));
      }),
        (_this.lock = () => {
          IS_STILL = !0;
        }),
        (_this.unlock = () => {
          IS_STILL = !1;
        }));
      const boneLerp = {
        x: { current: 0, target: 0 },
        y: { current: 0, target: 0 },
      };
      const portalEffectChain = AUDIO_MANAGER.getEffectChain("portalMove"),
        droneEffectChain = AUDIO_MANAGER.getEffectChain("drone");
      let _contactVolumeCurrent = 0,
        _moveFrequencyCurrent = 0;
      const _prevPivotPos = new Vector3();
      let _pivotDelta = new Vector3();
      onInit = _this.onInit === onInit ? null : _this.onInit;
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "Hand" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }